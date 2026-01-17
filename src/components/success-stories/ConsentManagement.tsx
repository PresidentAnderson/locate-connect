"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type {
  StoryConsent,
  ConsentType,
  ConsentMethod,
  ConsentWorkflowState,
  CreateConsentInput,
} from "@/types/success-story.types";

interface ConsentManagementProps {
  storyId: string;
  consents: StoryConsent[];
  workflowState: ConsentWorkflowState;
  onAddConsent: (data: Omit<CreateConsentInput, "storyId">) => Promise<void>;
  onUpdateConsent: (
    consentId: string,
    data: { isGranted?: boolean; withdrawnAt?: string; withdrawalReason?: string }
  ) => Promise<void>;
  onRefresh: () => void;
  readOnly?: boolean;
}

const CONSENT_TYPES: { value: ConsentType; label: string; description: string }[] = [
  {
    value: "story_publication",
    label: "Story Publication",
    description: "Consent to publish this success story",
  },
  {
    value: "name_use",
    label: "Name Use",
    description: "Consent to use name or identifying information",
  },
  {
    value: "photo_use",
    label: "Photo Use",
    description: "Consent to use photos in the story",
  },
  {
    value: "quote_use",
    label: "Quote Use",
    description: "Consent to attribute quotes",
  },
  {
    value: "media_sharing",
    label: "Media Sharing",
    description: "Consent to share with media outlets",
  },
];

const CONSENT_METHODS: { value: ConsentMethod; label: string }[] = [
  { value: "digital_signature", label: "Digital Signature (immediate)" },
  { value: "email_confirmation", label: "Email Confirmation" },
  { value: "verbal_recorded", label: "Verbal (recorded)" },
  { value: "physical_form", label: "Physical Form (uploaded)" },
];

const RELATIONSHIPS = [
  "Missing Person (if adult)",
  "Parent/Guardian",
  "Spouse/Partner",
  "Sibling",
  "Adult Child",
  "Legal Representative",
  "Other Family Member",
];

export function ConsentManagement({
  storyId,
  consents,
  workflowState,
  onAddConsent,
  onUpdateConsent,
  onRefresh,
  readOnly = false,
}: ConsentManagementProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [withdrawalReason, setWithdrawalReason] = useState("");

  const [newConsent, setNewConsent] = useState<Omit<CreateConsentInput, "storyId">>({
    consenterName: "",
    consenterEmail: "",
    consenterPhone: "",
    consenterRelationship: "",
    consentType: "story_publication",
    consentMethod: "email_confirmation",
  });

  const handleAddConsent = async () => {
    if (!newConsent.consenterName || !newConsent.consenterRelationship) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddConsent(newConsent);
      setShowAddForm(false);
      setNewConsent({
        consenterName: "",
        consenterEmail: "",
        consenterPhone: "",
        consenterRelationship: "",
        consentType: "story_publication",
        consentMethod: "email_confirmation",
      });
      onRefresh();
    } catch (error) {
      console.error("Error adding consent:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdraw = async (consentId: string) => {
    setIsSubmitting(true);
    try {
      await onUpdateConsent(consentId, {
        withdrawnAt: new Date().toISOString(),
        withdrawalReason,
      });
      setWithdrawingId(null);
      setWithdrawalReason("");
      onRefresh();
    } catch (error) {
      console.error("Error withdrawing consent:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getConsentStatusBadge = (consent: StoryConsent) => {
    if (consent.withdrawnAt) {
      return (
        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
          Withdrawn
        </span>
      );
    }
    if (consent.isGranted) {
      return (
        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
          Granted
        </span>
      );
    }
    if (consent.verifiedAt) {
      return (
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
          Verified
        </span>
      );
    }
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
        Pending
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Workflow Status Banner */}
      <div
        className={cn(
          "rounded-lg p-4",
          workflowState.canPublish
            ? "bg-green-50 border border-green-200"
            : "bg-amber-50 border border-amber-200"
        )}
      >
        <div className="flex items-start">
          {workflowState.canPublish ? (
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
          ) : (
            <WarningIcon className="h-5 w-5 text-amber-500" />
          )}
          <div className="ml-3">
            <h3
              className={cn(
                "text-sm font-medium",
                workflowState.canPublish ? "text-green-800" : "text-amber-800"
              )}
            >
              {workflowState.canPublish
                ? "All Required Consents Obtained"
                : "Consent Required Before Publishing"}
            </h3>
            {!workflowState.canPublish && workflowState.blockedReasons.length > 0 && (
              <ul className="mt-1 list-disc pl-5 text-sm text-amber-700">
                {workflowState.blockedReasons.map((reason, i) => (
                  <li key={i}>{reason}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Required Consents Grid */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Required Consents
        </h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {workflowState.requiredConsents.map((type) => {
            const granted = workflowState.grantedConsents.includes(type);
            const withdrawn = workflowState.withdrawnConsents.includes(type);
            const typeInfo = CONSENT_TYPES.find((t) => t.value === type);

            return (
              <div
                key={type}
                className={cn(
                  "rounded-lg border p-3",
                  granted && !withdrawn
                    ? "border-green-200 bg-green-50"
                    : withdrawn
                    ? "border-red-200 bg-red-50"
                    : "border-gray-200 bg-gray-50"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">
                    {typeInfo?.label || type}
                  </span>
                  {granted && !withdrawn ? (
                    <CheckIcon className="h-4 w-4 text-green-600" />
                  ) : withdrawn ? (
                    <XIcon className="h-4 w-4 text-red-600" />
                  ) : (
                    <ClockIcon className="h-4 w-4 text-gray-400" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Existing Consents List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Consent Records</h3>
          {!readOnly && (
            <button
              onClick={() => setShowAddForm(true)}
              className="text-sm font-medium text-cyan-600 hover:text-cyan-700"
            >
              + Add Consent
            </button>
          )}
        </div>

        {consents.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center">
            <DocumentIcon className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">No consent records yet</p>
            {!readOnly && (
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-2 text-sm font-medium text-cyan-600 hover:text-cyan-700"
              >
                Add the first consent
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {consents.map((consent) => (
              <div
                key={consent.id}
                className="rounded-lg border border-gray-200 bg-white p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">
                        {consent.consenterName}
                      </p>
                      {getConsentStatusBadge(consent)}
                    </div>
                    <p className="text-sm text-gray-500">
                      {consent.consenterRelationship} -{" "}
                      {CONSENT_TYPES.find((t) => t.value === consent.consentType)
                        ?.label || consent.consentType}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Method:{" "}
                      {CONSENT_METHODS.find((m) => m.value === consent.consentMethod)
                        ?.label || consent.consentMethod}
                    </p>
                    {consent.grantedAt && (
                      <p className="text-xs text-gray-400">
                        Granted: {new Date(consent.grantedAt).toLocaleDateString()}
                      </p>
                    )}
                    {consent.withdrawnAt && (
                      <p className="text-xs text-red-500">
                        Withdrawn: {new Date(consent.withdrawnAt).toLocaleDateString()}
                        {consent.withdrawalReason && ` - ${consent.withdrawalReason}`}
                      </p>
                    )}
                  </div>

                  {!readOnly && consent.isGranted && !consent.withdrawnAt && (
                    <button
                      onClick={() => setWithdrawingId(consent.id)}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      Withdraw
                    </button>
                  )}
                </div>

                {/* Withdrawal Form */}
                {withdrawingId === consent.id && (
                  <div className="mt-3 border-t pt-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Withdraw Consent
                    </p>
                    <textarea
                      value={withdrawalReason}
                      onChange={(e) => setWithdrawalReason(e.target.value)}
                      placeholder="Reason for withdrawal (optional)"
                      rows={2}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                    <div className="mt-2 flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setWithdrawingId(null);
                          setWithdrawalReason("");
                        }}
                        className="rounded px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleWithdraw(consent.id)}
                        disabled={isSubmitting}
                        className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700 disabled:bg-gray-400"
                      >
                        {isSubmitting ? "Processing..." : "Confirm Withdrawal"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Consent Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Request Consent
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Consenter Name *
                </label>
                <input
                  type="text"
                  value={newConsent.consenterName}
                  onChange={(e) =>
                    setNewConsent({ ...newConsent, consenterName: e.target.value })
                  }
                  placeholder="Full name of the person giving consent"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Relationship *
                </label>
                <select
                  value={newConsent.consenterRelationship}
                  onChange={(e) =>
                    setNewConsent({
                      ...newConsent,
                      consenterRelationship: e.target.value,
                    })
                  }
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Select relationship</option>
                  {RELATIONSHIPS.map((rel) => (
                    <option key={rel} value={rel}>
                      {rel}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Consent Type *
                </label>
                <select
                  value={newConsent.consentType}
                  onChange={(e) =>
                    setNewConsent({
                      ...newConsent,
                      consentType: e.target.value as ConsentType,
                    })
                  }
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  {CONSENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label} - {type.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Consent Method *
                </label>
                <select
                  value={newConsent.consentMethod}
                  onChange={(e) =>
                    setNewConsent({
                      ...newConsent,
                      consentMethod: e.target.value as ConsentMethod,
                    })
                  }
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  {CONSENT_METHODS.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>

              {newConsent.consentMethod === "email_confirmation" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={newConsent.consenterEmail || ""}
                    onChange={(e) =>
                      setNewConsent({
                        ...newConsent,
                        consenterEmail: e.target.value,
                      })
                    }
                    placeholder="email@example.com"
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    A verification email will be sent to this address
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Phone (Optional)
                </label>
                <input
                  type="tel"
                  value={newConsent.consenterPhone || ""}
                  onChange={(e) =>
                    setNewConsent({
                      ...newConsent,
                      consenterPhone: e.target.value,
                    })
                  }
                  placeholder="+1 (555) 123-4567"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowAddForm(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddConsent}
                disabled={
                  isSubmitting ||
                  !newConsent.consenterName ||
                  !newConsent.consenterRelationship
                }
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-medium text-white",
                  isSubmitting ||
                    !newConsent.consenterName ||
                    !newConsent.consenterRelationship
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-cyan-600 hover:bg-cyan-700"
                )}
              >
                {isSubmitting ? "Requesting..." : "Request Consent"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Icon components
function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );
}
