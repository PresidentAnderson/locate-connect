import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/indigenous/consultations
 * List community consultations (law enforcement only)
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
    const status = searchParams.get("status");
    const consultationType = searchParams.get("type");
    const upcoming = searchParams.get("upcoming") === "true";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("community_consultations")
      .select(
        `
        *,
        community:indigenous_communities(id, name, province),
        organization:indigenous_organizations(id, name, acronym)
      `,
        { count: "exact" }
      )
      .order("scheduled_date", { ascending: true });

    if (caseId) {
      query = query.eq("case_id", caseId);
    }

    if (communityId) {
      query = query.eq("community_id", communityId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (consultationType) {
      query = query.eq("consultation_type", consultationType);
    }

    if (upcoming) {
      query = query
        .in("status", ["pending", "scheduled"])
        .gte("scheduled_date", new Date().toISOString());
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching consultations:", error);
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
 * POST /api/indigenous/consultations
 * Schedule a new community consultation (law enforcement only)
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

    const { data, error } = await supabase
      .from("community_consultations")
      .insert({
        case_id: body.caseId,
        mmiwg_case_id: body.mmiwgCaseId,
        community_id: body.communityId,
        organization_id: body.organizationId,
        consultation_type: body.consultationType,
        status: "scheduled",
        scheduled_date: body.scheduledDate,
        location: body.location,
        is_on_reserve: body.isOnReserve ?? false,
        law_enforcement_participants: [user.id],
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating consultation:", error);
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
