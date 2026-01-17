/**
 * API Route: Risk Factors
 * LC-M2-003: Handle sensitive risk factor submissions with privacy safeguards
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  RiskFactorInput,
  RiskFactorConsentInput,
} from "@/types";
import {
  validateRiskFactorConsent,
  getDefaultAuthorizedViewers,
} from "@/lib/services/risk-factor-service";
import { DEFAULT_CONSENT_TEXT } from "@/types/risk-factor.types";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      caseId,
      factors,
      consent,
    }: {
      caseId: string;
      factors: RiskFactorInput[];
      consent: RiskFactorConsentInput;
    } = body;

    // Validate required fields
    if (!caseId || !factors || !consent) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate consent
    const consentValidation = validateRiskFactorConsent(consent);
    if (!consentValidation.valid) {
      return NextResponse.json(
        { error: "Invalid consent", details: consentValidation.errors },
        { status: 400 }
      );
    }

    // Get IP address and user agent for audit
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // Get case details for authorization
    const { data: caseData, error: caseError } = await supabase
      .from("cases")
      .select("id, reporter_id, primary_investigator_id, assigned_organization_id")
      .eq("id", caseId)
      .single();

    if (caseError || !caseData) {
      return NextResponse.json(
        { error: "Case not found" },
        { status: 404 }
      );
    }

    // Verify user is the reporter
    if (caseData.reporter_id !== user.id) {
      return NextResponse.json(
        { error: "Only the case reporter can submit risk factors" },
        { status: 403 }
      );
    }

    // Start transaction: Create consent record first
    const { data: consentRecord, error: consentError } = await supabase
      .from("risk_factor_consent")
      .insert({
        case_id: caseId,
        reporter_id: user.id,
        consent_given: true,
        consent_text: DEFAULT_CONSENT_TEXT,
        consent_version: "1.0",
        acknowledged_non_accusatory: consent.acknowledgedNonAccusatory,
        acknowledged_corroboration_required: consent.acknowledgedCorroborationRequired,
        acknowledged_limited_weight: consent.acknowledgedLimitedWeight,
        acknowledged_privacy_protections: consent.acknowledgedPrivacyProtections,
        accepted_sensitivity_disclaimer: consent.acceptedSensitivityDisclaimer,
        accepted_privacy_policy: consent.acceptedPrivacyPolicy,
        ip_address: ipAddress,
        user_agent: userAgent,
        consented_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (consentError) {
      console.error("Error creating consent record:", consentError);
      return NextResponse.json(
        { error: "Failed to record consent" },
        { status: 500 }
      );
    }

    // Get authorized viewers (primary investigator, org admins)
    const authorizedViewers = getDefaultAuthorizedViewers(
      caseId,
      caseData.primary_investigator_id
    );

    // Insert risk factors
    const riskFactorsToInsert = factors.map((factor) => ({
      case_id: caseId,
      category: factor.category,
      factor_type: factor.factorType,
      description: factor.description || null,
      severity: factor.severity,
      behavioral_correlation: factor.behavioralCorrelation || null,
      medical_correlation: factor.medicalCorrelation || null,
      supporting_evidence: factor.supportingEvidence || null,
      requires_corroboration: true,
      is_corroborated: false,
      reporter_acknowledged_sensitivity: true,
      reporter_acknowledgment_timestamp: new Date().toISOString(),
      reporter_id: user.id,
      is_restricted: true,
      restriction_reason: "Pending corroboration and correlation verification",
      authorized_viewers: authorizedViewers,
      weight_in_priority: factor.severity === "high" ? 0.15 : factor.severity === "medium" ? 0.10 : 0.05,
      included_in_le_view: false, // Not included by default per LC-M2-003
      created_by: user.id,
    }));

    const { data: insertedFactors, error: insertError } = await supabase
      .from("sensitive_risk_factors")
      .insert(riskFactorsToInsert)
      .select();

    if (insertError) {
      console.error("Error inserting risk factors:", insertError);
      return NextResponse.json(
        { error: "Failed to save risk factors" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        consent: consentRecord,
        riskFactors: insertedFactors,
        count: insertedFactors?.length || 0,
      },
    });
  } catch (error) {
    console.error("Error in risk factors API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get("caseId");

    if (!caseId) {
      return NextResponse.json(
        { error: "Case ID required" },
        { status: 400 }
      );
    }

    // Get user profile for role check
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    // Query risk factors with RLS applied
    const { data: riskFactors, error: fetchError } = await supabase
      .from("sensitive_risk_factors")
      .select("*")
      .eq("case_id", caseId);

    if (fetchError) {
      console.error("Error fetching risk factors:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch risk factors" },
        { status: 500 }
      );
    }

    // Log access for each risk factor
    if (riskFactors && riskFactors.length > 0) {
      const accessLogs = riskFactors.map((factor) => ({
        risk_factor_id: factor.id,
        case_id: caseId,
        accessed_by: user.id,
        access_type: "read",
        access_reason: "View from case details",
        access_granted: true,
        user_role: profile?.role,
        had_behavioral_correlation: !!factor.behavioral_correlation,
        had_medical_correlation: !!factor.medical_correlation,
      }));

      // Insert access logs (non-blocking)
      await supabase.from("risk_factor_access_log").insert(accessLogs);
    }

    return NextResponse.json({
      success: true,
      data: riskFactors || [],
    });
  } catch (error) {
    console.error("Error in risk factors GET API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
