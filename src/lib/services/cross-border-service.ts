/**
 * Cross-Border Coordination Service
 * Business logic for cross-border case management
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CrossBorderCase,
  LinkedCase,
  CrossBorderAlert,
  JurisdictionHandoff,
  InternationalAgency,
  DataSharingAgreement,
  ComplianceRecord,
} from "@/types/cross-border.types";

/**
 * Create a cross-border case
 */
export async function createCrossBorderCase(
  supabase: SupabaseClient,
  data: {
    primaryCaseId: string;
    leadJurisdictionId: string;
    coordinatorId: string;
    notes?: string;
  }
): Promise<{ data: CrossBorderCase | null; error: Error | null }> {
  try {
    const { data: result, error } = await supabase
      .from("cross_border_cases")
      .insert({
        primary_case_id: data.primaryCaseId,
        lead_jurisdiction_id: data.leadJurisdictionId,
        coordinator_id: data.coordinatorId,
        cross_border_notes: data.notes,
        status: "active",
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    // Log the action
    await logCrossBorderAction(supabase, {
      caseId: data.primaryCaseId,
      actionType: "case_linked",
      userId: data.coordinatorId,
      fromJurisdictionId: data.leadJurisdictionId,
      details: { crossBorderCaseId: result.id },
    });

    return { data: result as CrossBorderCase, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Link cases across jurisdictions
 */
export async function linkCases(
  supabase: SupabaseClient,
  data: {
    crossBorderCaseId: string;
    caseId: string;
    jurisdictionId: string;
    agencyId: string;
    linkType: LinkedCase["linkType"];
    linkConfidence: LinkedCase["linkConfidence"];
    notes: string;
    linkedBy: string;
    externalCaseNumber?: string;
  }
): Promise<{ data: LinkedCase | null; error: Error | null }> {
  try {
    const { data: result, error } = await supabase
      .from("linked_cases")
      .insert({
        cross_border_case_id: data.crossBorderCaseId,
        case_id: data.caseId,
        external_case_number: data.externalCaseNumber,
        jurisdiction_id: data.jurisdictionId,
        agency_id: data.agencyId,
        link_type: data.linkType,
        link_confidence: data.linkConfidence,
        link_notes: data.notes,
        linked_by: data.linkedBy,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    // Log the action
    await logCrossBorderAction(supabase, {
      caseId: data.caseId,
      actionType: "case_linked",
      userId: data.linkedBy,
      fromJurisdictionId: data.jurisdictionId,
      details: { linkType: data.linkType, linkConfidence: data.linkConfidence },
    });

    return { data: result as LinkedCase, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Create and distribute a cross-border alert
 */
export async function createCrossBorderAlert(
  supabase: SupabaseClient,
  data: {
    caseId: string;
    alertType: CrossBorderAlert["alertType"];
    title: string;
    description: string;
    urgencyLevel: CrossBorderAlert["urgencyLevel"];
    targetJurisdictions: string[];
    expiresAt: string;
    createdBy: string;
    titleTranslations?: Record<string, string>;
    descriptionTranslations?: Record<string, string>;
  }
): Promise<{ data: CrossBorderAlert | null; error: Error | null }> {
  try {
    const { data: result, error } = await supabase
      .from("cross_border_alerts")
      .insert({
        case_id: data.caseId,
        alert_type: data.alertType,
        title: data.title,
        title_translations: data.titleTranslations || {},
        description: data.description,
        description_translations: data.descriptionTranslations || {},
        urgency_level: data.urgencyLevel,
        target_jurisdictions: data.targetJurisdictions,
        expires_at: data.expiresAt,
        status: "pending_approval",
        created_by: data.createdBy,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: result as CrossBorderAlert, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Distribute alert to agencies
 */
export async function distributeAlert(
  supabase: SupabaseClient,
  data: {
    alertId: string;
    distributions: Array<{
      jurisdictionId: string;
      agencyId: string;
      distributionMethod: "email" | "portal" | "api" | "fax" | "manual";
    }>;
  }
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await supabase.from("alert_distributions").insert(
      data.distributions.map((dist) => ({
        alert_id: data.alertId,
        jurisdiction_id: dist.jurisdictionId,
        agency_id: dist.agencyId,
        distribution_method: dist.distributionMethod,
      }))
    );

    if (error) {
      return { success: false, error: new Error(error.message) };
    }

    // Update alert status to active
    await supabase
      .from("cross_border_alerts")
      .update({ status: "active" })
      .eq("id", data.alertId);

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}

/**
 * Request jurisdiction handoff
 */
export async function requestJurisdictionHandoff(
  supabase: SupabaseClient,
  data: {
    caseId: string;
    fromJurisdictionId: string;
    toJurisdictionId: string;
    fromAgencyId: string;
    toAgencyId: string;
    handoffType: JurisdictionHandoff["handoffType"];
    reason: string;
    requestedBy: string;
    transferPackage: {
      caseData: boolean;
      evidence: boolean;
      witnessStatements: boolean;
      forensicReports: boolean;
      timelineData: boolean;
      contactInfo: boolean;
      additionalDocuments?: string[];
      specialInstructions?: string;
    };
  }
): Promise<{ data: JurisdictionHandoff | null; error: Error | null }> {
  try {
    const { data: result, error } = await supabase
      .from("jurisdiction_handoffs")
      .insert({
        case_id: data.caseId,
        from_jurisdiction_id: data.fromJurisdictionId,
        to_jurisdiction_id: data.toJurisdictionId,
        from_agency_id: data.fromAgencyId,
        to_agency_id: data.toAgencyId,
        handoff_type: data.handoffType,
        reason: data.reason,
        requested_by: data.requestedBy,
        transfer_case_data: data.transferPackage.caseData,
        transfer_evidence: data.transferPackage.evidence,
        transfer_witness_statements: data.transferPackage.witnessStatements,
        transfer_forensic_reports: data.transferPackage.forensicReports,
        transfer_timeline_data: data.transferPackage.timelineData,
        transfer_contact_info: data.transferPackage.contactInfo,
        additional_documents: data.transferPackage.additionalDocuments || [],
        special_instructions: data.transferPackage.specialInstructions,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    // Log the action
    await logCrossBorderAction(supabase, {
      caseId: data.caseId,
      actionType: "handoff_requested",
      userId: data.requestedBy,
      fromJurisdictionId: data.fromJurisdictionId,
      toJurisdictionId: data.toJurisdictionId,
      details: { handoffType: data.handoffType, handoffId: result.id },
    });

    return { data: result as JurisdictionHandoff, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Respond to handoff request
 */
export async function respondToHandoff(
  supabase: SupabaseClient,
  data: {
    handoffId: string;
    respondedBy: string;
    status: "accepted" | "rejected";
    notes?: string;
  }
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await supabase
      .from("jurisdiction_handoffs")
      .update({
        status: data.status,
        responded_by: data.respondedBy,
        responded_at: new Date().toISOString(),
        notes: data.notes,
      })
      .eq("id", data.handoffId);

    if (error) {
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}

/**
 * Get international agencies
 */
export async function getInternationalAgencies(
  supabase: SupabaseClient,
  filters?: {
    country?: string;
    agencyType?: string;
    isActive?: boolean;
  }
): Promise<{ data: InternationalAgency[]; error: Error | null }> {
  try {
    let query = supabase.from("international_agencies").select("*");

    if (filters?.country) {
      query = query.eq("country", filters.country);
    }
    if (filters?.agencyType) {
      query = query.eq("agency_type", filters.agencyType);
    }
    if (filters?.isActive !== undefined) {
      query = query.eq("is_active", filters.isActive);
    }

    const { data, error } = await query.order("name");

    if (error) {
      return { data: [], error: new Error(error.message) };
    }

    return { data: data as InternationalAgency[], error: null };
  } catch (error) {
    return { data: [], error: error as Error };
  }
}

/**
 * Check compliance for cross-border data sharing
 */
export async function checkCompliance(
  supabase: SupabaseClient,
  data: {
    caseId: string;
    agreementId: string;
    jurisdictionId: string;
    complianceType: ComplianceRecord["complianceType"];
    checkedBy: string;
  }
): Promise<{ data: ComplianceRecord | null; error: Error | null }> {
  try {
    // Get the agreement
    const { data: agreement } = await supabase
      .from("data_sharing_agreements")
      .select("*")
      .eq("id", data.agreementId)
      .single();

    if (!agreement) {
      return { data: null, error: new Error("Agreement not found") };
    }

    // Perform compliance checks
    const issues = [];
    let status: ComplianceRecord["status"] = "compliant";

    // Check if agreement is active
    if (!agreement.is_active) {
      issues.push({
        id: crypto.randomUUID(),
        severity: "critical" as const,
        description: "Data sharing agreement is not active",
        requirement: "Active agreement required for data sharing",
        currentState: "Agreement inactive",
        requiredAction: "Activate agreement or use different agreement",
      });
      status = "non_compliant";
    }

    // Check if agreement has expired
    if (agreement.expiration_date && new Date(agreement.expiration_date) < new Date()) {
      issues.push({
        id: crypto.randomUUID(),
        severity: "critical" as const,
        description: "Data sharing agreement has expired",
        requirement: "Valid agreement required",
        currentState: `Expired on ${agreement.expiration_date}`,
        requiredAction: "Renew agreement or establish new agreement",
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
      status = "non_compliant";
    }

    // Calculate next review date (30 days from now)
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + 30);

    // Create compliance record
    const { data: result, error } = await supabase
      .from("compliance_records")
      .insert({
        case_id: data.caseId,
        agreement_id: data.agreementId,
        jurisdiction_id: data.jurisdictionId,
        compliance_type: data.complianceType,
        status,
        checked_by: data.checkedBy,
        findings: issues.length > 0 ? "Issues found requiring attention" : "Compliant",
        issues,
        next_review_date: nextReviewDate.toISOString(),
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    // Log compliance check
    await logCrossBorderAction(supabase, {
      caseId: data.caseId,
      actionType: "compliance_check",
      userId: data.checkedBy,
      agreementId: data.agreementId,
      fromJurisdictionId: data.jurisdictionId,
      details: { status, issueCount: issues.length },
    });

    return { data: result as ComplianceRecord, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Log cross-border action to audit trail
 */
async function logCrossBorderAction(
  supabase: SupabaseClient,
  data: {
    caseId: string;
    actionType: string;
    userId: string;
    fromJurisdictionId?: string;
    toJurisdictionId?: string;
    agencyId?: string;
    agreementId?: string;
    details?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    // Get user details
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.userId)
      .single();

    await supabase.from("cross_border_audit_logs").insert({
      case_id: data.caseId,
      action_type: data.actionType,
      user_id: data.userId,
      user_role: profile?.role || "unknown",
      from_jurisdiction_id: data.fromJurisdictionId,
      to_jurisdiction_id: data.toJurisdictionId,
      agency_id: data.agencyId,
      agreement_id: data.agreementId,
      details: data.details || {},
    });
  } catch (error) {
    console.error("Error logging cross-border action:", error);
  }
}

/**
 * Get cross-border cases for a jurisdiction
 */
export async function getCrossBorderCases(
  supabase: SupabaseClient,
  filters?: {
    jurisdictionId?: string;
    status?: string;
    coordinatorId?: string;
  }
): Promise<{ data: CrossBorderCase[]; error: Error | null }> {
  try {
    let query = supabase
      .from("cross_border_cases")
      .select(`
        *,
        primary_case:cases!cross_border_cases_primary_case_id_fkey(*),
        lead_jurisdiction:jurisdictions!cross_border_cases_lead_jurisdiction_id_fkey(*),
        coordinator:profiles!cross_border_cases_coordinator_id_fkey(id, first_name, last_name)
      `);

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }
    if (filters?.coordinatorId) {
      query = query.eq("coordinator_id", filters.coordinatorId);
    }
    if (filters?.jurisdictionId) {
      query = query.eq("lead_jurisdiction_id", filters.jurisdictionId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      return { data: [], error: new Error(error.message) };
    }

    return { data: data as CrossBorderCase[], error: null };
  } catch (error) {
    return { data: [], error: error as Error };
  }
}
