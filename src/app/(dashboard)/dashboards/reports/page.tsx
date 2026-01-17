"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib";
import type {
  ScheduledReport,
  GeneratedReport,
  ReportGenerationRequest,
  ReportGenerationResponse,
} from "@/types/dashboard.types";

type ReportType =
  | "executive_summary"
  | "case_metrics"
  | "staff_productivity"
  | "partner_engagement"
  | "geographic_analysis"
  | "sla_compliance"
  | "comprehensive";

type ReportFormat = "pdf" | "csv" | "excel";

const reportTypeOptions: { value: ReportType; label: string; description: string }[] = [
  {
    value: "executive_summary",
    label: "Executive Summary",
    description: "High-level KPIs, trends, and strategic insights",
  },
  {
    value: "case_metrics",
    label: "Case Metrics Report",
    description: "Detailed case statistics, resolution rates, and outcomes",
  },
  {
    value: "staff_productivity",
    label: "Staff Productivity Report",
    description: "Agent performance, workload distribution, and efficiency metrics",
  },
  {
    value: "partner_engagement",
    label: "Partner Engagement Report",
    description: "Collaboration metrics with partner organizations",
  },
  {
    value: "geographic_analysis",
    label: "Geographic Analysis",
    description: "Regional distribution and location-based insights",
  },
  {
    value: "sla_compliance",
    label: "SLA Compliance Report",
    description: "Service level agreement adherence and violations",
  },
  {
    value: "comprehensive",
    label: "Comprehensive Report",
    description: "Complete organizational report with all metrics",
  },
];

const formatOptions: { value: ReportFormat; label: string; icon: string }[] = [
  { value: "pdf", label: "PDF Document", icon: "PDF" },
  { value: "csv", label: "CSV Spreadsheet", icon: "CSV" },
  { value: "excel", label: "Excel Workbook", icon: "XLS" },
];

export default function StakeholderReportsPage() {
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"generate" | "scheduled" | "history">("generate");

  // Form state
  const [reportType, setReportType] = useState<ReportType>("executive_summary");
  const [format, setFormat] = useState<ReportFormat>("pdf");
  const [dateFrom, setDateFrom] = useState(getDefaultDateFrom());
  const [dateTo, setDateTo] = useState(getDefaultDateTo());
  const [includeBranding, setIncludeBranding] = useState(true);
  const [includeCharts, setIncludeCharts] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  async function fetchReports() {
    try {
      setLoading(true);
      const response = await fetch("/api/dashboard/reports?type=all&limit=50");
      if (!response.ok) throw new Error("Failed to fetch reports");
      const data = await response.json();
      setScheduledReports(data.scheduledReports || []);
      setGeneratedReports(data.generatedReports || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateReport() {
    try {
      setGenerating(true);
      setError(null);

      const request: ReportGenerationRequest = {
        reportType,
        dateFrom,
        dateTo,
        format,
        customFilters: {
          includeBranding,
          includeCharts,
        },
      };

      const response = await fetch("/api/dashboard/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to generate report");
      }

      const result: ReportGenerationResponse = await response.json();

      // Refresh the reports list
      await fetchReports();

      // If PDF, trigger download
      if (format === "pdf" && result.fileUrl) {
        window.open(result.fileUrl, "_blank");
      }

      setActiveTab("history");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading reports...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stakeholder Reports</h1>
          <p className="mt-1 text-sm text-gray-500">
            Generate, schedule, and manage organizational reports with PDF export
          </p>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-700">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: "generate", name: "Generate Report", count: null },
            { id: "scheduled", name: "Scheduled Reports", count: scheduledReports.length },
            { id: "history", name: "Report History", count: generatedReports.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                "whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium",
                activeTab === tab.id
                  ? "border-cyan-500 text-cyan-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              )}
            >
              {tab.name}
              {tab.count !== null && (
                <span
                  className={cn(
                    "ml-2 rounded-full py-0.5 px-2 text-xs",
                    activeTab === tab.id
                      ? "bg-cyan-100 text-cyan-600"
                      : "bg-gray-100 text-gray-500"
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Generate Report Tab */}
      {activeTab === "generate" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Report Configuration */}
          <div className="lg:col-span-2 space-y-6">
            {/* Report Type Selection */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Type</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {reportTypeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setReportType(option.value)}
                    className={cn(
                      "rounded-lg border-2 p-4 text-left transition-all",
                      reportType === option.value
                        ? "border-cyan-500 bg-cyan-50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <p
                      className={cn(
                        "font-medium",
                        reportType === option.value ? "text-cyan-900" : "text-gray-900"
                      )}
                    >
                      {option.label}
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-xs",
                        reportType === option.value ? "text-cyan-700" : "text-gray-500"
                      )}
                    >
                      {option.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Date Range</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>
              {/* Quick Date Presets */}
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  { label: "Last 7 Days", days: 7 },
                  { label: "Last 30 Days", days: 30 },
                  { label: "Last Quarter", days: 90 },
                  { label: "Year to Date", days: 365 },
                ].map((preset) => (
                  <button
                    key={preset.days}
                    onClick={() => {
                      const to = new Date();
                      const from = new Date();
                      from.setDate(from.getDate() - preset.days);
                      setDateFrom(from.toISOString().split("T")[0]);
                      setDateTo(to.toISOString().split("T")[0]);
                    }}
                    className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Export Options */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Options</h3>
              <div className="space-y-4">
                {/* Format Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Export Format
                  </label>
                  <div className="flex gap-3">
                    {formatOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setFormat(option.value)}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border-2 px-4 py-3 transition-all",
                          format === option.value
                            ? "border-cyan-500 bg-cyan-50"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <span
                          className={cn(
                            "rounded bg-gray-200 px-2 py-1 text-xs font-bold",
                            format === option.value && "bg-cyan-200 text-cyan-800"
                          )}
                        >
                          {option.icon}
                        </span>
                        <span
                          className={cn(
                            "text-sm font-medium",
                            format === option.value ? "text-cyan-900" : "text-gray-700"
                          )}
                        >
                          {option.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* PDF-specific options */}
                {format === "pdf" && (
                  <div className="mt-4 space-y-3 rounded-lg bg-gray-50 p-4">
                    <p className="text-sm font-medium text-gray-700">PDF Options</p>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={includeBranding}
                        onChange={(e) => setIncludeBranding(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                      />
                      <span className="text-sm text-gray-700">
                        Include LocateConnect branding and logo
                      </span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={includeCharts}
                        onChange={(e) => setIncludeCharts(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                      />
                      <span className="text-sm text-gray-700">
                        Include charts and visualizations
                      </span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Preview & Generate */}
          <div className="space-y-6">
            {/* Report Preview Card */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Preview</h3>
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-100">
                    <DocumentIcon className="h-6 w-6 text-cyan-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {reportTypeOptions.find((r) => r.value === reportType)?.label}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format.toUpperCase()} format
                    </p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Date Range:</span>
                    <span className="font-medium text-gray-900">
                      {formatDate(dateFrom)} - {formatDate(dateTo)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Estimated Size:</span>
                    <span className="font-medium text-gray-900">~2-5 MB</span>
                  </div>
                  {format === "pdf" && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Branding:</span>
                        <span className="font-medium text-gray-900">
                          {includeBranding ? "Yes" : "No"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Charts:</span>
                        <span className="font-medium text-gray-900">
                          {includeCharts ? "Included" : "Excluded"}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={handleGenerateReport}
                disabled={generating}
                className={cn(
                  "mt-4 w-full rounded-lg px-4 py-3 text-sm font-medium text-white transition-colors",
                  generating
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-cyan-600 hover:bg-cyan-700"
                )}
              >
                {generating ? (
                  <span className="flex items-center justify-center gap-2">
                    <LoadingSpinner />
                    Generating Report...
                  </span>
                ) : (
                  "Generate Report"
                )}
              </button>
            </div>

            {/* Recent Reports Quick Access */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Reports</h3>
              {generatedReports.length > 0 ? (
                <div className="space-y-3">
                  {generatedReports.slice(0, 3).map((report) => (
                    <div
                      key={report.id}
                      className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-gray-100">
                          <span className="text-xs font-bold text-gray-600">
                            {report.format?.toUpperCase() || "PDF"}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 truncate max-w-32">
                            {report.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(report.createdAt)}
                          </p>
                        </div>
                      </div>
                      {report.fileUrl && (
                        <a
                          href={report.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-600 hover:text-cyan-700"
                        >
                          <DownloadIcon className="h-5 w-5" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No reports generated yet
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Scheduled Reports Tab */}
      {activeTab === "scheduled" && (
        <div className="space-y-6">
          {/* Schedule New Report Button */}
          <div className="flex justify-end">
            <button className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700">
              Schedule New Report
            </button>
          </div>

          {/* Scheduled Reports List */}
          {scheduledReports.length > 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Report
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Frequency
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Next Run
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Recipients
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {scheduledReports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{report.name}</p>
                          <p className="text-sm text-gray-500">{report.reportType}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 capitalize">
                        {report.frequency}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {report.nextRunAt ? formatDateTime(report.nextRunAt) : "-"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex -space-x-1">
                          {(report.recipients || []).slice(0, 3).map((_, idx) => (
                            <div
                              key={idx}
                              className="h-6 w-6 rounded-full bg-gray-300 border-2 border-white"
                            />
                          ))}
                          {(report.recipients?.length || 0) > 3 && (
                            <div className="h-6 w-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                              <span className="text-xs text-gray-600">
                                +{(report.recipients?.length || 0) - 3}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-1 text-xs font-medium",
                            report.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          )}
                        >
                          {report.isActive ? "Active" : "Paused"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-cyan-600 hover:text-cyan-700 text-sm font-medium">
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
              <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                No Scheduled Reports
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Set up automated report delivery to stakeholders on a regular schedule.
              </p>
              <button className="mt-4 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700">
                Schedule Your First Report
              </button>
            </div>
          )}
        </div>
      )}

      {/* Report History Tab */}
      {activeTab === "history" && (
        <div className="space-y-6">
          {generatedReports.length > 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Report
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Date Range
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Generated
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {generatedReports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                            <span className="text-xs font-bold text-gray-600">
                              {report.format?.toUpperCase() || "PDF"}
                            </span>
                          </div>
                          <p className="font-medium text-gray-900">{report.name}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 capitalize">
                        {report.reportType?.replace(/_/g, " ")}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {report.dateFrom && report.dateTo
                          ? `${formatDate(report.dateFrom)} - ${formatDate(report.dateTo)}`
                          : "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDateTime(report.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <DeliveryStatusBadge status={report.deliveryStatus} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {report.fileUrl && (
                            <a
                              href={report.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg bg-cyan-50 px-3 py-1.5 text-sm font-medium text-cyan-600 hover:bg-cyan-100"
                            >
                              Download
                            </a>
                          )}
                          <button className="text-gray-400 hover:text-gray-600">
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
              <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                No Reports Generated
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Generate your first report to see it here.
              </p>
              <button
                onClick={() => setActiveTab("generate")}
                className="mt-4 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
              >
                Generate a Report
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper Components
function DeliveryStatusBadge({ status }: { status?: string }) {
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Pending" },
    completed: { bg: "bg-green-100", text: "text-green-700", label: "Completed" },
    delivered: { bg: "bg-green-100", text: "text-green-700", label: "Delivered" },
    failed: { bg: "bg-red-100", text: "text-red-700", label: "Failed" },
  };

  const config = statusConfig[status || "pending"] || statusConfig.pending;

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-1 text-xs font-medium",
        config.bg,
        config.text
      )}
    >
      {config.label}
    </span>
  );
}

function LoadingSpinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// Helper Functions
function getDefaultDateFrom(): string {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().split("T")[0];
}

function getDefaultDateTo(): string {
  return new Date().toISOString().split("T")[0];
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Icons
function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  );
}
