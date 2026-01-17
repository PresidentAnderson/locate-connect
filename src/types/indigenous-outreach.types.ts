/**
 * Indigenous Community Outreach & Notification Types
 * LC-FEAT-130: Multilingual notification system for Indigenous communities
 */

// =============================================================================
// NOTIFICATION CONFIGURATION
// =============================================================================

export type NotificationChannel = 'email' | 'sms' | 'push' | 'community_board';
export type NotificationPriority = 'urgent' | 'high' | 'normal' | 'low';
export type TemplateType =
  | 'missing_alert'
  | 'amber_alert'
  | 'found_safe'
  | 'wellness_check'
  | 'community_assistance'
  | 'case_update';

export interface NotificationConfig {
  caseId: string;
  targetLanguages: string[]; // ['cr', 'en', 'fr']
  channels: NotificationChannel[];
  priority: NotificationPriority;
  includeTranslation: boolean;
  targetCommunities?: string[]; // Community IDs
  targetOrganizations?: string[]; // Organization IDs
  targetRegions?: string[]; // Province/region codes
}

// =============================================================================
// NOTIFICATION TEMPLATES
// =============================================================================

export interface NotificationTemplate {
  id: string;
  templateType: TemplateType;
  languageCode: string;
  subject: string;
  body: string;
  shortBody: string; // For SMS
  variables: string[]; // Template variable names
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  translatorNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationTemplateTranslations {
  templateId: string;
  translations: {
    [languageCode: string]: {
      subject: string;
      body: string;
      shortBody: string;
    };
  };
}

export interface NotificationTemplateInput {
  templateType: TemplateType;
  languageCode: string;
  subject: string;
  body: string;
  shortBody?: string;
  variables?: string[];
  translatorNotes?: string;
}

// =============================================================================
// NOTIFICATION QUEUE
// =============================================================================

export interface NotificationQueueItem {
  id: string;
  caseId: string;
  userId?: string;
  communityId?: string;
  organizationId?: string;
  notificationType: string;
  channel: NotificationChannel;
  priority: NotificationPriority;
  languageCode: string;
  subject?: string;
  body: string;
  shortBody?: string;
  metadata: Record<string, unknown>;
  scheduledFor: string;
  sentAt?: string;
  failedAt?: string;
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationQueueInput {
  caseId: string;
  userId?: string;
  communityId?: string;
  organizationId?: string;
  notificationType: string;
  channel: NotificationChannel;
  priority?: NotificationPriority;
  languageCode: string;
  subject?: string;
  body: string;
  shortBody?: string;
  metadata?: Record<string, unknown>;
  scheduledFor?: string;
}

// =============================================================================
// NOTIFICATION DELIVERY
// =============================================================================

export interface NotificationDeliveryLog {
  id: string;
  queueItemId?: string;
  caseId: string;
  userId?: string;
  communityId?: string;
  notificationType: string;
  channel: NotificationChannel;
  languageCode: string;
  subject?: string;
  deliveredAt: string;
  openedAt?: string;
  clickedAt?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface NotificationDeliveryMetrics {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  byChannel: Record<NotificationChannel, number>;
  byLanguage: Record<string, number>;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
}

// =============================================================================
// LANGUAGE REGION MAPPING
// =============================================================================

export interface LanguageRegionMapping {
  id: string;
  languageCode: string;
  languageName: string;
  iso6393?: string; // ISO 639-3 code
  provinces: string[];
  regions: string[];
  communities?: string[]; // Community UUIDs
  primaryRegions: string[];
  speakerPopulationEstimate?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LanguageRegionMappingInput {
  languageCode: string;
  languageName: string;
  iso6393?: string;
  provinces?: string[];
  regions?: string[];
  primaryRegions?: string[];
  speakerPopulationEstimate?: number;
}

// =============================================================================
// COMMUNITY BOARD INTEGRATION
// =============================================================================

export type CommunityBoardType =
  | 'physical_board'
  | 'website'
  | 'social_media'
  | 'newsletter'
  | 'radio';

export interface CommunityBoardPost {
  id: string;
  caseId: string;
  communityId?: string;
  organizationId?: string;
  boardType: CommunityBoardType;
  languageCode: string;
  title: string;
  content: string;
  postedAt?: string;
  postedBy?: string;
  expiresAt?: string;
  isActive: boolean;
  reachEstimate?: number;
  engagementMetrics: EngagementMetrics;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityBoardPostInput {
  caseId: string;
  communityId?: string;
  organizationId?: string;
  boardType: CommunityBoardType;
  languageCode: string;
  title: string;
  content: string;
  expiresAt?: string;
  reachEstimate?: number;
}

export interface EngagementMetrics {
  views?: number;
  shares?: number;
  responses?: number;
  callbackCount?: number;
}

// =============================================================================
// REGIONAL TARGETING
// =============================================================================

export interface RegionalTargeting {
  provinces: string[];
  regions: string[];
  communities: string[];
  languages: string[];
}

export const LANGUAGE_REGION_MAP: Record<string, string[]> = {
  cr: ['MB', 'SK', 'AB', 'ON', 'QC', 'NT'], // Cree
  oj: ['MB', 'ON', 'QC', 'SK'], // Ojibwe
  iu: ['NU', 'NT', 'QC', 'NL'], // Inuktitut
  ikt: ['NU', 'NT'], // Inuinnaqtun
  mic: ['NS', 'NB', 'PE', 'NL', 'QC'], // Mi'kmaq
  moh: ['ON', 'QC'], // Mohawk
  bla: ['AB', 'SK', 'MT'], // Blackfoot
  den: ['NT', 'SK', 'AB', 'BC'], // Dene
  oka: ['ON', 'MB'], // Oji-Cree
};

// =============================================================================
// TEMPLATE RENDERING
// =============================================================================

export interface TemplateVariables {
  name?: string;
  age?: string | number;
  last_seen_location?: string;
  last_seen_date?: string;
  description?: string;
  contact?: string;
  case_number?: string;
  last_contact_date?: string;
  last_known_location?: string;
  cultural_notes?: string;
  suspect_description?: string;
  vehicle_description?: string;
  [key: string]: string | number | undefined;
}

export interface RenderedNotification {
  languageCode: string;
  subject: string;
  body: string;
  shortBody: string;
}

// =============================================================================
// MULTI-LANGUAGE DISPATCH
// =============================================================================

export interface MultiLanguageDispatch {
  caseId: string;
  templateType: TemplateType;
  variables: TemplateVariables;
  targetLanguages: string[];
  channels: NotificationChannel[];
  priority: NotificationPriority;
  targetCommunities?: string[];
  targetOrganizations?: string[];
  scheduledFor?: string;
}

export interface DispatchResult {
  success: boolean;
  queuedCount: number;
  failedCount: number;
  queuedItems: NotificationQueueItem[];
  errors: DispatchError[];
}

export interface DispatchError {
  languageCode: string;
  channel: NotificationChannel;
  error: string;
}

// =============================================================================
// COMMUNITY ORGANIZATION (Extended)
// =============================================================================

export interface CommunityOrganization {
  id: string;
  name: string;
  nameIndigenous?: string;
  type: string;
  languagesServed: string[];
  primaryLanguage?: string;
  region?: string;
  province?: string;
  community?: string;
  nation?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  website?: string;
  notificationPreferences: NotificationPreferences;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreferences {
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  preferredLanguages?: string[];
  acceptsAlerts?: boolean;
  alertTypes?: string[];
  maxFrequency?: string;
}

export interface CommunityOrganizationInput {
  name: string;
  nameIndigenous?: string;
  type: string;
  languagesServed?: string[];
  primaryLanguage?: string;
  region?: string;
  province?: string;
  community?: string;
  nation?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  website?: string;
  notificationPreferences?: NotificationPreferences;
}

// =============================================================================
// OUTREACH STATISTICS
// =============================================================================

export interface OutreachStatistics {
  totalNotificationsSent: number;
  notificationsByLanguage: Record<string, number>;
  notificationsByChannel: Record<NotificationChannel, number>;
  notificationsByRegion: Record<string, number>;
  communitiesReached: number;
  organizationsNotified: number;
  averageDeliveryTime: number;
  engagementRate: number;
}

// =============================================================================
// DISPLAY HELPERS
// =============================================================================

export const TEMPLATE_TYPE_LABELS: Record<TemplateType, string> = {
  missing_alert: 'Missing Person Alert',
  amber_alert: 'AMBER Alert',
  found_safe: 'Located Safe',
  wellness_check: 'Wellness Check Request',
  community_assistance: 'Community Assistance Request',
  case_update: 'Case Update',
};

export const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  email: 'Email',
  sms: 'SMS/Text Message',
  push: 'Push Notification',
  community_board: 'Community Board',
};

export const PRIORITY_LABELS: Record<NotificationPriority, string> = {
  urgent: 'Urgent',
  high: 'High',
  normal: 'Normal',
  low: 'Low',
};

export const BOARD_TYPE_LABELS: Record<CommunityBoardType, string> = {
  physical_board: 'Physical Bulletin Board',
  website: 'Website/Online Portal',
  social_media: 'Social Media',
  newsletter: 'Newsletter/Mailing List',
  radio: 'Community Radio',
};

// =============================================================================
// DATABASE MAPPERS
// =============================================================================

export function mapNotificationTemplateFromDb(row: Record<string, unknown>): NotificationTemplate {
  return {
    id: row.id as string,
    templateType: row.template_type as TemplateType,
    languageCode: row.language_code as string,
    subject: row.subject as string,
    body: row.body as string,
    shortBody: row.short_body as string,
    variables: row.variables as string[],
    isApproved: row.is_approved as boolean,
    approvedBy: row.approved_by as string | undefined,
    approvedAt: row.approved_at as string | undefined,
    translatorNotes: row.translator_notes as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function mapNotificationQueueItemFromDb(row: Record<string, unknown>): NotificationQueueItem {
  return {
    id: row.id as string,
    caseId: row.case_id as string,
    userId: row.user_id as string | undefined,
    communityId: row.community_id as string | undefined,
    organizationId: row.organization_id as string | undefined,
    notificationType: row.notification_type as string,
    channel: row.channel as NotificationChannel,
    priority: row.priority as NotificationPriority,
    languageCode: row.language_code as string,
    subject: row.subject as string | undefined,
    body: row.body as string,
    shortBody: row.short_body as string | undefined,
    metadata: row.metadata as Record<string, unknown>,
    scheduledFor: row.scheduled_for as string,
    sentAt: row.sent_at as string | undefined,
    failedAt: row.failed_at as string | undefined,
    failureReason: row.failure_reason as string | undefined,
    retryCount: row.retry_count as number,
    maxRetries: row.max_retries as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function mapLanguageRegionMappingFromDb(row: Record<string, unknown>): LanguageRegionMapping {
  return {
    id: row.id as string,
    languageCode: row.language_code as string,
    languageName: row.language_name as string,
    iso6393: row.iso_639_3 as string | undefined,
    provinces: row.provinces as string[],
    regions: row.regions as string[],
    communities: row.communities as string[] | undefined,
    primaryRegions: row.primary_regions as string[],
    speakerPopulationEstimate: row.speaker_population_estimate as number | undefined,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function mapCommunityBoardPostFromDb(row: Record<string, unknown>): CommunityBoardPost {
  return {
    id: row.id as string,
    caseId: row.case_id as string,
    communityId: row.community_id as string | undefined,
    organizationId: row.organization_id as string | undefined,
    boardType: row.board_type as CommunityBoardType,
    languageCode: row.language_code as string,
    title: row.title as string,
    content: row.content as string,
    postedAt: row.posted_at as string | undefined,
    postedBy: row.posted_by as string | undefined,
    expiresAt: row.expires_at as string | undefined,
    isActive: row.is_active as boolean,
    reachEstimate: row.reach_estimate as number | undefined,
    engagementMetrics: row.engagement_metrics as EngagementMetrics,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function mapCommunityOrganizationFromDb(row: Record<string, unknown>): CommunityOrganization {
  return {
    id: row.id as string,
    name: row.name as string,
    nameIndigenous: row.name_indigenous as string | undefined,
    type: row.type as string,
    languagesServed: row.languages_served as string[],
    primaryLanguage: row.primary_language as string | undefined,
    region: row.region as string | undefined,
    province: row.province as string | undefined,
    community: row.community as string | undefined,
    nation: row.nation as string | undefined,
    contactEmail: row.contact_email as string | undefined,
    contactPhone: row.contact_phone as string | undefined,
    address: row.address as string | undefined,
    website: row.website as string | undefined,
    notificationPreferences: row.notification_preferences as NotificationPreferences,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
