/**
 * Lead Management Types
 */

export type LeadType =
  | "social_media"
  | "email_opened"
  | "location"
  | "witness"
  | "hospital"
  | "detention"
  | "other";

export type LeadStatus = 
  | "new" 
  | "investigating" 
  | "verified" 
  | "dismissed" 
  | "acted_upon";

export type LeadPriorityLevel = 
  | "p0_critical" 
  | "p1_high" 
  | "p2_medium" 
  | "p3_low" 
  | "p4_routine";

export interface Lead {
  id: string;
  caseId: string;
  title: string;
  description: string | null;
  source: string | null;
  sourceReference: string | null;
  leadType: LeadType;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  province: string | null;
  status: LeadStatus;
  priorityLevel: LeadPriorityLevel;
  credibilityScore: number;
  isVerified: boolean;
  verifiedBy: string | null;
  verifiedAt: string | null;
  assignedTo: string | null;
  reportedAt: string;
  sightingDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadNote {
  id: string;
  leadId: string;
  authorId: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LeadAttachment {
  id: string;
  leadId: string;
  uploadedBy: string;
  fileName: string;
  fileType: string;
  fileSize: number | null;
  url: string;
  description: string | null;
  isEvidence: boolean;
  createdAt: string;
}

export interface CreateLeadInput {
  caseId: string;
  title: string;
  description?: string;
  source?: string;
  sourceReference?: string;
  leadType: LeadType;
  location?: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  province?: string;
  priorityLevel?: LeadPriorityLevel;
  credibilityScore?: number;
  assignedTo?: string;
  sightingDate?: string;
}

export interface UpdateLeadInput {
  title?: string;
  description?: string;
  source?: string;
  sourceReference?: string;
  leadType?: LeadType;
  location?: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  province?: string;
  status?: LeadStatus;
  priorityLevel?: LeadPriorityLevel;
  credibilityScore?: number;
  assignedTo?: string;
  sightingDate?: string;
}

export interface CreateLeadNoteInput {
  leadId: string;
  content: string;
  isInternal?: boolean;
}

export interface CreateLeadAttachmentInput {
  leadId: string;
  fileName: string;
  fileType: string;
  fileSize?: number;
  url: string;
  description?: string;
  isEvidence?: boolean;
}

export interface LeadFilters {
  caseId?: string;
  status?: LeadStatus;
  leadType?: LeadType;
  priorityLevel?: LeadPriorityLevel;
  assignedTo?: string;
  isVerified?: boolean;
  search?: string;
}

export interface LeadWithDetails extends Lead {
  notes?: LeadNote[];
  attachments?: LeadAttachment[];
  assignedToProfile?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  verifiedByProfile?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
}
