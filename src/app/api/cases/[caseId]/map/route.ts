import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/cases/[caseId]/map - Get map data for a case
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch case details for last known location
    const { data: caseData } = await supabase
      .from("cases")
      .select("id, last_seen_lat, last_seen_lng, last_seen_location")
      .eq("id", caseId)
      .single();

    // Fetch sightings for the case
    const { data: sightingsData } = await supabase
      .from("sightings")
      .select("*")
      .eq("case_id", caseId)
      .order("reported_at", { ascending: false });

    // Fetch search areas if table exists
    const { data: searchAreasData } = await supabase
      .from("search_areas")
      .select("*")
      .eq("case_id", caseId)
      .order("priority", { ascending: true });

    // Transform data for the map
    const lastSeenLocation = caseData?.last_seen_lat && caseData?.last_seen_lng
      ? { lat: caseData.last_seen_lat, lng: caseData.last_seen_lng }
      : null;

    const sightings = (sightingsData || []).map((s) => ({
      id: s.id,
      coordinates: { lat: s.latitude, lng: s.longitude },
      reportedAt: s.reported_at,
      description: s.description,
      confidence: s.confidence || "unverified",
      status: s.status || "pending",
    }));

    const searchAreas = (searchAreasData || []).map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type || "primary",
      priority: a.priority || "medium",
      status: a.status || "planned",
      coordinates: a.coordinates || [],
      coverage: a.coverage,
    }));

    // Return mock data if no real data
    if (sightings.length === 0 && !lastSeenLocation) {
      return NextResponse.json({
        lastSeenLocation: { lat: 53.5461, lng: -113.4938 },
        lastSeenAddress: "Downtown Edmonton",
        sightings: [
          {
            id: "mock-1",
            coordinates: { lat: 53.5561, lng: -113.5038 },
            reportedAt: new Date(Date.now() - 3600000).toISOString(),
            description: "Spotted near LRT station",
            confidence: "high",
            status: "verified",
          },
          {
            id: "mock-2",
            coordinates: { lat: 53.5361, lng: -113.4838 },
            reportedAt: new Date(Date.now() - 7200000).toISOString(),
            description: "Possible sighting at coffee shop",
            confidence: "medium",
            status: "pending",
          },
        ],
        searchAreas: [
          {
            id: "area-1",
            name: "Primary Search Zone",
            type: "primary",
            priority: "critical",
            status: "in_progress",
            coordinates: [
              { lat: 53.5661, lng: -113.5238 },
              { lat: 53.5661, lng: -113.4638 },
              { lat: 53.5261, lng: -113.4638 },
              { lat: 53.5261, lng: -113.5238 },
            ],
            coverage: 45,
          },
        ],
        resources: [
          {
            id: "res-1",
            type: "hospital",
            name: "Royal Alexandra Hospital",
            coordinates: { lat: 53.5661, lng: -113.5038 },
            address: "10240 Kingsway NW, Edmonton",
            phone: "780-735-4111",
          },
          {
            id: "res-2",
            type: "police_station",
            name: "EPS Downtown Division",
            coordinates: { lat: 53.5361, lng: -113.4738 },
            address: "9620 103A Ave NW, Edmonton",
          },
        ],
        associates: [],
        activityPoints: [],
      });
    }

    return NextResponse.json({
      lastSeenLocation,
      lastSeenAddress: caseData?.last_seen_location,
      sightings,
      searchAreas,
      resources: [],
      associates: [],
      activityPoints: [],
    });
  } catch (error) {
    console.error("Failed to fetch map data:", error);
    return NextResponse.json(
      { error: "Failed to fetch map data" },
      { status: 500 }
    );
  }
}
