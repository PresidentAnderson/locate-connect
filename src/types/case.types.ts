/**
 * Missing Person Case Types
 */

export type PriorityLevel = 0 | 1 | 2 | 3 | 4;

export interface MissingPerson {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  lastSeenDate: string;
  lastSeenLocation: {
    address: string;
    city: string;
    province: string;
    postalCode: string;
    coordinates?: { lat: number; lng: number };
  };
  physicalDescription: {
    height: string;
    weight: string;
    hairColor: string;
    eyeColor: string;
    distinguishingFeatures: string;
  };
  photoUrls: string[];
  medicalConditions: MedicalCondition[];
  medications: Medication[];
  socialMedia: SocialMediaAccount[];
  knownEmails: string[];
  knownPhoneNumbers: string[];
  priorityLevel: PriorityLevel;
  priorityFactors: PriorityFactor[];
  status: CaseStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MedicalCondition {
  condition: string;
  severity: "low" | "medium" | "high" | "critical";
  requiresDailyMedication: boolean;
  notes: string;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  lastKnownDose: string;
  criticalIfMissed: boolean;
  hoursUntilCritical?: number;
}

export interface SocialMediaAccount {
  platform: "facebook" | "instagram" | "twitter" | "tiktok" | "linkedin" | "other";
  username: string;
  profileUrl: string;
  lastActivity?: string;
  isMonitored: boolean;
}

export interface PriorityFactor {
  factor: string;
  weight: number;
  description: string;
  source: string;
}

export type CaseStatus =
  | "active"
  | "resolved_found_safe"
  | "resolved_found_deceased"
  | "resolved_returned"
  | "closed_insufficient_info"
  | "archived";

export interface CaseReport {
  id: string;
  caseId: string;
  reporterId: string;
  missingPerson: MissingPerson;
  reporter: Reporter;
  knownAssociates: KnownAssociate[];
  potentialThreats: PotentialThreat[];
  timeline: TimelineEvent[];
  leads: Lead[];
  jurisdictionProfile: string;
  createdAt: string;
  updatedAt: string;
}

export interface Reporter {
  id: string;
  firstName: string;
  lastName: string;
  relationship: RelationshipType;
  email: string;
  phone: string;
  address: string;
  identityVerified: boolean;
  consentGiven: boolean;
  consentTimestamp: string;
}

export type RelationshipType =
  | "parent"
  | "spouse"
  | "sibling"
  | "child"
  | "friend"
  | "employer"
  | "coworker"
  | "neighbor"
  | "social_worker"
  | "healthcare_provider"
  | "other";

export interface KnownAssociate {
  name: string;
  relationship: string;
  contactInfo: string;
  lastContact: string;
  locationNearMissing: boolean;
  coordinates?: { lat: number; lng: number };
  notes: string;
}

export interface PotentialThreat {
  id: string;
  name: string;
  relationship: string;
  threatLevel: "low" | "medium" | "high";
  description: string;
  lastKnownLocation: string;
  hasHistoryOfViolence: boolean;
  restrainingOrder: boolean;
  notes: string;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  type: "sighting" | "contact" | "social_media" | "financial" | "other";
  description: string;
  location?: string;
  source: string;
  verified: boolean;
}

export interface Lead {
  id: string;
  type: "social_media" | "email_opened" | "location" | "witness" | "hospital" | "detention" | "other";
  description: string;
  priority: "low" | "medium" | "high";
  status: "new" | "investigating" | "verified" | "dismissed";
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}
