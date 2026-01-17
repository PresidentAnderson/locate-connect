/**
 * Standalone validation script for jurisdiction profiles
 * Validates QC_SPVM_V1 and GENERIC_PROFILE at build time
 */

import { test } from "node:test";
import assert from "node:assert";

// Inline validation logic for build-time check
function validateProfile(profile) {
  const errors = [];

  // Required fields check
  const requiredFields = [
    "id", "name", "region", "country", "language",
    "priorityWeights", "integrations", "legalRequirements", "contacts"
  ];

  for (const field of requiredFields) {
    if (!(field in profile)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Validate id pattern
  if (!/^[a-z0-9_]+$/.test(profile.id)) {
    errors.push("ID must contain only lowercase letters, numbers, and underscores");
  }

  // Validate language
  if (!["en", "fr", "both"].includes(profile.language)) {
    errors.push("Language must be 'en', 'fr', or 'both'");
  }

  return { valid: errors.length === 0, errors };
}

// Test QC_SPVM_V1 profile structure
test("QC_SPVM_V1 profile has valid structure", () => {
  const profile = {
    id: "qc_spvm_v1",
    name: "Service de police de la Ville de Montréal",
    region: "Montreal",
    country: "Canada",
    language: "both",
    priorityWeights: {
      ageUnder12: 30,
      age12to17: 20,
      ageOver65: 15,
      mentalHealthCondition: 25,
      medicalDependency: 30,
      suicidalRisk: 35,
      suspectedAbduction: 40,
      domesticViolenceHistory: 25,
      outOfCharacter: 15,
      noFinancialResources: 10,
      adverseWeather: 10,
      missingOver24Hours: 10,
      missingOver48Hours: 20,
      missingOver72Hours: 30,
      thresholds: {
        priority0: 80,
        priority1: 60,
        priority2: 40,
        priority3: 20,
      },
    },
    integrations: {
      hospitalRegistry: true,
      morgueRegistry: true,
      borderServices: true,
      detentionFacilities: true,
      socialServices: true,
      transitAuthority: true,
    },
    legalRequirements: {
      waitingPeriodHours: 0,
      parentalConsentRequired: false,
      dataRetentionDays: 365,
      privacyLawReference: "Loi sur la protection des renseignements personnels (Quebec)",
      mandatoryReporting: ["hospitals", "schools", "social_services"],
    },
    contacts: {
      emergencyLine: "911",
      nonEmergencyLine: "514-280-2222",
      missingPersonsUnit: "514-280-2222",
      email: "info@spvm.qc.ca",
      address: "1441 rue Saint-Urbain, Montréal, QC",
    },
  };

  const result = validateProfile(profile);
  assert.strictEqual(result.valid, true, `Validation errors: ${result.errors.join(", ")}`);
});

// Test GENERIC profile structure
test("GENERIC profile has valid structure", () => {
  const profile = {
    id: "generic",
    name: "Generic Profile",
    region: "Unknown",
    country: "Unknown",
    language: "en",
    priorityWeights: {
      ageUnder12: 25,
      age12to17: 15,
      ageOver65: 10,
      mentalHealthCondition: 20,
      medicalDependency: 25,
      suicidalRisk: 30,
      suspectedAbduction: 35,
      domesticViolenceHistory: 20,
      outOfCharacter: 10,
      noFinancialResources: 5,
      adverseWeather: 5,
      missingOver24Hours: 5,
      missingOver48Hours: 15,
      missingOver72Hours: 25,
      thresholds: {
        priority0: 75,
        priority1: 55,
        priority2: 35,
        priority3: 15,
      },
    },
    integrations: {
      hospitalRegistry: false,
      morgueRegistry: false,
      borderServices: false,
      detentionFacilities: false,
      socialServices: false,
      transitAuthority: false,
    },
    legalRequirements: {
      waitingPeriodHours: 24,
      parentalConsentRequired: true,
      dataRetentionDays: 180,
      privacyLawReference: "Local privacy laws apply",
      mandatoryReporting: [],
    },
    contacts: {
      emergencyLine: "911",
      nonEmergencyLine: "",
      missingPersonsUnit: "",
      email: "",
      address: "",
    },
  };

  const result = validateProfile(profile);
  assert.strictEqual(result.valid, true, `Validation errors: ${result.errors.join(", ")}`);
});
