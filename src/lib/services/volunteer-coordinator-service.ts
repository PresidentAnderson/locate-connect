/**
 * Volunteer Search Party Coordinator Service
 * Manages volunteer search parties, registrations, and findings
 */

import type {
  SearchParty,
  SearchSector,
  SearchVolunteer,
  SearchFinding,
} from "@/types/law-enforcement.types";

export interface CreateSearchPartyInput {
  caseId: string;
  name: string;
  searchArea: {
    type: "polygon" | "grid";
    geometry: Array<{ lat: number; lng: number }>;
  };
  scheduledStart: string;
  scheduledEnd: string;
  meetingPoint: {
    address: string;
    lat: number;
    lng: number;
    instructions?: string;
  };
  maxVolunteers: number;
  requiredEquipment?: string[];
  providedEquipment?: string[];
  safetyBriefing: string;
  emergencyContact: string;
}

export interface RegisterVolunteerInput {
  name: string;
  email: string;
  phone: string;
  certifications?: string[];
  notes?: string;
}

export interface ReportFindingInput {
  searchPartyId: string;
  sectorId?: string;
  type: "person_sighting" | "evidence" | "poi" | "other";
  description: string;
  location: {
    lat: number;
    lng: number;
    accuracy?: number;
  };
  photos?: string[];
  followUpRequired?: boolean;
}

class VolunteerCoordinatorService {
  private searchParties: Map<string, SearchParty> = new Map();

  /**
   * Create a new search party
   */
  async createSearchParty(
    input: CreateSearchPartyInput,
    coordinatorId: string,
    coordinatorName: string
  ): Promise<SearchParty> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    // Generate sectors if grid type
    const sectors: SearchSector[] =
      input.searchArea.type === "grid"
        ? this.generateGridSectors(input.searchArea.geometry)
        : [];

    const searchParty: SearchParty = {
      id,
      caseId: input.caseId,
      name: input.name,
      status: "planning",
      searchArea: {
        ...input.searchArea,
        sectors,
      },
      scheduledStart: input.scheduledStart,
      scheduledEnd: input.scheduledEnd,
      coordinatorId,
      coordinatorName,
      volunteers: [],
      maxVolunteers: input.maxVolunteers,
      meetingPoint: input.meetingPoint,
      requiredEquipment: input.requiredEquipment || [],
      providedEquipment: input.providedEquipment || [],
      safetyBriefing: input.safetyBriefing,
      emergencyContact: input.emergencyContact,
      findings: [],
      createdAt: now,
      updatedAt: now,
    };

    this.searchParties.set(id, searchParty);
    console.log(`[VolunteerService] Created search party ${id} for case ${input.caseId}`);
    return searchParty;
  }

  /**
   * Get search party by ID
   */
  async getSearchParty(partyId: string): Promise<SearchParty | null> {
    return this.searchParties.get(partyId) || null;
  }

  /**
   * List search parties for a case
   */
  async listSearchParties(caseId: string): Promise<SearchParty[]> {
    return Array.from(this.searchParties.values())
      .filter((sp) => sp.caseId === caseId)
      .sort(
        (a, b) =>
          new Date(b.scheduledStart).getTime() -
          new Date(a.scheduledStart).getTime()
      );
  }

  /**
   * Update search party status
   */
  async updateStatus(
    partyId: string,
    status: SearchParty["status"]
  ): Promise<SearchParty | null> {
    const party = this.searchParties.get(partyId);
    if (!party) return null;

    const now = new Date().toISOString();
    party.status = status;
    party.updatedAt = now;

    if (status === "active" && !party.actualStart) {
      party.actualStart = now;
    }

    if (status === "completed" || status === "cancelled") {
      party.actualEnd = now;
    }

    this.searchParties.set(partyId, party);
    return party;
  }

  /**
   * Register a volunteer
   */
  async registerVolunteer(
    partyId: string,
    input: RegisterVolunteerInput,
    userId?: string
  ): Promise<SearchVolunteer | null> {
    const party = this.searchParties.get(partyId);
    if (!party) return null;

    if (party.volunteers.length >= party.maxVolunteers) {
      throw new Error("Search party is at maximum capacity");
    }

    // Check for duplicate email
    if (party.volunteers.some((v) => v.email === input.email)) {
      throw new Error("Volunteer already registered");
    }

    const volunteer: SearchVolunteer = {
      id: crypto.randomUUID(),
      userId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      status: "registered",
      certifications: input.certifications,
      notes: input.notes,
    };

    party.volunteers.push(volunteer);
    party.updatedAt = new Date().toISOString();
    this.searchParties.set(partyId, party);

    console.log(`[VolunteerService] Registered volunteer ${volunteer.name} for party ${partyId}`);
    return volunteer;
  }

  /**
   * Check in a volunteer
   */
  async checkInVolunteer(
    partyId: string,
    volunteerId: string
  ): Promise<boolean> {
    const party = this.searchParties.get(partyId);
    if (!party) return false;

    const volunteer = party.volunteers.find((v) => v.id === volunteerId);
    if (!volunteer) return false;

    volunteer.status = "checked_in";
    volunteer.checkedInAt = new Date().toISOString();

    this.searchParties.set(partyId, party);
    return true;
  }

  /**
   * Check out a volunteer
   */
  async checkOutVolunteer(
    partyId: string,
    volunteerId: string
  ): Promise<boolean> {
    const party = this.searchParties.get(partyId);
    if (!party) return false;

    const volunteer = party.volunteers.find((v) => v.id === volunteerId);
    if (!volunteer) return false;

    volunteer.status = "checked_out";
    volunteer.checkedOutAt = new Date().toISOString();

    this.searchParties.set(partyId, party);
    return true;
  }

  /**
   * Assign volunteer to team/sector
   */
  async assignVolunteer(
    partyId: string,
    volunteerId: string,
    teamAssignment?: string,
    sectorAssignment?: string
  ): Promise<boolean> {
    const party = this.searchParties.get(partyId);
    if (!party) return false;

    const volunteer = party.volunteers.find((v) => v.id === volunteerId);
    if (!volunteer) return false;

    volunteer.teamAssignment = teamAssignment;
    volunteer.sectorAssignment = sectorAssignment;
    volunteer.status = "active";

    // Update sector status if assigned
    if (sectorAssignment) {
      const sector = party.searchArea.sectors?.find(
        (s) => s.id === sectorAssignment
      );
      if (sector) {
        sector.status = "assigned";
        sector.assignedTeam = teamAssignment;
      }
    }

    this.searchParties.set(partyId, party);
    return true;
  }

  /**
   * Report a finding
   */
  async reportFinding(
    input: ReportFindingInput,
    reportedBy: string
  ): Promise<SearchFinding | null> {
    const party = this.searchParties.get(input.searchPartyId);
    if (!party) return null;

    const finding: SearchFinding = {
      id: crypto.randomUUID(),
      searchPartyId: input.searchPartyId,
      sectorId: input.sectorId,
      reportedBy,
      timestamp: new Date().toISOString(),
      type: input.type,
      description: input.description,
      location: input.location,
      photos: input.photos || [],
      verified: false,
      followUpRequired: input.followUpRequired ?? input.type !== "other",
    };

    party.findings.push(finding);
    party.updatedAt = new Date().toISOString();

    // Update sector findings
    if (input.sectorId) {
      const sector = party.searchArea.sectors?.find(
        (s) => s.id === input.sectorId
      );
      if (sector) {
        sector.findings.push(finding.description);
      }
    }

    this.searchParties.set(input.searchPartyId, party);

    // Alert on critical findings
    if (input.type === "person_sighting" || input.type === "evidence") {
      await this.alertOnCriticalFinding(party, finding);
    }

    console.log(`[VolunteerService] Finding reported: ${input.type}`);
    return finding;
  }

  /**
   * Verify a finding
   */
  async verifyFinding(
    partyId: string,
    findingId: string,
    verifiedBy: string,
    followUpNotes?: string
  ): Promise<boolean> {
    const party = this.searchParties.get(partyId);
    if (!party) return false;

    const finding = party.findings.find((f) => f.id === findingId);
    if (!finding) return false;

    finding.verified = true;
    finding.verifiedBy = verifiedBy;
    if (followUpNotes) {
      finding.followUpNotes = followUpNotes;
    }

    this.searchParties.set(partyId, party);
    return true;
  }

  /**
   * Mark sector as completed
   */
  async completeSector(
    partyId: string,
    sectorId: string
  ): Promise<boolean> {
    const party = this.searchParties.get(partyId);
    if (!party) return false;

    const sector = party.searchArea.sectors?.find((s) => s.id === sectorId);
    if (!sector) return false;

    sector.status = "completed";
    sector.completedAt = new Date().toISOString();

    this.searchParties.set(partyId, party);
    return true;
  }

  /**
   * Get search party statistics
   */
  async getStatistics(partyId: string): Promise<{
    totalVolunteers: number;
    checkedIn: number;
    active: number;
    checkedOut: number;
    totalSectors: number;
    completedSectors: number;
    findings: number;
    verifiedFindings: number;
    criticalFindings: number;
  } | null> {
    const party = this.searchParties.get(partyId);
    if (!party) return null;

    const volunteers = party.volunteers;
    const sectors = party.searchArea.sectors || [];
    const findings = party.findings;

    return {
      totalVolunteers: volunteers.length,
      checkedIn: volunteers.filter((v) => v.status === "checked_in").length,
      active: volunteers.filter((v) => v.status === "active").length,
      checkedOut: volunteers.filter((v) => v.status === "checked_out").length,
      totalSectors: sectors.length,
      completedSectors: sectors.filter((s) => s.status === "completed").length,
      findings: findings.length,
      verifiedFindings: findings.filter((f) => f.verified).length,
      criticalFindings: findings.filter(
        (f) => f.type === "person_sighting" || f.type === "evidence"
      ).length,
    };
  }

  /**
   * Generate grid sectors from polygon
   */
  private generateGridSectors(
    polygon: Array<{ lat: number; lng: number }>
  ): SearchSector[] {
    const sectors: SearchSector[] = [];

    // Calculate bounding box
    const lats = polygon.map((p) => p.lat);
    const lngs = polygon.map((p) => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // Create 4x4 grid
    const latStep = (maxLat - minLat) / 4;
    const lngStep = (maxLng - minLng) / 4;

    let priority = 1;
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const sectorGeometry = [
          { lat: minLat + i * latStep, lng: minLng + j * lngStep },
          { lat: minLat + (i + 1) * latStep, lng: minLng + j * lngStep },
          { lat: minLat + (i + 1) * latStep, lng: minLng + (j + 1) * lngStep },
          { lat: minLat + i * latStep, lng: minLng + (j + 1) * lngStep },
        ];

        sectors.push({
          id: crypto.randomUUID(),
          name: `Sector ${String.fromCharCode(65 + i)}${j + 1}`,
          geometry: sectorGeometry,
          priority: priority++,
          status: "unassigned",
          findings: [],
        });
      }
    }

    return sectors;
  }

  /**
   * Alert on critical finding
   */
  private async alertOnCriticalFinding(
    party: SearchParty,
    finding: SearchFinding
  ): Promise<void> {
    console.log(
      `[VolunteerService] CRITICAL FINDING in party ${party.name}: ${finding.type}`
    );
    // Would send notifications to coordinator, law enforcement, etc.
  }

  /**
   * Get upcoming search parties
   */
  async getUpcomingSearchParties(): Promise<SearchParty[]> {
    const now = new Date();
    return Array.from(this.searchParties.values())
      .filter(
        (sp) =>
          sp.status === "planning" && new Date(sp.scheduledStart) > now
      )
      .sort(
        (a, b) =>
          new Date(a.scheduledStart).getTime() -
          new Date(b.scheduledStart).getTime()
      );
  }

  /**
   * Get active search parties
   */
  async getActiveSearchParties(): Promise<SearchParty[]> {
    return Array.from(this.searchParties.values()).filter(
      (sp) => sp.status === "active"
    );
  }
}

export const volunteerCoordinatorService = new VolunteerCoordinatorService();
