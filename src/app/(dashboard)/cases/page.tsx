import { cn } from "@/lib";
import Link from "next/link";

export default function CasesDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Cases</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track and monitor your missing person reports
          </p>
        </div>
        <Link
          href="/cases/new"
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
        >
          + Report Missing Person
        </Link>
      </div>

      {/* Case Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-medium text-gray-500">Active Cases</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">1</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-medium text-gray-500">New Leads</p>
          <p className="mt-1 text-3xl font-bold text-cyan-600">3</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-medium text-gray-500">Pending Actions</p>
          <p className="mt-1 text-3xl font-bold text-orange-600">2</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-medium text-gray-500">Days Active</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">3</p>
        </div>
      </div>

      {/* Active Case Card */}
      <div className="rounded-xl border-2 border-cyan-200 bg-cyan-50 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="h-20 w-20 rounded-lg bg-gray-300" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900">Jamel D.</h2>
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                  PRIORITY 0
                </span>
              </div>
              <p className="text-sm text-gray-600">Case #LC-2024-0089</p>
              <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                <span>Age: 34</span>
                <span>•</span>
                <span>Last seen: Montreal, QC</span>
                <span>•</span>
                <span className="font-medium text-red-600">Missing 48+ hours</span>
              </div>
            </div>
          </div>
          <Link
            href="/cases/LC-2024-0089"
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
          >
            View Details
          </Link>
        </div>

        {/* Risk Factors */}
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
            Medical Dependency (HIV medication)
          </span>
          <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">
            Mental Health Condition
          </span>
          <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
            No Financial Resources
          </span>
        </div>
      </div>

      {/* Recent Activity & Leads */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Leads */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900">Recent Leads</h3>
          <div className="mt-4 space-y-3">
            <LeadItem
              type="email"
              title="Email Opened"
              description="Tracking email was opened from Montreal IP address"
              time="2 hours ago"
              status="new"
            />
            <LeadItem
              type="social"
              title="Social Media Activity"
              description="Friend posted photo - possible sighting mentioned in comments"
              time="6 hours ago"
              status="investigating"
            />
            <LeadItem
              type="witness"
              title="Witness Report"
              description="Person matching description seen near Berri-UQAM station"
              time="1 day ago"
              status="verified"
            />
          </div>
          <button className="mt-4 w-full rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            View All Leads
          </button>
        </div>

        {/* Timeline */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900">Case Timeline</h3>
          <div className="mt-4 space-y-4">
            <TimelineItem
              date="Jan 17, 2024"
              time="10:32 AM"
              event="Email tracking triggered"
              icon="📧"
            />
            <TimelineItem
              date="Jan 16, 2024"
              time="3:45 PM"
              event="Hospital check completed - No matches"
              icon="🏥"
            />
            <TimelineItem
              date="Jan 16, 2024"
              time="11:20 AM"
              event="Case escalated to Priority 0"
              icon="🚨"
            />
            <TimelineItem
              date="Jan 15, 2024"
              time="8:00 PM"
              event="Case reported"
              icon="📋"
            />
          </div>
        </div>
      </div>

      {/* Nearby Resources */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900">Nearby Resources</h3>
        <p className="text-sm text-gray-500">Based on last known location: Montreal, QC</p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ResourceCard
            icon="🏥"
            title="Hospitals"
            count={12}
            status="Checked 6 hours ago"
          />
          <ResourceCard
            icon="🏛️"
            title="Shelters"
            count={8}
            status="Not yet checked"
          />
          <ResourceCard
            icon="👮"
            title="Police Stations"
            count={4}
            status="Report filed"
          />
          <ResourceCard
            icon="🚇"
            title="Transit Hubs"
            count={6}
            status="Monitoring"
          />
        </div>
      </div>
    </div>
  );
}

function LeadItem({
  type,
  title,
  description,
  time,
  status,
}: {
  type: "email" | "social" | "witness" | "location";
  title: string;
  description: string;
  time: string;
  status: "new" | "investigating" | "verified" | "dismissed";
}) {
  const statusConfig = {
    new: { bg: "bg-blue-100", text: "text-blue-700", label: "New" },
    investigating: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Investigating" },
    verified: { bg: "bg-green-100", text: "text-green-700", label: "Verified" },
    dismissed: { bg: "bg-gray-100", text: "text-gray-700", label: "Dismissed" },
  };

  const icons = {
    email: "📧",
    social: "📱",
    witness: "👁️",
    location: "📍",
  };

  const config = statusConfig[status];

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="flex items-start gap-3">
        <span className="text-xl">{icons[type]}</span>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">{title}</h4>
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", config.bg, config.text)}>
              {config.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-600">{description}</p>
          <p className="mt-1 text-xs text-gray-400">{time}</p>
        </div>
      </div>
    </div>
  );
}

function TimelineItem({
  date,
  time,
  event,
  icon,
}: {
  date: string;
  time: string;
  event: string;
  icon: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
        <span>{icon}</span>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-900">{event}</p>
        <p className="text-xs text-gray-500">
          {date} at {time}
        </p>
      </div>
    </div>
  );
}

function ResourceCard({
  icon,
  title,
  count,
  status,
}: {
  icon: string;
  title: string;
  count: number;
  status: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="font-medium text-gray-900">{title}</p>
          <p className="text-sm text-gray-500">{count} nearby</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-gray-400">{status}</p>
    </div>
  );
}
