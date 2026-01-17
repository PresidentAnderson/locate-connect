/**
 * Volunteer Network Service
 * Coordinates volunteers across the network
 */

import type {
  VolunteerProfile,
  VolunteerAvailability,
  VolunteerOpportunity,
  SupportedLanguage,
} from "@/types/compliance.types";

class VolunteerNetworkService {
  private volunteers: Map<string, VolunteerProfile> = new Map();
  private opportunities: Map<string, VolunteerOpportunity> = new Map();

  /**
   * Register a volunteer
   */
  async registerVolunteer(input: {
    userId?: string;
    name: string;
    email: string;
    phone: string;
    location: VolunteerProfile["location"];
    skills?: string[];
    languages?: SupportedLanguage[];
    availability: VolunteerAvailability;
    searchRadius?: number;
  }): Promise<VolunteerProfile> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const profile: VolunteerProfile = {
      id,
      userId: input.userId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      location: input.location,
      skills: input.skills || [],
      languages: input.languages || ["en"],
      availability: input.availability,
      searchRadius: input.searchRadius || 50,
      verified: false,
      searchPartiesJoined: 0,
      hoursVolunteered: 0,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };

    this.volunteers.set(id, profile);
    console.log(`[VolunteerNetwork] Registered volunteer: ${input.name}`);

    return profile;
  }

  /**
   * Get volunteer profile
   */
  getVolunteer(volunteerId: string): VolunteerProfile | null {
    return this.volunteers.get(volunteerId) || null;
  }

  /**
   * Update volunteer profile
   */
  async updateVolunteer(
    volunteerId: string,
    updates: Partial<
      Pick<
        VolunteerProfile,
        "name" | "phone" | "location" | "skills" | "languages" | "availability" | "searchRadius"
      >
    >
  ): Promise<VolunteerProfile | null> {
    const profile = this.volunteers.get(volunteerId);
    if (!profile) return null;

    Object.assign(profile, updates);
    profile.updatedAt = new Date().toISOString();
    this.volunteers.set(volunteerId, profile);

    return profile;
  }

  /**
   * Verify volunteer (after background check)
   */
  async verifyVolunteer(
    volunteerId: string,
    backgroundCheckStatus: "passed" | "failed"
  ): Promise<boolean> {
    const profile = this.volunteers.get(volunteerId);
    if (!profile) return false;

    profile.verified = backgroundCheckStatus === "passed";
    profile.verifiedAt = new Date().toISOString();
    profile.backgroundCheck = {
      status: backgroundCheckStatus,
      completedAt: new Date().toISOString(),
    };
    profile.updatedAt = new Date().toISOString();

    this.volunteers.set(volunteerId, profile);
    return true;
  }

  /**
   * Update volunteer status
   */
  async updateStatus(
    volunteerId: string,
    status: VolunteerProfile["status"]
  ): Promise<boolean> {
    const profile = this.volunteers.get(volunteerId);
    if (!profile) return false;

    profile.status = status;
    profile.updatedAt = new Date().toISOString();
    this.volunteers.set(volunteerId, profile);

    return true;
  }

  /**
   * Search for volunteers by criteria
   */
  searchVolunteers(criteria: {
    location?: { lat: number; lng: number };
    radius?: number;
    skills?: string[];
    languages?: SupportedLanguage[];
    availableNow?: boolean;
    verifiedOnly?: boolean;
  }): VolunteerProfile[] {
    let volunteers = Array.from(this.volunteers.values()).filter(
      (v) => v.status === "active"
    );

    if (criteria.verifiedOnly) {
      volunteers = volunteers.filter((v) => v.verified);
    }

    if (criteria.location && criteria.radius) {
      volunteers = volunteers.filter((v) => {
        if (!v.location.coordinates) return false;
        const distance = this.calculateDistance(
          criteria.location!,
          v.location.coordinates
        );
        return distance <= (criteria.radius || 50);
      });
    }

    if (criteria.skills && criteria.skills.length > 0) {
      volunteers = volunteers.filter((v) =>
        criteria.skills!.some((s) => v.skills.includes(s))
      );
    }

    if (criteria.languages && criteria.languages.length > 0) {
      volunteers = volunteers.filter((v) =>
        criteria.languages!.some((l) => v.languages.includes(l))
      );
    }

    if (criteria.availableNow) {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const hour = now.getHours();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isEvening = hour >= 18;

      volunteers = volunteers.filter((v) => {
        if (v.availability.onCall) return true;
        if (isWeekend && v.availability.weekends) return true;
        if (isEvening && v.availability.evenings) return true;
        if (!isWeekend && !isEvening && v.availability.weekdays) return true;
        if (v.availability.specificDays?.includes(dayOfWeek)) return true;
        return false;
      });
    }

    return volunteers;
  }

  /**
   * Create volunteer opportunity
   */
  async createOpportunity(
    input: Omit<VolunteerOpportunity, "id" | "volunteersRegistered" | "status" | "createdAt">
  ): Promise<VolunteerOpportunity> {
    const id = crypto.randomUUID();

    const opportunity: VolunteerOpportunity = {
      ...input,
      id,
      volunteersRegistered: 0,
      status: "open",
      createdAt: new Date().toISOString(),
    };

    this.opportunities.set(id, opportunity);
    console.log(`[VolunteerNetwork] Created opportunity: ${input.title}`);

    // Notify matching volunteers
    await this.notifyMatchingVolunteers(opportunity);

    return opportunity;
  }

  /**
   * Get opportunity
   */
  getOpportunity(opportunityId: string): VolunteerOpportunity | null {
    return this.opportunities.get(opportunityId) || null;
  }

  /**
   * List opportunities
   */
  listOpportunities(filters?: {
    caseId?: string;
    type?: VolunteerOpportunity["type"];
    status?: VolunteerOpportunity["status"];
    location?: { lat: number; lng: number };
    radius?: number;
  }): VolunteerOpportunity[] {
    let opportunities = Array.from(this.opportunities.values());

    if (filters?.caseId) {
      opportunities = opportunities.filter((o) => o.caseId === filters.caseId);
    }

    if (filters?.type) {
      opportunities = opportunities.filter((o) => o.type === filters.type);
    }

    if (filters?.status) {
      opportunities = opportunities.filter((o) => o.status === filters.status);
    }

    if (filters?.location && filters?.radius) {
      opportunities = opportunities.filter((o) => {
        const distance = this.calculateDistance(
          filters.location!,
          o.location.coordinates
        );
        return distance <= filters.radius!;
      });
    }

    return opportunities.sort(
      (a, b) =>
        new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
    );
  }

  /**
   * Register volunteer for opportunity
   */
  async registerForOpportunity(
    volunteerId: string,
    opportunityId: string
  ): Promise<boolean> {
    const opportunity = this.opportunities.get(opportunityId);
    const volunteer = this.volunteers.get(volunteerId);

    if (!opportunity || !volunteer) return false;
    if (opportunity.status !== "open") return false;
    if (opportunity.volunteersRegistered >= opportunity.volunteersNeeded) {
      opportunity.status = "full";
      this.opportunities.set(opportunityId, opportunity);
      return false;
    }

    opportunity.volunteersRegistered++;
    if (opportunity.volunteersRegistered >= opportunity.volunteersNeeded) {
      opportunity.status = "full";
    }

    this.opportunities.set(opportunityId, opportunity);

    console.log(
      `[VolunteerNetwork] ${volunteer.name} registered for ${opportunity.title}`
    );
    return true;
  }

  /**
   * Record volunteer hours
   */
  async recordHours(
    volunteerId: string,
    hours: number,
    opportunityId?: string
  ): Promise<boolean> {
    const volunteer = this.volunteers.get(volunteerId);
    if (!volunteer) return false;

    volunteer.hoursVolunteered += hours;
    if (opportunityId) {
      volunteer.searchPartiesJoined++;
    }
    volunteer.updatedAt = new Date().toISOString();

    this.volunteers.set(volunteerId, volunteer);
    return true;
  }

  /**
   * Rate volunteer
   */
  async rateVolunteer(
    volunteerId: string,
    rating: number
  ): Promise<boolean> {
    const volunteer = this.volunteers.get(volunteerId);
    if (!volunteer) return false;

    // Running average
    if (volunteer.rating) {
      volunteer.rating = (volunteer.rating + rating) / 2;
    } else {
      volunteer.rating = rating;
    }

    this.volunteers.set(volunteerId, volunteer);
    return true;
  }

  /**
   * Get volunteer statistics
   */
  getStatistics(): {
    totalVolunteers: number;
    verifiedVolunteers: number;
    activeVolunteers: number;
    totalHoursVolunteered: number;
    opportunitiesOpen: number;
    opportunitiesCompleted: number;
  } {
    const volunteers = Array.from(this.volunteers.values());
    const opportunities = Array.from(this.opportunities.values());

    return {
      totalVolunteers: volunteers.length,
      verifiedVolunteers: volunteers.filter((v) => v.verified).length,
      activeVolunteers: volunteers.filter((v) => v.status === "active").length,
      totalHoursVolunteered: volunteers.reduce(
        (sum, v) => sum + v.hoursVolunteered,
        0
      ),
      opportunitiesOpen: opportunities.filter((o) => o.status === "open").length,
      opportunitiesCompleted: opportunities.filter((o) => o.status === "completed")
        .length,
    };
  }

  /**
   * Calculate distance between two coordinates (km)
   */
  private calculateDistance(
    a: { lat: number; lng: number },
    b: { lat: number; lng: number }
  ): number {
    const R = 6371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLon = ((b.lng - a.lng) * Math.PI) / 180;
    const lat1 = (a.lat * Math.PI) / 180;
    const lat2 = (b.lat * Math.PI) / 180;

    const x =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));

    return R * c;
  }

  /**
   * Notify matching volunteers of new opportunity
   */
  private async notifyMatchingVolunteers(
    opportunity: VolunteerOpportunity
  ): Promise<void> {
    const matching = this.searchVolunteers({
      location: opportunity.location.coordinates,
      radius: 100,
      skills: opportunity.skills,
      languages: opportunity.languages,
      verifiedOnly: true,
    });

    console.log(
      `[VolunteerNetwork] Notifying ${matching.length} volunteers of opportunity`
    );
    // Would send notifications
  }
}

export const volunteerNetworkService = new VolunteerNetworkService();
