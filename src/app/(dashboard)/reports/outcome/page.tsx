"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type {
  CaseOutcomeReportWithRelations,
  OutcomeReportStatus,
  DiscoveryMethod,
} from "@/types/outcome-report.types";

interface OutcomeReportListResponse {
  reports: CaseOutcomeReportWithRelations[];
  total: number;
  page: number;
  pageSize: number;
}

export default function OutcomeReportsPage() {
  const [reports, setReports] = useState<CaseOutcomeReportWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [statusFilter, setStatusFilter] = useState<OutcomeReportStatus | "">("");
  const [discoveryMethodFilter, setDiscoveryMethodFilter] = useState<DiscoveryMethod | "">("");

  useEffect(() => {
    fetchReports();
  }, [page, statusFilter, discoveryMethodFilter]);

  async function fetchReports() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: "20",
      });

      if (statusFilter) params.append("status", statusFilter);
      if (discoveryMethodFilter) params.append("discoveryMethod", discoveryMethodFilter);

      const response = await fetch(`/api/outcome-reports?${params}`);
      if (!response.ok) throw new Error("Failed to fetch reports");

      const data: OutcomeReportListResponse = await response.json();
      setReports(data.reports);
      setTotalPages(Math.ceil(data.total / data.pageSize));
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Case Outcome Reports</h1>
          <p className="text-sm text-gray-600 mt-1">
            Detailed analysis and learning from resolved cases
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/reports/outcome/analytics"
            className="px-4 py-2 text-sm font-medium text-cyan-600 bg-cyan-50 rounded-lg hover:bg-cyan-100"
          >
            View Analytics
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OutcomeReportStatus | "")}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="pending_review">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Discovery Method
            </label>
            <select
              value={discoveryMethodFilter}
              onChange={(e) =>
                setDiscoveryMethodFilter(e.target.value as DiscoveryMethod | "")
              }
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            >
              <option value="">All Methods</option>
              <option value="lead_from_public">Lead from Public</option>
              <option value="lead_from_law_enforcement">Lead from LE</option>
              <option value="tip_anonymous">Anonymous Tip</option>
              <option value="tip_identified">Identified Tip</option>
              <option value="social_media_monitoring">Social Media</option>
              <option value="self_return">Self Return</option>
              <option value="patrol_encounter">Patrol Encounter</option>
              <option value="other">Other</option>
            </select>
          </div>

          <button
            onClick={() => {
              setStatusFilter("");
              setDiscoveryMethodFilter("");
              setPage(1);
            }}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
        </div>
      )}

      {/* Reports List */}
      {!loading && !error && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Report
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Case
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Outcome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Leads
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No outcome reports found
                    </td>
                  </tr>
                ) : (
                  reports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {report.reportNumber}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(report.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {report.case?.caseNumber || "N/A"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {report.case?.firstName} {report.case?.lastName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getDispositionStyle(report.case?.disposition)}`}
                        >
                          {formatDisposition(report.case?.disposition)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDuration(report.totalDurationHours)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {report.totalLeadsGenerated} total
                        </div>
                        <div className="text-xs text-gray-500">
                          {report.leadsVerified} verified
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusStyle(report.status)}`}
                        >
                          {formatStatus(report.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/reports/outcome/${report.id}`}
                            className="text-cyan-600 hover:text-cyan-900"
                          >
                            View
                          </Link>
                          <span className="text-gray-300">|</span>
                          <Link
                            href={`/api/outcome-reports/${report.id}/export?format=csv`}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            Export
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper functions
function formatDuration(hours: number): string {
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function formatStatus(status: OutcomeReportStatus): string {
  const labels: Record<OutcomeReportStatus, string> = {
    draft: "Draft",
    pending_review: "Pending Review",
    approved: "Approved",
    archived: "Archived",
  };
  return labels[status] || status;
}

function getStatusStyle(status: OutcomeReportStatus): string {
  const styles: Record<OutcomeReportStatus, string> = {
    draft: "bg-gray-100 text-gray-700",
    pending_review: "bg-amber-100 text-amber-700",
    approved: "bg-green-100 text-green-700",
    archived: "bg-gray-100 text-gray-500",
  };
  return styles[status] || "bg-gray-100 text-gray-700";
}

function formatDisposition(disposition: string | undefined): string {
  const labels: Record<string, string> = {
    found_alive_safe: "Found Safe",
    found_alive_injured: "Found Injured",
    found_deceased: "Deceased",
    returned_voluntarily: "Returned",
    located_runaway: "Runaway",
    located_custody: "In Custody",
    located_medical_facility: "Medical",
    located_shelter: "Shelter",
    located_incarcerated: "Incarcerated",
    false_report: "False Report",
    other: "Other",
  };
  return labels[disposition || ""] || disposition || "Unknown";
}

function getDispositionStyle(disposition: string | undefined): string {
  if (!disposition) return "bg-gray-100 text-gray-700";
  if (disposition.includes("alive_safe") || disposition.includes("returned")) {
    return "bg-green-100 text-green-700";
  }
  if (disposition.includes("injured")) {
    return "bg-amber-100 text-amber-700";
  }
  if (disposition.includes("deceased")) {
    return "bg-gray-100 text-gray-700";
  }
  return "bg-gray-100 text-gray-700";
}
