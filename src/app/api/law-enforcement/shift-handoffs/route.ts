/**
 * Shift Handoffs API Route
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { shiftHandoffService, type CreateHandoffInput, type HandoffFilters } from "@/lib/services/shift-handoff-service";
import { logger } from "../../../../lib/logger";

async function verifyLEAccess() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { authorized: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["law_enforcement", "admin", "developer"].includes(profile.role))
    return { authorized: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { authorized: true as const, user };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyLEAccess();
    if (!auth.authorized) return auth.response;

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
    logger.error("[API] Error listing handoffs:", { error: error });
    return NextResponse.json(
      { error: "Failed to list handoffs" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyLEAccess();
    if (!auth.authorized) return auth.response;

    const body = await request.json();
    const fromOfficerId = auth.user.id;
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
    logger.error("[API] Error creating handoff:", { error: error });
    return NextResponse.json(
      { error: "Failed to create handoff" },
      { status: 500 }
    );
  }
}
