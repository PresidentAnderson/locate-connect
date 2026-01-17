import { NextRequest, NextResponse } from "next/server";
import {
  getAllJurisdictionProfiles,
  getJurisdictionProfile,
} from "@/lib/services/jurisdiction-service";

/**
 * GET /api/admin/jurisdictions
 * List all jurisdiction profiles
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    // If id is provided, return single profile
    if (id) {
      const profile = getJurisdictionProfile(id);
      return NextResponse.json({ profile }, { status: 200 });
    }

    // Otherwise, return all profiles
    const profiles = getAllJurisdictionProfiles();

    return NextResponse.json(
      {
        profiles,
        count: profiles.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching jurisdiction profiles:", error);
    return NextResponse.json(
      { error: "Failed to fetch jurisdiction profiles" },
      { status: 500 }
    );
  }
}
