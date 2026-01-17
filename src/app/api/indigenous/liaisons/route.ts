import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/indigenous/liaisons
 * List all active Indigenous liaison contacts
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify user has appropriate access
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

    const organizationId = searchParams.get("organizationId");
    const communityId = searchParams.get("communityId");
    const language = searchParams.get("language");
    const region = searchParams.get("region");
    const available24_7 = searchParams.get("available24_7") === "true";
    const primaryOnly = searchParams.get("primary") === "true";
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("indigenous_liaison_contacts")
      .select(
        `
        *,
        organization:indigenous_organizations(id, name, acronym, org_type),
        community:indigenous_communities(id, name, province)
      `,
        { count: "exact" }
      )
      .eq("is_active", true)
      .order("last_name", { ascending: true });

    if (organizationId) {
      query = query.eq("organization_id", organizationId);
    }

    if (communityId) {
      query = query.eq("community_id", communityId);
    }

    if (language) {
      query = query.contains("languages_spoken", [language]);
    }

    if (region) {
      query = query.contains("coverage_regions", [region]);
    }

    if (available24_7) {
      query = query.eq("available_24_7", true);
    }

    if (primaryOnly) {
      query = query.eq("is_primary_contact", true);
    }

    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%`
      );
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching liaisons:", error);
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
 * POST /api/indigenous/liaisons
 * Create a new Indigenous liaison contact (admin only)
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
      .from("indigenous_liaison_contacts")
      .insert({
        profile_id: body.profileId,
        first_name: body.firstName,
        last_name: body.lastName,
        title: body.title,
        organization_id: body.organizationId,
        community_id: body.communityId,
        languages_spoken: body.languagesSpoken || [],
        speaks_english: body.speaksEnglish ?? true,
        speaks_french: body.speaksFrench ?? false,
        email: body.email,
        phone: body.phone,
        mobile_phone: body.mobilePhone,
        preferred_contact_method: body.preferredContactMethod,
        available_24_7: body.available24_7 ?? false,
        availability_notes: body.availabilityNotes,
        specializations: body.specializations || [],
        cultural_protocols_trained: body.culturalProtocolsTrained ?? false,
        trauma_informed_trained: body.traumaInformedTrained ?? false,
        coverage_regions: body.coverageRegions || [],
        coverage_communities: body.coverageCommunities || [],
        is_primary_contact: body.isPrimaryContact ?? false,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating liaison:", error);
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
