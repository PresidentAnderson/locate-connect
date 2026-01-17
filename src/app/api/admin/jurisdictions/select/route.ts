import { NextRequest, NextResponse } from "next/server";
import {
  selectJurisdictionByLocation,
  selectJurisdictionByAddress,
} from "@/lib/services/jurisdiction-service";

/**
 * POST /api/admin/jurisdictions/select
 * Select appropriate jurisdiction based on location data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Try location-based selection first (coordinates)
    if (body.lat !== undefined && body.lng !== undefined) {
      const profile = selectJurisdictionByLocation(body.lat, body.lng);
      return NextResponse.json(
        {
          profile,
          method: "coordinates",
        },
        { status: 200 }
      );
    }

    // Fallback to address-based selection
    if (body.city || body.province || body.country) {
      const profile = selectJurisdictionByAddress(
        body.city,
        body.province,
        body.country
      );
      return NextResponse.json(
        {
          profile,
          method: "address",
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: "Either coordinates (lat/lng) or address (city/province/country) required" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error selecting jurisdiction:", error);
    return NextResponse.json(
      { error: "Failed to select jurisdiction" },
      { status: 500 }
    );
  }
}
