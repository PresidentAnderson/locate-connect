/**
 * Morgue/Coroner Registry Integration Types
 * LC-M5-003
 * 
 * Sensitive system for matching missing persons with unidentified remains.
 * All access is logged and restricted to authorized users only.
 */

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type RemainsStatus =
  | 'unidentified'
  | 'pending_identification'
  | 'identified'
  | 'claimed'
  | 'buried_unclaimed';

export type CauseOfDeath =
  | 'undetermined'
  | 'natural'
  | 'accident'
  | 'suicide'
  | 'homicide'
  | 'pending_investigation';

export type MatchConfidence =
  | 'low'
  | 'medium'
  | 'high'
  | 'very_high'
  | 'confirmed';

export type DNASampleStatus =
  | 'not_collected'
  | 'collected'
  | 'submitted_to_lab'
  | 'in_analysis'
  | 'results_pending'
  | 'results_available'
  | 'match_found'
  | 'no_match'
  | 'inconclusive';

export type DNASampleType =
  | 'blood'
  | 'tissue'
  | 'bone'
  | 'tooth'
  | 'hair'
  | 'other';

export type NotificationSensitivity =
  | 'standard'
  | 'high'
  | 'critical'
  | 'requires_in_person';

export type GriefSupportType =
  | 'counseling'
  | 'support_group'
  | 'crisis_hotline'
  | 'funeral_assistance'
  | 'legal_aid'
  | 'spiritual_care';

// =============================================================================
// CORE INTERFACES
// =============================================================================

/**
 * Unidentified remains record from morgue/coroner
 */
export interface UnidentifiedRemains {
  id: string;
  caseNumber: string;
  morgueId: string;
  morgueName: string;
  morgueJurisdiction: string;
  coronerId?: string;
  
  // Discovery information
  discoveryDate: string;
  discoveryLocation: string;
  discoveryCity: string;
  discoveryProvince: string;
  discoveryCoordinates?: {
    latitude: number;
    longitude: number;
  };
  
  // Status
  status: RemainsStatus;
  causeOfDeath: CauseOfDeath;
  estimatedDeathDate?: string;
  estimatedDeathDateRange?: {
    earliest: string;
    latest: string;
  };
  
  // Physical description
  physicalDescription: PhysicalDescription;
  
  // DNA information
  dnaAvailable: boolean;
  dnaProfile?: string; // Reference to DNA database entry
  
  // Personal effects
  personalEffects: PersonalEffect[];
  
  // Investigation details
  investigatingAgency: string;
  leadInvestigator?: string;
  contactPhone?: string;
  contactEmail?: string;
  
  // Privacy & access
  restrictedAccess: boolean;
  accessRequiresApproval: boolean;
  mediaReleasable: boolean;
  
  // Metadata
  enteredBy: string;
  enteredAt: string;
  lastUpdatedBy?: string;
  lastUpdatedAt?: string;
  
  // Joined data
  matches?: MorgueRegistryMatch[];
}

/**
 * Physical description for matching
 */
export interface PhysicalDescription {
  // Demographics
  estimatedAge?: number;
  estimatedAgeRange?: {
    min: number;
    max: number;
  };
  sex?: 'male' | 'female' | 'undetermined';
  race?: string;
  ethnicity?: string;
  
  // Physical characteristics
  height?: number; // in cm
  heightRange?: {
    min: number;
    max: number;
  };
  weight?: number; // in kg
  weightRange?: {
    min: number;
    max: number;
  };
  
  // Features
  hairColor?: string;
  hairLength?: string;
  eyeColor?: string;
  build?: string;
  
  // Identifying marks
  tattoos?: IdentifyingMark[];
  scars?: IdentifyingMark[];
  piercings?: IdentifyingMark[];
  birthmarks?: IdentifyingMark[];
  
  // Medical/dental
  dentalRecordsAvailable: boolean;
  dentalWork?: string[];
  medicalImplants?: MedicalImplant[];
  uniqueFeatures?: string[];
  
  // Clothing & jewelry
  clothing?: ClothingItem[];
  jewelry?: JewelryItem[];
  
  // Additional notes
  notes?: string;
}

export interface IdentifyingMark {
  id: string;
  type: 'tattoo' | 'scar' | 'piercing' | 'birthmark';
  location: string;
  description: string;
  size?: string;
  imageUrl?: string;
}

export interface MedicalImplant {
  type: string;
  manufacturer?: string;
  serialNumber?: string;
  location: string;
}

export interface ClothingItem {
  type: string;
  description: string;
  brand?: string;
  size?: string;
  color?: string;
}

export interface JewelryItem {
  type: string;
  description: string;
  material?: string;
  inscriptions?: string;
}

export interface PersonalEffect {
  id: string;
  type: string;
  description: string;
  brand?: string;
  serialNumber?: string;
  inscriptions?: string;
  imageUrl?: string;
  evidenceNumber?: string;
}

/**
 * Query record for searching unidentified remains
 */
export interface MorgueRegistryQuery {
  id: string;
  caseId: string;
  queryDate: string;
  queriedBy: string;
  
  // Search parameters
  searchCriteria: {
    ageRange?: { min: number; max: number };
    sex?: string;
    heightRange?: { min: number; max: number };
    weightRange?: { min: number; max: number };
    hairColor?: string;
    eyeColor?: string;
    location?: string;
    province?: string;
    dateRange?: { start: string; end: string };
  };
  
  // Results
  resultsCount: number;
  matchesFound: string[]; // IDs of potential matches
  
  // Notes
  notes?: string;
  
  // Follow-up
  requiresFollowUp: boolean;
  followUpAssignedTo?: string;
  followUpCompleted?: boolean;
  followUpNotes?: string;
}

/**
 * Match between missing person and unidentified remains
 */
export interface MorgueRegistryMatch {
  id: string;
  caseId: string;
  remainsId: string;
  
  // Match details
  matchConfidence: MatchConfidence;
  matchScore: number; // 0-100
  matchedFeatures: string[];
  
  // Match rationale
  physicalMatchDetails?: string;
  locationProximity?: number; // km
  timelineAlignment?: string;
  
  // Investigation
  status: 'potential' | 'under_investigation' | 'ruled_out' | 'confirmed' | 'family_notified';
  investigatedBy?: string;
  investigationDate?: string;
  investigationNotes?: string;
  
  // DNA comparison
  dnaComparisonRequested: boolean;
  dnaComparisonRequestedDate?: string;
  dnaComparisonStatus?: DNASampleStatus;
  dnaComparisonResult?: 'match' | 'no_match' | 'inconclusive';
  dnaComparisonNotes?: string;
  
  // Notification
  familyNotified: boolean;
  familyNotifiedDate?: string;
  notifiedBy?: string;
  notificationMethod?: 'in_person' | 'phone' | 'liaison';
  
  // Resolution
  confirmedMatch: boolean;
  confirmedDate?: string;
  confirmedBy?: string;
  closureNotes?: string;
  
  // Metadata
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  
  // Joined data
  case?: {
    id: string;
    missingPersonName: string;
    reportedMissingDate: string;
  };
  remains?: UnidentifiedRemains;
}

/**
 * DNA sample coordination for matching
 */
export interface DNACoordination {
  id: string;
  caseId: string;
  matchId?: string;
  
  // Sample information
  sampleType: DNASampleType;
  sampleSource: 'family_member' | 'personal_item' | 'remains';
  
  // Family sample details (for comparison)
  familyMemberId?: string;
  familyRelationship?: string;
  
  // Lab details
  labName?: string;
  labCaseNumber?: string;
  submittedDate?: string;
  expectedResultsDate?: string;
  
  // Status
  status: DNASampleStatus;
  priority: 'routine' | 'high' | 'urgent';
  
  // Results
  resultsReceivedDate?: string;
  resultsAvailable: boolean;
  matchFound?: boolean;
  matchConfidence?: number; // percentage
  
  // Privacy
  consentObtained: boolean;
  consentDate?: string;
  consentDocumentUrl?: string;
  
  // Chain of custody
  collectedBy?: string;
  collectedDate?: string;
  chainOfCustodyLog: ChainOfCustodyEntry[];
  
  // Notes
  notes?: string;
  
  // Metadata
  coordinatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChainOfCustodyEntry {
  timestamp: string;
  transferredFrom: string;
  transferredTo: string;
  location: string;
  purpose: string;
  signature?: string;
}

/**
 * Sensitive notification for potential matches
 */
export interface MorgueNotification {
  id: string;
  caseId: string;
  matchId: string;
  
  // Notification details
  notificationType: 'potential_match' | 'dna_results' | 'confirmation' | 'ruled_out';
  sensitivity: NotificationSensitivity;
  
  // Recipients
  primaryLiaisonId: string;
  familyContactIds: string[];
  
  // Scheduling
  scheduledDate?: string;
  scheduledTime?: string;
  deliveryMethod: 'in_person' | 'phone' | 'video_call' | 'liaison_facilitated';
  
  // Location (for in-person)
  meetingLocation?: string;
  
  // Support
  griefCounselorPresent: boolean;
  griefCounselorId?: string;
  additionalSupportStaff?: string[];
  
  // Status
  status: 'scheduled' | 'delivered' | 'postponed' | 'cancelled';
  deliveredDate?: string;
  deliveredBy?: string;
  
  // Follow-up
  familyReaction?: string;
  immediateSupport?: string;
  followUpRequired: boolean;
  followUpScheduledDate?: string;
  
  // Resources provided
  resourcesProvided: string[];
  griefSupportOffered: string[];
  
  // Notes
  notes?: string;
  sensitiveNotes?: string; // Extra restricted access
  
  // Metadata
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Grief support resource specific to morgue/coroner cases
 */
export interface GriefSupportResource {
  id: string;
  type: GriefSupportType;
  name: string;
  nameFr?: string;
  description: string;
  descriptionFr?: string;
  
  // Organization
  organizationName: string;
  specializesInTrauma: boolean;
  specializesInViolentDeath: boolean;
  specializesInUnidentifiedRemains: boolean;
  
  // Contact
  phone?: string;
  tollFreePhone?: string;
  crisisLine?: string;
  email?: string;
  website?: string;
  
  // Availability
  available24_7: boolean;
  operatingHours?: string;
  responseTime?: string;
  
  // Location
  servesProvinces: string[];
  servesNationally: boolean;
  inPersonAvailable: boolean;
  virtualAvailable: boolean;
  
  // Language & accessibility
  languages: string[];
  accessibilityFeatures?: string[];
  
  // Cost
  isFree: boolean;
  costInfo?: string;
  financialAssistanceAvailable: boolean;
  
  // Eligibility
  eligibilityNotes?: string;
  
  // Metadata
  isActive: boolean;
  priority: number;
  verifiedAt?: string;
  verifiedBy?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Family liaison protocol for morgue cases
 */
export interface MorgueLiaisonProtocol {
  id: string;
  caseId: string;
  matchId?: string;
  
  // Liaison assignment
  primaryLiaisonId: string;
  backupLiaisonId?: string;
  griefSpecialistId?: string;
  
  // Communication plan
  preferredContactMethod: 'phone' | 'in_person' | 'video' | 'liaison_visit';
  contactFrequency: 'daily' | 'every_other_day' | 'weekly' | 'as_needed';
  familyPreferences?: string;
  
  // Support plan
  griefSupportResourcesProvided: string[];
  counselingReferralsMade: string[];
  financialAssistanceReferrals: string[];
  legalAidReferrals: string[];
  
  // Check-ins
  scheduledCheckIns: string[]; // IDs from scheduled_check_ins table
  lastCheckInDate?: string;
  nextCheckInDate?: string;
  
  // Special considerations
  culturalConsiderations?: string;
  languageNeeds?: string;
  accessibilityNeeds?: string;
  traumaInformedCare: boolean;
  
  // Status
  isActive: boolean;
  suspendedReason?: string;
  closedDate?: string;
  closedReason?: string;
  
  // Notes
  notes?: string;
  
  // Metadata
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

export interface QueryUnidentifiedRemainsRequest {
  caseId: string;
  searchCriteria: {
    ageRange?: { min: number; max: number };
    sex?: string;
    heightRange?: { min: number; max: number };
    weightRange?: { min: number; max: number };
    hairColor?: string;
    eyeColor?: string;
    location?: string;
    province?: string;
    dateRange?: { start: string; end: string };
    hasPersonalEffects?: boolean;
    hasDNA?: boolean;
  };
}

export interface QueryUnidentifiedRemainsResponse {
  query: MorgueRegistryQuery;
  results: UnidentifiedRemains[];
  totalCount: number;
}

export interface CreateMatchRequest {
  caseId: string;
  remainsId: string;
  matchConfidence: MatchConfidence;
  matchedFeatures: string[];
  notes?: string;
}

export interface UpdateMatchStatusRequest {
  status: MorgueRegistryMatch['status'];
  investigationNotes?: string;
  dnaComparisonRequested?: boolean;
}

export interface CreateDNACoordinationRequest {
  caseId: string;
  matchId?: string;
  sampleType: DNASampleType;
  sampleSource: DNACoordination['sampleSource'];
  familyMemberId?: string;
  familyRelationship?: string;
  labName?: string;
  priority?: DNACoordination['priority'];
  consentObtained: boolean;
}

export interface ScheduleNotificationRequest {
  caseId: string;
  matchId: string;
  notificationType: MorgueNotification['notificationType'];
  sensitivity: NotificationSensitivity;
  familyContactIds: string[];
  scheduledDate?: string;
  scheduledTime?: string;
  deliveryMethod: MorgueNotification['deliveryMethod'];
  griefCounselorPresent?: boolean;
}

// =============================================================================
// DISPLAY HELPERS
// =============================================================================

export const REMAINS_STATUS_LABELS: Record<RemainsStatus, string> = {
  unidentified: 'Unidentified',
  pending_identification: 'Pending Identification',
  identified: 'Identified',
  claimed: 'Claimed by Family',
  buried_unclaimed: 'Buried (Unclaimed)',
};

export const CAUSE_OF_DEATH_LABELS: Record<CauseOfDeath, string> = {
  undetermined: 'Undetermined',
  natural: 'Natural Causes',
  accident: 'Accidental',
  suicide: 'Suicide',
  homicide: 'Homicide',
  pending_investigation: 'Pending Investigation',
};

export const MATCH_CONFIDENCE_LABELS: Record<MatchConfidence, string> = {
  low: 'Low Confidence',
  medium: 'Medium Confidence',
  high: 'High Confidence',
  very_high: 'Very High Confidence',
  confirmed: 'Confirmed Match',
};

export const DNA_SAMPLE_STATUS_LABELS: Record<DNASampleStatus, string> = {
  not_collected: 'Not Collected',
  collected: 'Collected',
  submitted_to_lab: 'Submitted to Lab',
  in_analysis: 'In Analysis',
  results_pending: 'Results Pending',
  results_available: 'Results Available',
  match_found: 'Match Found',
  no_match: 'No Match',
  inconclusive: 'Inconclusive',
};

export const NOTIFICATION_SENSITIVITY_LABELS: Record<NotificationSensitivity, string> = {
  standard: 'Standard',
  high: 'High Sensitivity',
  critical: 'Critical',
  requires_in_person: 'Requires In-Person',
};

export const GRIEF_SUPPORT_TYPE_LABELS: Record<GriefSupportType, string> = {
  counseling: 'Grief Counseling',
  support_group: 'Support Group',
  crisis_hotline: 'Crisis Hotline',
  funeral_assistance: 'Funeral Assistance',
  legal_aid: 'Legal Aid',
  spiritual_care: 'Spiritual Care',
};
