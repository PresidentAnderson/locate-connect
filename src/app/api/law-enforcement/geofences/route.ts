/**
 * Geofencing API Route
 */

import { NextRequest, NextResponse } from "next/server";
import { geofencingService, type CreateGeofenceInput } from "@/lib/services/geofencing-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get("caseId");

    if (!caseId) {
      return NextResponse.json({ error: "caseId required" }, { status: 400 });
    }

    const geofences = await geofencingService.listGeofences(caseId);

    return NextResponse.json({ geofences });
  } catch (error) {
    console.error("[API] Error listing geofences:", error);
    return NextResponse.json(
      { error: "Failed to list geofences" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = request.headers.get("x-user-id") || "system";

    const input: CreateGeofenceInput = {
      caseId: body.caseId,
      name: body.name,
      type: body.type,
      geometry: body.geometry,
      alertType: body.alertType || "both",
      expiresAt: body.expiresAt,
      notifications: body.notifications || [],
    };

    const geofence = await geofencingService.createGeofence(input, userId);

    return NextResponse.json(geofence, { status: 201 });
  } catch (error) {
    console.error("[API] Error creating geofence:", error);
    return NextResponse.json(
      { error: "Failed to create geofence" },
      { status: 500 }
    );
  }
}
