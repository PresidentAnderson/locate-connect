import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { amberDistributionService } from "@/lib/services/amber-distribution";
import type { AmberDistributionChannel } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface DistributeRequest {
  channels?: AmberDistributionChannel[];
  target_provinces?: string[];
  partner_ids?: string[];
  media_ids?: string[];
}

/**
 * POST /api/amber-alerts/[id]/distribute
 * Trigger distribution for an AMBER alert
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["law_enforcement", "admin", "developer"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check if alert exists and is active
  const { data: alert, error: fetchError } = await supabase
    .from("amber_alerts")
    .select("alert_status, distribution_channels, target_provinces")
    .eq("id", id)
    .single();

  if (fetchError || !alert) {
    return NextResponse.json({ error: "AMBER Alert not found" }, { status: 404 });
  }

  if (alert.alert_status !== "active") {
    return NextResponse.json(
      { error: `Cannot distribute ${alert.alert_status} alert` },
      { status: 400 }
    );
  }

  // Parse request body for optional overrides
  let body: DistributeRequest = {};
  try {
    body = (await request.json()) as DistributeRequest;
  } catch {
    // No body provided, use defaults from alert
  }

  try {
    const result = await amberDistributionService.distributeAlert({
      amber_alert_id: id,
      channels: body.channels || alert.distribution_channels,
      target_provinces: body.target_provinces || alert.target_provinces,
      partner_ids: body.partner_ids,
      media_ids: body.media_ids,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Distribution error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Distribution failed" },
      { status: 500 }
    );
  }
}
