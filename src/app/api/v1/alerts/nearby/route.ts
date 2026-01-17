/**
 * Nearby Alerts API
 * GET /api/v1/alerts/nearby
 * LC-FEAT-031: Mobile App Companion
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get("lat") || "0");
    const lng = parseFloat(searchParams.get("lng") || "0");
    const radius = parseFloat(searchParams.get("radius") || "50"); // km

    if (!lat || !lng) {
      return NextResponse.json(
        { error: "Latitude and longitude are required" },
        { status: 400 }
      );
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: "Invalid coordinates" },
        { status: 400 }
      );
    }

    // Call the database function to find nearby cases
    const { data: cases, error } = await supabase.rpc("find_nearby_cases", {
      p_latitude: lat,
      p_longitude: lng,
      p_radius_km: Math.min(radius, 100), // Cap at 100km
    });

    if (error) {
      console.error("Error fetching nearby cases:", error);

      // Fallback query if the function doesn't exist
      const { data: fallbackCases, error: fallbackError } = await supabase
        .from("cases")
        .select(`
          id,
          person_name,
          age,
          status,
          priority,
          last_seen_date,
          last_seen_address,
          photo_url,
          case_type
        `)
        .eq("status", "active")
        .limit(20);

      if (fallbackError) {
        return NextResponse.json(
          { error: "Failed to fetch nearby cases" },
          { status: 500 }
        );
      }

      // Transform fallback data
      const transformedCases = (fallbackCases || []).map((c) => ({
        id: c.id,
        personName: c.person_name,
        age: c.age,
        lastSeenDate: c.last_seen_date,
        lastSeenLocation: c.last_seen_address,
        photoUrl: c.photo_url,
        distance: 0, // Unknown without PostGIS
        priority: mapPriority(c.priority),
        type: mapCaseType(c.case_type),
      }));

      return NextResponse.json({
        cases: transformedCases,
        location: { lat, lng },
        radius,
        fallback: true,
      });
    }

    // Transform data to match expected format
    const transformedCases = (cases || []).map((c: {
      case_id: string;
      person_name: string;
      distance_km: number;
      last_seen_location: string;
      priority: string;
    }) => ({
      id: c.case_id,
      personName: c.person_name,
      distance: c.distance_km,
      lastSeenLocation: c.last_seen_location,
      priority: mapPriority(c.priority),
      type: "missing" as const,
    }));

    return NextResponse.json({
      cases: transformedCases,
      location: { lat, lng },
      radius,
      count: transformedCases.length,
    });
  } catch (error) {
    console.error("Nearby alerts error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function mapPriority(
  priority: string | number | null
): "critical" | "high" | "medium" | "low" {
  if (priority === null || priority === undefined) return "medium";

  const numPriority = typeof priority === "string" ? parseInt(priority) : priority;

  switch (numPriority) {
    case 4:
    case 3:
      return "critical";
    case 2:
      return "high";
    case 1:
      return "medium";
    default:
      return "low";
  }
}

function mapCaseType(
  caseType: string | null
): "missing" | "endangered" | "amber_alert" {
  if (!caseType) return "missing";

  const type = caseType.toLowerCase();
  if (type.includes("amber")) return "amber_alert";
  if (type.includes("endangered")) return "endangered";
  return "missing";
}
