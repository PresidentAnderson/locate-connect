export type LeadStatus = "new" | "investigating" | "verified" | "dismissed" | "archived";

export type LeadPriority = "low" | "medium" | "high" | "critical";

export type LeadSource =
  | "social_media"
  | "email_opened"
  | "location"
  | "witness"
  | "hospital"
  | "detention"
  | "tip"
  | "surveillance"
  | "other";

export interface Lead {
  id: string;
  caseId: string;
  caseNumber?: string;
  title: string;
  description: string;
  status: LeadStatus;
  priority: LeadPriority;
  source: LeadSource;
  sourceDetails?: string;
  assignedToId?: string;
  assignedToName?: string;
  locationLat?: number;
  locationLng?: number;
  locationAddress?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  isAnonymous: boolean;
  verifiedAt?: string;
  verifiedById?: string;
  dismissedAt?: string;
  dismissedById?: string;
  dismissalReason?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  createdById?: string;
}

export interface LeadNote {
  id: string;
  leadId: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
  createdById: string;
  createdByName?: string;
}

export interface LeadAttachment {
  id: string;
  leadId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  uploadedAt: string;
  uploadedById: string;
}

export interface LeadCreatePayload {
  caseId: string;
  title: string;
  description: string;
  priority?: LeadPriority;
  source: LeadSource;
  sourceDetails?: string;
  locationLat?: number;
  locationLng?: number;
  locationAddress?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  isAnonymous?: boolean;
  metadata?: Record<string, unknown>;
}

export interface LeadUpdatePayload {
  title?: string;
  description?: string;
  status?: LeadStatus;
  priority?: LeadPriority;
  assignedToId?: string | null;
  locationLat?: number;
  locationLng?: number;
  locationAddress?: string;
  dismissalReason?: string;
  metadata?: Record<string, unknown>;
}

export interface LeadFilters {
  caseId?: string;
  status?: LeadStatus | LeadStatus[];
  priority?: LeadPriority | LeadPriority[];
  source?: LeadSource | LeadSource[];
  assignedToId?: string;
  isAnonymous?: boolean;
  search?: string;
  createdAfter?: string;
  createdBefore?: string;
}
