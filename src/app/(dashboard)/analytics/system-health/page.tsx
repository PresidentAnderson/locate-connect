"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { SystemHealth, AgentMetrics } from "@/types/analytics.types";

interface SystemHealthData {
  systemHealth: SystemHealth;
  agentMetrics: AgentMetrics[];
  timestamp: string;
}

export default function SystemHealthPage() {
  const [data, setData] = useState<SystemHealthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch("/api/analytics/system-health");

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch system health");
      }

      const result: SystemHealthData = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      console.error("Error fetching system health:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchData();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  if (error && !data) {
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
          <Link
            href="/analytics"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-2"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            System Health & Monitoring
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Real-time status of system components and background agents
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Auto-refresh toggle */}
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
            />
            Auto-refresh (30s)
          </label>

          {/* Refresh button */}
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {isLoading && !data ? (
        <LoadingState />
      ) : data ? (
        <>
          {/* Overall Status Banner */}
          <div
            className={`rounded-lg p-4 flex items-center justify-between ${getOverallStatusClass(
              data.systemHealth.overall
            )}`}
          >
            <div className="flex items-center gap-3">
              <StatusIcon status={data.systemHealth.overall} />
              <div>
                <h2 className="font-semibold">
                  System Status: {data.systemHealth.overall.toUpperCase()}
                </h2>
                <p className="text-sm opacity-80">
                  Last checked: {formatTime(data.timestamp)}
                </p>
              </div>
            </div>
            {data.systemHealth.alerts.length > 0 && (
              <span className="bg-white bg-opacity-30 px-3 py-1 rounded-full text-sm font-medium">
                {data.systemHealth.alerts.length} active alert
                {data.systemHealth.alerts.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Active Alerts */}
          {data.systemHealth.alerts.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Active Alerts
              </h3>
              <div className="space-y-3">
                {data.systemHealth.alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg flex items-start justify-between ${getAlertClass(
                      alert.severity
                    )}`}
                  >
                    <div className="flex items-start gap-3">
                      <AlertIcon severity={alert.severity} />
                      <div>
                        <p className="font-medium">{alert.message}</p>
                        <p className="text-sm opacity-80 mt-1">
                          Component: {alert.component} • {formatTimeAgo(alert.timestamp)}
                        </p>
                      </div>
                    </div>
                    <button className="text-sm underline opacity-70 hover:opacity-100">
                      Acknowledge
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* System Components */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              System Components
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {data.systemHealth.components.map((component) => (
                <div
                  key={component.name}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-gray-900">
                      {component.name}
                    </span>
                    <span
                      className={`w-3 h-3 rounded-full ${getStatusDotClass(
                        component.status
                      )}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Status</span>
                      <span
                        className={`font-medium ${getStatusTextClass(
                          component.status
                        )}`}
                      >
                        {component.status}
                      </span>
                    </div>
                    {component.latency !== undefined && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Latency</span>
                        <span
                          className={`font-medium ${
                            component.latency > 500
                              ? "text-yellow-600"
                              : "text-gray-900"
                          }`}
                        >
                          {component.latency}ms
                        </span>
                      </div>
                    )}
                    {component.uptime !== undefined && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Uptime</span>
                        <span className="font-medium text-gray-900">
                          {component.uptime}%
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Last Check</span>
                      <span className="text-gray-600">
                        {formatTimeAgo(component.lastCheck)}
                      </span>
                    </div>
                  </div>
                  {component.details && (
                    <p className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded">
                      {component.details}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Agent Performance */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              Background Agent Performance
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Agent
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Runs Today
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      This Week
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Success Rate
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Avg Duration
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Items Processed
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Leads Generated
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Last Run
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.agentMetrics.map((agent) => (
                    <tr key={agent.agentId}>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                        {agent.agentType}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getAgentStatusClass(
                            agent.status
                          )}`}
                        >
                          {agent.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {agent.runsToday}
                        {agent.errorsToday > 0 && (
                          <span className="text-red-500 ml-1">
                            ({agent.errorsToday} errors)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {agent.runsThisWeek}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <span
                          className={
                            agent.successRate >= 95
                              ? "text-green-600"
                              : agent.successRate >= 80
                              ? "text-yellow-600"
                              : "text-red-600"
                          }
                        >
                          {agent.successRate}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {formatDuration(agent.avgDuration)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {agent.itemsProcessed.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {agent.leadsGenerated.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-500">
                        {formatTimeAgo(agent.lastRunAt)}
                      </td>
                    </tr>
                  ))}
                  {data.agentMetrics.length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-8 text-center text-gray-500"
                      >
                        No agent data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/api/cron/priority-escalation"
              className="bg-white rounded-lg border border-gray-200 p-4 hover:border-cyan-300 transition-colors"
            >
              <h4 className="font-medium text-gray-900 mb-1">
                Priority Escalation
              </h4>
              <p className="text-sm text-gray-500">
                Runs every 15 minutes to check case priorities
              </p>
            </Link>
            <Link
              href="/api/cron/news-crawler"
              className="bg-white rounded-lg border border-gray-200 p-4 hover:border-cyan-300 transition-colors"
            >
              <h4 className="font-medium text-gray-900 mb-1">News Crawler</h4>
              <p className="text-sm text-gray-500">
                Runs hourly to scan news for case mentions
              </p>
            </Link>
            <Link
              href="/api/cron/stale-case-check"
              className="bg-white rounded-lg border border-gray-200 p-4 hover:border-cyan-300 transition-colors"
            >
              <h4 className="font-medium text-gray-900 mb-1">
                Stale Case Check
              </h4>
              <p className="text-sm text-gray-500">
                Runs every 6 hours to identify inactive cases
              </p>
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}

// =============================================================================
// Components
// =============================================================================

function StatusIcon({ status }: { status: string }) {
  if (status === "healthy") {
    return (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    );
  }
  if (status === "degraded") {
    return (
      <svg
        className="w-8 h-8"
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
    );
  }
  return (
    <svg
      className="w-8 h-8"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function AlertIcon({ severity }: { severity: string }) {
  const colorClass =
    severity === "critical" || severity === "error"
      ? "text-red-600"
      : severity === "warning"
      ? "text-yellow-600"
      : "text-blue-600";

  return (
    <svg
      className={`w-5 h-5 ${colorClass}`}
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
  );
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="h-20 bg-gray-200 rounded-lg animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-lg border border-gray-200 p-4 h-40 animate-pulse"
          >
            <div className="h-4 bg-gray-200 rounded w-24 mb-4" />
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded" />
              <div className="h-3 bg-gray-200 rounded" />
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
          Unable to Load System Health
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
// Helper Functions
// =============================================================================

function getOverallStatusClass(status: string): string {
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

function getAlertClass(severity: string): string {
  switch (severity) {
    case "critical":
      return "bg-red-50 text-red-800";
    case "error":
      return "bg-orange-50 text-orange-800";
    case "warning":
      return "bg-yellow-50 text-yellow-800";
    default:
      return "bg-blue-50 text-blue-800";
  }
}

function getStatusDotClass(status: string): string {
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

function getStatusTextClass(status: string): string {
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

function getAgentStatusClass(status: string): string {
  switch (status) {
    case "healthy":
      return "bg-green-100 text-green-800";
    case "degraded":
      return "bg-yellow-100 text-yellow-800";
    case "error":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleString("en-CA", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);

  if (diffSecs < 60) return `${diffSecs}s ago`;
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}
