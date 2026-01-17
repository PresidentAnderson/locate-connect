// AMBER Alert Criteria Check API
// LC-FEAT-026: AMBER Alert Integration
// GET /api/cases/[id]/amber-criteria - Check if case meets AMBER criteria

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateAmberCriteria } from "@/lib/services/amber-alert-service";

/**
 * GET /api/cases/[id]/amber-criteria
 * Check if a case meets AMBER Alert criteria
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

  // Get case data
  const { data: caseData, error: caseError } = await supabase
    .from("cases")
    .select(
      `
      id,
      case_number,
      first_name,
      last_name,
      age_at_disappearance,
      suspected_abduction,
      suspected_foul_play,
      last_seen_date,
      primary_photo_url,
      is_amber_alert
    `
    )
    .eq("id", params.id)
    .single();

  if (caseError || !caseData) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  // Validate criteria
  const criteriaCheck = validateAmberCriteria(caseData);

  // Check if there's already an active AMBER alert for this case
  const { data: existingAlerts } = await supabase
    .from("amber_alert_requests")
    .select("id, status")
    .eq("case_id", params.id)
    .in("status", ["draft", "pending_review", "approved", "active"]);

  return NextResponse.json({
    ...criteriaCheck,
    case_number: caseData.case_number,
    has_active_alert: (existingAlerts?.length || 0) > 0,
    existing_alerts: existingAlerts || [],
    is_amber_alert_flagged: caseData.is_amber_alert,
  });
}
