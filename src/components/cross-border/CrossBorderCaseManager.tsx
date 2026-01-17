"use client";

import { useState, useEffect } from "react";

interface CrossBorderCase {
  id: string;
  primary_case_id: string;
  lead_jurisdiction_id: string;
  coordinator_id: string;
  status: string;
  cross_border_notes: string;
  created_at: string;
  updated_at: string;
  primary_case?: {
    id: string;
    case_number: string;
    status: string;
  };
  lead_jurisdiction?: {
    id: string;
    name: string;
    country: string;
  };
  coordinator?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export default function CrossBorderCaseManager() {
  const [cases, setCases] = useState<CrossBorderCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetchCases();
  }, [filter]);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== "all") {
        params.append("status", filter);
      }

      const response = await fetch(`/api/cross-border/cases?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch cases");
      }

      const result = await response.json();
      setCases(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "resolved":
        return "bg-blue-100 text-blue-800";
      case "transferred":
        return "bg-yellow-100 text-yellow-800";
      case "closed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

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
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">
          Multi-Jurisdiction Cases
        </h2>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          onClick={() => {/* TODO: Open create modal */}}
        >
          Create Cross-Border Case
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-lg ${
            filter === "all"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter("active")}
          className={`px-4 py-2 rounded-lg ${
            filter === "active"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Active
        </button>
        <button
          onClick={() => setFilter("resolved")}
          className={`px-4 py-2 rounded-lg ${
            filter === "resolved"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Resolved
        </button>
        <button
          onClick={() => setFilter("transferred")}
          className={`px-4 py-2 rounded-lg ${
            filter === "transferred"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Transferred
        </button>
      </div>

      {/* Cases List */}
      {cases.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-600">
          No cross-border cases found. Create a new case to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {cases.map((caseItem) => (
            <div
              key={caseItem.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Case #{caseItem.primary_case?.case_number || caseItem.primary_case_id.substring(0, 8)}
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(
                        caseItem.status
                      )}`}
                    >
                      {caseItem.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex items-center gap-2">
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
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <span>
                        Lead: {caseItem.lead_jurisdiction?.name || "Unknown"},{" "}
                        {caseItem.lead_jurisdiction?.country || ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
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
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      <span>
                        Coordinator: {caseItem.coordinator?.first_name}{" "}
                        {caseItem.coordinator?.last_name}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    onClick={() => {/* TODO: View details */}}
                  >
                    View Details
                  </button>
                </div>
              </div>

              {caseItem.cross_border_notes && (
                <div className="mt-4 p-3 bg-gray-50 rounded text-sm text-gray-700">
                  <strong>Notes:</strong> {caseItem.cross_border_notes}
                </div>
              )}

              <div className="mt-4 text-xs text-gray-500">
                Created: {new Date(caseItem.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
