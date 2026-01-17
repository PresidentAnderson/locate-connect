// AMBER Alert Status Tracking API
// LC-FEAT-026: AMBER Alert Integration
// GET /api/amber-alerts/[id]/status - Get alert status history

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/amber-alerts/[id]/status
 * Get status history for an AMBER alert
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify alert exists and user has access
  const { data: alert, error: alertError } = await supabase
    .from("amber_alert_requests")
    .select("requested_by, status")
    .eq("id", params.id)
    .single();

  if (alertError || !alert) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }

  // Check access
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const hasAccess =
    alert.requested_by === user.id ||
    (profile &&
      ["law_enforcement", "admin", "developer"].includes(profile.role));

  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get status history
  const { data: statusHistory, error: historyError } = await supabase
    .from("amber_alert_status_history")
    .select("*, profiles:changed_by(email, full_name)")
    .eq("alert_request_id", params.id)
    .order("changed_at", { ascending: false });

  if (historyError) {
    console.error("Error fetching status history:", historyError);
    return NextResponse.json(
      { error: "Failed to fetch status history" },
      { status: 500 }
    );
  }

  // Get distribution logs
  const { data: distributionLogs } = await supabase
    .from("amber_alert_distribution_log")
    .select("*")
    .eq("alert_request_id", params.id)
    .order("distributed_at", { ascending: false });

  // Get metrics
  const { data: metrics } = await supabase
    .from("amber_alert_metrics")
    .select("*")
    .eq("alert_request_id", params.id)
    .single();

  return NextResponse.json({
    current_status: alert.status,
    status_history: statusHistory || [],
    distribution_logs: distributionLogs || [],
    metrics: metrics || null,
  });
}
