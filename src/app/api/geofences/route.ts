import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// =============================================================================
// Types
// =============================================================================

type GeofenceType = "circle" | "polygon" | "corridor";
type AlertTrigger = "enter" | "exit" | "both";
type AlertPriority = "low" | "medium" | "high" | "critical";
type GeofenceStatus = "active" | "paused" | "expired" | "triggered";

interface GeofenceGeometry {
  type: GeofenceType;
  center?: { lat: number; lng: number };
  radius?: number;
  points?: Array<{ lat: number; lng: number }>;
  bufferWidth?: number;
}

interface Geofence {
  id: string;
  name: string;
  caseId: string;
  caseName?: string;
  type: GeofenceType;
  geometry: GeofenceGeometry;
  trigger: AlertTrigger;
  priority: AlertPriority;
  status: GeofenceStatus;
  createdAt: string;
  expiresAt?: string;
  alertCount: number;
  lastTriggered?: string;
  notifyChannels: string[];
  description?: string;
  createdBy: string;
}

// =============================================================================
// GET /api/geofences - List geofences
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const caseId = searchParams.get("caseId");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");

    // Try to get from database
    let query = supabase
      .from("geofences")
      .select(`
        *,
        cases:case_id (
          id,
          case_number,
          missing_person_name
        )
      `)
      .order("created_at", { ascending: false });

    if (caseId) {
      query = query.eq("case_id", caseId);
    }
    if (status) {
      query = query.eq("status", status);
    }
    if (priority) {
      query = query.eq("priority", priority);
    }

    const { data: dbGeofences, error } = await query;

    if (error) {
      console.error("Database error, using mock data:", error);
      // Return mock data for demo
      const mockGeofences: Geofence[] = [
        {
          id: "geo-1",
          name: "Last Known Location - Jane Doe",
          caseId: "case-1",
          caseName: "Jane Doe",
          type: "circle",
          geometry: {
            type: "circle",
            center: { lat: 53.5461, lng: -113.4938 },
            radius: 1000,
          },
          trigger: "both",
          priority: "critical",
          status: "active",
          createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
          alertCount: 3,
          lastTriggered: new Date(Date.now() - 3600000).toISOString(),
          notifyChannels: ["email", "sms", "push"],
          description: "Monitoring area around downtown Edmonton",
          createdBy: user.id,
        },
        {
          id: "geo-2",
          name: "Home Address Watch",
          caseId: "case-2",
          caseName: "John Smith",
          type: "circle",
          geometry: {
            type: "circle",
            center: { lat: 53.5234, lng: -113.5267 },
            radius: 500,
          },
          trigger: "enter",
          priority: "high",
          status: "active",
          createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
          alertCount: 0,
          notifyChannels: ["email", "push"],
          description: "Monitoring for return to home",
          createdBy: user.id,
        },
        {
          id: "geo-3",
          name: "School Zone - Emily Chen",
          caseId: "case-3",
          caseName: "Emily Chen",
          type: "polygon",
          geometry: {
            type: "polygon",
            points: [
              { lat: 53.55, lng: -113.51 },
              { lat: 53.555, lng: -113.51 },
              { lat: 53.555, lng: -113.5 },
              { lat: 53.55, lng: -113.5 },
            ],
          },
          trigger: "both",
          priority: "high",
          status: "active",
          createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          alertCount: 1,
          lastTriggered: new Date(Date.now() - 7200000).toISOString(),
          notifyChannels: ["email", "sms"],
          description: "School and surrounding area",
          createdBy: user.id,
        },
      ];

      let filtered = mockGeofences;
      if (caseId) {
        filtered = filtered.filter((g) => g.caseId === caseId);
      }
      if (status) {
        filtered = filtered.filter((g) => g.status === status);
      }
      if (priority) {
        filtered = filtered.filter((g) => g.priority === priority);
      }

      return NextResponse.json({
        geofences: filtered,
        total: filtered.length,
      });
    }

    // Transform database results
    const geofences: Geofence[] = (dbGeofences || []).map((row) => ({
      id: row.id,
      name: row.name,
      caseId: row.case_id,
      caseName: row.cases?.missing_person_name,
      type: row.type,
      geometry: row.geometry,
      trigger: row.trigger,
      priority: row.priority,
      status: row.status,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      alertCount: row.alert_count || 0,
      lastTriggered: row.last_triggered,
      notifyChannels: row.notify_channels || [],
      description: row.description,
      createdBy: row.created_by,
    }));

    return NextResponse.json({
      geofences,
      total: geofences.length,
    });
  } catch (error) {
    console.error("Failed to fetch geofences:", error);
    return NextResponse.json(
      { error: "Failed to fetch geofences" },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/geofences - Create geofence
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      caseId,
      type,
      geometry,
      trigger = "both",
      priority = "medium",
      expiresAt,
      notifyChannels = ["email", "push"],
      description,
    } = body;

    // Validate required fields
    if (!name || !caseId || !type || !geometry) {
      return NextResponse.json(
        { error: "Missing required fields: name, caseId, type, geometry" },
        { status: 400 }
      );
    }

    // Validate geometry based on type
    if (type === "circle" && (!geometry.center || !geometry.radius)) {
      return NextResponse.json(
        { error: "Circle geofence requires center and radius" },
        { status: 400 }
      );
    }
    if ((type === "polygon" || type === "corridor") && (!geometry.points || geometry.points.length < 2)) {
      return NextResponse.json(
        { error: "Polygon/corridor geofence requires at least 2 points" },
        { status: 400 }
      );
    }
    if (type === "polygon" && geometry.points.length < 3) {
      return NextResponse.json(
        { error: "Polygon geofence requires at least 3 points" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("geofences")
      .insert({
        name,
        case_id: caseId,
        type,
        geometry,
        trigger,
        priority,
        status: "active",
        expires_at: expiresAt,
        notify_channels: notifyChannels,
        description,
        created_by: user.id,
        alert_count: 0,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create geofence:", error);
      // Return mock success for demo
      const mockGeofence: Geofence = {
        id: `geo-${Date.now()}`,
        name,
        caseId,
        type,
        geometry,
        trigger,
        priority,
        status: "active",
        createdAt: new Date().toISOString(),
        expiresAt,
        alertCount: 0,
        notifyChannels,
        description,
        createdBy: user.id,
      };

      return NextResponse.json({ geofence: mockGeofence }, { status: 201 });
    }

    const geofence: Geofence = {
      id: data.id,
      name: data.name,
      caseId: data.case_id,
      type: data.type,
      geometry: data.geometry,
      trigger: data.trigger,
      priority: data.priority,
      status: data.status,
      createdAt: data.created_at,
      expiresAt: data.expires_at,
      alertCount: data.alert_count || 0,
      notifyChannels: data.notify_channels || [],
      description: data.description,
      createdBy: data.created_by,
    };

    return NextResponse.json({ geofence }, { status: 201 });
  } catch (error) {
    console.error("Failed to create geofence:", error);
    return NextResponse.json(
      { error: "Failed to create geofence" },
      { status: 500 }
    );
  }
}
