/**
 * Hospital Registry Polling Agent
 * Polls hospital registries for potential matches to missing persons
 */

import { BaseAgent } from "./base-agent";
import { createClient } from "@/lib/supabase/server";
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
  type?: "hl7" | "fhir" | "custom";
}

interface CaseSearchCriteria {
  caseId: string;
  caseNumber: string;
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
  assignedTo?: string;
}

interface HospitalPatient {
  patientId: string;
  hospitalId: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  age?: number;
  gender?: string;
  admissionDate: string;
  dischargeDate?: string;
  admissionReason?: string;
  physicalDescription?: string;
  identificationStatus?: "identified" | "unidentified" | "unknown";
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
              // Check if match already exists
              const isNew = await this.isNewMatch(match);
              if (!isNew) continue;

              // Store match
              await this.storeMatch(match, caseData);
              leadsGenerated++;

              // Alert on high-confidence matches
              if (match.matchScore >= 80) {
                await this.triggerAlert(caseData, match);
                alertsTriggered++;
              }
            }
          }

          this.addMetric(`hospital_${hospital.id}_queries`, 1);
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
    const supabase = await createClient();

    // Query active cases with enough data to search
    const { data: cases, error } = await supabase
      .from("case_reports")
      .select(`
        id,
        case_number,
        status,
        assigned_to,
        created_at,
        missing_person:missing_persons(
          first_name,
          last_name,
          aliases,
          date_of_birth,
          gender,
          height_cm,
          weight_kg,
          hair_color,
          eye_color,
          distinguishing_marks,
          last_seen_date
        )
      `)
      .in("status", ["open", "active", "in_progress"])
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(this.settings.maxCasesPerRun * 2);

    if (error) {
      console.error("[HospitalRegistryAgent] Error fetching cases:", error);
      return [];
    }

    if (!cases) return [];

    const searchCriteria: CaseSearchCriteria[] = [];

    for (const c of cases) {
      const mp = c.missing_person as {
        first_name?: string;
        last_name?: string;
        aliases?: string[];
        date_of_birth?: string;
        gender?: string;
        height_cm?: number;
        weight_kg?: number;
        hair_color?: string;
        eye_color?: string;
        distinguishing_marks?: string;
        last_seen_date?: string;
      } | null;

      // Must have at least first or last name
      if (!mp?.first_name && !mp?.last_name) continue;

      // Calculate age if DOB available
      let age: number | undefined;
      if (mp?.date_of_birth) {
        const dob = new Date(mp.date_of_birth);
        age = Math.floor((Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
      }

      searchCriteria.push({
        caseId: c.id,
        caseNumber: c.case_number,
        firstName: mp?.first_name || "",
        lastName: mp?.last_name || "",
        aliases: mp?.aliases || [],
        dateOfBirth: mp?.date_of_birth,
        age,
        gender: mp?.gender,
        heightCm: mp?.height_cm,
        weightKg: mp?.weight_kg,
        hairColor: mp?.hair_color,
        eyeColor: mp?.eye_color,
        distinguishingFeatures: mp?.distinguishing_marks,
        lastSeenDate: mp?.last_seen_date || c.created_at,
        assignedTo: c.assigned_to,
      });
    }

    return searchCriteria;
  }

  private async queryHospital(
    hospital: HospitalConfig,
    criteria: CaseSearchCriteria
  ): Promise<HospitalPatient[]> {
    console.log(`[HospitalRegistryAgent] Querying ${hospital.name} for ${criteria.firstName} ${criteria.lastName}`);

    if (!hospital.apiUrl) {
      console.log(`[HospitalRegistryAgent] No API URL configured for ${hospital.name}`);
      return [];
    }

    try {
      // Build search query based on hospital type
      const query = this.buildSearchQuery(criteria);

      let endpoint = hospital.apiUrl;
      let body: string;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (hospital.apiKey) {
        headers["Authorization"] = `Bearer ${hospital.apiKey}`;
      }

      switch (hospital.type) {
        case "fhir":
          // FHIR R4 Patient search
          endpoint = `${hospital.apiUrl}/Patient`;
          const fhirParams = new URLSearchParams({
            _format: "json",
            ...(criteria.firstName && { given: criteria.firstName }),
            ...(criteria.lastName && { family: criteria.lastName }),
            ...(criteria.gender && { gender: criteria.gender.toLowerCase() }),
            ...(criteria.dateOfBirth && { birthdate: criteria.dateOfBirth }),
          });
          endpoint = `${endpoint}?${fhirParams}`;

          const fhirResponse = await fetch(endpoint, {
            headers,
            signal: AbortSignal.timeout(30000),
          });

          if (!fhirResponse.ok) {
            console.error(`[HospitalRegistryAgent] FHIR API error: ${fhirResponse.status}`);
            return [];
          }

          const fhirData = await fhirResponse.json() as {
            entry?: Array<{
              resource: {
                id: string;
                name?: Array<{ given?: string[]; family?: string }>;
                birthDate?: string;
                gender?: string;
                extension?: Array<{ url: string; valueDateTime?: string }>;
              };
            }>;
          };

          return (fhirData.entry || []).map((entry) => {
            const resource = entry.resource;
            const name = resource.name?.[0];
            const admissionExt = resource.extension?.find((e) =>
              e.url.includes("admission-date")
            );

            return {
              patientId: resource.id,
              hospitalId: hospital.id,
              firstName: name?.given?.[0],
              lastName: name?.family,
              dateOfBirth: resource.birthDate,
              gender: resource.gender,
              admissionDate: admissionExt?.valueDateTime || new Date().toISOString(),
            };
          });

        case "hl7":
          // HL7 v2 style query (simplified)
          endpoint = `${hospital.apiUrl}/query`;
          body = JSON.stringify({
            messageType: "QRY_A19",
            query: {
              patientName: `${criteria.lastName}^${criteria.firstName}`,
              dateOfBirth: criteria.dateOfBirth,
              sex: criteria.gender?.charAt(0)?.toUpperCase(),
            },
          });

          const hl7Response = await fetch(endpoint, {
            method: "POST",
            headers,
            body,
            signal: AbortSignal.timeout(30000),
          });

          if (!hl7Response.ok) {
            console.error(`[HospitalRegistryAgent] HL7 API error: ${hl7Response.status}`);
            return [];
          }

          const hl7Data = await hl7Response.json() as {
            patients?: Array<{
              pid: string;
              firstName?: string;
              lastName?: string;
              dob?: string;
              sex?: string;
              admitDate?: string;
            }>;
          };

          return (hl7Data.patients || []).map((p) => ({
            patientId: p.pid,
            hospitalId: hospital.id,
            firstName: p.firstName,
            lastName: p.lastName,
            dateOfBirth: p.dob,
            gender: p.sex === "M" ? "male" : p.sex === "F" ? "female" : undefined,
            admissionDate: p.admitDate || new Date().toISOString(),
          }));

        default:
          // Custom/generic API
          const response = await fetch(`${hospital.apiUrl}/search`, {
            method: "POST",
            headers,
            body: JSON.stringify(query),
            signal: AbortSignal.timeout(30000),
          });

          if (!response.ok) {
            console.error(`[HospitalRegistryAgent] API error: ${response.status}`);
            return [];
          }

          const data = await response.json() as {
            patients?: Array<{
              id: string;
              firstName?: string;
              lastName?: string;
              dateOfBirth?: string;
              age?: number;
              gender?: string;
              admissionDate?: string;
              dischargeDate?: string;
              identificationStatus?: string;
              physicalDescription?: string;
            }>;
          };

          return (data.patients || []).map((p) => ({
            patientId: p.id,
            hospitalId: hospital.id,
            firstName: p.firstName,
            lastName: p.lastName,
            dateOfBirth: p.dateOfBirth,
            age: p.age,
            gender: p.gender,
            admissionDate: p.admissionDate || new Date().toISOString(),
            dischargeDate: p.dischargeDate,
            identificationStatus: p.identificationStatus as HospitalPatient["identificationStatus"],
            physicalDescription: p.physicalDescription,
          }));
      }
    } catch (error) {
      console.error(`[HospitalRegistryAgent] Query error for ${hospital.name}:`, error);
      return [];
    }
  }

  private buildSearchQuery(criteria: CaseSearchCriteria): Record<string, unknown> {
    return {
      firstName: criteria.firstName,
      lastName: criteria.lastName,
      aliases: criteria.aliases,
      age: criteria.age,
      ageRange: criteria.age ? { min: criteria.age - 5, max: criteria.age + 5 } : undefined,
      gender: criteria.gender,
      admittedAfter: criteria.lastSeenDate,
      includeUnidentified: true,
      status: ["admitted", "discharged"],
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

    // Bonus for unidentified patients (they're more likely matches)
    const unidentifiedBonus = patient.identificationStatus === "unidentified" ? 10 : 0;

    return {
      id: crypto.randomUUID(),
      caseId: criteria.caseId,
      hospitalId: hospital.id,
      hospitalName: hospital.name,
      patientId: patient.patientId,
      matchScore: Math.min(100, Math.round(totalScore + unidentifiedBonus)),
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
    // Unidentified patients get partial score
    if (!patient.firstName && !patient.lastName) {
      return patient.identificationStatus === "unidentified" ? 30 : 0;
    }

    let score = 0;
    const allNames = [
      `${criteria.firstName} ${criteria.lastName}`.toLowerCase().trim(),
      ...criteria.aliases.map((a) => a.toLowerCase()),
    ];

    const patientName = `${patient.firstName || ""} ${patient.lastName || ""}`.toLowerCase().trim();

    for (const name of allNames) {
      if (name === patientName) {
        score = 100;
        break;
      }
      // Partial matches
      if (criteria.lastName && patient.lastName?.toLowerCase() === criteria.lastName.toLowerCase()) {
        score = Math.max(score, 70);
      }
      if (criteria.firstName && patient.firstName?.toLowerCase() === criteria.firstName.toLowerCase()) {
        score = Math.max(score, 50);
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
    // Calculate patient age if DOB is available
    let patientAge = patient.age;
    if (!patientAge && patient.dateOfBirth) {
      const dob = new Date(patient.dateOfBirth);
      patientAge = Math.floor((Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
    }

    if (!criteria.age || !patientAge) return 50; // Neutral if unknown

    const ageDiff = Math.abs(criteria.age - patientAge);
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
    let score = 50; // Base score

    // Compare gender
    if (criteria.gender && patient.gender) {
      if (criteria.gender.toLowerCase() !== patient.gender.toLowerCase()) {
        return 0; // Gender mismatch is disqualifying
      }
      score += 20;
    }

    // Check physical description for distinguishing features
    if (criteria.distinguishingFeatures && patient.physicalDescription) {
      const features = criteria.distinguishingFeatures.toLowerCase();
      const description = patient.physicalDescription.toLowerCase();

      // Look for matching keywords
      const keywords = features.split(/[,;]/).map((k) => k.trim());
      let matchCount = 0;
      for (const keyword of keywords) {
        if (keyword && description.includes(keyword)) {
          matchCount++;
        }
      }
      if (matchCount > 0) {
        score += Math.min(30, matchCount * 15);
      }
    }

    return Math.min(100, score);
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

  private async isNewMatch(match: HospitalMatch): Promise<boolean> {
    const supabase = await createClient();

    // Check if this case/hospital/patient combo already exists
    const { data: existing } = await supabase
      .from("hospital_matches")
      .select("id")
      .eq("case_id", match.caseId)
      .eq("hospital_id", match.hospitalId)
      .eq("patient_id", match.patientId)
      .limit(1)
      .single();

    return !existing;
  }

  private async storeMatch(match: HospitalMatch, caseData: CaseSearchCriteria): Promise<void> {
    const supabase = await createClient();

    console.log(
      `[HospitalRegistryAgent] Storing match: ${caseData.caseNumber} -> ${match.hospitalName} (${match.matchScore}%)`
    );

    // Store the match
    const { error: matchError } = await supabase.from("hospital_matches").insert({
      id: match.id,
      case_id: match.caseId,
      hospital_id: match.hospitalId,
      hospital_name: match.hospitalName,
      patient_id: match.patientId,
      match_score: match.matchScore,
      match_details: match.matchDetails,
      admission_date: match.admissionDate,
      detected_at: match.detectedAt,
      status: match.status,
    });

    if (matchError) {
      console.error("[HospitalRegistryAgent] Error storing match:", matchError);
      throw matchError;
    }

    // Create a lead for significant matches
    if (match.matchScore >= 50) {
      await supabase.from("leads").insert({
        case_id: match.caseId,
        source_type: "hospital_match",
        source_id: match.id,
        title: `Hospital Match: ${match.hospitalName} (${match.matchScore}%)`,
        description: `Potential match found at ${match.hospitalName} with ${match.matchScore}% confidence. ${match.admissionDate ? `Patient admitted on ${new Date(match.admissionDate).toLocaleDateString()}.` : ""} Requires verification.`,
        priority: match.matchScore >= 80 ? "high" : match.matchScore >= 60 ? "medium" : "low",
        status: "new",
        submitted_by: "system",
        metadata: {
          hospital_id: match.hospitalId,
          hospital_name: match.hospitalName,
          patient_id: match.patientId,
          match_score: match.matchScore,
          match_details: match.matchDetails,
          admission_date: match.admissionDate,
        },
      });
    }
  }

  private async triggerAlert(caseData: CaseSearchCriteria, match: HospitalMatch): Promise<void> {
    const supabase = await createClient();

    console.log(
      `[HospitalRegistryAgent] High-confidence match alert for case ${caseData.caseNumber}`
    );

    // Create notification for assigned investigator
    if (caseData.assignedTo) {
      await supabase.from("notifications").insert({
        user_id: caseData.assignedTo,
        type: "hospital_match_alert",
        title: `High-Confidence Hospital Match: ${caseData.caseNumber}`,
        message: `A potential match (${match.matchScore}% confidence) has been found at ${match.hospitalName}. ${match.admissionDate ? `Patient admitted on ${new Date(match.admissionDate).toLocaleDateString()}.` : ""} Immediate verification recommended.`,
        data: {
          case_id: match.caseId,
          case_number: caseData.caseNumber,
          hospital_id: match.hospitalId,
          hospital_name: match.hospitalName,
          match_id: match.id,
          match_score: match.matchScore,
          admission_date: match.admissionDate,
        },
        priority: "high",
      });
    }

    // For very high confidence matches (90%+), notify supervisors too
    if (match.matchScore >= 90) {
      const { data: supervisors } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["supervisor", "admin"]);

      if (supervisors?.length) {
        const supervisorNotifications = supervisors
          .filter((s) => s.user_id !== caseData.assignedTo)
          .map((s) => ({
            user_id: s.user_id,
            type: "hospital_match_urgent",
            title: `URGENT: ${match.matchScore}% Hospital Match - ${caseData.caseNumber}`,
            message: `Very high confidence match detected at ${match.hospitalName}. Case: ${caseData.caseNumber}, Name: ${caseData.firstName} ${caseData.lastName}`,
            data: {
              case_id: match.caseId,
              case_number: caseData.caseNumber,
              hospital_name: match.hospitalName,
              match_score: match.matchScore,
            },
            priority: "urgent",
          }));

        if (supervisorNotifications.length > 0) {
          await supabase.from("notifications").insert(supervisorNotifications);
        }
      }
    }

    // Log to case activity
    await supabase.from("case_activity").insert({
      case_id: match.caseId,
      activity_type: "hospital_match",
      description: `High-confidence match (${match.matchScore}%) detected at ${match.hospitalName}`,
      metadata: {
        hospital_id: match.hospitalId,
        hospital_name: match.hospitalName,
        match_id: match.id,
        match_score: match.matchScore,
        match_details: match.matchDetails,
        admission_date: match.admissionDate,
      },
    });
  }

  protected clone(config: AgentConfig): BaseAgent {
    return new HospitalRegistryAgent(config);
  }
}

export function createHospitalRegistryAgent(
  id: string,
  settings?: Partial<HospitalRegistryAgentSettings>
): HospitalRegistryAgent {
  // Load hospital configurations from environment
  const hospitals: HospitalConfig[] = [];

  // Check for configured hospitals from environment
  const hospitalConfigStr = process.env.HOSPITAL_REGISTRIES;
  if (hospitalConfigStr) {
    try {
      const parsed = JSON.parse(hospitalConfigStr) as HospitalConfig[];
      hospitals.push(...parsed);
    } catch {
      console.error("[HospitalRegistryAgent] Failed to parse HOSPITAL_REGISTRIES env");
    }
  }

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
      hospitals,
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
