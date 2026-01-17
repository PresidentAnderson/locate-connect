import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/indigenous/resources
 * List cultural sensitivity resources
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const category = searchParams.get("category");
    const nation = searchParams.get("nation");
    const publicOnly = searchParams.get("public") === "true";
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Check user access level
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let userRole: string | null = null;
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      userRole = profile?.role || null;
    }

    let query = supabase
      .from("cultural_sensitivity_resources")
      .select("*", { count: "exact" })
      .eq("is_active", true)
      .order("title", { ascending: true });

    // Non-authenticated users can only see public resources
    if (!user || publicOnly) {
      query = query.eq("is_public", true);
    }

    // Law enforcement only resources require appropriate role
    if (
      userRole &&
      !["law_enforcement", "admin", "developer"].includes(userRole)
    ) {
      query = query.eq("law_enforcement_only", false);
    }

    if (category) {
      query = query.eq("category", category);
    }

    if (nation) {
      query = query.or(`applies_to_nations.cs.{${nation}},is_universal.eq.true`);
    }

    if (search) {
      query = query.or(
        `title.ilike.%${search}%,title_fr.ilike.%${search}%,content.ilike.%${search}%`
      );
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching resources:", error);
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
 * POST /api/indigenous/resources
 * Create a new cultural sensitivity resource (admin only)
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
      .from("cultural_sensitivity_resources")
      .insert({
        title: body.title,
        title_fr: body.titleFr,
        title_indigenous: body.titleIndigenous,
        content: body.content,
        content_fr: body.contentFr,
        content_indigenous: body.contentIndigenous,
        category: body.category,
        subcategory: body.subcategory,
        applies_to_nations: body.appliesToNations || [],
        applies_to_regions: body.appliesToRegions || [],
        is_universal: body.isUniversal ?? false,
        resource_type: body.resourceType,
        resource_url: body.resourceUrl,
        contains_traditional_knowledge:
          body.containsTraditionalKnowledge ?? false,
        traditional_knowledge_consent: body.traditionalKnowledgeConsent,
        community_approved: body.communityApproved ?? false,
        approved_by_community_id: body.approvedByCommunityId,
        is_public: body.isPublic ?? false,
        requires_training: body.requiresTraining ?? false,
        law_enforcement_only: body.lawEnforcementOnly ?? false,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating resource:", error);
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
