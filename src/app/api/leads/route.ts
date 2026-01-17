import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { LeadCreatePayload, LeadFilters } from "@/types/lead.types";

const LEAD_STATUSES = ["new", "investigating", "verified", "dismissed", "archived"] as const;
const LEAD_PRIORITIES = ["low", "medium", "high", "critical"] as const;
const LEAD_SOURCES = [
  "social_media",
  "email_opened",
  "location",
  "witness",
  "hospital",
  "detention",
  "tip",
  "surveillance",
  "other",
] as const;

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const filters: LeadFilters = {
    caseId: url.searchParams.get("caseId") || undefined,
    status: url.searchParams.get("status") as LeadFilters["status"],
    priority: url.searchParams.get("priority") as LeadFilters["priority"],
    source: url.searchParams.get("source") as LeadFilters["source"],
    assignedToId: url.searchParams.get("assignedToId") || undefined,
    search: url.searchParams.get("search") || undefined,
  };

  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const pageSize = Math.min(parseInt(url.searchParams.get("pageSize") || "20", 10), 100);
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("leads")
    .select(
      `
      *,
      case:cases(id, case_number, first_name, last_name),
      assigned_to:profiles!leads_assigned_to_id_fkey(id, first_name, last_name, email)
    `,
      { count: "exact" }
    );

  if (filters.caseId) {
    query = query.eq("case_id", filters.caseId);
  }
  if (filters.status) {
    if (Array.isArray(filters.status)) {
      query = query.in("status", filters.status);
    } else {
      query = query.eq("status", filters.status);
    }
  }
  if (filters.priority) {
    if (Array.isArray(filters.priority)) {
      query = query.in("priority", filters.priority);
    } else {
      query = query.eq("priority", filters.priority);
    }
  }
  if (filters.source) {
    if (Array.isArray(filters.source)) {
      query = query.in("source", filters.source);
    } else {
      query = query.eq("source", filters.source);
    }
  }
  if (filters.assignedToId) {
    query = query.eq("assigned_to_id", filters.assignedToId);
  }
  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const leads = (data || []).map((lead) => ({
    id: lead.id,
    caseId: lead.case_id,
    caseNumber: lead.case?.case_number,
    title: lead.title,
    description: lead.description,
    status: lead.status,
    priority: lead.priority,
    source: lead.source,
    sourceDetails: lead.source_details,
    assignedToId: lead.assigned_to_id,
    assignedToName: lead.assigned_to
      ? `${lead.assigned_to.first_name} ${lead.assigned_to.last_name}`.trim()
      : null,
    locationLat: lead.location_lat,
    locationLng: lead.location_lng,
    locationAddress: lead.location_address,
    contactName: lead.contact_name,
    contactPhone: lead.contact_phone,
    contactEmail: lead.contact_email,
    isAnonymous: lead.is_anonymous,
    verifiedAt: lead.verified_at,
    dismissedAt: lead.dismissed_at,
    dismissalReason: lead.dismissal_reason,
    metadata: lead.metadata,
    createdAt: lead.created_at,
    updatedAt: lead.updated_at,
  }));

  return NextResponse.json({
    data: leads,
    pagination: {
      page,
      pageSize,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
    },
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as LeadCreatePayload;

  if (!body.caseId) {
    return NextResponse.json({ error: "caseId is required" }, { status: 400 });
  }
  if (!body.title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (!body.source || !LEAD_SOURCES.includes(body.source)) {
    return NextResponse.json({ error: "Valid source is required" }, { status: 400 });
  }

  const priority = body.priority && LEAD_PRIORITIES.includes(body.priority) ? body.priority : "medium";

  const insertPayload = {
    case_id: body.caseId,
    title: body.title,
    description: body.description || "",
    status: "new" as const,
    priority,
    source: body.source,
    source_details: body.sourceDetails || null,
    location_lat: body.locationLat ?? null,
    location_lng: body.locationLng ?? null,
    location_address: body.locationAddress || null,
    contact_name: body.contactName || null,
    contact_phone: body.contactPhone || null,
    contact_email: body.contactEmail || null,
    is_anonymous: body.isAnonymous ?? false,
    metadata: body.metadata ?? {},
    created_by_id: user.id,
  };

  const { data, error } = await supabase.from("leads").insert(insertPayload).select("*").single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
