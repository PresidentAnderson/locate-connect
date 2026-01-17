import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/family/check-ins
 * List scheduled check-ins
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get("caseId");
    const status = searchParams.get("status");
    const upcoming = searchParams.get("upcoming") === "true";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Verify user access
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    let query = supabase
      .from("scheduled_check_ins")
      .select(`
        *,
        contact:family_contacts(id, first_name, last_name, relationship, phone, email),
        liaison:family_liaisons(
          id,
          user:profiles!family_liaisons_user_id_fkey(first_name, last_name)
        )
      `, { count: "exact" })
      .order("scheduled_date", { ascending: true });

    if (caseId) {
      // Verify case access
      const { data: caseData } = await supabase
        .from("cases")
        .select("reporter_id")
        .eq("id", caseId)
        .single();

      const isOwner = caseData?.reporter_id === user.id;
      const isLE = profile && ["law_enforcement", "admin", "developer"].includes(profile.role);

      if (!isOwner && !isLE) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      query = query.eq("case_id", caseId);
    } else {
      // Require LE for all check-ins
      if (!profile || !["law_enforcement", "admin", "developer"].includes(profile.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (upcoming) {
      query = query
        .in("status", ["scheduled", "rescheduled"])
        .gte("scheduled_date", new Date().toISOString().split("T")[0]);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching check-ins:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: count ? offset + limit < count : false,
      },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/family/check-ins
 * Schedule a new check-in
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["law_enforcement", "admin", "developer"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const { data, error } = await supabase
      .from("scheduled_check_ins")
      .insert({
        case_id: body.caseId,
        family_contact_id: body.familyContactId,
        liaison_id: body.liaisonId,
        frequency: body.frequency || "weekly",
        scheduled_date: body.scheduledDate,
        scheduled_time: body.scheduledTime,
        contact_method: body.contactMethod || "phone",
        status: "scheduled",
        notes: body.notes,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating check-in:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/family/check-ins
 * Update a check-in (complete, reschedule, etc.)
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["law_enforcement", "admin", "developer"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: "Check-in ID is required" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};

    if (body.status) {
      updateData.status = body.status;
      if (body.status === "completed") {
        updateData.completed_at = new Date().toISOString();
      }
    }

    if (body.scheduledDate) updateData.scheduled_date = body.scheduledDate;
    if (body.scheduledTime !== undefined) updateData.scheduled_time = body.scheduledTime;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.followUpRequired !== undefined) updateData.follow_up_required = body.followUpRequired;
    if (body.followUpNotes !== undefined) updateData.follow_up_notes = body.followUpNotes;

    const { data, error } = await supabase
      .from("scheduled_check_ins")
      .update(updateData)
      .eq("id", body.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating check-in:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
