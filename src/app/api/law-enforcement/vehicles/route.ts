/**
 * Vehicle Tracking API Route
 */

import { NextRequest, NextResponse } from "next/server";
import { vehicleTrackingService, type CreateVehicleInput } from "@/lib/services/vehicle-tracking-service";

export async function GET(request: NextRequest) {
  try {
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
    console.error("[API] Error listing vehicles:", error);
    return NextResponse.json(
      { error: "Failed to list vehicles" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = request.headers.get("x-user-id") || "system";

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
    console.error("[API] Error creating vehicle:", error);
    return NextResponse.json(
      { error: "Failed to create vehicle" },
      { status: 500 }
    );
  }
}
