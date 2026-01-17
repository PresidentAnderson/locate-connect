"use client";

import { useState, useEffect, ReactNode } from "react";
import type {
  SystemHealthDashboard as DashboardData,
  ServiceHealth,
  Alert,
  Incident,
  AgentHealth,
  QueueMetrics,
  ServiceStatus,
  AlertSeverity,
  SERVICE_STATUS_COLORS,
  ALERT_SEVERITY_COLORS,
} from "@/types/monitoring.types";

interface SystemHealthDashboardProps {
  initialData?: DashboardData;
  refreshInterval?: number;
}

export function SystemHealthDashboard({
  initialData,
  refreshInterval = 30000,
}: SystemHealthDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/monitoring/health");
        if (response.ok) {
          const dashboardData = await response.json();
          setData(dashboardData);
          setLastUpdated(new Date());
        }
      } catch (error) {
        console.error("Failed to fetch system health:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!initialData) {
      fetchData();
    }

    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [initialData, refreshInterval]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-gray-500">
        Unable to load system health data
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Health</h1>
          <p className="text-sm text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <OverallStatusBadge status={data.overallStatus} />
      </div>

      {/* Active Alerts */}
      {data.activeAlerts.length > 0 && (
        <AlertsSection alerts={data.activeAlerts} />
      )}

      {/* Active Incidents */}
      {data.activeIncidents.length > 0 && (
        <IncidentsSection incidents={data.activeIncidents} />
      )}

      {/* Uptime Summary */}
      <UptimeSummary uptime={data.uptimeSummary} />

      {/* Services Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ServicesSection services={data.services} />
        <AgentsSection agents={data.agentHealth} />
      </div>

      {/* Database & Queues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DatabaseMetricsSection metrics={data.databaseMetrics} />
        <QueuesSection queues={data.queueMetrics} />
      </div>
    </div>
  );
}

function OverallStatusBadge({ status }: { status: ServiceStatus }) {
  const colors: Record<ServiceStatus, string> = {
    healthy: "bg-green-100 text-green-800 border-green-200",
    degraded: "bg-yellow-100 text-yellow-800 border-yellow-200",
    unhealthy: "bg-red-100 text-red-800 border-red-200",
    unknown: "bg-gray-100 text-gray-800 border-gray-200",
  };

  const icons: Record<ServiceStatus, ReactNode> = {
    healthy: <CheckCircleIcon className="h-5 w-5" />,
    degraded: <ExclamationIcon className="h-5 w-5" />,
    unhealthy: <XCircleIcon className="h-5 w-5" />,
    unknown: <QuestionIcon className="h-5 w-5" />,
  };

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${colors[status]}`}>
      {icons[status]}
      <span className="font-medium capitalize">{status}</span>
    </div>
  );
}

function UptimeSummary({ uptime }: { uptime: DashboardData["uptimeSummary"] }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <UptimeCard label="Last 24 Hours" value={uptime.last24Hours} />
      <UptimeCard label="Last 7 Days" value={uptime.last7Days} />
      <UptimeCard label="Last 30 Days" value={uptime.last30Days} />
    </div>
  );
}

function UptimeCard({ label, value }: { label: string; value: number }) {
  const color = value >= 99.9 ? "text-green-600" : value >= 99 ? "text-yellow-600" : "text-red-600";

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value.toFixed(2)}%</p>
    </div>
  );
}

function AlertsSection({ alerts }: { alerts: Alert[] }) {
  const severityOrder: AlertSeverity[] = ["emergency", "critical", "warning", "info"];
  const sortedAlerts = [...alerts].sort(
    (a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity)
  );

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <h2 className="text-lg font-semibold text-red-800 mb-3 flex items-center gap-2">
        <BellIcon className="h-5 w-5" />
        Active Alerts ({alerts.length})
      </h2>
      <div className="space-y-2">
        {sortedAlerts.slice(0, 5).map((alert) => (
          <div
            key={alert.id}
            className="flex items-center justify-between bg-white rounded-lg p-3 border border-red-100"
          >
            <div className="flex items-center gap-3">
              <SeverityBadge severity={alert.severity} />
              <div>
                <p className="font-medium text-gray-900">{alert.ruleName}</p>
                <p className="text-sm text-gray-500">{alert.message}</p>
              </div>
            </div>
            <span className="text-xs text-gray-400">
              {new Date(alert.firedAt).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  const colors: Record<AlertSeverity, string> = {
    info: "bg-blue-100 text-blue-800",
    warning: "bg-yellow-100 text-yellow-800",
    critical: "bg-orange-100 text-orange-800",
    emergency: "bg-red-100 text-red-800",
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${colors[severity]}`}>
      {severity}
    </span>
  );
}

function IncidentsSection({ incidents }: { incidents: Incident[] }) {
  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
      <h2 className="text-lg font-semibold text-orange-800 mb-3 flex items-center gap-2">
        <FireIcon className="h-5 w-5" />
        Active Incidents ({incidents.length})
      </h2>
      <div className="space-y-2">
        {incidents.map((incident) => (
          <div
            key={incident.id}
            className="flex items-center justify-between bg-white rounded-lg p-3 border border-orange-100"
          >
            <div>
              <p className="font-medium text-gray-900">{incident.title}</p>
              <p className="text-sm text-gray-500">
                Status: {incident.status} | Affected: {incident.affectedServices.join(", ")}
              </p>
            </div>
            <SeverityBadge severity={incident.severity} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ServicesSection({ services }: { services: ServiceHealth[] }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Services</h2>
      <div className="space-y-2">
        {services.map((service) => (
          <div
            key={service.id}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <StatusDot status={service.status} />
              <div>
                <p className="font-medium text-gray-900">{service.displayName}</p>
                <p className="text-xs text-gray-500">
                  {service.avgResponseTimeMs ? `${service.avgResponseTimeMs}ms` : "N/A"}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {service.uptimePercentage.toFixed(2)}%
              </p>
              <p className="text-xs text-gray-500">uptime</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: ServiceStatus }) {
  const colors: Record<ServiceStatus, string> = {
    healthy: "bg-green-500",
    degraded: "bg-yellow-500",
    unhealthy: "bg-red-500",
    unknown: "bg-gray-400",
  };

  return (
    <div className={`h-3 w-3 rounded-full ${colors[status]}`}>
      {status === "healthy" && (
        <span className="absolute inline-flex h-3 w-3 rounded-full bg-green-400 opacity-75 animate-ping" />
      )}
    </div>
  );
}

function AgentsSection({ agents }: { agents: AgentHealth[] }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Agents & Crawlers</h2>
      <div className="space-y-2">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <StatusDot status={agent.status} />
              <div>
                <p className="font-medium text-gray-900">{agent.agentType}</p>
                <p className="text-xs text-gray-500">
                  {agent.currentTask || "Idle"}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-900">
                {agent.tasksCompleted} completed
              </p>
              <p className="text-xs text-gray-500">
                CPU: {agent.cpuUsagePercent}% | RAM: {agent.memoryUsageMb}MB
              </p>
            </div>
          </div>
        ))}
        {agents.length === 0 && (
          <p className="text-gray-500 text-center py-4">No agents running</p>
        )}
      </div>
    </div>
  );
}

function DatabaseMetricsSection({ metrics }: { metrics: DashboardData["databaseMetrics"] }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Database</h2>
      <div className="grid grid-cols-2 gap-4">
        <MetricCard
          label="Connections"
          value={`${metrics.activeConnections}/${metrics.connectionPoolSize}`}
          sublabel="active/pool"
        />
        <MetricCard
          label="Avg Query Time"
          value={`${metrics.avgQueryTimeMs.toFixed(1)}ms`}
        />
        <MetricCard
          label="Slow Queries"
          value={metrics.slowQueriesCount}
          warning={metrics.slowQueriesCount > 10}
        />
        <MetricCard
          label="Disk Usage"
          value={`${metrics.diskUsagePercentage.toFixed(1)}%`}
          warning={metrics.diskUsagePercentage > 80}
        />
      </div>
    </div>
  );
}

function QueuesSection({ queues }: { queues: QueueMetrics[] }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Message Queues</h2>
      <div className="space-y-3">
        {queues.map((queue) => (
          <div key={queue.queueName} className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium text-gray-900">{queue.displayName}</p>
              <span className="text-sm text-gray-500">
                {queue.messagesPerSecond.toFixed(1)} msg/s
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-yellow-600">
                {queue.pendingMessages} pending
              </span>
              <span className="text-blue-600">
                {queue.processingMessages} processing
              </span>
              <span className="text-red-600">
                {queue.failedMessages} failed
              </span>
            </div>
          </div>
        ))}
        {queues.length === 0 && (
          <p className="text-gray-500 text-center py-4">No queues configured</p>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sublabel,
  warning,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  warning?: boolean;
}) {
  return (
    <div className={`p-3 rounded-lg ${warning ? "bg-yellow-50" : "bg-gray-50"}`}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-lg font-bold ${warning ? "text-yellow-600" : "text-gray-900"}`}>
        {value}
      </p>
      {sublabel && <p className="text-xs text-gray-400">{sublabel}</p>}
    </div>
  );
}

// Icons
function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function ExclamationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
    </svg>
  );
}

function XCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function QuestionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
    </svg>
  );
}

function FireIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z" />
    </svg>
  );
}
