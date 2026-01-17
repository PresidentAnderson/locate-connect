/**
 * Jurisdiction Profile Service
 * Handles validation, management, and retrieval of jurisdiction profiles
 */

import type { JurisdictionProfile } from "@/types";
import { QC_SPVM_V1, GENERIC_PROFILE } from "@/types";
import jurisdictionSchema from "@/lib/schemas/jurisdiction-profile.schema.json";

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Simple JSON Schema validator
 * Validates a jurisdiction profile against the schema
 */
export function validateJurisdictionProfile(
  profile: unknown
): ValidationResult {
  const errors: string[] = [];

  // Type guard
  if (typeof profile !== "object" || profile === null) {
    return { valid: false, errors: ["Profile must be an object"] };
  }

  const p = profile as Partial<JurisdictionProfile>;

  // Required fields
  const requiredFields: (keyof JurisdictionProfile)[] = [
    "id",
    "name",
    "region",
    "country",
    "language",
    "priorityWeights",
    "integrations",
    "legalRequirements",
    "contacts",
  ];

  for (const field of requiredFields) {
    if (!(field in p) || p[field] === undefined) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Validate id pattern
  if (p.id && !/^[a-z0-9_]+$/.test(p.id)) {
    errors.push("ID must contain only lowercase letters, numbers, and underscores");
  }

  // Validate language
  if (p.language && !["en", "fr", "both"].includes(p.language)) {
    errors.push("Language must be 'en', 'fr', or 'both'");
  }

  // Validate priority weights
  if (p.priorityWeights) {
    const weights = p.priorityWeights;
    const weightFields = [
      "ageUnder12",
      "age12to17",
      "ageOver65",
      "mentalHealthCondition",
      "medicalDependency",
      "suicidalRisk",
      "suspectedAbduction",
      "domesticViolenceHistory",
      "outOfCharacter",
      "noFinancialResources",
      "adverseWeather",
      "missingOver24Hours",
      "missingOver48Hours",
      "missingOver72Hours",
    ];

    for (const field of weightFields) {
      const value = weights[field as keyof typeof weights];
      if (typeof value !== "number" || value < 0 || value > 100) {
        errors.push(
          `priorityWeights.${field} must be a number between 0 and 100`
        );
      }
    }

    // Validate thresholds
    if (!weights.thresholds) {
      errors.push("priorityWeights.thresholds is required");
    } else {
      const thresholdFields = ["priority0", "priority1", "priority2", "priority3"] as const;
      for (const field of thresholdFields) {
        const value = weights.thresholds[field];
        if (typeof value !== "number" || value < 0) {
          errors.push(`priorityWeights.thresholds.${field} must be a non-negative number`);
        }
      }
    }
  }

  // Validate integrations
  if (p.integrations) {
    const integrationFields = [
      "hospitalRegistry",
      "morgueRegistry",
      "borderServices",
      "detentionFacilities",
      "socialServices",
      "transitAuthority",
    ] as const;

    for (const field of integrationFields) {
      const value = p.integrations[field];
      if (typeof value !== "boolean") {
        errors.push(`integrations.${field} must be a boolean`);
      }
    }
  }

  // Validate legal requirements
  if (p.legalRequirements) {
    const legal = p.legalRequirements;

    if (typeof legal.waitingPeriodHours !== "number" || legal.waitingPeriodHours < 0) {
      errors.push("legalRequirements.waitingPeriodHours must be a non-negative number");
    }

    if (typeof legal.parentalConsentRequired !== "boolean") {
      errors.push("legalRequirements.parentalConsentRequired must be a boolean");
    }

    if (typeof legal.dataRetentionDays !== "number" || legal.dataRetentionDays < 1) {
      errors.push("legalRequirements.dataRetentionDays must be a positive number");
    }

    if (typeof legal.privacyLawReference !== "string") {
      errors.push("legalRequirements.privacyLawReference must be a string");
    }

    if (!Array.isArray(legal.mandatoryReporting)) {
      errors.push("legalRequirements.mandatoryReporting must be an array");
    }
  }

  // Validate contacts
  if (p.contacts) {
    const contactFields = [
      "emergencyLine",
      "nonEmergencyLine",
      "missingPersonsUnit",
      "email",
      "address",
    ] as const;

    for (const field of contactFields) {
      const value = p.contacts[field];
      if (typeof value !== "string") {
        errors.push(`contacts.${field} must be a string`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Registry of all jurisdiction profiles
 */
const profileRegistry: Map<string, JurisdictionProfile> = new Map([
  ["qc_spvm_v1", QC_SPVM_V1],
  ["generic", GENERIC_PROFILE],
]);

/**
 * Get a jurisdiction profile by ID
 */
export function getJurisdictionProfile(id: string): JurisdictionProfile {
  return profileRegistry.get(id) || GENERIC_PROFILE;
}

/**
 * Get all jurisdiction profiles
 */
export function getAllJurisdictionProfiles(): JurisdictionProfile[] {
  return Array.from(profileRegistry.values());
}

/**
 * Register a new jurisdiction profile
 * Validates before registration
 */
export function registerJurisdictionProfile(
  profile: JurisdictionProfile
): ValidationResult {
  const validation = validateJurisdictionProfile(profile);

  if (!validation.valid) {
    return validation;
  }

  profileRegistry.set(profile.id, profile);

  return { valid: true, errors: [] };
}

/**
 * Select jurisdiction based on coordinates (lat/lng)
 * This is a simplified implementation - in production, you would use
 * proper geocoding or reverse geocoding services
 */
export function selectJurisdictionByLocation(
  lat: number,
  lng: number
): JurisdictionProfile {
  // Montreal coordinates roughly: 45.5017° N, 73.5673° W
  // Simplified check for Montreal area
  if (
    lat >= 45.4 &&
    lat <= 45.7 &&
    lng >= -73.9 &&
    lng <= -73.4
  ) {
    return QC_SPVM_V1;
  }

  // Default to generic profile
  return GENERIC_PROFILE;
}

/**
 * Select jurisdiction based on address components
 */
export function selectJurisdictionByAddress(
  city?: string,
  province?: string,
  country?: string
): JurisdictionProfile {
  const normalizedCity = city?.toLowerCase();
  const normalizedProvince = province?.toLowerCase();

  // Check for Montreal
  if (
    normalizedCity?.includes("montreal") ||
    normalizedCity?.includes("montréal")
  ) {
    return QC_SPVM_V1;
  }

  // More jurisdictions can be added here as they are implemented

  return GENERIC_PROFILE;
}

/**
 * Build-time validation - validates all registered profiles
 * Call this during build to ensure all profiles are valid
 */
export function validateAllProfiles(): {
  valid: boolean;
  results: Record<string, ValidationResult>;
} {
  const results: Record<string, ValidationResult> = {};
  let allValid = true;

  for (const [id, profile] of profileRegistry.entries()) {
    const validation = validateJurisdictionProfile(profile);
    results[id] = validation;

    if (!validation.valid) {
      allValid = false;
      console.error(`Jurisdiction profile '${id}' is invalid:`, validation.errors);
    }
  }

  return { valid: allValid, results };
}
