// AMBER Alert Criteria Validation Component
// LC-FEAT-026: AMBER Alert Integration
// Visual checklist for AMBER Alert eligibility

"use client";

import { useState, useEffect } from "react";
import type { AmberAlertCriteriaCheck } from "@/types/amber-alert.types";

interface AmberAlertCriteriaProps {
  caseId: string;
  onEligibilityChange?: (eligible: boolean) => void;
}

/**
 * AMBER Alert Criteria Validation Checklist
 */
export function AmberAlertCriteria({
  caseId,
  onEligibilityChange,
}: AmberAlertCriteriaProps) {
  const [criteria, setCriteria] = useState<AmberAlertCriteriaCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCriteria = async () => {
      try {
        const response = await fetch(`/api/cases/${caseId}/amber-criteria`);
        if (!response.ok) {
          throw new Error("Failed to fetch criteria");
        }
        const data = await response.json();
        setCriteria(data);
        if (onEligibilityChange) {
          onEligibilityChange(data.meets_criteria);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchCriteria();
  }, [caseId, onEligibilityChange]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !criteria) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading criteria: {error}</p>
      </div>
    );
  }

  const criteriaItems = [
    {
      label: "Child is under 18 years old",
      met: criteria.criteria_breakdown.child_under_18,
      detail: criteria.case_details.child_age
        ? `Current age: ${criteria.case_details.child_age}`
        : "Age not available",
    },
    {
      label: "Abduction has been confirmed",
      met: criteria.criteria_breakdown.abduction_confirmed,
      detail: criteria.case_details.suspected_abduction
        ? "Case flagged as suspected abduction"
        : "No abduction flag set",
    },
    {
      label: "Sufficient information available",
      met: criteria.criteria_breakdown.sufficient_info,
      detail: "Name, description, and last seen details",
    },
    {
      label: "Recent abduction with timeline",
      met: criteria.criteria_breakdown.recent_abduction,
      detail: criteria.case_details.last_seen
        ? `Last seen: ${new Date(criteria.case_details.last_seen).toLocaleDateString()}`
        : "No last seen date",
    },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div
        className={`px-6 py-4 ${
          criteria.meets_criteria
            ? "bg-green-50 border-b border-green-200"
            : "bg-amber-50 border-b border-amber-200"
        }`}
      >
        <div className="flex items-center gap-3">
          {criteria.meets_criteria ? (
            <svg
              className="w-6 h-6 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ) : (
            <svg
              className="w-6 h-6 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          )}
          <div>
            <h3
              className={`font-semibold ${
                criteria.meets_criteria ? "text-green-900" : "text-amber-900"
              }`}
            >
              AMBER Alert Criteria
            </h3>
            <p
              className={`text-sm ${
                criteria.meets_criteria ? "text-green-700" : "text-amber-700"
              }`}
            >
              {criteria.meets_criteria
                ? "This case meets AMBER Alert criteria"
                : "Some criteria are not met"}
            </p>
          </div>
        </div>
      </div>

      {/* Criteria Checklist */}
      <div className="p-6">
        <div className="space-y-4">
          {criteriaItems.map((item, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="mt-0.5">
                {item.met ? (
                  <svg
                    className="w-5 h-5 text-green-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5 text-red-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{item.label}</p>
                <p className="text-sm text-gray-600 mt-1">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        {criteria.case_details.has_photo && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-2 text-sm text-green-700">
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>Photo available for alert distribution</span>
            </div>
          </div>
        )}

        {/* Warning for non-eligible cases */}
        {!criteria.meets_criteria && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> AMBER Alerts should only be issued when all
                criteria are met. Cases that don&apos;t meet these criteria may still
                be eligible for other alert systems or public notifications.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
