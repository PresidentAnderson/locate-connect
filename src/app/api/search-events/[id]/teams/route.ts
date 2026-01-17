import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/search-events/[id]/teams
 * List teams for an event
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("search_teams")
      .select(`
        *,
        leader:team_leader_id(first_name, last_name),
        members:team_members(volunteer:search_volunteers(*)),
        zones:team_zone_assignments(zone:search_zones(*))
      `)
      .eq("event_id", id)
      .order("team_name", { ascending: true });

    if (error) {
      console.error("Error fetching teams:", error);
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
 * POST /api/search-events/[id]/teams
 * Create a team
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

    const { data: team, error } = await supabase
      .from("search_teams")
      .insert({
        event_id: id,
        team_name: body.teamName,
        team_leader_id: body.teamLeaderId,
        radio_channel: body.radioChannel,
        notes: body.notes,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating team:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Add team members
    if (body.memberIds && body.memberIds.length > 0) {
      await supabase
        .from("team_members")
        .insert(
          body.memberIds.map((volunteerId: string) => ({
            team_id: team.id,
            volunteer_id: volunteerId,
          }))
        );
    }

    // Assign zones
    if (body.zoneIds && body.zoneIds.length > 0) {
      await supabase
        .from("team_zone_assignments")
        .insert(
          body.zoneIds.map((zoneId: string) => ({
            team_id: team.id,
            zone_id: zoneId,
          }))
        );
    }

    return NextResponse.json({ data: team }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
