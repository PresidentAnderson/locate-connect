/**
 * Public Records Crawler Agent
 * Searches public records databases for information related to missing persons
 */

import { BaseAgent } from "./base-agent";
import type { AgentConfig, PublicRecord } from "@/types/agent.types";

interface PublicRecordsCrawlerSettings {
  databases: RecordDatabase[];
  maxRecordsPerRun: number;
  matchThreshold: number;
  recordTypes: string[];
}

interface RecordDatabase {
  id: string;
  name: string;
  type: "court" | "property" | "vital" | "dmv" | "arrest" | "registry";
  apiUrl: string;
  apiKey?: string;
  enabled: boolean;
  jurisdiction?: string;
}

interface PersonSearchCriteria {
  caseId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  aliases: string[];
  dateOfBirth?: string;
  ssn?: string; // Only used with proper authorization
  lastKnownAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
}

interface RecordMatch {
  record: PublicRecord;
  matchScore: number;
  matchedFields: string[];
}

export class PublicRecordsCrawlerAgent extends BaseAgent {
  private settings: PublicRecordsCrawlerSettings;

  constructor(config: AgentConfig) {
    super(config);
    this.settings = config.settings as PublicRecordsCrawlerSettings;
  }

  protected async execute(): Promise<{
    itemsProcessed: number;
    leadsGenerated: number;
    alertsTriggered: number;
  }> {
    let itemsProcessed = 0;
    let leadsGenerated = 0;
    let alertsTriggered = 0;

    // Get cases with sufficient identity information
    const cases = await this.getCasesForSearch();
    this.addMetric("cases_to_search", cases.length);

    const enabledDatabases = this.settings.databases.filter((d) => d.enabled);
    this.addMetric("databases_to_search", enabledDatabases.length);

    for (const caseData of cases.slice(0, this.settings.maxRecordsPerRun)) {
      for (const database of enabledDatabases) {
        try {
          // Search database
          const records = await this.searchDatabase(database, caseData);
          itemsProcessed += records.length;

          // Score and filter matches
          const matches = this.scoreMatches(caseData, records);

          for (const match of matches) {
            if (match.matchScore >= this.settings.matchThreshold) {
              // Store record and create lead
              await this.storeRecord(caseData.caseId, match);
              leadsGenerated++;

              // Alert for high-confidence matches
              if (match.matchScore >= 85) {
                await this.triggerAlert(caseData.caseId, match);
                alertsTriggered++;
              }
            }
          }

          this.addMetric(`database_${database.id}_records`, records.length);
        } catch (error) {
          console.error(
            `[PublicRecordsCrawlerAgent] Error searching ${database.name} for case ${caseData.caseId}:`,
            error
          );
          this.errors.push(this.createError(error));
        }

        // Rate limiting between database queries
        await this.sleep(2000);
      }
    }

    return { itemsProcessed, leadsGenerated, alertsTriggered };
  }

  private async getCasesForSearch(): Promise<PersonSearchCriteria[]> {
    // Query database for cases with identity information
    // Only include cases with proper authorization for records search
    return [];
  }

  private async searchDatabase(
    database: RecordDatabase,
    criteria: PersonSearchCriteria
  ): Promise<PublicRecord[]> {
    console.log(
      `[PublicRecordsCrawlerAgent] Searching ${database.name} for ${criteria.firstName} ${criteria.lastName}`
    );

    switch (database.type) {
      case "court":
        return this.searchCourtRecords(database, criteria);
      case "property":
        return this.searchPropertyRecords(database, criteria);
      case "vital":
        return this.searchVitalRecords(database, criteria);
      case "dmv":
        return this.searchDMVRecords(database, criteria);
      case "arrest":
        return this.searchArrestRecords(database, criteria);
      case "registry":
        return this.searchRegistryRecords(database, criteria);
      default:
        return [];
    }
  }

  private async searchCourtRecords(
    database: RecordDatabase,
    criteria: PersonSearchCriteria
  ): Promise<PublicRecord[]> {
    this.addMetric("court_searches", 1);
    // In production, query court records API
    return [];
  }

  private async searchPropertyRecords(
    database: RecordDatabase,
    criteria: PersonSearchCriteria
  ): Promise<PublicRecord[]> {
    this.addMetric("property_searches", 1);
    // In production, query property records API
    return [];
  }

  private async searchVitalRecords(
    database: RecordDatabase,
    criteria: PersonSearchCriteria
  ): Promise<PublicRecord[]> {
    this.addMetric("vital_searches", 1);
    // In production, query vital records API (birth, death, marriage)
    return [];
  }

  private async searchDMVRecords(
    database: RecordDatabase,
    criteria: PersonSearchCriteria
  ): Promise<PublicRecord[]> {
    this.addMetric("dmv_searches", 1);
    // In production, query DMV records with proper authorization
    return [];
  }

  private async searchArrestRecords(
    database: RecordDatabase,
    criteria: PersonSearchCriteria
  ): Promise<PublicRecord[]> {
    this.addMetric("arrest_searches", 1);
    // In production, query arrest/booking records
    return [];
  }

  private async searchRegistryRecords(
    database: RecordDatabase,
    criteria: PersonSearchCriteria
  ): Promise<PublicRecord[]> {
    this.addMetric("registry_searches", 1);
    // In production, query various registries
    return [];
  }

  private scoreMatches(
    criteria: PersonSearchCriteria,
    records: PublicRecord[]
  ): RecordMatch[] {
    const matches: RecordMatch[] = [];

    for (const record of records) {
      const matchedFields: string[] = [];
      let score = 0;

      // Name matching
      const nameScore = this.calculateNameScore(criteria, record);
      if (nameScore > 0) {
        score += nameScore * 40; // 40% weight for name
        matchedFields.push("name");
      }

      // DOB matching
      if (criteria.dateOfBirth && record.dateOfBirth) {
        if (criteria.dateOfBirth === record.dateOfBirth) {
          score += 30; // 30% weight for DOB
          matchedFields.push("dateOfBirth");
        }
      }

      // Address matching
      if (criteria.lastKnownAddress && record.address) {
        const addressScore = this.calculateAddressScore(
          criteria.lastKnownAddress,
          record.address
        );
        if (addressScore > 0) {
          score += addressScore * 20; // 20% weight for address
          matchedFields.push("address");
        }
      }

      // SSN matching (if authorized)
      if (criteria.ssn && record.ssn && criteria.ssn === record.ssn) {
        score = 100; // Definitive match
        matchedFields.push("ssn");
      }

      if (matchedFields.length > 0) {
        matches.push({
          record,
          matchScore: Math.min(100, score),
          matchedFields,
        });
      }
    }

    // Sort by score descending
    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }

  private calculateNameScore(
    criteria: PersonSearchCriteria,
    record: PublicRecord
  ): number {
    if (!record.firstName || !record.lastName) return 0;

    let score = 0;

    // Exact match
    if (
      criteria.firstName.toLowerCase() === record.firstName.toLowerCase() &&
      criteria.lastName.toLowerCase() === record.lastName.toLowerCase()
    ) {
      score = 1.0;
    } else {
      // Check aliases
      const allNames = [
        `${criteria.firstName} ${criteria.lastName}`,
        ...criteria.aliases,
      ].map((n) => n.toLowerCase());

      const recordName = `${record.firstName} ${record.lastName}`.toLowerCase();

      if (allNames.includes(recordName)) {
        score = 0.9;
      } else {
        // Partial match
        if (
          criteria.lastName.toLowerCase() === record.lastName.toLowerCase()
        ) {
          score = 0.5;
        }
      }
    }

    return score;
  }

  private calculateAddressScore(
    criteria: NonNullable<PersonSearchCriteria["lastKnownAddress"]>,
    recordAddress: { city?: string; state?: string; zip?: string }
  ): number {
    let score = 0;
    let matchCount = 0;

    if (criteria.state && recordAddress.state) {
      if (criteria.state.toLowerCase() === recordAddress.state.toLowerCase()) {
        score += 0.3;
        matchCount++;
      }
    }

    if (criteria.city && recordAddress.city) {
      if (criteria.city.toLowerCase() === recordAddress.city.toLowerCase()) {
        score += 0.4;
        matchCount++;
      }
    }

    if (criteria.zip && recordAddress.zip) {
      if (criteria.zip === recordAddress.zip) {
        score += 0.3;
        matchCount++;
      }
    }

    return matchCount > 0 ? score : 0;
  }

  private async storeRecord(
    caseId: string,
    match: RecordMatch
  ): Promise<void> {
    console.log(
      `[PublicRecordsCrawlerAgent] Storing record for case ${caseId} (score: ${match.matchScore})`
    );
    // Store in database and create lead
  }

  private async triggerAlert(
    caseId: string,
    match: RecordMatch
  ): Promise<void> {
    console.log(
      `[PublicRecordsCrawlerAgent] High-confidence record match for case ${caseId}`
    );
  }

  protected clone(config: AgentConfig): BaseAgent {
    return new PublicRecordsCrawlerAgent(config);
  }
}

export function createPublicRecordsCrawlerAgent(
  id: string,
  settings?: Partial<PublicRecordsCrawlerSettings>
): PublicRecordsCrawlerAgent {
  const defaultDatabases: RecordDatabase[] = [
    {
      id: "court_records",
      name: "Court Records",
      type: "court",
      apiUrl: "",
      enabled: false,
      jurisdiction: "federal",
    },
    {
      id: "property_records",
      name: "Property Records",
      type: "property",
      apiUrl: "",
      enabled: false,
    },
    {
      id: "arrest_records",
      name: "Arrest Records",
      type: "arrest",
      apiUrl: "",
      enabled: false,
    },
  ];

  const config: AgentConfig = {
    id,
    type: "public_records",
    name: "Public Records Crawler",
    enabled: true,
    schedule: "0 4 * * *", // Daily at 4 AM
    timeout: 1800000, // 30 minutes
    retryAttempts: 2,
    retryDelay: 120000,
    settings: {
      databases: defaultDatabases,
      maxRecordsPerRun: 100,
      matchThreshold: 60,
      recordTypes: ["court", "property", "vital", "arrest"],
      ...settings,
    },
  };

  return new PublicRecordsCrawlerAgent(config);
}
