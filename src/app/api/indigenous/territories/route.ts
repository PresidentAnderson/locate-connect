import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/indigenous/territories
 * List traditional territories
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const nation = searchParams.get("nation");
    const treatyNumber = searchParams.get("treaty");
    const search = searchParams.get("search");
    const includeGeojson = searchParams.get("geojson") === "true";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build select fields - exclude geojson by default for performance
    const selectFields = includeGeojson
      ? "*"
      : `
        id, name, name_traditional, nation, description, historical_context,
        bounds_north, bounds_south, bounds_east, bounds_west,
        center_latitude, center_longitude, treaty_number, treaty_name, treaty_year,
        modern_community_ids, overlapping_jurisdiction_ids, is_active, created_at, updated_at
      `;

    let query = supabase
      .from("traditional_territories")
      .select(selectFields, { count: "exact" })
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (nation) {
      query = query.ilike("nation", `%${nation}%`);
    }

    if (treatyNumber) {
      query = query.eq("treaty_number", treatyNumber);
    }

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,name_traditional.ilike.%${search}%,nation.ilike.%${search}%`
      );
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching territories:", error);
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
 * POST /api/indigenous/territories
 * Create a new traditional territory (admin only)
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
      .from("traditional_territories")
      .insert({
        name: body.name,
        name_traditional: body.nameTraditional,
        nation: body.nation,
        description: body.description,
        historical_context: body.historicalContext,
        bounds_north: body.boundsNorth,
        bounds_south: body.boundsSouth,
        bounds_east: body.boundsEast,
        bounds_west: body.boundsWest,
        center_latitude: body.centerLatitude,
        center_longitude: body.centerLongitude,
        boundary_geojson: body.boundaryGeojson,
        treaty_number: body.treatyNumber,
        treaty_name: body.treatyName,
        treaty_year: body.treatyYear,
        modern_community_ids: body.modernCommunityIds || [],
        overlapping_jurisdiction_ids: body.overlappingJurisdictionIds || [],
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating territory:", error);
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
