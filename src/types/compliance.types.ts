/**
 * Compliance & Launch Types
 * Types for accessibility, i18n, privacy compliance, and phase 2 features
 */

// Supported Languages
export type SupportedLanguage =
  | "en"
  | "fr"
  // Indigenous languages
  | "cr" // Cree
  | "oj" // Ojibwe
  | "iu" // Inuktitut
  | "moh" // Mohawk
  | "mi" // Mi'kmaq
  | "dak" // Dakota/Sioux
  | "bla"; // Blackfoot

export type LanguageDirection = "ltr" | "rtl";

// i18n Configuration
export interface LanguageConfig {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  direction: LanguageDirection;
  enabled: boolean;
  isIndigenous: boolean;
  region?: string;
  fallbackLanguage?: SupportedLanguage;
  completionPercentage: number;
}

export interface TranslationNamespace {
  common: Record<string, string>;
  navigation: Record<string, string>;
  forms: Record<string, string>;
  errors: Record<string, string>;
  accessibility: Record<string, string>;
  cases: Record<string, string>;
  leads: Record<string, string>;
  alerts: Record<string, string>;
  settings: Record<string, string>;
  intake: Record<string, string>;
  public: Record<string, string>;
}

// Accessibility (WCAG 2.1 AA)
export interface AccessibilityConfig {
  // Visual
  highContrastMode: boolean;
  reducedMotion: boolean;
  fontSize: "small" | "medium" | "large" | "x-large";
  colorBlindMode?: "protanopia" | "deuteranopia" | "tritanopia";

  // Audio
  screenReaderOptimized: boolean;
  audioDescriptions: boolean;

  // Motor
  keyboardNavigation: boolean;
  stickyKeys: boolean;
  focusIndicatorSize: "normal" | "large";

  // Cognitive
  simplifiedUI: boolean;
  readingGuide: boolean;
  textSpacing: "normal" | "wide" | "extra-wide";
}

export interface AccessibilityAuditResult {
  id: string;
  url: string;
  timestamp: string;
  score: number; // 0-100
  level: "A" | "AA" | "AAA";

  violations: AccessibilityViolation[];
  passes: number;
  incomplete: number;

  categories: {
    perceivable: CategoryScore;
    operable: CategoryScore;
    understandable: CategoryScore;
    robust: CategoryScore;
  };
}

export interface AccessibilityViolation {
  id: string;
  impact: "critical" | "serious" | "moderate" | "minor";
  description: string;
  help: string;
  helpUrl: string;
  nodes: Array<{
    html: string;
    target: string[];
    failureSummary: string;
  }>;
  wcagCriteria: string[];
}

export interface CategoryScore {
  score: number;
  issues: number;
  passed: number;
}

// Quebec Privacy Law (Law 25)
export interface PrivacyCompliance {
  // Consent management
  consentRequired: boolean;
  consentObtained: boolean;
  consentDate?: string;
  consentVersion?: string;

  // Data subject rights
  accessRequestEnabled: boolean;
  rectificationEnabled: boolean;
  deletionEnabled: boolean;
  portabilityEnabled: boolean;

  // Privacy officer
  privacyOfficer: {
    name: string;
    email: string;
    phone?: string;
  };

  // Data inventory
  dataCategories: DataCategory[];

  // Breach notification
  breachNotificationProcedure: string;
  breachNotificationTimeframe: number; // hours
}

export interface DataCategory {
  id: string;
  name: string;
  description: string;
  personalData: boolean;
  sensitiveData: boolean;
  retentionPeriod: number; // days
  legalBasis: string;
  thirdPartySharing: boolean;
  crossBorderTransfer: boolean;
}

export interface PrivacyRequest {
  id: string;
  type: "access" | "rectification" | "deletion" | "portability" | "objection";
  status: "pending" | "processing" | "completed" | "denied";
  requesterId: string;
  requesterEmail: string;
  description: string;
  createdAt: string;
  dueDate: string;
  completedAt?: string;
  response?: string;
  attachments: string[];
}

// Media Access Charter
export interface MediaAccessCharter {
  version: string;
  effectiveDate: string;

  // Access levels
  accessLevels: MediaAccessLevel[];

  // Request process
  requestProcess: string;
  responseTimeframe: number; // hours
  appealProcess: string;

  // Restrictions
  restrictions: MediaRestriction[];

  // Contact
  mediaContact: {
    name: string;
    title: string;
    email: string;
    phone: string;
  };
}

export interface MediaAccessLevel {
  id: string;
  name: string;
  description: string;
  dataAccess: string[];
  restrictions: string[];
  approvalRequired: boolean;
}

export interface MediaRestriction {
  id: string;
  category: string;
  description: string;
  legalBasis: string;
}

export interface MediaRequest {
  id: string;
  organizationName: string;
  journalistName: string;
  email: string;
  phone?: string;
  requestType: "information" | "interview" | "data" | "statement";
  description: string;
  caseIds?: string[];
  status: "pending" | "approved" | "denied" | "completed";
  accessLevel?: string;
  createdAt: string;
  respondedAt?: string;
  response?: string;
}

// Public FAQ
export interface FAQCategory {
  id: string;
  name: Record<SupportedLanguage, string>;
  description: Record<SupportedLanguage, string>;
  order: number;
  icon?: string;
}

export interface FAQItem {
  id: string;
  categoryId: string;
  question: Record<SupportedLanguage, string>;
  answer: Record<SupportedLanguage, string>;
  order: number;
  tags: string[];
  helpful: number;
  notHelpful: number;
  createdAt: string;
  updatedAt: string;
}

// Anonymous Tip Submission
export interface AnonymousTip {
  id: string;
  tipCode: string; // For follow-up without identity
  caseNumber?: string;

  // Tip content
  description: string;
  location?: {
    description: string;
    city?: string;
    province?: string;
    coordinates?: { lat: number; lng: number };
  };
  sightingDate?: string;
  sightingTime?: string;

  // Person description
  personDescription?: string;
  vehicleDescription?: string;
  companionDescription?: string;

  // Attachments (encrypted)
  attachments: Array<{
    id: string;
    type: "image" | "video" | "document";
    encryptedUrl: string;
  }>;

  // Status
  status: "new" | "reviewing" | "verified" | "actionable" | "closed";
  priority: "critical" | "high" | "medium" | "low";

  // Metadata (no PII)
  submittedAt: string;
  language: SupportedLanguage;
  source: "web" | "phone" | "app";
}

// Public API
export interface PublicAPIKey {
  id: string;
  name: string;
  organizationId: string;
  organizationName: string;
  keyPrefix: string; // First 8 chars for identification
  hashedKey: string;

  // Permissions
  scopes: PublicAPIScope[];
  rateLimit: number; // requests per hour

  // Status
  status: "active" | "suspended" | "revoked";

  // Usage
  lastUsedAt?: string;
  totalRequests: number;

  // Metadata
  createdAt: string;
  expiresAt?: string;
  createdBy: string;
}

export type PublicAPIScope =
  | "cases:read"
  | "cases:search"
  | "tips:submit"
  | "alerts:read"
  | "statistics:read";

export interface PublicAPIRequest {
  id: string;
  organizationName: string;
  contactName: string;
  contactEmail: string;
  purpose: string;
  requestedScopes: PublicAPIScope[];
  status: "pending" | "approved" | "denied";
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  apiKeyId?: string;
}

// Volunteer Network
export interface VolunteerProfile {
  id: string;
  userId?: string;
  name: string;
  email: string;
  phone: string;
  location: {
    city: string;
    province: string;
    postalCode: string;
    coordinates?: { lat: number; lng: number };
  };

  // Skills & availability
  skills: string[];
  languages: SupportedLanguage[];
  availability: VolunteerAvailability;
  searchRadius: number; // km

  // Verification
  verified: boolean;
  verifiedAt?: string;
  backgroundCheck?: {
    status: "pending" | "passed" | "failed";
    completedAt?: string;
  };

  // Statistics
  searchPartiesJoined: number;
  hoursVolunteered: number;
  rating?: number;

  // Status
  status: "active" | "inactive" | "suspended";
  createdAt: string;
  updatedAt: string;
}

export interface VolunteerAvailability {
  weekdays: boolean;
  weekends: boolean;
  evenings: boolean;
  onCall: boolean;
  specificDays?: number[]; // 0-6, Sunday = 0
}

export interface VolunteerOpportunity {
  id: string;
  caseId: string;
  type: "search_party" | "poster_distribution" | "social_media" | "translation" | "other";
  title: string;
  description: string;
  location: {
    address: string;
    city: string;
    province: string;
    coordinates: { lat: number; lng: number };
  };
  dateTime: string;
  duration: number; // hours
  volunteersNeeded: number;
  volunteersRegistered: number;
  skills?: string[];
  languages?: SupportedLanguage[];
  status: "open" | "full" | "completed" | "cancelled";
  createdAt: string;
}

// AI Photo Matching
export interface PhotoMatchRequest {
  id: string;
  caseId: string;
  sourceImageUrl: string;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: string;
  completedAt?: string;
  results?: PhotoMatchResult[];
}

export interface PhotoMatchResult {
  id: string;
  matchedImageUrl: string;
  source: string;
  confidence: number; // 0-100
  facialFeatures: {
    similarity: number;
    ageEstimate?: number;
    genderEstimate?: string;
  };
  metadata?: Record<string, unknown>;
  verifiedBy?: string;
  verifiedAt?: string;
  isMatch?: boolean;
}

// Mobile App
export interface MobileAppConfig {
  minVersion: {
    ios: string;
    android: string;
  };
  features: {
    pushNotifications: boolean;
    offlineMode: boolean;
    biometricAuth: boolean;
    cameraAccess: boolean;
    locationServices: boolean;
  };
  updateRequired: boolean;
  maintenanceMode: boolean;
}

export interface PushNotificationPreferences {
  userId: string;
  enabled: boolean;
  categories: {
    newCases: boolean;
    caseUpdates: boolean;
    alerts: boolean;
    searchParties: boolean;
    tips: boolean;
  };
  quietHours?: {
    enabled: boolean;
    start: string; // HH:mm
    end: string;
  };
}

// Phase 2 Gating
export interface Phase2Criteria {
  id: string;
  name: string;
  description: string;
  category: "technical" | "compliance" | "operational" | "business";
  status: "not_started" | "in_progress" | "completed" | "blocked";
  progress: number; // 0-100
  blockers?: string[];
  owner: string;
  dueDate: string;
  completedAt?: string;
  evidence?: string[];
}

export interface Phase2Readiness {
  overallProgress: number;
  criteriaByCategory: Record<string, {
    total: number;
    completed: number;
    blocked: number;
  }>;
  blockers: Array<{
    criteriaId: string;
    description: string;
    severity: "critical" | "high" | "medium";
  }>;
  estimatedReadyDate?: string;
  lastUpdated: string;
}

// Multi-jurisdiction
export interface Jurisdiction {
  id: string;
  code: string;
  name: Partial<Record<SupportedLanguage, string>>;
  type: "federal" | "provincial" | "territorial" | "municipal" | "indigenous";
  parentId?: string;
  country: string;

  // Configuration
  timezone: string;
  languages: SupportedLanguage[];
  privacyRegulation: string;

  // Contacts
  primaryContact?: {
    name: string;
    title: string;
    email: string;
    phone: string;
  };

  // Status
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JurisdictionAgreement {
  id: string;
  jurisdictionIds: string[];
  type: "data_sharing" | "notification" | "cooperation";
  name: string;
  description: string;
  effectiveDate: string;
  expirationDate?: string;
  status: "draft" | "active" | "expired" | "terminated";
  documentUrl?: string;
  signatories: Array<{
    jurisdictionId: string;
    signedBy: string;
    signedAt: string;
  }>;
}
