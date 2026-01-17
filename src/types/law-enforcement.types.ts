/**
 * Law Enforcement Types
 * Types for law enforcement panel and related features
 */

// Lead Management Types
export type LeadStatus =
  | "new"
  | "assigned"
  | "in_progress"
  | "pending_verification"
  | "verified"
  | "false_lead"
  | "closed";

export type LeadPriority = "critical" | "high" | "medium" | "low";

export type LeadSource =
  | "tip_line"
  | "website"
  | "social_media"
  | "agent_generated"
  | "partner"
  | "law_enforcement"
  | "family"
  | "anonymous";

export interface Lead {
  id: string;
  caseId: string;
  caseNumber: string;
  title: string;
  description: string;
  status: LeadStatus;
  priority: LeadPriority;
  source: LeadSource;
  sourceDetails?: string;

  // Submitter info
  submitter: {
    name: string | null;
    email: string | null;
    phone: string | null;
    isAnonymous: boolean;
    relationship?: string;
  };

  // Location info
  location?: {
    description: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };

  // Sighting info
  sighting?: {
    date: string;
    time?: string;
    description: string;
    personDescription?: string;
    vehicleDescription?: string;
    companionDescription?: string;
    direction?: string;
  };

  // Assignment
  assignedTo?: string;
  assignedAt?: string;

  // Verification
  verifiedBy?: string;
  verifiedAt?: string;
  verificationNotes?: string;

  // Attachments
  attachments: LeadAttachment[];

  // Confidence scoring
  confidenceScore: number;
  duplicateOf?: string;

  // Timeline
  createdAt: string;
  updatedAt: string;
  closedAt?: string;

  // Activity log
  activityLog: LeadActivity[];
}

export interface LeadAttachment {
  id: string;
  type: "image" | "video" | "audio" | "document";
  filename: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface LeadActivity {
  id: string;
  type: "created" | "updated" | "assigned" | "status_changed" | "note_added" | "attachment_added";
  description: string;
  userId: string;
  userName: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// Voice Memo Types
export interface VoiceMemo {
  id: string;
  caseId: string;
  leadId?: string;
  title: string;
  audioUrl: string;
  duration: number; // seconds
  transcription?: string;
  transcriptionStatus: "pending" | "processing" | "completed" | "failed";
  recordedBy: string;
  recordedAt: string;
  tags: string[];
  isEvidence: boolean;
  evidenceChain?: EvidenceChainEntry[];
}

export interface EvidenceChainEntry {
  id: string;
  action: "created" | "accessed" | "copied" | "transferred" | "modified";
  userId: string;
  userName: string;
  timestamp: string;
  notes?: string;
  hash?: string;
}

// Geofencing Types
export interface Geofence {
  id: string;
  caseId: string;
  name: string;
  type: "circle" | "polygon" | "route";
  geometry: GeofenceGeometry;
  alertType: "entry" | "exit" | "both";
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  expiresAt?: string;
  notifications: GeofenceNotification[];
}

export type GeofenceGeometry =
  | { type: "circle"; center: { lat: number; lng: number }; radiusMeters: number }
  | { type: "polygon"; points: Array<{ lat: number; lng: number }> }
  | { type: "route"; points: Array<{ lat: number; lng: number }>; bufferMeters: number };

export interface GeofenceNotification {
  type: "email" | "sms" | "push" | "webhook";
  target: string;
  enabled: boolean;
}

export interface GeofenceAlert {
  id: string;
  geofenceId: string;
  caseId: string;
  alertType: "entry" | "exit";
  triggeredAt: string;
  location: {
    lat: number;
    lng: number;
    accuracy?: number;
  };
  deviceId?: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

// Vehicle Tracking Types
export interface VehicleRecord {
  id: string;
  caseId: string;
  licensePlate: string;
  state?: string;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  vin?: string;
  ownerName?: string;
  isTarget: boolean;
  alerts: VehicleAlert[];
  sightings: VehicleSighting[];
  createdAt: string;
  updatedAt: string;
}

export interface VehicleSighting {
  id: string;
  vehicleId: string;
  source: "lpr" | "manual" | "tip" | "camera";
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  timestamp: string;
  confidence: number;
  imageUrl?: string;
  reportedBy?: string;
  verified: boolean;
}

export interface VehicleAlert {
  id: string;
  vehicleId: string;
  type: "bolo" | "stolen" | "amber" | "custom";
  status: "active" | "expired" | "cancelled";
  description: string;
  createdBy: string;
  createdAt: string;
  expiresAt?: string;
}

// Community Campaign Types
export interface AwarenessCampaign {
  id: string;
  caseId: string;
  name: string;
  type: "missing_person" | "amber_alert" | "endangered" | "general";
  status: "draft" | "active" | "paused" | "completed" | "cancelled";

  // Content
  headline: string;
  description: string;
  imageUrls: string[];
  flyerUrl?: string;

  // Distribution
  channels: CampaignChannel[];
  targetArea: {
    type: "radius" | "region" | "national";
    center?: { lat: number; lng: number };
    radiusMiles?: number;
    states?: string[];
    cities?: string[];
  };

  // Schedule
  startDate: string;
  endDate?: string;

  // Metrics
  metrics: CampaignMetrics;

  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignChannel {
  type: "facebook" | "twitter" | "instagram" | "nextdoor" | "email" | "sms" | "digital_billboard";
  enabled: boolean;
  config: Record<string, unknown>;
  status: "pending" | "active" | "completed" | "failed";
  lastPostedAt?: string;
}

export interface CampaignMetrics {
  impressions: number;
  clicks: number;
  shares: number;
  tipsGenerated: number;
  lastUpdated: string;
}

// Shift Handoff Types
export interface ShiftHandoff {
  id: string;
  fromOfficerId: string;
  fromOfficerName: string;
  toOfficerId: string;
  toOfficerName: string;
  shiftDate: string;
  shiftType: "day" | "evening" | "night";
  status: "draft" | "submitted" | "acknowledged";

  // Case summaries
  caseSummaries: CaseHandoffSummary[];

  // Action items
  actionItems: HandoffActionItem[];

  // Notes
  generalNotes: string;
  urgentNotes?: string;

  createdAt: string;
  submittedAt?: string;
  acknowledgedAt?: string;
}

export interface CaseHandoffSummary {
  caseId: string;
  caseNumber: string;
  missingPersonName: string;
  priority: number;
  status: string;
  recentActivity: string;
  pendingTasks: string[];
  notes: string;
}

export interface HandoffActionItem {
  id: string;
  description: string;
  priority: "high" | "medium" | "low";
  dueBy?: string;
  caseId?: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
}

// Case Disposition Types
export type CaseDisposition =
  | "located_alive"
  | "located_deceased"
  | "returned_home"
  | "emancipated"
  | "runaway_resolved"
  | "false_report"
  | "insufficient_info"
  | "transferred"
  | "other";

export interface DispositionRecord {
  id: string;
  caseId: string;
  caseNumber: string;
  disposition: CaseDisposition;
  dispositionDate: string;
  circumstances: string;

  // Location found (if applicable)
  locationFound?: {
    city: string;
    state: string;
    country: string;
    distance?: number; // miles from last seen
  };

  // Time metrics
  daysToResolution: number;
  hoursActive: number;

  // Contributing factors
  contributingFactors: string[];
  keyLeadId?: string;

  // Documentation
  finalReport?: string;
  attachments: string[];

  // Sign-off
  closedBy: string;
  closedAt: string;
  supervisorApproval?: {
    supervisorId: string;
    supervisorName: string;
    approvedAt: string;
    notes?: string;
  };
}

export interface DispositionAnalytics {
  period: "week" | "month" | "quarter" | "year";
  startDate: string;
  endDate: string;

  totalCases: number;
  closedCases: number;
  openCases: number;

  byDisposition: Record<CaseDisposition, number>;
  byPriority: Record<number, number>;

  avgDaysToResolution: number;
  medianDaysToResolution: number;

  recoveryRate: number;
  falseReportRate: number;

  topContributingFactors: Array<{ factor: string; count: number }>;
}

// Volunteer Coordinator Types
export interface SearchParty {
  id: string;
  caseId: string;
  name: string;
  status: "planning" | "active" | "completed" | "cancelled";

  // Location
  searchArea: {
    type: "polygon" | "grid";
    geometry: Array<{ lat: number; lng: number }>;
    sectors?: SearchSector[];
  };

  // Schedule
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string;
  actualEnd?: string;

  // Team
  coordinatorId: string;
  coordinatorName: string;
  volunteers: SearchVolunteer[];
  maxVolunteers: number;

  // Resources
  meetingPoint: {
    address: string;
    lat: number;
    lng: number;
    instructions?: string;
  };
  requiredEquipment: string[];
  providedEquipment: string[];

  // Safety
  safetyBriefing: string;
  emergencyContact: string;
  weatherConditions?: string;

  // Results
  findings: SearchFinding[];

  createdAt: string;
  updatedAt: string;
}

export interface SearchSector {
  id: string;
  name: string;
  geometry: Array<{ lat: number; lng: number }>;
  priority: number;
  status: "unassigned" | "assigned" | "in_progress" | "completed";
  assignedTeam?: string;
  completedAt?: string;
  findings: string[];
}

export interface SearchVolunteer {
  id: string;
  userId?: string;
  name: string;
  email: string;
  phone: string;
  status: "registered" | "checked_in" | "active" | "checked_out";
  teamAssignment?: string;
  sectorAssignment?: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  certifications?: string[];
  notes?: string;
}

export interface SearchFinding {
  id: string;
  searchPartyId: string;
  sectorId?: string;
  reportedBy: string;
  timestamp: string;
  type: "person_sighting" | "evidence" | "poi" | "other";
  description: string;
  location: {
    lat: number;
    lng: number;
    accuracy?: number;
  };
  photos: string[];
  verified: boolean;
  verifiedBy?: string;
  followUpRequired: boolean;
  followUpNotes?: string;
}

// Voice Command Types
export type VoiceLanguage = "en" | "es" | "fr" | "de" | "zh" | "ar";

export interface VoiceCommand {
  id: string;
  phrases: Record<VoiceLanguage, string[]>;
  action: string;
  parameters?: VoiceCommandParameter[];
  category: "navigation" | "search" | "case" | "lead" | "alert" | "report";
  requiresConfirmation: boolean;
}

export interface VoiceCommandParameter {
  name: string;
  type: "string" | "number" | "date" | "enum";
  required: boolean;
  extractionPatterns: Record<VoiceLanguage, string[]>;
  enumValues?: string[];
}

export interface VoiceCommandResult {
  success: boolean;
  command: string;
  action: string;
  parameters: Record<string, unknown>;
  response: string;
  timestamp: string;
}
