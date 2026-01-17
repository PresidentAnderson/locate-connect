"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib";
import type {
  OperationsDashboardData,
  AgentQueueStatusWithUser,
  IntegrationHealth,
  BottleneckTracking,
  StaffProductivitySummary,
} from "@/types/dashboard.types";

export default function OperationsDashboard() {
  const [data, setData] = useState<OperationsDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchDashboardData() {
    try {
      const response = await fetch("/api/dashboard/operations");
      if (!response.ok) throw new Error("Failed to fetch operations data");
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading operations dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-700">
        <p className="font-medium">Error loading dashboard</p>
        <p className="text-sm">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="mt-2 text-sm underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Operations Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Real-time operational status and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            Auto-refreshes every 30 seconds
          </span>
          <button
            onClick={fetchDashboardData}
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
          >
            Refresh Now
          </button>
        </div>
      </div>

      {data && (
        <>
          {/* Active Workload Overview */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <WorkloadCard
              title="Total Active Cases"
              value={data.activeWorkload.totalActiveCases}
              color="cyan"
            />
            <WorkloadCard
              title="Unassigned Cases"
              value={data.activeWorkload.unassignedCases}
              color={data.activeWorkload.unassignedCases > 0 ? "orange" : "green"}
              warning={data.activeWorkload.unassignedCases > 5}
            />
            <WorkloadCard
              title="Overdue Cases"
              value={data.activeWorkload.overdueCases}
              color={data.activeWorkload.overdueCases > 0 ? "red" : "green"}
              warning={data.activeWorkload.overdueCases > 0}
            />
            <WorkloadCard
              title="Critical (P0)"
              value={data.activeWorkload.byPriority.find(p => p.priority === "P0 Critical")?.count || 0}
              color="red"
            />
            <WorkloadCard
              title="High Priority (P1)"
              value={data.activeWorkload.byPriority.find(p => p.priority === "P1 High")?.count || 0}
              color="orange"
            />
          </div>

          {/* Priority Distribution */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900">Case Priority Distribution</h3>
            <div className="mt-4 flex flex-wrap gap-4">
              {data.activeWorkload.byPriority.map((item) => (
                <div
                  key={item.priority}
                  className={cn(
                    "flex-1 min-w-[150px] rounded-lg p-4",
                    getPriorityColor(item.priority)
                  )}
                >
                  <p className="text-sm font-medium opacity-80">{item.priority}</p>
                  <p className="text-3xl font-bold">{item.count}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Agent Queue Status */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-gray-900">Agent Queue Status</h3>
              <p className="text-sm text-gray-500">Real-time agent availability</p>
              <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
                {data.agentQueue.length > 0 ? (
                  data.agentQueue.map((agent) => (
                    <AgentStatusCard key={agent.id} agent={agent} />
                  ))
                ) : (
                  <div className="text-center text-sm text-gray-500 py-8">
                    No agents online
                  </div>
                )}
              </div>
            </div>

            {/* Integration Health */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-gray-900">Integration Health</h3>
              <p className="text-sm text-gray-500">External service status</p>
              <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
                {data.integrationHealth.map((integration) => (
                  <IntegrationStatusCard key={integration.id} integration={integration} />
                ))}
              </div>
            </div>
          </div>

          {/* SLA Compliance */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900">SLA Compliance</h3>
            <p className="text-sm text-gray-500">Service Level Agreement tracking</p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-600">Total Cases</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.slaCompliance.totalCases}
                </p>
              </div>
              <div className="rounded-lg bg-green-50 p-4">
                <p className="text-sm text-green-600">Compliant</p>
                <p className="text-2xl font-bold text-green-900">
                  {data.slaCompliance.compliantCases}
                </p>
              </div>
              <div className="rounded-lg bg-red-50 p-4">
                <p className="text-sm text-red-600">Non-Compliant</p>
                <p className="text-2xl font-bold text-red-900">
                  {data.slaCompliance.nonCompliantCases}
                </p>
              </div>
              <div className="rounded-lg bg-cyan-50 p-4">
                <p className="text-sm text-cyan-600">Avg Score</p>
                <p className="text-2xl font-bold text-cyan-900">
                  {data.slaCompliance.averageComplianceScore.toFixed(1)}%
                </p>
              </div>
            </div>
            {data.slaCompliance.byPriority.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">By Priority</h4>
                <div className="space-y-2">
                  {data.slaCompliance.byPriority.map((item) => (
                    <div
                      key={item.priority}
                      className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2"
                    >
                      <span className="text-sm text-gray-700">{item.priority.toUpperCase()}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500">
                          {item.compliant}/{item.total} compliant
                        </span>
                        <span className="text-sm font-semibold text-cyan-600">
                          {item.avgScore.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Staff Productivity */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900">Staff Productivity</h3>
            <p className="text-sm text-gray-500">Today's performance metrics</p>
            <div className="mt-4 overflow-x-auto">
              {data.staffProductivity.length > 0 ? (
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="py-3 text-left text-xs font-medium uppercase text-gray-500">Rank</th>
                      <th className="py-3 text-left text-xs font-medium uppercase text-gray-500">Agent</th>
                      <th className="py-3 text-left text-xs font-medium uppercase text-gray-500">Cases Resolved</th>
                      <th className="py-3 text-left text-xs font-medium uppercase text-gray-500">Leads Verified</th>
                      <th className="py-3 text-left text-xs font-medium uppercase text-gray-500">Tips Reviewed</th>
                      <th className="py-3 text-left text-xs font-medium uppercase text-gray-500">Avg Response</th>
                      <th className="py-3 text-left text-xs font-medium uppercase text-gray-500">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.staffProductivity.map((staff) => (
                      <StaffProductivityRow key={staff.id} staff={staff} />
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center text-sm text-gray-500 py-8">
                  No productivity data for today
                </div>
              )}
            </div>
          </div>

          {/* Bottleneck Tracking */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900">Active Bottlenecks</h3>
            <p className="text-sm text-gray-500">Issues requiring attention</p>
            <div className="mt-4 space-y-3">
              {data.bottlenecks.length > 0 ? (
                data.bottlenecks.map((bottleneck) => (
                  <BottleneckCard key={bottleneck.id} bottleneck={bottleneck} />
                ))
              ) : (
                <div className="text-center text-sm text-green-600 py-8 bg-green-50 rounded-lg">
                  No active bottlenecks detected
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function WorkloadCard({
  title,
  value,
  color,
  warning,
}: {
  title: string;
  value: number;
  color: string;
  warning?: boolean;
}) {
  const colorClasses: Record<string, string> = {
    cyan: "bg-cyan-50 text-cyan-700 border-cyan-200",
    green: "bg-green-50 text-green-700 border-green-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    red: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <div
      className={cn(
        "rounded-xl border p-5",
        colorClasses[color],
        warning && "ring-2 ring-offset-2 ring-red-500"
      )}
    >
      <p className="text-sm font-medium opacity-80">{title}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
    </div>
  );
}

function AgentStatusCard({ agent }: { agent: AgentQueueStatusWithUser }) {
  const statusColors: Record<string, string> = {
    available: "bg-green-500",
    busy: "bg-yellow-500",
    away: "bg-orange-500",
    offline: "bg-gray-400",
  };

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
            {agent.user.firstName?.[0]}{agent.user.lastName?.[0]}
          </div>
          <div
            className={cn(
              "absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white",
              statusColors[agent.status]
            )}
          />
        </div>
        <div>
          <p className="font-medium text-gray-900">
            {agent.user.firstName} {agent.user.lastName}
          </p>
          <p className="text-xs text-gray-500">{agent.status}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-gray-900">
          {agent.activeCasesCount}/{agent.maxCapacity}
        </p>
        <p className="text-xs text-gray-500">
          {agent.utilizationPercentage.toFixed(0)}% utilized
        </p>
      </div>
    </div>
  );
}

function IntegrationStatusCard({ integration }: { integration: IntegrationHealth }) {
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    healthy: { bg: "bg-green-100", text: "text-green-700", label: "Healthy" },
    degraded: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Degraded" },
    down: { bg: "bg-red-100", text: "text-red-700", label: "Down" },
    unknown: { bg: "bg-gray-100", text: "text-gray-700", label: "Unknown" },
  };

  const config = statusConfig[integration.status];

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border p-3",
        integration.isCritical && integration.status !== "healthy"
          ? "border-red-300 bg-red-50"
          : "border-gray-200"
      )}
    >
      <div>
        <div className="flex items-center gap-2">
          <p className="font-medium text-gray-900">{integration.displayName}</p>
          {integration.isCritical && (
            <span className="text-xs font-medium text-red-600">CRITICAL</span>
          )}
        </div>
        <p className="text-xs text-gray-500">{integration.description}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-xs text-gray-500">Uptime</p>
          <p className="text-sm font-semibold">{integration.uptimePercentage.toFixed(1)}%</p>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium",
            config.bg,
            config.text
          )}
        >
          {config.label}
        </span>
      </div>
    </div>
  );
}

function StaffProductivityRow({ staff }: { staff: StaffProductivitySummary }) {
  return (
    <tr className="border-b border-gray-100">
      <td className="py-3">
        <span
          className={cn(
            "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
            staff.rank === 1
              ? "bg-yellow-400 text-yellow-900"
              : staff.rank === 2
              ? "bg-gray-300 text-gray-700"
              : staff.rank === 3
              ? "bg-orange-300 text-orange-800"
              : "bg-gray-100 text-gray-600"
          )}
        >
          {staff.rank}
        </span>
      </td>
      <td className="py-3">
        <p className="font-medium text-gray-900">
          {staff.user.firstName} {staff.user.lastName}
        </p>
        <p className="text-xs text-gray-500">{staff.user.role}</p>
      </td>
      <td className="py-3 text-sm text-gray-900">{staff.casesResolved}</td>
      <td className="py-3 text-sm text-gray-900">{staff.leadsVerified}</td>
      <td className="py-3 text-sm text-gray-900">{staff.tipsReviewed}</td>
      <td className="py-3 text-sm text-gray-900">
        {staff.avgResponseTime ? `${staff.avgResponseTime.toFixed(0)} min` : "N/A"}
      </td>
      <td className="py-3">
        <span
          className={cn(
            "rounded-full px-2 py-1 text-xs font-semibold",
            staff.performanceScore >= 80
              ? "bg-green-100 text-green-700"
              : staff.performanceScore >= 60
              ? "bg-yellow-100 text-yellow-700"
              : "bg-red-100 text-red-700"
          )}
        >
          {staff.performanceScore}
        </span>
      </td>
    </tr>
  );
}

function BottleneckCard({ bottleneck }: { bottleneck: BottleneckTracking }) {
  const severityConfig: Record<string, { bg: string; text: string; border: string }> = {
    critical: { bg: "bg-red-50", text: "text-red-700", border: "border-red-300" },
    high: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-300" },
    medium: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-300" },
    low: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-300" },
  };

  const config = severityConfig[bottleneck.severity];

  return (
    <div className={cn("rounded-lg border p-4", config.bg, config.border)}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-bold uppercase",
                config.text,
                config.bg
              )}
            >
              {bottleneck.severity}
            </span>
            <span className="text-sm font-medium text-gray-900">
              {bottleneck.bottleneckType.replace(/_/g, " ")}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-600">{bottleneck.description}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-900">
            {bottleneck.affectedCasesCount} cases
          </p>
          {bottleneck.estimatedDelayHours && (
            <p className="text-xs text-gray-500">
              ~{bottleneck.estimatedDelayHours}h delay
            </p>
          )}
        </div>
      </div>
      {bottleneck.affectedStage && (
        <div className="mt-2">
          <span className="text-xs text-gray-500">Stage:</span>
          <span className="ml-1 text-xs font-medium text-gray-700">
            {bottleneck.affectedStage}
          </span>
        </div>
      )}
    </div>
  );
}

function getPriorityColor(priority: string): string {
  if (priority.includes("P0") || priority.includes("Critical")) {
    return "bg-red-50 text-red-700";
  }
  if (priority.includes("P1") || priority.includes("High")) {
    return "bg-orange-50 text-orange-700";
  }
  if (priority.includes("P2") || priority.includes("Medium")) {
    return "bg-yellow-50 text-yellow-700";
  }
  if (priority.includes("P3") || priority.includes("Low")) {
    return "bg-blue-50 text-blue-700";
  }
  return "bg-gray-50 text-gray-700";
}
