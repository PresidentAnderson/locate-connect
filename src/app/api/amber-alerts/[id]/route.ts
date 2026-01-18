import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { amberDistributionService } from "@/lib/services/amber-distribution";
import type { CancelAmberAlertRequest } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/amber-alerts/[id]
 * Get a specific AMBER alert with distributions
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

  // Get AMBER alert with case and distributions
  const { data: alert, error } = await supabase
    .from("amber_alerts")
    .select(`
      *,
      case:cases(id, case_number, first_name, last_name, status, primary_photo_url),
      distributions:amber_distributions(*)
    `)
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "AMBER Alert not found" }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get distribution summary
  const summary = await amberDistributionService.getDistributionSummary(id);

  return NextResponse.json({
    ...alert,
    distribution_summary: summary,
  });
}

/**
 * DELETE /api/amber-alerts/[id]
 * Cancel an AMBER alert
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

  // Get the reason from request body
  let reason = "Alert cancelled";
  try {
    const body = (await request.json()) as CancelAmberAlertRequest;
    if (body.reason) {
      reason = body.reason;
    }
  } catch {
    // No body provided
  }

  // Get the alert
  const { data: alert, error: fetchError } = await supabase
    .from("amber_alerts")
    .select("case_id, alert_status")
    .eq("id", id)
    .single();

  if (fetchError || !alert) {
    return NextResponse.json({ error: "AMBER Alert not found" }, { status: 404 });
  }

  if (alert.alert_status !== "active") {
    return NextResponse.json(
      { error: `Alert is already ${alert.alert_status}` },
      { status: 400 }
    );
  }

  // Cancel the alert
  const { error: updateError } = await supabase
    .from("amber_alerts")
    .update({
      alert_status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancelled_by: user.id,
      cancelled_reason: reason,
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Update case flag
  await supabase
    .from("cases")
    .update({ is_amber_alert: false })
    .eq("id", alert.case_id);

  // Cancel pending distributions
  const cancelledCount = await amberDistributionService.cancelDistributions(id, reason);

  // Log case update
  await supabase.from("case_updates").insert({
    case_id: alert.case_id,
    author_id: user.id,
    update_type: "amber_alert",
    title: "AMBER Alert Cancelled",
    content: reason,
    is_public: true,
    is_law_enforcement_only: false,
  });

  return NextResponse.json({
    success: true,
    distributions_cancelled: cancelledCount,
  });
}
