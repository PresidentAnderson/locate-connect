/**
 * Vehicle Tracking API Route
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { vehicleTrackingService, type CreateVehicleInput } from "@/lib/services/vehicle-tracking-service";
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
    const caseId = searchParams.get("caseId");
    const plate = searchParams.get("plate");
    const state = searchParams.get("state") || undefined;

    if (plate) {
      const vehicle = await vehicleTrackingService.findByPlate(plate, state);
      return NextResponse.json({ vehicle });
    }

    if (caseId) {
      const vehicles = await vehicleTrackingService.listVehicles(caseId);
      return NextResponse.json({ vehicles });
    }

    return NextResponse.json(
      { error: "caseId or plate required" },
      { status: 400 }
    );
  } catch (error) {
    logger.error("[API] Error listing vehicles:", { error: error });
    return NextResponse.json(
      { error: "Failed to list vehicles" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyLEAccess();
    if (!auth.authorized) return auth.response;

    const body = await request.json();
    const userId = auth.user.id;

    const input: CreateVehicleInput = {
      caseId: body.caseId,
      licensePlate: body.licensePlate,
      state: body.state,
      make: body.make,
      model: body.model,
      year: body.year,
      color: body.color,
      vin: body.vin,
      ownerName: body.ownerName,
      isTarget: body.isTarget,
    };

    const vehicle = await vehicleTrackingService.createVehicle(input, userId);

    return NextResponse.json(vehicle, { status: 201 });
  } catch (error) {
    logger.error("[API] Error creating vehicle:", { error: error });
    return NextResponse.json(
      { error: "Failed to create vehicle" },
      { status: 500 }
    );
  }
}
