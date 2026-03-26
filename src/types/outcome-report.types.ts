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

// =============================================================================
// RAW DATABASE ROW TYPES (snake_case from Supabase)
// =============================================================================

/** Raw database row shape for case_outcome_reports with joined relations */
export interface OutcomeReportDbRow {
  id: string;
  case_id: string;
  report_number: string;
  status: string;
  version: number;
  total_duration_hours: string;
  initial_priority_level?: string;
  final_priority_level?: string;
  priority_changes?: number;
  discovery_method?: string;
  discovery_method_other?: string;
  location_found?: string;
  location_found_city?: string;
  location_found_province?: string;
  location_found_latitude?: number;
  location_found_longitude?: number;
  distance_from_last_seen_km?: string;
  condition_at_resolution?: string;
  condition_notes?: string;
  found_by_type?: string;
  found_by_organization_id?: string;
  found_by_user_id?: string;
  found_by_name?: string;
  total_leads_generated: number;
  leads_verified: number;
  leads_dismissed: number;
  leads_acted_upon: number;
  solving_lead_id?: string;
  solving_lead_source?: string;
  false_positive_rate?: string;
  avg_lead_response_hours?: string;
  total_tips_received: number;
  tips_verified: number;
  tips_hoax: number;
  tips_duplicate: number;
  tips_converted_to_leads: number;
  tip_conversion_rate?: string;
  total_assigned_officers: number;
  total_volunteer_hours?: string;
  media_outlets_engaged: number;
  social_media_reach: number;
  estimated_cost?: string;
  partner_organizations_involved?: string[];
  time_to_first_response?: string;
  time_to_first_lead?: string;
  time_to_verified_lead?: string;
  time_to_resolution?: string;
  case_reported_at?: string;
  first_response_at?: string;
  first_lead_at?: string;
  first_verified_lead_at?: string;
  public_alert_issued_at?: string;
  media_coverage_started_at?: string;
  case_resolved_at?: string;
  what_worked?: string[];
  what_didnt_work?: string[];
  delays_identified?: string[];
  lessons_learned?: string;
  key_decision_points?: DecisionPoint[];
  created_by: string;
  reviewed_by?: string;
  reviewed_at?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  case?: {
    id: string;
    case_number: string;
    first_name: string;
    last_name: string;
    age_at_disappearance?: number;
    disposition?: string;
    last_seen_date: string;
    resolution_date?: string;
  } | null;
  recommendations?: RecommendationDbRow[];
  similar_cases?: SimilarCaseDbRow[];
  lead_effectiveness_scores?: LeadEffectivenessDbRow[];
  timeline?: TimelineMilestoneDbRow[];
  created_by_user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  reviewed_by_user?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  approved_by_user?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  [key: string]: unknown;
}

export interface RecommendationDbRow {
  id: string;
  outcome_report_id: string;
  category: string;
  priority: string;
  title: string;
  description: string;
  is_actionable: boolean;
  assigned_to?: string;
  target_completion_date?: string;
  is_implemented: boolean;
  implemented_at?: string;
  implemented_by?: string;
  implementation_notes?: string;
  source_analysis?: string;
  similar_cases_count?: number;
  created_at: string;
  updated_at: string;
}

export interface SimilarCaseDbRow {
  id: string;
  outcome_report_id: string;
  similar_case_id: string;
  similarity_score: string;
  similarity_factors?: SimilarityFactor[];
  resolution_comparison?: string;
  duration_difference_hours?: string;
  lead_effectiveness_comparison?: string;
  created_at: string;
  similar_case?: {
    id: string;
    case_number: string;
    first_name: string;
    last_name: string;
    disposition?: string;
    resolution_date?: string;
  } | null;
}

export interface LeadEffectivenessDbRow {
  id: string;
  outcome_report_id: string;
  lead_id: string;
  effectiveness_rating: string;
  score: number;
  response_time_hours?: string;
  contributed_to_resolution: boolean;
  was_false_positive: boolean;
  notes?: string;
  created_at: string;
}

export interface TimelineMilestoneDbRow {
  id: string;
  outcome_report_id: string;
  milestone_type: string;
  timestamp: string;
  title: string;
  description?: string;
  related_lead_id?: string;
  related_tip_id?: string;
  actor_id?: string;
  actor_name?: string;
  is_decision_point: boolean;
  decision_outcome?: string;
  decision_rationale?: string;
  was_delay: boolean;
  delay_hours?: string;
  delay_reason?: string;
  display_order: number;
  created_at: string;
}

/** Shape of a similar case result from the find_similar_cases RPC */
export interface SimilarCaseRpcResult {
  similar_case_id: string;
  similarity_score: number;
  similarity_factors: SimilarityFactor[];
}
