import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/search-events/[id]/incidents
 * Report an incident
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

    // Get volunteer info
    const { data: volunteer } = await supabase
      .from("search_volunteers")
      .select("id")
      .eq("event_id", id)
      .eq("user_id", user.id)
      .single();

    if (!volunteer) {
      return NextResponse.json(
        { error: "Volunteer registration not found" },
        { status: 404 }
      );
    }

    const { data, error } = await supabase
      .from("search_incidents")
      .insert({
        event_id: id,
        incident_type: body.incidentType,
        severity: body.severity,
        description: body.description,
        location: body.location,
        reported_by: volunteer.id,
        response_actions: body.responseActions || [],
        requires_follow_up: body.requiresFollowUp || false,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating incident:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Link affected volunteers if provided
    if (body.affectedVolunteerIds && body.affectedVolunteerIds.length > 0) {
      await supabase
        .from("incident_affected_volunteers")
        .insert(
          body.affectedVolunteerIds.map((volunteerId: string) => ({
            incident_id: data.id,
            volunteer_id: volunteerId,
          }))
        );
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

/**
 * GET /api/search-events/[id]/incidents
 * List incidents for an event
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("search_incidents")
      .select(`
        *,
        reporter:reported_by(first_name, last_name),
        affected:incident_affected_volunteers(volunteer:search_volunteers(*))
      `)
      .eq("event_id", id)
      .order("reported_at", { ascending: false });

    if (error) {
      console.error("Error fetching incidents:", error);
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
