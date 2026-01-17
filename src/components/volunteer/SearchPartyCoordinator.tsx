"use client";

import { useState, useEffect, ReactNode } from "react";
import type {
  SearchEventDashboard,
  SearchEvent,
  SearchVolunteer,
  SearchZone,
  SOSAlert,
  VolunteerGPSPosition,
  EVENT_STATUS_LABELS,
  VOLUNTEER_STATUS_LABELS,
  ZONE_STATUS_LABELS,
} from "@/types/volunteer.types";

interface SearchPartyCoordinatorProps {
  eventId: string;
  initialData?: SearchEventDashboard;
  refreshInterval?: number;
}

export function SearchPartyCoordinator({
  eventId,
  initialData,
  refreshInterval = 10000,
}: SearchPartyCoordinatorProps) {
  const [data, setData] = useState<SearchEventDashboard | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [activeTab, setActiveTab] = useState<"overview" | "volunteers" | "zones" | "map" | "safety">("overview");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/search-events/${eventId}/dashboard`);
        if (response.ok) {
          const dashboardData = await response.json();
          setData(dashboardData);
        }
      } catch (error) {
        console.error("Failed to fetch search event data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!initialData) {
      fetchData();
    }

    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [eventId, initialData, refreshInterval]);

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
        Unable to load search event data
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* SOS Alerts Banner */}
      {data.activeSOSAlerts.length > 0 && (
        <SOSAlertsBanner alerts={data.activeSOSAlerts} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{data.event.name}</h1>
          <p className="text-sm text-gray-500">
            {new Date(data.event.eventDate).toLocaleDateString()} at {data.event.startTime}
          </p>
        </div>
        <EventStatusBadge status={data.event.status} />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard
          label="Registered"
          value={data.stats.totalRegistered}
          icon={<UsersIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Checked In"
          value={data.stats.totalCheckedIn}
          icon={<CheckIcon className="h-5 w-5" />}
          color="green"
        />
        <StatCard
          label="Active"
          value={data.stats.totalActive}
          icon={<LocationIcon className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          label="Zones Cleared"
          value={`${data.stats.zonesCleared}/${data.stats.zonesTotal}`}
          icon={<MapIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Findings"
          value={data.stats.findingsCount}
          icon={<EyeIcon className="h-5 w-5" />}
          color={data.stats.significantFindingsCount > 0 ? "yellow" : undefined}
        />
        <StatCard
          label="Coverage"
          value={`${data.stats.coveragePercentage}%`}
          icon={<ChartIcon className="h-5 w-5" />}
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-4">
          {[
            { id: "overview", label: "Overview" },
            { id: "volunteers", label: "Volunteers" },
            { id: "zones", label: "Search Zones" },
            { id: "map", label: "Live Map" },
            { id: "safety", label: "Safety" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-3 border-b-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-cyan-600 text-cyan-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && <OverviewTab data={data} />}
      {activeTab === "volunteers" && <VolunteersTab volunteers={data.activeVolunteers} />}
      {activeTab === "zones" && <ZonesTab zones={data.zones} />}
      {activeTab === "map" && (
        <MapTab
          zones={data.zones}
          positions={data.volunteerPositions}
          event={data.event}
        />
      )}
      {activeTab === "safety" && (
        <SafetyTab
          incidents={data.recentIncidents}
          sosAlerts={data.activeSOSAlerts}
        />
      )}
    </div>
  );
}

function SOSAlertsBanner({ alerts }: { alerts: SOSAlert[] }) {
  return (
    <div className="bg-red-600 text-white rounded-lg p-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ExclamationIcon className="h-8 w-8" />
          <div>
            <h2 className="font-bold text-lg">ACTIVE SOS ALERT</h2>
            <p>
              {alerts.length} volunteer(s) require immediate assistance
            </p>
          </div>
        </div>
        <button className="px-4 py-2 bg-white text-red-600 rounded-lg font-medium hover:bg-red-50">
          View Details
        </button>
      </div>
    </div>
  );
}

function EventStatusBadge({ status }: { status: SearchEvent["status"] }) {
  const colors = {
    planning: "bg-gray-100 text-gray-800",
    registration_open: "bg-blue-100 text-blue-800",
    in_progress: "bg-green-100 text-green-800",
    completed: "bg-cyan-100 text-cyan-800",
    cancelled: "bg-red-100 text-red-800",
  };

  const labels = {
    planning: "Planning",
    registration_open: "Registration Open",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  return (
    <span className={`px-4 py-2 rounded-full text-sm font-medium ${colors[status]}`}>
      {labels[status]}
    </span>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  color?: "green" | "blue" | "yellow" | "red";
}) {
  const colors = {
    green: "text-green-600 bg-green-50",
    blue: "text-blue-600 bg-blue-50",
    yellow: "text-yellow-600 bg-yellow-50",
    red: "text-red-600 bg-red-50",
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color ? colors[color] : "bg-gray-50 text-gray-600"}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ data }: { data: SearchEventDashboard }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Event Details */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Meeting Point</p>
              <p className="font-medium">{data.event.meetingPointAddress}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Emergency Contact</p>
              <p className="font-medium">{data.event.emergencyContactName}</p>
              <p className="text-sm text-cyan-600">{data.event.emergencyContactPhone}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Terrain</p>
              <p className="font-medium">{data.event.terrainType.join(", ")}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Difficulty</p>
              <p className="font-medium capitalize">{data.event.difficultyLevel}</p>
            </div>
          </div>
        </div>

        {/* Teams */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Search Teams</h2>
          <div className="space-y-3">
            {data.teams.map((team) => (
              <div
                key={team.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium">{team.teamName}</p>
                  <p className="text-sm text-gray-500">
                    {team.memberIds.length} members | Zones: {team.assignedZoneIds.length}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    team.status === "deployed"
                      ? "bg-green-100 text-green-800"
                      : team.status === "returning"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {team.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Weather */}
        {data.weatherForecast && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Weather</h2>
            <div className="text-center">
              <p className="text-4xl font-bold text-gray-900">
                {data.weatherForecast.temperature}°C
              </p>
              <p className="text-gray-500">{data.weatherForecast.condition}</p>
              <div className="mt-4 text-sm text-gray-500">
                <p>Wind: {data.weatherForecast.windSpeed} km/h</p>
                <p>Precipitation: {data.weatherForecast.precipitation}%</p>
                <p>Sunrise: {data.weatherForecast.sunrise}</p>
                <p>Sunset: {data.weatherForecast.sunset}</p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <button className="w-full px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">
              Broadcast Message
            </button>
            <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              Check In All
            </button>
            <button className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">
              Report Finding
            </button>
            <button className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
              End Search
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function VolunteersTab({ volunteers }: { volunteers: SearchVolunteer[] }) {
  const [filter, setFilter] = useState<"all" | "active" | "checked_in">("all");

  const filteredVolunteers = volunteers.filter((v) => {
    if (filter === "all") return true;
    if (filter === "active") return v.status === "active";
    if (filter === "checked_in") return v.status === "checked_in";
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4">
        {["all", "active", "checked_in"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as typeof filter)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === f
                ? "bg-cyan-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {f === "all" ? "All" : f === "active" ? "Active in Field" : "Checked In"}
          </button>
        ))}
      </div>

      {/* Volunteers Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Volunteer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Zone
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Last Update
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredVolunteers.map((volunteer) => (
              <tr key={volunteer.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <p className="font-medium text-gray-900">
                      {volunteer.firstName} {volunteer.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{volunteer.phone}</p>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <VolunteerStatusBadge status={volunteer.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {volunteer.assignedZoneId || "Unassigned"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {volunteer.lastGpsUpdate
                    ? new Date(volunteer.lastGpsUpdate).toLocaleTimeString()
                    : "N/A"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <button className="text-cyan-600 hover:text-cyan-700 text-sm">
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VolunteerStatusBadge({ status }: { status: SearchVolunteer["status"] }) {
  const colors = {
    registered: "bg-gray-100 text-gray-800",
    checked_in: "bg-blue-100 text-blue-800",
    active: "bg-green-100 text-green-800",
    checked_out: "bg-gray-100 text-gray-800",
    no_show: "bg-red-100 text-red-800",
  };

  const labels = {
    registered: "Registered",
    checked_in: "Checked In",
    active: "Active",
    checked_out: "Checked Out",
    no_show: "No Show",
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${colors[status]}`}>
      {labels[status]}
    </span>
  );
}

function ZonesTab({ zones }: { zones: SearchZone[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {zones.map((zone) => (
        <div
          key={zone.id}
          className="bg-white rounded-lg border border-gray-200 p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-medium text-gray-900">{zone.zoneName}</h3>
              <p className="text-sm text-gray-500">Code: {zone.zoneCode}</p>
            </div>
            <ZoneStatusBadge status={zone.status} />
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Priority</span>
              <span className={`font-medium ${
                zone.priority === "high"
                  ? "text-red-600"
                  : zone.priority === "medium"
                  ? "text-yellow-600"
                  : "text-gray-600"
              }`}>
                {zone.priority.toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Volunteers</span>
              <span className="font-medium">{zone.assignedVolunteerIds.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Coverage</span>
              <span className="font-medium">{zone.coveragePercentage || 0}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Findings</span>
              <span className="font-medium">{zone.findings.length}</span>
            </div>
          </div>
          {zone.description && (
            <p className="mt-3 text-sm text-gray-500">{zone.description}</p>
          )}
          <div className="mt-4 flex gap-2">
            <button className="flex-1 px-3 py-1.5 bg-cyan-600 text-white text-sm rounded hover:bg-cyan-700">
              Assign Team
            </button>
            <button className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50">
              Details
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ZoneStatusBadge({ status }: { status: SearchZone["status"] }) {
  const colors = {
    unassigned: "bg-gray-100 text-gray-800",
    assigned: "bg-blue-100 text-blue-800",
    in_progress: "bg-yellow-100 text-yellow-800",
    cleared: "bg-green-100 text-green-800",
    needs_review: "bg-orange-100 text-orange-800",
  };

  const labels = {
    unassigned: "Unassigned",
    assigned: "Assigned",
    in_progress: "In Progress",
    cleared: "Cleared",
    needs_review: "Needs Review",
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${colors[status]}`}>
      {labels[status]}
    </span>
  );
}

function MapTab({
  zones,
  positions,
  event,
}: {
  zones: SearchZone[];
  positions: VolunteerGPSPosition[];
  event: SearchEvent;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Live Search Map</h2>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-full bg-green-500" />
            Active ({positions.filter((p) => p.isActive).length})
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-full bg-gray-400" />
            Inactive
          </span>
        </div>
      </div>
      <div className="h-[500px] bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center text-gray-500">
          <MapIcon className="h-16 w-16 mx-auto mb-2" />
          <p>Interactive map would render here</p>
          <p className="text-sm">Showing {positions.length} volunteer positions</p>
          <p className="text-sm">{zones.length} search zones defined</p>
        </div>
      </div>
    </div>
  );
}

function SafetyTab({
  incidents,
  sosAlerts,
}: {
  incidents: SearchEventDashboard["recentIncidents"];
  sosAlerts: SOSAlert[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* SOS Alerts */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <ExclamationIcon className="h-5 w-5 text-red-600" />
          SOS Alerts
        </h2>
        <div className="space-y-3">
          {sosAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-lg border ${
                alert.status === "active"
                  ? "bg-red-50 border-red-200"
                  : "bg-gray-50 border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{alert.volunteerName}</p>
                  <p className="text-sm text-gray-500">
                    Triggered: {new Date(alert.triggeredAt).toLocaleTimeString()}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    alert.status === "active"
                      ? "bg-red-100 text-red-800"
                      : alert.status === "acknowledged"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {alert.status}
                </span>
              </div>
              {alert.status === "active" && (
                <button className="mt-3 w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                  Acknowledge & Respond
                </button>
              )}
            </div>
          ))}
          {sosAlerts.length === 0 && (
            <p className="text-center text-gray-500 py-4">No active SOS alerts</p>
          )}
        </div>
      </div>

      {/* Incidents */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Incidents</h2>
        <div className="space-y-3">
          {incidents.map((incident) => (
            <div key={incident.id} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    incident.severity === "critical"
                      ? "bg-red-100 text-red-800"
                      : incident.severity === "serious"
                      ? "bg-orange-100 text-orange-800"
                      : incident.severity === "moderate"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {incident.severity}
                </span>
                <span className="text-sm text-gray-500">
                  {new Date(incident.reportedAt).toLocaleTimeString()}
                </span>
              </div>
              <p className="font-medium text-gray-900 capitalize">
                {incident.incidentType.replace("_", " ")}
              </p>
              <p className="text-sm text-gray-500 mt-1">{incident.description}</p>
              {incident.resolvedAt && (
                <p className="text-sm text-green-600 mt-2">
                  Resolved: {incident.resolutionNotes}
                </p>
              )}
            </div>
          ))}
          {incidents.length === 0 && (
            <p className="text-center text-gray-500 py-4">No incidents reported</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Icons
function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function LocationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
    </svg>
  );
}

function MapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  );
}

function ExclamationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  );
}
