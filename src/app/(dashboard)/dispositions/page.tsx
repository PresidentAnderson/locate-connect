"use client";

import { useState, useEffect } from "react";

export const dynamic = "force-dynamic";

type DispositionType = "found_safe" | "found_deceased" | "returned_home" | "located_incarcerated" | "located_hospital" | "runaway_resolved" | "case_closed" | "unknown";
type TimeRange = "week" | "month" | "quarter" | "year" | "all";

interface CaseDisposition {
  id: string;
  caseId: string;
  caseName: string;
  caseType: string;
  age: number;
  disposition: DispositionType;
  dispositionDate: string;
  daysOpen: number;
  resolvedBy: string;
  notes?: string;
  location?: string;
  circumstance?: string;
}

interface DispositionStats {
  type: DispositionType;
  count: number;
  percentage: number;
  avgDaysToResolve: number;
}

const DISPOSITION_LABELS: Record<DispositionType, string> = {
  found_safe: "Found Safe",
  found_deceased: "Found Deceased",
  returned_home: "Returned Home",
  located_incarcerated: "Located (Incarcerated)",
  located_hospital: "Located (Hospital)",
  runaway_resolved: "Runaway Resolved",
  case_closed: "Case Closed",
  unknown: "Unknown",
};

const getDispositionColor = (type: DispositionType) => {
  switch (type) {
    case "found_safe":
    case "returned_home":
    case "runaway_resolved":
      return "bg-green-100 text-green-700";
    case "found_deceased":
      return "bg-gray-800 text-white";
    case "located_incarcerated":
      return "bg-orange-100 text-orange-700";
    case "located_hospital":
      return "bg-blue-100 text-blue-700";
    case "case_closed":
      return "bg-gray-100 text-gray-700";
    case "unknown":
      return "bg-yellow-100 text-yellow-700";
  }
};

export default function DispositionsPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "cases" | "analytics">("overview");
  const [dispositions, setDispositions] = useState<CaseDisposition[]>([]);
  const [stats, setStats] = useState<DispositionStats[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  const [selectedDisposition, setSelectedDisposition] = useState<CaseDisposition | null>(null);
  const [filterType, setFilterType] = useState<DispositionType | "all">("all");

  useEffect(() => {
    // Load mock dispositions
    setDispositions([
      {
        id: "disp-1",
        caseId: "case-10",
        caseName: "Michael Brown",
        caseType: "Missing Adult",
        age: 35,
        disposition: "found_safe",
        dispositionDate: "2026-01-16T14:00:00Z",
        daysOpen: 3,
        resolvedBy: "Family Contact",
        notes: "Subject was found at a friend's house, unaware family had reported them missing.",
        location: "Edmonton, AB",
      },
      {
        id: "disp-2",
        caseId: "case-11",
        caseName: "Sarah Miller",
        caseType: "Runaway",
        age: 16,
        disposition: "runaway_resolved",
        dispositionDate: "2026-01-15T10:00:00Z",
        daysOpen: 5,
        resolvedBy: "Police Recovery",
        notes: "Located through social media investigation. Returned to family with support services.",
        location: "St. Albert, AB",
      },
      {
        id: "disp-3",
        caseId: "case-12",
        caseName: "Robert Chen",
        caseType: "Missing Elderly",
        age: 78,
        disposition: "located_hospital",
        dispositionDate: "2026-01-14T08:30:00Z",
        daysOpen: 2,
        resolvedBy: "Hospital Match",
        notes: "Subject was admitted to hospital as John Doe. Silver Alert system facilitated match.",
        location: "Royal Alexandra Hospital, Edmonton",
      },
      {
        id: "disp-4",
        caseId: "case-13",
        caseName: "Jennifer Wilson",
        caseType: "Missing Adult",
        age: 42,
        disposition: "returned_home",
        dispositionDate: "2026-01-12T16:00:00Z",
        daysOpen: 1,
        resolvedBy: "Self-Return",
        notes: "Subject returned home on their own. Had needed time away due to personal stress.",
      },
      {
        id: "disp-5",
        caseId: "case-14",
        caseName: "David Lee",
        caseType: "Missing Adult",
        age: 29,
        disposition: "located_incarcerated",
        dispositionDate: "2026-01-10T12:00:00Z",
        daysOpen: 7,
        resolvedBy: "System Match",
        notes: "Subject was arrested in Calgary on unrelated charges.",
        location: "Calgary Remand Centre",
      },
    ]);

    // Load mock stats
    setStats([
      { type: "found_safe", count: 45, percentage: 38, avgDaysToResolve: 4.2 },
      { type: "returned_home", count: 32, percentage: 27, avgDaysToResolve: 2.1 },
      { type: "runaway_resolved", count: 18, percentage: 15, avgDaysToResolve: 5.8 },
      { type: "located_hospital", count: 8, percentage: 7, avgDaysToResolve: 1.5 },
      { type: "located_incarcerated", count: 6, percentage: 5, avgDaysToResolve: 8.3 },
      { type: "found_deceased", count: 4, percentage: 3, avgDaysToResolve: 12.5 },
      { type: "case_closed", count: 5, percentage: 4, avgDaysToResolve: 30.0 },
      { type: "unknown", count: 1, percentage: 1, avgDaysToResolve: 45.0 },
    ]);
  }, []);

  const totalResolved = stats.reduce((sum, s) => sum + s.count, 0);
  const avgDaysOverall = stats.reduce((sum, s) => sum + s.avgDaysToResolve * s.count, 0) / totalResolved;
  const positiveOutcomes = stats
    .filter((s) => ["found_safe", "returned_home", "runaway_resolved", "located_hospital"].includes(s.type))
    .reduce((sum, s) => sum + s.count, 0);

  const filteredDispositions = filterType === "all" ? dispositions : dispositions.filter((d) => d.disposition === filterType);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Case Disposition Tracking</h1>
          <p className="text-gray-600 mt-2">Track and analyze case outcomes and resolution metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="week">Past Week</option>
            <option value="month">Past Month</option>
            <option value="quarter">Past Quarter</option>
            <option value="year">Past Year</option>
            <option value="all">All Time</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Report
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Resolved</p>
          <p className="text-3xl font-bold text-gray-900">{totalResolved}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Positive Outcomes</p>
          <p className="text-3xl font-bold text-green-600">{((positiveOutcomes / totalResolved) * 100).toFixed(0)}%</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Avg. Days to Resolve</p>
          <p className="text-3xl font-bold text-blue-600">{avgDaysOverall.toFixed(1)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Found Safe Rate</p>
          <p className="text-3xl font-bold text-green-600">{stats.find((s) => s.type === "found_safe")?.percentage || 0}%</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          {[
            { id: "overview", label: "Overview" },
            { id: "cases", label: "Resolved Cases" },
            { id: "analytics", label: "Analytics" },
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

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Disposition Breakdown */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Disposition Breakdown</h2>
            <div className="space-y-3">
              {stats.map((stat) => (
                <div key={stat.type} className="flex items-center gap-4">
                  <div className="w-32">
                    <span className={`px-2 py-1 text-xs rounded ${getDispositionColor(stat.type)}`}>
                      {DISPOSITION_LABELS[stat.type]}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full ${
                            ["found_safe", "returned_home", "runaway_resolved"].includes(stat.type)
                              ? "bg-green-500"
                              : stat.type === "found_deceased"
                              ? "bg-gray-800"
                              : "bg-blue-500"
                          }`}
                          style={{ width: `${stat.percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-16 text-right">{stat.count} ({stat.percentage}%)</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Resolutions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Resolutions</h2>
            <div className="space-y-3">
              {dispositions.slice(0, 5).map((disp) => (
                <div
                  key={disp.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                  onClick={() => setSelectedDisposition(disp)}
                >
                  <div>
                    <p className="font-medium text-gray-900">{disp.caseName}</p>
                    <p className="text-sm text-gray-500">{disp.caseType} &bull; Age {disp.age}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 text-xs rounded ${getDispositionColor(disp.disposition)}`}>
                      {DISPOSITION_LABELS[disp.disposition]}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">{disp.daysOpen} days</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Time to Resolution */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Average Time to Resolution</h2>
            <div className="space-y-3">
              {stats
                .sort((a, b) => a.avgDaysToResolve - b.avgDaysToResolve)
                .map((stat) => (
                  <div key={stat.type} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{DISPOSITION_LABELS[stat.type]}</span>
                    <span className="font-medium">{stat.avgDaysToResolve.toFixed(1)} days</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Resolution Methods */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Resolution Methods</h2>
            <div className="space-y-3">
              {[
                { method: "Family Contact", count: 28 },
                { method: "Police Recovery", count: 24 },
                { method: "Self-Return", count: 22 },
                { method: "System Match", count: 18 },
                { method: "Hospital Match", count: 12 },
                { method: "Tip Line", count: 8 },
                { method: "Other", count: 7 },
              ].map((item) => (
                <div key={item.method} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{item.method}</span>
                  <span className="font-medium">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Cases Tab */}
      {activeTab === "cases" && (
        <div>
          {/* Filter */}
          <div className="mb-6">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as DispositionType | "all")}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Dispositions</option>
              {Object.entries(DISPOSITION_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Cases List */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Case</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Disposition</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Days Open</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Resolved By</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredDispositions.map((disp) => (
                  <tr
                    key={disp.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedDisposition(disp)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{disp.caseName}</p>
                      <p className="text-sm text-gray-500">Age {disp.age}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{disp.caseType}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded ${getDispositionColor(disp.disposition)}`}>
                        {DISPOSITION_LABELS[disp.disposition]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{disp.daysOpen}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{disp.resolvedBy}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(disp.dispositionDate).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === "analytics" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Trends Over Time</h2>
            <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
              Chart: Resolution trends by month
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Outcome by Age Group</h2>
            <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
              Chart: Outcomes segmented by age
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Resolution Time Distribution</h2>
            <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
              Chart: Histogram of days to resolution
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Geographic Distribution</h2>
            <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
              Map: Resolution locations
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedDisposition && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-lg w-full mx-4">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Case Resolution Details</h2>
              <button onClick={() => setSelectedDisposition(null)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedDisposition.caseName}</h3>
                  <p className="text-gray-500">{selectedDisposition.caseType} &bull; Age {selectedDisposition.age}</p>
                </div>
                <span className={`px-3 py-1 rounded ${getDispositionColor(selectedDisposition.disposition)}`}>
                  {DISPOSITION_LABELS[selectedDisposition.disposition]}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <p className="text-gray-500">Days Open</p>
                  <p className="font-medium">{selectedDisposition.daysOpen}</p>
                </div>
                <div>
                  <p className="text-gray-500">Resolution Date</p>
                  <p className="font-medium">{new Date(selectedDisposition.dispositionDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-gray-500">Resolved By</p>
                  <p className="font-medium">{selectedDisposition.resolvedBy}</p>
                </div>
                {selectedDisposition.location && (
                  <div>
                    <p className="text-gray-500">Location</p>
                    <p className="font-medium">{selectedDisposition.location}</p>
                  </div>
                )}
              </div>

              {selectedDisposition.notes && (
                <div>
                  <p className="text-gray-500 text-sm mb-1">Notes</p>
                  <p className="text-gray-700 bg-gray-50 rounded-lg p-3">{selectedDisposition.notes}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">View Full Case</button>
              <button
                onClick={() => setSelectedDisposition(null)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
