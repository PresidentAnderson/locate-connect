/**
 * Historical Case Archive & Research Portal Types
 * LC-FEAT-041
 */

// Archive Status
export type ArchiveStatus =
  | 'pending_anonymization'
  | 'anonymized'
  | 'published'
  | 'restricted'
  | 'withdrawn';

// Research Access Levels
export type ResearchAccessLevel =
  | 'public'
  | 'academic'
  | 'law_enforcement'
  | 'restricted';

// Access Request Status
export type AccessRequestStatus =
  | 'pending'
  | 'approved'
  | 'denied'
  | 'revoked'
  | 'expired';

// Partnership Status
export type PartnershipStatus =
  | 'pending'
  | 'active'
  | 'suspended'
  | 'terminated';

// Research Categories
export type ResearchCategory =
  | 'academic'
  | 'law_enforcement_training'
  | 'policy_development'
  | 'pattern_analysis'
  | 'best_practices';

// Export Formats
export type ExportFormat = 'csv' | 'json' | 'pdf' | 'anonymized_dataset';

// Archived Case (Anonymized)
export interface ArchivedCase {
  id: string;
  originalCaseId?: string;
  archiveNumber: string;
  archiveStatus: ArchiveStatus;
  accessLevel: ResearchAccessLevel;
  archivedAt: string;
  archivedBy?: string;

  // Anonymized demographics
  caseCategory: string;
  ageRange?: string;
  genderAnonymized?: string;

  // Geographic (generalized)
  region?: string;
  province?: string;
  jurisdictionType?: string;
  urbanRural?: string;

  // Risk factors (boolean flags only)
  hadMedicalConditions: boolean;
  hadMentalHealthConditions: boolean;
  hadMedicationDependency: boolean;
  wasMinor: boolean;
  wasElderly: boolean;
  wasIndigenous: boolean;
  hadDementia: boolean;
  hadAutism: boolean;
  wasSuicidalRisk: boolean;
  suspectedAbduction: boolean;
  suspectedFoulPlay: boolean;

  // Timeline (anonymized)
  yearReported?: number;
  monthReported?: number;
  season?: string;
  timeOfDay?: string;
  dayOfWeek?: string;
  hoursToResolution?: number;
  daysToResolution?: number;

  // Outcome
  disposition: string;
  resolutionType?: string;
  wasFoundWithinJurisdiction?: boolean;
  distanceFromLastSeenKm?: number;

  // Priority tracking
  initialPriorityLevel?: string;
  finalPriorityLevel?: string;
  priorityEscalated: boolean;

  // Investigation metrics
  numberOfLeads: number;
  numberOfVerifiedLeads: number;
  numberOfTips: number;
  numberOfVerifiedTips: number;
  lawEnforcementAgenciesInvolved: number;
  mediaCoverageLevel?: string;
  amberAlertIssued: boolean;

  // Learnings
  keyFactors: Record<string, unknown>[];
  lessonsLearned?: string;
  bestPracticesApplied?: string[];
  challengesFaced?: string[];

  // Research metadata
  researchTags: string[];
  caseStudyPotential: boolean;
  featuredInTraining: boolean;

  // Privacy
  familyOptedOut: boolean;
  optOutDate?: string;
  anonymizationVerified: boolean;

  createdAt: string;
  updatedAt: string;
}

// Anonymization Rule
export interface AnonymizationRule {
  id: string;
  name: string;
  description?: string;
  fieldName: string;
  ruleType: 'remove' | 'generalize' | 'hash' | 'range' | 'category';
  ruleConfig: Record<string, unknown>;
  isActive: boolean;
  priority: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Family Opt-Out Request
export interface FamilyOptOut {
  id: string;
  caseId: string;
  requesterId?: string;
  requesterRelationship?: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone?: string;
  reason?: string;
  optOutScope: 'full' | 'research_only' | 'training_only';
  verificationToken?: string;
  verifiedAt?: string;
  isVerified: boolean;
  approvedBy?: string;
  approvedAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Research Access Request
export interface ResearchAccessRequest {
  id: string;
  requesterId?: string;

  // Requester info
  requesterName: string;
  requesterEmail: string;
  requesterPhone?: string;
  organizationName: string;
  organizationType: string;
  positionTitle?: string;

  // Request details
  accessLevelRequested: ResearchAccessLevel;
  researchPurpose: string;
  researchCategory: ResearchCategory;
  researchTitle: string;
  researchDescription: string;
  methodology?: string;
  expectedOutcomes?: string;
  ethicsApprovalNumber?: string;
  ethicsApprovalDocumentUrl?: string;

  // Data requirements
  requestedDateRangeStart?: string;
  requestedDateRangeEnd?: string;
  requestedRegions?: string[];
  requestedCaseTypes?: string[];
  requestedFields?: string[];
  estimatedCasesNeeded?: number;

  // Access duration
  accessStartDate?: string;
  accessEndDate?: string;
  accessDurationMonths: number;

  // Status
  status: AccessRequestStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  denialReason?: string;

  // Agreement
  dataUseAgreementSigned: boolean;
  agreementSignedAt?: string;
  agreementDocumentUrl?: string;

  createdAt: string;
  updatedAt: string;
}

// Academic Partnership
export interface AcademicPartnership {
  id: string;

  // Institution info
  institutionName: string;
  institutionType: string;
  department?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country: string;
  website?: string;

  // Primary contact
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone?: string;
  primaryContactPosition?: string;

  // Secondary contact
  secondaryContactName?: string;
  secondaryContactEmail?: string;
  secondaryContactPhone?: string;

  // Partnership details
  partnershipType: string;
  focusAreas: string[];
  accessLevel: ResearchAccessLevel;
  status: PartnershipStatus;

  // Agreement
  mouDocumentUrl?: string;
  mouSignedDate?: string;
  mouExpiryDate?: string;
  autoRenew: boolean;

  // Approval
  approvedBy?: string;
  approvedAt?: string;
  approvalNotes?: string;

  // Usage tracking
  totalDataExports: number;
  totalCaseStudiesAccessed: number;
  lastAccessAt?: string;

  createdAt: string;
  updatedAt: string;
}

// Partnership Member
export interface PartnershipMember {
  id: string;
  partnershipId: string;
  userId?: string;
  memberName: string;
  memberEmail: string;
  position?: string;
  accessGrantedAt: string;
  accessExpiresAt?: string;
  isActive: boolean;
  canExportData: boolean;
  canAccessCaseStudies: boolean;
  canViewStatistics: boolean;
  addedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Data Use Agreement
export interface DataUseAgreement {
  id: string;
  accessRequestId?: string;
  partnershipId?: string;

  // Agreement details
  agreementType: 'individual' | 'institutional' | 'partnership';
  version: string;
  documentUrl?: string;

  // Parties
  researcherName: string;
  researcherEmail: string;
  institutionName: string;
  principalInvestigator?: string;

  // Terms
  permittedUses: string[];
  prohibitedUses: string[];
  dataRetentionPeriodMonths: number;
  destructionRequired: boolean;
  publicationReviewRequired: boolean;
  attributionRequired: boolean;

  // Signatures
  researcherSignedAt?: string;
  adminSignedAt?: string;
  adminSignedBy?: string;

  // Status
  isActive: boolean;
  expiredAt?: string;
  revokedAt?: string;
  revokedBy?: string;
  revocationReason?: string;

  createdAt: string;
  updatedAt: string;
}

// Case Study
export interface CaseStudy {
  id: string;
  archivedCaseId: string;
  studyNumber: string;
  title: string;
  subtitle?: string;
  abstract: string;

  // Content sections
  introduction?: string;
  background?: string;
  methodologyApplied?: string;
  timelineSummary?: string;
  keyDecisions?: string;
  challengesSection?: string;
  resolutionDetails?: string;
  lessonsLearned?: string;
  recommendations?: string;
  conclusion?: string;

  // Categorization
  category: ResearchCategory;
  tags: string[];
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  targetAudience: string[];

  // Access control
  accessLevel: ResearchAccessLevel;
  requiresAgreement: boolean;

  // Publication
  isPublished: boolean;
  publishedAt?: string;
  publishedBy?: string;

  // Review
  isReviewed: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;

  // Authorship
  authorId?: string;
  contributingAuthors?: string[];
  externalReviewers?: string[];

  // Usage tracking
  viewCount: number;
  downloadCount: number;
  citationCount: number;

  createdAt: string;
  updatedAt: string;
}

// Case Study Section
export interface CaseStudySection {
  id: string;
  caseStudyId: string;
  sectionType: 'text' | 'timeline' | 'decision_tree' | 'map' | 'statistics' | 'quiz';
  sectionOrder: number;
  title: string;
  content: Record<string, unknown>;
  isVisible: boolean;
  accessLevel: ResearchAccessLevel;
  createdAt: string;
  updatedAt: string;
}

// Research Export
export interface ResearchExport {
  id: string;
  userId?: string;
  partnershipId?: string;
  accessRequestId?: string;

  // Export details
  exportName: string;
  exportFormat: ExportFormat;
  exportDescription?: string;

  // Data selection
  filterCriteria: Record<string, unknown>;
  dateRangeStart?: string;
  dateRangeEnd?: string;
  regions?: string[];
  caseTypes?: string[];
  includedFields: string[];
  excludedFields: string[];

  // Results
  totalRecords?: number;
  fileUrl?: string;
  fileSizeBytes?: number;
  checksum?: string;

  // Status
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired';
  errorMessage?: string;

  // Expiration
  expiresAt?: string;
  downloadCount: number;
  maxDownloads: number;

  // Audit
  ipAddress?: string;
  userAgent?: string;

  createdAt: string;
  completedAt?: string;
  lastDownloadedAt?: string;
}

// Archive Statistics
export interface ArchiveStatistic {
  id: string;
  statisticType: string;
  statisticKey: string;
  data: Record<string, unknown>;
  computedAt: string;
  validUntil?: string;
  isStale: boolean;
  createdAt: string;
  updatedAt: string;
}

// Research Activity Log
export interface ResearchActivityLog {
  id: string;
  userId?: string;
  partnershipId?: string;
  accessRequestId?: string;
  action: 'search' | 'view_case' | 'view_study' | 'export' | 'download';
  resourceType: 'archived_case' | 'case_study' | 'statistics' | 'export';
  resourceId?: string;
  details: Record<string, unknown>;
  searchQuery?: string;
  filtersApplied?: Record<string, unknown>;
  resultsCount?: number;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  createdAt: string;
}

// Search/Filter Types
export interface ArchiveSearchFilters {
  query?: string;
  caseCategory?: string[];
  ageRange?: string[];
  province?: string[];
  disposition?: string[];
  yearReported?: { min?: number; max?: number };
  researchTags?: string[];
  accessLevel?: ResearchAccessLevel;
  caseStudyPotential?: boolean;
  hasLessonsLearned?: boolean;
}

export interface ArchiveSearchResult {
  cases: ArchivedCase[];
  total: number;
  page: number;
  pageSize: number;
  aggregations?: {
    byCategory?: Record<string, number>;
    byProvince?: Record<string, number>;
    byDisposition?: Record<string, number>;
    byYear?: Record<number, number>;
  };
}

// Statistics Types
export interface ArchiveOverviewStats {
  totalCases: number;
  totalCaseStudies: number;
  activePartnerships: number;
  totalResearchers: number;
  casesThisYear: number;
  resolutionRate: number;
}

export interface DispositionStats {
  disposition: string;
  count: number;
  percentage: number;
}

export interface TimeToResolutionStats {
  category: string;
  averageDays: number;
  medianDays: number;
  minDays: number;
  maxDays: number;
}

export interface RegionalStats {
  province: string;
  totalCases: number;
  resolvedCases: number;
  resolutionRate: number;
  averageDaysToResolution: number;
}

export interface YearlyTrend {
  year: number;
  totalCases: number;
  resolvedCases: number;
  byDisposition: Record<string, number>;
}
