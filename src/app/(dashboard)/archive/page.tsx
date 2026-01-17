"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib";

interface ArchivedCase {
  id: string;
  archive_number: string;
  case_category: string;
  age_range: string;
  province: string;
  disposition: string;
  year_reported: number;
  days_to_resolution: number;
  was_minor: boolean;
  was_indigenous: boolean;
  amber_alert_issued: boolean;
  research_tags: string[];
  case_study_potential: boolean;
}

interface SearchFilters {
  query: string;
  caseCategory: string;
  province: string;
  disposition: string;
  yearMin: string;
  yearMax: string;
}

const CASE_CATEGORIES = [
  { value: "", label: "All Categories" },
  { value: "missing_minor", label: "Missing Minor" },
  { value: "missing_adult", label: "Missing Adult" },
  { value: "missing_elderly", label: "Missing Elderly" },
  { value: "vulnerable_adult", label: "Vulnerable Adult" },
];

const PROVINCES = [
  { value: "", label: "All Provinces" },
  { value: "QC", label: "Quebec" },
  { value: "ON", label: "Ontario" },
  { value: "BC", label: "British Columbia" },
  { value: "AB", label: "Alberta" },
  { value: "MB", label: "Manitoba" },
  { value: "SK", label: "Saskatchewan" },
  { value: "NS", label: "Nova Scotia" },
  { value: "NB", label: "New Brunswick" },
  { value: "NL", label: "Newfoundland and Labrador" },
  { value: "PE", label: "Prince Edward Island" },
];

const DISPOSITIONS = [
  { value: "", label: "All Outcomes" },
  { value: "found_alive_safe", label: "Found Alive - Safe" },
  { value: "found_alive_injured", label: "Found Alive - Injured" },
  { value: "found_deceased", label: "Found Deceased" },
  { value: "returned_voluntarily", label: "Returned Voluntarily" },
  { value: "located_runaway", label: "Located Runaway" },
  { value: "located_custody", label: "Located in Custody" },
];

export default function ArchivePage() {
  const [cases, setCases] = useState<ArchivedCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<SearchFilters>({
    query: "",
    caseCategory: "",
    province: "",
    disposition: "",
    yearMin: "",
    yearMax: "",
  });

  useEffect(() => {
    fetchCases();
  }, [page, filters]);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("pageSize", "20");

      if (filters.query) params.set("query", filters.query);
      if (filters.caseCategory) params.set("caseCategory", filters.caseCategory);
      if (filters.province) params.set("province", filters.province);
      if (filters.disposition) params.set("disposition", filters.disposition);
      if (filters.yearMin) params.set("yearMin", filters.yearMin);
      if (filters.yearMax) params.set("yearMax", filters.yearMax);

      const response = await fetch(`/api/archive?${params.toString()}`);
      const data = await response.json();

      setCases(data.cases || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Failed to fetch archived cases:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const getDispositionBadge = (disposition: string) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      found_alive_safe: { bg: "bg-green-100", text: "text-green-700", label: "Found Safe" },
      found_alive_injured: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Found Injured" },
      found_deceased: { bg: "bg-gray-100", text: "text-gray-700", label: "Deceased" },
      returned_voluntarily: { bg: "bg-blue-100", text: "text-blue-700", label: "Returned" },
      located_runaway: { bg: "bg-purple-100", text: "text-purple-700", label: "Runaway" },
      located_custody: { bg: "bg-orange-100", text: "text-orange-700", label: "In Custody" },
    };
    const style = config[disposition] || { bg: "bg-gray-100", text: "text-gray-700", label: disposition };
    return (
      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", style.bg, style.text)}>
        {style.label}
      </span>
    );
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      missing_minor: "Minor",
      missing_adult: "Adult",
      missing_elderly: "Elderly",
      vulnerable_adult: "Vulnerable Adult",
    };
    return labels[category] || category;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Historical Case Archive</h1>
          <p className="mt-1 text-sm text-gray-500">
            Searchable database of anonymized resolved cases for research and training
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/archive/statistics"
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            View Statistics
          </Link>
          <Link
            href="/archive/case-studies"
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
          >
            Case Studies
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-medium text-gray-500">Total Archived Cases</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{total.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-medium text-gray-500">Case Studies Available</p>
          <p className="mt-1 text-3xl font-bold text-cyan-600">--</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-medium text-gray-500">Research Partners</p>
          <p className="mt-1 text-3xl font-bold text-teal-600">--</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-medium text-gray-500">Active Researchers</p>
          <p className="mt-1 text-3xl font-bold text-purple-600">--</p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Search & Filter</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Search</label>
            <input
              type="text"
              value={filters.query}
              onChange={(e) => handleFilterChange("query", e.target.value)}
              placeholder="Keywords..."
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <select
              value={filters.caseCategory}
              onChange={(e) => handleFilterChange("caseCategory", e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              {CASE_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Province</label>
            <select
              value={filters.province}
              onChange={(e) => handleFilterChange("province", e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              {PROVINCES.map((prov) => (
                <option key={prov.value} value={prov.value}>
                  {prov.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Outcome</label>
            <select
              value={filters.disposition}
              onChange={(e) => handleFilterChange("disposition", e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              {DISPOSITIONS.map((disp) => (
                <option key={disp.value} value={disp.value}>
                  {disp.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Year From</label>
            <input
              type="number"
              value={filters.yearMin}
              onChange={(e) => handleFilterChange("yearMin", e.target.value)}
              placeholder="2000"
              min="1990"
              max="2030"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Year To</label>
            <input
              type="number"
              value={filters.yearMax}
              onChange={(e) => handleFilterChange("yearMax", e.target.value)}
              placeholder="2024"
              min="1990"
              max="2030"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              {loading ? "Loading..." : `${total.toLocaleString()} Cases Found`}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Page {page}</span>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-gray-200 px-3 py-1 text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={cases.length < 20}
                className="rounded-lg border border-gray-200 px-3 py-1 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-600 border-t-transparent" />
          </div>
        ) : cases.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-gray-500">
            <svg className="h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-lg font-medium">No archived cases found</p>
            <p className="text-sm">Try adjusting your search filters</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {cases.map((caseItem) => (
              <div key={caseItem.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-gray-500">{caseItem.archive_number}</span>
                      {getDispositionBadge(caseItem.disposition)}
                      {caseItem.case_study_potential && (
                        <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-medium text-cyan-700">
                          Case Study Available
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <CategoryIcon />
                        {getCategoryLabel(caseItem.case_category)}
                      </span>
                      {caseItem.age_range && (
                        <span className="flex items-center gap-1">
                          <AgeIcon />
                          Age: {caseItem.age_range}
                        </span>
                      )}
                      {caseItem.province && (
                        <span className="flex items-center gap-1">
                          <LocationIcon />
                          {caseItem.province}
                        </span>
                      )}
                      {caseItem.year_reported && (
                        <span className="flex items-center gap-1">
                          <CalendarIcon />
                          {caseItem.year_reported}
                        </span>
                      )}
                      {caseItem.days_to_resolution && (
                        <span className="flex items-center gap-1">
                          <ClockIcon />
                          {caseItem.days_to_resolution} days to resolution
                        </span>
                      )}
                    </div>
                    {caseItem.research_tags?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {caseItem.research_tags.slice(0, 5).map((tag) => (
                          <span
                            key={tag}
                            className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {caseItem.was_minor && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        Minor
                      </span>
                    )}
                    {caseItem.was_indigenous && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        Indigenous
                      </span>
                    )}
                    {caseItem.amber_alert_issued && (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                        AMBER Alert
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Privacy Notice */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex gap-3">
          <InfoIcon className="h-5 w-5 flex-shrink-0 text-blue-600" />
          <div>
            <h4 className="font-medium text-blue-800">Privacy Protected Data</h4>
            <p className="mt-1 text-sm text-blue-700">
              All cases in this archive have been anonymized in accordance with privacy regulations.
              Personal identifying information has been removed or generalized. Families can opt-out
              of having their case included in research activities.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Icon components
function CategoryIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  );
}

function AgeIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
