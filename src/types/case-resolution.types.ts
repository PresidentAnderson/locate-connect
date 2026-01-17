export type CaseResolutionType =
  | "found_safe"
  | "found_deceased"
  | "returned_home"
  | "located_elsewhere"
  | "closed_insufficient_info"
  | "false_report"
  | "unfounded"
  | "duplicate"
  | "cancelled"
  | "transferred"
  | "other";

export type CaseResolutionStatus =
  | "draft"
  | "pending_le_signoff"
  | "signed_off"
  | "closed";

export type RetentionStatus = "active" | "purge_scheduled" | "on_hold";

/** Resolution types that require extra confirmation due to sensitive nature */
export const SENSITIVE_RESOLUTION_TYPES: CaseResolutionType[] = [
  "found_deceased",
  "false_report",
];

/** Resolution types that trigger positive outcome workflows */
export const POSITIVE_RESOLUTION_TYPES: CaseResolutionType[] = [
  "found_safe",
  "returned_home",
  "located_elsewhere",
];

/** Resolution type labels for display */
export const RESOLUTION_TYPE_LABELS: Record<CaseResolutionType, string> = {
  found_safe: "Found safe",
  found_deceased: "Found deceased",
  returned_home: "Returned home",
  located_elsewhere: "Located elsewhere",
  closed_insufficient_info: "Closed - insufficient info",
  false_report: "False report",
  unfounded: "Unfounded",
  duplicate: "Duplicate",
  cancelled: "Cancelled",
  transferred: "Transferred",
  other: "Other",
};

/** Resolution type descriptions for user guidance */
export const RESOLUTION_TYPE_DESCRIPTIONS: Record<CaseResolutionType, string> = {
  found_safe: "Person has been located and confirmed safe. Location confirmed, notify family.",
  found_deceased: "Person has been confirmed deceased. Requires sensitive handling and grief resources.",
  returned_home: "Person has voluntarily returned home. Self-return documented.",
  located_elsewhere: "Person has been located living elsewhere. New location confirmed.",
  closed_insufficient_info: "Case archived due to insufficient information. Can be reopened.",
  false_report: "Case determined to be a false report. Flagged, no public data retained.",
  unfounded: "Investigation found no basis for the missing person report.",
  duplicate: "This case is a duplicate of another existing case.",
  cancelled: "Case cancelled at the request of the reporting party.",
  transferred: "Case transferred to another jurisdiction or agency.",
  other: "Other resolution type not covered by standard categories.",
};

export interface CaseResolutionRecord {
  id: string;
  caseId: string;
  resolutionType?: CaseResolutionType | null;
  outcomeNotes?: string | null;
  status: CaseResolutionStatus;
  submittedForSignoffBy?: string | null;
  submittedForSignoffAt?: string | null;
  leSignedOffBy?: string | null;
  leSignedOffAt?: string | null;
  closedBy?: string | null;
  closedAt?: string | null;
  successStoryConsent?: boolean;
  successStoryNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CaseResolutionDocument {
  id: string;
  caseId: string;
  resolutionId?: string | null;
  uploadedBy?: string | null;
  fileName: string;
  fileType?: string | null;
  fileSize?: number | null;
  storageBucket: string;
  storagePath: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface CaseRetentionFlags {
  id: string;
  caseId: string;
  retentionStatus: RetentionStatus;
  scheduledPurgeAt?: string | null;
  legalHold: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CaseResolutionEvent {
  id: string;
  caseId: string;
  resolutionId?: string | null;
  eventType: string;
  actorId?: string | null;
  occurredAt: string;
  metadata?: Record<string, unknown> | null;
}
