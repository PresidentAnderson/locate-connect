import Link from "next/link";
import { 
  CaseCard, 
  LeadItem, 
  TimelineView, 
  ResourceGrid,
  NotificationPreferences 
} from "@/components/cases";
import type { TimelineEvent, Resource } from "@/components/cases";

export default function CasesDashboard() {
  // Mock data for demonstration
  const timelineEvents: TimelineEvent[] = [
    {
      id: "1",
      date: "Jan 17, 2024",
      time: "10:32 AM",
      event: "Email tracking triggered",
      icon: "📧",
      type: "lead"
    },
    {
      id: "2",
      date: "Jan 16, 2024",
      time: "3:45 PM",
      event: "Hospital check completed - No matches",
      icon: "🏥",
      type: "action"
    },
    {
      id: "3",
      date: "Jan 16, 2024",
      time: "11:20 AM",
      event: "Case escalated to Priority 0",
      icon: "🚨",
      type: "escalation"
    },
    {
      id: "4",
      date: "Jan 15, 2024",
      time: "8:00 PM",
      event: "Case reported",
      icon: "📋",
      type: "update"
    }
  ];

  const resources: Resource[] = [
    { id: "1", icon: "🏥", title: "Hospitals", count: 12, status: "Checked 6 hours ago", type: "hospital" },
    { id: "2", icon: "🏛️", title: "Shelters", count: 8, status: "Not yet checked", type: "shelter" },
    { id: "3", icon: "👮", title: "Police Stations", count: 4, status: "Report filed", type: "police" },
    { id: "4", icon: "🚇", title: "Transit Hubs", count: 6, status: "Monitoring", type: "transit" }
  ];

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
      <CaseCard
        id="LC-2024-0089"
        caseNumber="LC-2024-0089"
        firstName="Jamel"
        lastName="D."
        priorityLevel="p0_critical"
        status="active"
        age={34}
        lastSeenLocation="Montreal, QC"
        lastSeenDate="2024-01-15T20:00:00Z"
        riskFactors={[
          "Medical Dependency (HIV medication)",
          "Mental Health Condition",
          "No Financial Resources"
        ]}
      />

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
          <div className="mt-4">
            <TimelineView events={timelineEvents} />
          </div>
        </div>
      </div>

      {/* Nearby Resources */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900">Nearby Resources</h3>
        <ResourceGrid 
          resources={resources} 
          location="Montreal, QC"
        />
      </div>

      {/* Notification Preferences */}
      <NotificationPreferences
        initialPreferences={{
          emailEnabled: true,
          smsEnabled: false,
          pushEnabled: true,
          defaultFrequency: "immediate"
        }}
      />
    </div>
  );
}
