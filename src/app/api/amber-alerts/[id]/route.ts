// AMBER Alert Individual API Routes
// LC-FEAT-026: AMBER Alert Integration
// GET /api/amber-alerts/[id] - Get specific alert
// PATCH /api/amber-alerts/[id] - Update alert status
// DELETE /api/amber-alerts/[id] - Delete draft alert

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  UpdateAlertStatusRequest,
  ActivateAlertRequest,
} from "@/types/amber-alert.types";
import {
  isValidStatusTransition,
  calculateExpirationTime,
  generateAlertId,
} from "@/lib/services/amber-alert-service";

/**
 * GET /api/amber-alerts/[id]
 * Get specific AMBER alert request
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

  const { data: alert, error } = await supabase
    .from("amber_alert_requests")
    .select("*, cases(case_number, first_name, last_name)")
    .eq("id", params.id)
    .single();

  if (error || !alert) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }

  // Check access - must be LE or the requester
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

  return NextResponse.json(alert);
}

/**
 * PATCH /api/amber-alerts/[id]
 * Update AMBER alert status or activate alert
 */
export async function PATCH(
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

  // Get user profile to check role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (
    !profile ||
    !["law_enforcement", "admin", "developer"].includes(profile.role)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get current alert
  const { data: currentAlert, error: fetchError } = await supabase
    .from("amber_alert_requests")
    .select("*, cases(case_number)")
    .eq("id", params.id)
    .single();

  if (fetchError || !currentAlert) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }

  let body: UpdateAlertStatusRequest | ActivateAlertRequest;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Handle activation separately
  if ("alert_id" in body || currentAlert.status === "approved") {
    return handleActivation(
      supabase,
      params.id,
      currentAlert,
      body as ActivateAlertRequest,
      user.id
    );
  }

  // Handle status updates
  const statusUpdate = body as UpdateAlertStatusRequest;

  // Validate status transition
  if (
    !isValidStatusTransition(currentAlert.status, statusUpdate.status)
  ) {
    return NextResponse.json(
      {
        error: `Invalid status transition from ${currentAlert.status} to ${statusUpdate.status}`,
      },
      { status: 400 }
    );
  }

  // Prepare update data
  const updateData: Record<string, unknown> = {
    status: statusUpdate.status,
  };

  if (statusUpdate.status === "approved") {
    updateData.reviewed_by = user.id;
    updateData.reviewed_at = new Date().toISOString();
    updateData.review_notes = statusUpdate.notes;
    updateData.le_verified = true;
    updateData.le_verified_by = user.id;
    updateData.le_verified_at = new Date().toISOString();
  }

  if (statusUpdate.status === "rejected") {
    updateData.reviewed_by = user.id;
    updateData.reviewed_at = new Date().toISOString();
    updateData.rejection_reason = statusUpdate.rejection_reason;
    updateData.review_notes = statusUpdate.notes;
  }

  if (
    statusUpdate.status === "cancelled" ||
    statusUpdate.status === "resolved"
  ) {
    updateData.deactivated_at = new Date().toISOString();
    updateData.deactivated_by = user.id;
    updateData.deactivation_reason = statusUpdate.deactivation_reason;
  }

  if (statusUpdate.status === "pending_review") {
    updateData.submission_count = currentAlert.submission_count + 1;
    updateData.last_submitted_at = new Date().toISOString();
  }

  // Update alert
  const { data: updatedAlert, error: updateError } = await supabase
    .from("amber_alert_requests")
    .update(updateData)
    .eq("id", params.id)
    .select()
    .single();

  if (updateError) {
    console.error("Error updating AMBER alert:", updateError);
    return NextResponse.json(
      { error: "Failed to update alert" },
      { status: 500 }
    );
  }

  return NextResponse.json(updatedAlert);
}

/**
 * DELETE /api/amber-alerts/[id]
 * Delete a draft AMBER alert request
 */
export async function DELETE(
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

  // Get alert to check status and ownership
  const { data: alert, error: fetchError } = await supabase
    .from("amber_alert_requests")
    .select("status, requested_by")
    .eq("id", params.id)
    .single();

  if (fetchError || !alert) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }

  // Only allow deletion of drafts
  if (alert.status !== "draft") {
    return NextResponse.json(
      { error: "Only draft alerts can be deleted" },
      { status: 400 }
    );
  }

  // Check permission
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const canDelete =
    alert.requested_by === user.id ||
    (profile &&
      ["law_enforcement", "admin", "developer"].includes(profile.role));

  if (!canDelete) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Delete alert
  const { error: deleteError } = await supabase
    .from("amber_alert_requests")
    .delete()
    .eq("id", params.id);

  if (deleteError) {
    console.error("Error deleting AMBER alert:", deleteError);
    return NextResponse.json(
      { error: "Failed to delete alert" },
      { status: 500 }
    );
  }

  return NextResponse.json({ message: "Alert deleted successfully" });
}

/**
 * Handle alert activation
 */
async function handleActivation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  alertId: string,
  currentAlert: any,
  activationData: ActivateAlertRequest,
  userId: string
) {
  if (currentAlert.status !== "approved" && currentAlert.status !== "active") {
    return NextResponse.json(
      { error: "Alert must be approved before activation" },
      { status: 400 }
    );
  }

  const now = new Date();
  const expiresAt =
    activationData.expires_at ||
    calculateExpirationTime(now).toISOString();

  // Generate external alert ID if not provided
  const externalAlertId =
    activationData.alert_id ||
    generateAlertId(
      currentAlert.cases?.case_number || "UNKNOWN",
      currentAlert.geographic_scope?.[0] || "CA"
    );

  // Update alert to active status
  const updateData: Record<string, unknown> = {
    status: "active",
    alert_id: externalAlertId,
    activated_at: now.toISOString(),
    activated_by: userId,
    expires_at: expiresAt,
  };

  if (activationData.distribution_channels) {
    updateData.distribution_channels = activationData.distribution_channels;
  }

  const { data: activatedAlert, error: updateError } = await supabase
    .from("amber_alert_requests")
    .update(updateData)
    .eq("id", alertId)
    .select()
    .single();

  if (updateError) {
    console.error("Error activating AMBER alert:", updateError);
    return NextResponse.json(
      { error: "Failed to activate alert" },
      { status: 500 }
    );
  }

  // Create distribution log entries for each channel
  if (activatedAlert.distribution_channels) {
    const distributionLogs = activatedAlert.distribution_channels.map(
      (channel: string) => ({
        alert_request_id: alertId,
        channel,
        status: "pending",
        distributed_at: now.toISOString(),
      })
    );

    await supabase.from("amber_alert_distribution_log").insert(distributionLogs);
  }

  // Initialize metrics
  await supabase.from("amber_alert_metrics").insert({
    alert_request_id: alertId,
    views_count: 0,
    shares_count: 0,
    tips_received_count: 0,
    provinces_reached: activatedAlert.geographic_scope || [],
    cities_reached: [],
    led_to_recovery: false,
  });

  return NextResponse.json(activatedAlert);
}
