/**
 * Hospital Registry Polling Agent
 * Polls hospital registries for potential matches to missing persons
 */

import { BaseAgent } from "./base-agent";
import type { AgentConfig, HospitalMatch } from "@/types/agent.types";

interface HospitalRegistryAgentSettings {
  hospitals: HospitalConfig[];
  matchThreshold: number;
  maxCasesPerRun: number;
  weights: {
    nameMatch: number;
    ageMatch: number;
    physicalMatch: number;
    dateMatch: number;
  };
}

interface HospitalConfig {
  id: string;
  name: string;
  apiUrl: string;
  apiKey?: string;
  enabled: boolean;
}

interface CaseSearchCriteria {
  caseId: string;
  firstName: string;
  lastName: string;
  aliases: string[];
  dateOfBirth?: string;
  age?: number;
  gender?: string;
  heightCm?: number;
  weightKg?: number;
  hairColor?: string;
  eyeColor?: string;
  distinguishingFeatures?: string;
  lastSeenDate: string;
}

interface HospitalPatient {
  patientId: string;
  hospitalId: string;
  firstName?: string;
  lastName?: string;
  age?: number;
  gender?: string;
  admissionDate: string;
  physicalDescription?: string;
}

export class HospitalRegistryAgent extends BaseAgent {
  private settings: HospitalRegistryAgentSettings;

  constructor(config: AgentConfig) {
    super(config);
    this.settings = (config.settings as unknown) as HospitalRegistryAgentSettings;
  }

  protected async execute(): Promise<{
    itemsProcessed: number;
    leadsGenerated: number;
    alertsTriggered: number;
  }> {
    let itemsProcessed = 0;
    let leadsGenerated = 0;
    let alertsTriggered = 0;

    // Get active cases for matching
    const cases = await this.getActiveCases();
    this.addMetric("cases_to_match", cases.length);

    const enabledHospitals = this.settings.hospitals.filter((h) => h.enabled);
    this.addMetric("hospitals_to_query", enabledHospitals.length);

    for (const caseData of cases.slice(0, this.settings.maxCasesPerRun)) {
      for (const hospital of enabledHospitals) {
        try {
          // Query hospital registry
          const patients = await this.queryHospital(hospital, caseData);
          itemsProcessed++;

          // Score matches
          for (const patient of patients) {
            const match = this.calculateMatch(caseData, patient, hospital);

            if (match.matchScore >= this.settings.matchThreshold) {
              // Store match
              await this.storeMatch(match);
              leadsGenerated++;

              // Alert on high-confidence matches
              if (match.matchScore >= 80) {
                await this.triggerAlert(caseData.caseId, match);
                alertsTriggered++;
              }
            }
          }
        } catch (error) {
          console.error(
            `[HospitalRegistryAgent] Error querying ${hospital.name} for case ${caseData.caseId}:`,
            error
          );
          this.errors.push(this.createError(error));
        }

        // Rate limiting between hospital queries
        await this.sleep(2000);
      }
    }

    return { itemsProcessed, leadsGenerated, alertsTriggered };
  }

  private async getActiveCases(): Promise<CaseSearchCriteria[]> {
    // Query database for active cases with enough data to search
    return [];
  }

  private async queryHospital(
    hospital: HospitalConfig,
    criteria: CaseSearchCriteria
  ): Promise<HospitalPatient[]> {
    // In production, this would call the hospital's API
    this.addMetric(`hospital_${hospital.id}_queries`, 1);

    // Build search query
    const query = this.buildSearchQuery(criteria);
    console.log(`[HospitalRegistryAgent] Querying ${hospital.name} with:`, query);

    return [];
  }

  private buildSearchQuery(criteria: CaseSearchCriteria): Record<string, unknown> {
    return {
      firstName: criteria.firstName,
      lastName: criteria.lastName,
      aliases: criteria.aliases,
      age: criteria.age,
      gender: criteria.gender,
      admittedAfter: criteria.lastSeenDate,
    };
  }

  private calculateMatch(
    criteria: CaseSearchCriteria,
    patient: HospitalPatient,
    hospital: HospitalConfig
  ): HospitalMatch {
    const { weights } = this.settings;

    // Calculate individual match scores
    const nameScore = this.calculateNameMatch(criteria, patient);
    const ageScore = this.calculateAgeMatch(criteria, patient);
    const physicalScore = this.calculatePhysicalMatch(criteria, patient);
    const dateScore = this.calculateDateMatch(criteria, patient);

    // Weighted total
    const totalScore =
      nameScore * weights.nameMatch +
      ageScore * weights.ageMatch +
      physicalScore * weights.physicalMatch +
      dateScore * weights.dateMatch;

    return {
      id: crypto.randomUUID(),
      caseId: criteria.caseId,
      hospitalId: hospital.id,
      hospitalName: hospital.name,
      patientId: patient.patientId,
      matchScore: Math.round(totalScore),
      matchDetails: {
        nameMatch: nameScore,
        ageMatch: ageScore,
        physicalMatch: physicalScore,
        dateMatch: dateScore,
      },
      admissionDate: patient.admissionDate,
      detectedAt: new Date().toISOString(),
      status: "pending",
    };
  }

  private calculateNameMatch(
    criteria: CaseSearchCriteria,
    patient: HospitalPatient
  ): number {
    if (!patient.firstName && !patient.lastName) return 0;

    let score = 0;
    const allNames = [
      `${criteria.firstName} ${criteria.lastName}`.toLowerCase(),
      ...criteria.aliases.map((a) => a.toLowerCase()),
    ];

    const patientName = `${patient.firstName || ""} ${patient.lastName || ""}`.toLowerCase().trim();

    for (const name of allNames) {
      if (name === patientName) {
        score = 100;
        break;
      }
      // Fuzzy matching
      const similarity = this.calculateStringSimilarity(name, patientName);
      score = Math.max(score, similarity * 100);
    }

    return score;
  }

  private calculateAgeMatch(
    criteria: CaseSearchCriteria,
    patient: HospitalPatient
  ): number {
    if (!criteria.age || !patient.age) return 50; // Neutral if unknown

    const ageDiff = Math.abs(criteria.age - patient.age);
    if (ageDiff === 0) return 100;
    if (ageDiff <= 2) return 80;
    if (ageDiff <= 5) return 50;
    if (ageDiff <= 10) return 20;
    return 0;
  }

  private calculatePhysicalMatch(
    criteria: CaseSearchCriteria,
    patient: HospitalPatient
  ): number {
    // Compare gender first
    if (criteria.gender && patient.gender) {
      if (criteria.gender.toLowerCase() !== patient.gender.toLowerCase()) {
        return 0;
      }
    }

    // Basic score for gender match
    return 50;
  }

  private calculateDateMatch(
    criteria: CaseSearchCriteria,
    patient: HospitalPatient
  ): number {
    const lastSeen = new Date(criteria.lastSeenDate);
    const admitted = new Date(patient.admissionDate);

    // Patient admitted before last seen = impossible
    if (admitted < lastSeen) return 0;

    const daysDiff = Math.floor(
      (admitted.getTime() - lastSeen.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff <= 1) return 100;
    if (daysDiff <= 3) return 80;
    if (daysDiff <= 7) return 60;
    if (daysDiff <= 14) return 40;
    if (daysDiff <= 30) return 20;
    return 10;
  }

  private calculateStringSimilarity(a: string, b: string): number {
    // Simple Levenshtein-based similarity
    if (a === b) return 1;
    if (a.length === 0 || b.length === 0) return 0;

    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    const maxLen = Math.max(a.length, b.length);
    return 1 - matrix[b.length][a.length] / maxLen;
  }

  private async storeMatch(match: HospitalMatch): Promise<void> {
    console.log(
      `[HospitalRegistryAgent] Storing match: ${match.caseId} -> ${match.hospitalName} (${match.matchScore}%)`
    );
  }

  private async triggerAlert(caseId: string, match: HospitalMatch): Promise<void> {
    console.log(
      `[HospitalRegistryAgent] High-confidence match alert for case ${caseId}`
    );
  }

  protected clone(config: AgentConfig): BaseAgent {
    return new HospitalRegistryAgent(config);
  }
}

export function createHospitalRegistryAgent(
  id: string,
  settings?: Partial<HospitalRegistryAgentSettings>
): HospitalRegistryAgent {
  const config: AgentConfig = {
    id,
    type: "hospital_registry",
    name: "Hospital Registry Agent",
    enabled: true,
    schedule: "0 * * * *", // Every hour
    timeout: 600000, // 10 minutes
    retryAttempts: 2,
    retryDelay: 60000,
    settings: {
      hospitals: [],
      matchThreshold: 60,
      maxCasesPerRun: 50,
      weights: {
        nameMatch: 0.3,
        ageMatch: 0.2,
        physicalMatch: 0.25,
        dateMatch: 0.25,
      },
      ...settings,
    },
  };

  return new HospitalRegistryAgent(config);
}
