/**
 * AMBER Alert Distribution Types
 * LC-FEAT-026: AMBER Alert Integration
 */

// =============================================================================
// Enums
// =============================================================================

export type AmberDistributionChannel =
  | 'wea'
  | 'eas'
  | 'highway_signs'
  | 'social_media'
  | 'partner_alert'
  | 'media_outlet'
  | 'email'
  | 'sms'
  | 'push_notification'
  | 'api_webhook';

export type AmberDistributionStatus =
  | 'pending'
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'cancelled'
  | 'expired';

export type AmberAlertStatus = 'active' | 'cancelled' | 'resolved';

export type SocialPlatform =
  | 'twitter'
  | 'facebook'
  | 'instagram'
  | 'linkedin'
  | 'tiktok';

// =============================================================================
// AMBER Alert Record
// =============================================================================

export interface AmberAlert {
  id: string;
  case_id: string;
  alert_number: string;
  alert_status: AmberAlertStatus;

  // Child Information
  child_name: string;
  child_age?: number;
  child_gender?: string;
  child_description?: string;
  child_photo_url?: string;

  // Abduction Details
  abduction_date: string;
  abduction_time?: string;
  abduction_location: string;
  abduction_city: string;
  abduction_province: string;
  abduction_circumstances?: string;

  // Suspect Information
  suspect_name?: string;
  suspect_description?: string;
  suspect_photo_url?: string;
  suspect_relationship?: string;

  // Vehicle Information
  vehicle_involved: boolean;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  vehicle_color?: string;
  vehicle_license_plate?: string;
  vehicle_license_province?: string;

  // Geographic Distribution
  target_provinces: string[];
  target_radius_km?: number;

  // Distribution
  distribution_channels: AmberDistributionChannel[];

  // Requesting Officer
  requesting_officer_id?: string;
  requesting_officer_name: string;
  requesting_officer_badge?: string;
  requesting_officer_phone: string;
  requesting_officer_agency: string;

  // Timestamps
  issued_at: string;
  expires_at?: string;
  cancelled_at?: string;
  cancelled_by?: string;
  cancelled_reason?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;

  // Relations
  case?: {
    id: string;
    case_number: string;
    first_name: string;
    last_name: string;
    status: string;
  };
  distributions?: AmberDistribution[];
}

export interface AmberAlertInsert {
  case_id: string;

  // Child Information
  child_name: string;
  child_age?: number;
  child_gender?: string;
  child_description?: string;
  child_photo_url?: string;

  // Abduction Details
  abduction_date: string;
  abduction_time?: string;
  abduction_location: string;
  abduction_city: string;
  abduction_province: string;
  abduction_circumstances?: string;

  // Suspect Information
  suspect_name?: string;
  suspect_description?: string;
  suspect_photo_url?: string;
  suspect_relationship?: string;

  // Vehicle Information
  vehicle_involved?: boolean;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  vehicle_color?: string;
  vehicle_license_plate?: string;
  vehicle_license_province?: string;

  // Geographic Distribution
  target_provinces?: string[];
  target_radius_km?: number;

  // Distribution
  distribution_channels: AmberDistributionChannel[];

  // Requesting Officer
  requesting_officer_name: string;
  requesting_officer_badge?: string;
  requesting_officer_phone: string;
  requesting_officer_agency: string;

  // Optional
  expires_at?: string;
}

// =============================================================================
// Distribution Record
// =============================================================================

export interface AmberDistribution {
  id: string;
  amber_alert_id: string;
  channel: AmberDistributionChannel;
  channel_config: Record<string, unknown>;

  // Target
  target_id?: string;
  target_name?: string;
  target_contact?: string;

  // Status
  status: AmberDistributionStatus;
  status_message?: string;

  // Delivery
  queued_at?: string;
  sent_at?: string;
  delivered_at?: string;
  failed_at?: string;
  retry_count: number;
  max_retries: number;
  next_retry_at?: string;

  // Response
  external_id?: string;
  external_response?: Record<string, unknown>;
  delivery_confirmation?: Record<string, unknown>;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface AmberDistributionInsert {
  amber_alert_id: string;
  channel: AmberDistributionChannel;
  channel_config?: Record<string, unknown>;
  target_id?: string;
  target_name?: string;
  target_contact?: string;
  max_retries?: number;
}

// =============================================================================
// Distribution Log
// =============================================================================

export interface AmberDistributionLog {
  id: string;
  amber_alert_id: string;
  distribution_id?: string;
  event_type: string;
  channel?: AmberDistributionChannel;
  target_name?: string;
  old_status?: AmberDistributionStatus;
  new_status?: AmberDistributionStatus;
  message?: string;
  metadata: Record<string, unknown>;
  actor_id?: string;
  actor_type?: string;
  created_at: string;
}

// =============================================================================
// Media Contact
// =============================================================================

export interface MediaContact {
  id: string;
  organization_name: string;
  organization_type: string;
  coverage_area: string[];
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  api_endpoint?: string;
  api_key_id?: string;
  preferred_channels: string[];
  accepts_amber_alerts: boolean;
  accepts_silver_alerts: boolean;
  is_active: boolean;
  is_verified: boolean;
  verified_at?: string;
  notes?: string;
  last_contacted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MediaContactInsert {
  organization_name: string;
  organization_type: string;
  coverage_area?: string[];
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  api_endpoint?: string;
  preferred_channels?: string[];
  accepts_amber_alerts?: boolean;
  accepts_silver_alerts?: boolean;
  notes?: string;
}

// =============================================================================
// Social Media Account
// =============================================================================

export interface SocialMediaAccount {
  id: string;
  platform: SocialPlatform;
  account_name: string;
  account_id?: string;
  credential_id?: string;
  auto_post_amber: boolean;
  auto_post_silver: boolean;
  post_template?: string;
  hashtags: string[];
  is_active: boolean;
  is_connected: boolean;
  last_post_at?: string;
  last_error?: string;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Channel Configuration
// =============================================================================

export interface DistributionChannelConfig {
  id: string;
  channel: AmberDistributionChannel;
  is_enabled: boolean;
  requires_approval: boolean;
  rate_limit_per_minute: number;
  rate_limit_per_hour: number;
  rate_limit_per_day: number;
  max_retries: number;
  retry_delay_seconds: number;
  retry_backoff_multiplier: number;
  integration_id?: string;
  credential_id?: string;
  endpoint_url?: string;
  endpoint_config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Distribution Summary
// =============================================================================

export interface AmberDistributionSummary {
  total: number;
  pending: number;
  queued: number;
  sending: number;
  sent: number;
  delivered: number;
  failed: number;
  by_channel: Record<AmberDistributionChannel, number>;
}

// =============================================================================
// API Request/Response Types
// =============================================================================

export interface AmberAlertListResponse {
  data: AmberAlert[];
  total: number;
  page: number;
  page_size: number;
}

export interface AmberAlertListFilters {
  status?: AmberAlertStatus;
  province?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}

export interface DistributeAmberAlertRequest {
  amber_alert_id: string;
  channels?: AmberDistributionChannel[];
  target_provinces?: string[];
  partner_ids?: string[];
  media_ids?: string[];
}

export interface DistributeAmberAlertResponse {
  success: boolean;
  amber_alert_id: string;
  distributions_created: number;
  summary: AmberDistributionSummary;
}

export interface CancelAmberAlertRequest {
  reason: string;
}

// =============================================================================
// UI Display Helpers
// =============================================================================

export const AMBER_DISTRIBUTION_CHANNEL_LABELS: Record<AmberDistributionChannel, string> = {
  wea: 'Wireless Emergency Alert (WEA)',
  eas: 'Emergency Alert System (EAS)',
  highway_signs: 'Highway Digital Signage',
  social_media: 'Social Media',
  partner_alert: 'Partner Organizations',
  media_outlet: 'Media Outlets',
  email: 'Email Distribution',
  sms: 'SMS Text Messages',
  push_notification: 'Push Notifications',
  api_webhook: 'API Webhooks',
};

export const AMBER_DISTRIBUTION_STATUS_LABELS: Record<AmberDistributionStatus, string> = {
  pending: 'Pending',
  queued: 'Queued',
  sending: 'Sending',
  sent: 'Sent',
  delivered: 'Delivered',
  failed: 'Failed',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

export const AMBER_ALERT_STATUS_LABELS: Record<AmberAlertStatus, string> = {
  active: 'Active',
  cancelled: 'Cancelled',
  resolved: 'Resolved',
};

export const SOCIAL_PLATFORM_LABELS: Record<SocialPlatform, string> = {
  twitter: 'Twitter/X',
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
};

export const MEDIA_ORGANIZATION_TYPES = [
  'tv_station',
  'radio_station',
  'newspaper',
  'online_news',
  'wire_service',
] as const;

export const MEDIA_ORGANIZATION_TYPE_LABELS: Record<string, string> = {
  tv_station: 'TV Station',
  radio_station: 'Radio Station',
  newspaper: 'Newspaper',
  online_news: 'Online News',
  wire_service: 'Wire Service',
};
