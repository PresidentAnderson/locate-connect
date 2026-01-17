import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { RecommendationsEngine } from "@/lib/services/recommendations-engine";
import type {
  CreateOutcomeReportRequest,
  CaseOutcomeReport,
  CaseOutcomeReportWithRelations,
  OutcomeReportFilters,
} from "@/types/outcome-report.types";

/**
 * GET /api/outcome-reports
 * List outcome reports with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const status = searchParams.get("status");
    const discoveryMethod = searchParams.get("discoveryMethod");
    const jurisdictionId = searchParams.get("jurisdictionId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const caseId = searchParams.get("caseId");

    // Build query
    let query = supabase
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
          resolution_date
        ),
        created_by_user:profiles!case_outcome_reports_created_by_fkey (
          id,
          first_name,
          last_name,
          email
        ),
        recommendations:outcome_report_recommendations (
          id,
          category,
          priority,
          title,
          description,
          is_actionable,
          is_implemented,
          created_at
        ),
        timeline:outcome_timeline_milestones (
          id,
          milestone_type,
          timestamp,
          title,
          description,
          is_decision_point,
          was_delay,
          delay_hours,
          display_order
        )
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq("status", status);
    }

    if (discoveryMethod) {
      query = query.eq("discovery_method", discoveryMethod);
    }

    if (jurisdictionId) {
      query = query.eq("case.jurisdiction_id", jurisdictionId);
    }

    if (dateFrom) {
      query = query.gte("created_at", dateFrom);
    }

    if (dateTo) {
      query = query.lte("created_at", dateTo);
    }

    if (caseId) {
      query = query.eq("case_id", caseId);
    }

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data: reports, error, count } = await query;

    if (error) throw error;

    // Format response
    const formattedReports = (reports || []).map(formatOutcomeReport);

    return NextResponse.json({
      reports: formattedReports,
      total: count || 0,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("Error fetching outcome reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch outcome reports" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/outcome-reports
 * Create a new outcome report for a resolved case
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: CreateOutcomeReportRequest = await request.json();

    // Validate required fields
    if (!body.caseId) {
      return NextResponse.json(
        { error: "Missing required field: caseId" },
        { status: 400 }
      );
    }

    // Fetch the case data
    const { data: caseData, error: caseError } = await supabase
      .from("cases")
      .select("*")
      .eq("id", body.caseId)
      .single();

    if (caseError || !caseData) {
      return NextResponse.json(
        { error: "Case not found" },
        { status: 404 }
      );
    }

    // Verify case is resolved
    if (!["resolved", "closed"].includes(caseData.status)) {
      return NextResponse.json(
        { error: "Case must be resolved or closed to create an outcome report" },
        { status: 400 }
      );
    }

    // Check if outcome report already exists for this case
    const { data: existingReport } = await supabase
      .from("case_outcome_reports")
      .select("id")
      .eq("case_id", body.caseId)
      .single();

    if (existingReport) {
      return NextResponse.json(
        { error: "An outcome report already exists for this case", existingReportId: existingReport.id },
        { status: 409 }
      );
    }

    // Calculate metrics from leads
    const { data: leadMetrics } = await supabase.rpc("calculate_lead_metrics", {
      p_case_id: body.caseId,
    });

    // Calculate metrics from tips
    const { data: tipMetrics } = await supabase.rpc("calculate_tip_metrics", {
      p_case_id: body.caseId,
    });

    // Calculate time metrics
    const caseReportedAt = new Date(caseData.created_at);
    const caseResolvedAt = caseData.resolution_date
      ? new Date(caseData.resolution_date)
      : new Date();
    const totalDurationHours =
      (caseResolvedAt.getTime() - caseReportedAt.getTime()) / (1000 * 60 * 60);

    // Get case assignments count
    const { count: assignedOfficers } = await supabase
      .from("case_assignments")
      .select("*", { count: "exact", head: true })
      .eq("case_id", body.caseId);

    // Prepare report data
    const reportData = {
      case_id: body.caseId,
      status: "draft",
      total_duration_hours: totalDurationHours,
      initial_priority_level: caseData.priority_level,
      final_priority_level: caseData.priority_level,
      discovery_method: body.discoveryMethod,
      discovery_method_other: body.discoveryMethodOther,
      location_found: body.locationFound || caseData.resolution_location,
      location_found_city: body.locationFoundCity || caseData.resolution_city,
      location_found_province: body.locationFoundProvince || caseData.resolution_province,
      location_found_latitude: caseData.resolution_latitude,
      location_found_longitude: caseData.resolution_longitude,
      condition_at_resolution: body.conditionAtResolution,
      condition_notes: body.conditionNotes,
      found_by_type: body.foundByType,
      found_by_name: body.foundByName,
      total_leads_generated: leadMetrics?.[0]?.total_leads || 0,
      leads_verified: leadMetrics?.[0]?.verified_leads || 0,
      leads_dismissed: leadMetrics?.[0]?.dismissed_leads || 0,
      false_positive_rate: leadMetrics?.[0]?.false_positive_rate || 0,
      avg_lead_response_hours: leadMetrics?.[0]?.avg_response_hours || 0,
      total_tips_received: tipMetrics?.[0]?.total_tips || 0,
      tips_verified: tipMetrics?.[0]?.verified_tips || 0,
      tips_hoax: tipMetrics?.[0]?.hoax_tips || 0,
      tips_duplicate: tipMetrics?.[0]?.duplicate_tips || 0,
      tips_converted_to_leads: tipMetrics?.[0]?.converted_to_leads || 0,
      tip_conversion_rate:
        tipMetrics?.[0]?.total_tips > 0
          ? (tipMetrics[0].converted_to_leads / tipMetrics[0].total_tips) * 100
          : 0,
      total_assigned_officers: assignedOfficers || 0,
      case_reported_at: caseData.created_at,
      case_resolved_at: caseData.resolution_date,
      what_worked: body.whatWorked || [],
      what_didnt_work: body.whatDidntWork || [],
      lessons_learned: body.lessonsLearned,
      created_by: user.id,
    };

    // Create the outcome report
    const { data: report, error: insertError } = await supabase
      .from("case_outcome_reports")
      .insert(reportData)
      .select()
      .single();

    if (insertError) throw insertError;

    // Auto-generate initial recommendations
    const recommendationInput = {
      report: formatOutcomeReportForEngine(report),
      caseData: {
        isMinor: caseData.is_minor || false,
        isElderly: caseData.is_elderly || false,
        isIndigenous: caseData.is_indigenous || false,
        hasMedicalConditions:
          (caseData.medical_conditions?.length || 0) > 0 ||
          caseData.is_medication_dependent ||
          false,
        wasAmberAlert: caseData.is_amber_alert || false,
        jurisdictionId: caseData.jurisdiction_id,
        priorityLevel: caseData.priority_level,
      },
    };

    const generatedRecommendations =
      RecommendationsEngine.generateRecommendations(recommendationInput);

    // Insert generated recommendations
    if (generatedRecommendations.length > 0) {
      const recommendationRecords = generatedRecommendations.map((rec) => ({
        outcome_report_id: report.id,
        category: rec.category,
        priority: rec.priority,
        title: rec.title,
        description: rec.description,
        source_analysis: rec.sourceAnalysis,
        is_actionable: true,
      }));

      await supabase.from("outcome_report_recommendations").insert(recommendationRecords);
    }

    // Auto-generate "what worked" if not provided
    if (!body.whatWorked || body.whatWorked.length === 0) {
      const whatWorked = RecommendationsEngine.analyzeWhatWorked(
        formatOutcomeReportForEngine(report)
      );
      if (whatWorked.length > 0) {
        await supabase
          .from("case_outcome_reports")
          .update({ what_worked: whatWorked })
          .eq("id", report.id);
      }
    }

    // Auto-generate "what didn't work" if not provided
    if (!body.whatDidntWork || body.whatDidntWork.length === 0) {
      const whatDidntWork = RecommendationsEngine.analyzeWhatDidntWork(
        formatOutcomeReportForEngine(report)
      );
      if (whatDidntWork.length > 0) {
        await supabase
          .from("case_outcome_reports")
          .update({ what_didnt_work: whatDidntWork })
          .eq("id", report.id);
      }
    }

    // Find and store similar cases
    const { data: similarCases } = await supabase.rpc("find_similar_cases", {
      p_case_id: body.caseId,
      p_limit: 5,
    });

    if (similarCases && similarCases.length > 0) {
      const similarCaseRecords = similarCases.map((sc: any) => ({
        outcome_report_id: report.id,
        similar_case_id: sc.similar_case_id,
        similarity_score: sc.similarity_score,
        similarity_factors: sc.similarity_factors,
      }));

      await supabase.from("similar_case_analysis").insert(similarCaseRecords);
    }

    // Fetch the complete report with relations
    const { data: completeReport } = await supabase
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
          resolution_date
        ),
        recommendations:outcome_report_recommendations (*),
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
        )
      `
      )
      .eq("id", report.id)
      .single();

    return NextResponse.json(formatOutcomeReport(completeReport), { status: 201 });
  } catch (error) {
    console.error("Error creating outcome report:", error);
    return NextResponse.json(
      { error: "Failed to create outcome report" },
      { status: 500 }
    );
  }
}

// Helper functions
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
    timeline: (data.timeline || []).map((tm: any) => ({
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
  };
}

function formatOutcomeReportForEngine(data: any): CaseOutcomeReport {
  return {
    id: data.id,
    caseId: data.case_id,
    reportNumber: data.report_number,
    status: data.status,
    version: data.version || 1,
    totalDurationHours: parseFloat(data.total_duration_hours) || 0,
    initialPriorityLevel: data.initial_priority_level,
    finalPriorityLevel: data.final_priority_level,
    priorityChanges: data.priority_changes || 0,
    discoveryMethod: data.discovery_method,
    locationFound: data.location_found,
    locationFoundCity: data.location_found_city,
    locationFoundProvince: data.location_found_province,
    conditionAtResolution: data.condition_at_resolution,
    foundByType: data.found_by_type,
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
    partnerOrganizationsInvolved: data.partner_organizations_involved || [],
    timeToFirstResponse: data.time_to_first_response
      ? parseFloat(data.time_to_first_response)
      : undefined,
    whatWorked: data.what_worked || [],
    whatDidntWork: data.what_didnt_work || [],
    delaysIdentified: data.delays_identified || [],
    lessonsLearned: data.lessons_learned,
    keyDecisionPoints: data.key_decision_points || [],
    createdBy: data.created_by,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
