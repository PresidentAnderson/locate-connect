import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  ExecutiveDashboardData,
  KPICard,
  GeographicDistribution,
  TrendComparison,
  PartnerEngagementWithOrg,
  AgentStatus,
} from "@/types/dashboard.types";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate") || getDefaultStartDate();
    const endDate = searchParams.get("endDate") || new Date().toISOString().split("T")[0];
    const jurisdictionId = searchParams.get("jurisdictionId");

    // Fetch metrics
    const [
      metricsResult,
      casesResult,
      resolutionResult,
      agentsResult,
      partnersResult,
      geoResult,
    ] = await Promise.all([
      // Get aggregated metrics
      supabase
        .from("dashboard_metrics")
        .select("*")
        .eq("metric_type", "daily")
        .gte("metric_date", startDate)
        .lte("metric_date", endDate)
        .order("metric_date", { ascending: false })
        .limit(1),

      // Get current case counts
      supabase
        .from("cases")
        .select("id, status, priority_level, disposition, created_at, resolution_date", { count: "exact" })
        .gte("created_at", startDate)
        .lte("created_at", endDate + "T23:59:59"),

      // Get resolved cases for resolution time calculation
      supabase
        .from("cases")
        .select("created_at, resolution_date, priority_level")
        .in("status", ["resolved", "closed"])
        .not("resolution_date", "is", null)
        .gte("resolution_date", startDate)
        .lte("resolution_date", endDate + "T23:59:59"),

      // Get agent queue status
      supabase
        .from("agent_queue_status")
        .select("*"),

      // Get partner engagement
      supabase
        .from("partner_engagement")
        .select(`
          *,
          organizations(id, name, type)
        `)
        .gte("metric_date", startDate)
        .lte("metric_date", endDate),

      // Get geographic distribution
      supabase
        .from("geographic_distribution")
        .select("*")
        .gte("metric_date", startDate)
        .lte("metric_date", endDate),
    ]);

    // Calculate KPIs
    const cases = casesResult.data || [];
    const totalCases = cases.length;
    const activeCases = cases.filter((c) => c.status === "active").length;
    const resolvedCases = cases.filter((c) => c.status === "resolved" || c.status === "closed").length;
    const resolutionRate = totalCases > 0 ? (resolvedCases / totalCases) * 100 : 0;

    // Calculate average resolution time
    const resolvedWithTime = (resolutionResult.data || []).filter(
      (c) => c.resolution_date && c.created_at
    );
    let avgResolutionHours = 0;
    if (resolvedWithTime.length > 0) {
      const totalHours = resolvedWithTime.reduce((sum, c) => {
        const created = new Date(c.created_at);
        const resolved = new Date(c.resolution_date);
        return sum + (resolved.getTime() - created.getTime()) / (1000 * 60 * 60);
      }, 0);
      avgResolutionHours = totalHours / resolvedWithTime.length;
    }

    // Calculate priority distribution
    const priorityDistribution = {
      p0: cases.filter((c) => c.priority_level === "p0_critical").length,
      p1: cases.filter((c) => c.priority_level === "p1_high").length,
      p2: cases.filter((c) => c.priority_level === "p2_medium").length,
      p3: cases.filter((c) => c.priority_level === "p3_low").length,
      p4: cases.filter((c) => c.priority_level === "p4_routine").length,
    };

    // Calculate disposition distribution
    const dispositions = cases.reduce((acc, c) => {
      if (c.disposition) {
        acc[c.disposition] = (acc[c.disposition] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Build KPIs
    const kpis: KPICard[] = [
      {
        id: "total-cases",
        title: "Total Cases",
        value: totalCases,
        format: "number",
        color: "cyan",
        description: "Cases in the selected period",
      },
      {
        id: "active-cases",
        title: "Active Cases",
        value: activeCases,
        format: "number",
        color: "orange",
        description: "Currently active investigations",
      },
      {
        id: "resolution-rate",
        title: "Resolution Rate",
        value: resolutionRate.toFixed(1),
        format: "percentage",
        color: resolutionRate >= 75 ? "green" : resolutionRate >= 50 ? "yellow" : "red",
        description: "Cases resolved vs total",
      },
      {
        id: "avg-resolution-time",
        title: "Avg Resolution Time",
        value: avgResolutionHours > 24
          ? `${(avgResolutionHours / 24).toFixed(1)} days`
          : `${avgResolutionHours.toFixed(1)} hrs`,
        format: "duration",
        color: "cyan",
        description: "Average time to resolution",
      },
      {
        id: "critical-cases",
        title: "Critical (P0) Cases",
        value: priorityDistribution.p0,
        format: "number",
        color: "red",
        description: "Priority 0 cases requiring immediate attention",
      },
      {
        id: "high-priority",
        title: "High Priority (P1)",
        value: priorityDistribution.p1,
        format: "number",
        color: "orange",
        description: "Priority 1 cases",
      },
    ];

    // Calculate agent utilization
    const agents = agentsResult.data || [];
    const totalAgents = agents.length;
    const activeAgents = agents.filter((a) => a.status !== "offline").length;
    const avgUtilization =
      totalAgents > 0
        ? agents.reduce((sum, a) => sum + (a.utilization_percentage || 0), 0) / totalAgents
        : 0;

    const statusCounts = agents.reduce((acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Format partner engagement
    const partnerEngagement: PartnerEngagementWithOrg[] = (partnersResult.data || []).map((p) => ({
      id: p.id,
      organizationId: p.organization_id,
      metricDate: p.metric_date,
      casesReferred: p.cases_referred,
      casesReceived: p.cases_received,
      casesJointlyResolved: p.cases_jointly_resolved,
      leadsShared: p.leads_shared,
      leadsReceived: p.leads_received,
      tipsForwarded: p.tips_forwarded,
      avgResponseTimeHours: p.avg_response_time_hours,
      collaborationScore: p.collaboration_score,
      apiCalls: p.api_calls,
      emailsSent: p.emails_sent,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      organization: {
        id: p.organizations?.id || "",
        name: p.organizations?.name || "Unknown",
        type: p.organizations?.type || "",
      },
    }));

    // Build response
    const dashboardData: ExecutiveDashboardData = {
      kpis,
      resolutionRates: {
        overall: resolutionRate,
        byPriority: Object.entries(priorityDistribution).map(([priority, count]) => ({
          priority: priority.toUpperCase(),
          rate: totalCases > 0 ? (count / totalCases) * 100 : 0,
        })),
        byDisposition: Object.entries(dispositions).map(([disposition, count]) => ({
          disposition,
          count,
        })),
      },
      avgTimeToResolution: {
        current: avgResolutionHours,
        previous: 0, // Would need historical data
        changePercentage: 0,
        byPriority: [], // Would calculate per priority
      },
      geographicDistribution: (geoResult.data || []).map((g) => ({
        id: g.id,
        metricDate: g.metric_date,
        province: g.province,
        city: g.city,
        jurisdictionId: g.jurisdiction_id,
        latitude: g.latitude,
        longitude: g.longitude,
        activeCases: g.active_cases,
        resolvedCases: g.resolved_cases,
        totalCases: g.total_cases,
        minorCases: g.minor_cases,
        indigenousCases: g.indigenous_cases,
        avgResolutionHours: g.avg_resolution_hours,
        createdAt: g.created_at,
        updatedAt: g.updated_at,
      })),
      trendComparisons: {
        yearOverYear: buildEmptyTrendComparison(),
        monthOverMonth: buildEmptyTrendComparison(),
      },
      resourceUtilization: {
        totalAgents,
        activeAgents,
        avgUtilization,
        byStatus: Object.entries(statusCounts).map(([status, count]) => ({
          status: status as AgentStatus,
          count: count as number,
        })),
      },
      partnerEngagement,
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error("Error fetching executive dashboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}

function getDefaultStartDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().split("T")[0];
}

function buildEmptyTrendComparison(): TrendComparison {
  return {
    currentPeriod: { start: "", end: "", value: 0 },
    previousPeriod: { start: "", end: "", value: 0 },
    changePercentage: 0,
    metrics: [],
  };
}
