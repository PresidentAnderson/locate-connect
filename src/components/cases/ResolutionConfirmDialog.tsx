"use client";

import { useState } from "react";
import { cn } from "@/lib";
import type { CaseResolutionType } from "@/types";
import {
  RESOLUTION_TYPE_LABELS,
  RESOLUTION_TYPE_DESCRIPTIONS,
  SENSITIVE_RESOLUTION_TYPES,
} from "@/types/case-resolution.types";

interface ResolutionConfirmDialogProps {
  isOpen: boolean;
  resolutionType: CaseResolutionType;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const SENSITIVE_WARNINGS: Record<string, { title: string; message: string; resources?: string[] }> = {
  found_deceased: {
    title: "Sensitive Resolution Confirmation",
    message:
      "You are about to mark this case as 'Found Deceased'. This action requires additional verification and will trigger grief support notifications to the family liaison.",
    resources: [
      "Grief counseling resources will be provided to the family",
      "Law enforcement sign-off is required",
      "Media handling protocols will be activated",
    ],
  },
  false_report: {
    title: "False Report Confirmation",
    message:
      "Marking this case as a false report is a serious action. All public data will be removed and the case will be flagged in the system. This may have legal implications.",
    resources: [
      "All public-facing information will be removed",
      "The reporter may be subject to follow-up",
      "Statistical data will be updated accordingly",
    ],
  },
};

export function ResolutionConfirmDialog({
  isOpen,
  resolutionType,
  onConfirm,
  onCancel,
  isLoading = false,
}: ResolutionConfirmDialogProps) {
  const [confirmationText, setConfirmationText] = useState("");

  if (!isOpen) return null;

  const isSensitive = SENSITIVE_RESOLUTION_TYPES.includes(resolutionType);
  const warning = SENSITIVE_WARNINGS[resolutionType];
  const label = RESOLUTION_TYPE_LABELS[resolutionType];
  const description = RESOLUTION_TYPE_DESCRIPTIONS[resolutionType];

  const requiresTypedConfirmation = isSensitive;
  const isConfirmEnabled = !requiresTypedConfirmation || confirmationText.toLowerCase() === "confirm";

  const handleConfirm = () => {
    if (isConfirmEnabled) {
      onConfirm();
      setConfirmationText("");
    }
  };

  const handleCancel = () => {
    setConfirmationText("");
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={handleCancel}
          aria-hidden="true"
        />

        {/* Center modal */}
        <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">
          &#8203;
        </span>

        {/* Modal panel */}
        <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
          {/* Header */}
          <div
            className={cn(
              "px-6 py-4 border-b",
              isSensitive ? "bg-rose-50 border-rose-200" : "bg-gray-50 border-gray-200"
            )}
          >
            <div className="flex items-center gap-3">
              {isSensitive && (
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-rose-100">
                  <ExclamationTriangleIcon className="h-6 w-6 text-rose-600" />
                </div>
              )}
              <div>
                <h3
                  className={cn(
                    "text-lg font-semibold",
                    isSensitive ? "text-rose-900" : "text-gray-900"
                  )}
                >
                  {warning?.title || "Confirm Resolution"}
                </h3>
                <p className="text-sm text-gray-500">Resolution type: {label}</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            <p className="text-sm text-gray-600">
              {warning?.message || description}
            </p>

            {warning?.resources && (
              <div className="mt-4 rounded-lg bg-amber-50 p-4">
                <h4 className="text-sm font-medium text-amber-800">Important considerations:</h4>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-700">
                  {warning.resources.map((resource, index) => (
                    <li key={index}>{resource}</li>
                  ))}
                </ul>
              </div>
            )}

            {requiresTypedConfirmation && (
              <div className="mt-4">
                <label htmlFor="confirmationText" className="block text-sm font-medium text-gray-700">
                  Type &quot;CONFIRM&quot; to proceed
                </label>
                <input
                  id="confirmationText"
                  type="text"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder="CONFIRM"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  disabled={isLoading}
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!isConfirmEnabled || isLoading}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50",
                isSensitive
                  ? "bg-rose-600 hover:bg-rose-700"
                  : "bg-cyan-600 hover:bg-cyan-700"
              )}
            >
              {isLoading ? "Processing..." : "Confirm Resolution"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExclamationTriangleIcon({ className }: { className?: string }) {
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
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
      />
    </svg>
  );
}

export default ResolutionConfirmDialog;
