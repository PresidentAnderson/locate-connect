/**
 * Jurisdiction Profile Types
 * Allows configuration per police service/region
 */

export interface JurisdictionProfile {
  id: string;
  name: string;
  region: string;
  country: string;
  language: "en" | "fr" | "both";

  // Priority weighting configuration
  priorityWeights: PriorityWeightConfig;

  // Integration capabilities
  integrations: JurisdictionIntegrations;

  // Legal requirements
  legalRequirements: LegalRequirements;

  // Contact information
  contacts: JurisdictionContacts;
}

export interface PriorityWeightConfig {
  // Age-based weights
  ageUnder12: number;
  age12to17: number;
  ageOver65: number;

  // Condition-based weights
  mentalHealthCondition: number;
  medicalDependency: number;
  suicidalRisk: number;

  // Circumstance-based weights
  suspectedAbduction: number;
  domesticViolenceHistory: number;
  outOfCharacter: number;
  noFinancialResources: number;
  adverseWeather: number;

  // Time-based weights
  missingOver24Hours: number;
  missingOver48Hours: number;
  missingOver72Hours: number;

  // Thresholds for priority levels
  thresholds: {
    priority0: number; // Critical - immediate response
    priority1: number; // High - urgent response
    priority2: number; // Medium - active investigation
    priority3: number; // Low - monitoring
  };
}

export interface JurisdictionIntegrations {
  hospitalRegistry: boolean;
  morgueRegistry: boolean;
  borderServices: boolean;
  detentionFacilities: boolean;
  socialServices: boolean;
  transitAuthority: boolean;
}

export interface LegalRequirements {
  waitingPeriodHours: number;
  parentalConsentRequired: boolean;
  dataRetentionDays: number;
  privacyLawReference: string;
  mandatoryReporting: string[];
}

export interface JurisdictionContacts {
  emergencyLine: string;
  nonEmergencyLine: string;
  missingPersonsUnit: string;
  email: string;
  address: string;
}

// Quebec SPVM Profile
export const QC_SPVM_V1: JurisdictionProfile = {
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
      priority0: 80, // Critical
      priority1: 60, // High
      priority2: 40, // Medium
      priority3: 20, // Low
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
    waitingPeriodHours: 0, // No waiting period in Quebec
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

// Generic fallback profile
export const GENERIC_PROFILE: JurisdictionProfile = {
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
