import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/family/support-groups
 * List support groups (public access for active groups)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const groupType = searchParams.get("type");
    const category = searchParams.get("category");
    const province = searchParams.get("province");
    const isFree = searchParams.get("free") === "true";
    const isOpen = searchParams.get("open") === "true";
    const language = searchParams.get("language");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("support_groups")
      .select("*", { count: "exact" })
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (groupType) {
      query = query.eq("group_type", groupType);
    }

    if (category) {
      query = query.eq("category", category);
    }

    if (province) {
      query = query.contains("serves_provinces", [province]);
    }

    if (isFree) {
      query = query.eq("is_free", true);
    }

    if (isOpen) {
      query = query.eq("is_open_enrollment", true);
    }

    if (language) {
      query = query.contains("languages", [language]);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching support groups:", error);
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
 * POST /api/family/support-groups
 * Create a new support group (admin only)
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

    if (!profile || !["admin", "developer"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const { data, error } = await supabase
      .from("support_groups")
      .insert({
        name: body.name,
        name_fr: body.nameFr,
        description: body.description,
        description_fr: body.descriptionFr,
        group_type: body.groupType,
        category: body.category || "missing_persons_families",
        organization_name: body.organizationName,
        facilitator_name: body.facilitatorName,
        facilitator_credentials: body.facilitatorCredentials,
        meeting_frequency: body.meetingFrequency,
        meeting_day: body.meetingDay,
        meeting_time: body.meetingTime,
        timezone: body.timezone || "America/Toronto",
        location: body.location,
        virtual_platform: body.virtualPlatform,
        virtual_link: body.virtualLink,
        max_participants: body.maxParticipants,
        is_open_enrollment: body.isOpenEnrollment ?? true,
        registration_required: body.registrationRequired ?? false,
        registration_url: body.registrationUrl,
        contact_email: body.contactEmail,
        contact_phone: body.contactPhone,
        serves_provinces: body.servesProvinces || [],
        languages: body.languages || ["en"],
        is_free: body.isFree ?? true,
        cost_info: body.costInfo,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating support group:", error);
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
