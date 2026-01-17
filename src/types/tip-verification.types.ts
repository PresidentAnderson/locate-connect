/**
 * Tip Verification System Types
 * LC-FEAT-034: Automated Tip Verification
 */

// =============================================================================
// ENUMS
// =============================================================================

export type TipVerificationStatus =
  | 'unverified'
  | 'auto_verified'
  | 'pending_review'
  | 'verified'
  | 'partially_verified'
  | 'unverifiable'
  | 'rejected';

export type TipPriorityBucket =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'
  | 'spam';

export type TipsterReliabilityTier =
  | 'new'
  | 'unrated'
  | 'low'
  | 'moderate'
  | 'high'
  | 'verified_source';

export type VerificationMethod =
  | 'photo_metadata'
  | 'geolocation'
  | 'text_sentiment'
  | 'pattern_matching'
  | 'cross_reference'
  | 'time_plausibility'
  | 'duplicate_detection'
  | 'manual_review';

export type HoaxIndicatorType =
  | 'known_scam_pattern'
  | 'suspicious_metadata'
  | 'impossible_timeline'
  | 'conflicting_location'
  | 'repeated_false_reports'
  | 'spam_signature'
  | 'ai_generated_content'
  | 'stock_photo_detected';

export type FollowUpType =
  | 'clarification'
  | 'photo_request'
  | 'location_confirm'
  | 'additional_info';

export type FollowUpStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'responded'
  | 'expired';

export type QueueType =
  | 'critical'
  | 'high_priority'
  | 'standard'
  | 'low_priority';

export type QueueStatus =
  | 'pending'
  | 'in_review'
  | 'completed'
  | 'escalated'
  | 'expired';

export type ReviewOutcome =
  | 'verified'
  | 'rejected'
  | 'escalated'
  | 'needs_more_info';

export type TipSourceType =
  | 'web'
  | 'phone'
  | 'email'
  | 'social_media'
  | 'partner_api';

// =============================================================================
// TIPSTER PROFILE
// =============================================================================

export interface TipsterProfile {
  id: string;
  userId?: string;
  anonymousId?: string;
  email?: string;
  phone?: string;
  preferredContactMethod?: string;
  reliabilityTier: TipsterReliabilityTier;
  reliabilityScore: number;
  totalTips: number;
  verifiedTips: number;
  partiallyVerifiedTips: number;
  falseTips: number;
  spamTips: number;
  tipsLeadingToResolution: number;
  averageResponseTime?: string;
  providesPhotos: boolean;
  providesDetailedInfo: boolean;
  consistentLocationReporting: boolean;
  isBlocked: boolean;
  blockedReason?: string;
  blockedAt?: string;
  blockedBy?: string;
  internalNotes?: string;
  firstTipAt?: string;
  lastTipAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TipsterProfileSummary {
  id: string;
  reliabilityTier: TipsterReliabilityTier;
  reliabilityScore: number;
  totalTips: number;
  verifiedTips: number;
  isBlocked: boolean;
}

// =============================================================================
// TIP VERIFICATION
// =============================================================================

export interface TipVerification {
  id: string;
  tipId: string;
  verificationStatus: TipVerificationStatus;
  priorityBucket: TipPriorityBucket;
  credibilityScore: number;
  credibilityFactors: CredibilityFactor[];

  // Individual verification scores
  photoVerificationScore?: number;
  locationVerificationScore?: number;
  timePlausibilityScore?: number;
  textAnalysisScore?: number;
  crossReferenceScore?: number;
  tipsterReliabilityScore?: number;

  verificationMethods: VerificationMethod[];

  // Photo analysis
  photoMetadata?: PhotoMetadata;
  photoAnalysisNotes?: string;
  photoIsOriginal?: boolean;
  photoLocationMatches?: boolean;
  photoTimestampMatches?: boolean;

  // Location verification
  locationVerified?: boolean;
  locationConfidence?: number;
  locationSource?: string;
  distanceFromLastSeenKm?: number;

  // Time plausibility
  timePlausible?: boolean;
  timePlausibilityNotes?: string;
  travelTimeFeasible?: boolean;

  // Text analysis
  sentimentScore?: number;
  textCoherenceScore?: number;
  detailRichnessScore?: number;
  consistencyScore?: number;

  // Duplicate detection
  isDuplicate: boolean;
  duplicateTipIds?: string[];
  similarityScores?: Record<string, number>;

  // Cross-reference results
  matchesExistingLeads: boolean;
  matchingLeadIds?: string[];
  matchesKnownLocations?: boolean;
  matchesSuspectDescription?: boolean;

  // Hoax/spam detection
  hoaxIndicators: HoaxIndicatorType[];
  spamScore: number;
  hoaxDetectionNotes?: string;

  // AI analysis
  aiSummary?: string;
  aiConfidence?: number;
  aiRecommendations?: string[];

  // Automated actions
  autoTriaged: boolean;
  autoTriageReason?: string;
  autoFollowUpSent: boolean;
  followUpSentAt?: string;

  // Review workflow
  requiresHumanReview: boolean;
  reviewPriority: number;
  reviewDeadline?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewerNotes?: string;
  reviewerOverrideScore?: number;

  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CredibilityFactor {
  factor: string;
  score: number;
  weight: number;
  description: string;
  source: VerificationMethod;
}

export interface PhotoMetadata {
  hasExif: boolean;
  hasGps: boolean;
  latitude?: number;
  longitude?: number;
  timestamp?: string;
  device?: string;
  software?: string;
  originalFilename?: string;
  fileSize?: number;
  dimensions?: { width: number; height: number };
}

// =============================================================================
// TIP ATTACHMENT
// =============================================================================

export interface TipAttachment {
  id: string;
  tipId: string;
  fileName: string;
  fileType: string;
  fileSize?: number;
  url: string;
  thumbnailUrl?: string;
  extractedMetadata?: PhotoMetadata;
  exifData?: Record<string, unknown>;
  gpsLatitude?: number;
  gpsLongitude?: number;
  photoTakenAt?: string;
  deviceInfo?: string;
  isStockPhoto?: boolean;
  isAiGenerated?: boolean;
  isManipulated?: boolean;
  manipulationConfidence?: number;
  reverseImageSearchResults?: ReverseImageResult[];
  facesDetected: number;
  faceMatchConfidence?: number;
  matchesMissingPerson?: boolean;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  verificationNotes?: string;
  uploadedAt: string;
  createdAt: string;
}

export interface ReverseImageResult {
  source: string;
  url: string;
  similarity: number;
  isStockPhoto: boolean;
}

// =============================================================================
// VERIFICATION RULES
// =============================================================================

export interface VerificationRule {
  id: string;
  name: string;
  description?: string;
  ruleType: 'scoring' | 'spam' | 'priority' | 'workflow';
  conditions: RuleCondition;
  actions: RuleAction;
  scoreWeight: number;
  isActive: boolean;
  jurisdictionId?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RuleCondition {
  field?: string;
  operator?: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'not_in' | 'contains' | 'matches';
  value?: unknown;
  and?: RuleCondition[];
  or?: RuleCondition[];
}

export interface RuleAction {
  scoreModifier?: number;
  setStatus?: TipVerificationStatus;
  setPriority?: TipPriorityBucket;
  spamScoreAdd?: number;
  requireReview?: boolean;
  reviewPriority?: number;
  autoTriage?: boolean;
  slaHours?: number;
  sendFollowUp?: boolean;
  followUpType?: FollowUpType;
}

// =============================================================================
// SCAM PATTERNS
// =============================================================================

export interface ScamPattern {
  id: string;
  name: string;
  description?: string;
  patternType: 'text' | 'image' | 'behavior' | 'location';
  patternData: PatternData;
  confidenceThreshold: number;
  timesDetected: number;
  lastDetectedAt?: string;
  isActive: boolean;
  createdBy?: string;
  source?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PatternData {
  keywords?: string[];
  patterns?: string[];
  regex?: string;
  minMatches?: number;
  caseInsensitive?: boolean;
  checkWebSimilarity?: boolean;
  checkStockDatabases?: boolean;
  checkReverseSearch?: boolean;
  checkTravelFeasibility?: boolean;
  maxSpeedKmh?: number;
  maxTipsPerHour?: number;
  maxTipsPerDay?: number;
  threshold?: number;
}

// =============================================================================
// FOLLOW-UPS
// =============================================================================

export interface TipFollowUp {
  id: string;
  tipId: string;
  tipsterProfileId?: string;
  followUpType: FollowUpType;
  subject?: string;
  message: string;
  requestedInfo?: string[];
  sentVia: 'email' | 'sms' | 'in_app';
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  respondedAt?: string;
  responseContent?: string;
  responseAttachments?: string[];
  status: FollowUpStatus;
  expiresAt?: string;
  isAutomated: boolean;
  triggeredByRule?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// VERIFICATION QUEUE
// =============================================================================

export interface VerificationQueueItem {
  id: string;
  tipId: string;
  tipVerificationId?: string;
  queueType: QueueType;
  priority: number;
  assignedTo?: string;
  assignedAt?: string;
  assignmentReason?: string;
  status: QueueStatus;
  reviewStartedAt?: string;
  reviewCompletedAt?: string;
  slaDeadline?: string;
  slaBreached: boolean;
  outcome?: ReviewOutcome;
  outcomeNotes?: string;
  escalatedTo?: string;
  escalatedAt?: string;
  escalationReason?: string;
  enteredQueueAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface QueueItemWithDetails extends VerificationQueueItem {
  tip: TipSummary;
  verification?: TipVerification;
  tipsterProfile?: TipsterProfileSummary;
  case: CaseSummary;
}

export interface TipSummary {
  id: string;
  caseId: string;
  content: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  sightingDate?: string;
  isAnonymous: boolean;
  priorityBucket: TipPriorityBucket;
  attachmentsCount: number;
  createdAt: string;
}

export interface CaseSummary {
  id: string;
  caseNumber: string;
  firstName: string;
  lastName: string;
  primaryPhotoUrl?: string;
  priorityLevel: string;
  status: string;
  lastSeenDate: string;
  lastSeenLocation?: string;
}

// =============================================================================
// VERIFICATION INPUT/OUTPUT
// =============================================================================

export interface TipVerificationInput {
  tipId: string;
  content: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  sightingDate?: string;
  isAnonymous: boolean;
  tipsterProfileId?: string;
  attachments?: TipAttachment[];
  ipAddress?: string;
  userAgent?: string;
  caseId: string;
}

export interface TipVerificationResult {
  verification: TipVerification;
  priorityBucket: TipPriorityBucket;
  requiresReview: boolean;
  reviewPriority: number;
  autoActions: AutomatedAction[];
  warnings: VerificationWarning[];
  suggestions: string[];
}

export interface AutomatedAction {
  action: string;
  description: string;
  executedAt: string;
  triggeredByRule?: string;
}

export interface VerificationWarning {
  type: 'hoax' | 'spam' | 'duplicate' | 'low_credibility' | 'blocked_tipster';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details?: Record<string, unknown>;
}

// =============================================================================
// ANALYTICS & STATISTICS
// =============================================================================

export interface TipVerificationStats {
  totalTips: number;
  verifiedTips: number;
  pendingReviewTips: number;
  rejectedTips: number;
  spamTips: number;
  duplicateTips: number;
  averageCredibilityScore: number;
  averageVerificationTime: string;
  tipsLeadingToLeads: number;
  tipsLeadingToResolutions: number;
  priorityDistribution: Record<TipPriorityBucket, number>;
  verificationMethodUsage: Record<VerificationMethod, number>;
  topHoaxIndicators: { indicator: HoaxIndicatorType; count: number }[];
}

export interface QueueStats {
  totalPending: number;
  criticalPending: number;
  highPriorityPending: number;
  standardPending: number;
  lowPriorityPending: number;
  averageWaitTime: string;
  slaBreachRate: number;
  reviewsCompletedToday: number;
  averageReviewTime: string;
}

export interface TipsterStats {
  totalTipsters: number;
  verifiedSourceTipsters: number;
  blockedTipsters: number;
  averageReliabilityScore: number;
  tierDistribution: Record<TipsterReliabilityTier, number>;
  topContributors: TipsterProfileSummary[];
}

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

export interface VerifyTipRequest {
  tipId: string;
  forceReVerification?: boolean;
}

export interface VerifyTipResponse {
  success: boolean;
  verification: TipVerification;
  result: TipVerificationResult;
  error?: string;
}

export interface ReviewTipRequest {
  verificationId: string;
  outcome: ReviewOutcome;
  notes?: string;
  overrideScore?: number;
  escalateTo?: string;
  escalationReason?: string;
}

export interface ReviewTipResponse {
  success: boolean;
  verification: TipVerification;
  queueItem: VerificationQueueItem;
  error?: string;
}

export interface GetQueueRequest {
  queueType?: QueueType;
  status?: QueueStatus;
  assignedTo?: string;
  limit?: number;
  offset?: number;
}

export interface GetQueueResponse {
  items: QueueItemWithDetails[];
  total: number;
  stats: QueueStats;
}

export interface TipsterActionRequest {
  tipsterProfileId: string;
  action: 'block' | 'unblock' | 'upgrade_tier' | 'downgrade_tier';
  reason?: string;
  newTier?: TipsterReliabilityTier;
}

export interface TipsterActionResponse {
  success: boolean;
  tipsterProfile: TipsterProfile;
  error?: string;
}

// =============================================================================
// DATABASE MAPPING HELPERS
// =============================================================================

export function mapTipVerificationFromDb(data: Record<string, unknown>): TipVerification {
  return {
    id: data.id as string,
    tipId: data.tip_id as string,
    verificationStatus: data.verification_status as TipVerificationStatus,
    priorityBucket: data.priority_bucket as TipPriorityBucket,
    credibilityScore: data.credibility_score as number,
    credibilityFactors: (data.credibility_factors as CredibilityFactor[]) || [],
    photoVerificationScore: data.photo_verification_score as number | undefined,
    locationVerificationScore: data.location_verification_score as number | undefined,
    timePlausibilityScore: data.time_plausibility_score as number | undefined,
    textAnalysisScore: data.text_analysis_score as number | undefined,
    crossReferenceScore: data.cross_reference_score as number | undefined,
    tipsterReliabilityScore: data.tipster_reliability_score as number | undefined,
    verificationMethods: (data.verification_methods as VerificationMethod[]) || [],
    photoMetadata: data.photo_metadata as PhotoMetadata | undefined,
    photoAnalysisNotes: data.photo_analysis_notes as string | undefined,
    photoIsOriginal: data.photo_is_original as boolean | undefined,
    photoLocationMatches: data.photo_location_matches as boolean | undefined,
    photoTimestampMatches: data.photo_timestamp_matches as boolean | undefined,
    locationVerified: data.location_verified as boolean | undefined,
    locationConfidence: data.location_confidence as number | undefined,
    locationSource: data.location_source as string | undefined,
    distanceFromLastSeenKm: data.distance_from_last_seen_km as number | undefined,
    timePlausible: data.time_plausible as boolean | undefined,
    timePlausibilityNotes: data.time_plausibility_notes as string | undefined,
    travelTimeFeasible: data.travel_time_feasible as boolean | undefined,
    sentimentScore: data.sentiment_score as number | undefined,
    textCoherenceScore: data.text_coherence_score as number | undefined,
    detailRichnessScore: data.detail_richness_score as number | undefined,
    consistencyScore: data.consistency_score as number | undefined,
    isDuplicate: data.is_duplicate as boolean,
    duplicateTipIds: data.duplicate_tip_ids as string[] | undefined,
    similarityScores: data.similarity_scores as Record<string, number> | undefined,
    matchesExistingLeads: data.matches_existing_leads as boolean,
    matchingLeadIds: data.matching_lead_ids as string[] | undefined,
    matchesKnownLocations: data.matches_known_locations as boolean | undefined,
    matchesSuspectDescription: data.matches_suspect_description as boolean | undefined,
    hoaxIndicators: (data.hoax_indicators as HoaxIndicatorType[]) || [],
    spamScore: data.spam_score as number,
    hoaxDetectionNotes: data.hoax_detection_notes as string | undefined,
    aiSummary: data.ai_summary as string | undefined,
    aiConfidence: data.ai_confidence as number | undefined,
    aiRecommendations: data.ai_recommendations as string[] | undefined,
    autoTriaged: data.auto_triaged as boolean,
    autoTriageReason: data.auto_triage_reason as string | undefined,
    autoFollowUpSent: data.auto_follow_up_sent as boolean,
    followUpSentAt: data.follow_up_sent_at as string | undefined,
    requiresHumanReview: data.requires_human_review as boolean,
    reviewPriority: data.review_priority as number,
    reviewDeadline: data.review_deadline as string | undefined,
    reviewedBy: data.reviewed_by as string | undefined,
    reviewedAt: data.reviewed_at as string | undefined,
    reviewerNotes: data.reviewer_notes as string | undefined,
    reviewerOverrideScore: data.reviewer_override_score as number | undefined,
    verifiedAt: data.verified_at as string | undefined,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

export function mapTipsterProfileFromDb(data: Record<string, unknown>): TipsterProfile {
  return {
    id: data.id as string,
    userId: data.user_id as string | undefined,
    anonymousId: data.anonymous_id as string | undefined,
    email: data.email as string | undefined,
    phone: data.phone as string | undefined,
    preferredContactMethod: data.preferred_contact_method as string | undefined,
    reliabilityTier: data.reliability_tier as TipsterReliabilityTier,
    reliabilityScore: data.reliability_score as number,
    totalTips: data.total_tips as number,
    verifiedTips: data.verified_tips as number,
    partiallyVerifiedTips: data.partially_verified_tips as number,
    falseTips: data.false_tips as number,
    spamTips: data.spam_tips as number,
    tipsLeadingToResolution: data.tips_leading_to_resolution as number,
    averageResponseTime: data.average_response_time as string | undefined,
    providesPhotos: data.provides_photos as boolean,
    providesDetailedInfo: data.provides_detailed_info as boolean,
    consistentLocationReporting: data.consistent_location_reporting as boolean,
    isBlocked: data.is_blocked as boolean,
    blockedReason: data.blocked_reason as string | undefined,
    blockedAt: data.blocked_at as string | undefined,
    blockedBy: data.blocked_by as string | undefined,
    internalNotes: data.internal_notes as string | undefined,
    firstTipAt: data.first_tip_at as string | undefined,
    lastTipAt: data.last_tip_at as string | undefined,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

export function mapVerificationQueueItemFromDb(data: Record<string, unknown>): VerificationQueueItem {
  return {
    id: data.id as string,
    tipId: data.tip_id as string,
    tipVerificationId: data.tip_verification_id as string | undefined,
    queueType: data.queue_type as QueueType,
    priority: data.priority as number,
    assignedTo: data.assigned_to as string | undefined,
    assignedAt: data.assigned_at as string | undefined,
    assignmentReason: data.assignment_reason as string | undefined,
    status: data.status as QueueStatus,
    reviewStartedAt: data.review_started_at as string | undefined,
    reviewCompletedAt: data.review_completed_at as string | undefined,
    slaDeadline: data.sla_deadline as string | undefined,
    slaBreached: data.sla_breached as boolean,
    outcome: data.outcome as ReviewOutcome | undefined,
    outcomeNotes: data.outcome_notes as string | undefined,
    escalatedTo: data.escalated_to as string | undefined,
    escalatedAt: data.escalated_at as string | undefined,
    escalationReason: data.escalation_reason as string | undefined,
    enteredQueueAt: data.entered_queue_at as string,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}
