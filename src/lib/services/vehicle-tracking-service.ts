/**
 * Vehicle Tracking Service
 * Manages vehicle records, license plate tracking, and sightings
 */

import type {
  VehicleRecord,
  VehicleSighting,
  VehicleAlert,
} from "@/types/law-enforcement.types";

export interface CreateVehicleInput {
  caseId: string;
  licensePlate: string;
  state?: string;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  vin?: string;
  ownerName?: string;
  isTarget?: boolean;
}

export interface ReportSightingInput {
  vehicleId: string;
  source: "lpr" | "manual" | "tip" | "camera";
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  timestamp?: string;
  confidence?: number;
  imageUrl?: string;
  reportedBy?: string;
}

export interface CreateAlertInput {
  vehicleId: string;
  type: "bolo" | "stolen" | "amber" | "custom";
  description: string;
  expiresAt?: string;
}

class VehicleTrackingService {
  private vehicles: Map<string, VehicleRecord> = new Map();

  /**
   * Create or update a vehicle record
   */
  async createVehicle(
    input: CreateVehicleInput,
    userId: string
  ): Promise<VehicleRecord> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const vehicle: VehicleRecord = {
      id,
      caseId: input.caseId,
      licensePlate: input.licensePlate.toUpperCase().replace(/\s/g, ""),
      state: input.state?.toUpperCase(),
      make: input.make,
      model: input.model,
      year: input.year,
      color: input.color,
      vin: input.vin?.toUpperCase(),
      ownerName: input.ownerName,
      isTarget: input.isTarget ?? false,
      alerts: [],
      sightings: [],
      createdAt: now,
      updatedAt: now,
    };

    this.vehicles.set(id, vehicle);
    console.log(
      `[VehicleService] Created vehicle ${id}: ${vehicle.licensePlate}`
    );
    return vehicle;
  }

  /**
   * Get vehicle by ID
   */
  async getVehicle(vehicleId: string): Promise<VehicleRecord | null> {
    return this.vehicles.get(vehicleId) || null;
  }

  /**
   * Find vehicle by license plate
   */
  async findByPlate(
    licensePlate: string,
    state?: string
  ): Promise<VehicleRecord | null> {
    const normalized = licensePlate.toUpperCase().replace(/\s/g, "");
    const vehicles = Array.from(this.vehicles.values());

    return (
      vehicles.find(
        (v) =>
          v.licensePlate === normalized &&
          (!state || v.state === state.toUpperCase())
      ) || null
    );
  }

  /**
   * List vehicles for a case
   */
  async listVehicles(caseId: string): Promise<VehicleRecord[]> {
    return Array.from(this.vehicles.values()).filter(
      (v) => v.caseId === caseId
    );
  }

  /**
   * Update vehicle record
   */
  async updateVehicle(
    vehicleId: string,
    updates: Partial<
      Pick<
        VehicleRecord,
        "make" | "model" | "year" | "color" | "vin" | "ownerName" | "isTarget"
      >
    >
  ): Promise<VehicleRecord | null> {
    const vehicle = this.vehicles.get(vehicleId);
    if (!vehicle) return null;

    Object.assign(vehicle, updates);
    vehicle.updatedAt = new Date().toISOString();

    this.vehicles.set(vehicleId, vehicle);
    return vehicle;
  }

  /**
   * Delete vehicle record
   */
  async deleteVehicle(vehicleId: string): Promise<boolean> {
    return this.vehicles.delete(vehicleId);
  }

  /**
   * Report a vehicle sighting
   */
  async reportSighting(input: ReportSightingInput): Promise<VehicleSighting> {
    const vehicle = this.vehicles.get(input.vehicleId);
    if (!vehicle) {
      throw new Error("Vehicle not found");
    }

    const sighting: VehicleSighting = {
      id: crypto.randomUUID(),
      vehicleId: input.vehicleId,
      source: input.source,
      location: input.location,
      timestamp: input.timestamp || new Date().toISOString(),
      confidence: input.confidence ?? (input.source === "lpr" ? 95 : 70),
      imageUrl: input.imageUrl,
      reportedBy: input.reportedBy,
      verified: input.source === "lpr",
    };

    vehicle.sightings.push(sighting);
    vehicle.updatedAt = new Date().toISOString();
    this.vehicles.set(input.vehicleId, vehicle);

    // Check if any alerts should be triggered
    await this.checkAlerts(vehicle, sighting);

    console.log(
      `[VehicleService] Sighting reported for ${vehicle.licensePlate}`
    );
    return sighting;
  }

  /**
   * Get sightings for a vehicle
   */
  async getSightings(
    vehicleId: string,
    limit = 50
  ): Promise<VehicleSighting[]> {
    const vehicle = this.vehicles.get(vehicleId);
    if (!vehicle) return [];

    return vehicle.sightings
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, limit);
  }

  /**
   * Verify a sighting
   */
  async verifySighting(
    vehicleId: string,
    sightingId: string,
    verified: boolean
  ): Promise<boolean> {
    const vehicle = this.vehicles.get(vehicleId);
    if (!vehicle) return false;

    const sighting = vehicle.sightings.find((s) => s.id === sightingId);
    if (!sighting) return false;

    sighting.verified = verified;
    this.vehicles.set(vehicleId, vehicle);
    return true;
  }

  /**
   * Create a vehicle alert (BOLO, etc.)
   */
  async createAlert(
    input: CreateAlertInput,
    userId: string
  ): Promise<VehicleAlert> {
    const vehicle = this.vehicles.get(input.vehicleId);
    if (!vehicle) {
      throw new Error("Vehicle not found");
    }

    const alert: VehicleAlert = {
      id: crypto.randomUUID(),
      vehicleId: input.vehicleId,
      type: input.type,
      status: "active",
      description: input.description,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      expiresAt: input.expiresAt,
    };

    vehicle.alerts.push(alert);
    vehicle.updatedAt = new Date().toISOString();
    this.vehicles.set(input.vehicleId, vehicle);

    console.log(
      `[VehicleService] Alert created for ${vehicle.licensePlate}: ${alert.type}`
    );
    return alert;
  }

  /**
   * Cancel a vehicle alert
   */
  async cancelAlert(vehicleId: string, alertId: string): Promise<boolean> {
    const vehicle = this.vehicles.get(vehicleId);
    if (!vehicle) return false;

    const alert = vehicle.alerts.find((a) => a.id === alertId);
    if (!alert) return false;

    alert.status = "cancelled";
    this.vehicles.set(vehicleId, vehicle);
    return true;
  }

  /**
   * Get active alerts for a vehicle
   */
  async getActiveAlerts(vehicleId: string): Promise<VehicleAlert[]> {
    const vehicle = this.vehicles.get(vehicleId);
    if (!vehicle) return [];

    return vehicle.alerts.filter((a) => {
      if (a.status !== "active") return false;
      if (a.expiresAt && new Date(a.expiresAt) < new Date()) {
        a.status = "expired";
        return false;
      }
      return true;
    });
  }

  /**
   * Search for vehicles with active alerts
   */
  async searchAlertedVehicles(
    alertType?: "bolo" | "stolen" | "amber" | "custom"
  ): Promise<VehicleRecord[]> {
    const vehicles = Array.from(this.vehicles.values());

    return vehicles.filter((v) =>
      v.alerts.some((a) => {
        if (a.status !== "active") return false;
        if (a.expiresAt && new Date(a.expiresAt) < new Date()) return false;
        if (alertType && a.type !== alertType) return false;
        return true;
      })
    );
  }

  /**
   * Check if a sighting should trigger alerts
   */
  private async checkAlerts(
    vehicle: VehicleRecord,
    sighting: VehicleSighting
  ): Promise<void> {
    const activeAlerts = await this.getActiveAlerts(vehicle.id);

    if (activeAlerts.length > 0) {
      console.log(
        `[VehicleService] ALERT! Vehicle ${vehicle.licensePlate} spotted with active alerts`
      );

      // Would send notifications here
      for (const alert of activeAlerts) {
        console.log(`  - ${alert.type}: ${alert.description}`);
      }
    }
  }

  /**
   * Process LPR (License Plate Recognition) data
   */
  async processLPRData(
    data: Array<{
      plate: string;
      state?: string;
      lat: number;
      lng: number;
      timestamp: string;
      confidence: number;
      imageUrl?: string;
    }>
  ): Promise<{ matched: number; sightings: VehicleSighting[] }> {
    const sightings: VehicleSighting[] = [];
    let matched = 0;

    for (const entry of data) {
      const vehicle = await this.findByPlate(entry.plate, entry.state);

      if (vehicle) {
        matched++;
        const sighting = await this.reportSighting({
          vehicleId: vehicle.id,
          source: "lpr",
          location: {
            lat: entry.lat,
            lng: entry.lng,
          },
          timestamp: entry.timestamp,
          confidence: entry.confidence,
          imageUrl: entry.imageUrl,
        });
        sightings.push(sighting);
      }
    }

    console.log(`[VehicleService] Processed ${data.length} LPR entries, ${matched} matched`);
    return { matched, sightings };
  }

  /**
   * Get sighting timeline for a vehicle
   */
  async getSightingTimeline(vehicleId: string): Promise<{
    sightings: VehicleSighting[];
    route: Array<{ lat: number; lng: number; timestamp: string }>;
    totalDistance: number;
  }> {
    const vehicle = this.vehicles.get(vehicleId);
    if (!vehicle) {
      return { sightings: [], route: [], totalDistance: 0 };
    }

    const sightings = vehicle.sightings.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const route = sightings.map((s) => ({
      lat: s.location.lat,
      lng: s.location.lng,
      timestamp: s.timestamp,
    }));

    let totalDistance = 0;
    for (let i = 1; i < route.length; i++) {
      totalDistance += this.haversineDistance(route[i - 1], route[i]);
    }

    return { sightings, route, totalDistance };
  }

  /**
   * Calculate distance between two points in km
   */
  private haversineDistance(
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
}

export const vehicleTrackingService = new VehicleTrackingService();
