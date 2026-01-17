import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/search-events/[id]/dashboard
 * Get comprehensive dashboard data for a search event
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch event details
    const { data: event, error: eventError } = await supabase
      .from("search_events")
      .select("*")
      .eq("id", id)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Fetch volunteers
    const { data: volunteers } = await supabase
      .from("search_volunteers")
      .select("*")
      .eq("event_id", id)
      .in("status", ["checked_in", "active"]);

    // Fetch zones with findings count
    const { data: zones } = await supabase
      .from("search_zones")
      .select(`
        *,
        findings:zone_findings(count)
      `)
      .eq("event_id", id);

    // Fetch teams with members
    const { data: teams } = await supabase
      .from("search_teams")
      .select(`
        *,
        leader:team_leader_id(first_name, last_name),
        members:team_members(
          volunteer:search_volunteers(*)
        ),
        zone_assignments:team_zone_assignments(zone_id)
      `)
      .eq("event_id", id);

    // Fetch active SOS alerts
    const { data: sosAlerts } = await supabase
      .from("sos_alerts")
      .select("*")
      .eq("event_id", id)
      .in("status", ["active", "acknowledged"])
      .order("triggered_at", { ascending: false });

    // Fetch recent incidents
    const { data: incidents } = await supabase
      .from("search_incidents")
      .select("*")
      .eq("event_id", id)
      .order("reported_at", { ascending: false })
      .limit(10);

    // Fetch latest GPS positions
    const { data: gpsPositions } = await supabase
      .from("volunteer_gps_positions")
      .select(`
        volunteer_id,
        lat,
        lng,
        accuracy,
        heading,
        speed,
        timestamp,
        battery_level,
        volunteer:search_volunteers(first_name, last_name, status)
      `)
      .eq("event_id", id)
      .order("timestamp", { ascending: false });

    // Get unique latest positions per volunteer
    const latestPositionsMap = new Map();
    gpsPositions?.forEach((pos: any) => {
      if (!latestPositionsMap.has(pos.volunteer_id)) {
        latestPositionsMap.set(pos.volunteer_id, {
          volunteerId: pos.volunteer_id,
          volunteerName: `${pos.volunteer.first_name} ${pos.volunteer.last_name}`,
          lat: pos.lat,
          lng: pos.lng,
          accuracy: pos.accuracy,
          heading: pos.heading,
          speed: pos.speed,
          timestamp: pos.timestamp,
          batteryLevel: pos.battery_level,
          isActive: pos.volunteer.status === "active",
        });
      }
    });
    const volunteerPositions = Array.from(latestPositionsMap.values());

    // Calculate stats
    const { data: volunteerStats } = await supabase
      .from("search_volunteers")
      .select("status")
      .eq("event_id", id);

    const stats = {
      totalRegistered: volunteerStats?.filter((v) =>
        ["registered", "checked_in", "active", "checked_out"].includes(v.status)
      ).length || 0,
      totalCheckedIn: volunteerStats?.filter((v) =>
        ["checked_in", "active", "checked_out"].includes(v.status)
      ).length || 0,
      totalActive: volunteerStats?.filter((v) => v.status === "active").length || 0,
      totalCheckedOut: volunteerStats?.filter((v) => v.status === "checked_out").length || 0,
      totalNoShow: volunteerStats?.filter((v) => v.status === "no_show").length || 0,
      zonesTotal: zones?.length || 0,
      zonesCleared: zones?.filter((z) => z.status === "cleared").length || 0,
      zonesInProgress: zones?.filter((z) => z.status === "in_progress").length || 0,
      coveragePercentage: zones?.length > 0
        ? Math.round(
            zones.reduce((acc, z) => acc + (z.coverage_percentage || 0), 0) / zones.length
          )
        : 0,
      findingsCount: zones?.reduce((acc, z) => acc + (z.findings?.[0]?.count || 0), 0) || 0,
      significantFindingsCount: 0, // Would need a separate query
      incidentsCount: incidents?.length || 0,
      sosAlertsCount: sosAlerts?.length || 0,
      searchDurationMinutes: 0, // Calculate based on start/end times
    };

    // Transform zones to match expected format
    const transformedZones = zones?.map((zone: any) => ({
      ...zone,
      findings: [], // Full findings would need a separate query
      assignedVolunteerIds: [], // Would need to fetch from team_members
    })) || [];

    // Transform teams
    const transformedTeams = teams?.map((team: any) => ({
      ...team,
      memberIds: team.members?.map((m: any) => m.volunteer.id) || [],
      assignedZoneIds: team.zone_assignments?.map((za: any) => za.zone_id) || [],
    })) || [];

    const dashboardData = {
      event,
      stats,
      zones: transformedZones,
      teams: transformedTeams,
      activeVolunteers: volunteers || [],
      volunteerPositions,
      activeSOSAlerts: sosAlerts || [],
      recentIncidents: incidents || [],
      weatherForecast: null, // Would integrate with weather API
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
