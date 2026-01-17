/**
 * Email Tracking Types
 * LC-M4-001
 */

// =============================================================================
// EMAIL TRACKING
// =============================================================================

export interface EmailTracking {
  id: string;
  case_id: string;
  recipient_email: string;
  subject?: string;
  sent_at: string;
  tracking_pixel_id: string;
  opened_at?: string;
  open_count: number;
  last_opened_ip?: string;
  last_opened_user_agent?: string;
  last_opened_location?: GeoLocation;
  created_at: string;
}

export interface GeoLocation {
  city?: string;
  region?: string;
  country?: string;
  country_code?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  isp?: string;
}

// =============================================================================
// API INPUT TYPES
// =============================================================================

export interface CreateEmailTrackingInput {
  case_id: string;
  recipient_email: string;
  subject?: string;
}

export interface EmailTrackingQueryParams {
  case_id?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface EmailTrackingResponse extends EmailTracking {
  tracking_pixel_url: string;
  tracking_pixel_html: string;
}

export interface EmailTrackingAnalytics {
  total_sent: number;
  total_opened: number;
  open_rate: number;
  records: EmailTracking[];
}

export interface TrackingPixelOpenEvent {
  pixel_id: string;
  opened_at: string;
  ip_address?: string;
  user_agent?: string;
  geo_location?: GeoLocation;
}
