"use client";

import { useState, useEffect } from "react";

interface InternationalAgency {
  id: string;
  name: string;
  name_local?: string;
  country: string;
  region?: string;
  agency_type: string;
  primary_contact?: string;
  email?: string;
  phone?: string;
  emergency_phone?: string;
  website?: string;
  timezone: string;
  primary_language: string;
  secondary_languages?: string[];
  accepts_cross_border_cases: boolean;
  provides_real_time_alerts: boolean;
  has_secure_data_link: boolean;
  is_active: boolean;
}

export default function AgencyDirectory() {
  const [agencies, setAgencies] = useState<InternationalAgency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    country: "",
    agencyType: "",
    isActive: true,
  });

  useEffect(() => {
    fetchAgencies();
  }, [filters]);

  const fetchAgencies = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.country) params.append("country", filters.country);
      if (filters.agencyType) params.append("agencyType", filters.agencyType);
      params.append("isActive", String(filters.isActive));

      const response = await fetch(`/api/cross-border/agencies?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch agencies");
      }

      const result = await response.json();
      setAgencies(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const getAgencyTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      police_department: "Police Department",
      state_police: "State Police",
      federal_agency: "Federal Agency",
      border_services: "Border Services",
      coast_guard: "Coast Guard",
      interpol: "INTERPOL",
      other: "Other",
    };
    return labels[type] || type;
  };

  const countries = Array.from(new Set(agencies.map((a) => a.country))).sort();
  const agencyTypes = [
    "police_department",
    "state_police",
    "federal_agency",
    "border_services",
    "coast_guard",
    "interpol",
    "other",
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          International Agency Directory
        </h2>
        <p className="text-gray-600">
          Partner law enforcement and border agencies
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Country
            </label>
            <select
              value={filters.country}
              onChange={(e) =>
                setFilters({ ...filters, country: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Countries</option>
              {countries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Agency Type
            </label>
            <select
              value={filters.agencyType}
              onChange={(e) =>
                setFilters({ ...filters, agencyType: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Types</option>
              {agencyTypes.map((type) => (
                <option key={type} value={type}>
                  {getAgencyTypeLabel(type)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={filters.isActive}
                onChange={(e) =>
                  setFilters({ ...filters, isActive: e.target.checked })
                }
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Active agencies only
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Agencies List */}
      {agencies.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-600">
          No agencies found matching your criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agencies.map((agency) => (
            <div
              key={agency.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {agency.name}
                  </h3>
                  {agency.name_local && (
                    <p className="text-sm text-gray-600 italic mb-2">
                      {agency.name_local}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      {getAgencyTypeLabel(agency.agency_type)}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                      {agency.country}
                    </span>
                  </div>
                </div>
                {!agency.is_active && (
                  <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                    Inactive
                  </span>
                )}
              </div>

              <div className="space-y-2 text-sm">
                {agency.email && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    <a
                      href={`mailto:${agency.email}`}
                      className="text-blue-600 hover:underline"
                    >
                      {agency.email}
                    </a>
                  </div>
                )}

                {agency.phone && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                    <span>{agency.phone}</span>
                  </div>
                )}

                {agency.emergency_phone && (
                  <div className="flex items-center gap-2 text-red-600">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <span className="font-medium">
                      Emergency: {agency.emergency_phone}
                    </span>
                  </div>
                )}

                {agency.website && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                      />
                    </svg>
                    <a
                      href={agency.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Visit Website
                    </a>
                  </div>
                )}
              </div>

              {/* Capabilities */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex flex-wrap gap-2 text-xs">
                  {agency.accepts_cross_border_cases && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                      Accepts Cross-Border Cases
                    </span>
                  )}
                  {agency.provides_real_time_alerts && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">
                      Real-Time Alerts
                    </span>
                  )}
                  {agency.has_secure_data_link && (
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded">
                      Secure Data Link
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-3 text-xs text-gray-500">
                Timezone: {agency.timezone} • Language: {agency.primary_language}
                {agency.secondary_languages && agency.secondary_languages.length > 0 &&
                  `, ${agency.secondary_languages.join(", ")}`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
