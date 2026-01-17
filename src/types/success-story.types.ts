/**
 * Success Story & Testimonial System Types (LC-FEAT-022)
 */

// =============================================================================
// ENUMS
// =============================================================================

export type StoryStatus =
  | 'draft'
  | 'pending_family_approval'
  | 'pending_admin_approval'
  | 'approved'
  | 'published'
  | 'archived'
  | 'rejected';

export type StoryVisibility = 'private' | 'internal' | 'public';

export type AnonymizationLevel = 'none' | 'partial' | 'full';

export type MediaTemplateType =
  | 'press_release'
  | 'social_media'
  | 'newsletter'
  | 'website_feature'
  | 'video_script'
  | 'infographic';

export type ConsentType =
  | 'story_publication'
  | 'name_use'
  | 'photo_use'
  | 'quote_use'
  | 'media_sharing';

export type ConsentMethod =
  | 'digital_signature'
  | 'email_confirmation'
  | 'verbal_recorded'
  | 'physical_form';

export type ApprovalStage =
  | 'family_review'
  | 'content_review'
  | 'legal_review'
  | 'final_approval';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'changes_requested';

export type ReviewerType = 'family_member' | 'case_manager' | 'legal_team' | 'admin';

export type RecipientType =
  | 'law_enforcement'
  | 'volunteers'
  | 'tipsters'
  | 'community'
  | 'specific_person';

export type InteractionType = 'view' | 'share' | 'download' | 'print';

export type RedactionType = 'privacy' | 'legal' | 'family_request' | 'security';

// =============================================================================
// SUCCESS STORY
// =============================================================================

export interface SuccessStory {
  id: string;
  caseId: string;

  // Story content
  title: string;
  titleFr?: string;
  summary: string;
  summaryFr?: string;
  fullStory?: string;
  fullStoryFr?: string;

  // Anonymization
  anonymizationLevel: AnonymizationLevel;
  displayName?: string;
  displayLocation?: string;
  redactedFields: string[];
  originalContentHash?: string;

  // Media
  featuredImageUrl?: string;
  galleryImages: string[];
  videoUrl?: string;

  // Quotes
  familyQuote?: string;
  familyQuoteFr?: string;
  investigatorQuote?: string;
  investigatorQuoteFr?: string;
  volunteerQuote?: string;
  volunteerQuoteFr?: string;

  // Categorization
  tags: string[];
  outcomeCategory?: string;

  // Statistics
  daysUntilResolution?: number;
  tipCount?: number;
  volunteerCount?: number;
  agencyCount?: number;

  // Status
  status: StoryStatus;
  visibility: StoryVisibility;

  // Publishing
  publishedAt?: string;
  publishedBy?: string;
  featuredOnHomepage: boolean;
  featuredUntil?: string;

  // SEO
  slug?: string;
  metaDescription?: string;
  metaKeywords?: string[];

  // Tracking
  viewCount: number;
  shareCount: number;

  // Metadata
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SuccessStoryWithRelations extends SuccessStory {
  case?: {
    id: string;
    caseNumber: string;
    firstName: string;
    lastName: string;
    disposition: string;
    resolutionDate: string;
  };
  consents?: StoryConsent[];
  approvals?: StoryApproval[];
  thankYouMessages?: FamilyThankYouMessage[];
  mediaTemplates?: StoryMediaTemplate[];
}

// =============================================================================
// STORY CONSENT
// =============================================================================

export interface StoryConsent {
  id: string;
  storyId: string;

  // Consenter info
  consenterId?: string;
  consenterName: string;
  consenterEmail?: string;
  consenterPhone?: string;
  consenterRelationship: string;

  // Consent details
  consentType: ConsentType;
  consentScope: Record<string, unknown>;

  // Status
  isGranted: boolean;
  grantedAt?: string;
  expiresAt?: string;

  // Method
  consentMethod: ConsentMethod;
  consentDocumentUrl?: string;

  // Verification
  verificationCode?: string;
  verifiedAt?: string;
  verifiedBy?: string;

  // Withdrawal
  withdrawnAt?: string;
  withdrawalReason?: string;
  withdrawalProcessedBy?: string;

  // Legal
  ipAddress?: string;
  userAgent?: string;
  consentVersion: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface CreateConsentInput {
  storyId: string;
  consenterName: string;
  consenterEmail?: string;
  consenterPhone?: string;
  consenterRelationship: string;
  consentType: ConsentType;
  consentScope?: Record<string, unknown>;
  consentMethod: ConsentMethod;
  consentDocumentUrl?: string;
}

export interface UpdateConsentInput {
  isGranted?: boolean;
  verifiedAt?: string;
  withdrawnAt?: string;
  withdrawalReason?: string;
}

// =============================================================================
// STORY APPROVAL
// =============================================================================

export interface StoryApproval {
  id: string;
  storyId: string;

  // Stage
  approvalStage: ApprovalStage;
  approvalOrder: number;

  // Reviewer
  reviewerType: ReviewerType;
  reviewerId?: string;
  reviewerEmail?: string;
  reviewerName?: string;

  // Status
  status: ApprovalStatus;

  // Feedback
  feedback?: string;
  requestedChanges: Array<{
    field: string;
    suggestion: string;
    priority: 'low' | 'medium' | 'high';
  }>;

  // Timeline
  requestedAt: string;
  respondedAt?: string;
  deadlineAt?: string;

  // Reminders
  reminderCount: number;
  lastReminderAt?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface CreateApprovalInput {
  storyId: string;
  approvalStage: ApprovalStage;
  approvalOrder?: number;
  reviewerType: ReviewerType;
  reviewerId?: string;
  reviewerEmail?: string;
  reviewerName?: string;
  deadlineAt?: string;
}

export interface SubmitApprovalInput {
  status: ApprovalStatus;
  feedback?: string;
  requestedChanges?: Array<{
    field: string;
    suggestion: string;
    priority: 'low' | 'medium' | 'high';
  }>;
}

// =============================================================================
// FAMILY THANK YOU MESSAGE
// =============================================================================

export interface FamilyThankYouMessage {
  id: string;
  caseId: string;
  storyId?: string;

  // Sender
  senderId?: string;
  senderName: string;
  senderRelationship: string;

  // Recipients
  recipientType: RecipientType;
  recipientId?: string;
  recipientOrganizationId?: string;

  // Content
  message: string;
  messageFr?: string;

  // Display
  isPublic: boolean;
  displayName?: string;
  anonymizeDetails: boolean;

  // Attachments
  attachmentUrls: string[];

  // Approval
  approvedAt?: string;
  approvedBy?: string;

  // Delivery
  deliveredAt?: string;
  readAt?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface CreateThankYouMessageInput {
  caseId: string;
  storyId?: string;
  senderName: string;
  senderRelationship: string;
  recipientType: RecipientType;
  recipientId?: string;
  recipientOrganizationId?: string;
  message: string;
  messageFr?: string;
  isPublic?: boolean;
  displayName?: string;
  anonymizeDetails?: boolean;
  attachmentUrls?: string[];
}

// =============================================================================
// MEDIA TEMPLATE
// =============================================================================

export interface StoryMediaTemplate {
  id: string;
  storyId: string;

  // Template info
  templateType: MediaTemplateType;
  templateName: string;

  // Content
  content: string;
  contentFr?: string;

  // Media-specific
  headline?: string;
  subheadline?: string;
  callToAction?: string;
  hashtags?: string[];

  // Versions
  shortVersion?: string;
  mediumVersion?: string;
  longVersion?: string;

  // Media
  primaryImageUrl?: string;
  thumbnailUrl?: string;
  mediaKitUrl?: string;

  // Approval
  isApproved: boolean;
  approvedAt?: string;
  approvedBy?: string;

  // Usage
  downloadCount: number;
  lastDownloadedAt?: string;
  lastDownloadedBy?: string;

  // Timestamps
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMediaTemplateInput {
  storyId: string;
  templateType: MediaTemplateType;
  templateName: string;
  content: string;
  contentFr?: string;
  headline?: string;
  subheadline?: string;
  callToAction?: string;
  hashtags?: string[];
  shortVersion?: string;
  mediumVersion?: string;
  longVersion?: string;
  primaryImageUrl?: string;
  thumbnailUrl?: string;
  mediaKitUrl?: string;
}

// =============================================================================
// SUCCESS METRICS
// =============================================================================

export interface SuccessMetrics {
  id: string;

  // Period
  metricPeriod: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all_time';
  periodStart: string;
  periodEnd: string;

  // Case outcomes
  totalCasesResolved: number;
  foundAliveSafe: number;
  foundAliveInjured: number;
  reunitedWithFamily: number;
  voluntaryReturn: number;

  // Demographics
  minorsFound: number;
  adultsFound: number;
  seniorsFound: number;
  indigenousCasesResolved: number;

  // Time metrics
  averageResolutionDays?: number;
  medianResolutionDays?: number;
  fastestResolutionHours?: number;

  // Community
  totalTipsReceived: number;
  verifiedTips: number;
  totalVolunteers: number;
  volunteerHours: number;

  // Agency
  agenciesInvolved: number;
  crossJurisdictionCases: number;

  // Stories
  storiesPublished: number;
  totalStoryViews: number;
  totalStoryShares: number;

  // Metadata
  calculatedAt: string;
}

// =============================================================================
// STORY INTERACTION
// =============================================================================

export interface StoryInteraction {
  id: string;
  storyId: string;
  interactionType: InteractionType;
  source?: string;
  referrer?: string;
  sessionHash?: string;
  countryCode?: string;
  deviceType?: 'mobile' | 'desktop' | 'tablet';
  createdAt: string;
}

export interface CreateInteractionInput {
  storyId: string;
  interactionType: InteractionType;
  source?: string;
  referrer?: string;
}

// =============================================================================
// REDACTION LOG
// =============================================================================

export interface StoryRedactionLog {
  id: string;
  storyId: string;
  fieldName: string;
  originalValueHash: string;
  redactedBy: string;
  redactionReason: string;
  redactionType: RedactionType;
  isReversible: boolean;
  reversedAt?: string;
  reversedBy?: string;
  createdAt: string;
}

export interface CreateRedactionInput {
  storyId: string;
  fieldName: string;
  originalValue: string; // Will be hashed before storage
  redactionReason: string;
  redactionType: RedactionType;
  isReversible?: boolean;
}

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

export interface CreateStoryInput {
  caseId: string;
  title: string;
  titleFr?: string;
  summary: string;
  summaryFr?: string;
  fullStory?: string;
  fullStoryFr?: string;
  anonymizationLevel?: AnonymizationLevel;
  displayName?: string;
  displayLocation?: string;
  featuredImageUrl?: string;
  galleryImages?: string[];
  videoUrl?: string;
  familyQuote?: string;
  familyQuoteFr?: string;
  investigatorQuote?: string;
  investigatorQuoteFr?: string;
  volunteerQuote?: string;
  volunteerQuoteFr?: string;
  tags?: string[];
  outcomeCategory?: string;
  visibility?: StoryVisibility;
}

export interface UpdateStoryInput extends Partial<CreateStoryInput> {
  status?: StoryStatus;
  featuredOnHomepage?: boolean;
  featuredUntil?: string;
  metaDescription?: string;
  metaKeywords?: string[];
}

export interface StoryFilters {
  status?: StoryStatus;
  visibility?: StoryVisibility;
  caseId?: string;
  outcomeCategory?: string;
  tags?: string[];
  featuredOnly?: boolean;
  publishedAfter?: string;
  publishedBefore?: string;
}

export interface StoriesResponse {
  stories: SuccessStoryWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface StoryGalleryItem {
  id: string;
  title: string;
  titleFr?: string;
  summary: string;
  summaryFr?: string;
  featuredImageUrl?: string;
  slug: string;
  publishedAt: string;
  outcomeCategory?: string;
  tags: string[];
  viewCount: number;
  displayName?: string;
  displayLocation?: string;
  daysUntilResolution?: number;
}

export interface PublicGalleryResponse {
  stories: StoryGalleryItem[];
  metrics: Partial<SuccessMetrics>;
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// =============================================================================
// CONSENT WORKFLOW TYPES
// =============================================================================

export interface ConsentWorkflowState {
  storyId: string;
  requiredConsents: ConsentType[];
  grantedConsents: ConsentType[];
  pendingConsents: ConsentType[];
  withdrawnConsents: ConsentType[];
  canPublish: boolean;
  blockedReasons: string[];
}

export interface ApprovalWorkflowState {
  storyId: string;
  currentStage: ApprovalStage;
  stages: Array<{
    stage: ApprovalStage;
    status: ApprovalStatus;
    reviewer?: string;
    completedAt?: string;
  }>;
  canAdvance: boolean;
  canPublish: boolean;
  blockedReasons: string[];
}

// =============================================================================
// DASHBOARD TYPES
// =============================================================================

export interface StoryDashboardStats {
  totalStories: number;
  publishedStories: number;
  draftStories: number;
  pendingApproval: number;
  featuredStories: number;
  totalViews: number;
  totalShares: number;
  storiesByMonth: Array<{
    month: string;
    count: number;
  }>;
  topStories: Array<{
    id: string;
    title: string;
    viewCount: number;
    shareCount: number;
  }>;
  pendingConsents: number;
  pendingApprovals: number;
}
