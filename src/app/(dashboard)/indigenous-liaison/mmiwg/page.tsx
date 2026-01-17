"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib";

interface MMIWGCase {
  id: string;
  case_id: string;
  classification: string;
  is_mmiwg2s: boolean;
  nation: string | null;
  consultation_status: string;
  created_at: string;
  case: {
    id: string;
    case_number: string;
    first_name: string;
    last_name: string;
    status: string;
    priority_level: string;
  };
  home_community: {
    id: string;
    name: string;
    province: string;
  } | null;
}

interface Statistics {
  totalCases: number;
  activeCases: number;
  resolvedCases: number;
  historicalCases: number;
  casesByClassification: Record<string, number>;
  consultationsCompleted: number;
  consultationsPending: number;
}

const CLASSIFICATION_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  missing: { label: "Missing", color: "text-red-700", bg: "bg-red-100" },
  murdered: { label: "Murdered", color: "text-gray-700", bg: "bg-gray-100" },
  suspicious_death: { label: "Suspicious Death", color: "text-orange-700", bg: "bg-orange-100" },
  unexplained_death: { label: "Unexplained Death", color: "text-yellow-700", bg: "bg-yellow-100" },
  historical_case: { label: "Historical Case", color: "text-purple-700", bg: "bg-purple-100" },
  found_safe: { label: "Found Safe", color: "text-green-700", bg: "bg-green-100" },
  found_deceased: { label: "Found Deceased", color: "text-gray-700", bg: "bg-gray-100" },
  under_investigation: { label: "Under Investigation", color: "text-blue-700", bg: "bg-blue-100" },
};

const CONSULTATION_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  deferred: "Deferred",
  not_required: "Not Required",
};

export default function MMIWGDashboard() {
  const [cases, setCases] = useState<MMIWGCase[]>([]);
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    classification: "",
    consultationStatus: "",
    historical: false,
  });

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        // Fetch statistics
        const statsRes = await fetch("/api/indigenous/mmiwg/statistics");
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData.data);
        } else if (statsRes.status === 403) {
          setError("You do not have permission to view MMIWG cases. This section is restricted to verified law enforcement personnel.");
          setLoading(false);
          return;
        }

        // Fetch cases
        const params = new URLSearchParams();
        if (filters.classification) params.set("classification", filters.classification);
        if (filters.consultationStatus) params.set("consultationStatus", filters.consultationStatus);
        if (filters.historical) params.set("historical", "true");

        const casesRes = await fetch(`/api/indigenous/mmiwg?${params}`);
        if (casesRes.ok) {
          const casesData = await casesRes.json();
          setCases(casesData.data || []);
        }
      } catch (err) {
        console.error("Error fetching MMIWG data:", err);
        setError("Failed to load MMIWG data. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [filters]);

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">MMIWG Case Tracking</h1>
          <p className="mt-1 text-sm text-gray-500">
            Missing and Murdered Indigenous Women, Girls, and 2SLGBTQQIA+ People
          </p>
        </div>
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-8 text-center">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">MMIWG Case Tracking</h1>
          <p className="mt-1 text-sm text-gray-500">
            Missing and Murdered Indigenous Women, Girls, and 2SLGBTQQIA+ People
          </p>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Total Cases"
            value={stats.totalCases}
            color="gray"
          />
          <StatCard
            label="Active Cases"
            value={stats.activeCases}
            color="red"
          />
          <StatCard
            label="Historical Cases"
            value={stats.historicalCases}
            color="purple"
          />
          <StatCard
            label="Consultations Pending"
            value={stats.consultationsPending}
            color="blue"
          />
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Classification
            </label>
            <select
              value={filters.classification}
              onChange={(e) =>
                setFilters({ ...filters, classification: e.target.value })
              }
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">All Classifications</option>
              {Object.entries(CLASSIFICATION_LABELS).map(([value, { label }]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Consultation Status
            </label>
            <select
              value={filters.consultationStatus}
              onChange={(e) =>
                setFilters({ ...filters, consultationStatus: e.target.value })
              }
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">All Statuses</option>
              {Object.entries(CONSULTATION_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.historical}
                onChange={(e) =>
                  setFilters({ ...filters, historical: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300 text-cyan-600"
              />
              <span className="text-sm text-gray-700">Historical Cases Only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Cases List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : cases.length > 0 ? (
        <div className="space-y-4">
          {cases.map((mmiwgCase) => (
            <CaseCard key={mmiwgCase.id} mmiwgCase={mmiwgCase} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-500">No MMIWG cases found matching your criteria.</p>
        </div>
      )}

      {/* Resources Link */}
      <div className="rounded-xl border-2 border-cyan-200 bg-cyan-50 p-6">
        <h3 className="font-semibold text-cyan-900">MMIWG Resources</h3>
        <p className="mt-1 text-sm text-cyan-700">
          Access trauma-informed protocols and cultural sensitivity resources for MMIWG case handling.
        </p>
        <Link
          href="/indigenous-liaison/resources?category=investigation"
          className="mt-3 inline-block text-sm font-medium text-cyan-600 hover:text-cyan-700"
        >
          View Investigation Resources
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "gray" | "red" | "purple" | "blue" | "green";
}) {
  const colorStyles = {
    gray: "text-gray-900",
    red: "text-red-600",
    purple: "text-purple-600",
    blue: "text-cyan-600",
    green: "text-green-600",
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={cn("mt-1 text-3xl font-bold", colorStyles[color])}>
        {value}
      </p>
    </div>
  );
}

function CaseCard({ mmiwgCase }: { mmiwgCase: MMIWGCase }) {
  const classificationInfo = CLASSIFICATION_LABELS[mmiwgCase.classification] || {
    label: mmiwgCase.classification,
    color: "text-gray-700",
    bg: "bg-gray-100",
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
            <span className="text-lg font-bold text-gray-500">
              {mmiwgCase.case?.first_name?.[0]}
              {mmiwgCase.case?.last_name?.[0]}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {mmiwgCase.case?.first_name} {mmiwgCase.case?.last_name}
              </h3>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  classificationInfo.bg,
                  classificationInfo.color
                )}
              >
                {classificationInfo.label}
              </span>
              {mmiwgCase.is_mmiwg2s && (
                <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                  2SLGBTQQIA+
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">
              Case #{mmiwgCase.case?.case_number}
            </p>
            {mmiwgCase.nation && (
              <p className="mt-1 text-sm text-gray-500">
                Nation: {mmiwgCase.nation}
              </p>
            )}
            {mmiwgCase.home_community && (
              <p className="text-sm text-gray-500">
                Community: {mmiwgCase.home_community.name}, {mmiwgCase.home_community.province}
              </p>
            )}
          </div>
        </div>

        <div className="text-right">
          <p className="text-sm text-gray-500">Consultation Status</p>
          <p className="font-medium text-gray-900">
            {CONSULTATION_STATUS_LABELS[mmiwgCase.consultation_status] ||
              mmiwgCase.consultation_status}
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-3 border-t border-gray-100 pt-4">
        <Link
          href={`/cases/${mmiwgCase.case_id}`}
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
        >
          View Case Details
        </Link>
        <Link
          href={`/indigenous-liaison/consultations?caseId=${mmiwgCase.case_id}`}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          View Consultations
        </Link>
      </div>
    </div>
  );
}
