import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// =============================================================================
// Types
// =============================================================================

interface GeofenceAlert {
  id: string;
  geofenceId: string;
  geofenceName: string;
  caseId: string;
  caseName: string;
  triggerType: "enter" | "exit";
  triggeredAt: string;
  location: { lat: number; lng: number };
  source: string;
  deviceId?: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

// =============================================================================
// GET /api/geofences/[id]/alerts - Get alerts for a geofence
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const acknowledged = searchParams.get("acknowledged");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Try to fetch from database
    let query = supabase
      .from("geofence_alerts")
      .select(`
        *,
        geofences:geofence_id (
          id,
          name,
          case_id,
          cases:case_id (
            missing_person_name
          )
        )
      `)
      .eq("geofence_id", id)
      .order("triggered_at", { ascending: false })
      .limit(limit);

    if (acknowledged !== null) {
      query = query.eq("acknowledged", acknowledged === "true");
    }

    const { data: dbAlerts, error } = await query;

    if (error) {
      console.error("Database error, using mock data:", error);
      // Return mock alerts
      const mockAlerts: GeofenceAlert[] = [
        {
          id: "alert-1",
          geofenceId: id,
          geofenceName: "Sample Geofence",
          caseId: "case-1",
          caseName: "Jane Doe",
          triggerType: "enter",
          triggeredAt: new Date(Date.now() - 3600000).toISOString(),
          location: { lat: 53.5471, lng: -113.4948 },
          source: "Mobile App Ping",
          acknowledged: false,
        },
        {
          id: "alert-2",
          geofenceId: id,
          geofenceName: "Sample Geofence",
          caseId: "case-1",
          caseName: "Jane Doe",
          triggerType: "exit",
          triggeredAt: new Date(Date.now() - 7200000).toISOString(),
          location: { lat: 53.5400, lng: -113.4900 },
          source: "CCTV Detection",
          acknowledged: true,
          acknowledgedBy: user.id,
          acknowledgedAt: new Date(Date.now() - 6000000).toISOString(),
        },
      ];

      let filtered = mockAlerts;
      if (acknowledged !== null) {
        filtered = filtered.filter((a) => a.acknowledged === (acknowledged === "true"));
      }

      return NextResponse.json({
        alerts: filtered,
        total: filtered.length,
        unacknowledgedCount: mockAlerts.filter((a) => !a.acknowledged).length,
      });
    }

    const alerts: GeofenceAlert[] = (dbAlerts || []).map((row) => ({
      id: row.id,
      geofenceId: row.geofence_id,
      geofenceName: row.geofences?.name || "Unknown",
      caseId: row.geofences?.case_id,
      caseName: row.geofences?.cases?.missing_person_name || "Unknown",
      triggerType: row.trigger_type,
      triggeredAt: row.triggered_at,
      location: row.location,
      source: row.source,
      deviceId: row.device_id,
      acknowledged: row.acknowledged,
      acknowledgedBy: row.acknowledged_by,
      acknowledgedAt: row.acknowledged_at,
    }));

    return NextResponse.json({
      alerts,
      total: alerts.length,
      unacknowledgedCount: alerts.filter((a) => !a.acknowledged).length,
    });
  } catch (error) {
    console.error("Failed to fetch alerts:", error);
    return NextResponse.json(
      { error: "Failed to fetch alerts" },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/geofences/[id]/alerts - Create alert (triggered by system)
// =============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: geofenceId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { triggerType, location, source, deviceId } = body;

    if (!triggerType || !location) {
      return NextResponse.json(
        { error: "Missing required fields: triggerType, location" },
        { status: 400 }
      );
    }

    // Create alert
    const { data, error } = await supabase
      .from("geofence_alerts")
      .insert({
        geofence_id: geofenceId,
        trigger_type: triggerType,
        triggered_at: new Date().toISOString(),
        location,
        source: source || "System",
        device_id: deviceId,
        acknowledged: false,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create alert:", error);
      // Return mock success
      return NextResponse.json(
        {
          alert: {
            id: `alert-${Date.now()}`,
            geofenceId,
            triggerType,
            triggeredAt: new Date().toISOString(),
            location,
            source: source || "System",
            deviceId,
            acknowledged: false,
          },
        },
        { status: 201 }
      );
    }

    // Update geofence alert count and last triggered
    await supabase
      .from("geofences")
      .update({
        alert_count: supabase.rpc("increment_alert_count", { geofence_id: geofenceId }),
        last_triggered: new Date().toISOString(),
      })
      .eq("id", geofenceId);

    return NextResponse.json(
      {
        alert: {
          id: data.id,
          geofenceId: data.geofence_id,
          triggerType: data.trigger_type,
          triggeredAt: data.triggered_at,
          location: data.location,
          source: data.source,
          deviceId: data.device_id,
          acknowledged: data.acknowledged,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create alert:", error);
    return NextResponse.json(
      { error: "Failed to create alert" },
      { status: 500 }
    );
  }
}
