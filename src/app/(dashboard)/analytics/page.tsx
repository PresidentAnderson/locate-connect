"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type {
  AnalyticsExecutiveDashboardData,
  TimeRange,
  KPI,
  TrendDirection,
} from "@/types/analytics.types";

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "24h", label: "Last 24 Hours" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
  { value: "1y", label: "Last Year" },
];

export default function AnalyticsDashboardPage() {
  const [data, setData] = useState<AnalyticsExecutiveDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/analytics?timeRange=${timeRange}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch analytics");
      }

      const result: AnalyticsExecutiveDashboardData = await response.json();
      setData(result);
    } catch (err) {
      console.error("Error fetching analytics:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (error) {
    return (
      <div className="p-6">
        <ErrorState error={error} onRetry={fetchData} />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Executive Dashboard
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Real-time overview of case management and system performance
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Time range selector */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-cyan-500 focus:border-cyan-500"
          >
            {TIME_RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Export button */}
          <button
            onClick={() => alert("Export functionality coming soon")}
            className="px-4 py-2 bg-cyan-600 text-white text-sm font-medium rounded-lg hover:bg-cyan-700"
          >
            Export Report
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : data ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard
              kpi={data.kpis.totalActiveCases}
              icon={<CasesIcon />}
              color="cyan"
            />
            <KPICard
              kpi={data.kpis.casesResolvedThisPeriod}
              icon={<CheckIcon />}
              color="green"
            />
            <KPICard
              kpi={data.kpis.averageResolutionTime}
              icon={<ClockIcon />}
              color="blue"
            />
            <KPICard
              kpi={data.kpis.criticalCasesActive}
              icon={<AlertIcon />}
              color="red"
            />
          </div>

          {/* Secondary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard
              kpi={data.kpis.tipsReceived}
              icon={<TipIcon />}
              color="purple"
              small
            />
            <KPICard
              kpi={data.kpis.leadsGenerated}
              icon={<LeadIcon />}
              color="indigo"
              small
            />
            <KPICard
              kpi={data.kpis.resolutionRate}
              icon={<ChartIcon />}
              color="emerald"
              small
            />
            <KPICard
              kpi={data.kpis.amberAlertsActive}
              icon={<AmberIcon />}
              color="amber"
              small
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Case Status Distribution */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Case Status Distribution
              </h3>
              <div className="space-y-3">
                {data.caseStatusDistribution.map((item) => (
                  <div key={item.status}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 capitalize">
                        {item.status.replace(/_/g, " ")}
                      </span>
                      <span className="font-medium">
                        {item.count} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
                {data.caseStatusDistribution.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No data available
                  </p>
                )}
              </div>
            </div>

            {/* Priority Breakdown */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Active Cases by Priority
              </h3>
              <div className="space-y-3">
                {data.priorityBreakdown.map((item) => (
                  <div key={item.priority}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{item.label}</span>
                      <span className="font-medium">
                        {item.count} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
                {data.priorityBreakdown.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No active cases
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Resolution Trends & Geographic Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Resolution Trends */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Resolution Trends
              </h3>
              {data.resolutionTrends.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Period
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                          Opened
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                          Resolved
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                          Rate
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {data.resolutionTrends.slice(-8).map((trend) => (
                        <tr key={trend.period}>
                          <td className="px-3 py-2 text-sm text-gray-900">
                            {formatDate(trend.period)}
                          </td>
                          <td className="px-3 py-2 text-sm text-right text-gray-900">
                            {trend.casesOpened}
                          </td>
                          <td className="px-3 py-2 text-sm text-right text-green-600">
                            {trend.casesResolved}
                          </td>
                          <td className="px-3 py-2 text-sm text-right text-gray-900">
                            {trend.resolutionRate}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">
                  No trend data available
                </p>
              )}
            </div>

            {/* Geographic Distribution */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">
                  Cases by Region
                </h3>
                <Link
                  href="/analytics/resolution-heatmap"
                  className="text-sm text-cyan-600 hover:text-cyan-700"
                >
                  View Heat Map
                </Link>
              </div>
              {data.geographicDistribution.length > 0 ? (
                <div className="space-y-3">
                  {data.geographicDistribution.slice(0, 6).map((region) => (
                    <div
                      key={region.region}
                      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded text-xs font-semibold text-gray-600">
                          {region.code}
                        </span>
                        <span className="text-sm text-gray-900">
                          {region.region}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {region.activeCases} active
                        </div>
                        <div className="text-xs text-gray-500">
                          {region.resolvedCases} resolved
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">
                  No geographic data available
                </p>
              )}
            </div>
          </div>

          {/* Recent Activity & System Health */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Recent Activity
              </h3>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {data.recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0"
                  >
                    <div
                      className={`w-2 h-2 rounded-full mt-2 ${getActivityColor(
                        activity.type
                      )}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.title}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatTimeAgo(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
                {data.recentActivity.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No recent activity
                  </p>
                )}
              </div>
            </div>

            {/* System Health */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">System Health</h3>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${getHealthBadgeClass(
                    data.systemHealth.overall
                  )}`}
                >
                  {data.systemHealth.overall.toUpperCase()}
                </span>
              </div>
              <div className="space-y-3">
                {data.systemHealth.components.map((component) => (
                  <div
                    key={component.name}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-2 h-2 rounded-full ${getStatusColor(
                          component.status
                        )}`}
                      />
                      <span className="text-sm text-gray-900">
                        {component.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-xs font-medium ${getStatusTextColor(
                          component.status
                        )}`}
                      >
                        {component.status}
                      </span>
                      {component.latency && (
                        <span className="text-xs text-gray-400 ml-2">
                          {component.latency}ms
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Agent Metrics Summary */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Agent Performance
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {data.agentMetrics.slice(0, 4).map((agent) => (
                    <div
                      key={agent.agentId}
                      className="bg-gray-50 rounded-lg p-3"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            agent.status === "healthy"
                              ? "bg-green-500"
                              : agent.status === "degraded"
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          }`}
                        />
                        <span className="text-xs font-medium text-gray-700 truncate">
                          {agent.agentType}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {agent.runsToday} runs today • {agent.successRate}%
                        success
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alerts */}
              {data.systemHealth.alerts.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Active Alerts
                  </h4>
                  {data.systemHealth.alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-2 rounded-lg text-xs mb-2 ${getAlertClass(
                        alert.severity
                      )}`}
                    >
                      <span className="font-medium">{alert.component}:</span>{" "}
                      {alert.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-500">
            Last updated: {formatDate(data.generatedAt, true)}
          </div>
        </>
      ) : null}
    </div>
  );
}

// =============================================================================
// Components
// =============================================================================

function KPICard({
  kpi,
  icon,
  color,
  small = false,
}: {
  kpi: KPI;
  icon: React.ReactNode;
  color: string;
  small?: boolean;
}) {
  const colorClasses: Record<string, string> = {
    cyan: "bg-cyan-50 text-cyan-600",
    green: "bg-green-50 text-green-600",
    blue: "bg-blue-50 text-blue-600",
    red: "bg-red-50 text-red-600",
    purple: "bg-purple-50 text-purple-600",
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
  };

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 ${
        small ? "p-4" : "p-6"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 mb-1">{kpi.label}</p>
          <p
            className={`font-bold text-gray-900 ${
              small ? "text-xl" : "text-3xl"
            }`}
          >
            {formatKPIValue(kpi.value, kpi.unit)}
          </p>
          {kpi.change !== undefined && (
            <div className="flex items-center gap-1 mt-1">
              <TrendIndicator trend={kpi.trend} />
              <span
                className={`text-xs ${
                  kpi.change > 0
                    ? "text-green-600"
                    : kpi.change < 0
                    ? "text-red-600"
                    : "text-gray-500"
                }`}
              >
                {kpi.change > 0 ? "+" : ""}
                {kpi.change}
                {kpi.changePercent !== undefined && ` (${kpi.changePercent}%)`}
              </span>
            </div>
          )}
        </div>
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            colorClasses[color] || colorClasses.cyan
          }`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function TrendIndicator({ trend }: { trend?: TrendDirection }) {
  if (!trend || trend === "stable") {
    return <span className="text-gray-400">—</span>;
  }
  if (trend === "up") {
    return (
      <svg
        className="w-3 h-3 text-green-500"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  return (
    <svg
      className="w-3 h-3 text-red-500"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path
        fillRule="evenodd"
        d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse"
          >
            <div className="h-4 bg-gray-200 rounded w-20 mb-2" />
            <div className="h-8 bg-gray-200 rounded w-16" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-lg border border-gray-200 p-6 h-64 animate-pulse"
          >
            <div className="h-4 bg-gray-200 rounded w-40 mb-4" />
            <div className="space-y-3">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="h-4 bg-gray-200 rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorState({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Unable to Load Dashboard
        </h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-cyan-600 text-white font-medium rounded-lg hover:bg-cyan-700"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Icons
// =============================================================================

function CasesIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function TipIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}

function LeadIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function AmberIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatKPIValue(value: number, unit?: string): string {
  if (unit === "%") return `${value}%`;
  if (unit === "hours") {
    if (value >= 24) return `${Math.round(value / 24)}d`;
    return `${value}h`;
  }
  return value.toLocaleString();
}

function formatDate(dateString: string, includeTime = false): string {
  const date = new Date(dateString);
  if (includeTime) {
    return date.toLocaleString("en-CA", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return date.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
  });
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function getActivityColor(type: string): string {
  const colors: Record<string, string> = {
    case_created: "bg-cyan-500",
    case_resolved: "bg-green-500",
    tip_received: "bg-purple-500",
    lead_verified: "bg-indigo-500",
    priority_escalated: "bg-orange-500",
    amber_alert: "bg-amber-500",
    agent_run: "bg-gray-400",
  };
  return colors[type] || "bg-gray-400";
}

function getHealthBadgeClass(status: string): string {
  switch (status) {
    case "healthy":
      return "bg-green-100 text-green-800";
    case "degraded":
      return "bg-yellow-100 text-yellow-800";
    case "critical":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case "operational":
      return "bg-green-500";
    case "degraded":
      return "bg-yellow-500";
    case "down":
      return "bg-red-500";
    default:
      return "bg-gray-400";
  }
}

function getStatusTextColor(status: string): string {
  switch (status) {
    case "operational":
      return "text-green-600";
    case "degraded":
      return "text-yellow-600";
    case "down":
      return "text-red-600";
    default:
      return "text-gray-600";
  }
}

function getAlertClass(severity: string): string {
  switch (severity) {
    case "critical":
      return "bg-red-50 text-red-700";
    case "error":
      return "bg-orange-50 text-orange-700";
    case "warning":
      return "bg-yellow-50 text-yellow-700";
    default:
      return "bg-blue-50 text-blue-700";
  }
}
