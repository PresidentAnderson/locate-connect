"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib";
import type {
  ExecutiveDashboardData,
  KPICard,
  DateRangeFilter,
} from "@/types/dashboard.types";

export default function ExecutiveDashboard() {
  const [data, setData] = useState<ExecutiveDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRangeFilter>({
    startDate: getDefaultStartDate(),
    endDate: new Date().toISOString().split("T")[0],
    preset: "last30days",
  });

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
      const response = await fetch(`/api/dashboard/executive?${params}`);
      if (!response.ok) throw new Error("Failed to fetch dashboard data");
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  function handleDatePresetChange(preset: string) {
    const now = new Date();
    let startDate = new Date();

    switch (preset) {
      case "today":
        startDate = now;
        break;
      case "last7days":
        startDate.setDate(now.getDate() - 7);
        break;
      case "last30days":
        startDate.setDate(now.getDate() - 30);
        break;
      case "thisMonth":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "thisQuarter":
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case "thisYear":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    setDateRange({
      startDate: startDate.toISOString().split("T")[0],
      endDate: now.toISOString().split("T")[0],
      preset: preset as any,
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-700">
        <p className="font-medium">Error loading dashboard</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Executive Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            High-level overview of case metrics and organizational performance
          </p>
        </div>
        <div className="flex items-center gap-4">
          <select
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            value={dateRange.preset}
            onChange={(e) => handleDatePresetChange(e.target.value)}
          >
            <option value="today">Today</option>
            <option value="last7days">Last 7 Days</option>
            <option value="last30days">Last 30 Days</option>
            <option value="thisMonth">This Month</option>
            <option value="thisQuarter">This Quarter</option>
            <option value="thisYear">This Year</option>
          </select>
          <button
            onClick={fetchDashboardData}
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {data.kpis.map((kpi) => (
              <KPICardComponent key={kpi.id} kpi={kpi} />
            ))}
          </div>

          {/* Resolution & Priority Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Resolution Rate Chart */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-gray-900">Case Resolution Rates</h3>
              <p className="text-sm text-gray-500">By priority level</p>
              <div className="mt-4 space-y-3">
                {data.resolutionRates.byPriority.map((item) => (
                  <div key={item.priority} className="flex items-center gap-4">
                    <span className="w-16 text-sm font-medium text-gray-600">{item.priority}</span>
                    <div className="flex-1">
                      <div className="h-4 w-full rounded-full bg-gray-200">
                        <div
                          className="h-4 rounded-full bg-cyan-600"
                          style={{ width: `${Math.min(item.rate, 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-16 text-right text-sm font-medium text-gray-900">
                      {item.rate.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-6 border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Overall Resolution Rate</span>
                  <span className="text-2xl font-bold text-cyan-600">
                    {data.resolutionRates.overall.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Disposition Distribution */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-gray-900">Case Dispositions</h3>
              <p className="text-sm text-gray-500">Resolved case outcomes</p>
              <div className="mt-4 space-y-2">
                {data.resolutionRates.byDisposition.length > 0 ? (
                  data.resolutionRates.byDisposition.map((item) => (
                    <div
                      key={item.disposition}
                      className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2"
                    >
                      <span className="text-sm text-gray-700">
                        {formatDisposition(item.disposition)}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-sm text-gray-500 py-8">
                    No disposition data available
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Resource Utilization & Partner Engagement */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Resource Utilization */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-gray-900">Resource Utilization</h3>
              <p className="text-sm text-gray-500">Agent status and capacity</p>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-cyan-50 p-4">
                  <p className="text-sm text-cyan-600">Total Agents</p>
                  <p className="text-2xl font-bold text-cyan-900">
                    {data.resourceUtilization.totalAgents}
                  </p>
                </div>
                <div className="rounded-lg bg-green-50 p-4">
                  <p className="text-sm text-green-600">Active Agents</p>
                  <p className="text-2xl font-bold text-green-900">
                    {data.resourceUtilization.activeAgents}
                  </p>
                </div>
                <div className="col-span-2 rounded-lg bg-gray-50 p-4">
                  <p className="text-sm text-gray-600">Average Utilization</p>
                  <div className="mt-2 flex items-center gap-4">
                    <div className="flex-1">
                      <div className="h-4 w-full rounded-full bg-gray-200">
                        <div
                          className={cn(
                            "h-4 rounded-full",
                            data.resourceUtilization.avgUtilization >= 80
                              ? "bg-red-500"
                              : data.resourceUtilization.avgUtilization >= 60
                              ? "bg-yellow-500"
                              : "bg-green-500"
                          )}
                          style={{
                            width: `${Math.min(data.resourceUtilization.avgUtilization, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-lg font-bold text-gray-900">
                      {data.resourceUtilization.avgUtilization.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {data.resourceUtilization.byStatus.map((item) => (
                  <span
                    key={item.status}
                    className={cn(
                      "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
                      item.status === "available"
                        ? "bg-green-100 text-green-700"
                        : item.status === "busy"
                        ? "bg-yellow-100 text-yellow-700"
                        : item.status === "away"
                        ? "bg-orange-100 text-orange-700"
                        : "bg-gray-100 text-gray-700"
                    )}
                  >
                    {item.status}: {item.count}
                  </span>
                ))}
              </div>
            </div>

            {/* Partner Engagement */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-gray-900">Partner Engagement</h3>
              <p className="text-sm text-gray-500">Collaboration with partner organizations</p>
              <div className="mt-4 space-y-3">
                {data.partnerEngagement.length > 0 ? (
                  data.partnerEngagement.slice(0, 5).map((partner) => (
                    <div
                      key={partner.id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{partner.organization.name}</p>
                        <p className="text-xs text-gray-500">{partner.organization.type}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-cyan-600">
                          {partner.collaborationScore?.toFixed(0) || "N/A"}
                        </p>
                        <p className="text-xs text-gray-500">Collab Score</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-sm text-gray-500 py-8">
                    No partner engagement data
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Geographic Distribution */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900">Geographic Distribution</h3>
            <p className="text-sm text-gray-500">Case distribution by region</p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {data.geographicDistribution.length > 0 ? (
                data.geographicDistribution.slice(0, 8).map((region) => (
                  <div
                    key={region.id}
                    className="rounded-lg border border-gray-200 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {region.city || region.province}
                        </p>
                        {region.city && (
                          <p className="text-xs text-gray-500">{region.province}</p>
                        )}
                      </div>
                      <div className="h-10 w-10 rounded-full bg-cyan-100 flex items-center justify-center">
                        <span className="text-sm font-bold text-cyan-700">
                          {region.totalCases}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">Active:</span>
                        <span className="ml-1 font-medium text-orange-600">
                          {region.activeCases}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Resolved:</span>
                        <span className="ml-1 font-medium text-green-600">
                          {region.resolvedCases}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-4 text-center text-sm text-gray-500 py-8">
                  No geographic data available for the selected period
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function KPICardComponent({ kpi }: { kpi: KPICard }) {
  const colorClasses = {
    cyan: "bg-cyan-50 text-cyan-700 border-cyan-200",
    green: "bg-green-50 text-green-700 border-green-200",
    red: "bg-red-50 text-red-700 border-red-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
    gray: "bg-gray-50 text-gray-700 border-gray-200",
  };

  return (
    <div
      className={cn(
        "rounded-xl border p-5 transition-shadow hover:shadow-md",
        colorClasses[kpi.color || "gray"]
      )}
    >
      <p className="text-sm font-medium opacity-80">{kpi.title}</p>
      <p className="mt-1 text-3xl font-bold">{kpi.value}</p>
      {kpi.description && (
        <p className="mt-1 text-xs opacity-70">{kpi.description}</p>
      )}
      {kpi.changePercentage !== undefined && (
        <div className="mt-2 flex items-center text-xs">
          <span
            className={cn(
              kpi.changeDirection === "up"
                ? "text-green-600"
                : kpi.changeDirection === "down"
                ? "text-red-600"
                : "text-gray-500"
            )}
          >
            {kpi.changeDirection === "up" ? "+" : ""}
            {kpi.changePercentage.toFixed(1)}%
          </span>
          <span className="ml-1 opacity-70">vs previous period</span>
        </div>
      )}
    </div>
  );
}

function formatDisposition(disposition: string): string {
  const labels: Record<string, string> = {
    found_alive_safe: "Found Alive & Safe",
    found_alive_injured: "Found Alive (Injured)",
    found_deceased: "Found Deceased",
    returned_voluntarily: "Returned Voluntarily",
    located_runaway: "Located (Runaway)",
    located_custody: "Located (In Custody)",
    located_medical_facility: "Located (Medical Facility)",
    located_shelter: "Located (Shelter)",
    located_incarcerated: "Located (Incarcerated)",
    false_report: "False Report",
    other: "Other",
  };
  return labels[disposition] || disposition.replace(/_/g, " ");
}

function getDefaultStartDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().split("T")[0];
}
