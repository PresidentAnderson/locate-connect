import type { MissingPerson, PriorityLevel, PriorityFactor } from "@/types";
import type { JurisdictionProfile, PriorityWeightConfig } from "@/types";
import { QC_SPVM_V1, GENERIC_PROFILE } from "@/types";

interface PriorityAssessment {
  level: PriorityLevel;
  score: number;
  factors: PriorityFactor[];
  explanation: string[];
  jurisdiction: string;
}

interface AssessmentInput {
  age: number;
  hoursMissing?: number;
  hourssMissing?: number;
  hasMedicalCondition: boolean;
  requiresDailyMedication: boolean;
  hasMentalHealthCondition: boolean;
  suicidalRisk: boolean;
  suspectedAbduction: boolean;
  domesticViolenceHistory: boolean;
  outOfCharacter: boolean;
  hasFinancialResources: boolean;
  adverseWeather: boolean;
}

/**
 * Priority Assessment Engine
 * Calculates priority level based on jurisdiction-specific weights
 */
export function assessPriority(
  input: AssessmentInput,
  jurisdictionId: string = "qc_spvm_v1"
): PriorityAssessment {
  const profile = getJurisdictionProfile(jurisdictionId);
  const weights = profile.priorityWeights;
  const hoursMissing = input.hoursMissing ?? input.hourssMissing ?? 0;

  const factors: PriorityFactor[] = [];
  let totalScore = 0;

  // Age-based factors
  if (input.age < 12) {
    const weight = weights.ageUnder12;
    totalScore += weight;
    factors.push({
      factor: "age_under_12",
      weight,
      description: "Child under 12 years old",
      source: "age_assessment",
    });
  } else if (input.age >= 12 && input.age <= 17) {
    const weight = weights.age12to17;
    totalScore += weight;
    factors.push({
      factor: "age_12_to_17",
      weight,
      description: "Minor aged 12-17",
      source: "age_assessment",
    });
  } else if (input.age >= 65) {
    const weight = weights.ageOver65;
    totalScore += weight;
    factors.push({
      factor: "age_over_65",
      weight,
      description: "Senior 65 years or older",
      source: "age_assessment",
    });
  }

  // Medical factors
  if (input.hasMedicalCondition) {
    const weight = weights.medicalDependency;
    totalScore += weight;
    factors.push({
      factor: "medical_condition",
      weight,
      description: "Has medical condition requiring attention",
      source: "medical_assessment",
    });
  }

  if (input.requiresDailyMedication) {
    const weight = weights.medicalDependency;
    totalScore += weight;
    factors.push({
      factor: "medication_dependency",
      weight,
      description: "Requires daily medication",
      source: "medical_assessment",
    });
  }

  // Mental health factors
  if (input.hasMentalHealthCondition) {
    const weight = weights.mentalHealthCondition;
    totalScore += weight;
    factors.push({
      factor: "mental_health",
      weight,
      description: "Mental health condition",
      source: "mental_health_assessment",
    });
  }

  if (input.suicidalRisk) {
    const weight = weights.suicidalRisk;
    totalScore += weight;
    factors.push({
      factor: "suicidal_risk",
      weight,
      description: "Risk of self-harm indicated",
      source: "mental_health_assessment",
    });
  }

  // Circumstance factors
  if (input.suspectedAbduction) {
    const weight = weights.suspectedAbduction;
    totalScore += weight;
    factors.push({
      factor: "suspected_abduction",
      weight,
      description: "Suspected abduction or foul play",
      source: "circumstance_assessment",
    });
  }

  if (input.domesticViolenceHistory) {
    const weight = weights.domesticViolenceHistory;
    totalScore += weight;
    factors.push({
      factor: "domestic_violence_history",
      weight,
      description: "History of domestic violence",
      source: "circumstance_assessment",
    });
  }

  if (input.outOfCharacter) {
    const weight = weights.outOfCharacter;
    totalScore += weight;
    factors.push({
      factor: "out_of_character",
      weight,
      description: "Disappearance is out of character",
      source: "circumstance_assessment",
    });
  }

  if (!input.hasFinancialResources) {
    const weight = weights.noFinancialResources;
    totalScore += weight;
    factors.push({
      factor: "no_resources",
      weight,
      description: "No known financial resources",
      source: "circumstance_assessment",
    });
  }

  if (input.adverseWeather) {
    const weight = weights.adverseWeather;
    totalScore += weight;
    factors.push({
      factor: "adverse_weather",
      weight,
      description: "Adverse weather conditions",
      source: "environmental_assessment",
    });
  }

  // Time-based factors
  if (hoursMissing >= 72) {
    const weight = weights.missingOver72Hours;
    totalScore += weight;
    factors.push({
      factor: "missing_72_plus",
      weight,
      description: "Missing for 72+ hours",
      source: "time_assessment",
    });
  } else if (hoursMissing >= 48) {
    const weight = weights.missingOver48Hours;
    totalScore += weight;
    factors.push({
      factor: "missing_48_plus",
      weight,
      description: "Missing for 48+ hours",
      source: "time_assessment",
    });
  } else if (hoursMissing >= 24) {
    const weight = weights.missingOver24Hours;
    totalScore += weight;
    factors.push({
      factor: "missing_24_plus",
      weight,
      description: "Missing for 24+ hours",
      source: "time_assessment",
    });
  }

  // Calculate priority level
  const level = calculatePriorityLevel(totalScore, weights.thresholds);

  // Generate explanation
  const explanation = generateExplanation(factors, level, profile.name);

  return {
    level,
    score: totalScore,
    factors,
    explanation,
    jurisdiction: profile.id,
  };
}

function calculatePriorityLevel(
  score: number,
  thresholds: PriorityWeightConfig["thresholds"]
): PriorityLevel {
  if (score >= thresholds.priority0) return 0;
  if (score >= thresholds.priority1) return 1;
  if (score >= thresholds.priority2) return 2;
  if (score >= thresholds.priority3) return 3;
  return 4;
}

function generateExplanation(
  factors: PriorityFactor[],
  level: PriorityLevel,
  jurisdictionName: string
): string[] {
  const priorityLabels = {
    0: "CRITICAL - Immediate response required",
    1: "HIGH - Urgent investigation required",
    2: "MEDIUM - Active investigation",
    3: "LOW - Standard monitoring",
    4: "MINIMAL - Basic registration",
  };

  const explanation = [
    `Priority Level: ${level} - ${priorityLabels[level]}`,
    `Assessment based on: ${jurisdictionName} protocol`,
    "",
    "Contributing factors:",
    ...factors.map((f) => `• ${f.description} (+${f.weight} points)`),
  ];

  return explanation;
}

function getJurisdictionProfile(id: string): JurisdictionProfile {
  const profiles: Record<string, JurisdictionProfile> = {
    qc_spvm_v1: QC_SPVM_V1,
    generic: GENERIC_PROFILE,
  };

  return profiles[id] || GENERIC_PROFILE;
}

/**
 * Get priority level display info
 */
export function getPriorityDisplay(level: PriorityLevel): {
  label: string;
  labelFr: string;
  color: string;
  bgColor: string;
  description: string;
  descriptionFr: string;
} {
  const displays = {
    0: {
      label: "CRITICAL",
      labelFr: "CRITIQUE",
      color: "text-red-700",
      bgColor: "bg-red-100",
      description: "Immediate response required - all resources mobilized",
      descriptionFr: "Réponse immédiate requise - toutes les ressources mobilisées",
    },
    1: {
      label: "HIGH",
      labelFr: "ÉLEVÉ",
      color: "text-orange-700",
      bgColor: "bg-orange-100",
      description: "Urgent investigation - priority allocation",
      descriptionFr: "Enquête urgente - allocation prioritaire",
    },
    2: {
      label: "MEDIUM",
      labelFr: "MOYEN",
      color: "text-yellow-700",
      bgColor: "bg-yellow-100",
      description: "Active investigation - standard resources",
      descriptionFr: "Enquête active - ressources standard",
    },
    3: {
      label: "LOW",
      labelFr: "FAIBLE",
      color: "text-green-700",
      bgColor: "bg-green-100",
      description: "Monitoring status - periodic review",
      descriptionFr: "Statut de surveillance - révision périodique",
    },
    4: {
      label: "MINIMAL",
      labelFr: "MINIMAL",
      color: "text-gray-700",
      bgColor: "bg-gray-100",
      description: "Registered - passive monitoring",
      descriptionFr: "Enregistré - surveillance passive",
    },
  };

  return displays[level];
}
