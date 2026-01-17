import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/morgue/notifications
 * List sensitive notifications for morgue matches
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "developer", "law_enforcement"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Forbidden - Requires law enforcement authorization" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get("case_id");
    const matchId = searchParams.get("match_id");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("morgue_notifications")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (caseId) {
      query = query.eq("case_id", caseId);
    }

    if (matchId) {
      query = query.eq("match_id", matchId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching notifications:", error);
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
 * POST /api/morgue/notifications
 * Schedule sensitive notification to family about potential match
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

    if (!profile || !["admin", "developer", "law_enforcement"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Forbidden - Requires law enforcement authorization" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.caseId || !body.matchId || !body.notificationType || !body.sensitivity || !body.familyContactIds) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get primary liaison for the case (if exists)
    const { data: liaison } = await supabase
      .from("family_liaisons")
      .select("user_id")
      .eq("case_id", body.caseId)
      .eq("is_primary", true)
      .single();

    // Determine primary liaison, fallback to explicitly provided or current user (who must be authorized)
    // The current user has already been validated to have law_enforcement/admin/developer role above
    const primaryLiaisonId = body.primaryLiaisonId || liaison?.user_id || user.id;

    const { data, error } = await supabase
      .from("morgue_notifications")
      .insert({
        case_id: body.caseId,
        match_id: body.matchId,
        notification_type: body.notificationType,
        sensitivity: body.sensitivity,
        primary_liaison_id: primaryLiaisonId,
        family_contact_ids: body.familyContactIds,
        scheduled_date: body.scheduledDate,
        scheduled_time: body.scheduledTime,
        delivery_method: body.deliveryMethod,
        meeting_location: body.meetingLocation,
        grief_counselor_present: body.griefCounselorPresent || false,
        grief_counselor_id: body.griefCounselorId,
        additional_support_staff: body.additionalSupportStaff || [],
        notes: body.notes,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating notification:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log the notification scheduling
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "schedule_morgue_notification",
      resource: "morgue_notifications",
      resource_id: data.id,
      details: {
        case_id: body.caseId,
        match_id: body.matchId,
        notification_type: body.notificationType,
        sensitivity: body.sensitivity,
      },
      ip_address: request.headers.get("x-forwarded-for") || "unknown",
      user_agent: request.headers.get("user-agent") || "unknown",
    });

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
 * PATCH /api/morgue/notifications
 * Update notification status and record delivery details
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

    if (!profile || !["admin", "developer", "law_enforcement"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Forbidden - Requires law enforcement authorization" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { notificationId, ...updates } = body;

    if (!notificationId) {
      return NextResponse.json(
        { error: "Missing required field: notificationId" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (updates.status) updateData.status = updates.status;
    if (updates.scheduledDate) updateData.scheduled_date = updates.scheduledDate;
    if (updates.scheduledTime) updateData.scheduled_time = updates.scheduledTime;
    if (updates.familyReaction) updateData.family_reaction = updates.familyReaction;
    if (updates.immediateSupport) updateData.immediate_support = updates.immediateSupport;
    if (updates.followUpRequired !== undefined) updateData.follow_up_required = updates.followUpRequired;
    if (updates.followUpScheduledDate) updateData.follow_up_scheduled_date = updates.followUpScheduledDate;
    if (updates.resourcesProvided) updateData.resources_provided = updates.resourcesProvided;
    if (updates.griefSupportOffered) updateData.grief_support_offered = updates.griefSupportOffered;
    if (updates.notes) updateData.notes = updates.notes;
    if (updates.sensitiveNotes) updateData.sensitive_notes = updates.sensitiveNotes;

    if (updates.status === "delivered") {
      updateData.delivered_date = new Date().toISOString();
      updateData.delivered_by = user.id;
    }

    const { data, error } = await supabase
      .from("morgue_notifications")
      .update(updateData)
      .eq("id", notificationId)
      .select()
      .single();

    if (error) {
      console.error("Error updating notification:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If notification is delivered, update the match record
    if (updates.status === "delivered") {
      await supabase
        .from("morgue_registry_matches")
        .update({
          family_notified: true,
          family_notified_date: new Date().toISOString(),
          notified_by: user.id,
          notification_method: data.delivery_method,
          status: "family_notified",
        })
        .eq("id", data.match_id);
    }

    // Log the update
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "update_morgue_notification",
      resource: "morgue_notifications",
      resource_id: notificationId,
      details: { updates: updateData },
      ip_address: request.headers.get("x-forwarded-for") || "unknown",
      user_agent: request.headers.get("user-agent") || "unknown",
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
