import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { OutcomeAnalyticsResponse } from "@/types/outcome-report.types";

/**
 * GET /api/outcome-reports/analytics
 * Get aggregated analytics for outcome reports
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
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const jurisdictionId = searchParams.get("jurisdictionId");
    const aggregationPeriod = searchParams.get("period") || "monthly";

    // Build date range
    const fromDate = dateFrom || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const toDate = dateTo || new Date().toISOString();

    // Get aggregated analytics
    let query = supabase
      .from("outcome_analytics_aggregates")
      .select("*")
      .eq("aggregation_period", aggregationPeriod)
      .gte("period_start", fromDate.split("T")[0])
      .lte("period_end", toDate.split("T")[0])
      .order("period_start", { ascending: true });

    if (jurisdictionId) {
      query = query.eq("jurisdiction_id", jurisdictionId);
    }

    const { data: aggregates, error: aggregatesError } = await query;

    if (aggregatesError) throw aggregatesError;

    // Get summary statistics from reports directly
    let summaryQuery = supabase
      .from("case_outcome_reports")
      .select(
        `
        id,
        total_duration_hours,
        discovery_method,
        total_leads_generated,
        leads_verified,
        false_positive_rate,
        total_tips_received,
        tips_verified,
        case:cases (
          disposition,
          jurisdiction_id
        )
      `
      )
      .gte("created_at", fromDate)
      .lte("created_at", toDate);

    if (jurisdictionId) {
      summaryQuery = summaryQuery.eq("case.jurisdiction_id", jurisdictionId);
    }

    const { data: reports, error: reportsError } = await summaryQuery;

    if (reportsError) throw reportsError;

    // Calculate summary statistics
    const totalReports = reports?.length || 0;
    const avgResolutionHours =
      totalReports > 0
        ? reports.reduce(
            (sum, r) => sum + (parseFloat(r.total_duration_hours) || 0),
            0
          ) / totalReports
        : 0;

    // Calculate discovery method distribution
    const discoveryMethodCounts: Record<string, number> = {};
    reports?.forEach((r) => {
      if (r.discovery_method) {
        discoveryMethodCounts[r.discovery_method] =
          (discoveryMethodCounts[r.discovery_method] || 0) + 1;
      }
    });

    const topDiscoveryMethods = Object.entries(discoveryMethodCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([method, count]) => ({
        method: method as any,
        count,
      }));

    // Get recommendation statistics
    const { data: recStats } = await supabase
      .from("outcome_report_recommendations")
      .select("is_implemented")
      .gte("created_at", fromDate)
      .lte("created_at", toDate);

    const recommendationsGenerated = recStats?.length || 0;
    const recommendationsImplemented =
      recStats?.filter((r) => r.is_implemented).length || 0;

    // Calculate disposition distribution
    const dispositionCounts: Record<string, number> = {};
    reports?.forEach((r: any) => {
      const caseData = r.case as { disposition?: string; jurisdiction_id?: string } | null;
      const disposition = caseData?.disposition;
      if (disposition) {
        dispositionCounts[disposition] = (dispositionCounts[disposition] || 0) + 1;
      }
    });

    // Calculate lead effectiveness metrics
    const avgLeadsPerCase =
      totalReports > 0
        ? reports.reduce((sum, r) => sum + (r.total_leads_generated || 0), 0) / totalReports
        : 0;

    const avgVerificationRate =
      totalReports > 0
        ? reports.reduce((sum, r) => {
            if (r.total_leads_generated > 0) {
              return sum + (r.leads_verified / r.total_leads_generated) * 100;
            }
            return sum;
          }, 0) / totalReports
        : 0;

    const avgFalsePositiveRate =
      totalReports > 0
        ? reports.reduce(
            (sum, r) => sum + (parseFloat(r.false_positive_rate) || 0),
            0
          ) / totalReports
        : 0;

    const response: OutcomeAnalyticsResponse = {
      aggregates: (aggregates || []).map((agg) => ({
        id: agg.id,
        aggregationPeriod: agg.aggregation_period,
        periodStart: agg.period_start,
        periodEnd: agg.period_end,
        jurisdictionId: agg.jurisdiction_id,
        totalCasesResolved: agg.total_cases_resolved || 0,
        casesFoundAliveSafe: agg.cases_found_alive_safe || 0,
        casesFoundAliveInjured: agg.cases_found_alive_injured || 0,
        casesFoundDeceased: agg.cases_found_deceased || 0,
        casesReturnedVoluntarily: agg.cases_returned_voluntarily || 0,
        casesOtherResolution: agg.cases_other_resolution || 0,
        avgResolutionHours: agg.avg_resolution_hours
          ? parseFloat(agg.avg_resolution_hours)
          : undefined,
        medianResolutionHours: agg.median_resolution_hours
          ? parseFloat(agg.median_resolution_hours)
          : undefined,
        minResolutionHours: agg.min_resolution_hours
          ? parseFloat(agg.min_resolution_hours)
          : undefined,
        maxResolutionHours: agg.max_resolution_hours
          ? parseFloat(agg.max_resolution_hours)
          : undefined,
        avgLeadsPerCase: agg.avg_leads_per_case
          ? parseFloat(agg.avg_leads_per_case)
          : undefined,
        avgLeadVerificationRate: agg.avg_lead_verification_rate
          ? parseFloat(agg.avg_lead_verification_rate)
          : undefined,
        avgFalsePositiveRate: agg.avg_false_positive_rate
          ? parseFloat(agg.avg_false_positive_rate)
          : undefined,
        avgOfficersPerCase: agg.avg_officers_per_case
          ? parseFloat(agg.avg_officers_per_case)
          : undefined,
        avgCostPerCase: agg.avg_cost_per_case
          ? parseFloat(agg.avg_cost_per_case)
          : undefined,
        totalVolunteerHours: agg.total_volunteer_hours
          ? parseFloat(agg.total_volunteer_hours)
          : undefined,
        discoveryMethodCounts: agg.discovery_method_counts || {},
        topPerformingLeadSources: agg.top_performing_lead_sources || [],
        commonDelays: agg.common_delays || [],
        createdAt: agg.created_at,
        updatedAt: agg.updated_at,
      })),
      summary: {
        totalReports,
        avgResolutionHours: Math.round(avgResolutionHours * 10) / 10,
        topDiscoveryMethods,
        recommendationsGenerated,
        recommendationsImplemented,
      },
    };

    // Add computed metrics
    const computedMetrics = {
      dispositionDistribution: Object.entries(dispositionCounts).map(
        ([disposition, count]) => ({
          disposition,
          count,
          percentage:
            totalReports > 0 ? Math.round((count / totalReports) * 100) : 0,
        })
      ),
      leadMetrics: {
        avgLeadsPerCase: Math.round(avgLeadsPerCase * 10) / 10,
        avgVerificationRate: Math.round(avgVerificationRate * 10) / 10,
        avgFalsePositiveRate: Math.round(avgFalsePositiveRate * 10) / 10,
      },
      resolutionTimeDistribution: calculateResolutionTimeDistribution(reports),
    };

    return NextResponse.json({
      ...response,
      computedMetrics,
    });
  } catch (error) {
    console.error("Error fetching outcome analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch outcome analytics" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/outcome-reports/analytics
 * Trigger recalculation of analytics aggregates
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

    const body = await request.json();
    const { period, dateFrom, dateTo, jurisdictionId } = body;

    // Calculate and store aggregates
    const aggregates = await calculateAggregates(
      supabase,
      period || "monthly",
      dateFrom,
      dateTo,
      jurisdictionId
    );

    return NextResponse.json({
      message: "Analytics recalculated successfully",
      aggregatesCount: aggregates.length,
    });
  } catch (error) {
    console.error("Error recalculating analytics:", error);
    return NextResponse.json(
      { error: "Failed to recalculate analytics" },
      { status: 500 }
    );
  }
}

function calculateResolutionTimeDistribution(reports: any[]): {
  bucket: string;
  count: number;
  percentage: number;
}[] {
  const buckets = {
    "< 24h": 0,
    "24-48h": 0,
    "48-72h": 0,
    "3-7d": 0,
    "1-2w": 0,
    "2-4w": 0,
    "> 4w": 0,
  };

  reports?.forEach((r) => {
    const hours = parseFloat(r.total_duration_hours) || 0;
    if (hours < 24) buckets["< 24h"]++;
    else if (hours < 48) buckets["24-48h"]++;
    else if (hours < 72) buckets["48-72h"]++;
    else if (hours < 168) buckets["3-7d"]++;
    else if (hours < 336) buckets["1-2w"]++;
    else if (hours < 672) buckets["2-4w"]++;
    else buckets["> 4w"]++;
  });

  const total = reports?.length || 0;
  return Object.entries(buckets).map(([bucket, count]) => ({
    bucket,
    count,
    percentage: total > 0 ? Math.round((count / total) * 100) : 0,
  }));
}

async function calculateAggregates(
  supabase: any,
  period: string,
  dateFrom?: string,
  dateTo?: string,
  jurisdictionId?: string
): Promise<any[]> {
  // This would typically be a background job
  // For now, we'll calculate and upsert aggregates

  const fromDate =
    dateFrom || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
  const toDate = dateTo || new Date().toISOString();

  // Get all reports in date range
  let query = supabase
    .from("case_outcome_reports")
    .select(
      `
      *,
      case:cases (
        disposition,
        jurisdiction_id
      )
    `
    )
    .gte("created_at", fromDate)
    .lte("created_at", toDate);

  if (jurisdictionId) {
    query = query.eq("case.jurisdiction_id", jurisdictionId);
  }

  const { data: reports } = await query;

  if (!reports || reports.length === 0) {
    return [];
  }

  // Group by period
  const periodGroups: Record<string, any[]> = {};
  reports.forEach((report: any) => {
    const date = new Date(report.created_at);
    let periodKey: string;

    switch (period) {
      case "daily":
        periodKey = date.toISOString().split("T")[0];
        break;
      case "weekly":
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        periodKey = weekStart.toISOString().split("T")[0];
        break;
      case "yearly":
        periodKey = `${date.getFullYear()}-01-01`;
        break;
      case "monthly":
      default:
        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
    }

    if (!periodGroups[periodKey]) {
      periodGroups[periodKey] = [];
    }
    periodGroups[periodKey].push(report);
  });

  // Calculate aggregates for each period
  const aggregates = Object.entries(periodGroups).map(
    ([periodStart, periodReports]) => {
      const periodEnd = calculatePeriodEnd(periodStart, period);

      return {
        aggregation_period: period,
        period_start: periodStart,
        period_end: periodEnd,
        jurisdiction_id: jurisdictionId || null,
        total_cases_resolved: periodReports.length,
        cases_found_alive_safe: periodReports.filter(
          (r) => r.case?.disposition === "found_alive_safe"
        ).length,
        cases_found_alive_injured: periodReports.filter(
          (r) => r.case?.disposition === "found_alive_injured"
        ).length,
        cases_found_deceased: periodReports.filter(
          (r) => r.case?.disposition === "found_deceased"
        ).length,
        cases_returned_voluntarily: periodReports.filter(
          (r) => r.case?.disposition === "returned_voluntarily"
        ).length,
        cases_other_resolution: periodReports.filter(
          (r) =>
            r.case?.disposition &&
            ![
              "found_alive_safe",
              "found_alive_injured",
              "found_deceased",
              "returned_voluntarily",
            ].includes(r.case.disposition)
        ).length,
        avg_resolution_hours:
          periodReports.reduce(
            (sum, r) => sum + (parseFloat(r.total_duration_hours) || 0),
            0
          ) / periodReports.length,
        avg_leads_per_case:
          periodReports.reduce(
            (sum, r) => sum + (r.total_leads_generated || 0),
            0
          ) / periodReports.length,
        avg_officers_per_case:
          periodReports.reduce(
            (sum, r) => sum + (r.total_assigned_officers || 0),
            0
          ) / periodReports.length,
      };
    }
  );

  // Upsert aggregates
  for (const agg of aggregates) {
    await supabase.from("outcome_analytics_aggregates").upsert(agg, {
      onConflict: "aggregation_period,period_start,jurisdiction_id",
    });
  }

  return aggregates;
}

function calculatePeriodEnd(periodStart: string, period: string): string {
  const date = new Date(periodStart);

  switch (period) {
    case "daily":
      return periodStart;
    case "weekly":
      date.setDate(date.getDate() + 6);
      break;
    case "yearly":
      date.setFullYear(date.getFullYear() + 1);
      date.setDate(date.getDate() - 1);
      break;
    case "monthly":
    default:
      date.setMonth(date.getMonth() + 1);
      date.setDate(date.getDate() - 1);
  }

  return date.toISOString().split("T")[0];
}
