import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/search-events
 * List search events with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    const caseId = searchParams.get("caseId");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("search_events")
      .select("*", { count: "exact" })
      .order("event_date", { ascending: false });

    if (caseId) {
      query = query.eq("case_id", caseId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching search events:", error);
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
 * POST /api/search-events
 * Create a new search event
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

    const body = await request.json();

    const { data, error } = await supabase
      .from("search_events")
      .insert({
        case_id: body.caseId,
        name: body.name,
        description: body.description,
        event_date: body.eventDate,
        start_time: body.startTime,
        end_time: body.endTime,
        meeting_point_address: body.meetingPointAddress,
        meeting_point_lat: body.meetingPointLat,
        meeting_point_lng: body.meetingPointLng,
        search_area_description: body.searchAreaDescription,
        max_volunteers: body.maxVolunteers,
        minimum_age: body.minimumAge,
        requires_waiver: body.requiresWaiver ?? true,
        equipment_provided: body.equipmentProvided || [],
        equipment_required: body.equipmentRequired || [],
        terrain_type: body.terrainType || [],
        difficulty_level: body.difficultyLevel || "moderate",
        accessibility_notes: body.accessibilityNotes,
        emergency_contact_name: body.emergencyContactName,
        emergency_contact_phone: body.emergencyContactPhone,
        organizer_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating search event:", error);
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
