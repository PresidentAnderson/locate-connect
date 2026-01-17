"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface AnalyticsData {
  aggregates: any[];
  summary: {
    totalReports: number;
    avgResolutionHours: number;
    topDiscoveryMethods: { method: string; count: number }[];
    recommendationsGenerated: number;
    recommendationsImplemented: number;
  };
  computedMetrics?: {
    dispositionDistribution: { disposition: string; count: number; percentage: number }[];
    leadMetrics: {
      avgLeadsPerCase: number;
      avgVerificationRate: number;
      avgFalsePositiveRate: number;
    };
    resolutionTimeDistribution: { bucket: string; count: number; percentage: number }[];
  };
}

export default function OutcomeAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<string>("monthly");
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchAnalytics();
  }, [period, dateRange]);

  async function fetchAnalytics() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        period,
        dateFrom: dateRange.from,
        dateTo: dateRange.to,
      });

      const response = await fetch(`/api/outcome-reports/analytics?${params}`);
      if (!response.ok) throw new Error("Failed to fetch analytics");

      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <Link
            href="/reports/outcome"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-2"
          >
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Reports
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Outcome Analytics</h1>
          <p className="text-sm text-gray-600 mt-1">
            Aggregate analysis of case outcomes for learning and improvement
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Aggregation Period
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              From
            </label>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange((r) => ({ ...r, from: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              To
            </label>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange((r) => ({ ...r, to: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
        </div>
      )}

      {/* Analytics Content */}
      {!loading && !error && analytics && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-2xl font-bold text-gray-900">
                {analytics.summary.totalReports}
              </div>
              <div className="text-sm text-gray-500">Total Reports</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-2xl font-bold text-cyan-600">
                {formatDuration(analytics.summary.avgResolutionHours)}
              </div>
              <div className="text-sm text-gray-500">Avg Resolution Time</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-2xl font-bold text-gray-900">
                {analytics.computedMetrics?.leadMetrics.avgLeadsPerCase.toFixed(1) || 0}
              </div>
              <div className="text-sm text-gray-500">Avg Leads/Case</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-2xl font-bold text-green-600">
                {analytics.summary.recommendationsImplemented}
              </div>
              <div className="text-sm text-gray-500">Recs Implemented</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-2xl font-bold text-amber-600">
                {analytics.computedMetrics?.leadMetrics.avgFalsePositiveRate.toFixed(1) || 0}%
              </div>
              <div className="text-sm text-gray-500">Avg False Positive</div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Disposition Distribution */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Case Outcomes</h3>
              <div className="space-y-3">
                {analytics.computedMetrics?.dispositionDistribution.map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{formatDisposition(item.disposition)}</span>
                      <span className="font-medium">{item.count} ({item.percentage}%)</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${getDispositionColor(item.disposition)}`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
                {(!analytics.computedMetrics?.dispositionDistribution ||
                  analytics.computedMetrics.dispositionDistribution.length === 0) && (
                  <p className="text-sm text-gray-500 text-center py-4">No data available</p>
                )}
              </div>
            </div>

            {/* Resolution Time Distribution */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Resolution Time Distribution</h3>
              <div className="space-y-3">
                {analytics.computedMetrics?.resolutionTimeDistribution.map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{item.bucket}</span>
                      <span className="font-medium">{item.count} ({item.percentage}%)</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-500 rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
                {(!analytics.computedMetrics?.resolutionTimeDistribution ||
                  analytics.computedMetrics.resolutionTimeDistribution.length === 0) && (
                  <p className="text-sm text-gray-500 text-center py-4">No data available</p>
                )}
              </div>
            </div>
          </div>

          {/* Top Discovery Methods */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Top Discovery Methods</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {analytics.summary.topDiscoveryMethods.map((item, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-xl font-bold text-gray-900">{item.count}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {formatDiscoveryMethod(item.method)}
                  </div>
                </div>
              ))}
              {analytics.summary.topDiscoveryMethods.length === 0 && (
                <div className="col-span-5 text-sm text-gray-500 text-center py-4">
                  No data available
                </div>
              )}
            </div>
          </div>

          {/* Lead Metrics */}
          {analytics.computedMetrics && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Lead Effectiveness Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-cyan-600">
                    {analytics.computedMetrics.leadMetrics.avgLeadsPerCase.toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">Average Leads per Case</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {analytics.computedMetrics.leadMetrics.avgVerificationRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-500 mt-1">Average Verification Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-amber-600">
                    {analytics.computedMetrics.leadMetrics.avgFalsePositiveRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-500 mt-1">Average False Positive Rate</div>
                </div>
              </div>
            </div>
          )}

          {/* Recommendations Summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Recommendations</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {analytics.summary.recommendationsGenerated}
                </div>
                <div className="text-sm text-gray-500">Generated</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-700">
                  {analytics.summary.recommendationsImplemented}
                </div>
                <div className="text-sm text-green-600">Implemented</div>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-lg">
                <div className="text-2xl font-bold text-amber-700">
                  {analytics.summary.recommendationsGenerated -
                    analytics.summary.recommendationsImplemented}
                </div>
                <div className="text-sm text-amber-600">Pending</div>
              </div>
              <div className="text-center p-4 bg-cyan-50 rounded-lg">
                <div className="text-2xl font-bold text-cyan-700">
                  {analytics.summary.recommendationsGenerated > 0
                    ? Math.round(
                        (analytics.summary.recommendationsImplemented /
                          analytics.summary.recommendationsGenerated) *
                          100
                      )
                    : 0}
                  %
                </div>
                <div className="text-sm text-cyan-600">Implementation Rate</div>
              </div>
            </div>
          </div>

          {/* Period Trends (if aggregates available) */}
          {analytics.aggregates && analytics.aggregates.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Trend by {period.charAt(0).toUpperCase() + period.slice(1)}
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Period
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                        Cases
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                        Found Safe
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                        Avg Resolution
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {analytics.aggregates.slice(0, 12).map((agg, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {formatPeriod(agg.periodStart, period)}
                        </td>
                        <td className="px-4 py-2 text-sm text-right text-gray-900">
                          {agg.totalCasesResolved}
                        </td>
                        <td className="px-4 py-2 text-sm text-right text-green-600">
                          {agg.casesFoundAliveSafe}
                        </td>
                        <td className="px-4 py-2 text-sm text-right text-gray-900">
                          {agg.avgResolutionHours
                            ? formatDuration(agg.avgResolutionHours)
                            : "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper functions
function formatDuration(hours: number): string {
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function formatDisposition(disposition: string): string {
  const labels: Record<string, string> = {
    found_alive_safe: "Found Safe",
    found_alive_injured: "Found Injured",
    found_deceased: "Deceased",
    returned_voluntarily: "Returned",
    located_runaway: "Runaway",
    other: "Other",
  };
  return labels[disposition] || disposition;
}

function getDispositionColor(disposition: string): string {
  if (disposition.includes("alive_safe") || disposition.includes("returned")) {
    return "bg-green-500";
  }
  if (disposition.includes("injured")) {
    return "bg-amber-500";
  }
  if (disposition.includes("deceased")) {
    return "bg-gray-500";
  }
  return "bg-gray-400";
}

function formatDiscoveryMethod(method: string): string {
  const labels: Record<string, string> = {
    lead_from_public: "Public Lead",
    lead_from_law_enforcement: "LE Lead",
    tip_anonymous: "Anonymous Tip",
    tip_identified: "Identified Tip",
    social_media_monitoring: "Social Media",
    self_return: "Self Return",
    patrol_encounter: "Patrol",
    other: "Other",
  };
  return labels[method] || method;
}

function formatPeriod(dateStr: string, period: string): string {
  const date = new Date(dateStr);
  switch (period) {
    case "daily":
      return date.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
    case "weekly":
      return `Week of ${date.toLocaleDateString("en-CA", { month: "short", day: "numeric" })}`;
    case "monthly":
      return date.toLocaleDateString("en-CA", { month: "long", year: "numeric" });
    case "yearly":
      return date.getFullYear().toString();
    default:
      return dateStr;
  }
}
