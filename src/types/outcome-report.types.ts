/**
 * Case Outcome Reports Types
 * LC-FEAT-021: Case Outcome Reports for Analysis and Learning
 */

// =============================================================================
// ENUMS
// =============================================================================

export type OutcomeReportStatus = 'draft' | 'pending_review' | 'approved' | 'archived';

export type RecommendationCategory =
  | 'process'
  | 'resource'
  | 'communication'
  | 'technology'
  | 'training'
  | 'policy';

export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low';

export type LeadEffectivenessRating =
  | 'highly_effective'
  | 'effective'
  | 'neutral'
  | 'ineffective'
  | 'counterproductive';

export type DiscoveryMethod =
  | 'lead_from_public'
  | 'lead_from_law_enforcement'
  | 'tip_anonymous'
  | 'tip_identified'
  | 'social_media_monitoring'
  | 'surveillance'
  | 'patrol_encounter'
  | 'self_return'
  | 'hospital_report'
  | 'shelter_report'
  | 'cross_border_alert'
  | 'amber_alert_response'
  | 'volunteer_search'
  | 'ai_facial_recognition'
  | 'financial_tracking'
  | 'phone_tracking'
  | 'other';

export type FoundByType =
  | 'law_enforcement'
  | 'public'
  | 'family'
  | 'self'
  | 'organization'
  | 'other';

export type MilestoneType =
  | 'report'
  | 'lead'
  | 'tip'
  | 'action'
  | 'decision'
  | 'escalation'
  | 'resolution';

// =============================================================================
// CASE OUTCOME REPORT
// =============================================================================

export interface CaseOutcomeReport {
  id: string;
  caseId: string;
  reportNumber: string;
  status: OutcomeReportStatus;
  version: number;

  // Case summary
  totalDurationHours: number;
  initialPriorityLevel?: string;
  finalPriorityLevel?: string;
  priorityChanges: number;

  // Resolution details
  discoveryMethod?: DiscoveryMethod;
  discoveryMethodOther?: string;
  locationFound?: string;
  locationFoundCity?: string;
  locationFoundProvince?: string;
  locationFoundLatitude?: number;
  locationFoundLongitude?: number;
  distanceFromLastSeenKm?: number;
  conditionAtResolution?: string;
  conditionNotes?: string;

  // Who found
  foundByType?: FoundByType;
  foundByOrganizationId?: string;
  foundByUserId?: string;
  foundByName?: string;

  // Lead analysis metrics
  totalLeadsGenerated: number;
  leadsVerified: number;
  leadsDismissed: number;
  leadsActedUpon: number;
  solvingLeadId?: string;
  solvingLeadSource?: string;
  falsePositiveRate?: number;
  avgLeadResponseHours?: number;

  // Tip analysis metrics
  totalTipsReceived: number;
  tipsVerified: number;
  tipsHoax: number;
  tipsDuplicate: number;
  tipsConvertedToLeads: number;
  tipConversionRate?: number;

  // Resource utilization
  totalAssignedOfficers: number;
  totalVolunteerHours?: number;
  mediaOutletsEngaged: number;
  socialMediaReach: number;
  estimatedCost?: number;
  partnerOrganizationsInvolved: string[];

  // Time breakdown (in hours)
  timeToFirstResponse?: number;
  timeToFirstLead?: number;
  timeToVerifiedLead?: number;
  timeToResolution?: number;

  // Key milestones (timestamps)
  caseReportedAt?: string;
  firstResponseAt?: string;
  firstLeadAt?: string;
  firstVerifiedLeadAt?: string;
  publicAlertIssuedAt?: string;
  mediaCoverageStartedAt?: string;
  caseResolvedAt?: string;

  // Analysis and learning
  whatWorked: string[];
  whatDidntWork: string[];
  delaysIdentified: string[];
  lessonsLearned?: string;
  keyDecisionPoints: DecisionPoint[];

  // Approval workflow
  createdBy: string;
  reviewedBy?: string;
  reviewedAt?: string;
  approvedBy?: string;
  approvedAt?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface DecisionPoint {
  timestamp: string;
  decision: string;
  rationale: string;
  outcome: string;
  actor?: string;
}

// =============================================================================
// OUTCOME REPORT WITH RELATIONS
// =============================================================================

export interface CaseOutcomeReportWithRelations extends CaseOutcomeReport {
  case?: {
    id: string;
    caseNumber: string;
    firstName: string;
    lastName: string;
    ageAtDisappearance?: number;
    disposition?: string;
    lastSeenDate: string;
    resolutionDate?: string;
  };
  recommendations: OutcomeRecommendation[];
  similarCases: SimilarCaseAnalysis[];
  leadEffectivenessScores: LeadEffectivenessScore[];
  timeline: OutcomeTimelineMilestone[];
  createdByUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  reviewedByUser?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  approvedByUser?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

// =============================================================================
// RECOMMENDATIONS
// =============================================================================

export interface OutcomeRecommendation {
  id: string;
  outcomeReportId: string;
  category: RecommendationCategory;
  priority: RecommendationPriority;
  title: string;
  description: string;

  // Implementation tracking
  isActionable: boolean;
  assignedTo?: string;
  targetCompletionDate?: string;
  isImplemented: boolean;
  implementedAt?: string;
  implementedBy?: string;
  implementationNotes?: string;

  // Source analysis
  sourceAnalysis?: string;
  similarCasesCount: number;

  createdAt: string;
  updatedAt: string;
}

export interface OutcomeRecommendationWithUser extends OutcomeRecommendation {
  assignedToUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  implementedByUser?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

// =============================================================================
// SIMILAR CASE ANALYSIS
// =============================================================================

export interface SimilarCaseAnalysis {
  id: string;
  outcomeReportId: string;
  similarCaseId: string;
  similarityScore: number;
  similarityFactors: SimilarityFactor[];

  // Comparison metrics
  resolutionComparison?: string;
  durationDifferenceHours?: number;
  leadEffectivenessComparison?: string;

  createdAt: string;
}

export interface SimilarCaseAnalysisWithCase extends SimilarCaseAnalysis {
  similarCase: {
    id: string;
    caseNumber: string;
    firstName: string;
    lastName: string;
    disposition?: string;
    totalDurationHours?: number;
    resolutionDate?: string;
  };
}

export interface SimilarityFactor {
  factor: string;
  match: boolean;
  weight?: number;
  description?: string;
}

// =============================================================================
// LEAD EFFECTIVENESS
// =============================================================================

export interface LeadEffectivenessScore {
  id: string;
  outcomeReportId: string;
  leadId: string;
  effectivenessRating: LeadEffectivenessRating;
  score: number;

  // Analysis
  responseTimeHours?: number;
  contributedToResolution: boolean;
  wasFalsePositive: boolean;

  notes?: string;

  createdAt: string;
}

export interface LeadEffectivenessScoreWithLead extends LeadEffectivenessScore {
  lead: {
    id: string;
    title: string;
    source?: string;
    status: string;
    createdAt: string;
  };
}

// =============================================================================
// TIMELINE MILESTONES
// =============================================================================

export interface OutcomeTimelineMilestone {
  id: string;
  outcomeReportId: string;
  milestoneType: MilestoneType;
  timestamp: string;
  title: string;
  description?: string;

  // Related entities
  relatedLeadId?: string;
  relatedTipId?: string;
  actorId?: string;
  actorName?: string;

  // Decision analysis
  isDecisionPoint: boolean;
  decisionOutcome?: string;
  decisionRationale?: string;
  wasDelay: boolean;
  delayHours?: number;
  delayReason?: string;

  displayOrder: number;

  createdAt: string;
}

// =============================================================================
// ANALYTICS AGGREGATES
// =============================================================================

export interface OutcomeAnalyticsAggregate {
  id: string;
  aggregationPeriod: 'daily' | 'weekly' | 'monthly' | 'yearly';
  periodStart: string;
  periodEnd: string;
  jurisdictionId?: string;

  // Case outcomes
  totalCasesResolved: number;
  casesFoundAliveSafe: number;
  casesFoundAliveInjured: number;
  casesFoundDeceased: number;
  casesReturnedVoluntarily: number;
  casesOtherResolution: number;

  // Duration metrics
  avgResolutionHours?: number;
  medianResolutionHours?: number;
  minResolutionHours?: number;
  maxResolutionHours?: number;

  // Lead metrics
  avgLeadsPerCase?: number;
  avgLeadVerificationRate?: number;
  avgFalsePositiveRate?: number;

  // Resource metrics
  avgOfficersPerCase?: number;
  avgCostPerCase?: number;
  totalVolunteerHours?: number;

  // Discovery methods distribution
  discoveryMethodCounts: Record<DiscoveryMethod, number>;

  // Effectiveness
  topPerformingLeadSources: LeadSourcePerformance[];
  commonDelays: DelayPattern[];

  createdAt: string;
  updatedAt: string;
}

export interface LeadSourcePerformance {
  source: string;
  count: number;
  successRate: number;
  avgResponseHours: number;
}

export interface DelayPattern {
  reason: string;
  frequency: number;
  avgDelayHours: number;
}

// =============================================================================
// RECOMMENDATION PATTERNS
// =============================================================================

export interface RecommendationPattern {
  id: string;
  patternName: string;
  category: RecommendationCategory;
  description: string;
  triggerConditions: TriggerCondition[];
  suggestedAction: string;

  // Statistics
  timesRecommended: number;
  timesImplemented: number;
  successRate?: number;

  isActive: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface TriggerCondition {
  condition: string;
  operator: '<' | '>' | '=' | '<=' | '>=' | '!=';
  value: number | string;
}

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

export interface CreateOutcomeReportRequest {
  caseId: string;
  discoveryMethod?: DiscoveryMethod;
  discoveryMethodOther?: string;
  locationFound?: string;
  locationFoundCity?: string;
  locationFoundProvince?: string;
  conditionAtResolution?: string;
  conditionNotes?: string;
  foundByType?: FoundByType;
  foundByName?: string;
  whatWorked?: string[];
  whatDidntWork?: string[];
  lessonsLearned?: string;
}

export interface UpdateOutcomeReportRequest {
  status?: OutcomeReportStatus;
  discoveryMethod?: DiscoveryMethod;
  discoveryMethodOther?: string;
  locationFound?: string;
  locationFoundCity?: string;
  locationFoundProvince?: string;
  locationFoundLatitude?: number;
  locationFoundLongitude?: number;
  conditionAtResolution?: string;
  conditionNotes?: string;
  foundByType?: FoundByType;
  foundByOrganizationId?: string;
  foundByUserId?: string;
  foundByName?: string;
  whatWorked?: string[];
  whatDidntWork?: string[];
  delaysIdentified?: string[];
  lessonsLearned?: string;
  keyDecisionPoints?: DecisionPoint[];
}

export interface AddRecommendationRequest {
  outcomeReportId: string;
  category: RecommendationCategory;
  priority: RecommendationPriority;
  title: string;
  description: string;
  isActionable?: boolean;
  assignedTo?: string;
  targetCompletionDate?: string;
  sourceAnalysis?: string;
}

export interface AddTimelineMilestoneRequest {
  outcomeReportId: string;
  milestoneType: MilestoneType;
  timestamp: string;
  title: string;
  description?: string;
  actorId?: string;
  actorName?: string;
  isDecisionPoint?: boolean;
  decisionOutcome?: string;
  decisionRationale?: string;
  wasDelay?: boolean;
  delayHours?: number;
  delayReason?: string;
}

export interface OutcomeReportFilters {
  status?: OutcomeReportStatus;
  discoveryMethod?: DiscoveryMethod;
  jurisdictionId?: string;
  dateFrom?: string;
  dateTo?: string;
  createdBy?: string;
  minDurationHours?: number;
  maxDurationHours?: number;
}

export interface OutcomeReportListResponse {
  reports: CaseOutcomeReportWithRelations[];
  total: number;
  page: number;
  pageSize: number;
}

export interface OutcomeAnalyticsRequest {
  aggregationPeriod: 'daily' | 'weekly' | 'monthly' | 'yearly';
  dateFrom: string;
  dateTo: string;
  jurisdictionId?: string;
}

export interface OutcomeAnalyticsResponse {
  aggregates: OutcomeAnalyticsAggregate[];
  summary: {
    totalReports: number;
    avgResolutionHours: number;
    topDiscoveryMethods: { method: DiscoveryMethod; count: number }[];
    recommendationsGenerated: number;
    recommendationsImplemented: number;
  };
}

// =============================================================================
// EXPORT DATA TYPES
// =============================================================================

export interface OutcomeReportExportData {
  reportNumber: string;
  caseNumber: string;
  subjectName: string;
  subjectAge?: number;
  reportedDate: string;
  resolvedDate?: string;
  totalDurationHours: number;
  disposition?: string;
  discoveryMethod?: string;
  locationFound?: string;
  foundBy?: string;
  conditionAtResolution?: string;
  totalLeads: number;
  leadsVerified: number;
  falsePositiveRate?: number;
  totalTips: number;
  tipsVerified: number;
  assignedOfficers: number;
  estimatedCost?: number;
  status: string;
  lessonsLearned?: string;
  recommendations: {
    category: string;
    priority: string;
    title: string;
    description: string;
    isImplemented: boolean;
  }[];
}

export interface OutcomeReportPDFData {
  report: CaseOutcomeReportWithRelations;
  generatedAt: string;
  generatedBy: string;
  includeBranding: boolean;
  includeConfidentialData: boolean;
}
