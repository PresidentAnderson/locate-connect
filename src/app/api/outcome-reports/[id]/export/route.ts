import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/outcome-reports/[id]/export
 * Export outcome report in various formats (PDF, Excel, JSON)
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

    // Get format from query
    const format = request.nextUrl.searchParams.get("format") || "json";
    const includeConfidential =
      request.nextUrl.searchParams.get("includeConfidential") === "true";

    // Fetch the complete report
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
          is_amber_alert
        ),
        recommendations:outcome_report_recommendations (
          category,
          priority,
          title,
          description,
          is_implemented,
          implementation_notes
        ),
        similar_cases:similar_case_analysis (
          similarity_score,
          similarity_factors,
          similar_case:cases (
            case_number,
            disposition
          )
        ),
        timeline:outcome_timeline_milestones (
          milestone_type,
          timestamp,
          title,
          description,
          is_decision_point,
          was_delay,
          delay_hours,
          delay_reason
        )
      `
      )
      .eq("id", id)
      .single();

    if (error || !report) {
      return NextResponse.json(
        { error: "Outcome report not found" },
        { status: 404 }
      );
    }

    // Format the export data
    const exportData = formatExportData(report, includeConfidential);

    switch (format.toLowerCase()) {
      case "json":
        return NextResponse.json(exportData);

      case "csv":
      case "excel":
        const csvContent = generateCSV(exportData);
        return new NextResponse(csvContent, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="outcome-report-${report.report_number}.csv"`,
          },
        });

      case "pdf":
        // Return PDF data for client-side rendering
        return NextResponse.json({
          type: "pdf",
          data: exportData,
          metadata: {
            reportNumber: report.report_number,
            generatedAt: new Date().toISOString(),
            generatedBy: user.id,
          },
        });

      default:
        return NextResponse.json(
          { error: "Unsupported export format. Use: json, csv, excel, or pdf" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error exporting outcome report:", error);
    return NextResponse.json(
      { error: "Failed to export outcome report" },
      { status: 500 }
    );
  }
}

function formatExportData(report: any, includeConfidential: boolean) {
  const caseData = report.case || {};
  const subjectName = includeConfidential
    ? `${caseData.first_name || ""} ${caseData.last_name || ""}`.trim()
    : `[Redacted]`;

  return {
    // Report metadata
    reportNumber: report.report_number,
    reportStatus: report.status,
    reportVersion: report.version,
    generatedAt: new Date().toISOString(),

    // Case summary
    caseNumber: caseData.case_number,
    subjectName,
    subjectAge: caseData.age_at_disappearance,
    reportedDate: report.case_reported_at,
    resolvedDate: report.case_resolved_at,
    totalDurationHours: parseFloat(report.total_duration_hours) || 0,
    totalDurationDays: Math.round((parseFloat(report.total_duration_hours) || 0) / 24 * 10) / 10,
    disposition: caseData.disposition,
    dispositionLabel: formatDisposition(caseData.disposition),

    // Resolution details
    resolution: {
      discoveryMethod: report.discovery_method,
      discoveryMethodLabel: formatDiscoveryMethod(report.discovery_method),
      location: report.location_found,
      city: report.location_found_city,
      province: report.location_found_province,
      foundBy: report.found_by_name || report.found_by_type,
      conditionAtResolution: report.condition_at_resolution,
      notes: report.condition_notes,
    },

    // Lead analysis
    leadAnalysis: {
      totalLeads: report.total_leads_generated || 0,
      verifiedLeads: report.leads_verified || 0,
      dismissedLeads: report.leads_dismissed || 0,
      actsedUponLeads: report.leads_acted_upon || 0,
      solvingLeadSource: report.solving_lead_source,
      falsePositiveRate: report.false_positive_rate
        ? parseFloat(report.false_positive_rate)
        : 0,
      avgResponseHours: report.avg_lead_response_hours
        ? parseFloat(report.avg_lead_response_hours)
        : 0,
      verificationRate:
        report.total_leads_generated > 0
          ? Math.round(
              (report.leads_verified / report.total_leads_generated) * 100
            )
          : 0,
    },

    // Tip analysis
    tipAnalysis: {
      totalTips: report.total_tips_received || 0,
      verifiedTips: report.tips_verified || 0,
      hoaxTips: report.tips_hoax || 0,
      duplicateTips: report.tips_duplicate || 0,
      convertedToLeads: report.tips_converted_to_leads || 0,
      conversionRate: report.tip_conversion_rate
        ? parseFloat(report.tip_conversion_rate)
        : 0,
    },

    // Resource utilization
    resources: {
      assignedOfficers: report.total_assigned_officers || 0,
      volunteerHours: report.total_volunteer_hours
        ? parseFloat(report.total_volunteer_hours)
        : 0,
      mediaOutlets: report.media_outlets_engaged || 0,
      socialMediaReach: report.social_media_reach || 0,
      estimatedCost: report.estimated_cost
        ? parseFloat(report.estimated_cost)
        : null,
      partnerOrganizations: report.partner_organizations_involved || [],
    },

    // Time breakdown
    timeBreakdown: {
      toFirstResponse: report.time_to_first_response
        ? parseFloat(report.time_to_first_response)
        : null,
      toFirstLead: report.time_to_first_lead
        ? parseFloat(report.time_to_first_lead)
        : null,
      toVerifiedLead: report.time_to_verified_lead
        ? parseFloat(report.time_to_verified_lead)
        : null,
      toResolution: report.time_to_resolution
        ? parseFloat(report.time_to_resolution)
        : null,
    },

    // Analysis
    whatWorked: report.what_worked || [],
    whatDidntWork: report.what_didnt_work || [],
    delaysIdentified: report.delays_identified || [],
    lessonsLearned: report.lessons_learned,

    // Recommendations
    recommendations: (report.recommendations || []).map((rec: any) => ({
      category: rec.category,
      priority: rec.priority,
      title: rec.title,
      description: rec.description,
      isImplemented: rec.is_implemented,
      implementationNotes: rec.implementation_notes,
    })),

    // Similar cases
    similarCases: (report.similar_cases || []).map((sc: any) => ({
      caseNumber: sc.similar_case?.case_number,
      similarityScore: parseFloat(sc.similarity_score),
      disposition: sc.similar_case?.disposition,
      factors: sc.similarity_factors || [],
    })),

    // Timeline
    timeline: (report.timeline || [])
      .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map((tm: any) => ({
        timestamp: tm.timestamp,
        type: tm.milestone_type,
        title: tm.title,
        description: tm.description,
        isDecisionPoint: tm.is_decision_point,
        wasDelay: tm.was_delay,
        delayHours: tm.delay_hours ? parseFloat(tm.delay_hours) : null,
        delayReason: tm.delay_reason,
      })),
  };
}

function generateCSV(data: any): string {
  const lines: string[] = [];

  // Header section
  lines.push("CASE OUTCOME REPORT");
  lines.push(`Report Number,${data.reportNumber}`);
  lines.push(`Generated At,${data.generatedAt}`);
  lines.push("");

  // Case Summary
  lines.push("CASE SUMMARY");
  lines.push(`Case Number,${data.caseNumber}`);
  lines.push(`Subject,${data.subjectName}`);
  lines.push(`Age at Disappearance,${data.subjectAge || "N/A"}`);
  lines.push(`Reported Date,${data.reportedDate || "N/A"}`);
  lines.push(`Resolved Date,${data.resolvedDate || "N/A"}`);
  lines.push(`Total Duration (Hours),${data.totalDurationHours}`);
  lines.push(`Total Duration (Days),${data.totalDurationDays}`);
  lines.push(`Disposition,${data.dispositionLabel}`);
  lines.push("");

  // Resolution Details
  lines.push("RESOLUTION DETAILS");
  lines.push(`Discovery Method,${data.resolution.discoveryMethodLabel}`);
  lines.push(`Location Found,"${data.resolution.location || "N/A"}"`);
  lines.push(`City,${data.resolution.city || "N/A"}`);
  lines.push(`Province,${data.resolution.province || "N/A"}`);
  lines.push(`Found By,${data.resolution.foundBy || "N/A"}`);
  lines.push(`Condition,${data.resolution.conditionAtResolution || "N/A"}`);
  lines.push("");

  // Lead Analysis
  lines.push("LEAD ANALYSIS");
  lines.push(`Total Leads,${data.leadAnalysis.totalLeads}`);
  lines.push(`Verified Leads,${data.leadAnalysis.verifiedLeads}`);
  lines.push(`Dismissed Leads,${data.leadAnalysis.dismissedLeads}`);
  lines.push(`Verification Rate,${data.leadAnalysis.verificationRate}%`);
  lines.push(`False Positive Rate,${data.leadAnalysis.falsePositiveRate}%`);
  lines.push(`Avg Response Time (Hours),${data.leadAnalysis.avgResponseHours}`);
  lines.push(`Solving Lead Source,${data.leadAnalysis.solvingLeadSource || "N/A"}`);
  lines.push("");

  // Tip Analysis
  lines.push("TIP ANALYSIS");
  lines.push(`Total Tips,${data.tipAnalysis.totalTips}`);
  lines.push(`Verified Tips,${data.tipAnalysis.verifiedTips}`);
  lines.push(`Hoax Tips,${data.tipAnalysis.hoaxTips}`);
  lines.push(`Duplicate Tips,${data.tipAnalysis.duplicateTips}`);
  lines.push(`Converted to Leads,${data.tipAnalysis.convertedToLeads}`);
  lines.push(`Conversion Rate,${data.tipAnalysis.conversionRate}%`);
  lines.push("");

  // Resource Utilization
  lines.push("RESOURCE UTILIZATION");
  lines.push(`Assigned Officers,${data.resources.assignedOfficers}`);
  lines.push(`Volunteer Hours,${data.resources.volunteerHours}`);
  lines.push(`Media Outlets,${data.resources.mediaOutlets}`);
  lines.push(`Social Media Reach,${data.resources.socialMediaReach}`);
  lines.push(`Estimated Cost,${data.resources.estimatedCost || "N/A"}`);
  lines.push(`Partner Organizations,"${data.resources.partnerOrganizations.join("; ")}"`);
  lines.push("");

  // Time Breakdown
  lines.push("TIME BREAKDOWN");
  lines.push(`To First Response (Hours),${data.timeBreakdown.toFirstResponse || "N/A"}`);
  lines.push(`To First Lead (Hours),${data.timeBreakdown.toFirstLead || "N/A"}`);
  lines.push(`To Verified Lead (Hours),${data.timeBreakdown.toVerifiedLead || "N/A"}`);
  lines.push(`To Resolution (Hours),${data.timeBreakdown.toResolution || "N/A"}`);
  lines.push("");

  // What Worked
  lines.push("WHAT WORKED");
  data.whatWorked.forEach((item: string, i: number) => {
    lines.push(`${i + 1},"${item}"`);
  });
  lines.push("");

  // What Didn't Work
  lines.push("WHAT DIDN'T WORK");
  data.whatDidntWork.forEach((item: string, i: number) => {
    lines.push(`${i + 1},"${item}"`);
  });
  lines.push("");

  // Delays
  lines.push("DELAYS IDENTIFIED");
  data.delaysIdentified.forEach((item: string, i: number) => {
    lines.push(`${i + 1},"${item}"`);
  });
  lines.push("");

  // Lessons Learned
  lines.push("LESSONS LEARNED");
  lines.push(`"${data.lessonsLearned || "N/A"}"`);
  lines.push("");

  // Recommendations
  lines.push("RECOMMENDATIONS");
  lines.push("Category,Priority,Title,Description,Implemented");
  data.recommendations.forEach((rec: any) => {
    lines.push(
      `${rec.category},${rec.priority},"${rec.title}","${rec.description}",${rec.isImplemented}`
    );
  });
  lines.push("");

  // Similar Cases
  lines.push("SIMILAR CASES");
  lines.push("Case Number,Similarity Score,Disposition");
  data.similarCases.forEach((sc: any) => {
    lines.push(`${sc.caseNumber},${sc.similarityScore}%,${sc.disposition || "N/A"}`);
  });
  lines.push("");

  // Timeline
  lines.push("TIMELINE");
  lines.push("Timestamp,Type,Title,Description,Decision Point,Was Delay,Delay Hours");
  data.timeline.forEach((tm: any) => {
    lines.push(
      `${tm.timestamp},${tm.type},"${tm.title}","${tm.description || ""}",${tm.isDecisionPoint},${tm.wasDelay},${tm.delayHours || ""}`
    );
  });

  return lines.join("\n");
}

function formatDisposition(disposition: string): string {
  const labels: Record<string, string> = {
    found_alive_safe: "Found Alive - Safe",
    found_alive_injured: "Found Alive - Injured",
    found_deceased: "Found Deceased",
    returned_voluntarily: "Returned Voluntarily",
    located_runaway: "Located - Runaway",
    located_custody: "Located - In Custody",
    located_medical_facility: "Located - Medical Facility",
    located_shelter: "Located - Shelter",
    located_incarcerated: "Located - Incarcerated",
    false_report: "False Report",
    other: "Other",
  };
  return labels[disposition] || disposition || "Unknown";
}

function formatDiscoveryMethod(method: string): string {
  const labels: Record<string, string> = {
    lead_from_public: "Lead from Public",
    lead_from_law_enforcement: "Lead from Law Enforcement",
    tip_anonymous: "Anonymous Tip",
    tip_identified: "Identified Tip",
    social_media_monitoring: "Social Media Monitoring",
    surveillance: "Surveillance",
    patrol_encounter: "Patrol Encounter",
    self_return: "Self Return",
    hospital_report: "Hospital Report",
    shelter_report: "Shelter Report",
    cross_border_alert: "Cross-Border Alert",
    amber_alert_response: "AMBER Alert Response",
    volunteer_search: "Volunteer Search",
    ai_facial_recognition: "AI/Facial Recognition",
    financial_tracking: "Financial Tracking",
    phone_tracking: "Phone Tracking",
    other: "Other",
  };
  return labels[method] || method || "Unknown";
}
