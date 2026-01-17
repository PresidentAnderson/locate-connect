"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CaseResolutionDocument,
  CaseResolutionRecord,
  CaseRetentionFlags,
  CaseResolutionType,
} from "@/types";
import {
  RESOLUTION_TYPE_LABELS,
  RESOLUTION_TYPE_DESCRIPTIONS,
  SENSITIVE_RESOLUTION_TYPES,
  POSITIVE_RESOLUTION_TYPES,
} from "@/types/case-resolution.types";
import { cn } from "@/lib";
import { ResolutionConfirmDialog } from "./ResolutionConfirmDialog";

interface CaseResolutionPanelProps {
  caseId: string;
}

interface ResolutionResponse {
  resolution: CaseResolutionRecord | null;
  documents: CaseResolutionDocument[];
  retention: CaseRetentionFlags | null;
}

const resolutionTypeOptions: Array<{
  value: CaseResolutionType;
  label: string;
  category: "positive" | "neutral" | "sensitive";
}> = [
  { value: "found_safe", label: RESOLUTION_TYPE_LABELS.found_safe, category: "positive" },
  { value: "returned_home", label: RESOLUTION_TYPE_LABELS.returned_home, category: "positive" },
  { value: "located_elsewhere", label: RESOLUTION_TYPE_LABELS.located_elsewhere, category: "positive" },
  { value: "found_deceased", label: RESOLUTION_TYPE_LABELS.found_deceased, category: "sensitive" },
  { value: "closed_insufficient_info", label: RESOLUTION_TYPE_LABELS.closed_insufficient_info, category: "neutral" },
  { value: "false_report", label: RESOLUTION_TYPE_LABELS.false_report, category: "sensitive" },
  { value: "unfounded", label: RESOLUTION_TYPE_LABELS.unfounded, category: "neutral" },
  { value: "duplicate", label: RESOLUTION_TYPE_LABELS.duplicate, category: "neutral" },
  { value: "cancelled", label: RESOLUTION_TYPE_LABELS.cancelled, category: "neutral" },
  { value: "transferred", label: RESOLUTION_TYPE_LABELS.transferred, category: "neutral" },
  { value: "other", label: RESOLUTION_TYPE_LABELS.other, category: "neutral" },
];

const retentionStatusOptions = [
  { value: "active", label: "Active" },
  { value: "purge_scheduled", label: "Purge scheduled" },
  { value: "on_hold", label: "On hold" },
] as const;

export default function CaseResolutionPanel({ caseId }: CaseResolutionPanelProps) {
  const [resolution, setResolution] = useState<CaseResolutionRecord | null>(null);
  const [documents, setDocuments] = useState<CaseResolutionDocument[]>([]);
  const [retention, setRetention] = useState<CaseRetentionFlags | null>(null);
  const [resolutionType, setResolutionType] = useState<CaseResolutionType | "">("");
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [retentionStatus, setRetentionStatus] = useState("active");
  const [scheduledPurgeAt, setScheduledPurgeAt] = useState("");
  const [legalHold, setLegalHold] = useState(false);
  const [familyChannel, setFamilyChannel] = useState("");
  const [familyNotes, setFamilyNotes] = useState("");
  const [pendingDocument, setPendingDocument] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Success story consent
  const [successStoryConsent, setSuccessStoryConsent] = useState(false);
  const [successStoryNotes, setSuccessStoryNotes] = useState("");

  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    "save_draft" | "submit_for_signoff" | "sign_off" | "close" | null
  >(null);

  const loadResolution = useCallback(async () => {
    const response = await fetch(`/api/cases/${caseId}/resolution`);
    if (!response.ok) {
      return;
    }
    const data = (await response.json()) as ResolutionResponse;
    setResolution(data.resolution);
    setDocuments(data.documents ?? []);
    setRetention(data.retention);

    if (data.resolution?.resolutionType) {
      setResolutionType(data.resolution.resolutionType);
    }
    if (data.resolution?.outcomeNotes) {
      setOutcomeNotes(data.resolution.outcomeNotes);
    }
    if (data.resolution?.successStoryConsent !== undefined) {
      setSuccessStoryConsent(data.resolution.successStoryConsent);
    }
    if (data.resolution?.successStoryNotes) {
      setSuccessStoryNotes(data.resolution.successStoryNotes);
    }
    if (data.retention) {
      setRetentionStatus(data.retention.retentionStatus);
      setScheduledPurgeAt(
        data.retention.scheduledPurgeAt
          ? data.retention.scheduledPurgeAt.slice(0, 10)
          : ""
      );
      setLegalHold(Boolean(data.retention.legalHold));
    }
  }, [caseId]);

  useEffect(() => {
    void loadResolution();
  }, [loadResolution]);

  const statusLabel = useMemo(() => {
    if (!resolution?.status) return "Draft";
    return resolution.status
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }, [resolution?.status]);

  const isSensitiveResolution = useMemo(() => {
    return resolutionType && SENSITIVE_RESOLUTION_TYPES.includes(resolutionType as CaseResolutionType);
  }, [resolutionType]);

  const isPositiveResolution = useMemo(() => {
    return resolutionType && POSITIVE_RESOLUTION_TYPES.includes(resolutionType as CaseResolutionType);
  }, [resolutionType]);

  const resolutionDescription = useMemo(() => {
    if (!resolutionType) return null;
    return RESOLUTION_TYPE_DESCRIPTIONS[resolutionType as CaseResolutionType];
  }, [resolutionType]);

  const handleActionClick = (
    action: "save_draft" | "submit_for_signoff" | "sign_off" | "close"
  ) => {
    // For closing with sensitive resolutions, show confirmation dialog
    if (action === "close" && isSensitiveResolution && resolutionType) {
      setPendingAction(action);
      setShowConfirmDialog(true);
      return;
    }

    // For other actions, proceed directly
    void saveResolution(action);
  };

  const handleConfirmResolution = () => {
    if (pendingAction) {
      void saveResolution(pendingAction);
    }
    setShowConfirmDialog(false);
    setPendingAction(null);
  };

  const handleCancelResolution = () => {
    setShowConfirmDialog(false);
    setPendingAction(null);
  };

  const saveResolution = async (
    action: "save_draft" | "submit_for_signoff" | "sign_off" | "close"
  ) => {
    setIsSaving(true);
    setMessage(null);

    const payload = {
      resolutionType: resolutionType || undefined,
      outcomeNotes: outcomeNotes || undefined,
      action,
      familyNotification: familyChannel
        ? {
            channel: familyChannel,
            notes: familyNotes || undefined,
          }
        : undefined,
      retention: {
        status: retentionStatus,
        scheduledPurgeAt: scheduledPurgeAt
          ? new Date(scheduledPurgeAt).toISOString()
          : null,
        legalHold,
      },
      successStoryConsent,
      successStoryNotes: successStoryNotes || undefined,
    };

    const response = await fetch(`/api/cases/${caseId}/resolution`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = (await response.json()) as { error?: string };
      setMessage(errorBody.error ?? "Unable to save resolution");
    } else {
      setMessage("Resolution updated");
      await loadResolution();
    }

    setIsSaving(false);
  };

  const uploadDocument = async () => {
    if (!pendingDocument) return;

    setIsSaving(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("file", pendingDocument);
    if (resolution?.id) {
      formData.append("resolutionId", resolution.id);
    }
    formData.append("documentType", "outcome_document");

    const response = await fetch(`/api/cases/${caseId}/resolution/documents`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorBody = (await response.json()) as { error?: string };
      setMessage(errorBody.error ?? "Unable to upload document");
    } else {
      setMessage("Outcome document uploaded");
      setPendingDocument(null);
      await loadResolution();
    }

    setIsSaving(false);
  };

  return (
    <>
      <div className="space-y-6 rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Case Resolution Workflow
            </h2>
            <p className="text-sm text-gray-500">
              Status: <span className="font-medium text-gray-800">{statusLabel}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleActionClick("save_draft")}
              disabled={isSaving}
              className={cn(
                "rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700",
                isSaving ? "opacity-60" : "hover:bg-gray-50"
              )}
            >
              Save draft
            </button>
            <button
              type="button"
              onClick={() => handleActionClick("submit_for_signoff")}
              disabled={isSaving}
              className={cn(
                "rounded-lg bg-amber-500 px-3 py-2 text-xs font-medium text-white",
                isSaving ? "opacity-60" : "hover:bg-amber-600"
              )}
            >
              Submit for LE sign-off
            </button>
            <button
              type="button"
              onClick={() => handleActionClick("sign_off")}
              disabled={isSaving}
              className={cn(
                "rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white",
                isSaving ? "opacity-60" : "hover:bg-blue-700"
              )}
            >
              LE sign-off
            </button>
            <button
              type="button"
              onClick={() => handleActionClick("close")}
              disabled={isSaving || !resolutionType}
              className={cn(
                "rounded-lg px-3 py-2 text-xs font-medium text-white",
                isSensitiveResolution
                  ? "bg-rose-600 hover:bg-rose-700"
                  : "bg-emerald-600 hover:bg-emerald-700",
                (isSaving || !resolutionType) && "opacity-60"
              )}
            >
              Close case
            </button>
          </div>
        </div>

        {message ? (
          <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
            {message}
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700" htmlFor="resolutionType">
              Resolution type
            </label>
            <select
              id="resolutionType"
              value={resolutionType}
              onChange={(event) =>
                setResolutionType(event.target.value as CaseResolutionType)
              }
              className={cn(
                "w-full rounded-lg border px-3 py-2 text-sm",
                isSensitiveResolution
                  ? "border-rose-300 bg-rose-50"
                  : isPositiveResolution
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-gray-200"
              )}
            >
              <option value="">Select resolution type</option>
              <optgroup label="Positive Outcomes">
                {resolutionTypeOptions
                  .filter((o) => o.category === "positive")
                  .map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Case Closure">
                {resolutionTypeOptions
                  .filter((o) => o.category === "neutral")
                  .map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Sensitive (Requires Confirmation)">
                {resolutionTypeOptions
                  .filter((o) => o.category === "sensitive")
                  .map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
              </optgroup>
            </select>

            {resolutionDescription && (
              <p
                className={cn(
                  "text-xs rounded-lg p-2",
                  isSensitiveResolution
                    ? "bg-rose-50 text-rose-700"
                    : isPositiveResolution
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-gray-50 text-gray-600"
                )}
              >
                {resolutionDescription}
              </p>
            )}

            <label className="text-sm font-medium text-gray-700" htmlFor="outcomeNotes">
              Outcome notes
            </label>
            <textarea
              id="outcomeNotes"
              value={outcomeNotes}
              onChange={(event) => setOutcomeNotes(event.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              placeholder="Document resolution outcome and key details"
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Outcome document</label>
            <div className="rounded-lg border border-dashed border-gray-200 p-3">
              <input
                type="file"
                onChange={(event) =>
                  setPendingDocument(event.target.files?.[0] ?? null)
                }
                className="w-full text-sm text-gray-600"
              />
              <button
                type="button"
                onClick={uploadDocument}
                disabled={!pendingDocument || isSaving}
                className={cn(
                  "mt-3 rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white",
                  !pendingDocument || isSaving ? "opacity-60" : "hover:bg-gray-800"
                )}
              >
                Upload outcome document
              </button>
            </div>
            <div className="space-y-2">
              {documents.length === 0 ? (
                <p className="text-sm text-gray-500">No documents uploaded yet.</p>
              ) : (
                documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
                  >
                    <div className="font-medium">{doc.fileName}</div>
                    <div className="text-xs text-gray-500">
                      {doc.fileType || "Unknown type"} • {new Date(doc.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Success Story Consent - only show for positive resolutions */}
        {isPositiveResolution && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <h3 className="text-sm font-semibold text-emerald-900">Success Story Option</h3>
            <p className="mt-1 text-xs text-emerald-700">
              Would the family like to share their story to help others? This is completely optional.
            </p>
            <div className="mt-3 space-y-3">
              <label className="flex items-center gap-2 text-sm text-emerald-800">
                <input
                  type="checkbox"
                  checked={successStoryConsent}
                  onChange={(event) => setSuccessStoryConsent(event.target.checked)}
                  className="rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                />
                Family consents to share their success story
              </label>
              {successStoryConsent && (
                <textarea
                  value={successStoryNotes}
                  onChange={(event) => setSuccessStoryNotes(event.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm"
                  placeholder="Additional notes about the success story (optional)"
                />
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Family notification log</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                type="text"
                value={familyChannel}
                onChange={(event) => setFamilyChannel(event.target.value)}
                placeholder="Channel (phone, email)"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
              <input
                type="text"
                value={familyNotes}
                onChange={(event) => setFamilyNotes(event.target.value)}
                placeholder="Notes (optional)"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <p className="text-xs text-gray-500">
              Notification is logged when you save or submit for sign-off.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Retention policy flags</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <select
                value={retentionStatus}
                onChange={(event) => setRetentionStatus(event.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                {retentionStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={scheduledPurgeAt}
                onChange={(event) => setScheduledPurgeAt(event.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={legalHold}
                onChange={(event) => setLegalHold(event.target.checked)}
              />
              Legal hold
            </label>
            {retention?.scheduledPurgeAt ? (
              <p className="text-xs text-gray-500">
                Current purge date: {new Date(retention.scheduledPurgeAt).toLocaleDateString()}
              </p>
            ) : null}
          </div>
        </div>

        {/* Post-Resolution Actions info */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="text-sm font-semibold text-gray-900">Post-Resolution Actions</h3>
          <p className="mt-1 text-xs text-gray-600">
            When this case is closed, the following automated actions will occur:
          </p>
          <ul className="mt-2 space-y-1 text-xs text-gray-600">
            <li className="flex items-center gap-2">
              <CheckIcon className="h-3 w-3 text-emerald-500" />
              Automated thank-you sent to all helpers and volunteers
            </li>
            <li className="flex items-center gap-2">
              <CheckIcon className="h-3 w-3 text-emerald-500" />
              Active resources and alerts deactivated
            </li>
            <li className="flex items-center gap-2">
              <CheckIcon className="h-3 w-3 text-emerald-500" />
              All leads archived with resolution reference
            </li>
            <li className="flex items-center gap-2">
              <CheckIcon className="h-3 w-3 text-emerald-500" />
              Case statistics updated and compiled
            </li>
          </ul>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {resolutionType && (
        <ResolutionConfirmDialog
          isOpen={showConfirmDialog}
          resolutionType={resolutionType as CaseResolutionType}
          onConfirm={handleConfirmResolution}
          onCancel={handleCancelResolution}
          isLoading={isSaving}
        />
      )}
    </>
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
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}
