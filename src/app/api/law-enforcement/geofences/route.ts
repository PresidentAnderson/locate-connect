/**
 * Geofencing API Route
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { geofencingService, type CreateGeofenceInput } from "@/lib/services/geofencing-service";
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

    if (!caseId) {
      return NextResponse.json({ error: "caseId required" }, { status: 400 });
    }

    const geofences = await geofencingService.listGeofences(caseId);

    return NextResponse.json({ geofences });
  } catch (error) {
    logger.error("[API] Error listing geofences:", { error: error });
    return NextResponse.json(
      { error: "Failed to list geofences" },
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
    logger.error("[API] Error creating geofence:", { error: error });
    return NextResponse.json(
      { error: "Failed to create geofence" },
      { status: 500 }
    );
  }
}
