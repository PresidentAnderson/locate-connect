/**
 * Cold Case Revival System Types
 * LC-FEAT-028
 */

// =============================================================================
// ENUMS
// =============================================================================

export type ColdCaseClassification =
  | 'auto_classified'
  | 'manually_classified'
  | 'reclassified_active'
  | 'under_review';

export type ReviewFrequency =
  | 'monthly'
  | 'quarterly'
  | 'semi_annual'
  | 'annual'
  | 'biennial';

export type DNASubmissionStatus =
  | 'not_submitted'
  | 'pending_submission'
  | 'submitted'
  | 'match_found'
  | 'no_match'
  | 'resubmission_pending'
  | 'resubmitted';

export type CampaignType =
  | 'social_media'
  | 'press_release'
  | 'billboard'
  | 'tv_spot'
  | 'radio_spot'
  | 'anniversary_push'
  | 'community_event'
  | 'podcast_feature'
  | 'documentary'
  | 'reward_increase';

export type CampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'completed'
  | 'cancelled';

export type ChecklistStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'skipped'
  | 'not_applicable';

export type PatternConfidence =
  | 'low'
  | 'medium'
  | 'high'
  | 'very_high';

export type ReviewStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'deferred';

export type ReviewType =
  | 'periodic'
  | 'special'
  | 'anniversary'
  | 'tip_triggered';

export type RevivalDecision =
  | 'revive'
  | 'maintain_cold'
  | 'archive';

export type EvidenceType =
  | 'physical'
  | 'digital'
  | 'witness'
  | 'forensic'
  | 'documentary';

export type SignificanceLevel =
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

export type VerificationStatus =
  | 'unverified'
  | 'verified'
  | 'disputed';

export type ChecklistCategory =
  | 'evidence'
  | 'witnesses'
  | 'technology'
  | 'databases'
  | 'family'
  | 'media'
  | 'crossref'
  | 'admin';

export type PatternMatchType =
  | 'geographic'
  | 'demographic'
  | 'temporal'
  | 'modus_operandi'
  | 'circumstantial';

export type RevivalTriggerType =
  | 'eligibility_engine'
  | 'new_tip'
  | 'new_evidence'
  | 'family_request'
  | 'anniversary'
  | 'pattern_match'
  | 'admin_review'
  | 'manual';

export type RevivalTriggerSource =
  | 'system'
  | 'family'
  | 'law_enforcement'
  | 'partner'
  | 'public'
  | 'admin';

// =============================================================================
// COLD CASE PROFILE
// =============================================================================

export interface ColdCaseProfile {
  id: string;
  caseId: string;

  // Classification
  classification: ColdCaseClassification;
  classifiedAt: string;
  classifiedBy?: string;
  classificationReason?: string;

  // Cold case timing
  becameColdAt: string;
  daysSinceCold: number;
  totalDaysMissing?: number;

  // Auto-classification criteria
  criteriaNoLeads90Days: boolean;
  criteriaNoTips60Days: boolean;
  criteriaNoActivity180Days: boolean;
  criteriaManuallyMarked: boolean;
  criteriaResourceConstraints: boolean;

  // Review scheduling
  reviewFrequency: ReviewFrequency;
  lastReviewDate?: string;
  nextReviewDate?: string;
  reviewsCompleted: number;

  // Current review assignment
  currentReviewerId?: string;
  reviewStartedAt?: string;
  reviewDueDate?: string;

  // Revival tracking
  revivalAttempts: number;
  lastRevivalAttempt?: string;
  revivalSuccessCount: number;

  // DNA tracking
  dnaSubmissionStatus: DNASubmissionStatus;
  dnaLastSubmittedAt?: string;
  dnaDatabaseChecked: string[];
  dnaSamplesAvailable: boolean;

  // Anniversary tracking
  anniversaryDate?: string;
  lastAnniversaryCampaign?: string;
  nextAnniversaryCampaign?: string;

  // Cross-reference tracking
  potentiallyLinkedCases: string[];
  linkedResolvedCases: string[];

  // AI pattern matching
  patternMatchEnabled: boolean;
  lastPatternAnalysis?: string;
  patternClusters: string[];

  // Case file digitization
  digitizationStatus: string;
  digitizationProgress: number;
  physicalFilesLocation?: string;
  digitizedAt?: string;
  digitizedBy?: string;

  // Family contact
  familyNotifiedOfColdStatus: boolean;
  familyNotificationDate?: string;
  familyContactPreference?: string;
  familyLastContactDate?: string;
  familyOptedOutNotifications: boolean;

  // Notes and metadata
  revivalNotes?: string;
  specialCircumstances?: string;
  mediaRestrictions: Record<string, unknown>;

  // Priority scoring
  revivalPriorityScore: number;
  revivalPriorityFactors: RevivalPriorityFactor[];

  // Joined relations (populated by API)
  case?: {
    id: string;
    case_number: string;
    first_name: string;
    last_name: string;
    last_seen_date?: string;
    last_seen_location?: string;
    status: string;
    priority_level?: string;
    is_minor?: boolean;
    is_indigenous?: boolean;
    jurisdiction_id?: string;
    primary_photo_url?: string;
  };

  createdAt: string;
  updatedAt: string;
}

export interface RevivalPriorityFactor {
  factor: string;
  weight: number;
}

// =============================================================================
// COLD CASE REVIEW
// =============================================================================

export interface ColdCaseReview {
  id: string;
  coldCaseProfileId: string;
  caseId: string;

  // Review metadata
  reviewNumber: number;
  reviewType: ReviewType;

  // Reviewer info
  reviewerId: string;
  assignedAt: string;
  assignedBy?: string;

  // Review timing
  startedAt?: string;
  completedAt?: string;
  dueDate?: string;

  // Review status
  status: ReviewStatus;

  // Review outcomes
  newLeadsIdentified: number;
  newEvidenceFound: boolean;
  newEvidenceDescription?: string;
  dnaResubmissionRecommended: boolean;
  campaignRecommended: boolean;
  recommendedCampaignType?: CampaignType;
  escalationRecommended: boolean;
  escalationReason?: string;

  // Revival decision
  revivalRecommended: boolean;
  revivalDecision?: RevivalDecision;
  revivalJustification?: string;

  // Cross-reference findings
  crossReferencesChecked: number;
  relatedCasesIdentified: string[];

  // Pattern matching results
  patternMatchesFound: number;
  patternMatchDetails: PatternMatchResult[];

  // Summary
  summary?: string;
  recommendations?: string;
  nextSteps?: string;

  // Family notification
  familyNotified: boolean;
  familyNotificationDate?: string;
  familyNotificationMethod?: string;
  familyResponse?: string;

  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// REVIVAL TRIGGER LOG
// =============================================================================

export interface ColdCaseRevivalTrigger {
  id: string;
  caseId: string;
  coldCaseProfileId?: string | null;
  triggerType: RevivalTriggerType;
  triggerSource: RevivalTriggerSource;
  summary: string;
  details: Record<string, unknown>;
  createdBy?: string | null;
  createdAt: string;
}

export interface PatternMatchResult {
  matchedCaseId: string;
  matchType: PatternMatchType;
  confidence: PatternConfidence;
  matchingFactors: string[];
}

// =============================================================================
// CHECKLIST ITEM
// =============================================================================

export interface ChecklistItem {
  id: string;
  reviewId: string;

  // Item details
  category: ChecklistCategory;
  itemOrder: number;
  itemName: string;
  itemDescription?: string;

  // Status tracking
  status: ChecklistStatus;
  completedAt?: string;
  completedBy?: string;

  // Results
  resultSummary?: string;
  findings?: string;
  actionRequired: boolean;
  actionDescription?: string;

  // Notes
  notes?: string;
  attachments: Record<string, unknown>[];

  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// REVIEWER
// =============================================================================

export interface ColdCaseReviewer {
  id: string;
  reviewerId: string;

  // Reviewer qualifications
  isActive: boolean;
  specializations: string[];
  maxConcurrentReviews: number;

  // Assignment tracking
  currentAssignments: number;
  totalReviewsCompleted: number;
  totalRevivalsAchieved: number;

  // Rotation scheduling
  lastAssignmentDate?: string;
  nextAvailableDate?: string;
  rotationPriority: number;

  // Performance metrics
  averageReviewDurationDays?: number;
  revivalSuccessRate?: number;

  // Preferences
  preferredCaseTypes: string[];
  excludedJurisdictions: string[];

  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// CAMPAIGN
// =============================================================================

export interface ColdCaseCampaign {
  id: string;
  coldCaseProfileId: string;
  caseId: string;

  // Campaign details
  campaignType: CampaignType;
  campaignName: string;
  campaignDescription?: string;

  // Scheduling
  scheduledStart?: string;
  scheduledEnd?: string;
  actualStart?: string;
  actualEnd?: string;

  // Status
  status: CampaignStatus;

  // Anniversary-specific
  isAnniversaryCampaign: boolean;
  anniversaryYear?: number;
  yearsSinceDisappearance?: number;

  // Target metrics
  targetReach?: number;
  targetTips?: number;
  targetShares?: number;

  // Actual results
  actualReach: number;
  actualTipsGenerated: number;
  actualShares: number;
  actualLeadsGenerated: number;
  engagementRate?: number;

  // Platform-specific data
  platforms: string[];
  platformMetrics: Record<string, unknown>;

  // Content
  contentHeadline?: string;
  contentBody?: string;
  contentMediaUrls: string[];
  contentHashtags: string[];

  // Budget
  budgetAllocated?: number;
  budgetSpent?: number;

  // Approval
  approvedBy?: string;
  approvedAt?: string;
  familyApproved: boolean;
  familyApprovalDate?: string;

  // Post-campaign
  postCampaignAnalysis?: string;
  lessonsLearned?: string;

  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// DNA SUBMISSION
// =============================================================================

export interface DNASubmission {
  id: string;
  coldCaseProfileId: string;
  caseId: string;

  // Submission details
  databaseName: string;
  submissionType: string;
  submissionReference?: string;

  // Sample info
  sampleType?: string;
  sampleQuality?: string;
  sampleLocation?: string;

  // Timing
  submittedAt?: string;
  submittedBy?: string;
  expectedResultDate?: string;
  resultReceivedAt?: string;

  // Results
  status: DNASubmissionStatus;
  resultSummary?: string;
  matchFound: boolean;
  matchDetails?: string;
  matchConfidence?: string;

  // Follow-up
  followUpRequired: boolean;
  followUpNotes?: string;
  followUpCompletedAt?: string;

  // Documentation
  documentationUrl?: string;
  chainOfCustodyVerified: boolean;

  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// NEW EVIDENCE
// =============================================================================

export interface NewEvidence {
  id: string;
  coldCaseProfileId: string;
  caseId: string;

  // Evidence details
  evidenceType: EvidenceType;
  evidenceSource: string;
  evidenceDescription: string;

  // Discovery
  discoveredAt: string;
  discoveredBy?: string;
  discoveryContext?: string;

  // Assessment
  significanceLevel: SignificanceLevel;
  potentialImpact?: string;
  verificationStatus: VerificationStatus;
  verifiedBy?: string;
  verifiedAt?: string;

  // Processing
  processed: boolean;
  processedAt?: string;
  processingNotes?: string;

  // Related to revival
  triggeredReview: boolean;
  reviewId?: string;

  // Documentation
  documentationUrls: string[];
  chainOfCustody?: string;

  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// PATTERN MATCH
// =============================================================================

export interface ColdCasePatternMatch {
  id: string;
  sourceCaseId: string;
  matchedCaseId: string;

  // Match details
  matchType: PatternMatchType;
  confidenceLevel: PatternConfidence;
  confidenceScore: number;

  // Pattern details
  matchingFactors: MatchingFactor[];
  similarityScore: number;

  // Geographic patterns
  geographicProximityKm?: number;
  sameJurisdiction: boolean;
  sameRegion: boolean;

  // Temporal patterns
  temporalProximityDays?: number;
  sameTimeOfYear: boolean;
  sameDayOfWeek: boolean;

  // Demographic patterns
  ageSimilarity: boolean;
  genderMatch: boolean;
  otherDemographicMatches: string[];

  // Analysis
  analysisDate: string;
  analysisVersion?: string;
  algorithmUsed?: string;

  // Human review
  reviewed: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewDetermination?: string;
  reviewNotes?: string;

  // Action taken
  investigationOpened: boolean;
  investigationNotes?: string;

  createdAt: string;
  updatedAt: string;
}

export interface MatchingFactor {
  factor: string;
  value: unknown;
  weight: number;
}

// =============================================================================
// METRICS
// =============================================================================

export interface ColdCaseMetrics {
  id: string;

  // Time period
  periodType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  periodStart: string;
  periodEnd: string;

  // Case counts
  totalColdCases: number;
  newColdCases: number;
  revivedCases: number;
  resolvedColdCases: number;

  // Age distribution
  cases1To2Years: number;
  cases2To5Years: number;
  cases5To10Years: number;
  cases10PlusYears: number;
  averageCaseAgeDays: number;
  oldestCaseDays: number;

  // Review metrics
  reviewsScheduled: number;
  reviewsCompleted: number;
  reviewsOverdue: number;
  averageReviewDurationDays: number;

  // Campaign metrics
  campaignsLaunched: number;
  totalCampaignReach: number;
  tipsFromCampaigns: number;
  leadsFromCampaigns: number;

  // DNA metrics
  dnaSubmissions: number;
  dnaMatchesFound: number;
  dnaResubmissions: number;

  // Pattern matching
  patternMatchesFound: number;
  patternMatchesConfirmed: number;

  // Resource allocation
  reviewerHoursAllocated: number;
  campaignBudgetSpent: number;

  // Success rates
  revivalSuccessRate: number;
  reviewToRevivalRate: number;
  campaignEffectivenessRate: number;

  computedAt: string;
  createdAt: string;
}

// =============================================================================
// CHECKLIST TEMPLATE
// =============================================================================

export interface ChecklistTemplate {
  id: string;
  templateName: string;
  templateDescription?: string;
  isDefault: boolean;
  isActive: boolean;
  items: ChecklistTemplateItem[];
  caseTypes: string[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistTemplateItem {
  category: ChecklistCategory;
  order: number;
  name: string;
  description?: string;
}

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

// Cold Case Profile API
export interface CreateColdCaseProfileRequest {
  caseId: string;
  classification?: ColdCaseClassification;
  classificationReason?: string;
  reviewFrequency?: ReviewFrequency;
}

export interface UpdateColdCaseProfileRequest {
  classification?: ColdCaseClassification;
  classificationReason?: string;
  reviewFrequency?: ReviewFrequency;
  dnaSubmissionStatus?: DNASubmissionStatus;
  dnaSamplesAvailable?: boolean;
  patternMatchEnabled?: boolean;
  digitizationStatus?: string;
  digitizationProgress?: number;
  physicalFilesLocation?: string;
  familyContactPreference?: string;
  familyOptedOutNotifications?: boolean;
  revivalNotes?: string;
  specialCircumstances?: string;
}

// Review API
export interface CreateReviewRequest {
  coldCaseProfileId: string;
  reviewType?: ReviewType;
}

export interface StartReviewRequest {
  reviewId: string;
}

export interface CompleteReviewRequest {
  reviewId: string;
  revivalRecommended: boolean;
  revivalDecision: RevivalDecision;
  summary: string;
  recommendations?: string;
  nextSteps?: string;
  newLeadsIdentified?: number;
  newEvidenceFound?: boolean;
  newEvidenceDescription?: string;
  dnaResubmissionRecommended?: boolean;
  campaignRecommended?: boolean;
  recommendedCampaignType?: CampaignType;
  escalationRecommended?: boolean;
  escalationReason?: string;
  revivalJustification?: string;
  familyNotified?: boolean;
  familyNotificationMethod?: string;
  familyResponse?: string;
}

export interface UpdateChecklistItemRequest {
  status: ChecklistStatus;
  resultSummary?: string;
  findings?: string;
  actionRequired?: boolean;
  actionDescription?: string;
  notes?: string;
}

// Campaign API
export interface CreateCampaignRequest {
  coldCaseProfileId: string;
  caseId: string;
  campaignType: CampaignType;
  campaignName: string;
  campaignDescription?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  isAnniversaryCampaign?: boolean;
  targetReach?: number;
  targetTips?: number;
  targetShares?: number;
  platforms: string[];
  contentHeadline?: string;
  contentBody?: string;
  contentMediaUrls?: string[];
  contentHashtags?: string[];
  budgetAllocated?: number;
}

export interface UpdateCampaignRequest {
  status?: CampaignStatus;
  actualStart?: string;
  actualEnd?: string;
  actualReach?: number;
  actualTipsGenerated?: number;
  actualShares?: number;
  actualLeadsGenerated?: number;
  engagementRate?: number;
  platformMetrics?: Record<string, unknown>;
  budgetSpent?: number;
  postCampaignAnalysis?: string;
  lessonsLearned?: string;
}

// DNA Submission API
export interface CreateDNASubmissionRequest {
  coldCaseProfileId: string;
  caseId: string;
  databaseName: string;
  submissionType: string;
  sampleType?: string;
  sampleQuality?: string;
  sampleLocation?: string;
}

export interface UpdateDNASubmissionRequest {
  status?: DNASubmissionStatus;
  submissionReference?: string;
  expectedResultDate?: string;
  resultSummary?: string;
  matchFound?: boolean;
  matchDetails?: string;
  matchConfidence?: string;
  followUpRequired?: boolean;
  followUpNotes?: string;
  documentationUrl?: string;
  chainOfCustodyVerified?: boolean;
}

// New Evidence API
export interface CreateNewEvidenceRequest {
  coldCaseProfileId: string;
  caseId: string;
  evidenceType: EvidenceType;
  evidenceSource: string;
  evidenceDescription: string;
  discoveryContext?: string;
  significanceLevel?: SignificanceLevel;
  potentialImpact?: string;
  documentationUrls?: string[];
  chainOfCustody?: string;
}

export interface UpdateNewEvidenceRequest {
  significanceLevel?: SignificanceLevel;
  potentialImpact?: string;
  verificationStatus?: VerificationStatus;
  processed?: boolean;
  processingNotes?: string;
  documentationUrls?: string[];
}

// Pattern Match API
export interface ReviewPatternMatchRequest {
  patternMatchId: string;
  determination: 'confirmed' | 'possible' | 'rejected';
  notes?: string;
  openInvestigation?: boolean;
  investigationNotes?: string;
}

// Search/Filter Types
export interface ColdCaseSearchFilters {
  classification?: ColdCaseClassification[];
  dnaSubmissionStatus?: DNASubmissionStatus[];
  reviewStatus?: ReviewStatus[];
  hasUpcomingAnniversary?: boolean;
  hasOverdueReview?: boolean;
  hasUnprocessedEvidence?: boolean;
  hasHighPriorityPatternMatch?: boolean;
  minRevivalPriorityScore?: number;
  jurisdictionId?: string;
  caseAgeMinDays?: number;
  caseAgeMaxDays?: number;
  reviewerId?: string;
}

export interface ColdCaseSearchResult {
  profiles: ColdCaseProfile[];
  total: number;
  page: number;
  pageSize: number;
}

// Dashboard Statistics
export interface ColdCaseDashboardStats {
  totalColdCases: number;
  casesUnderReview: number;
  overdueReviews: number;
  upcomingAnniversaries: number;
  pendingDNASubmissions: number;
  unprocessedEvidence: number;
  unreviewedPatternMatches: number;
  revivedThisYear: number;
  revivalSuccessRate: number;
  ageDistribution: {
    oneToTwoYears: number;
    twoToFiveYears: number;
    fiveToTenYears: number;
    tenPlusYears: number;
  };
  recentRevivals: Array<{
    caseId: string;
    caseNumber: string;
    revivedAt: string;
    daysCold: number;
  }>;
}

// Reviewer Statistics
export interface ReviewerStats {
  reviewerId: string;
  reviewerName: string;
  currentAssignments: number;
  totalReviewsCompleted: number;
  totalRevivalsAchieved: number;
  revivalSuccessRate: number;
  averageReviewDurationDays: number;
  specializations: string[];
}
