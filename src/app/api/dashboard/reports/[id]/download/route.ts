import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get the report details
    const { data: report, error: reportError } = await supabase
      .from("generated_reports")
      .select("*")
      .eq("id", id)
      .single();

    if (reportError || !report) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 }
      );
    }

    // Get report data based on report type and date range
    const dateFrom = report.date_from;
    const dateTo = report.date_to;
    const reportType = report.report_type;
    const filtersApplied = report.filters_applied || {};

    // Fetch actual data for the report
    const reportData = await fetchReportData(supabase, reportType, dateFrom, dateTo);

    // Build the report response (in a real implementation, this would generate a PDF)
    // For now, we return JSON that could be rendered by the client-side PDF generator
    const response = {
      title: getReportTitle(reportType),
      subtitle: `${reportType.replace(/_/g, " ")} Report`,
      dateRange: {
        from: dateFrom,
        to: dateTo,
      },
      generatedAt: new Date().toISOString(),
      includeBranding: filtersApplied.includeBranding ?? true,
      includeCharts: filtersApplied.includeCharts ?? true,
      ...reportData,
    };

    // Set headers for JSON download (client will generate PDF)
    return NextResponse.json(response, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${report.name.replace(/[^a-zA-Z0-9]/g, "_")}.json"`,
      },
    });
  } catch (error) {
    console.error("Error generating report download:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}

async function fetchReportData(
  supabase: any,
  reportType: string,
  dateFrom: string,
  dateTo: string
) {
  const data: any = {
    kpis: [],
  };

  // Fetch cases for most report types
  const { data: cases } = await supabase
    .from("cases")
    .select("id, status, priority_level, disposition, created_at, resolution_date")
    .gte("created_at", dateFrom)
    .lte("created_at", dateTo + "T23:59:59");

  const allCases = cases || [];
  const totalCases = allCases.length;
  const activeCases = allCases.filter((c: any) => c.status === "active").length;
  const resolvedCases = allCases.filter(
    (c: any) => c.status === "resolved" || c.status === "closed"
  ).length;

  // Calculate average resolution time
  const resolvedWithTime = allCases.filter(
    (c: any) => c.resolution_date && c.created_at
  );
  let avgResolutionHours = 0;
  if (resolvedWithTime.length > 0) {
    const totalHours = resolvedWithTime.reduce((sum: number, c: any) => {
      const created = new Date(c.created_at);
      const resolved = new Date(c.resolution_date);
      return sum + (resolved.getTime() - created.getTime()) / (1000 * 60 * 60);
    }, 0);
    avgResolutionHours = totalHours / resolvedWithTime.length;
  }

  // Basic KPIs for all reports
  data.kpis = [
    { label: "Total Cases", value: totalCases, description: "In the selected period" },
    { label: "Active Cases", value: activeCases, description: "Currently active" },
    { label: "Resolved Cases", value: resolvedCases, description: "Successfully resolved" },
    {
      label: "Resolution Rate",
      value: `${totalCases > 0 ? ((resolvedCases / totalCases) * 100).toFixed(1) : 0}%`,
      description: "Cases resolved vs total",
    },
  ];

  data.caseMetrics = {
    total: totalCases,
    active: activeCases,
    resolved: resolvedCases,
    avgResolutionHours,
  };

  // Report-type specific data
  switch (reportType) {
    case "executive_summary":
    case "case_metrics":
    case "comprehensive":
      // Resolution rates by priority
      const priorityDistribution = {
        p0: allCases.filter((c: any) => c.priority_level === "p0_critical").length,
        p1: allCases.filter((c: any) => c.priority_level === "p1_high").length,
        p2: allCases.filter((c: any) => c.priority_level === "p2_medium").length,
        p3: allCases.filter((c: any) => c.priority_level === "p3_low").length,
        p4: allCases.filter((c: any) => c.priority_level === "p4_routine").length,
      };

      data.resolutionRates = {
        overall: totalCases > 0 ? (resolvedCases / totalCases) * 100 : 0,
        byPriority: [
          { priority: "P0 Critical", rate: totalCases > 0 ? (priorityDistribution.p0 / totalCases) * 100 : 0 },
          { priority: "P1 High", rate: totalCases > 0 ? (priorityDistribution.p1 / totalCases) * 100 : 0 },
          { priority: "P2 Medium", rate: totalCases > 0 ? (priorityDistribution.p2 / totalCases) * 100 : 0 },
          { priority: "P3 Low", rate: totalCases > 0 ? (priorityDistribution.p3 / totalCases) * 100 : 0 },
          { priority: "P4 Routine", rate: totalCases > 0 ? (priorityDistribution.p4 / totalCases) * 100 : 0 },
        ],
      };
      break;

    case "staff_productivity":
      const { data: productivity } = await supabase
        .from("staff_productivity")
        .select(`
          *,
          profiles(id, first_name, last_name)
        `)
        .gte("metric_date", dateFrom)
        .lte("metric_date", dateTo);

      if (productivity && productivity.length > 0) {
        // Aggregate by user
        const userStats = new Map<string, any>();
        for (const p of productivity) {
          const userId = p.user_id;
          const name = p.profiles
            ? `${p.profiles.first_name} ${p.profiles.last_name}`
            : "Unknown";

          if (!userStats.has(userId)) {
            userStats.set(userId, {
              name,
              casesResolved: 0,
              leadsVerified: 0,
              totalActions: 0,
            });
          }

          const stats = userStats.get(userId);
          stats.casesResolved += p.cases_resolved || 0;
          stats.leadsVerified += p.leads_verified || 0;
          stats.totalActions += p.total_actions || 0;
        }

        data.staffProductivity = Array.from(userStats.values()).map((s) => ({
          name: s.name,
          casesResolved: s.casesResolved,
          leadsVerified: s.leadsVerified,
          performanceScore: Math.min(
            Math.round(
              s.casesResolved * 10 + s.leadsVerified * 5 + s.totalActions / 5
            ),
            100
          ),
        }));
      }
      break;

    case "geographic_analysis":
      const { data: geographic } = await supabase
        .from("geographic_distribution")
        .select("*")
        .gte("metric_date", dateFrom)
        .lte("metric_date", dateTo);

      if (geographic && geographic.length > 0) {
        data.geographicData = geographic.map((g: any) => ({
          region: g.city || g.province || "Unknown",
          totalCases: g.total_cases || 0,
          activeCases: g.active_cases || 0,
          resolvedCases: g.resolved_cases || 0,
        }));
      }
      break;

    case "partner_engagement":
      const { data: partners } = await supabase
        .from("partner_engagement")
        .select(`
          *,
          organizations(name)
        `)
        .gte("metric_date", dateFrom)
        .lte("metric_date", dateTo);

      if (partners && partners.length > 0) {
        // Aggregate by organization
        const orgStats = new Map<string, any>();
        for (const p of partners) {
          const orgId = p.organization_id;
          const name = p.organizations?.name || "Unknown";

          if (!orgStats.has(orgId)) {
            orgStats.set(orgId, {
              organization: name,
              casesReferred: 0,
              collaborationScoreSum: 0,
              count: 0,
            });
          }

          const stats = orgStats.get(orgId);
          stats.casesReferred += p.cases_referred || 0;
          stats.collaborationScoreSum += p.collaboration_score || 0;
          stats.count++;
        }

        data.partnerEngagement = Array.from(orgStats.values()).map((s) => ({
          organization: s.organization,
          casesReferred: s.casesReferred,
          collaborationScore: Math.round(s.collaborationScoreSum / s.count),
        }));
      }
      break;

    case "sla_compliance":
      const { data: sla } = await supabase
        .from("sla_compliance")
        .select(`
          *,
          sla_definitions(priority_level)
        `);

      if (sla && sla.length > 0) {
        const totalSLACases = sla.length;
        const compliantCases = sla.filter((s: any) => (s.compliance_score || 0) >= 80).length;
        const avgScore =
          sla.reduce((sum: number, s: any) => sum + (s.compliance_score || 0), 0) /
          totalSLACases;

        // Group by priority
        const slaPriorityGroups = sla.reduce((acc: any, s: any) => {
          const priority = s.sla_definitions?.priority_level || "unknown";
          if (!acc[priority]) {
            acc[priority] = { compliant: 0, total: 0 };
          }
          acc[priority].total++;
          if ((s.compliance_score || 0) >= 80) acc[priority].compliant++;
          return acc;
        }, {});

        data.slaCompliance = {
          totalCases: totalSLACases,
          compliantCases,
          averageScore: avgScore,
          byPriority: Object.entries(slaPriorityGroups).map(([priority, stats]: [string, any]) => ({
            priority: priority.toUpperCase(),
            compliant: stats.compliant,
            total: stats.total,
          })),
        };
      }
      break;
  }

  // For comprehensive reports, include all data
  if (reportType === "comprehensive") {
    // Add all available data
    const [productivityResult, geoResult, partnerResult, slaResult] = await Promise.all([
      supabase
        .from("staff_productivity")
        .select(`*, profiles(id, first_name, last_name)`)
        .gte("metric_date", dateFrom)
        .lte("metric_date", dateTo),
      supabase
        .from("geographic_distribution")
        .select("*")
        .gte("metric_date", dateFrom)
        .lte("metric_date", dateTo),
      supabase
        .from("partner_engagement")
        .select(`*, organizations(name)`)
        .gte("metric_date", dateFrom)
        .lte("metric_date", dateTo),
      supabase.from("sla_compliance").select(`*, sla_definitions(priority_level)`),
    ]);

    // Process and add to data object (similar to above)
    if (productivityResult.data) {
      const userStats = new Map<string, any>();
      for (const p of productivityResult.data) {
        const userId = p.user_id;
        const name = p.profiles
          ? `${p.profiles.first_name} ${p.profiles.last_name}`
          : "Unknown";
        if (!userStats.has(userId)) {
          userStats.set(userId, { name, casesResolved: 0, leadsVerified: 0, totalActions: 0 });
        }
        const stats = userStats.get(userId);
        stats.casesResolved += p.cases_resolved || 0;
        stats.leadsVerified += p.leads_verified || 0;
        stats.totalActions += p.total_actions || 0;
      }
      data.staffProductivity = Array.from(userStats.values()).map((s) => ({
        name: s.name,
        casesResolved: s.casesResolved,
        leadsVerified: s.leadsVerified,
        performanceScore: Math.min(
          Math.round(s.casesResolved * 10 + s.leadsVerified * 5 + s.totalActions / 5),
          100
        ),
      }));
    }

    if (geoResult.data) {
      data.geographicData = geoResult.data.map((g: any) => ({
        region: g.city || g.province || "Unknown",
        totalCases: g.total_cases || 0,
        activeCases: g.active_cases || 0,
        resolvedCases: g.resolved_cases || 0,
      }));
    }

    if (partnerResult.data) {
      const orgStats = new Map<string, any>();
      for (const p of partnerResult.data) {
        const orgId = p.organization_id;
        const name = p.organizations?.name || "Unknown";
        if (!orgStats.has(orgId)) {
          orgStats.set(orgId, { organization: name, casesReferred: 0, collaborationScoreSum: 0, count: 0 });
        }
        const stats = orgStats.get(orgId);
        stats.casesReferred += p.cases_referred || 0;
        stats.collaborationScoreSum += p.collaboration_score || 0;
        stats.count++;
      }
      data.partnerEngagement = Array.from(orgStats.values()).map((s) => ({
        organization: s.organization,
        casesReferred: s.casesReferred,
        collaborationScore: Math.round(s.collaborationScoreSum / s.count),
      }));
    }

    if (slaResult.data && slaResult.data.length > 0) {
      const sla = slaResult.data;
      const totalSLACases = sla.length;
      const compliantCases = sla.filter((s: any) => (s.compliance_score || 0) >= 80).length;
      const avgScore =
        sla.reduce((sum: number, s: any) => sum + (s.compliance_score || 0), 0) / totalSLACases;
      const slaPriorityGroups = sla.reduce((acc: any, s: any) => {
        const priority = s.sla_definitions?.priority_level || "unknown";
        if (!acc[priority]) acc[priority] = { compliant: 0, total: 0 };
        acc[priority].total++;
        if ((s.compliance_score || 0) >= 80) acc[priority].compliant++;
        return acc;
      }, {});
      data.slaCompliance = {
        totalCases: totalSLACases,
        compliantCases,
        averageScore: avgScore,
        byPriority: Object.entries(slaPriorityGroups).map(([priority, stats]: [string, any]) => ({
          priority: priority.toUpperCase(),
          compliant: stats.compliant,
          total: stats.total,
        })),
      };
    }
  }

  return data;
}

function getReportTitle(reportType: string): string {
  const titles: Record<string, string> = {
    executive_summary: "Executive Summary Report",
    case_metrics: "Case Metrics Report",
    staff_productivity: "Staff Productivity Report",
    partner_engagement: "Partner Engagement Report",
    geographic_analysis: "Geographic Analysis Report",
    sla_compliance: "SLA Compliance Report",
    comprehensive: "Comprehensive Organizational Report",
  };
  return titles[reportType] || "Report";
}
