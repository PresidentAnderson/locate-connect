/**
 * Social Media Monitoring Types
 * LC-M4-002
 */

// =============================================================================
// ENUMS
// =============================================================================

export type SocialMediaPlatform =
  | 'facebook'
  | 'instagram'
  | 'twitter'
  | 'tiktok'
  | 'linkedin'
  | 'other';

export type SocialActivityType =
  | 'post'
  | 'story'
  | 'comment'
  | 'like'
  | 'share'
  | 'login'
  | 'location_tag'
  | 'profile_update'
  | 'friend_added'
  | 'group_joined'
  | 'event_rsvp'
  | 'live_video'
  | 'reel'
  | 'other';

export type MonitoringStatus = 'active' | 'paused' | 'stopped' | 'error';

// =============================================================================
// MONITORED ACCOUNT
// =============================================================================

export interface SocialMediaMonitoredAccount {
  id: string;
  case_id: string;
  platform: SocialMediaPlatform;
  username: string;
  profile_url?: string;
  display_name?: string;
  profile_photo_url?: string;
  monitoring_status: MonitoringStatus;
  monitoring_started_at: string;
  monitoring_stopped_at?: string;
  started_by: string;
  stopped_by?: string;
  last_activity_at?: string;
  total_activities_detected: number;
  webhook_subscription_id?: string;
  webhook_active: boolean;
  webhook_verified_at?: string;
  last_error_at?: string;
  last_error_message?: string;
  consecutive_errors: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// ACTIVITY EVENT
// =============================================================================

export interface SocialMediaActivityEvent {
  id: string;
  monitored_account_id: string;
  case_id: string;
  activity_type: SocialActivityType;
  activity_timestamp: string;
  content_preview?: string;
  content_url?: string;
  media_type?: string;
  media_url?: string;
  location_name?: string;
  location_latitude?: number;
  location_longitude?: number;
  engagement_likes: number;
  engagement_comments: number;
  engagement_shares: number;
  engagement_views: number;
  raw_data?: Record<string, unknown>;
  is_processed: boolean;
  processed_at?: string;
  generated_lead_id?: string;
  alert_sent: boolean;
  alert_sent_at?: string;
  alert_priority?: string;
  created_at: string;
}

// =============================================================================
// API INPUT TYPES
// =============================================================================

export interface CreateMonitoredAccountInput {
  case_id: string;
  platform: SocialMediaPlatform;
  username: string;
  profile_url?: string;
  display_name?: string;
  notes?: string;
}

export interface UpdateMonitoredAccountInput {
  monitoring_status?: MonitoringStatus;
  notes?: string;
}

export interface MonitoredAccountQueryParams {
  case_id?: string;
  platform?: SocialMediaPlatform;
  status?: MonitoringStatus;
  page?: number;
  page_size?: number;
}

export interface ActivityQueryParams {
  case_id?: string;
  account_id?: string;
  platform?: SocialMediaPlatform;
  activity_type?: SocialActivityType;
  start_date?: string;
  end_date?: string;
  has_location?: boolean;
  page?: number;
  page_size?: number;
}

// =============================================================================
// WEBHOOK TYPES
// =============================================================================

export interface SocialMediaWebhookPayload {
  platform: SocialMediaPlatform;
  account_username: string;
  activity_type: SocialActivityType;
  activity_timestamp: string;
  content_preview?: string;
  content_url?: string;
  media_type?: string;
  media_url?: string;
  location?: {
    name?: string;
    latitude?: number;
    longitude?: number;
  };
  engagement?: {
    likes?: number;
    comments?: number;
    shares?: number;
    views?: number;
  };
  raw_data?: Record<string, unknown>;
}

export interface WebhookVerificationRequest {
  mode: 'subscribe';
  verify_token: string;
  challenge: string;
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface MonitoredAccountWithActivity extends SocialMediaMonitoredAccount {
  recent_activities?: SocialMediaActivityEvent[];
}

export interface ActivityEventWithAccount extends SocialMediaActivityEvent {
  account?: {
    platform: SocialMediaPlatform;
    username: string;
    display_name?: string;
    profile_url?: string;
  };
}

export interface SocialMonitoringStats {
  total_accounts: number;
  active_accounts: number;
  total_activities: number;
  activities_with_location: number;
  activities_by_type: Record<SocialActivityType, number>;
  activities_by_platform: Record<SocialMediaPlatform, number>;
}

// =============================================================================
// ALERT TYPES
// =============================================================================

export const ALERTABLE_ACTIVITY_TYPES: SocialActivityType[] = [
  'post',
  'story',
  'location_tag',
  'live_video',
  'login',
];

export const HIGH_PRIORITY_ACTIVITIES: SocialActivityType[] = [
  'location_tag',
  'live_video',
];

// =============================================================================
// AGENT MONITORING TYPES
// =============================================================================

export interface CaseWithMonitoredAccounts {
  caseId: string;
  caseNumber: string;
  accounts: MonitoredAccountInfo[];
}

export interface MonitoredAccountInfo {
  id: string;
  platform: SocialMediaPlatform;
  username: string;
  profileUrl?: string;
  lastActivityAt?: string;
}

export interface ActivityResult {
  accountId: string;
  caseId: string;
  platform: SocialMediaPlatform;
  activities: SocialMediaActivityEvent[];
  checkedAt: string;
  error?: string;
}

// =============================================================================
// ALERT CONFIGURATION TYPES
// =============================================================================

export type SocialAlertPriority = 'low' | 'normal' | 'high' | 'critical';

export interface AlertConfig {
  activityType: SocialActivityType;
  priority: SocialAlertPriority;
  generateLead: boolean;
  notifyImmediately: boolean;
}

export const ACTIVITY_ALERT_CONFIG: Record<SocialActivityType, AlertConfig> = {
  post: {
    activityType: 'post',
    priority: 'normal',
    generateLead: true,
    notifyImmediately: false,
  },
  story: {
    activityType: 'story',
    priority: 'normal',
    generateLead: true,
    notifyImmediately: false,
  },
  comment: {
    activityType: 'comment',
    priority: 'low',
    generateLead: false,
    notifyImmediately: false,
  },
  like: {
    activityType: 'like',
    priority: 'low',
    generateLead: false,
    notifyImmediately: false,
  },
  share: {
    activityType: 'share',
    priority: 'low',
    generateLead: false,
    notifyImmediately: false,
  },
  login: {
    activityType: 'login',
    priority: 'high',
    generateLead: true,
    notifyImmediately: true,
  },
  location_tag: {
    activityType: 'location_tag',
    priority: 'critical',
    generateLead: true,
    notifyImmediately: true,
  },
  profile_update: {
    activityType: 'profile_update',
    priority: 'normal',
    generateLead: true,
    notifyImmediately: false,
  },
  friend_added: {
    activityType: 'friend_added',
    priority: 'low',
    generateLead: false,
    notifyImmediately: false,
  },
  group_joined: {
    activityType: 'group_joined',
    priority: 'low',
    generateLead: false,
    notifyImmediately: false,
  },
  event_rsvp: {
    activityType: 'event_rsvp',
    priority: 'normal',
    generateLead: true,
    notifyImmediately: false,
  },
  live_video: {
    activityType: 'live_video',
    priority: 'critical',
    generateLead: true,
    notifyImmediately: true,
  },
  reel: {
    activityType: 'reel',
    priority: 'normal',
    generateLead: true,
    notifyImmediately: false,
  },
  other: {
    activityType: 'other',
    priority: 'low',
    generateLead: false,
    notifyImmediately: false,
  },
};

// =============================================================================
// LEAD GENERATION TYPES
// =============================================================================

export interface SocialMediaLeadData {
  caseId: string;
  accountId: string;
  activityEventId: string;
  platform: SocialMediaPlatform;
  activityType: SocialActivityType;
  contentPreview?: string;
  contentUrl?: string;
  location?: {
    name?: string;
    latitude?: number;
    longitude?: number;
  };
  priority: SocialAlertPriority;
}

// =============================================================================
// NOTIFICATION TYPES
// =============================================================================

export interface SocialMediaAlertPayload {
  caseId: string;
  caseNumber: string;
  accountId: string;
  username: string;
  platform: SocialMediaPlatform;
  activityType: SocialActivityType;
  activityTimestamp: string;
  contentPreview?: string;
  contentUrl?: string;
  location?: {
    name?: string;
    latitude?: number;
    longitude?: number;
  };
  priority: SocialAlertPriority;
}
