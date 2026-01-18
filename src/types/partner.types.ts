/**
 * Partner Organizations Types
 * LC-FEAT-024: Partner Organization Portal
 */

// =============================================================================
// Enums
// =============================================================================

export type PartnerOrgType =
  | 'shelter'
  | 'hospital'
  | 'transit'
  | 'school'
  | 'business'
  | 'nonprofit'
  | 'government'
  | 'other';

export type PartnerStatus = 'active' | 'pending' | 'inactive' | 'suspended';

export type PartnerAccessLevel =
  | 'view_only'
  | 'submit_tips'
  | 'case_updates'
  | 'full_access';

export type PartnerActivityType =
  | 'tip_submitted'
  | 'case_viewed'
  | 'resource_shared'
  | 'alert_acknowledged'
  | 'login'
  | 'api_access'
  | 'data_export';

export type PartnerMemberRole = 'admin' | 'member' | 'viewer';

export type PartnerAlertType =
  | 'amber_alert'
  | 'silver_alert'
  | 'general_alert'
  | 'bulletin';

export type PartnerAlertPriority = 'low' | 'normal' | 'high' | 'critical';

export type PartnerCaseAccessLevel = 'view' | 'contribute' | 'full';

// =============================================================================
// Partner Organization
// =============================================================================

export interface PartnerOrganization {
  id: string;
  name: string;
  type: PartnerOrgType;
  status: PartnerStatus;
  description?: string;
  logo_url?: string;

  // Contact
  contact_name: string;
  contact_email: string;
  contact_phone?: string;

  // Address
  address: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country: string;

  // Online
  website?: string;

  // Access Control
  access_level: PartnerAccessLevel;
  allowed_provinces: string[];
  allowed_case_types: string[];
  can_submit_tips: boolean;
  can_view_updates: boolean;
  can_access_api: boolean;

  // Metrics
  tips_submitted_count: number;
  cases_assisted_count: number;

  // API
  api_key_prefix?: string;
  api_rate_limit: number;

  // Verification
  verification_document_url?: string;
  verified_at?: string;
  verified_by?: string;

  // Onboarding
  onboarding_completed: boolean;
  agreement_signed_at?: string;
  agreement_version?: string;

  // Timestamps
  last_activity_at?: string;
  joined_at: string;
  created_at: string;
  updated_at: string;
}

export interface PartnerOrganizationInsert {
  name: string;
  type: PartnerOrgType;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  address: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country?: string;
  website?: string;
  description?: string;
  access_level?: PartnerAccessLevel;
}

export interface PartnerOrganizationUpdate {
  name?: string;
  type?: PartnerOrgType;
  status?: PartnerStatus;
  description?: string;
  logo_url?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  website?: string;
  access_level?: PartnerAccessLevel;
  allowed_provinces?: string[];
  allowed_case_types?: string[];
  can_submit_tips?: boolean;
  can_view_updates?: boolean;
  can_access_api?: boolean;
  api_rate_limit?: number;
  onboarding_completed?: boolean;
}

// =============================================================================
// Partner Member
// =============================================================================

export interface PartnerMember {
  id: string;
  partner_id: string;
  user_id?: string;
  email: string;
  name?: string;
  role: PartnerMemberRole;

  // Permissions
  can_submit_tips: boolean;
  can_view_cases: boolean;
  can_manage_members: boolean;
  can_access_api: boolean;

  // Status
  is_active: boolean;
  invited_at: string;
  accepted_at?: string;
  last_login_at?: string;

  // Timestamps
  created_at: string;
  updated_at: string;

  // Relations
  partner?: PartnerOrganization;
}

export interface PartnerMemberInsert {
  partner_id: string;
  email: string;
  name?: string;
  role?: PartnerMemberRole;
  can_submit_tips?: boolean;
  can_view_cases?: boolean;
  can_manage_members?: boolean;
  can_access_api?: boolean;
}

export interface PartnerMemberUpdate {
  name?: string;
  role?: PartnerMemberRole;
  can_submit_tips?: boolean;
  can_view_cases?: boolean;
  can_manage_members?: boolean;
  can_access_api?: boolean;
  is_active?: boolean;
}

// =============================================================================
// Partner Activity
// =============================================================================

export interface PartnerActivity {
  id: string;
  partner_id: string;
  member_id?: string;
  user_id?: string;
  activity_type: PartnerActivityType;
  description: string;
  case_id?: string;
  tip_id?: string;
  ip_address?: string;
  user_agent?: string;
  metadata: Record<string, unknown>;
  created_at: string;

  // Relations
  partner?: PartnerOrganization;
  member?: PartnerMember;
  case?: {
    id: string;
    case_number: string;
    first_name: string;
    last_name: string;
  };
}

export interface PartnerActivityInsert {
  partner_id: string;
  member_id?: string;
  activity_type: PartnerActivityType;
  description: string;
  case_id?: string;
  tip_id?: string;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Partner Case Access
// =============================================================================

export interface PartnerCaseAccess {
  id: string;
  partner_id: string;
  case_id: string;
  granted_by?: string;
  access_reason?: string;
  access_level: PartnerCaseAccessLevel;
  granted_at: string;
  expires_at?: string;
  revoked_at?: string;
  revoked_by?: string;
  is_active: boolean;
  notify_on_updates: boolean;

  // Relations
  case?: {
    id: string;
    case_number: string;
    first_name: string;
    last_name: string;
    status: string;
    primary_photo_url?: string;
  };
}

export interface PartnerCaseAccessGrant {
  partner_id: string;
  case_id: string;
  access_reason?: string;
  access_level?: PartnerCaseAccessLevel;
  expires_at?: string;
  notify_on_updates?: boolean;
}

// =============================================================================
// Partner Alert
// =============================================================================

export interface PartnerAlert {
  id: string;
  partner_id: string;
  case_id?: string;
  alert_type: PartnerAlertType;
  title: string;
  message: string;
  priority: PartnerAlertPriority;
  sent_at: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
  delivery_method: string;
  delivery_status: string;
  created_at: string;

  // Relations
  case?: {
    id: string;
    case_number: string;
    first_name: string;
    last_name: string;
    primary_photo_url?: string;
  };
}

export interface PartnerAlertCreate {
  partner_ids: string[];
  case_id?: string;
  alert_type: PartnerAlertType;
  title: string;
  message: string;
  priority?: PartnerAlertPriority;
  delivery_method?: string;
}

// =============================================================================
// Partner API Key
// =============================================================================

export interface PartnerApiKey {
  id: string;
  partner_id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  allowed_ips?: string[];
  rate_limit_per_minute: number;
  rate_limit_per_day: number;
  is_active: boolean;
  last_used_at?: string;
  usage_count: number;
  expires_at?: string;
  created_at: string;
  created_by?: string;
  revoked_at?: string;
  revoked_by?: string;
}

export interface PartnerApiKeyCreate {
  partner_id: string;
  name: string;
  scopes?: string[];
  allowed_ips?: string[];
  rate_limit_per_minute?: number;
  rate_limit_per_day?: number;
  expires_at?: string;
}

// Response with the actual key (only returned on create)
export interface PartnerApiKeyWithSecret extends PartnerApiKey {
  api_key: string; // Full API key, only returned once on creation
}

// =============================================================================
// Partner Dashboard
// =============================================================================

export interface PartnerDashboardStats {
  total_tips: number;
  cases_assisted: number;
  active_members: number;
  unread_alerts: number;
  recent_activity: {
    activity_type: PartnerActivityType;
    description: string;
    created_at: string;
  }[];
}

// =============================================================================
// API Request/Response Types
// =============================================================================

export interface PartnerListResponse {
  data: PartnerOrganization[];
  total: number;
  page: number;
  page_size: number;
}

export interface PartnerListFilters {
  search?: string;
  type?: PartnerOrgType;
  status?: PartnerStatus;
  access_level?: PartnerAccessLevel;
  province?: string;
  page?: number;
  page_size?: number;
}

export interface PartnerActivityListResponse {
  data: PartnerActivity[];
  total: number;
  page: number;
  page_size: number;
}

export interface PartnerActivityFilters {
  partner_id?: string;
  activity_type?: PartnerActivityType;
  case_id?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}

// =============================================================================
// UI Display Helpers
// =============================================================================

export const PARTNER_TYPE_LABELS: Record<PartnerOrgType, string> = {
  shelter: 'Shelter',
  hospital: 'Hospital/Healthcare',
  transit: 'Transit Authority',
  school: 'School/University',
  business: 'Business',
  nonprofit: 'Non-Profit',
  government: 'Government Agency',
  other: 'Other',
};

export const PARTNER_STATUS_LABELS: Record<PartnerStatus, string> = {
  active: 'Active',
  pending: 'Pending Approval',
  inactive: 'Inactive',
  suspended: 'Suspended',
};

export const PARTNER_ACCESS_LEVEL_LABELS: Record<PartnerAccessLevel, string> = {
  view_only: 'View Only',
  submit_tips: 'Submit Tips',
  case_updates: 'Case Updates',
  full_access: 'Full Access',
};

export const PARTNER_ACTIVITY_TYPE_LABELS: Record<PartnerActivityType, string> = {
  tip_submitted: 'Tip Submitted',
  case_viewed: 'Case Viewed',
  resource_shared: 'Resource Shared',
  alert_acknowledged: 'Alert Acknowledged',
  login: 'Login',
  api_access: 'API Access',
  data_export: 'Data Export',
};

export const PARTNER_ALERT_TYPE_LABELS: Record<PartnerAlertType, string> = {
  amber_alert: 'AMBER Alert',
  silver_alert: 'Silver Alert',
  general_alert: 'General Alert',
  bulletin: 'Bulletin',
};

export const PARTNER_ALERT_PRIORITY_LABELS: Record<PartnerAlertPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  critical: 'Critical',
};
