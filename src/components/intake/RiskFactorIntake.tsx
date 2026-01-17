"use client";

import { useState } from "react";
import type {
  RiskFactorInput,
  RiskFactorConsentInput,
  RiskFactorCategory,
  RiskFactorSeverity,
} from "@/types";
import {
  INTERPERSONAL_RISK_TYPES,
  BEHAVIORAL_RISK_TYPES,
  ENVIRONMENTAL_RISK_TYPES,
  HISTORICAL_RISK_TYPES,
  DEFAULT_CONSENT_TEXT,
  RISK_FACTOR_CATEGORIES,
  RISK_FACTOR_SEVERITY_CONFIG,
} from "@/types/risk-factor.types";
import { NON_ACCUSATORY_LANGUAGE } from "@/lib/services/risk-factor-service";

interface RiskFactorIntakeProps {
  onFactorsChange: (factors: RiskFactorInput[]) => void;
  onConsentChange: (consent: RiskFactorConsentInput) => void;
  initialFactors?: RiskFactorInput[];
  initialConsent?: RiskFactorConsentInput;
}

export function RiskFactorIntake({
  onFactorsChange,
  onConsentChange,
  initialFactors = [],
  initialConsent,
}: RiskFactorIntakeProps) {
  const [showSection, setShowSection] = useState(false);
  const [factors, setFactors] = useState<RiskFactorInput[]>(initialFactors);
  const [consent, setConsent] = useState<RiskFactorConsentInput>(
    initialConsent || {
      acknowledgedNonAccusatory: false,
      acknowledgedCorroborationRequired: false,
      acknowledgedLimitedWeight: false,
      acknowledgedPrivacyProtections: false,
      acceptedSensitivityDisclaimer: false,
      acceptedPrivacyPolicy: false,
    }
  );
  const [consentExpanded, setConsentExpanded] = useState(false);

  const handleAddFactor = (category: RiskFactorCategory) => {
    const newFactor: RiskFactorInput = {
      category,
      factorType: "",
      description: "",
      severity: "low",
      behavioralCorrelation: "",
      medicalCorrelation: "",
      supportingEvidence: "",
    };
    const updated = [...factors, newFactor];
    setFactors(updated);
    onFactorsChange(updated);
  };

  const handleUpdateFactor = (
    index: number,
    field: keyof RiskFactorInput,
    value: string
  ) => {
    const updated = factors.map((f, i) =>
      i === index ? { ...f, [field]: value } : f
    );
    setFactors(updated);
    onFactorsChange(updated);
  };

  const handleRemoveFactor = (index: number) => {
    const updated = factors.filter((_, i) => i !== index);
    setFactors(updated);
    onFactorsChange(updated);
  };

  const handleConsentChange = (field: keyof RiskFactorConsentInput, value: boolean) => {
    const updated = { ...consent, [field]: value };
    setConsent(updated);
    onConsentChange(updated);
  };

  const allConsentGiven =
    consent.acknowledgedNonAccusatory &&
    consent.acknowledgedCorroborationRequired &&
    consent.acknowledgedLimitedWeight &&
    consent.acknowledgedPrivacyProtections &&
    consent.acceptedSensitivityDisclaimer &&
    consent.acceptedPrivacyPolicy;

  const getRiskTypeOptions = (category: RiskFactorCategory) => {
    switch (category) {
      case "interpersonal":
        return INTERPERSONAL_RISK_TYPES;
      case "behavioral":
        return BEHAVIORAL_RISK_TYPES;
      case "environmental":
        return ENVIRONMENTAL_RISK_TYPES;
      case "historical":
        return HISTORICAL_RISK_TYPES;
      default:
        return [];
    }
  };

  if (!showSection) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Additional Contextual Information (Optional)
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            You may provide additional contextual information about circumstances,
            relationships, or background that could help in the search. This
            section is completely optional and is handled with enhanced privacy
            protections.
          </p>
          <button
            type="button"
            onClick={() => setShowSection(true)}
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
          >
            Provide Additional Context
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Privacy Notice */}
      <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-blue-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-blue-900 mb-1">
              Privacy & Non-Accusatory Information
            </h4>
            <p className="text-sm text-blue-800">
              {NON_ACCUSATORY_LANGUAGE.disclaimers.beforeSection}
            </p>
          </div>
        </div>
      </div>

      {/* Consent Section */}
      <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Acknowledgment & Consent
        </h3>

        <div className="space-y-3 mb-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consent.acknowledgedNonAccusatory}
              onChange={(e) =>
                handleConsentChange("acknowledgedNonAccusatory", e.target.checked)
              }
              className="mt-1 h-4 w-4 rounded border-gray-300 text-amber-600"
            />
            <span className="text-sm text-gray-700">
              I understand this information is <strong>not meant to accuse or blame</strong> anyone,
              but to provide context that may help in the search.
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consent.acknowledgedCorroborationRequired}
              onChange={(e) =>
                handleConsentChange(
                  "acknowledgedCorroborationRequired",
                  e.target.checked
                )
              }
              className="mt-1 h-4 w-4 rounded border-gray-300 text-amber-600"
            />
            <span className="text-sm text-gray-700">
              I understand this information will <strong>require corroboration</strong> from
              additional sources before being fully relied upon.
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consent.acknowledgedLimitedWeight}
              onChange={(e) =>
                handleConsentChange("acknowledgedLimitedWeight", e.target.checked)
              }
              className="mt-1 h-4 w-4 rounded border-gray-300 text-amber-600"
            />
            <span className="text-sm text-gray-700">
              I understand this information has <strong>limited weight</strong> in priority
              calculations and is used primarily for context.
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consent.acknowledgedPrivacyProtections}
              onChange={(e) =>
                handleConsentChange(
                  "acknowledgedPrivacyProtections",
                  e.target.checked
                )
              }
              className="mt-1 h-4 w-4 rounded border-gray-300 text-amber-600"
            />
            <span className="text-sm text-gray-700">
              I understand this information is stored with{" "}
              <strong>enhanced privacy protections</strong> and will not be shown to law
              enforcement by default.
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consent.acceptedSensitivityDisclaimer}
              onChange={(e) =>
                handleConsentChange(
                  "acceptedSensitivityDisclaimer",
                  e.target.checked
                )
              }
              className="mt-1 h-4 w-4 rounded border-gray-300 text-amber-600"
            />
            <span className="text-sm text-gray-700">
              I understand the sensitive nature of this information and that all access
              is <strong>logged and audited</strong>.
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consent.acceptedPrivacyPolicy}
              onChange={(e) =>
                handleConsentChange("acceptedPrivacyPolicy", e.target.checked)
              }
              className="mt-1 h-4 w-4 rounded border-gray-300 text-amber-600"
            />
            <span className="text-sm text-gray-700">
              I have read and accept the{" "}
              <button
                type="button"
                onClick={() => setConsentExpanded(!consentExpanded)}
                className="text-cyan-600 hover:text-cyan-700 underline"
              >
                privacy policy and consent terms
              </button>
              .
            </span>
          </label>
        </div>

        {consentExpanded && (
          <div className="rounded-lg bg-white border border-amber-200 p-4 mb-4">
            <pre className="text-xs text-gray-700 whitespace-pre-wrap">
              {DEFAULT_CONSENT_TEXT}
            </pre>
          </div>
        )}

        {!allConsentGiven && (
          <p className="text-sm text-amber-700 font-medium">
            Please acknowledge all items above to continue.
          </p>
        )}
      </div>

      {/* Risk Factor Input - Only show if consent given */}
      {allConsentGiven && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Contextual Information
            </h3>

            {factors.length === 0 && (
              <p className="text-sm text-gray-500 mb-4">
                No contextual information added yet. Select a category below to add.
              </p>
            )}

            {/* Existing Factors */}
            {factors.map((factor, index) => (
              <div
                key={index}
                className="rounded-lg border border-gray-200 bg-white p-4 mb-4"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500 uppercase">
                      {RISK_FACTOR_CATEGORIES[factor.category].label}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        RISK_FACTOR_SEVERITY_CONFIG[factor.severity].bgColor
                      } ${RISK_FACTOR_SEVERITY_CONFIG[factor.severity].color}`}
                    >
                      {RISK_FACTOR_SEVERITY_CONFIG[factor.severity].label}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFactor(index)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type of Information
                    </label>
                    <select
                      value={factor.factorType}
                      onChange={(e) =>
                        handleUpdateFactor(index, "factorType", e.target.value)
                      }
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="">Select type...</option>
                      {getRiskTypeOptions(factor.category).map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    {factor.factorType && (
                      <p className="text-xs text-gray-500 mt-1">
                        {
                          getRiskTypeOptions(factor.category).find(
                            (t) => t.value === factor.factorType
                          )?.description
                        }
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (Optional)
                    </label>
                    <textarea
                      value={factor.description}
                      onChange={(e) =>
                        handleUpdateFactor(index, "description", e.target.value)
                      }
                      rows={2}
                      placeholder="Provide context that may be helpful..."
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Severity
                    </label>
                    <select
                      value={factor.severity}
                      onChange={(e) =>
                        handleUpdateFactor(
                          index,
                          "severity",
                          e.target.value as RiskFactorSeverity
                        )
                      }
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  {/* Correlation Fields - Important for visibility */}
                  <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                    <p className="text-xs font-medium text-blue-900 mb-2">
                      Correlation (helps establish relevance)
                    </p>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs text-gray-700 mb-1">
                          Behavioral Correlation (if any)
                        </label>
                        <input
                          type="text"
                          value={factor.behavioralCorrelation}
                          onChange={(e) =>
                            handleUpdateFactor(
                              index,
                              "behavioralCorrelation",
                              e.target.value
                            )
                          }
                          placeholder="e.g., related to change in routine..."
                          className="block w-full rounded border border-gray-300 px-2 py-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-700 mb-1">
                          Medical Correlation (if any)
                        </label>
                        <input
                          type="text"
                          value={factor.medicalCorrelation}
                          onChange={(e) =>
                            handleUpdateFactor(
                              index,
                              "medicalCorrelation",
                              e.target.value
                            )
                          }
                          placeholder="e.g., related to medical condition..."
                          className="block w-full rounded border border-gray-300 px-2 py-1 text-sm"
                        />
                      </div>
                      <p className="text-xs text-blue-700">
                        Information with correlation to behavioral patterns or medical
                        factors may be given more weight.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Add Factor Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(Object.keys(RISK_FACTOR_CATEGORIES) as RiskFactorCategory[]).map(
                (category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => handleAddFactor(category)}
                    className="rounded-lg border-2 border-dashed border-gray-300 p-4 text-center hover:border-cyan-500 hover:bg-cyan-50 transition-colors"
                  >
                    <div className="text-sm font-medium text-gray-700">
                      + {RISK_FACTOR_CATEGORIES[category].label}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {RISK_FACTOR_CATEGORIES[category].description}
                    </div>
                  </button>
                )
              )}
            </div>
          </div>

          {/* Summary */}
          {factors.length > 0 && (
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Summary</h4>
              <p className="text-sm text-gray-600">
                You have provided {factors.length} piece(s) of contextual information.
                This information will be stored securely with enhanced privacy
                protections.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Option to Skip */}
      <div className="flex items-center justify-between pt-4 border-t">
        <button
          type="button"
          onClick={() => {
            setShowSection(false);
            setFactors([]);
            onFactorsChange([]);
          }}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          ← Skip this section
        </button>
        {allConsentGiven && factors.length > 0 && (
          <p className="text-sm text-green-700 font-medium">
            ✓ {factors.length} contextual item(s) ready to submit
          </p>
        )}
      </div>
    </div>
  );
}
