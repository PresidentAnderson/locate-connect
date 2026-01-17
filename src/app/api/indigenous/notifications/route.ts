import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/indigenous/notifications
 * List community notifications (law enforcement only)
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

    if (
      !profile ||
      !["law_enforcement", "admin", "developer"].includes(profile.role)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);

    const caseId = searchParams.get("caseId");
    const communityId = searchParams.get("communityId");
    const notificationType = searchParams.get("type");
    const acknowledged = searchParams.get("acknowledged");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("community_notifications")
      .select(
        `
        *,
        community:indigenous_communities(id, name, province),
        organization:indigenous_organizations(id, name, acronym),
        liaison_contact:indigenous_liaison_contacts(id, first_name, last_name)
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false });

    if (caseId) {
      query = query.eq("case_id", caseId);
    }

    if (communityId) {
      query = query.eq("community_id", communityId);
    }

    if (notificationType) {
      query = query.eq("notification_type", notificationType);
    }

    if (acknowledged !== null) {
      query = query.eq("acknowledged", acknowledged === "true");
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
 * POST /api/indigenous/notifications
 * Send a community notification (law enforcement only)
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

    if (
      !profile ||
      !["law_enforcement", "admin", "developer"].includes(profile.role)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // Verify the case exists
    const { data: existingCase } = await supabase
      .from("cases")
      .select("id")
      .eq("id", body.caseId)
      .single();

    if (!existingCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("community_notifications")
      .insert({
        case_id: body.caseId,
        community_id: body.communityId,
        organization_id: body.organizationId,
        liaison_contact_id: body.liaisonContactId,
        notification_type: body.notificationType,
        priority: body.priority || "normal",
        subject: body.subject,
        subject_fr: body.subjectFr,
        message: body.message,
        message_fr: body.messageFr,
        message_indigenous: body.messageIndigenous,
        sent_via: body.sentVia || ["email"],
        sent_at: new Date().toISOString(),
        sent_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating notification:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log the notification for data sovereignty compliance
    if (body.communityId) {
      await supabase.from("indigenous_data_sovereignty_log").insert({
        case_id: body.caseId,
        community_id: body.communityId,
        action: "data_share",
        action_description: `Community notification sent: ${body.notificationType}`,
        performed_by: user.id,
        consent_verified: true,
        community_notification_sent: true,
      });
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
