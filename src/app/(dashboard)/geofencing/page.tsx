"use client";

import { useState, useEffect } from "react";

export const dynamic = "force-dynamic";

type GeofenceType = "circle" | "polygon" | "corridor";
type AlertTrigger = "enter" | "exit" | "both";
type AlertPriority = "low" | "medium" | "high" | "critical";
type GeofenceStatus = "active" | "paused" | "expired" | "triggered";

interface Geofence {
  id: string;
  name: string;
  caseId: string;
  caseName: string;
  type: GeofenceType;
  center?: { lat: number; lng: number };
  radius?: number;
  coordinates?: { lat: number; lng: number }[];
  trigger: AlertTrigger;
  priority: AlertPriority;
  status: GeofenceStatus;
  createdAt: string;
  expiresAt?: string;
  alertCount: number;
  lastTriggered?: string;
  notifyChannels: string[];
  description?: string;
}

interface GeofenceAlert {
  id: string;
  geofenceId: string;
  geofenceName: string;
  caseName: string;
  triggerType: "enter" | "exit";
  triggeredAt: string;
  location: { lat: number; lng: number };
  source: string;
  acknowledged: boolean;
}

const getPriorityColor = (priority: AlertPriority) => {
  switch (priority) {
    case "low":
      return "bg-gray-100 text-gray-700";
    case "medium":
      return "bg-blue-100 text-blue-700";
    case "high":
      return "bg-orange-100 text-orange-700";
    case "critical":
      return "bg-red-100 text-red-700";
  }
};

const getStatusColor = (status: GeofenceStatus) => {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-700";
    case "paused":
      return "bg-yellow-100 text-yellow-700";
    case "expired":
      return "bg-gray-100 text-gray-700";
    case "triggered":
      return "bg-red-100 text-red-700";
  }
};

export default function GeofencingPage() {
  const [activeTab, setActiveTab] = useState<"geofences" | "alerts" | "create">("geofences");
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [alerts, setAlerts] = useState<GeofenceAlert[]>([]);
  const [selectedGeofence, setSelectedGeofence] = useState<Geofence | null>(null);
  const [filterStatus, setFilterStatus] = useState<GeofenceStatus | "all">("all");
  const [filterPriority, setFilterPriority] = useState<AlertPriority | "all">("all");

  // Create form state
  const [newGeofence, setNewGeofence] = useState({
    name: "",
    caseId: "",
    type: "circle" as GeofenceType,
    radius: 500,
    trigger: "both" as AlertTrigger,
    priority: "medium" as AlertPriority,
    description: "",
    notifyChannels: ["email", "push"],
  });

  useEffect(() => {
    // Load mock geofences
    setGeofences([
      {
        id: "geo-1",
        name: "Last Known Location - Jane Doe",
        caseId: "case-1",
        caseName: "Jane Doe",
        type: "circle",
        center: { lat: 53.5461, lng: -113.4938 },
        radius: 1000,
        trigger: "both",
        priority: "critical",
        status: "active",
        createdAt: "2026-01-15T10:00:00Z",
        alertCount: 3,
        lastTriggered: "2026-01-17T14:30:00Z",
        notifyChannels: ["email", "sms", "push"],
        description: "Monitoring area around downtown Edmonton where subject was last seen",
      },
      {
        id: "geo-2",
        name: "Home Address - John Smith",
        caseId: "case-2",
        caseName: "John Smith",
        type: "circle",
        center: { lat: 53.5234, lng: -113.5267 },
        radius: 500,
        trigger: "enter",
        priority: "high",
        status: "active",
        createdAt: "2026-01-14T08:00:00Z",
        alertCount: 0,
        notifyChannels: ["email", "push"],
        description: "Monitoring for return to home address",
      },
      {
        id: "geo-3",
        name: "School Zone - Emily Chen",
        caseId: "case-3",
        caseName: "Emily Chen",
        type: "polygon",
        coordinates: [
          { lat: 53.5500, lng: -113.5100 },
          { lat: 53.5550, lng: -113.5100 },
          { lat: 53.5550, lng: -113.5000 },
          { lat: 53.5500, lng: -113.5000 },
        ],
        trigger: "both",
        priority: "high",
        status: "active",
        createdAt: "2026-01-16T09:00:00Z",
        alertCount: 1,
        lastTriggered: "2026-01-17T08:45:00Z",
        notifyChannels: ["email", "sms"],
        description: "School and surrounding area where Emily was last seen",
      },
      {
        id: "geo-4",
        name: "Transit Corridor - Jane Doe",
        caseId: "case-1",
        caseName: "Jane Doe",
        type: "corridor",
        coordinates: [
          { lat: 53.5461, lng: -113.4938 },
          { lat: 53.5361, lng: -113.5038 },
          { lat: 53.5261, lng: -113.5138 },
        ],
        trigger: "enter",
        priority: "medium",
        status: "paused",
        createdAt: "2026-01-15T11:00:00Z",
        alertCount: 5,
        notifyChannels: ["push"],
        description: "LRT corridor from downtown to West Edmonton",
      },
    ]);

    // Load mock alerts
    setAlerts([
      {
        id: "alert-1",
        geofenceId: "geo-1",
        geofenceName: "Last Known Location - Jane Doe",
        caseName: "Jane Doe",
        triggerType: "enter",
        triggeredAt: "2026-01-17T14:30:00Z",
        location: { lat: 53.5471, lng: -113.4948 },
        source: "Mobile App Ping",
        acknowledged: false,
      },
      {
        id: "alert-2",
        geofenceId: "geo-3",
        geofenceName: "School Zone - Emily Chen",
        caseName: "Emily Chen",
        triggerType: "exit",
        triggeredAt: "2026-01-17T08:45:00Z",
        location: { lat: 53.5510, lng: -113.5050 },
        source: "CCTV Detection",
        acknowledged: true,
      },
      {
        id: "alert-3",
        geofenceId: "geo-1",
        geofenceName: "Last Known Location - Jane Doe",
        caseName: "Jane Doe",
        triggerType: "exit",
        triggeredAt: "2026-01-16T16:20:00Z",
        location: { lat: 53.5400, lng: -113.4900 },
        source: "Tip Report",
        acknowledged: true,
      },
    ]);
  }, []);

  const filteredGeofences = geofences.filter((geo) => {
    if (filterStatus !== "all" && geo.status !== filterStatus) return false;
    if (filterPriority !== "all" && geo.priority !== filterPriority) return false;
    return true;
  });

  const unacknowledgedAlerts = alerts.filter((a) => !a.acknowledged);

  const handleCreateGeofence = async () => {
    // Simulate creation
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setActiveTab("geofences");
    setNewGeofence({
      name: "",
      caseId: "",
      type: "circle",
      radius: 500,
      trigger: "both",
      priority: "medium",
      description: "",
      notifyChannels: ["email", "push"],
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Geofencing Alerts</h1>
          <p className="text-gray-600 mt-2">Create and manage location-based monitoring zones</p>
        </div>
        <div className="flex items-center gap-4">
          {unacknowledgedAlerts.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="font-medium">{unacknowledgedAlerts.length} new alerts</span>
            </div>
          )}
          <button
            onClick={() => setActiveTab("create")}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Geofence
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          {[
            { id: "geofences", label: "Geofences" },
            { id: "alerts", label: `Alerts ${unacknowledgedAlerts.length > 0 ? `(${unacknowledgedAlerts.length})` : ""}` },
            { id: "create", label: "Create New" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Geofences Tab */}
      {activeTab === "geofences" && (
        <div>
          {/* Filters */}
          <div className="flex items-center gap-4 mb-6">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as GeofenceStatus | "all")}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="expired">Expired</option>
              <option value="triggered">Triggered</option>
            </select>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as AlertPriority | "all")}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Geofences Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredGeofences.map((geo) => (
              <div
                key={geo.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedGeofence(geo)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{geo.name}</h3>
                    <p className="text-sm text-blue-600">{geo.caseName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded ${getPriorityColor(geo.priority)}`}>
                      {geo.priority}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded ${getStatusColor(geo.status)}`}>
                      {geo.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                  <div>
                    <p className="text-gray-500">Type</p>
                    <p className="font-medium capitalize">{geo.type}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Trigger</p>
                    <p className="font-medium capitalize">{geo.trigger}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Alerts</p>
                    <p className="font-medium">{geo.alertCount}</p>
                  </div>
                </div>

                {geo.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">{geo.description}</p>
                )}

                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {geo.notifyChannels.map((channel) => (
                      <span key={channel} className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded text-xs">
                        {channel === "email" && "📧"}
                        {channel === "sms" && "📱"}
                        {channel === "push" && "🔔"}
                      </span>
                    ))}
                  </div>
                  {geo.lastTriggered && (
                    <p className="text-xs text-gray-500">
                      Last triggered: {new Date(geo.lastTriggered).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === "alerts" && (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`bg-white rounded-lg border p-4 ${
                alert.acknowledged ? "border-gray-200" : "border-red-300 bg-red-50"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        alert.triggerType === "enter" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      {alert.triggerType === "enter" ? "Entered Zone" : "Exited Zone"}
                    </span>
                    {!alert.acknowledged && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">New</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900">{alert.geofenceName}</h3>
                  <p className="text-sm text-blue-600">{alert.caseName}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span>{new Date(alert.triggeredAt).toLocaleString()}</span>
                    <span>Source: {alert.source}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!alert.acknowledged && (
                    <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                      Acknowledge
                    </button>
                  )}
                  <button className="px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50">
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Tab */}
      {activeTab === "create" && (
        <div className="max-w-2xl">
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Geofence Name</label>
              <input
                type="text"
                value={newGeofence.name}
                onChange={(e) => setNewGeofence({ ...newGeofence, name: e.target.value })}
                placeholder="e.g., Last Known Location - Subject Name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Associated Case</label>
              <select
                value={newGeofence.caseId}
                onChange={(e) => setNewGeofence({ ...newGeofence, caseId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a case...</option>
                <option value="case-1">Jane Doe - Missing Person</option>
                <option value="case-2">John Smith - Missing Person</option>
                <option value="case-3">Emily Chen - Missing Person</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Geofence Type</label>
              <div className="grid grid-cols-3 gap-3">
                {(["circle", "polygon", "corridor"] as GeofenceType[]).map((type) => (
                  <label
                    key={type}
                    className={`p-4 border rounded-lg cursor-pointer text-center ${
                      newGeofence.type === type ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="type"
                      value={type}
                      checked={newGeofence.type === type}
                      onChange={() => setNewGeofence({ ...newGeofence, type })}
                      className="sr-only"
                    />
                    <div className="text-2xl mb-1">
                      {type === "circle" && "⭕"}
                      {type === "polygon" && "⬡"}
                      {type === "corridor" && "〰️"}
                    </div>
                    <p className="font-medium capitalize">{type}</p>
                  </label>
                ))}
              </div>
            </div>

            {newGeofence.type === "circle" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Radius (meters)</label>
                <input
                  type="number"
                  value={newGeofence.radius}
                  onChange={(e) => setNewGeofence({ ...newGeofence, radius: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alert Trigger</label>
                <select
                  value={newGeofence.trigger}
                  onChange={(e) => setNewGeofence({ ...newGeofence, trigger: e.target.value as AlertTrigger })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="enter">On Enter</option>
                  <option value="exit">On Exit</option>
                  <option value="both">Both</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={newGeofence.priority}
                  onChange={(e) => setNewGeofence({ ...newGeofence, priority: e.target.value as AlertPriority })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={newGeofence.description}
                onChange={(e) => setNewGeofence({ ...newGeofence, description: e.target.value })}
                rows={3}
                placeholder="Describe the purpose of this geofence..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notification Channels</label>
              <div className="flex items-center gap-4">
                {["email", "sms", "push"].map((channel) => (
                  <label key={channel} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newGeofence.notifyChannels.includes(channel)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewGeofence({ ...newGeofence, notifyChannels: [...newGeofence.notifyChannels, channel] });
                        } else {
                          setNewGeofence({
                            ...newGeofence,
                            notifyChannels: newGeofence.notifyChannels.filter((c) => c !== channel),
                          });
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="capitalize">{channel}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
              <p className="text-gray-500">Map interface for drawing geofence would appear here</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCreateGeofence}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Geofence
              </button>
              <button
                onClick={() => setActiveTab("geofences")}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedGeofence && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">{selectedGeofence.name}</h2>
              <button onClick={() => setSelectedGeofence(null)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="bg-gray-100 rounded-lg h-48 flex items-center justify-center mb-6">
                <p className="text-gray-500">Map preview would appear here</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Case</p>
                  <p className="font-medium text-blue-600">{selectedGeofence.caseName}</p>
                </div>
                <div>
                  <p className="text-gray-500">Type</p>
                  <p className="font-medium capitalize">{selectedGeofence.type}</p>
                </div>
                <div>
                  <p className="text-gray-500">Status</p>
                  <span className={`px-2 py-1 text-xs rounded ${getStatusColor(selectedGeofence.status)}`}>
                    {selectedGeofence.status}
                  </span>
                </div>
                <div>
                  <p className="text-gray-500">Priority</p>
                  <span className={`px-2 py-1 text-xs rounded ${getPriorityColor(selectedGeofence.priority)}`}>
                    {selectedGeofence.priority}
                  </span>
                </div>
                <div>
                  <p className="text-gray-500">Total Alerts</p>
                  <p className="font-medium">{selectedGeofence.alertCount}</p>
                </div>
                <div>
                  <p className="text-gray-500">Created</p>
                  <p className="font-medium">{new Date(selectedGeofence.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              {selectedGeofence.description && (
                <div className="mt-4">
                  <p className="text-gray-500 text-sm">Description</p>
                  <p className="text-gray-700">{selectedGeofence.description}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Edit</button>
              <button className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                {selectedGeofence.status === "active" ? "Pause" : "Activate"}
              </button>
              <button className="py-2 px-4 border border-red-300 text-red-700 rounded-lg hover:bg-red-50">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
