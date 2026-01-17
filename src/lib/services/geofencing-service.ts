/**
 * Geofencing Service
 * Manages geofences and alerts for case locations
 */

import type {
  Geofence,
  GeofenceGeometry,
  GeofenceAlert,
  GeofenceNotification,
} from "@/types/law-enforcement.types";

export interface CreateGeofenceInput {
  caseId: string;
  name: string;
  type: "circle" | "polygon" | "route";
  geometry: GeofenceGeometry;
  alertType: "entry" | "exit" | "both";
  expiresAt?: string;
  notifications: GeofenceNotification[];
}

export interface LocationUpdate {
  deviceId: string;
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp: string;
}

class GeofencingService {
  private geofences: Map<string, Geofence> = new Map();
  private alerts: Map<string, GeofenceAlert> = new Map();
  private deviceLocations: Map<string, LocationUpdate> = new Map();

  /**
   * Create a new geofence
   */
  async createGeofence(
    input: CreateGeofenceInput,
    userId: string
  ): Promise<Geofence> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const geofence: Geofence = {
      id,
      caseId: input.caseId,
      name: input.name,
      type: input.type,
      geometry: input.geometry,
      alertType: input.alertType,
      isActive: true,
      createdBy: userId,
      createdAt: now,
      expiresAt: input.expiresAt,
      notifications: input.notifications,
    };

    this.geofences.set(id, geofence);
    console.log(`[GeofencingService] Created geofence ${id} for case ${input.caseId}`);
    return geofence;
  }

  /**
   * Get geofence by ID
   */
  async getGeofence(geofenceId: string): Promise<Geofence | null> {
    return this.geofences.get(geofenceId) || null;
  }

  /**
   * List geofences for a case
   */
  async listGeofences(caseId: string): Promise<Geofence[]> {
    return Array.from(this.geofences.values()).filter(
      (g) => g.caseId === caseId
    );
  }

  /**
   * Update geofence
   */
  async updateGeofence(
    geofenceId: string,
    updates: Partial<Pick<Geofence, "name" | "isActive" | "alertType" | "notifications" | "expiresAt">>
  ): Promise<Geofence | null> {
    const geofence = this.geofences.get(geofenceId);
    if (!geofence) return null;

    Object.assign(geofence, updates);
    this.geofences.set(geofenceId, geofence);
    return geofence;
  }

  /**
   * Delete geofence
   */
  async deleteGeofence(geofenceId: string): Promise<boolean> {
    return this.geofences.delete(geofenceId);
  }

  /**
   * Process location update and check geofences
   */
  async processLocationUpdate(update: LocationUpdate): Promise<GeofenceAlert[]> {
    const previousLocation = this.deviceLocations.get(update.deviceId);
    this.deviceLocations.set(update.deviceId, update);

    const triggeredAlerts: GeofenceAlert[] = [];
    const activeGeofences = Array.from(this.geofences.values()).filter(
      (g) => g.isActive && (!g.expiresAt || new Date(g.expiresAt) > new Date())
    );

    for (const geofence of activeGeofences) {
      const isInside = this.isPointInGeofence(update, geofence);
      const wasInside = previousLocation
        ? this.isPointInGeofence(previousLocation, geofence)
        : null;

      let alertType: "entry" | "exit" | null = null;

      // Detect entry
      if (isInside && wasInside === false) {
        if (geofence.alertType === "entry" || geofence.alertType === "both") {
          alertType = "entry";
        }
      }

      // Detect exit
      if (!isInside && wasInside === true) {
        if (geofence.alertType === "exit" || geofence.alertType === "both") {
          alertType = "exit";
        }
      }

      if (alertType) {
        const alert = await this.createAlert(geofence, update, alertType);
        triggeredAlerts.push(alert);

        // Send notifications
        await this.sendNotifications(geofence, alert);
      }
    }

    return triggeredAlerts;
  }

  /**
   * Check if a point is inside a geofence
   */
  private isPointInGeofence(
    point: { lat: number; lng: number },
    geofence: Geofence
  ): boolean {
    const geometry = geofence.geometry;

    if (geometry.type === "circle") {
      const distance = this.haversineDistance(point, geometry.center);
      return distance * 1000 <= geometry.radiusMeters;
    }

    if (geometry.type === "polygon") {
      return this.isPointInPolygon(point, geometry.points);
    }

    if (geometry.type === "route") {
      return this.isPointNearRoute(
        point,
        geometry.points,
        geometry.bufferMeters
      );
    }

    return false;
  }

  /**
   * Check if point is inside polygon using ray casting
   */
  private isPointInPolygon(
    point: { lat: number; lng: number },
    polygon: Array<{ lat: number; lng: number }>
  ): boolean {
    let inside = false;
    const n = polygon.length;

    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = polygon[i].lng;
      const yi = polygon[i].lat;
      const xj = polygon[j].lng;
      const yj = polygon[j].lat;

      if (
        yi > point.lat !== yj > point.lat &&
        point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi
      ) {
        inside = !inside;
      }
    }

    return inside;
  }

  /**
   * Check if point is near a route
   */
  private isPointNearRoute(
    point: { lat: number; lng: number },
    route: Array<{ lat: number; lng: number }>,
    bufferMeters: number
  ): boolean {
    for (let i = 0; i < route.length - 1; i++) {
      const distance = this.pointToLineDistance(point, route[i], route[i + 1]);
      if (distance * 1000 <= bufferMeters) {
        return true;
      }
    }
    return false;
  }

  /**
   * Calculate distance from point to line segment
   */
  private pointToLineDistance(
    point: { lat: number; lng: number },
    lineStart: { lat: number; lng: number },
    lineEnd: { lat: number; lng: number }
  ): number {
    // Simplified perpendicular distance calculation
    const A = point.lat - lineStart.lat;
    const B = point.lng - lineStart.lng;
    const C = lineEnd.lat - lineStart.lat;
    const D = lineEnd.lng - lineStart.lng;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) {
      param = dot / lenSq;
    }

    let xx: number, yy: number;

    if (param < 0) {
      xx = lineStart.lat;
      yy = lineStart.lng;
    } else if (param > 1) {
      xx = lineEnd.lat;
      yy = lineEnd.lng;
    } else {
      xx = lineStart.lat + param * C;
      yy = lineStart.lng + param * D;
    }

    return this.haversineDistance(point, { lat: xx, lng: yy });
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

  /**
   * Create an alert
   */
  private async createAlert(
    geofence: Geofence,
    location: LocationUpdate,
    alertType: "entry" | "exit"
  ): Promise<GeofenceAlert> {
    const alert: GeofenceAlert = {
      id: crypto.randomUUID(),
      geofenceId: geofence.id,
      caseId: geofence.caseId,
      alertType,
      triggeredAt: new Date().toISOString(),
      location: {
        lat: location.lat,
        lng: location.lng,
        accuracy: location.accuracy,
      },
      deviceId: location.deviceId,
      acknowledged: false,
    };

    this.alerts.set(alert.id, alert);
    console.log(
      `[GeofencingService] Alert triggered: ${alertType} for geofence ${geofence.name}`
    );
    return alert;
  }

  /**
   * Send notifications for an alert
   */
  private async sendNotifications(
    geofence: Geofence,
    alert: GeofenceAlert
  ): Promise<void> {
    for (const notification of geofence.notifications) {
      if (!notification.enabled) continue;

      console.log(
        `[GeofencingService] Sending ${notification.type} notification to ${notification.target}`
      );

      // Would integrate with notification services
      switch (notification.type) {
        case "email":
          // Send email
          break;
        case "sms":
          // Send SMS
          break;
        case "push":
          // Send push notification
          break;
        case "webhook":
          // Call webhook
          break;
      }
    }
  }

  /**
   * Get alerts for a case
   */
  async getAlerts(
    caseId: string,
    acknowledged?: boolean
  ): Promise<GeofenceAlert[]> {
    let alerts = Array.from(this.alerts.values()).filter(
      (a) => a.caseId === caseId
    );

    if (acknowledged !== undefined) {
      alerts = alerts.filter((a) => a.acknowledged === acknowledged);
    }

    return alerts.sort(
      (a, b) =>
        new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime()
    );
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, userId: string): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.acknowledged = true;
    alert.acknowledgedBy = userId;
    alert.acknowledgedAt = new Date().toISOString();

    this.alerts.set(alertId, alert);
    return true;
  }

  /**
   * Create a circular geofence around a point
   */
  createCircleGeofence(
    caseId: string,
    name: string,
    center: { lat: number; lng: number },
    radiusMeters: number,
    userId: string
  ): Promise<Geofence> {
    return this.createGeofence(
      {
        caseId,
        name,
        type: "circle",
        geometry: { type: "circle", center, radiusMeters },
        alertType: "both",
        notifications: [],
      },
      userId
    );
  }

  /**
   * Create a polygon geofence from points
   */
  createPolygonGeofence(
    caseId: string,
    name: string,
    points: Array<{ lat: number; lng: number }>,
    userId: string
  ): Promise<Geofence> {
    return this.createGeofence(
      {
        caseId,
        name,
        type: "polygon",
        geometry: { type: "polygon", points },
        alertType: "both",
        notifications: [],
      },
      userId
    );
  }
}

export const geofencingService = new GeofencingService();
