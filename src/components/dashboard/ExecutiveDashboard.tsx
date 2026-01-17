"use client";

import { useState } from "react";
import {
  ExecutiveDashboardData,
  KPICard,
  DateRangeFilter,
  DashboardFilters,
} from "@/types/dashboard.types";

interface ExecutiveDashboardProps {
  data: ExecutiveDashboardData;
  filters: DashboardFilters;
  onFiltersChange: (filters: DashboardFilters) => void;
  isLoading?: boolean;
}

export function ExecutiveDashboard({
  data,
  filters,
  onFiltersChange,
  isLoading = false,
}: ExecutiveDashboardProps) {
  const [datePreset, setDatePreset] = useState<string>(
    filters.dateRange.preset || "last30days"
  );

  const handleDatePresetChange = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();
    let startDate: Date;
    let endDate = new Date();

    switch (preset) {
      case "today":
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case "last7days":
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case "last30days":
        startDate = new Date(now.setDate(now.getDate() - 30));
        break;
      case "thisMonth":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "thisYear":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.setDate(now.getDate() - 30));
    }

    onFiltersChange({
      ...filters,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        preset: preset as DateRangeFilter["preset"],
      },
    });
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Executive Dashboard
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            High-level overview of case metrics and organizational performance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={datePreset}
            onChange={(e) => handleDatePresetChange(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <option value="today">Today</option>
            <option value="last7days">Last 7 Days</option>
            <option value="last30days">Last 30 Days</option>
            <option value="thisMonth">This Month</option>
            <option value="thisYear">This Year</option>
          </select>
          <button className="px-4 py-2 bg-cyan-600 text-white text-sm font-medium rounded-lg hover:bg-cyan-700">
            Export Report
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.kpis.map((kpi) => (
          <KPICardComponent key={kpi.id} kpi={kpi} />
        ))}
      </div>

      {/* Resolution Rates & Time to Resolution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resolution Rates */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Resolution Rates
          </h3>
          <div className="flex items-center justify-center mb-6">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="12"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="12"
                  strokeDasharray={`${data.resolutionRates.overall * 4.4} 440`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-gray-900">
                  {data.resolutionRates.overall}%
                </span>
                <span className="text-sm text-gray-500">Overall</span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {data.resolutionRates.byPriority.map((item) => (
              <div key={item.priority} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{formatPriority(item.priority)}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 rounded-full"
                      style={{ width: `${item.rate}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-12 text-right">
                    {item.rate}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Average Time to Resolution */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Average Time to Resolution
          </h3>
          <div className="flex items-center gap-4 mb-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900">
                {formatHours(data.avgTimeToResolution.current)}
              </div>
              <div className="text-sm text-gray-500">Current Period</div>
            </div>
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm ${
                data.avgTimeToResolution.changePercentage < 0
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {data.avgTimeToResolution.changePercentage < 0 ? (
                <ArrowDownIcon />
              ) : (
                <ArrowUpIcon />
              )}
              {Math.abs(data.avgTimeToResolution.changePercentage)}%
            </div>
          </div>
          <div className="space-y-3">
            {data.avgTimeToResolution.byPriority.map((item) => (
              <div key={item.priority} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{formatPriority(item.priority)}</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatHours(item.avgHours)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Geographic Distribution */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Geographic Distribution
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {data.geographicDistribution.slice(0, 8).map((geo) => (
            <div
              key={geo.id}
              className="p-4 bg-gray-50 rounded-lg"
            >
              <div className="font-medium text-gray-900">{geo.province}</div>
              {geo.city && (
                <div className="text-sm text-gray-500">{geo.city}</div>
              )}
              <div className="mt-2 flex items-center gap-4 text-sm">
                <span className="text-cyan-600">
                  {geo.activeCases} active
                </span>
                <span className="text-green-600">
                  {geo.resolvedCases} resolved
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Resource Utilization & Partner Engagement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resource Utilization */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Resource Utilization
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {data.resourceUtilization.activeAgents}
              </div>
              <div className="text-sm text-gray-500">Active Agents</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-cyan-600">
                {data.resourceUtilization.avgUtilization}%
              </div>
              <div className="text-sm text-gray-500">Avg Utilization</div>
            </div>
          </div>
          <div className="space-y-2">
            {data.resourceUtilization.byStatus.map((item) => (
              <div
                key={item.status}
                className="flex items-center justify-between py-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${getStatusColor(item.status)}`}
                  />
                  <span className="text-sm text-gray-600 capitalize">
                    {item.status}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Partner Engagement */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Partner Engagement
          </h3>
          {data.partnerEngagement.length > 0 ? (
            <div className="space-y-3">
              {data.partnerEngagement.slice(0, 5).map((partner) => (
                <div
                  key={partner.id}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                >
                  <div>
                    <div className="font-medium text-gray-900">
                      {partner.organization.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {partner.organization.type}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {partner.casesJointlyResolved} resolved
                    </div>
                    <div className="text-xs text-gray-500">
                      {partner.leadsShared} leads shared
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">
              No partner engagement data available
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function KPICardComponent({ kpi }: { kpi: KPICard }) {
  const colorClasses = {
    cyan: "bg-cyan-50 text-cyan-700",
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
    orange: "bg-orange-50 text-orange-700",
    yellow: "bg-yellow-50 text-yellow-700",
    gray: "bg-gray-50 text-gray-700",
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600">{kpi.title}</span>
        {kpi.changePercentage !== undefined && (
          <span
            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
              kpi.changeDirection === "up"
                ? "bg-green-100 text-green-700"
                : kpi.changeDirection === "down"
                ? "bg-red-100 text-red-700"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {kpi.changeDirection === "up" ? <ArrowUpIcon /> : <ArrowDownIcon />}
            {Math.abs(kpi.changePercentage)}%
          </span>
        )}
      </div>
      <div className="text-3xl font-bold text-gray-900">
        {formatKPIValue(kpi.value, kpi.format)}
      </div>
      {kpi.description && (
        <p className="text-xs text-gray-500 mt-1">{kpi.description}</p>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-48" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-200 rounded-lg h-32" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-200 rounded-lg h-64" />
        <div className="bg-gray-200 rounded-lg h-64" />
      </div>
    </div>
  );
}

function formatPriority(priority: string): string {
  const map: Record<string, string> = {
    p0_critical: "P0 Critical",
    p1_high: "P1 High",
    p2_medium: "P2 Medium",
    p3_low: "P3 Low",
    p4_routine: "P4 Routine",
  };
  return map[priority] || priority;
}

function formatHours(hours: number): string {
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

function formatKPIValue(value: number | string, format?: string): string {
  if (typeof value === "string") return value;
  switch (format) {
    case "percentage":
      return `${value}%`;
    case "duration":
      return formatHours(value);
    default:
      return value.toLocaleString();
  }
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    available: "bg-green-500",
    busy: "bg-yellow-500",
    away: "bg-orange-500",
    offline: "bg-gray-400",
  };
  return colors[status] || "bg-gray-400";
}

function ArrowUpIcon() {
  return (
    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}

export default ExecutiveDashboard;
