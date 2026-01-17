import { cn } from "@/lib";

export default function AdminPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Developer Admin Panel</h1>
        <p className="mt-1 text-sm text-gray-500">
          System configuration, monitoring, and development tools
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Cases"
          value="24"
          change="+3"
          changeType="increase"
        />
        <StatCard
          title="Pending Leads"
          value="156"
          change="+12"
          changeType="increase"
        />
        <StatCard
          title="API Calls (24h)"
          value="12,847"
          change="-2%"
          changeType="decrease"
        />
        <StatCard
          title="System Health"
          value="99.9%"
          change=""
          changeType="neutral"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* System Status */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">System Status</h2>
          <div className="mt-4 space-y-3">
            <ServiceStatus name="Supabase Database" status="operational" latency="12ms" />
            <ServiceStatus name="Email Tracking Service" status="operational" latency="45ms" />
            <ServiceStatus name="Social Media Monitor" status="degraded" latency="230ms" />
            <ServiceStatus name="Hospital Registry API" status="operational" latency="89ms" />
            <ServiceStatus name="Border Services API" status="maintenance" latency="--" />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <ActionButton icon="🔄" label="Sync All Services" />
            <ActionButton icon="📊" label="View Analytics" />
            <ActionButton icon="🔑" label="Manage API Keys" />
            <ActionButton icon="📋" label="View Audit Logs" />
            <ActionButton icon="⚙️" label="System Settings" />
            <ActionButton icon="🧪" label="Test Mode" />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900">Recent System Activity</h2>
          <div className="mt-4 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Timestamp
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Event
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    User
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <ActivityRow
                  timestamp="2 min ago"
                  event="New case created: #LC-2024-0089"
                  user="officer.martin@spvm.qc.ca"
                  status="success"
                />
                <ActivityRow
                  timestamp="15 min ago"
                  event="Email tracking pixel triggered"
                  user="system"
                  status="success"
                />
                <ActivityRow
                  timestamp="32 min ago"
                  event="Priority escalation: Case #LC-2024-0087"
                  user="system"
                  status="warning"
                />
                <ActivityRow
                  timestamp="1 hour ago"
                  event="API rate limit warning"
                  user="external_api"
                  status="warning"
                />
                <ActivityRow
                  timestamp="2 hours ago"
                  event="Jurisdiction profile updated: QC_SPVM_v1"
                  user="admin@locateconnect.com"
                  status="success"
                />
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  change,
  changeType,
}: {
  title: string;
  value: string;
  change: string;
  changeType: "increase" | "decrease" | "neutral";
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {change && (
          <span
            className={cn(
              "text-sm font-medium",
              changeType === "increase" && "text-green-600",
              changeType === "decrease" && "text-red-600",
              changeType === "neutral" && "text-gray-500"
            )}
          >
            {change}
          </span>
        )}
      </div>
    </div>
  );
}

function ServiceStatus({
  name,
  status,
  latency,
}: {
  name: string;
  status: "operational" | "degraded" | "maintenance" | "down";
  latency: string;
}) {
  const statusConfig = {
    operational: { color: "bg-green-500", label: "Operational" },
    degraded: { color: "bg-yellow-500", label: "Degraded" },
    maintenance: { color: "bg-blue-500", label: "Maintenance" },
    down: { color: "bg-red-500", label: "Down" },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className={cn("h-2.5 w-2.5 rounded-full", config.color)} />
        <span className="text-sm font-medium text-gray-900">{name}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-xs text-gray-500">{latency}</span>
        <span className={cn(
          "text-xs font-medium",
          status === "operational" && "text-green-600",
          status === "degraded" && "text-yellow-600",
          status === "maintenance" && "text-blue-600",
          status === "down" && "text-red-600"
        )}>
          {config.label}
        </span>
      </div>
    </div>
  );
}

function ActionButton({ icon, label }: { icon: string; label: string }) {
  return (
    <button
      type="button"
      className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function ActivityRow({
  timestamp,
  event,
  user,
  status,
}: {
  timestamp: string;
  event: string;
  user: string;
  status: "success" | "warning" | "error";
}) {
  return (
    <tr>
      <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-500">
        {timestamp}
      </td>
      <td className="px-3 py-3 text-sm text-gray-900">{event}</td>
      <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-500">
        {user}
      </td>
      <td className="whitespace-nowrap px-3 py-3">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
            status === "success" && "bg-green-100 text-green-700",
            status === "warning" && "bg-yellow-100 text-yellow-700",
            status === "error" && "bg-red-100 text-red-700"
          )}
        >
          {status}
        </span>
      </td>
    </tr>
  );
}
