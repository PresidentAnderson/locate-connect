"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface ResearchExport {
  id: string;
  export_name: string;
  export_format: string;
  export_description: string | null;
  filter_criteria: Record<string, unknown>;
  date_range_start: number | null;
  date_range_end: number | null;
  regions: string[] | null;
  case_types: string[] | null;
  included_fields: string[];
  status: string;
  total_records: number | null;
  file_size_bytes: number | null;
  created_at: string;
  completed_at: string | null;
  expires_at: string | null;
}

const availableFields = [
  { id: "case_category", label: "Case Category" },
  { id: "disposition", label: "Disposition" },
  { id: "year_reported", label: "Year Reported" },
  { id: "year_resolved", label: "Year Resolved" },
  { id: "age_range", label: "Age Range" },
  { id: "gender", label: "Gender" },
  { id: "province", label: "Province" },
  { id: "region_type", label: "Region Type" },
  { id: "risk_factors", label: "Risk Factors" },
  { id: "resolution_time_days", label: "Resolution Time (Days)" },
  { id: "found_circumstances", label: "Found Circumstances" },
  { id: "tags", label: "Tags" },
];

const provinces = [
  { id: "AB", label: "Alberta" },
  { id: "BC", label: "British Columbia" },
  { id: "MB", label: "Manitoba" },
  { id: "NB", label: "New Brunswick" },
  { id: "NL", label: "Newfoundland and Labrador" },
  { id: "NS", label: "Nova Scotia" },
  { id: "NT", label: "Northwest Territories" },
  { id: "NU", label: "Nunavut" },
  { id: "ON", label: "Ontario" },
  { id: "PE", label: "Prince Edward Island" },
  { id: "QC", label: "Quebec" },
  { id: "SK", label: "Saskatchewan" },
  { id: "YT", label: "Yukon" },
];

export default function ExportsPage() {
  const [exports, setExports] = useState<ResearchExport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewExport, setShowNewExport] = useState(false);

  // New export form state
  const [exportName, setExportName] = useState("");
  const [exportDescription, setExportDescription] = useState("");
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");
  const [selectedFields, setSelectedFields] = useState<string[]>([
    "case_category",
    "disposition",
    "year_reported",
    "province",
  ]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [dateRangeStart, setDateRangeStart] = useState("");
  const [dateRangeEnd, setDateRangeEnd] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const fetchExports = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/archive/exports");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch exports");
      }

      setExports(data.exports || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExports();
  }, [fetchExports]);

  const toggleField = (fieldId: string) => {
    setSelectedFields((prev) =>
      prev.includes(fieldId) ? prev.filter((f) => f !== fieldId) : [...prev, fieldId]
    );
  };

  const toggleRegion = (regionId: string) => {
    setSelectedRegions((prev) =>
      prev.includes(regionId) ? prev.filter((r) => r !== regionId) : [...prev, regionId]
    );
  };

  const handleExport = async () => {
    if (!exportName || selectedFields.length === 0) {
      setExportError("Please provide an export name and select at least one field");
      return;
    }

    setExporting(true);
    setExportError(null);

    try {
      const response = await fetch("/api/archive/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exportName,
          exportDescription,
          exportFormat,
          includedFields: selectedFields,
          regions: selectedRegions.length > 0 ? selectedRegions : undefined,
          dateRangeStart: dateRangeStart || undefined,
          dateRangeEnd: dateRangeEnd || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create export");
      }

      // Get the file content
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${exportName}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Reset form and refresh list
      setShowNewExport(false);
      setExportName("");
      setExportDescription("");
      fetchExports();
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setExporting(false);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-CA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "processing":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/research-portal"
            className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Back to Research Portal
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Data Exports</h1>
          <p className="mt-1 text-sm text-gray-600">
            Export anonymized research data in CSV or JSON format
          </p>
        </div>
        <button
          onClick={() => setShowNewExport(!showNewExport)}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-cyan-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Export
        </button>
      </div>

      {/* New Export Form */}
      {showNewExport && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Create New Export</h2>

          {exportError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-800">{exportError}</p>
            </div>
          )}

          <div className="mt-6 space-y-6">
            {/* Basic Info */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Export Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={exportName}
                  onChange={(e) => setExportName(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  placeholder="e.g., ontario_cases_2020_2024"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Format</label>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as "csv" | "json")}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <input
                type="text"
                value={exportDescription}
                onChange={(e) => setExportDescription(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                placeholder="Brief description of this export"
              />
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Date Range (Year Reported)</label>
              <div className="mt-2 grid gap-4 md:grid-cols-2">
                <input
                  type="number"
                  value={dateRangeStart}
                  onChange={(e) => setDateRangeStart(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  placeholder="Start year (e.g., 2000)"
                  min="1990"
                  max="2030"
                />
                <input
                  type="number"
                  value={dateRangeEnd}
                  onChange={(e) => setDateRangeEnd(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  placeholder="End year (e.g., 2024)"
                  min="1990"
                  max="2030"
                />
              </div>
            </div>

            {/* Regions */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Regions (leave empty for all)</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {provinces.map((province) => (
                  <button
                    key={province.id}
                    type="button"
                    onClick={() => toggleRegion(province.id)}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                      selectedRegions.includes(province.id)
                        ? "border-cyan-600 bg-cyan-50 text-cyan-700"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {province.id}
                  </button>
                ))}
              </div>
            </div>

            {/* Fields */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Fields to Include <span className="text-red-500">*</span>
              </label>
              <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
                {availableFields.map((field) => (
                  <label key={field.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedFields.includes(field.id)}
                      onChange={() => toggleField(field.id)}
                      className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                    />
                    <span className="text-sm text-gray-700">{field.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
              <button
                type="button"
                onClick={() => setShowNewExport(false)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting || !exportName || selectedFields.length === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {exporting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Exporting...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Export Data
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Access Notice */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex gap-3">
          <svg className="h-5 w-5 flex-shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
          </svg>
          <div className="text-sm text-amber-800">
            <p className="font-medium">Research Access Required</p>
            <p className="mt-1">
              Data exports are only available for users with an approved research access request.
              If you do not have access, please{" "}
              <Link href="/research-portal/access-request" className="font-medium underline hover:no-underline">
                submit a research access request
              </Link>{" "}
              first.
            </p>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {/* Export History */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Export History</h2>
        </div>

        {loading ? (
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-gray-200" />
                  <div className="flex-1">
                    <div className="h-4 w-1/3 rounded bg-gray-200" />
                    <div className="mt-2 h-3 w-1/4 rounded bg-gray-200" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : exports.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No exports yet</h3>
            <p className="mt-2 text-sm text-gray-600">
              Create your first data export to see it here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {exports.map((exp) => (
              <div key={exp.id} className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                    <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{exp.export_name}</h3>
                    <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
                      <span className="uppercase">{exp.export_format}</span>
                      <span>{formatFileSize(exp.file_size_bytes)}</span>
                      <span>{exp.total_records?.toLocaleString() || 0} records</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadge(exp.status)}`}>
                    {exp.status}
                  </span>
                  <span className="text-sm text-gray-500">{formatDate(exp.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
