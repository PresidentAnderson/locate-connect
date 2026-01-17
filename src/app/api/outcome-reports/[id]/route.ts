import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  UpdateOutcomeReportRequest,
  CaseOutcomeReportWithRelations,
} from "@/types/outcome-report.types";

/**
 * GET /api/outcome-reports/[id]
 * Get a single outcome report with all relations
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the complete report with all relations
    const { data: report, error } = await supabase
      .from("case_outcome_reports")
      .select(
        `
        *,
        case:cases (
          id,
          case_number,
          first_name,
          last_name,
          age_at_disappearance,
          disposition,
          last_seen_date,
          last_seen_location,
          last_seen_city,
          last_seen_province,
          resolution_date,
          resolution_location,
          is_minor,
          is_elderly,
          is_indigenous,
          is_amber_alert,
          priority_level
        ),
        created_by_user:profiles!case_outcome_reports_created_by_fkey (
          id,
          first_name,
          last_name,
          email
        ),
        reviewed_by_user:profiles!case_outcome_reports_reviewed_by_fkey (
          id,
          first_name,
          last_name
        ),
        approved_by_user:profiles!case_outcome_reports_approved_by_fkey (
          id,
          first_name,
          last_name
        ),
        recommendations:outcome_report_recommendations (
          *,
          assigned_to_user:profiles!outcome_report_recommendations_assigned_to_fkey (
            id,
            first_name,
            last_name,
            email
          )
        ),
        similar_cases:similar_case_analysis (
          *,
          similar_case:cases (
            id,
            case_number,
            first_name,
            last_name,
            disposition,
            resolution_date
          )
        ),
        lead_effectiveness_scores (
          *,
          lead:leads (
            id,
            title,
            source,
            status,
            created_at
          )
        ),
        timeline:outcome_timeline_milestones (*)
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Outcome report not found" },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json(formatOutcomeReport(report));
  } catch (error) {
    console.error("Error fetching outcome report:", error);
    return NextResponse.json(
      { error: "Failed to fetch outcome report" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/outcome-reports/[id]
 * Update an outcome report
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: UpdateOutcomeReportRequest = await request.json();

    // Check if report exists
    const { data: existingReport, error: fetchError } = await supabase
      .from("case_outcome_reports")
      .select("id, status, version")
      .eq("id", id)
      .single();

    if (fetchError || !existingReport) {
      return NextResponse.json(
        { error: "Outcome report not found" },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: Record<string, any> = {};

    if (body.status !== undefined) updateData.status = body.status;
    if (body.discoveryMethod !== undefined) updateData.discovery_method = body.discoveryMethod;
    if (body.discoveryMethodOther !== undefined)
      updateData.discovery_method_other = body.discoveryMethodOther;
    if (body.locationFound !== undefined) updateData.location_found = body.locationFound;
    if (body.locationFoundCity !== undefined)
      updateData.location_found_city = body.locationFoundCity;
    if (body.locationFoundProvince !== undefined)
      updateData.location_found_province = body.locationFoundProvince;
    if (body.locationFoundLatitude !== undefined)
      updateData.location_found_latitude = body.locationFoundLatitude;
    if (body.locationFoundLongitude !== undefined)
      updateData.location_found_longitude = body.locationFoundLongitude;
    if (body.conditionAtResolution !== undefined)
      updateData.condition_at_resolution = body.conditionAtResolution;
    if (body.conditionNotes !== undefined) updateData.condition_notes = body.conditionNotes;
    if (body.foundByType !== undefined) updateData.found_by_type = body.foundByType;
    if (body.foundByOrganizationId !== undefined)
      updateData.found_by_organization_id = body.foundByOrganizationId;
    if (body.foundByUserId !== undefined) updateData.found_by_user_id = body.foundByUserId;
    if (body.foundByName !== undefined) updateData.found_by_name = body.foundByName;
    if (body.whatWorked !== undefined) updateData.what_worked = body.whatWorked;
    if (body.whatDidntWork !== undefined) updateData.what_didnt_work = body.whatDidntWork;
    if (body.delaysIdentified !== undefined)
      updateData.delays_identified = body.delaysIdentified;
    if (body.lessonsLearned !== undefined) updateData.lessons_learned = body.lessonsLearned;
    if (body.keyDecisionPoints !== undefined)
      updateData.key_decision_points = body.keyDecisionPoints;

    // Handle status transitions
    if (body.status === "pending_review" && existingReport.status === "draft") {
      updateData.reviewed_by = null;
      updateData.reviewed_at = null;
    }

    if (body.status === "approved") {
      updateData.approved_by = user.id;
      updateData.approved_at = new Date().toISOString();
    }

    // Increment version on any update
    updateData.version = existingReport.version ? existingReport.version + 1 : 2;

    // Perform update
    const { data: updatedReport, error: updateError } = await supabase
      .from("case_outcome_reports")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json(formatOutcomeReport(updatedReport));
  } catch (error) {
    console.error("Error updating outcome report:", error);
    return NextResponse.json(
      { error: "Failed to update outcome report" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/outcome-reports/[id]
 * Delete an outcome report (admin only, soft delete recommended)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "developer"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Soft delete by archiving
    const { error } = await supabase
      .from("case_outcome_reports")
      .update({ status: "archived" })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Report archived" });
  } catch (error) {
    console.error("Error deleting outcome report:", error);
    return NextResponse.json(
      { error: "Failed to delete outcome report" },
      { status: 500 }
    );
  }
}

// Helper function to format outcome report
function formatOutcomeReport(data: any): CaseOutcomeReportWithRelations {
  return {
    id: data.id,
    caseId: data.case_id,
    reportNumber: data.report_number,
    status: data.status,
    version: data.version,
    totalDurationHours: parseFloat(data.total_duration_hours) || 0,
    initialPriorityLevel: data.initial_priority_level,
    finalPriorityLevel: data.final_priority_level,
    priorityChanges: data.priority_changes || 0,
    discoveryMethod: data.discovery_method,
    discoveryMethodOther: data.discovery_method_other,
    locationFound: data.location_found,
    locationFoundCity: data.location_found_city,
    locationFoundProvince: data.location_found_province,
    locationFoundLatitude: data.location_found_latitude,
    locationFoundLongitude: data.location_found_longitude,
    distanceFromLastSeenKm: data.distance_from_last_seen_km
      ? parseFloat(data.distance_from_last_seen_km)
      : undefined,
    conditionAtResolution: data.condition_at_resolution,
    conditionNotes: data.condition_notes,
    foundByType: data.found_by_type,
    foundByOrganizationId: data.found_by_organization_id,
    foundByUserId: data.found_by_user_id,
    foundByName: data.found_by_name,
    totalLeadsGenerated: data.total_leads_generated || 0,
    leadsVerified: data.leads_verified || 0,
    leadsDismissed: data.leads_dismissed || 0,
    leadsActedUpon: data.leads_acted_upon || 0,
    solvingLeadId: data.solving_lead_id,
    solvingLeadSource: data.solving_lead_source,
    falsePositiveRate: data.false_positive_rate
      ? parseFloat(data.false_positive_rate)
      : undefined,
    avgLeadResponseHours: data.avg_lead_response_hours
      ? parseFloat(data.avg_lead_response_hours)
      : undefined,
    totalTipsReceived: data.total_tips_received || 0,
    tipsVerified: data.tips_verified || 0,
    tipsHoax: data.tips_hoax || 0,
    tipsDuplicate: data.tips_duplicate || 0,
    tipsConvertedToLeads: data.tips_converted_to_leads || 0,
    tipConversionRate: data.tip_conversion_rate
      ? parseFloat(data.tip_conversion_rate)
      : undefined,
    totalAssignedOfficers: data.total_assigned_officers || 0,
    totalVolunteerHours: data.total_volunteer_hours
      ? parseFloat(data.total_volunteer_hours)
      : undefined,
    mediaOutletsEngaged: data.media_outlets_engaged || 0,
    socialMediaReach: data.social_media_reach || 0,
    estimatedCost: data.estimated_cost ? parseFloat(data.estimated_cost) : undefined,
    partnerOrganizationsInvolved: data.partner_organizations_involved || [],
    timeToFirstResponse: data.time_to_first_response
      ? parseFloat(data.time_to_first_response)
      : undefined,
    timeToFirstLead: data.time_to_first_lead
      ? parseFloat(data.time_to_first_lead)
      : undefined,
    timeToVerifiedLead: data.time_to_verified_lead
      ? parseFloat(data.time_to_verified_lead)
      : undefined,
    timeToResolution: data.time_to_resolution
      ? parseFloat(data.time_to_resolution)
      : undefined,
    caseReportedAt: data.case_reported_at,
    firstResponseAt: data.first_response_at,
    firstLeadAt: data.first_lead_at,
    firstVerifiedLeadAt: data.first_verified_lead_at,
    publicAlertIssuedAt: data.public_alert_issued_at,
    mediaCoverageStartedAt: data.media_coverage_started_at,
    caseResolvedAt: data.case_resolved_at,
    whatWorked: data.what_worked || [],
    whatDidntWork: data.what_didnt_work || [],
    delaysIdentified: data.delays_identified || [],
    lessonsLearned: data.lessons_learned,
    keyDecisionPoints: data.key_decision_points || [],
    createdBy: data.created_by,
    reviewedBy: data.reviewed_by,
    reviewedAt: data.reviewed_at,
    approvedBy: data.approved_by,
    approvedAt: data.approved_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    case: data.case
      ? {
          id: data.case.id,
          caseNumber: data.case.case_number,
          firstName: data.case.first_name,
          lastName: data.case.last_name,
          ageAtDisappearance: data.case.age_at_disappearance,
          disposition: data.case.disposition,
          lastSeenDate: data.case.last_seen_date,
          resolutionDate: data.case.resolution_date,
        }
      : undefined,
    recommendations: (data.recommendations || []).map((rec: any) => ({
      id: rec.id,
      outcomeReportId: rec.outcome_report_id,
      category: rec.category,
      priority: rec.priority,
      title: rec.title,
      description: rec.description,
      isActionable: rec.is_actionable,
      assignedTo: rec.assigned_to,
      targetCompletionDate: rec.target_completion_date,
      isImplemented: rec.is_implemented,
      implementedAt: rec.implemented_at,
      implementedBy: rec.implemented_by,
      implementationNotes: rec.implementation_notes,
      sourceAnalysis: rec.source_analysis,
      similarCasesCount: rec.similar_cases_count || 0,
      createdAt: rec.created_at,
      updatedAt: rec.updated_at,
    })),
    similarCases: (data.similar_cases || []).map((sc: any) => ({
      id: sc.id,
      outcomeReportId: sc.outcome_report_id,
      similarCaseId: sc.similar_case_id,
      similarityScore: parseFloat(sc.similarity_score),
      similarityFactors: sc.similarity_factors || [],
      resolutionComparison: sc.resolution_comparison,
      durationDifferenceHours: sc.duration_difference_hours
        ? parseFloat(sc.duration_difference_hours)
        : undefined,
      leadEffectivenessComparison: sc.lead_effectiveness_comparison,
      createdAt: sc.created_at,
    })),
    leadEffectivenessScores: (data.lead_effectiveness_scores || []).map((le: any) => ({
      id: le.id,
      outcomeReportId: le.outcome_report_id,
      leadId: le.lead_id,
      effectivenessRating: le.effectiveness_rating,
      score: le.score,
      responseTimeHours: le.response_time_hours
        ? parseFloat(le.response_time_hours)
        : undefined,
      contributedToResolution: le.contributed_to_resolution,
      wasFalsePositive: le.was_false_positive,
      notes: le.notes,
      createdAt: le.created_at,
    })),
    timeline: (data.timeline || [])
      .sort((a: any, b: any) => a.display_order - b.display_order)
      .map((tm: any) => ({
        id: tm.id,
        outcomeReportId: tm.outcome_report_id,
        milestoneType: tm.milestone_type,
        timestamp: tm.timestamp,
        title: tm.title,
        description: tm.description,
        relatedLeadId: tm.related_lead_id,
        relatedTipId: tm.related_tip_id,
        actorId: tm.actor_id,
        actorName: tm.actor_name,
        isDecisionPoint: tm.is_decision_point,
        decisionOutcome: tm.decision_outcome,
        decisionRationale: tm.decision_rationale,
        wasDelay: tm.was_delay,
        delayHours: tm.delay_hours ? parseFloat(tm.delay_hours) : undefined,
        delayReason: tm.delay_reason,
        displayOrder: tm.display_order || 0,
        createdAt: tm.created_at,
      })),
    createdByUser: data.created_by_user
      ? {
          id: data.created_by_user.id,
          firstName: data.created_by_user.first_name,
          lastName: data.created_by_user.last_name,
          email: data.created_by_user.email,
        }
      : undefined,
    reviewedByUser: data.reviewed_by_user
      ? {
          id: data.reviewed_by_user.id,
          firstName: data.reviewed_by_user.first_name,
          lastName: data.reviewed_by_user.last_name,
        }
      : undefined,
    approvedByUser: data.approved_by_user
      ? {
          id: data.approved_by_user.id,
          firstName: data.approved_by_user.first_name,
          lastName: data.approved_by_user.last_name,
        }
      : undefined,
  };
}
