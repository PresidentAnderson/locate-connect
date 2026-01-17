/**
 * Search Parties (Volunteer Coordinator) API Route
 */

import { NextRequest, NextResponse } from "next/server";
import { volunteerCoordinatorService, type CreateSearchPartyInput } from "@/lib/services/volunteer-coordinator-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get("caseId");
    const active = searchParams.get("active");
    const upcoming = searchParams.get("upcoming");

    if (active === "true") {
      const parties = await volunteerCoordinatorService.getActiveSearchParties();
      return NextResponse.json({ searchParties: parties });
    }

    if (upcoming === "true") {
      const parties = await volunteerCoordinatorService.getUpcomingSearchParties();
      return NextResponse.json({ searchParties: parties });
    }

    if (caseId) {
      const parties = await volunteerCoordinatorService.listSearchParties(caseId);
      return NextResponse.json({ searchParties: parties });
    }

    return NextResponse.json(
      { error: "caseId required" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[API] Error listing search parties:", error);
    return NextResponse.json(
      { error: "Failed to list search parties" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const coordinatorId = request.headers.get("x-user-id") || "system";
    const coordinatorName = request.headers.get("x-user-name") || "System";

    const input: CreateSearchPartyInput = {
      caseId: body.caseId,
      name: body.name,
      searchArea: body.searchArea,
      scheduledStart: body.scheduledStart,
      scheduledEnd: body.scheduledEnd,
      meetingPoint: body.meetingPoint,
      maxVolunteers: body.maxVolunteers || 50,
      requiredEquipment: body.requiredEquipment,
      providedEquipment: body.providedEquipment,
      safetyBriefing: body.safetyBriefing,
      emergencyContact: body.emergencyContact,
    };

    const party = await volunteerCoordinatorService.createSearchParty(
      input,
      coordinatorId,
      coordinatorName
    );

    return NextResponse.json(party, { status: 201 });
  } catch (error) {
    console.error("[API] Error creating search party:", error);
    return NextResponse.json(
      { error: "Failed to create search party" },
      { status: 500 }
    );
  }
}
