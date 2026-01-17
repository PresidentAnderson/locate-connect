/**
 * Public API & Developer Portal Types
 * LC-FEAT-036
 */

// =============================================================================
// ENUMS
// =============================================================================

export type ApiAccessLevel = 'public' | 'partner' | 'law_enforcement';
export type ApiKeyStatus = 'active' | 'revoked' | 'expired' | 'suspended';
export type OAuthGrantType = 'authorization_code' | 'client_credentials' | 'refresh_token';
export type WebhookEventType =
  | 'case.created'
  | 'case.updated'
  | 'case.resolved'
  | 'case.status_changed'
  | 'lead.created'
  | 'lead.verified'
  | 'tip.received'
  | 'alert.amber_issued'
  | 'alert.silver_issued';
export type WebhookStatus = 'active' | 'inactive' | 'failed' | 'suspended';
export type SupportTicketStatus = 'open' | 'in_progress' | 'waiting_response' | 'resolved' | 'closed';
export type SupportTicketPriority = 'low' | 'medium' | 'high' | 'urgent';

// =============================================================================
// API APPLICATION
// =============================================================================

export interface ApiApplication {
  id: string;
  owner_id: string;
  name: string;
  description?: string;
  website_url?: string;
  callback_urls: string[];
  logo_url?: string;
  access_level: ApiAccessLevel;
  rate_limit_requests_per_minute: number;
  rate_limit_requests_per_day: number;
  quota_monthly: number;
  is_verified: boolean;
  verified_at?: string;
  verified_by?: string;
  verification_notes?: string;
  organization_name?: string;
  organization_type?: string;
  organization_contact_email?: string;
  organization_contact_phone?: string;
  terms_accepted_at?: string;
  terms_version?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateApiApplicationInput {
  name: string;
  description?: string;
  website_url?: string;
  callback_urls?: string[];
  organization_name?: string;
  organization_type?: string;
  organization_contact_email?: string;
  organization_contact_phone?: string;
}

export interface UpdateApiApplicationInput {
  name?: string;
  description?: string;
  website_url?: string;
  callback_urls?: string[];
  logo_url?: string;
  organization_name?: string;
  organization_type?: string;
  organization_contact_email?: string;
  organization_contact_phone?: string;
}

// =============================================================================
// API KEY
// =============================================================================

export interface ApiKey {
  id: string;
  application_id: string;
  key_prefix: string;
  name?: string;
  description?: string;
  status: ApiKeyStatus;
  access_level: ApiAccessLevel;
  scopes: string[];
  allowed_ip_addresses: string[];
  last_used_at?: string;
  last_used_ip?: string;
  usage_count: number;
  expires_at?: string;
  created_at: string;
  revoked_at?: string;
  revoked_by?: string;
  revoke_reason?: string;
}

export interface CreateApiKeyInput {
  application_id: string;
  name?: string;
  description?: string;
  scopes?: string[];
  allowed_ip_addresses?: string[];
  expires_at?: string;
}

export interface ApiKeyWithSecret extends ApiKey {
  key: string; // Full key, only returned on creation
}

// =============================================================================
// OAUTH
// =============================================================================

export interface OAuthClient {
  id: string;
  application_id: string;
  client_id: string;
  grant_types: OAuthGrantType[];
  redirect_uris: string[];
  scopes: string[];
  access_token_ttl_seconds: number;
  refresh_token_ttl_seconds: number;
  is_confidential: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateOAuthClientInput {
  application_id: string;
  redirect_uris: string[];
  scopes?: string[];
  grant_types?: OAuthGrantType[];
  access_token_ttl_seconds?: number;
  refresh_token_ttl_seconds?: number;
  is_confidential?: boolean;
}

export interface OAuthClientWithSecret extends OAuthClient {
  client_secret: string; // Only returned on creation
}

export interface OAuthAuthorizationRequest {
  client_id: string;
  redirect_uri: string;
  response_type: 'code';
  scope?: string;
  state?: string;
  code_challenge?: string;
  code_challenge_method?: 'S256' | 'plain';
}

export interface OAuthTokenRequest {
  grant_type: OAuthGrantType;
  client_id: string;
  client_secret?: string;
  code?: string;
  redirect_uri?: string;
  refresh_token?: string;
  code_verifier?: string;
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

export interface OAuthErrorResponse {
  error: string;
  error_description?: string;
  error_uri?: string;
}

// =============================================================================
// WEBHOOKS
// =============================================================================

export interface Webhook {
  id: string;
  application_id: string;
  name: string;
  description?: string;
  endpoint_url: string;
  events: WebhookEventType[];
  filter_jurisdictions: string[];
  filter_priority_levels: string[];
  filter_case_statuses: string[];
  status: WebhookStatus;
  max_retries: number;
  retry_delay_seconds: number;
  timeout_seconds: number;
  success_count: number;
  failure_count: number;
  last_triggered_at?: string;
  last_success_at?: string;
  last_failure_at?: string;
  last_failure_reason?: string;
  consecutive_failures: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateWebhookInput {
  application_id: string;
  name: string;
  description?: string;
  endpoint_url: string;
  events: WebhookEventType[];
  filter_jurisdictions?: string[];
  filter_priority_levels?: string[];
  filter_case_statuses?: string[];
  max_retries?: number;
  retry_delay_seconds?: number;
  timeout_seconds?: number;
}

export interface UpdateWebhookInput {
  name?: string;
  description?: string;
  endpoint_url?: string;
  events?: WebhookEventType[];
  filter_jurisdictions?: string[];
  filter_priority_levels?: string[];
  filter_case_statuses?: string[];
  max_retries?: number;
  retry_delay_seconds?: number;
  timeout_seconds?: number;
  is_active?: boolean;
}

export interface WebhookWithSecret extends Webhook {
  secret: string; // Only returned on creation
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event_type: WebhookEventType;
  payload: Record<string, unknown>;
  attempt_count: number;
  max_attempts: number;
  response_status_code?: number;
  response_body?: string;
  response_headers?: Record<string, string>;
  response_time_ms?: number;
  scheduled_at: string;
  delivered_at?: string;
  next_retry_at?: string;
  is_successful: boolean;
  error_message?: string;
  created_at: string;
}

export interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  webhook_id: string;
  data: Record<string, unknown>;
}

// =============================================================================
// RATE LIMITING
// =============================================================================

export interface RateLimitInfo {
  is_allowed: boolean;
  minute_remaining: number;
  day_remaining: number;
  month_remaining: number;
  retry_after_seconds: number;
}

export interface ApiUsageLog {
  id: string;
  api_key_id?: string;
  oauth_token_id?: string;
  application_id?: string;
  endpoint: string;
  method: string;
  path: string;
  query_params?: Record<string, unknown>;
  status_code: number;
  response_time_ms?: number;
  response_size_bytes?: number;
  ip_address?: string;
  user_agent?: string;
  rate_limit_remaining?: number;
  quota_remaining?: number;
  error_code?: string;
  error_message?: string;
  created_at: string;
}

export interface UsageStatistics {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  average_response_time_ms: number;
  requests_by_endpoint: Record<string, number>;
  requests_by_status: Record<number, number>;
  requests_by_day: { date: string; count: number }[];
}

// =============================================================================
// SUPPORT TICKETS
// =============================================================================

export interface SupportTicket {
  id: string;
  application_id?: string;
  submitter_id: string;
  ticket_number: string;
  subject: string;
  description: string;
  category: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  assigned_to?: string;
  resolution?: string;
  resolved_at?: string;
  resolved_by?: string;
  satisfaction_rating?: number;
  feedback?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSupportTicketInput {
  application_id?: string;
  subject: string;
  description: string;
  category: string;
  priority?: SupportTicketPriority;
}

export interface UpdateSupportTicketInput {
  status?: SupportTicketStatus;
  priority?: SupportTicketPriority;
  assigned_to?: string;
  resolution?: string;
}

export interface SupportTicketMessage {
  id: string;
  ticket_id: string;
  author_id: string;
  content: string;
  is_internal: boolean;
  attachments: { name: string; url: string; type: string }[];
  created_at: string;
}

export interface CreateSupportTicketMessageInput {
  ticket_id: string;
  content: string;
  is_internal?: boolean;
  attachments?: { name: string; url: string; type: string }[];
}

// =============================================================================
// API DOCUMENTATION
// =============================================================================

export interface ApiDocumentationVersion {
  id: string;
  version: string;
  title: string;
  description?: string;
  openapi_spec: Record<string, unknown>;
  is_current: boolean;
  is_deprecated: boolean;
  deprecation_notice?: string;
  sunset_date?: string;
  published_at?: string;
  published_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CodeExample {
  id: string;
  title: string;
  description?: string;
  language: string;
  category: string;
  code: string;
  endpoint?: string;
  method?: string;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// PUBLIC API RESPONSES
// =============================================================================

export interface PublicCase {
  id: string;
  case_number: string;
  first_name: string;
  last_name: string;
  age_at_disappearance?: number;
  gender?: string;
  last_seen_date: string;
  last_seen_city?: string;
  last_seen_province?: string;
  status: string;
  priority_level: string;
  is_amber_alert: boolean;
  primary_photo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface PublicCaseDetail extends PublicCase {
  height_cm?: number;
  weight_kg?: number;
  eye_color?: string;
  hair_color?: string;
  distinguishing_features?: string;
  clothing_last_seen?: string;
  circumstances?: string;
  jurisdiction_name?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    total?: number;
    page?: number;
    page_size?: number;
    rate_limit?: {
      limit: number;
      remaining: number;
      reset: number;
    };
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    rate_limit?: {
      limit: number;
      remaining: number;
      reset: number;
    };
  };
}

// =============================================================================
// API SCOPES
// =============================================================================

export const API_SCOPES = {
  // Case scopes
  'cases:read': 'Read public case information',
  'cases:read:detailed': 'Read detailed case information (partner/LE only)',
  'cases:write': 'Create and update cases (LE only)',

  // Lead scopes
  'leads:read': 'Read leads (partner/LE only)',
  'leads:write': 'Create and update leads (LE only)',

  // Tip scopes
  'tips:write': 'Submit tips',
  'tips:read': 'Read tips (LE only)',

  // Webhook scopes
  'webhooks:manage': 'Manage webhooks',

  // Statistics scopes
  'statistics:read': 'Read anonymized statistics',
  'statistics:read:detailed': 'Read detailed statistics (partner/LE only)',

  // Alert scopes
  'alerts:read': 'Read active alerts',
  'alerts:subscribe': 'Subscribe to alert notifications',
} as const;

export type ApiScope = keyof typeof API_SCOPES;

// =============================================================================
// ACCESS LEVEL PERMISSIONS
// =============================================================================

export const ACCESS_LEVEL_SCOPES: Record<ApiAccessLevel, ApiScope[]> = {
  public: [
    'cases:read',
    'tips:write',
    'statistics:read',
    'alerts:read',
    'alerts:subscribe',
    'webhooks:manage',
  ],
  partner: [
    'cases:read',
    'cases:read:detailed',
    'leads:read',
    'tips:write',
    'statistics:read',
    'statistics:read:detailed',
    'alerts:read',
    'alerts:subscribe',
    'webhooks:manage',
  ],
  law_enforcement: [
    'cases:read',
    'cases:read:detailed',
    'cases:write',
    'leads:read',
    'leads:write',
    'tips:write',
    'tips:read',
    'statistics:read',
    'statistics:read:detailed',
    'alerts:read',
    'alerts:subscribe',
    'webhooks:manage',
  ],
};
