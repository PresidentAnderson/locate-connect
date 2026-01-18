import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { amberDistributionService } from "@/lib/services/amber-distribution";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/amber-alerts/[id]/status
 * Get distribution status for an AMBER alert
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

  // Check if alert exists
  const { data: alert, error: fetchError } = await supabase
    .from("amber_alerts")
    .select("id, alert_number, alert_status")
    .eq("id", id)
    .single();

  if (fetchError || !alert) {
    return NextResponse.json({ error: "AMBER Alert not found" }, { status: 404 });
  }

  // Get distribution summary
  const summary = await amberDistributionService.getDistributionSummary(id);

  // Get detailed distribution list
  const { data: distributions, error: distError } = await supabase
    .from("amber_distributions")
    .select("*")
    .eq("amber_alert_id", id)
    .order("created_at", { ascending: false });

  if (distError) {
    return NextResponse.json({ error: distError.message }, { status: 500 });
  }

  // Get recent log entries
  const { data: logs } = await supabase
    .from("amber_distribution_log")
    .select("*")
    .eq("amber_alert_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({
    alert_id: alert.id,
    alert_number: alert.alert_number,
    alert_status: alert.alert_status,
    summary,
    distributions: distributions || [],
    recent_logs: logs || [],
  });
}
