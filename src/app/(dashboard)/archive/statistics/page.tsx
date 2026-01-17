"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib";

interface OverviewStats {
  totalCases: number;
  totalCaseStudies: number;
  activePartnerships: number;
  totalResearchers: number;
  casesThisYear: number;
  resolutionRate: number;
}

interface DispositionStat {
  disposition: string;
  count: number;
  percentage: number;
}

interface ProvinceStat {
  province: string;
  totalCases: number;
  resolvedCases: number;
  resolutionRate: number;
  averageDaysToResolution: number | null;
}

interface YearStat {
  year: number;
  totalCases: number;
  byDisposition: Record<string, number>;
}

interface RiskFactorStat {
  factor: string;
  count: number;
  percentage: number;
}

interface ResolutionTimeStat {
  category: string;
  count: number;
  averageDays: number;
  medianDays: number;
  minDays: number;
  maxDays: number;
}

export default function StatisticsPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [dispositions, setDispositions] = useState<DispositionStat[]>([]);
  const [provinces, setProvinces] = useState<ProvinceStat[]>([]);
  const [years, setYears] = useState<YearStat[]>([]);
  const [riskFactors, setRiskFactors] = useState<RiskFactorStat[]>([]);
  const [resolutionTimes, setResolutionTimes] = useState<ResolutionTimeStat[]>([]);

  useEffect(() => {
    fetchStatistics(activeTab);
  }, [activeTab]);

  const fetchStatistics = async (type: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/archive/statistics?type=${type}`);
      const data = await response.json();

      switch (type) {
        case "overview":
          setOverview(data);
          break;
        case "by_disposition":
          setDispositions(data.dispositions || []);
          break;
        case "by_province":
          setProvinces(data.provinces || []);
          break;
        case "by_year":
          setYears(data.years || []);
          break;
        case "risk_factors":
          setRiskFactors(data.riskFactors || []);
          break;
        case "resolution_time":
          setResolutionTimes(data.resolutionTimes || []);
          break;
      }
    } catch (error) {
      console.error("Failed to fetch statistics:", error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "by_disposition", label: "By Outcome" },
    { id: "by_province", label: "By Province" },
    { id: "by_year", label: "By Year" },
    { id: "risk_factors", label: "Risk Factors" },
    { id: "resolution_time", label: "Resolution Time" },
  ];

  const getDispositionLabel = (disposition: string) => {
    const labels: Record<string, string> = {
      found_alive_safe: "Found Alive - Safe",
      found_alive_injured: "Found Alive - Injured",
      found_deceased: "Found Deceased",
      returned_voluntarily: "Returned Voluntarily",
      located_runaway: "Located Runaway",
      located_custody: "Located in Custody",
      located_medical_facility: "Located in Medical Facility",
      located_shelter: "Located in Shelter",
      located_incarcerated: "Located Incarcerated",
      false_report: "False Report",
      other: "Other",
    };
    return labels[disposition] || disposition;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Archive Statistics</h1>
          <p className="mt-1 text-sm text-gray-500">
            Statistical analysis of anonymized historical case data
          </p>
        </div>
        <Link
          href="/archive"
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back to Archive
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium",
                activeTab === tab.id
                  ? "border-cyan-500 text-cyan-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-600 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overview Tab */}
          {activeTab === "overview" && overview && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard
                title="Total Archived Cases"
                value={overview.totalCases.toLocaleString()}
                description="Anonymized cases available for research"
                icon={<ArchiveIcon />}
                color="cyan"
              />
              <StatCard
                title="Case Studies"
                value={overview.totalCaseStudies.toLocaleString()}
                description="Published case studies for training"
                icon={<BookIcon />}
                color="teal"
              />
              <StatCard
                title="Active Partnerships"
                value={overview.activePartnerships.toLocaleString()}
                description="Academic and research partners"
                icon={<PartnerIcon />}
                color="purple"
              />
              <StatCard
                title="Active Researchers"
                value={overview.totalResearchers.toLocaleString()}
                description="Approved research access requests"
                icon={<ResearcherIcon />}
                color="blue"
              />
              <StatCard
                title="Cases This Year"
                value={overview.casesThisYear.toLocaleString()}
                description="Cases archived in current year"
                icon={<CalendarIcon />}
                color="green"
              />
              <StatCard
                title="Resolution Rate"
                value={`${overview.resolutionRate}%`}
                description="Cases resolved positively"
                icon={<CheckIcon />}
                color="emerald"
              />
            </div>
          )}

          {/* Disposition Tab */}
          {activeTab === "by_disposition" && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Case Outcomes Distribution</h3>
              <div className="space-y-4">
                {dispositions.map((item) => (
                  <div key={item.disposition} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700">
                        {getDispositionLabel(item.disposition)}
                      </span>
                      <span className="text-gray-500">
                        {item.count.toLocaleString()} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-cyan-500"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Province Tab */}
          {activeTab === "by_province" && (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Province
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Total Cases
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Resolved
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Resolution Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Avg. Days to Resolve
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {provinces.map((prov) => (
                    <tr key={prov.province} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                        {prov.province}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {prov.totalCases.toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {prov.resolvedCases.toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        <span
                          className={cn(
                            "rounded-full px-2 py-1 text-xs font-medium",
                            prov.resolutionRate >= 80
                              ? "bg-green-100 text-green-700"
                              : prov.resolutionRate >= 60
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          )}
                        >
                          {prov.resolutionRate}%
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {prov.averageDaysToResolution || "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Year Tab */}
          {activeTab === "by_year" && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Cases by Year</h3>
              <div className="space-y-3">
                {years.map((year) => (
                  <div key={year.year} className="flex items-center gap-4">
                    <span className="w-16 text-sm font-medium text-gray-700">{year.year}</span>
                    <div className="flex-1">
                      <div className="h-8 w-full overflow-hidden rounded bg-gray-100">
                        <div
                          className="h-full rounded bg-cyan-500"
                          style={{
                            width: `${(year.totalCases / Math.max(...years.map((y) => y.totalCases))) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                    <span className="w-20 text-right text-sm text-gray-500">
                      {year.totalCases.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risk Factors Tab */}
          {activeTab === "risk_factors" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">Risk Factor Prevalence</h3>
                <div className="space-y-4">
                  {riskFactors.map((factor) => (
                    <div key={factor.factor} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700">{factor.factor}</span>
                        <span className="text-gray-500">
                          {factor.count.toLocaleString()} ({factor.percentage}%)
                        </span>
                      </div>
                      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-orange-500"
                          style={{ width: `${factor.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">Key Insights</h3>
                <div className="space-y-4 text-sm text-gray-600">
                  <p>
                    Risk factors help identify vulnerable populations and inform prioritization
                    decisions. This data is used to train law enforcement and develop better
                    response protocols.
                  </p>
                  <div className="rounded-lg bg-amber-50 p-4">
                    <h4 className="font-medium text-amber-800">Research Note</h4>
                    <p className="mt-1 text-amber-700">
                      The presence of multiple risk factors significantly impacts case outcomes.
                      Cases with 3+ risk factors require expedited response protocols.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Resolution Time Tab */}
          {activeTab === "resolution_time" && (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Case Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Count
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Average Days
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Median Days
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Range
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {resolutionTimes.map((item) => (
                    <tr key={item.category} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 capitalize">
                        {item.category.replace(/_/g, " ")}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {item.count.toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {item.averageDays} days
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {item.medianDays} days
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {item.minDays} - {item.maxDays} days
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({
  title,
  value,
  description,
  icon,
  color,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    cyan: "text-cyan-600 bg-cyan-100",
    teal: "text-teal-600 bg-teal-100",
    purple: "text-purple-600 bg-purple-100",
    blue: "text-blue-600 bg-blue-100",
    green: "text-green-600 bg-green-100",
    emerald: "text-emerald-600 bg-emerald-100",
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-start gap-4">
        <div className={cn("rounded-lg p-3", colorClasses[color])}>{icon}</div>
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
          <p className="mt-1 text-xs text-gray-500">{description}</p>
        </div>
      </div>
    </div>
  );
}

// Icon components
function ArchiveIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}

function PartnerIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function ResearcherIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
