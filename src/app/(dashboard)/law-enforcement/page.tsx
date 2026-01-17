import { cn } from "@/lib";

export default function LawEnforcementPage() {
  return (
    <div className="space-y-6">
      {/* Header with Live Status */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Law Enforcement Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Real-time case monitoring and priority alerts
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-green-50 px-4 py-2">
            <span className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-green-700">Live Feed Active</span>
          </div>
          <button className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700">
            New Case Alert
          </button>
        </div>
      </div>

      {/* Priority Cases Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <PriorityCard level={0} count={2} label="CRITICAL" color="red" />
        <PriorityCard level={1} count={5} label="HIGH" color="orange" />
        <PriorityCard level={2} count={12} label="MEDIUM" color="yellow" />
        <PriorityCard level={3} count={5} label="LOW" color="green" />
      </div>

      {/* Live Cases Table */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Active Cases - Real-Time</h2>
            <div className="flex items-center gap-2">
              <select className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm">
                <option>All Priorities</option>
                <option>Priority 0 - Critical</option>
                <option>Priority 1 - High</option>
                <option>Priority 2 - Medium</option>
              </select>
              <select className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm">
                <option>Montreal (SPVM)</option>
                <option>All Jurisdictions</option>
              </select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Case ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Missing Person
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Last Seen
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Risk Factors
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Latest Lead
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              <CaseRow
                priority={0}
                caseId="LC-2024-0089"
                name="Jamel D."
                age={34}
                lastSeen="Montreal, QC"
                lastSeenDate="Jan 15, 2024"
                duration="48+ hours"
                riskFactors={["Medical dependency", "Mental health", "No resources"]}
                latestLead="Email opened - IP: Montreal"
                isNew
              />
              <CaseRow
                priority={0}
                caseId="LC-2024-0088"
                name="Marie-Claire L."
                age={8}
                lastSeen="Laval, QC"
                lastSeenDate="Jan 16, 2024"
                duration="12 hours"
                riskFactors={["Minor", "Out of character", "Adverse weather"]}
                latestLead="Witness sighting - Metro station"
              />
              <CaseRow
                priority={1}
                caseId="LC-2024-0087"
                name="Robert T."
                age={72}
                lastSeen="Longueuil, QC"
                lastSeenDate="Jan 14, 2024"
                duration="72+ hours"
                riskFactors={["Elderly", "Dementia", "Cold weather"]}
                latestLead="Bank card activity - Brossard"
              />
              <CaseRow
                priority={2}
                caseId="LC-2024-0085"
                name="Sophie M."
                age={19}
                lastSeen="NDG, Montreal"
                lastSeenDate="Jan 12, 2024"
                duration="5 days"
                riskFactors={["Mental health history"]}
                latestLead="Social media activity detected"
              />
            </tbody>
          </table>
        </div>
      </div>

      {/* Real-Time Alerts Panel */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Live Alerts Feed */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900">Live Alerts</h2>
          <div className="mt-4 space-y-3">
            <AlertItem
              type="critical"
              time="2 min ago"
              message="Email tracking triggered for Case #LC-2024-0089 - Montreal IP detected"
              caseId="LC-2024-0089"
            />
            <AlertItem
              type="warning"
              time="15 min ago"
              message="Priority escalation: Case #LC-2024-0088 missing 12+ hours (minor)"
              caseId="LC-2024-0088"
            />
            <AlertItem
              type="info"
              time="32 min ago"
              message="New witness report submitted for Case #LC-2024-0087"
              caseId="LC-2024-0087"
            />
            <AlertItem
              type="success"
              time="1 hour ago"
              message="Hospital check completed - No matches found (5 facilities)"
              caseId="LC-2024-0085"
            />
          </div>
        </div>

        {/* Quick Links */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Quick Access</h2>
          <div className="mt-4 space-y-2">
            <QuickLink
              icon="🏥"
              label="Hospital Registry Search"
              description="Search across 12 facilities"
            />
            <QuickLink
              icon="🛂"
              label="Border Services Check"
              description="CBSA / ICE Integration"
            />
            <QuickLink
              icon="🏛️"
              label="Detention Facilities"
              description="Check holding facilities"
            />
            <QuickLink
              icon="🚇"
              label="Transit Authority"
              description="STM camera access"
            />
            <QuickLink
              icon="📱"
              label="Social Media Monitor"
              description="Track known accounts"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function PriorityCard({
  level,
  count,
  label,
  color,
}: {
  level: number;
  count: number;
  label: string;
  color: "red" | "orange" | "yellow" | "green";
}) {
  const colorClasses = {
    red: "bg-red-50 border-red-200 text-red-700",
    orange: "bg-orange-50 border-orange-200 text-orange-700",
    yellow: "bg-yellow-50 border-yellow-200 text-yellow-700",
    green: "bg-green-50 border-green-200 text-green-700",
  };

  return (
    <div className={cn("rounded-xl border-2 p-5", colorClasses[color])}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-75">Priority {level}</p>
          <p className="text-3xl font-bold">{count}</p>
        </div>
        <div className="text-right">
          <span className="text-lg font-bold">{label}</span>
        </div>
      </div>
    </div>
  );
}

function CaseRow({
  priority,
  caseId,
  name,
  age,
  lastSeen,
  lastSeenDate,
  duration,
  riskFactors,
  latestLead,
  isNew,
}: {
  priority: number;
  caseId: string;
  name: string;
  age: number;
  lastSeen: string;
  lastSeenDate: string;
  duration: string;
  riskFactors: string[];
  latestLead: string;
  isNew?: boolean;
}) {
  const priorityColors = {
    0: "bg-red-100 text-red-800 border-red-200",
    1: "bg-orange-100 text-orange-800 border-orange-200",
    2: "bg-yellow-100 text-yellow-800 border-yellow-200",
    3: "bg-green-100 text-green-800 border-green-200",
  };

  return (
    <tr className={cn(isNew && "bg-red-50")}>
      <td className="whitespace-nowrap px-6 py-4">
        <span className={cn(
          "inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold",
          priorityColors[priority as keyof typeof priorityColors]
        )}>
          P{priority}
        </span>
      </td>
      <td className="whitespace-nowrap px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-medium text-gray-900">{caseId}</span>
          {isNew && (
            <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white animate-pulse">
              NEW
            </span>
          )}
        </div>
      </td>
      <td className="whitespace-nowrap px-6 py-4">
        <div>
          <p className="font-medium text-gray-900">{name}</p>
          <p className="text-sm text-gray-500">{age} years old</p>
        </div>
      </td>
      <td className="whitespace-nowrap px-6 py-4">
        <div>
          <p className="text-sm text-gray-900">{lastSeen}</p>
          <p className="text-xs text-gray-500">{lastSeenDate}</p>
        </div>
      </td>
      <td className="whitespace-nowrap px-6 py-4">
        <span className={cn(
          "text-sm font-medium",
          duration.includes("72") && "text-red-600",
          duration.includes("48") && "text-orange-600"
        )}>
          {duration}
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-wrap gap-1">
          {riskFactors.slice(0, 2).map((factor) => (
            <span
              key={factor}
              className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
            >
              {factor}
            </span>
          ))}
          {riskFactors.length > 2 && (
            <span className="text-xs text-gray-500">+{riskFactors.length - 2}</span>
          )}
        </div>
      </td>
      <td className="px-6 py-4">
        <p className="max-w-xs truncate text-sm text-gray-600">{latestLead}</p>
      </td>
      <td className="whitespace-nowrap px-6 py-4">
        <button className="rounded bg-cyan-600 px-3 py-1 text-sm font-medium text-white hover:bg-cyan-700">
          View
        </button>
      </td>
    </tr>
  );
}

function AlertItem({
  type,
  time,
  message,
  caseId,
}: {
  type: "critical" | "warning" | "info" | "success";
  time: string;
  message: string;
  caseId: string;
}) {
  const typeConfig = {
    critical: { bg: "bg-red-50 border-red-200", icon: "🚨", text: "text-red-800" },
    warning: { bg: "bg-orange-50 border-orange-200", icon: "⚠️", text: "text-orange-800" },
    info: { bg: "bg-blue-50 border-blue-200", icon: "ℹ️", text: "text-blue-800" },
    success: { bg: "bg-green-50 border-green-200", icon: "✓", text: "text-green-800" },
  };

  const config = typeConfig[type];

  return (
    <div className={cn("rounded-lg border p-4", config.bg)}>
      <div className="flex items-start gap-3">
        <span className="text-lg">{config.icon}</span>
        <div className="flex-1">
          <p className={cn("text-sm font-medium", config.text)}>{message}</p>
          <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
            <span>{time}</span>
            <span>•</span>
            <span className="font-mono">{caseId}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickLink({
  icon,
  label,
  description,
}: {
  icon: string;
  label: string;
  description: string;
}) {
  return (
    <button className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left hover:bg-gray-50 transition-colors">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
    </button>
  );
}
