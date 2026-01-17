/**
 * Facial Recognition System Types (LC-FEAT-030)
 * Type definitions for AI facial recognition integration with comprehensive
 * privacy controls, consent management, and bias testing.
 */

// =============================================================================
// ENUMS
// =============================================================================

export type FacialRecognitionStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type FaceMatchStatus =
  | 'pending_review'
  | 'under_review'
  | 'confirmed'
  | 'rejected'
  | 'false_positive'
  | 'inconclusive';

export type PhotoQualityGrade =
  | 'excellent'
  | 'good'
  | 'fair'
  | 'poor'
  | 'unusable';

export type ConsentType =
  | 'photo_upload'
  | 'facial_recognition'
  | 'age_progression'
  | 'database_storage'
  | 'third_party_sharing'
  | 'research_use';

export type ConsentStatus =
  | 'pending'
  | 'granted'
  | 'denied'
  | 'withdrawn'
  | 'expired';

export type BiasTestCategory =
  | 'age'
  | 'gender'
  | 'ethnicity'
  | 'lighting'
  | 'angle'
  | 'resolution';

export type MatchReviewDecision =
  | 'confirm_match'
  | 'reject_match'
  | 'needs_investigation'
  | 'escalate';

export type ReviewOutcome =
  | 'verified'
  | 'rejected'
  | 'needs_more_info'
  | 'escalated';

// =============================================================================
// PHOTO SUBMISSIONS
// =============================================================================

export interface FaceBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence?: number;
}

export interface PhotoQualityFactors {
  lighting: number; // 0-100
  focus: number;
  resolution: number;
  faceVisibility: number;
  occlusion: number;
  angle: number;
  overall: number;
}

export interface PhotoLocation {
  latitude?: number;
  longitude?: number;
  locationName?: string;
}

export interface PhotoSubmission {
  id: string;
  caseId?: string;
  submittedBy: string;
  submissionSource: 'family_upload' | 'law_enforcement' | 'tip' | 'partner_database';

  // File info
  originalFilename?: string;
  filePath: string;
  fileUrl: string;
  fileSizeBytes?: number;
  mimeType?: string;

  // Image characteristics
  widthPx?: number;
  heightPx?: number;
  colorDepth?: number;
  hasFaceDetected: boolean;
  faceCount: number;
  faceBoundingBoxes?: FaceBoundingBox[];

  // Quality
  qualityGrade?: PhotoQualityGrade;
  qualityScore?: number;
  qualityFactors?: PhotoQualityFactors;
  enhancementApplied: boolean;
  enhancedFileUrl?: string;

  // Processing
  isProcessed: boolean;
  processedAt?: string;
  faceEncodingVersion?: string;

  // Metadata
  photoTakenAt?: string;
  photoLocation?: PhotoLocation;
  cameraMake?: string;
  cameraModel?: string;
  exifData?: Record<string, unknown>;

  // Consent
  consentRecordId?: string;
  isConsentVerified: boolean;

  // Retention
  retentionExpiresAt?: string;
  isArchived: boolean;
  archivedAt?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// FACIAL RECOGNITION REQUESTS
// =============================================================================

export interface SearchScope {
  databases?: string[];
  regions?: string[];
  dateRange?: {
    start?: string;
    end?: string;
  };
  includeResolved?: boolean;
  includeArchived?: boolean;
}

export interface FacialRecognitionRequest {
  id: string;
  requestNumber?: string;

  // Request details
  caseId: string;
  photoSubmissionId: string;
  requestedBy: string;

  // Type and priority
  requestType: 'match_search' | 'verification' | 'age_progression';
  priority: 'critical' | 'high' | 'normal' | 'low';

  // Search parameters
  searchScope?: SearchScope;
  confidenceThreshold: number;
  maxResults: number;

  // Status
  status: FacialRecognitionStatus;

  // Processing
  processingStartedAt?: string;
  processingCompletedAt?: string;
  processingTimeMs?: number;
  aiProvider?: string;
  aiModelVersion?: string;

  // Results
  totalMatchesFound: number;
  highConfidenceMatches: number;

  // Compliance
  complianceCheckPassed?: boolean;
  complianceNotes?: string;

  // Error
  errorCode?: string;
  errorMessage?: string;
  retryCount: number;

  // Audit
  ipAddress?: string;
  userAgent?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// FACE MATCHES
// =============================================================================

export interface FacialLandmarksMatch {
  leftEye?: { similarity: number; offset: number };
  rightEye?: { similarity: number; offset: number };
  nose?: { similarity: number; offset: number };
  mouth?: { similarity: number; offset: number };
  jawline?: { similarity: number; offset: number };
  overall: number;
}

export interface EstimatedAgeRange {
  min: number;
  max: number;
  confidence: number;
}

export interface FaceMatch {
  id: string;
  recognitionRequestId: string;

  // Photos
  sourcePhotoId: string;
  matchedPhotoId?: string;
  matchedCaseId?: string;

  // External match
  externalSource?: string;
  externalReferenceId?: string;
  externalPhotoUrl?: string;

  // Scoring
  confidenceScore: number;
  similarityScore?: number;

  // Analysis
  facialLandmarksMatch?: FacialLandmarksMatch;
  featureVectorDistance?: number;

  // Demographics (for bias monitoring)
  estimatedAgeRange?: EstimatedAgeRange;
  estimatedGender?: string;
  estimatedEthnicity?: string;

  // Review
  status: FaceMatchStatus;
  reviewerId?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  reviewOutcome?: 'match' | 'no_match' | 'possible_match';

  // Secondary review
  requiresSecondaryReview: boolean;
  secondaryReviewerId?: string;
  secondaryReviewedAt?: string;
  secondaryReviewNotes?: string;
  secondaryReviewOutcome?: string;

  // Notification
  notificationSent: boolean;
  notificationSentAt?: string;
  notificationMethod?: 'email' | 'sms' | 'in_app';

  // False positive
  markedAsFalsePositive: boolean;
  falsePositiveReason?: string;
  usedForTraining: boolean;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface FaceMatchWithDetails extends FaceMatch {
  sourcePhoto?: PhotoSubmission;
  matchedPhoto?: PhotoSubmission;
  matchedCase?: {
    id: string;
    caseNumber?: string;
    firstName: string;
    lastName: string;
    status: string;
  };
  reviewer?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
}

// =============================================================================
// AGE PROGRESSION
// =============================================================================

export interface AgeProgressionVariationParams {
  hairStyles?: string[];
  facialHair?: boolean;
  weightRange?: [number, number];
  accessories?: string[];
}

export interface AgeProgressionResult {
  targetAge: number;
  fileUrl: string;
  confidence: number;
  variations?: {
    variationType: string;
    fileUrl: string;
    confidence: number;
  }[];
}

export interface AgeProgressionRequest {
  id: string;
  requestNumber?: string;

  // Request details
  caseId: string;
  sourcePhotoId: string;
  requestedBy: string;

  // Parameters
  sourceAge: number;
  targetAges: number[];
  includeVariations: boolean;
  variationParameters?: AgeProgressionVariationParams;

  // Status
  status: FacialRecognitionStatus;

  // Processing
  processingStartedAt?: string;
  processingCompletedAt?: string;
  processingTimeMs?: number;
  aiProvider?: string;
  aiModelVersion?: string;

  // Results
  imagesGenerated: number;
  resultPhotos?: AgeProgressionResult[];

  // Quality review
  qualityReviewed: boolean;
  qualityReviewerId?: string;
  qualityScore?: number;
  qualityNotes?: string;

  // Approval
  requiresApproval: boolean;
  approved?: boolean;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;

  // Usage
  usedInCase: boolean;
  publicDistributionApproved: boolean;

  // Error
  errorCode?: string;
  errorMessage?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// MATCH REVIEWS
// =============================================================================

export interface ComparisonPoint {
  feature: string;
  sourceValue: string;
  matchValue: string;
  similarity: number;
  notes?: string;
}

export interface MatchReview {
  id: string;
  faceMatchId: string;

  // Reviewer
  reviewerId: string;
  reviewerRole: 'investigator' | 'supervisor' | 'specialist';
  reviewType: 'initial' | 'secondary' | 'appeal';

  // Decision
  decision: MatchReviewDecision;
  confidenceLevel?: 'high' | 'medium' | 'low';

  // Analysis
  analysisNotes?: string;
  supportingEvidence?: Record<string, unknown>;
  comparisonPoints?: ComparisonPoint[];

  // Time tracking
  reviewStartedAt?: string;
  reviewCompletedAt?: string;
  timeSpentSeconds?: number;

  // Quality metrics
  comparisonToolUsed?: string;
  comparisonImagesViewed?: number;

  // Timestamp
  createdAt: string;
}

// =============================================================================
// CONSENT RECORDS
// =============================================================================

export interface AllowedUses {
  facialRecognition?: boolean;
  ageProgression?: boolean;
  databaseStorage?: boolean;
  thirdPartySharing?: boolean;
  researchUse?: boolean;
  publicDistribution?: boolean;
}

export interface ConsentRecord {
  id: string;

  // Subject
  subjectId?: string;
  subjectCaseId?: string;
  subjectName?: string;
  subjectEmail?: string;
  subjectRelationship?: 'self' | 'parent' | 'guardian' | 'next_of_kin';

  // Consent details
  consentType: ConsentType;
  consentStatus: ConsentStatus;
  consentVersion: string;

  // Scope
  scopeDescription?: string;
  allowedUses?: AllowedUses;
  restrictedUses?: AllowedUses;

  // Evidence
  consentMethod: 'electronic' | 'written' | 'verbal';
  consentDocumentUrl?: string;
  electronicSignature?: string;
  witnessName?: string;
  witnessEmail?: string;

  // Privacy policy
  privacyPolicyVersion?: string;
  privacyPolicyAcceptedAt?: string;

  // Timing
  grantedAt?: string;
  expiresAt?: string;
  withdrawnAt?: string;
  withdrawalReason?: string;

  // Identity verification
  identityVerified: boolean;
  identityVerificationMethod?: string;
  identityVerifiedAt?: string;
  identityVerifiedBy?: string;

  // Compliance
  complianceFramework?: 'PIPEDA' | 'GDPR' | 'CCPA';
  dataProcessingBasis?: string;

  // Audit
  ipAddress?: string;
  userAgent?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// PARTNER DATABASES
// =============================================================================

export interface DataUsageRestrictions {
  searchOnly?: boolean;
  noStorage?: boolean;
  noThirdParty?: boolean;
  regionsAllowed?: string[];
  regionsExcluded?: string[];
  caseTypesAllowed?: string[];
}

export interface PartnerDatabase {
  id: string;
  name: string;
  code: string;
  organization?: string;
  country?: string;

  // Connection
  apiEndpoint?: string;
  apiVersion?: string;
  authenticationMethod?: 'api_key' | 'oauth2' | 'certificate';

  // Capabilities
  supportsSearch: boolean;
  supportsVerification: boolean;
  supportsRealTime: boolean;
  batchSearchLimit?: number;

  // Agreement
  agreementSignedAt?: string;
  agreementExpiresAt?: string;
  agreementDocumentUrl?: string;
  dataUsageRestrictions?: DataUsageRestrictions;

  // Status
  isActive: boolean;
  lastSyncAt?: string;
  lastHealthCheckAt?: string;
  healthStatus?: 'healthy' | 'degraded' | 'offline';

  // Statistics
  totalSearches: number;
  totalMatchesFound: number;
  averageResponseTimeMs?: number;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// BIAS TESTING
// =============================================================================

export interface ConfusionMatrix {
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
}

export interface SubgroupPerformance {
  subgroup: string;
  sampleSize: number;
  accuracy: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
}

export interface BiasTestResult {
  id: string;

  // Test info
  testName: string;
  testVersion: string;
  testDate: string;

  // Model
  aiProvider: string;
  aiModelVersion: string;

  // Parameters
  testCategory: BiasTestCategory;
  testSubcategory?: string;
  testDatasetId?: string;
  sampleSize: number;

  // Results
  overallAccuracy?: number;
  falsePositiveRate?: number;
  falseNegativeRate?: number;
  demographicParityScore?: number;
  equalizedOddsScore?: number;

  // Detailed
  confusionMatrix?: ConfusionMatrix;
  performanceBySubgroup?: SubgroupPerformance[];

  // Comparison
  baselineAccuracy?: number;
  deviationFromBaseline?: number;

  // Pass/fail
  meetsThreshold: boolean;
  thresholdUsed?: number;

  // Mitigation
  mitigationRequired: boolean;
  mitigationActions?: string[];
  mitigationAppliedAt?: string;

  // Review
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;

  // Timestamp
  createdAt: string;
}

// =============================================================================
// AUDIT LOGS
// =============================================================================

export type FRAuditAction =
  | 'photo_uploaded'
  | 'photo_updated'
  | 'photo_deleted'
  | 'search_initiated'
  | 'search_updated'
  | 'search_completed'
  | 'match_found'
  | 'match_reviewed'
  | 'match_confirmed'
  | 'match_rejected'
  | 'consent_recorded'
  | 'consent_updated'
  | 'consent_withdrawn'
  | 'age_progression_requested'
  | 'age_progression_completed'
  | 'data_exported'
  | 'data_deleted';

export type FRAuditCategory =
  | 'processing'
  | 'review'
  | 'consent'
  | 'export'
  | 'deletion'
  | 'other';

export interface FRAuditLog {
  id: string;
  action: FRAuditAction;
  actionCategory: FRAuditCategory;

  // Actor
  userId?: string;
  userRole?: string;

  // Resource
  resourceType: string;
  resourceId: string;

  // Related
  caseId?: string;
  recognitionRequestId?: string;

  // Details
  actionDetails?: Record<string, unknown>;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;

  // Compliance
  complianceRelevant: boolean;
  complianceFrameworks?: string[];
  personalDataAccessed: boolean;
  biometricDataAccessed: boolean;

  // Request context
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;

  // Timestamp
  createdAt: string;
}

// =============================================================================
// NOTIFICATIONS
// =============================================================================

export interface MatchNotification {
  id: string;
  faceMatchId: string;

  // Recipient
  recipientId?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientType: 'investigator' | 'family' | 'law_enforcement';

  // Content
  notificationType: 'new_match' | 'review_required' | 'match_confirmed';
  channel: 'email' | 'sms' | 'push' | 'in_app';
  priority: 'critical' | 'high' | 'normal' | 'low';
  subject?: string;
  messageBody?: string;
  messageTemplateId?: string;

  // Status
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;

  // Error
  errorCode?: string;
  errorMessage?: string;
  retryCount: number;

  // Timestamp
  createdAt: string;
}

// =============================================================================
// DATA RETENTION
// =============================================================================

export interface FacialDataRetention {
  id: string;

  // Data reference
  dataType: 'photo_submission' | 'face_encoding' | 'match_result';
  dataId: string;

  // Policy
  retentionPolicyId: string;
  retentionPeriodDays: number;

  // Dates
  dataCreatedAt: string;
  scheduledDeletionAt: string;

  // Status
  status: 'active' | 'extended' | 'deleted' | 'archived';

  // Extension
  extendedUntil?: string;
  extensionReason?: string;
  extendedBy?: string;

  // Deletion
  deletedAt?: string;
  deletedBy?: string;
  deletionCertificate?: string;

  // Legal hold
  underLegalHold: boolean;
  legalHoldId?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

export interface PhotoUploadRequest {
  caseId: string;
  file: File;
  submissionSource: PhotoSubmission['submissionSource'];
  consentRecordId?: string;
}

export interface PhotoUploadResponse {
  photoSubmission: PhotoSubmission;
  qualityAssessment: PhotoQualityFactors;
  facesDetected: FaceBoundingBox[];
  enhancementRecommended: boolean;
}

export interface FacialSearchRequest {
  caseId: string;
  photoSubmissionId: string;
  searchScope?: SearchScope;
  confidenceThreshold?: number;
  maxResults?: number;
  priority?: FacialRecognitionRequest['priority'];
}

export interface FacialSearchResponse {
  request: FacialRecognitionRequest;
  estimatedProcessingTime?: number;
  queuePosition?: number;
}

export interface AgeProgressionRequestInput {
  caseId: string;
  sourcePhotoId: string;
  sourceAge: number;
  targetAges: number[];
  includeVariations?: boolean;
  variationParameters?: AgeProgressionVariationParams;
}

export interface MatchReviewInput {
  faceMatchId: string;
  decision: MatchReviewDecision;
  confidenceLevel?: MatchReview['confidenceLevel'];
  analysisNotes?: string;
  comparisonPoints?: ComparisonPoint[];
}

export interface ConsentInput {
  subjectCaseId?: string;
  consentType: ConsentType;
  consentVersion: string;
  scopeDescription?: string;
  allowedUses: AllowedUses;
  consentMethod: ConsentRecord['consentMethod'];
  electronicSignature?: string;
  privacyPolicyVersion: string;
  complianceFramework?: ConsentRecord['complianceFramework'];
}

// =============================================================================
// DASHBOARD TYPES
// =============================================================================

export interface FacialRecognitionDashboardStats {
  totalPhotosSubmitted: number;
  totalSearchesRun: number;
  totalMatchesFound: number;
  pendingReviews: number;
  confirmedMatches: number;
  falsePositiveRate: number;
  averageProcessingTime: number;
  recentMatches: FaceMatchWithDetails[];
}

export interface MatchReviewQueueItem {
  match: FaceMatchWithDetails;
  priority: 'critical' | 'high' | 'normal' | 'low';
  ageInQueue: number; // seconds
  assignedTo?: string;
}

export interface BiasTestingSummary {
  lastTestDate: string;
  overallPassRate: number;
  categoryResults: {
    category: BiasTestCategory;
    passed: boolean;
    accuracy: number;
    issues?: string[];
  }[];
  mitigationRequired: boolean;
}

// =============================================================================
// CONSTANTS & LABELS
// =============================================================================

export const PHOTO_QUALITY_GRADE_LABELS: Record<
  PhotoQualityGrade,
  { label: string; color: string; bgColor: string; description: string }
> = {
  excellent: {
    label: 'Excellent',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    description: 'High-quality photo suitable for all purposes',
  },
  good: {
    label: 'Good',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-100',
    description: 'Good quality photo, suitable for facial recognition',
  },
  fair: {
    label: 'Fair',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    description: 'Acceptable quality, may affect match accuracy',
  },
  poor: {
    label: 'Poor',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    description: 'Low quality, enhancement recommended',
  },
  unusable: {
    label: 'Unusable',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    description: 'Cannot be used for facial recognition',
  },
};

export const FACE_MATCH_STATUS_LABELS: Record<
  FaceMatchStatus,
  { label: string; color: string; bgColor: string }
> = {
  pending_review: {
    label: 'Pending Review',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  under_review: {
    label: 'Under Review',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-100',
  },
  confirmed: {
    label: 'Confirmed',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
  rejected: {
    label: 'Rejected',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
  },
  false_positive: {
    label: 'False Positive',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
  },
  inconclusive: {
    label: 'Inconclusive',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
  },
};

export const CONSENT_STATUS_LABELS: Record<
  ConsentStatus,
  { label: string; color: string; bgColor: string }
> = {
  pending: {
    label: 'Pending',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  granted: {
    label: 'Granted',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
  denied: {
    label: 'Denied',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
  },
  withdrawn: {
    label: 'Withdrawn',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
  },
  expired: {
    label: 'Expired',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
  },
};

export const CONSENT_TYPE_LABELS: Record<ConsentType, { label: string; description: string }> = {
  photo_upload: {
    label: 'Photo Upload',
    description: 'Permission to upload and store photos',
  },
  facial_recognition: {
    label: 'Facial Recognition',
    description: 'Permission to process photos with facial recognition technology',
  },
  age_progression: {
    label: 'Age Progression',
    description: 'Permission to generate age-progressed images',
  },
  database_storage: {
    label: 'Database Storage',
    description: 'Permission to store facial data in the database',
  },
  third_party_sharing: {
    label: 'Third Party Sharing',
    description: 'Permission to share with partner organizations',
  },
  research_use: {
    label: 'Research Use',
    description: 'Permission to use data for research and improvement',
  },
};

export const BIAS_TEST_CATEGORY_LABELS: Record<
  BiasTestCategory,
  { label: string; description: string }
> = {
  age: {
    label: 'Age',
    description: 'Testing accuracy across different age groups',
  },
  gender: {
    label: 'Gender',
    description: 'Testing accuracy across genders',
  },
  ethnicity: {
    label: 'Ethnicity',
    description: 'Testing accuracy across ethnic groups',
  },
  lighting: {
    label: 'Lighting',
    description: 'Testing accuracy under different lighting conditions',
  },
  angle: {
    label: 'Angle',
    description: 'Testing accuracy at different face angles',
  },
  resolution: {
    label: 'Resolution',
    description: 'Testing accuracy at different image resolutions',
  },
};

// =============================================================================
// DATABASE MAPPERS
// =============================================================================

export function mapPhotoSubmissionFromDb(row: Record<string, unknown>): PhotoSubmission {
  return {
    id: row.id as string,
    caseId: row.case_id as string | undefined,
    submittedBy: row.submitted_by as string,
    submissionSource: row.submission_source as PhotoSubmission['submissionSource'],
    originalFilename: row.original_filename as string | undefined,
    filePath: row.file_path as string,
    fileUrl: row.file_url as string,
    fileSizeBytes: row.file_size_bytes as number | undefined,
    mimeType: row.mime_type as string | undefined,
    widthPx: row.width_px as number | undefined,
    heightPx: row.height_px as number | undefined,
    colorDepth: row.color_depth as number | undefined,
    hasFaceDetected: row.has_face_detected as boolean,
    faceCount: row.face_count as number,
    faceBoundingBoxes: row.face_bounding_boxes as FaceBoundingBox[] | undefined,
    qualityGrade: row.quality_grade as PhotoQualityGrade | undefined,
    qualityScore: row.quality_score as number | undefined,
    qualityFactors: row.quality_factors as PhotoQualityFactors | undefined,
    enhancementApplied: row.enhancement_applied as boolean,
    enhancedFileUrl: row.enhanced_file_url as string | undefined,
    isProcessed: row.is_processed as boolean,
    processedAt: row.processed_at as string | undefined,
    faceEncodingVersion: row.face_encoding_version as string | undefined,
    photoTakenAt: row.photo_taken_at as string | undefined,
    photoLocation: row.photo_location as PhotoLocation | undefined,
    cameraMake: row.camera_make as string | undefined,
    cameraModel: row.camera_model as string | undefined,
    exifData: row.exif_data as Record<string, unknown> | undefined,
    consentRecordId: row.consent_record_id as string | undefined,
    isConsentVerified: row.is_consent_verified as boolean,
    retentionExpiresAt: row.retention_expires_at as string | undefined,
    isArchived: row.is_archived as boolean,
    archivedAt: row.archived_at as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function mapFaceMatchFromDb(row: Record<string, unknown>): FaceMatch {
  return {
    id: row.id as string,
    recognitionRequestId: row.recognition_request_id as string,
    sourcePhotoId: row.source_photo_id as string,
    matchedPhotoId: row.matched_photo_id as string | undefined,
    matchedCaseId: row.matched_case_id as string | undefined,
    externalSource: row.external_source as string | undefined,
    externalReferenceId: row.external_reference_id as string | undefined,
    externalPhotoUrl: row.external_photo_url as string | undefined,
    confidenceScore: row.confidence_score as number,
    similarityScore: row.similarity_score as number | undefined,
    facialLandmarksMatch: row.facial_landmarks_match as FacialLandmarksMatch | undefined,
    featureVectorDistance: row.feature_vector_distance as number | undefined,
    estimatedAgeRange: row.estimated_age_range as EstimatedAgeRange | undefined,
    estimatedGender: row.estimated_gender as string | undefined,
    estimatedEthnicity: row.estimated_ethnicity as string | undefined,
    status: row.status as FaceMatchStatus,
    reviewerId: row.reviewer_id as string | undefined,
    reviewedAt: row.reviewed_at as string | undefined,
    reviewNotes: row.review_notes as string | undefined,
    reviewOutcome: row.review_outcome as FaceMatch['reviewOutcome'],
    requiresSecondaryReview: row.requires_secondary_review as boolean,
    secondaryReviewerId: row.secondary_reviewer_id as string | undefined,
    secondaryReviewedAt: row.secondary_reviewed_at as string | undefined,
    secondaryReviewNotes: row.secondary_review_notes as string | undefined,
    secondaryReviewOutcome: row.secondary_review_outcome as string | undefined,
    notificationSent: row.notification_sent as boolean,
    notificationSentAt: row.notification_sent_at as string | undefined,
    notificationMethod: row.notification_method as FaceMatch['notificationMethod'],
    markedAsFalsePositive: row.marked_as_false_positive as boolean,
    falsePositiveReason: row.false_positive_reason as string | undefined,
    usedForTraining: row.used_for_training as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function mapConsentRecordFromDb(row: Record<string, unknown>): ConsentRecord {
  return {
    id: row.id as string,
    subjectId: row.subject_id as string | undefined,
    subjectCaseId: row.subject_case_id as string | undefined,
    subjectName: row.subject_name as string | undefined,
    subjectEmail: row.subject_email as string | undefined,
    subjectRelationship: row.subject_relationship as ConsentRecord['subjectRelationship'],
    consentType: row.consent_type as ConsentType,
    consentStatus: row.consent_status as ConsentStatus,
    consentVersion: row.consent_version as string,
    scopeDescription: row.scope_description as string | undefined,
    allowedUses: row.allowed_uses as AllowedUses | undefined,
    restrictedUses: row.restricted_uses as AllowedUses | undefined,
    consentMethod: row.consent_method as ConsentRecord['consentMethod'],
    consentDocumentUrl: row.consent_document_url as string | undefined,
    electronicSignature: row.electronic_signature as string | undefined,
    witnessName: row.witness_name as string | undefined,
    witnessEmail: row.witness_email as string | undefined,
    privacyPolicyVersion: row.privacy_policy_version as string | undefined,
    privacyPolicyAcceptedAt: row.privacy_policy_accepted_at as string | undefined,
    grantedAt: row.granted_at as string | undefined,
    expiresAt: row.expires_at as string | undefined,
    withdrawnAt: row.withdrawn_at as string | undefined,
    withdrawalReason: row.withdrawal_reason as string | undefined,
    identityVerified: row.identity_verified as boolean,
    identityVerificationMethod: row.identity_verification_method as string | undefined,
    identityVerifiedAt: row.identity_verified_at as string | undefined,
    identityVerifiedBy: row.identity_verified_by as string | undefined,
    complianceFramework: row.compliance_framework as ConsentRecord['complianceFramework'],
    dataProcessingBasis: row.data_processing_basis as string | undefined,
    ipAddress: row.ip_address as string | undefined,
    userAgent: row.user_agent as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function mapFacialRecognitionRequestFromDb(
  row: Record<string, unknown>
): FacialRecognitionRequest {
  return {
    id: row.id as string,
    requestNumber: row.request_number as string | undefined,
    caseId: row.case_id as string,
    photoSubmissionId: row.photo_submission_id as string,
    requestedBy: row.requested_by as string,
    requestType: row.request_type as FacialRecognitionRequest['requestType'],
    priority: row.priority as FacialRecognitionRequest['priority'],
    searchScope: row.search_scope as SearchScope | undefined,
    confidenceThreshold: row.confidence_threshold as number,
    maxResults: row.max_results as number,
    status: row.status as FacialRecognitionStatus,
    processingStartedAt: row.processing_started_at as string | undefined,
    processingCompletedAt: row.processing_completed_at as string | undefined,
    processingTimeMs: row.processing_time_ms as number | undefined,
    aiProvider: row.ai_provider as string | undefined,
    aiModelVersion: row.ai_model_version as string | undefined,
    totalMatchesFound: row.total_matches_found as number,
    highConfidenceMatches: row.high_confidence_matches as number,
    complianceCheckPassed: row.compliance_check_passed as boolean | undefined,
    complianceNotes: row.compliance_notes as string | undefined,
    errorCode: row.error_code as string | undefined,
    errorMessage: row.error_message as string | undefined,
    retryCount: row.retry_count as number,
    ipAddress: row.ip_address as string | undefined,
    userAgent: row.user_agent as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function mapAgeProgressionRequestFromDb(
  row: Record<string, unknown>
): AgeProgressionRequest {
  return {
    id: row.id as string,
    requestNumber: row.request_number as string | undefined,
    caseId: row.case_id as string,
    sourcePhotoId: row.source_photo_id as string,
    requestedBy: row.requested_by as string,
    sourceAge: row.source_age as number,
    targetAges: row.target_ages as number[],
    includeVariations: row.include_variations as boolean,
    variationParameters: row.variation_parameters as AgeProgressionVariationParams | undefined,
    status: row.status as FacialRecognitionStatus,
    processingStartedAt: row.processing_started_at as string | undefined,
    processingCompletedAt: row.processing_completed_at as string | undefined,
    processingTimeMs: row.processing_time_ms as number | undefined,
    aiProvider: row.ai_provider as string | undefined,
    aiModelVersion: row.ai_model_version as string | undefined,
    imagesGenerated: row.images_generated as number,
    resultPhotos: row.result_photos as AgeProgressionResult[] | undefined,
    qualityReviewed: row.quality_reviewed as boolean,
    qualityReviewerId: row.quality_reviewer_id as string | undefined,
    qualityScore: row.quality_score as number | undefined,
    qualityNotes: row.quality_notes as string | undefined,
    requiresApproval: row.requires_approval as boolean,
    approved: row.approved as boolean | undefined,
    approvedBy: row.approved_by as string | undefined,
    approvedAt: row.approved_at as string | undefined,
    rejectionReason: row.rejection_reason as string | undefined,
    usedInCase: row.used_in_case as boolean,
    publicDistributionApproved: row.public_distribution_approved as boolean,
    errorCode: row.error_code as string | undefined,
    errorMessage: row.error_message as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
