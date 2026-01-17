export type EvidenceItemType = "audio" | "image" | "video" | "document";
export type TranscriptStatus = "not_requested" | "pending" | "completed" | "failed";
export type CustodyEventType =
  | "uploaded"
  | "accessed"
  | "downloaded"
  | "transcription_created"
  | "transcript_edited";

export interface CaseEvidenceItem {
  id: string;
  caseId: string;
  uploadedBy?: string | null;
  itemType: EvidenceItemType;
  fileName: string;
  fileType?: string | null;
  fileSize?: number | null;
  storageBucket: string;
  storagePath: string;
  durationSeconds?: number | null;
  transcriptText?: string | null;
  transcriptStatus: TranscriptStatus;
  transcriptProvider?: string | null;
  transcriptConfidence?: number | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface EvidenceCustodyEvent {
  id: string;
  evidenceItemId: string;
  caseId: string;
  actorId?: string | null;
  eventType: CustodyEventType;
  occurredAt: string;
  metadata?: Record<string, unknown> | null;
}
