import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/search-events/[id]/sos
 * Trigger an SOS alert
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
      .select("id, first_name, last_name")
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
      .from("sos_alerts")
      .insert({
        event_id: id,
        volunteer_id: volunteer.id,
        volunteer_name: `${volunteer.first_name} ${volunteer.last_name}`,
        lat: body.lat,
        lng: body.lng,
        notes: body.notes,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating SOS alert:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // TODO: Send push notifications to event organizers

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
 * PATCH /api/search-events/[id]/sos
 * Update SOS alert status
 */
export async function PATCH(
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
    const { alertId, status, notes } = body;

    const updateData: any = { status, notes };

    if (status === "acknowledged") {
      updateData.acknowledged_at = new Date().toISOString();
      updateData.acknowledged_by = user.id;
    } else if (status === "resolved") {
      updateData.resolved_at = new Date().toISOString();
      updateData.resolved_by = user.id;
    }

    const { data, error } = await supabase
      .from("sos_alerts")
      .update(updateData)
      .eq("id", alertId)
      .eq("event_id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating SOS alert:", error);
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
