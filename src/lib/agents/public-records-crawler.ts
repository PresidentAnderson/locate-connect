/**
 * Public Records Crawler Agent
 * Searches public records databases for information related to missing persons
 */

import { BaseAgent } from "./base-agent";
import { createClient } from "@/lib/supabase/server";
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
    this.settings = (config.settings as unknown) as PublicRecordsCrawlerSettings;
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
    const supabase = await createClient();

    // Query active cases with identity information
    // Only include cases where records search is authorized
    const { data: cases, error } = await supabase
      .from("case_reports")
      .select(`
        id,
        case_number,
        status,
        priority,
        settings,
        missing_person:missing_persons(
          first_name,
          last_name,
          middle_name,
          date_of_birth,
          aliases,
          ssn_last_four,
          last_seen_address,
          last_seen_city,
          last_seen_province,
          last_seen_postal
        )
      `)
      .in("status", ["open", "active"])
      .order("priority", { ascending: true })
      .limit(this.settings.maxRecordsPerRun);

    if (error || !cases) {
      console.error("[PublicRecordsCrawlerAgent] Error fetching cases:", error);
      return [];
    }

    const searchCriteria: PersonSearchCriteria[] = [];

    for (const caseData of cases) {
      const settings = caseData.settings as Record<string, unknown> | null;

      // Check if records search is authorized for this case
      const recordsSearchAuthorized = settings?.public_records_search_authorized === true;
      if (!recordsSearchAuthorized) continue;

      const missingPerson = caseData.missing_person as {
        first_name?: string;
        last_name?: string;
        middle_name?: string;
        date_of_birth?: string;
        aliases?: string[];
        ssn_last_four?: string;
        last_seen_address?: string;
        last_seen_city?: string;
        last_seen_province?: string;
        last_seen_postal?: string;
      } | null;

      // Must have at minimum first and last name
      if (!missingPerson?.first_name || !missingPerson?.last_name) continue;

      searchCriteria.push({
        caseId: caseData.id,
        firstName: missingPerson.first_name,
        lastName: missingPerson.last_name,
        middleName: missingPerson.middle_name,
        aliases: missingPerson.aliases || [],
        dateOfBirth: missingPerson.date_of_birth,
        // SSN is only used with proper authorization and partial match
        ssn: undefined, // Never pass full SSN
        lastKnownAddress: {
          street: missingPerson.last_seen_address,
          city: missingPerson.last_seen_city,
          state: missingPerson.last_seen_province,
          zip: missingPerson.last_seen_postal,
        },
      });
    }

    console.log(`[PublicRecordsCrawlerAgent] Found ${searchCriteria.length} cases eligible for records search`);
    return searchCriteria;
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

    if (!database.apiUrl || !database.apiKey) {
      console.log(`[PublicRecordsCrawlerAgent] Court records API not configured`);
      return [];
    }

    try {
      // Build search parameters
      const searchParams = new URLSearchParams({
        firstName: criteria.firstName,
        lastName: criteria.lastName,
        ...(criteria.middleName && { middleName: criteria.middleName }),
        ...(criteria.dateOfBirth && { dob: criteria.dateOfBirth }),
        ...(database.jurisdiction && { jurisdiction: database.jurisdiction }),
      });

      const response = await fetch(`${database.apiUrl}/search?${searchParams}`, {
        headers: {
          "Authorization": `Bearer ${database.apiKey}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        console.error(`[PublicRecordsCrawlerAgent] Court records API error: ${response.status}`);
        return [];
      }

      const data = await response.json() as {
        records?: Array<{
          case_id?: string;
          party_first_name?: string;
          party_last_name?: string;
          party_dob?: string;
          case_number?: string;
          case_type?: string;
          filing_date?: string;
          court_name?: string;
          status?: string;
          city?: string;
          state?: string;
        }>;
      };

      return (data.records || []).map((record) => ({
        id: record.case_id || crypto.randomUUID(),
        sourceId: database.id,
        recordType: "court" as const,
        firstName: record.party_first_name,
        lastName: record.party_last_name,
        dateOfBirth: record.party_dob,
        address: {
          city: record.city,
          state: record.state,
        },
        recordDate: record.filing_date || new Date().toISOString(),
        jurisdiction: record.court_name || database.jurisdiction,
        caseNumber: record.case_number,
        description: `${record.case_type || "Court case"} - ${record.status || "Unknown status"}`,
        status: record.status,
        fetchedAt: new Date().toISOString(),
      }));
    } catch (error) {
      console.error(`[PublicRecordsCrawlerAgent] Court records error:`, error);
      return [];
    }
  }

  private async searchPropertyRecords(
    database: RecordDatabase,
    criteria: PersonSearchCriteria
  ): Promise<PublicRecord[]> {
    this.addMetric("property_searches", 1);

    if (!database.apiUrl || !database.apiKey) {
      console.log(`[PublicRecordsCrawlerAgent] Property records API not configured`);
      return [];
    }

    try {
      // Property records search - by owner name and optional location
      const searchParams = new URLSearchParams({
        ownerFirstName: criteria.firstName,
        ownerLastName: criteria.lastName,
        ...(criteria.lastKnownAddress?.state && { state: criteria.lastKnownAddress.state }),
        ...(criteria.lastKnownAddress?.city && { city: criteria.lastKnownAddress.city }),
      });

      const response = await fetch(`${database.apiUrl}/search?${searchParams}`, {
        headers: {
          "Authorization": `Bearer ${database.apiKey}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        console.error(`[PublicRecordsCrawlerAgent] Property records API error: ${response.status}`);
        return [];
      }

      const data = await response.json() as {
        properties?: Array<{
          record_id?: string;
          owner_first_name?: string;
          owner_last_name?: string;
          property_address?: string;
          property_city?: string;
          property_state?: string;
          property_zip?: string;
          purchase_date?: string;
          sale_date?: string;
          property_type?: string;
          assessed_value?: number;
        }>;
      };

      return (data.properties || []).map((record) => ({
        id: record.record_id || crypto.randomUUID(),
        sourceId: database.id,
        recordType: "property" as const,
        firstName: record.owner_first_name,
        lastName: record.owner_last_name,
        address: {
          street: record.property_address,
          city: record.property_city,
          state: record.property_state,
          zip: record.property_zip,
        },
        recordDate: record.purchase_date || record.sale_date || new Date().toISOString(),
        description: `Property: ${record.property_type || "Unknown"} at ${record.property_address || "Unknown address"}`,
        status: record.sale_date ? "sold" : "owned",
        rawData: { assessed_value: record.assessed_value },
        fetchedAt: new Date().toISOString(),
      }));
    } catch (error) {
      console.error(`[PublicRecordsCrawlerAgent] Property records error:`, error);
      return [];
    }
  }

  private async searchVitalRecords(
    database: RecordDatabase,
    criteria: PersonSearchCriteria
  ): Promise<PublicRecord[]> {
    this.addMetric("vital_searches", 1);

    if (!database.apiUrl || !database.apiKey) {
      console.log(`[PublicRecordsCrawlerAgent] Vital records API not configured`);
      return [];
    }

    try {
      // Vital records search - birth, death, marriage records
      const searchParams = new URLSearchParams({
        firstName: criteria.firstName,
        lastName: criteria.lastName,
        ...(criteria.dateOfBirth && { dob: criteria.dateOfBirth }),
        ...(criteria.lastKnownAddress?.state && { state: criteria.lastKnownAddress.state }),
      });

      const response = await fetch(`${database.apiUrl}/search?${searchParams}`, {
        headers: {
          "Authorization": `Bearer ${database.apiKey}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        console.error(`[PublicRecordsCrawlerAgent] Vital records API error: ${response.status}`);
        return [];
      }

      const data = await response.json() as {
        records?: Array<{
          record_id?: string;
          type?: "birth" | "death" | "marriage";
          first_name?: string;
          last_name?: string;
          date_of_birth?: string;
          date_of_death?: string;
          date_of_event?: string;
          city?: string;
          state?: string;
          county?: string;
          certificate_number?: string;
          spouse_name?: string;
        }>;
      };

      return (data.records || []).map((record) => {
        let description = "";
        let recordDate = record.date_of_event || new Date().toISOString();

        switch (record.type) {
          case "birth":
            description = `Birth record - ${record.county || ""} County, ${record.state || ""}`;
            recordDate = record.date_of_birth || recordDate;
            break;
          case "death":
            description = `Death record - ${record.county || ""} County, ${record.state || ""}`;
            recordDate = record.date_of_death || recordDate;
            break;
          case "marriage":
            description = `Marriage record${record.spouse_name ? ` to ${record.spouse_name}` : ""} - ${record.county || ""} County`;
            break;
          default:
            description = `Vital record - ${record.state || ""}`;
        }

        return {
          id: record.record_id || crypto.randomUUID(),
          sourceId: database.id,
          recordType: "vital" as const,
          firstName: record.first_name,
          lastName: record.last_name,
          dateOfBirth: record.date_of_birth,
          address: {
            city: record.city,
            state: record.state,
          },
          recordDate,
          jurisdiction: `${record.county || ""} County, ${record.state || ""}`.trim(),
          caseNumber: record.certificate_number,
          description,
          rawData: { type: record.type, spouse_name: record.spouse_name },
          fetchedAt: new Date().toISOString(),
        };
      });
    } catch (error) {
      console.error(`[PublicRecordsCrawlerAgent] Vital records error:`, error);
      return [];
    }
  }

  private async searchDMVRecords(
    database: RecordDatabase,
    criteria: PersonSearchCriteria
  ): Promise<PublicRecord[]> {
    this.addMetric("dmv_searches", 1);

    // DMV records require special authorization - law enforcement only
    if (!database.apiUrl || !database.apiKey) {
      console.log(`[PublicRecordsCrawlerAgent] DMV records API not configured`);
      return [];
    }

    try {
      // DMV records search - requires proper authorization
      const searchParams = new URLSearchParams({
        firstName: criteria.firstName,
        lastName: criteria.lastName,
        ...(criteria.dateOfBirth && { dob: criteria.dateOfBirth }),
        ...(criteria.lastKnownAddress?.state && { state: criteria.lastKnownAddress.state }),
        // Purpose code for DPPA compliance
        purposeCode: "MISSING_PERSON_INVESTIGATION",
      });

      const response = await fetch(`${database.apiUrl}/search?${searchParams}`, {
        headers: {
          "Authorization": `Bearer ${database.apiKey}`,
          "Content-Type": "application/json",
          // Additional compliance headers
          "X-Agency-ID": process.env.AGENCY_ID || "",
          "X-Case-Reference": criteria.caseId,
        },
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        console.error(`[PublicRecordsCrawlerAgent] DMV records API error: ${response.status}`);
        return [];
      }

      const data = await response.json() as {
        records?: Array<{
          record_id?: string;
          first_name?: string;
          last_name?: string;
          middle_name?: string;
          date_of_birth?: string;
          license_number?: string;
          license_state?: string;
          license_status?: string;
          license_class?: string;
          address_line1?: string;
          address_city?: string;
          address_state?: string;
          address_zip?: string;
          issue_date?: string;
          expiration_date?: string;
          height?: string;
          weight?: string;
          eye_color?: string;
          hair_color?: string;
        }>;
      };

      return (data.records || []).map((record) => ({
        id: record.record_id || crypto.randomUUID(),
        sourceId: database.id,
        recordType: "dmv" as const,
        firstName: record.first_name,
        lastName: record.last_name,
        dateOfBirth: record.date_of_birth,
        address: {
          street: record.address_line1,
          city: record.address_city,
          state: record.address_state,
          zip: record.address_zip,
        },
        recordDate: record.issue_date || new Date().toISOString(),
        jurisdiction: record.license_state,
        caseNumber: record.license_number,
        description: `Driver's License (${record.license_class || "Unknown class"}) - ${record.license_status || "Unknown status"}`,
        status: record.license_status,
        rawData: {
          expiration_date: record.expiration_date,
          physical_description: {
            height: record.height,
            weight: record.weight,
            eye_color: record.eye_color,
            hair_color: record.hair_color,
          },
        },
        fetchedAt: new Date().toISOString(),
      }));
    } catch (error) {
      console.error(`[PublicRecordsCrawlerAgent] DMV records error:`, error);
      return [];
    }
  }

  private async searchArrestRecords(
    database: RecordDatabase,
    criteria: PersonSearchCriteria
  ): Promise<PublicRecord[]> {
    this.addMetric("arrest_searches", 1);

    if (!database.apiUrl || !database.apiKey) {
      console.log(`[PublicRecordsCrawlerAgent] Arrest records API not configured`);
      return [];
    }

    try {
      // Arrest/booking records search
      const searchParams = new URLSearchParams({
        firstName: criteria.firstName,
        lastName: criteria.lastName,
        ...(criteria.dateOfBirth && { dob: criteria.dateOfBirth }),
        ...(criteria.lastKnownAddress?.state && { state: criteria.lastKnownAddress.state }),
        ...(database.jurisdiction && { jurisdiction: database.jurisdiction }),
      });

      const response = await fetch(`${database.apiUrl}/search?${searchParams}`, {
        headers: {
          "Authorization": `Bearer ${database.apiKey}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        console.error(`[PublicRecordsCrawlerAgent] Arrest records API error: ${response.status}`);
        return [];
      }

      const data = await response.json() as {
        records?: Array<{
          booking_id?: string;
          inmate_first_name?: string;
          inmate_last_name?: string;
          inmate_dob?: string;
          booking_date?: string;
          release_date?: string;
          facility_name?: string;
          charges?: string[];
          booking_status?: string;
          city?: string;
          state?: string;
          mugshot_url?: string;
        }>;
      };

      return (data.records || []).map((record) => ({
        id: record.booking_id || crypto.randomUUID(),
        sourceId: database.id,
        recordType: "arrest" as const,
        firstName: record.inmate_first_name,
        lastName: record.inmate_last_name,
        dateOfBirth: record.inmate_dob,
        address: {
          city: record.city,
          state: record.state,
        },
        recordDate: record.booking_date || new Date().toISOString(),
        jurisdiction: record.facility_name || database.jurisdiction,
        description: `Booking at ${record.facility_name || "Unknown facility"} - Charges: ${(record.charges || []).join(", ") || "Unknown"}`,
        status: record.booking_status || (record.release_date ? "released" : "in custody"),
        rawData: {
          charges: record.charges,
          release_date: record.release_date,
          mugshot_url: record.mugshot_url,
        },
        fetchedAt: new Date().toISOString(),
      }));
    } catch (error) {
      console.error(`[PublicRecordsCrawlerAgent] Arrest records error:`, error);
      return [];
    }
  }

  private async searchRegistryRecords(
    database: RecordDatabase,
    criteria: PersonSearchCriteria
  ): Promise<PublicRecord[]> {
    this.addMetric("registry_searches", 1);

    if (!database.apiUrl || !database.apiKey) {
      console.log(`[PublicRecordsCrawlerAgent] Registry records API not configured`);
      return [];
    }

    try {
      // Various registry searches (voter, professional licenses, etc.)
      const searchParams = new URLSearchParams({
        firstName: criteria.firstName,
        lastName: criteria.lastName,
        ...(criteria.dateOfBirth && { dob: criteria.dateOfBirth }),
        ...(criteria.lastKnownAddress?.state && { state: criteria.lastKnownAddress.state }),
        ...(criteria.lastKnownAddress?.city && { city: criteria.lastKnownAddress.city }),
      });

      const response = await fetch(`${database.apiUrl}/search?${searchParams}`, {
        headers: {
          "Authorization": `Bearer ${database.apiKey}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        console.error(`[PublicRecordsCrawlerAgent] Registry records API error: ${response.status}`);
        return [];
      }

      const data = await response.json() as {
        records?: Array<{
          record_id?: string;
          registry_type?: string;
          first_name?: string;
          last_name?: string;
          date_of_birth?: string;
          registration_date?: string;
          expiration_date?: string;
          registration_number?: string;
          address_line1?: string;
          address_city?: string;
          address_state?: string;
          address_zip?: string;
          status?: string;
          additional_info?: Record<string, unknown>;
        }>;
      };

      return (data.records || []).map((record) => ({
        id: record.record_id || crypto.randomUUID(),
        sourceId: database.id,
        recordType: "registry" as const,
        firstName: record.first_name,
        lastName: record.last_name,
        dateOfBirth: record.date_of_birth,
        address: {
          street: record.address_line1,
          city: record.address_city,
          state: record.address_state,
          zip: record.address_zip,
        },
        recordDate: record.registration_date || new Date().toISOString(),
        jurisdiction: record.address_state,
        caseNumber: record.registration_number,
        description: `${record.registry_type || "Registry"} record - ${record.status || "Unknown status"}`,
        status: record.status,
        rawData: {
          registry_type: record.registry_type,
          expiration_date: record.expiration_date,
          ...record.additional_info,
        },
        fetchedAt: new Date().toISOString(),
      }));
    } catch (error) {
      console.error(`[PublicRecordsCrawlerAgent] Registry records error:`, error);
      return [];
    }
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
    const supabase = await createClient();
    const { record, matchScore, matchedFields } = match;

    console.log(
      `[PublicRecordsCrawlerAgent] Storing record for case ${caseId} (score: ${matchScore})`
    );

    try {
      // Check if record already exists (by source ID and record ID)
      const { data: existing } = await supabase
        .from("public_records")
        .select("id")
        .eq("source_id", record.sourceId)
        .eq("external_record_id", record.id)
        .single();

      let recordId: string;

      if (existing) {
        // Update existing record
        await supabase
          .from("public_records")
          .update({
            data: record.rawData,
            fetched_at: record.fetchedAt,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        recordId = existing.id;
      } else {
        // Insert new record
        const { data: newRecord, error: insertError } = await supabase
          .from("public_records")
          .insert({
            source_id: record.sourceId,
            external_record_id: record.id,
            record_type: record.recordType,
            first_name: record.firstName,
            last_name: record.lastName,
            date_of_birth: record.dateOfBirth,
            address_street: record.address?.street,
            address_city: record.address?.city,
            address_state: record.address?.state,
            address_zip: record.address?.zip,
            record_date: record.recordDate,
            jurisdiction: record.jurisdiction,
            case_number: record.caseNumber,
            description: record.description,
            status: record.status,
            data: record.rawData,
            fetched_at: record.fetchedAt,
          })
          .select("id")
          .single();

        if (insertError) {
          console.error("[PublicRecordsCrawlerAgent] Error storing record:", insertError);
          return;
        }
        recordId = newRecord.id;
      }

      // Link record to case with match score
      await supabase.from("case_public_records").upsert(
        {
          case_id: caseId,
          public_record_id: recordId,
          match_score: matchScore,
          matched_fields: matchedFields,
        },
        { onConflict: "case_id,public_record_id" }
      );

      // Create a lead for high-confidence matches
      if (matchScore >= 60) {
        const recordTypeLabels: Record<string, string> = {
          court: "Court Record",
          property: "Property Record",
          vital: "Vital Record",
          dmv: "DMV Record",
          arrest: "Arrest Record",
          registry: "Registry Record",
        };

        await supabase.from("leads").insert({
          case_id: caseId,
          source_type: "public_record",
          source_id: recordId,
          title: `${recordTypeLabels[record.recordType] || "Public Record"}: ${record.firstName} ${record.lastName}`,
          description: `Found matching ${record.recordType} record with ${matchScore}% confidence. ${record.description || ""}`,
          priority: matchScore >= 85 ? "high" : matchScore >= 70 ? "medium" : "low",
          status: "new",
          submitted_by: "system",
          metadata: {
            record_type: record.recordType,
            match_score: matchScore,
            matched_fields: matchedFields,
            record_date: record.recordDate,
            jurisdiction: record.jurisdiction,
          },
        });
      }
    } catch (error) {
      console.error("[PublicRecordsCrawlerAgent] Error storing record:", error);
    }
  }

  private async triggerAlert(
    caseId: string,
    match: RecordMatch
  ): Promise<void> {
    const supabase = await createClient();
    const { record, matchScore, matchedFields } = match;

    console.log(
      `[PublicRecordsCrawlerAgent] High-confidence record match for case ${caseId}`
    );

    try {
      // Get case details for notification
      const { data: caseData } = await supabase
        .from("case_reports")
        .select("case_number, assigned_to")
        .eq("id", caseId)
        .single();

      if (!caseData) return;

      const recordTypeLabels: Record<string, string> = {
        court: "Court Record",
        property: "Property Record",
        vital: "Vital Record",
        dmv: "DMV Record",
        arrest: "Arrest/Booking Record",
        registry: "Registry Record",
      };

      const alertTitle = `High-Confidence ${recordTypeLabels[record.recordType] || "Public Record"} Match`;
      const alertMessage = `A ${recordTypeLabels[record.recordType]?.toLowerCase() || "public record"} for "${record.firstName} ${record.lastName}" was found with ${matchScore}% confidence for case ${caseData.case_number}. Matched fields: ${matchedFields.join(", ")}.`;

      // Create notification for assigned investigator
      if (caseData.assigned_to) {
        await supabase.from("notifications").insert({
          user_id: caseData.assigned_to,
          type: "public_record_alert",
          title: alertTitle,
          message: alertMessage,
          data: {
            case_id: caseId,
            case_number: caseData.case_number,
            record_type: record.recordType,
            record_id: record.id,
            match_score: matchScore,
            matched_fields: matchedFields,
            description: record.description,
            jurisdiction: record.jurisdiction,
          },
          priority: "high",
        });
      }

      // Log to case activity
      await supabase.from("case_activity").insert({
        case_id: caseId,
        activity_type: "public_record_match",
        description: `High-confidence ${record.recordType} record match found (${matchScore}% confidence)`,
        metadata: {
          record_type: record.recordType,
          match_score: matchScore,
          matched_fields: matchedFields,
          record_date: record.recordDate,
          jurisdiction: record.jurisdiction,
          description: record.description,
        },
      });

      // For arrest records with "in custody" status, create urgent alert
      if (record.recordType === "arrest" && record.status === "in custody") {
        // Get all users with investigator role for urgent alerts
        const { data: investigators } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "investigator");

        if (investigators?.length) {
          const urgentNotifications = investigators.map((inv) => ({
            user_id: inv.user_id,
            type: "urgent_public_record",
            title: "URGENT: Person Potentially Located in Custody",
            message: `Missing person from case ${caseData.case_number} may be currently in custody at ${record.jurisdiction || "unknown facility"}. Immediate verification recommended.`,
            data: {
              case_id: caseId,
              case_number: caseData.case_number,
              record_type: record.recordType,
              jurisdiction: record.jurisdiction,
              status: record.status,
            },
            priority: "urgent",
          }));

          await supabase.from("notifications").insert(urgentNotifications);
        }
      }

      // For vital records with death record type, create urgent alert
      if (record.recordType === "vital" && record.rawData?.type === "death") {
        // Notify case supervisor
        await supabase.from("case_activity").insert({
          case_id: caseId,
          activity_type: "vital_record_death_match",
          description: `URGENT: Death record match found - requires immediate verification`,
          metadata: {
            record_type: "vital",
            vital_type: "death",
            match_score: matchScore,
            jurisdiction: record.jurisdiction,
          },
        });
      }
    } catch (error) {
      console.error("[PublicRecordsCrawlerAgent] Error triggering alert:", error);
    }
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
