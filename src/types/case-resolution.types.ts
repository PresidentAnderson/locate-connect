export type CaseResolutionType =
  | "found_safe"
  | "found_deceased"
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
