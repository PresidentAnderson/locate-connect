// AMBER Alert Integration Types
// LC-FEAT-026: AMBER Alert Integration

/**
 * AMBER Alert request status lifecycle
 */
export type AmberAlertStatus = 
  | 'draft'              // Initial creation, not submitted
  | 'pending_review'     // Submitted for law enforcement review
  | 'approved'           // Approved, ready for activation
  | 'rejected'           // Rejected by reviewing officer
  | 'active'             // Currently active and distributed
  | 'expired'            // Automatically expired after time limit
  | 'cancelled'          // Manually cancelled by authorized user
  | 'resolved';          // Child found, case resolved

/**
 * Distribution channels for AMBER alerts
 */
export type DistributionChannel = 
  | 'wea'               // Wireless Emergency Alerts (mobile phones)
  | 'eas'               // Emergency Alert System (TV/Radio)
  | 'amber_canada'      // AMBER Alert Canada system
  | 'amber_quebec'      // AMBER Alert Quebec system
  | 'highway_signage'   // Digital highway signs
  | 'social_media'      // Social media platforms
  | 'broadcast_media'   // TV and radio broadcast
  | 'mobile_app';       // Mobile application push

/**
 * Canadian provinces and territories for geographic targeting
 */
export type CanadianProvince =
  | 'AB' // Alberta
  | 'BC' // British Columbia
  | 'MB' // Manitoba
  | 'NB' // New Brunswick
  | 'NL' // Newfoundland and Labrador
  | 'NT' // Northwest Territories
  | 'NS' // Nova Scotia
  | 'NU' // Nunavut
  | 'ON' // Ontario
  | 'PE' // Prince Edward Island
  | 'QC' // Quebec
  | 'SK' // Saskatchewan
  | 'YT'; // Yukon

/**
 * AMBER alert criteria validation
 */
export interface AmberAlertCriteria {
  child_under_18: boolean;
  abduction_confirmed: boolean;
  imminent_danger: boolean;
  sufficient_info: boolean;
}

/**
 * Child information for AMBER alert
 */
export interface AmberAlertChildInfo {
  first_name: string;
  last_name: string;
  middle_name?: string;
  nickname?: string;
  age: number;
  date_of_birth: string;
  sex: string;
  race?: string;
  height_cm?: number;
  weight_kg?: number;
  eye_color?: string;
  hair_color?: string;
  description: string;
  photo_url?: string;
}

/**
 * Abduction details
 */
export interface AbductionDetails {
  date: string;
  location: string;
  latitude?: number;
  longitude?: number;
  circumstances: string;
  suspected_abductor_relationship?: string;
}

/**
 * Suspect information
 */
export interface SuspectInfo {
  name?: string;
  age?: number;
  description?: string;
  photo_url?: string;
}

/**
 * Vehicle information
 */
export interface VehicleInfo {
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  license_plate?: string;
  license_province?: string;
  description?: string;
}

/**
 * Law enforcement contact and verification
 */
export interface LawEnforcementVerification {
  verified: boolean;
  verified_by?: string;
  verified_at?: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  badge_number?: string;
  agency_case_number?: string;
}

/**
 * Geographic distribution settings
 */
export interface GeographicDistribution {
  scope: CanadianProvince[];
  target_radius_km: number;
}

/**
 * Complete AMBER alert request
 */
export interface AmberAlertRequest {
  id: string;
  case_id: string;
  
  // Request metadata
  requested_by: string;
  requesting_agency: string;
  status: AmberAlertStatus;
  
  // Child information
  child_first_name: string;
  child_last_name: string;
  child_middle_name?: string;
  child_nickname?: string;
  child_age: number;
  child_date_of_birth: string;
  child_sex: string;
  child_race?: string;
  child_height_cm?: number;
  child_weight_kg?: number;
  child_eye_color?: string;
  child_hair_color?: string;
  child_description: string;
  child_photo_url?: string;
  
  // Abduction details
  abduction_date: string;
  abduction_location: string;
  abduction_latitude?: number;
  abduction_longitude?: number;
  abduction_circumstances: string;
  suspected_abductor_relationship?: string;
  
  // Suspect information
  suspect_name?: string;
  suspect_age?: number;
  suspect_description?: string;
  suspect_photo_url?: string;
  
  // Vehicle information
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  vehicle_color?: string;
  vehicle_license_plate?: string;
  vehicle_license_province?: string;
  vehicle_description?: string;
  
  // Criteria validation
  meets_amber_criteria: boolean;
  criteria_child_under_18: boolean;
  criteria_abduction_confirmed: boolean;
  criteria_imminent_danger: boolean;
  criteria_sufficient_info: boolean;
  
  // Distribution
  geographic_scope: string[];
  target_radius_km: number;
  distribution_channels: DistributionChannel[];
  
  // Activation details
  alert_id?: string;
  activated_at?: string;
  activated_by?: string;
  expires_at?: string;
  
  // Deactivation details
  deactivated_at?: string;
  deactivated_by?: string;
  deactivation_reason?: string;
  
  // Law enforcement verification
  le_verified: boolean;
  le_verified_by?: string;
  le_verified_at?: string;
  le_contact_name: string;
  le_contact_phone: string;
  le_contact_email: string;
  le_badge_number?: string;
  le_agency_case_number?: string;
  
  // Approval workflow
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  rejection_reason?: string;
  
  // Tracking
  submission_count: number;
  last_submitted_at?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Simplified AMBER alert request for creation
 */
export interface CreateAmberAlertRequest {
  case_id: string;
  requesting_agency: string;
  
  // Child info (can be pre-populated from case)
  child_first_name: string;
  child_last_name: string;
  child_middle_name?: string;
  child_nickname?: string;
  child_age: number;
  child_date_of_birth: string;
  child_sex: string;
  child_race?: string;
  child_height_cm?: number;
  child_weight_kg?: number;
  child_eye_color?: string;
  child_hair_color?: string;
  child_description: string;
  child_photo_url?: string;
  
  // Abduction details
  abduction_date: string;
  abduction_location: string;
  abduction_latitude?: number;
  abduction_longitude?: number;
  abduction_circumstances: string;
  suspected_abductor_relationship?: string;
  
  // Suspect info
  suspect_name?: string;
  suspect_age?: number;
  suspect_description?: string;
  suspect_photo_url?: string;
  
  // Vehicle info
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  vehicle_color?: string;
  vehicle_license_plate?: string;
  vehicle_license_province?: string;
  vehicle_description?: string;
  
  // Distribution settings
  geographic_scope: CanadianProvince[];
  target_radius_km?: number;
  distribution_channels: DistributionChannel[];
  
  // Law enforcement contact
  le_contact_name: string;
  le_contact_phone: string;
  le_contact_email: string;
  le_badge_number?: string;
  le_agency_case_number?: string;
}

/**
 * AMBER alert status change history entry
 */
export interface AmberAlertStatusHistory {
  id: string;
  alert_request_id: string;
  status: AmberAlertStatus;
  changed_by: string;
  changed_at: string;
  notes?: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

/**
 * Distribution log entry for tracking alert dissemination
 */
export interface AmberAlertDistributionLog {
  id: string;
  alert_request_id: string;
  channel: DistributionChannel;
  distributed_at: string;
  status: 'success' | 'failed' | 'pending';
  external_reference_id?: string;
  response_data: Record<string, unknown>;
  error_message?: string;
  estimated_reach?: number;
  actual_reach?: number;
  created_at: string;
}

/**
 * Performance metrics for AMBER alerts
 */
export interface AmberAlertMetrics {
  id: string;
  alert_request_id: string;
  
  // Engagement
  views_count: number;
  shares_count: number;
  tips_received_count: number;
  
  // Geographic reach
  provinces_reached: string[];
  cities_reached: string[];
  
  // Time metrics
  time_to_approval_minutes?: number;
  time_to_activation_minutes?: number;
  total_active_duration_minutes?: number;
  
  // Outcome
  led_to_recovery: boolean;
  recovery_time_minutes?: number;
  
  // Timestamps
  recorded_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Active AMBER alert for nearby location query
 */
export interface NearbyAmberAlert {
  alert_id: string;
  case_id: string;
  child_name: string;
  child_age: number;
  child_description: string;
  abduction_location: string;
  distance_km?: number;
  activated_at: string;
  suspect_info: string;
  vehicle_info: string;
}

/**
 * AMBER alert criteria check result
 */
export interface AmberAlertCriteriaCheck {
  meets_criteria: boolean;
  criteria_breakdown: {
    child_under_18: boolean;
    abduction_confirmed: boolean;
    sufficient_info: boolean;
    recent_abduction: boolean;
  };
  case_details: {
    child_age?: number;
    suspected_abduction: boolean;
    last_seen?: string;
    has_photo: boolean;
  };
}

/**
 * Request payload for updating alert status
 */
export interface UpdateAlertStatusRequest {
  status: AmberAlertStatus;
  notes?: string;
  rejection_reason?: string;
  deactivation_reason?: string;
}

/**
 * Request payload for activating an alert
 */
export interface ActivateAlertRequest {
  alert_id?: string; // External system alert ID
  expires_at?: string; // Optional expiration timestamp
  distribution_channels?: DistributionChannel[];
}
