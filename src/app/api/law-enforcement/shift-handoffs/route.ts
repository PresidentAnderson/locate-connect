/**
 * Shift Handoffs API Route
 */

import { NextRequest, NextResponse } from "next/server";
import { shiftHandoffService, type CreateHandoffInput, type HandoffFilters } from "@/lib/services/shift-handoff-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const filters: HandoffFilters = {
      fromOfficerId: searchParams.get("fromOfficerId") || undefined,
      toOfficerId: searchParams.get("toOfficerId") || undefined,
      shiftDate: searchParams.get("shiftDate") || undefined,
      shiftType: searchParams.get("shiftType") as HandoffFilters["shiftType"] || undefined,
      status: searchParams.get("status") as HandoffFilters["status"] || undefined,
    };

    const handoffs = await shiftHandoffService.listHandoffs(filters);

    return NextResponse.json({ handoffs });
  } catch (error) {
    console.error("[API] Error listing handoffs:", error);
    return NextResponse.json(
      { error: "Failed to list handoffs" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const fromOfficerId = request.headers.get("x-user-id") || "system";
    const fromOfficerName = request.headers.get("x-user-name") || "System";

    const input: CreateHandoffInput = {
      toOfficerId: body.toOfficerId,
      toOfficerName: body.toOfficerName,
      shiftDate: body.shiftDate,
      shiftType: body.shiftType,
      caseSummaries: body.caseSummaries,
      actionItems: body.actionItems,
      generalNotes: body.generalNotes,
      urgentNotes: body.urgentNotes,
    };

    const handoff = await shiftHandoffService.createHandoff(
      input,
      fromOfficerId,
      fromOfficerName
    );

    return NextResponse.json(handoff, { status: 201 });
  } catch (error) {
    console.error("[API] Error creating handoff:", error);
    return NextResponse.json(
      { error: "Failed to create handoff" },
      { status: 500 }
    );
  }
}
