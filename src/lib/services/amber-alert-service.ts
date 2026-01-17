// AMBER Alert Service
// LC-FEAT-026: AMBER Alert Integration
// Business logic for AMBER alert creation, validation, and management

import type {
  AmberAlertRequest,
  CreateAmberAlertRequest,
  AmberAlertCriteriaCheck,
  AmberAlertStatus,
  DistributionChannel,
  UpdateAlertStatusRequest,
  ActivateAlertRequest,
} from "@/types/amber-alert.types";

/**
 * AMBER Alert criteria validation rules
 * Based on official AMBER Alert program requirements
 */
export const AMBER_CRITERIA = {
  MAX_CHILD_AGE: 17,
  MIN_DESCRIPTION_LENGTH: 20,
  MIN_CIRCUMSTANCES_LENGTH: 50,
  DEFAULT_TARGET_RADIUS_KM: 100,
  MAX_TARGET_RADIUS_KM: 500,
  DEFAULT_EXPIRATION_HOURS: 24,
} as const;

/**
 * Validate if a case meets AMBER Alert criteria
 */
export function validateAmberCriteria(caseData: {
  age_at_disappearance?: number;
  suspected_abduction: boolean;
  first_name?: string;
  last_name?: string;
  last_seen_date?: string;
  primary_photo_url?: string;
}): AmberAlertCriteriaCheck {
  const childUnder18 =
    caseData.age_at_disappearance !== undefined &&
    caseData.age_at_disappearance <= AMBER_CRITERIA.MAX_CHILD_AGE;

  const abductionConfirmed = caseData.suspected_abduction === true;

  const sufficientInfo =
    !!caseData.first_name &&
    !!caseData.last_name &&
    caseData.first_name.length > 0 &&
    caseData.last_name.length > 0;

  const recentAbduction = !!caseData.last_seen_date;

  const meetsCriteria =
    childUnder18 && abductionConfirmed && sufficientInfo && recentAbduction;

  return {
    meets_criteria: meetsCriteria,
    criteria_breakdown: {
      child_under_18: childUnder18,
      abduction_confirmed: abductionConfirmed,
      sufficient_info: sufficientInfo,
      recent_abduction: recentAbduction,
    },
    case_details: {
      child_age: caseData.age_at_disappearance,
      suspected_abduction: caseData.suspected_abduction,
      last_seen: caseData.last_seen_date,
      has_photo: !!caseData.primary_photo_url,
    },
  };
}

/**
 * Validate AMBER alert request data
 */
export function validateAlertRequest(
  request: Partial<CreateAmberAlertRequest>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Child information validation
  if (!request.child_first_name?.trim()) {
    errors.push("Child's first name is required");
  }
  if (!request.child_last_name?.trim()) {
    errors.push("Child's last name is required");
  }
  if (
    !request.child_age ||
    request.child_age < 0 ||
    request.child_age > AMBER_CRITERIA.MAX_CHILD_AGE
  ) {
    errors.push(
      `Child must be under ${AMBER_CRITERIA.MAX_CHILD_AGE + 1} years old`
    );
  }
  if (!request.child_date_of_birth) {
    errors.push("Child's date of birth is required");
  }
  if (!request.child_sex?.trim()) {
    errors.push("Child's sex is required");
  }
  if (
    !request.child_description ||
    request.child_description.length < AMBER_CRITERIA.MIN_DESCRIPTION_LENGTH
  ) {
    errors.push(
      `Child description must be at least ${AMBER_CRITERIA.MIN_DESCRIPTION_LENGTH} characters`
    );
  }

  // Abduction details validation
  if (!request.abduction_date) {
    errors.push("Abduction date is required");
  }
  if (!request.abduction_location?.trim()) {
    errors.push("Abduction location is required");
  }
  if (
    !request.abduction_circumstances ||
    request.abduction_circumstances.length <
      AMBER_CRITERIA.MIN_CIRCUMSTANCES_LENGTH
  ) {
    errors.push(
      `Abduction circumstances must be at least ${AMBER_CRITERIA.MIN_CIRCUMSTANCES_LENGTH} characters`
    );
  }

  // Law enforcement contact validation
  if (!request.le_contact_name?.trim()) {
    errors.push("Law enforcement contact name is required");
  }
  if (!request.le_contact_phone?.trim()) {
    errors.push("Law enforcement contact phone is required");
  }
  if (!request.le_contact_email?.trim()) {
    // Email is optional now, will be auto-generated if missing
  } else if (!isValidEmail(request.le_contact_email)) {
    errors.push("Law enforcement contact email is invalid");
  }

  // Distribution validation
  if (!request.geographic_scope || request.geographic_scope.length === 0) {
    errors.push("At least one province/territory must be selected");
  }
  if (
    !request.distribution_channels ||
    request.distribution_channels.length === 0
  ) {
    errors.push("At least one distribution channel must be selected");
  }

  // Requesting agency validation
  if (!request.requesting_agency?.trim()) {
    errors.push("Requesting agency is required");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate recommended distribution channels based on alert details
 */
export function recommendDistributionChannels(alertData: {
  child_age: number;
  geographic_scope: string[];
  has_vehicle_info: boolean;
  has_suspect_info: boolean;
}): DistributionChannel[] {
  const channels: DistributionChannel[] = [];

  // Always recommend core channels
  channels.push("wea"); // Wireless Emergency Alerts
  channels.push("eas"); // Emergency Alert System

  // Add AMBER Alert system channels
  if (alertData.geographic_scope.includes("QC")) {
    channels.push("amber_quebec");
  }
  channels.push("amber_canada");

  // Add highway signage if vehicle info available
  if (alertData.has_vehicle_info) {
    channels.push("highway_signage");
  }

  // Always add social media for maximum reach
  channels.push("social_media");

  // Add broadcast media for widespread alerts
  if (alertData.geographic_scope.length > 2) {
    channels.push("broadcast_media");
  }

  // Add mobile app
  channels.push("mobile_app");

  return channels;
}

/**
 * Calculate expiration time for an alert
 */
export function calculateExpirationTime(
  activatedAt: Date,
  customHours?: number
): Date {
  const hours = customHours || AMBER_CRITERIA.DEFAULT_EXPIRATION_HOURS;
  const expiresAt = new Date(activatedAt);
  expiresAt.setHours(expiresAt.getHours() + hours);
  return expiresAt;
}

/**
 * Determine if a user can approve AMBER alerts
 */
export function canApproveAlerts(userRole: string): boolean {
  return ["law_enforcement", "admin", "developer"].includes(userRole);
}

/**
 * Determine if a user can create AMBER alert requests
 */
export function canCreateAlertRequests(userRole: string): boolean {
  return ["law_enforcement", "admin", "developer"].includes(userRole);
}

/**
 * Determine if a user can activate AMBER alerts
 */
export function canActivateAlerts(userRole: string): boolean {
  return ["law_enforcement", "admin", "developer"].includes(userRole);
}

/**
 * Get alert status display information
 */
export function getAlertStatusInfo(status: AmberAlertStatus): {
  label: string;
  color: string;
  description: string;
} {
  const statusMap: Record<
    AmberAlertStatus,
    { label: string; color: string; description: string }
  > = {
    draft: {
      label: "Draft",
      color: "gray",
      description: "Alert request is being prepared",
    },
    pending_review: {
      label: "Pending Review",
      color: "yellow",
      description: "Awaiting law enforcement review",
    },
    approved: {
      label: "Approved",
      color: "green",
      description: "Approved and ready for activation",
    },
    rejected: {
      label: "Rejected",
      color: "red",
      description: "Request was rejected",
    },
    active: {
      label: "Active",
      color: "blue",
      description: "Alert is currently active",
    },
    expired: {
      label: "Expired",
      color: "orange",
      description: "Alert has expired",
    },
    cancelled: {
      label: "Cancelled",
      color: "red",
      description: "Alert was manually cancelled",
    },
    resolved: {
      label: "Resolved",
      color: "green",
      description: "Case resolved, alert deactivated",
    },
  };

  return statusMap[status] || statusMap.draft;
}

/**
 * Get distribution channel display name
 */
export function getChannelDisplayName(channel: DistributionChannel): string {
  const channelNames: Record<DistributionChannel, string> = {
    wea: "Wireless Emergency Alerts",
    eas: "Emergency Alert System",
    amber_canada: "AMBER Alert Canada",
    amber_quebec: "AMBER Alert Quebec",
    highway_signage: "Highway Digital Signs",
    social_media: "Social Media",
    broadcast_media: "TV & Radio Broadcast",
    mobile_app: "Mobile App Notifications",
  };

  return channelNames[channel] || channel;
}

/**
 * Validate status transition
 */
export function isValidStatusTransition(
  currentStatus: AmberAlertStatus,
  newStatus: AmberAlertStatus
): boolean {
  const validTransitions: Record<AmberAlertStatus, AmberAlertStatus[]> = {
    draft: ["pending_review"],
    pending_review: ["approved", "rejected", "draft"],
    approved: ["active", "rejected"],
    rejected: ["draft", "pending_review"],
    active: ["expired", "cancelled", "resolved"],
    expired: [],
    cancelled: [],
    resolved: [],
  };

  return validTransitions[currentStatus]?.includes(newStatus) || false;
}

/**
 * Format alert for distribution
 */
export function formatAlertForDistribution(
  alert: AmberAlertRequest
): {
  title: string;
  body: string;
  urgency: string;
} {
  const childName = `${alert.child_first_name} ${alert.child_last_name}`;
  const age = alert.child_age;

  let body = `AMBER ALERT: ${childName}, age ${age}, was abducted from ${alert.abduction_location}. `;

  // Add physical description
  if (alert.child_description) {
    body += `Description: ${alert.child_description}. `;
  }

  // Add suspect info if available
  if (alert.suspect_name || alert.suspect_description) {
    body += `Suspect: ${alert.suspect_name || "Unknown"}`;
    if (alert.suspect_description) {
      body += ` - ${alert.suspect_description}`;
    }
    body += ". ";
  }

  // Add vehicle info if available
  if (alert.vehicle_make && alert.vehicle_model) {
    body += `Vehicle: ${alert.vehicle_year || ""} ${alert.vehicle_make} ${alert.vehicle_model}`;
    if (alert.vehicle_color) {
      body += ` (${alert.vehicle_color})`;
    }
    if (alert.vehicle_license_plate) {
      body += ` - License: ${alert.vehicle_license_plate}`;
    }
    body += ". ";
  }

  // Add contact info
  body += `Contact: ${alert.le_contact_phone}`;

  return {
    title: `AMBER ALERT - ${childName}`,
    body: body.trim(),
    urgency: "critical",
  };
}

/**
 * Simple email validation
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Generate a unique alert ID for external systems
 */
export function generateAlertId(
  caseNumber: string,
  province: string
): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const provinceCode = province.substring(0, 2).toUpperCase();
  const caseRef = caseNumber.replace(/[^A-Z0-9]/gi, "").substring(0, 8);
  return `AMBER-${provinceCode}-${caseRef}-${timestamp}`;
}

/**
 * Parse alert criteria from case data
 */
export function extractCriteriaFromCase(caseData: {
  age_at_disappearance?: number;
  suspected_abduction: boolean;
  suspected_foul_play?: boolean;
  is_minor?: boolean;
  first_name?: string;
  last_name?: string;
  last_seen_date?: string;
}): {
  criteria_child_under_18: boolean;
  criteria_abduction_confirmed: boolean;
  criteria_imminent_danger: boolean;
  criteria_sufficient_info: boolean;
  meets_amber_criteria: boolean;
} {
  const criteria_child_under_18 =
    caseData.age_at_disappearance !== undefined &&
    caseData.age_at_disappearance <= AMBER_CRITERIA.MAX_CHILD_AGE;

  const criteria_abduction_confirmed = caseData.suspected_abduction === true;

  const criteria_imminent_danger =
    caseData.suspected_abduction === true ||
    caseData.suspected_foul_play === true;

  const criteria_sufficient_info =
    !!caseData.first_name &&
    !!caseData.last_name &&
    !!caseData.last_seen_date;

  const meets_amber_criteria =
    criteria_child_under_18 &&
    criteria_abduction_confirmed &&
    criteria_imminent_danger &&
    criteria_sufficient_info;

  return {
    criteria_child_under_18,
    criteria_abduction_confirmed,
    criteria_imminent_danger,
    criteria_sufficient_info,
    meets_amber_criteria,
  };
}
