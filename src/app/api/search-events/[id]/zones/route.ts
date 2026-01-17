import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/search-events/[id]/zones
 * List search zones for an event
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("search_zones")
      .select(`
        *,
        findings:zone_findings(*)
      `)
      .eq("event_id", id)
      .order("zone_code", { ascending: true });

    if (error) {
      console.error("Error fetching zones:", error);
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

/**
 * POST /api/search-events/[id]/zones
 * Create a search zone
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const { data, error } = await supabase
      .from("search_zones")
      .insert({
        event_id: id,
        zone_name: body.zoneName,
        zone_code: body.zoneCode,
        description: body.description,
        priority: body.priority || "medium",
        bounds: body.bounds,
        polygon_coords: body.polygonCoords,
        terrain_type: body.terrainType || [],
        estimated_search_time_minutes: body.estimatedSearchTimeMinutes,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating zone:", error);
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
