import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { LeadUpdatePayload } from "@/types/lead.types";

interface RouteParams {
  params: Promise<{ leadId: string }>;
}

const LEAD_STATUSES = ["new", "investigating", "verified", "dismissed", "archived"] as const;
const LEAD_PRIORITIES = ["low", "medium", "high", "critical"] as const;

export async function GET(request: Request, { params }: RouteParams) {
  const { leadId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("leads")
    .select(
      `
      *,
      case:cases(id, case_number, first_name, last_name),
      assigned_to:profiles!leads_assigned_to_id_fkey(id, first_name, last_name, email),
      created_by:profiles!leads_created_by_id_fkey(id, first_name, last_name),
      notes:lead_notes(
        id,
        content,
        is_internal,
        created_at,
        created_by:profiles(id, first_name, last_name)
      ),
      attachments:lead_attachments(
        id,
        file_name,
        file_type,
        file_size,
        file_url,
        uploaded_at
      )
    `
    )
    .eq("id", leadId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const lead = {
    id: data.id,
    caseId: data.case_id,
    caseNumber: data.case?.case_number,
    caseName: data.case ? `${data.case.first_name} ${data.case.last_name}`.trim() : null,
    title: data.title,
    description: data.description,
    status: data.status,
    priority: data.priority,
    source: data.source,
    sourceDetails: data.source_details,
    assignedToId: data.assigned_to_id,
    assignedToName: data.assigned_to
      ? `${data.assigned_to.first_name} ${data.assigned_to.last_name}`.trim()
      : null,
    locationLat: data.location_lat,
    locationLng: data.location_lng,
    locationAddress: data.location_address,
    contactName: data.contact_name,
    contactPhone: data.contact_phone,
    contactEmail: data.contact_email,
    isAnonymous: data.is_anonymous,
    verifiedAt: data.verified_at,
    verifiedById: data.verified_by_id,
    dismissedAt: data.dismissed_at,
    dismissedById: data.dismissed_by_id,
    dismissalReason: data.dismissal_reason,
    metadata: data.metadata,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    createdById: data.created_by_id,
    createdByName: data.created_by
      ? `${data.created_by.first_name} ${data.created_by.last_name}`.trim()
      : null,
    notes: (data.notes || []).map((note: Record<string, unknown>) => ({
      id: note.id,
      content: note.content,
      isInternal: note.is_internal,
      createdAt: note.created_at,
      createdByName: note.created_by
        ? `${(note.created_by as Record<string, string>).first_name} ${(note.created_by as Record<string, string>).last_name}`.trim()
        : null,
    })),
    attachments: data.attachments || [],
  };

  return NextResponse.json({ data: lead });
}

export async function PUT(request: Request, { params }: RouteParams) {
  const { leadId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as LeadUpdatePayload;

  // Validate status
  if (body.status && !LEAD_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // Validate priority
  if (body.priority && !LEAD_PRIORITIES.includes(body.priority)) {
    return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
  }

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.title !== undefined) updatePayload.title = body.title;
  if (body.description !== undefined) updatePayload.description = body.description;
  if (body.priority !== undefined) updatePayload.priority = body.priority;
  if (body.assignedToId !== undefined) updatePayload.assigned_to_id = body.assignedToId;
  if (body.locationLat !== undefined) updatePayload.location_lat = body.locationLat;
  if (body.locationLng !== undefined) updatePayload.location_lng = body.locationLng;
  if (body.locationAddress !== undefined) updatePayload.location_address = body.locationAddress;
  if (body.metadata !== undefined) updatePayload.metadata = body.metadata;

  // Handle status transitions
  if (body.status !== undefined) {
    updatePayload.status = body.status;

    if (body.status === "verified") {
      updatePayload.verified_at = new Date().toISOString();
      updatePayload.verified_by_id = user.id;
    } else if (body.status === "dismissed") {
      updatePayload.dismissed_at = new Date().toISOString();
      updatePayload.dismissed_by_id = user.id;
      if (body.dismissalReason) {
        updatePayload.dismissal_reason = body.dismissalReason;
      }
    }
  }

  const { data, error } = await supabase
    .from("leads")
    .update(updatePayload)
    .eq("id", leadId)
    .select("*")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { leadId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check user role - only LE/admin can delete
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["law_enforcement", "admin", "developer"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase.from("leads").delete().eq("id", leadId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
