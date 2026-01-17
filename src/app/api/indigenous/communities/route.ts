import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/indigenous/communities
 * List all active Indigenous communities
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const province = searchParams.get("province");
    const nation = searchParams.get("nation");
    const communityType = searchParams.get("type");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("indigenous_communities")
      .select("*", { count: "exact" })
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (province) {
      query = query.eq("province", province);
    }

    if (nation) {
      query = query.ilike("nation", `%${nation}%`);
    }

    if (communityType) {
      query = query.eq("community_type", communityType);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,name_traditional.ilike.%${search}%`);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching communities:", error);
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
 * POST /api/indigenous/communities
 * Create a new Indigenous community (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is authenticated and has admin role
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
      .from("indigenous_communities")
      .insert({
        name: body.name,
        name_traditional: body.nameTraditional,
        community_type: body.communityType,
        nation: body.nation,
        treaty_area: body.treatyArea,
        province: body.province,
        region: body.region,
        latitude: body.latitude,
        longitude: body.longitude,
        traditional_territory_description: body.traditionalTerritoryDescription,
        primary_language: body.primaryLanguage,
        secondary_languages: body.secondaryLanguages || [],
        population_estimate: body.populationEstimate,
        band_office_phone: body.bandOfficePhone,
        band_office_email: body.bandOfficeEmail,
        band_office_address: body.bandOfficeAddress,
        emergency_contact_name: body.emergencyContactName,
        emergency_contact_phone: body.emergencyContactPhone,
        emergency_contact_email: body.emergencyContactEmail,
        policing_arrangement: body.policingArrangement,
        police_service_name: body.policeServiceName,
        police_service_phone: body.policeServicePhone,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating community:", error);
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
