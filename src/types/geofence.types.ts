/**
 * Geofence Types
 * Types for location-based monitoring zones
 */

// =============================================================================
// Enums
// =============================================================================

export type GeofenceType = "circle" | "polygon" | "corridor";
export type AlertTrigger = "enter" | "exit" | "both";
export type AlertPriority = "low" | "medium" | "high" | "critical";
export type GeofenceStatus = "active" | "paused" | "expired" | "triggered";
export type NotifyChannel = "email" | "sms" | "push" | "webhook";

// =============================================================================
// Geometry Types
// =============================================================================

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface CircleGeometry {
  type: "circle";
  center: Coordinate;
  radius: number; // in meters
}

export interface PolygonGeometry {
  type: "polygon";
  points: Coordinate[];
}

export interface CorridorGeometry {
  type: "corridor";
  points: Coordinate[];
  bufferWidth: number; // in meters
}

export type GeofenceGeometry = CircleGeometry | PolygonGeometry | CorridorGeometry;

// =============================================================================
// Geofence Types
// =============================================================================

export interface Geofence {
  id: string;
  name: string;
  description?: string;
  caseId: string;
  caseName?: string;
  caseNumber?: string;
  type: GeofenceType;
  geometry: GeofenceGeometry;
  trigger: AlertTrigger;
  priority: AlertPriority;
  status: GeofenceStatus;
  notifyChannels: NotifyChannel[];

  // Stats
  alertCount: number;
  lastTriggered?: string;

  // Timestamps
  createdAt: string;
  updatedAt?: string;
  expiresAt?: string;
  createdBy: string;
}

export interface GeofenceInput {
  name: string;
  description?: string;
  caseId: string;
  type: GeofenceType;
  geometry: GeofenceGeometry;
  trigger?: AlertTrigger;
  priority?: AlertPriority;
  notifyChannels?: NotifyChannel[];
  expiresAt?: string;
}

export interface GeofenceUpdateInput {
  name?: string;
  description?: string;
  geometry?: GeofenceGeometry;
  trigger?: AlertTrigger;
  priority?: AlertPriority;
  status?: GeofenceStatus;
  notifyChannels?: NotifyChannel[];
  expiresAt?: string;
}

// =============================================================================
// Alert Types
// =============================================================================

export type AlertTriggerType = "enter" | "exit";

export interface GeofenceAlert {
  id: string;
  geofenceId: string;
  geofenceName: string;
  caseId: string;
  caseName?: string;

  // Alert details
  triggerType: AlertTriggerType;
  triggeredAt: string;
  location: Coordinate;
  accuracy?: number; // in meters
  source: string;
  deviceId?: string;

  // Acknowledgment
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;

  // Notes
  notes?: string;
}

export interface AlertInput {
  triggerType: AlertTriggerType;
  location: Coordinate;
  accuracy?: number;
  source?: string;
  deviceId?: string;
}

// =============================================================================
// Notification Types
// =============================================================================

export interface GeofenceNotification {
  id: string;
  geofenceId: string;
  alertId: string;
  channel: NotifyChannel;
  recipient: string;
  status: "pending" | "sent" | "delivered" | "failed";
  sentAt?: string;
  deliveredAt?: string;
  error?: string;
}

// =============================================================================
// API Response Types
// =============================================================================

export interface GeofenceListResponse {
  geofences: Geofence[];
  total: number;
}

export interface GeofenceResponse {
  geofence: Geofence;
}

export interface AlertListResponse {
  alerts: GeofenceAlert[];
  total: number;
  unacknowledgedCount: number;
}

export interface AlertResponse {
  alert: GeofenceAlert;
}

// =============================================================================
// Query Types
// =============================================================================

export interface GeofenceQuery {
  caseId?: string;
  status?: GeofenceStatus;
  priority?: AlertPriority;
  type?: GeofenceType;
}

export interface AlertQuery {
  geofenceId?: string;
  acknowledged?: boolean;
  triggerType?: AlertTriggerType;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

// =============================================================================
// Event Types (for real-time)
// =============================================================================

export interface GeofenceEvent {
  type: "geofence_created" | "geofence_updated" | "geofence_deleted";
  geofenceId: string;
  caseId: string;
  timestamp: string;
  userId: string;
  data?: Partial<Geofence>;
}

export interface AlertEvent {
  type: "alert_triggered" | "alert_acknowledged";
  alertId: string;
  geofenceId: string;
  caseId: string;
  timestamp: string;
  data?: Partial<GeofenceAlert>;
}

// =============================================================================
// Helper Types
// =============================================================================

export interface GeofenceStats {
  totalGeofences: number;
  activeGeofences: number;
  totalAlerts: number;
  unacknowledgedAlerts: number;
  alertsByPriority: Record<AlertPriority, number>;
  alertsByType: Record<AlertTriggerType, number>;
}

export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Calculate bounding box for a geofence
 */
export function getGeofenceBounds(geometry: GeofenceGeometry): BoundingBox {
  if (geometry.type === "circle") {
    // Approximate bounding box for circle
    const radiusInDegrees = geometry.radius / 111000; // rough conversion
    return {
      north: geometry.center.lat + radiusInDegrees,
      south: geometry.center.lat - radiusInDegrees,
      east: geometry.center.lng + radiusInDegrees,
      west: geometry.center.lng - radiusInDegrees,
    };
  }

  // For polygon and corridor
  const points = geometry.points;
  return {
    north: Math.max(...points.map((p) => p.lat)),
    south: Math.min(...points.map((p) => p.lat)),
    east: Math.max(...points.map((p) => p.lng)),
    west: Math.min(...points.map((p) => p.lng)),
  };
}

/**
 * Calculate area of a polygon in square meters (approximate)
 */
export function calculatePolygonArea(points: Coordinate[]): number {
  if (points.length < 3) return 0;

  let area = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].lng * points[j].lat;
    area -= points[j].lng * points[i].lat;
  }

  area = Math.abs(area) / 2;
  // Convert from degrees squared to approximate square meters
  // Using 111,000 meters per degree latitude and accounting for longitude
  const avgLat = points.reduce((sum, p) => sum + p.lat, 0) / n;
  const metersPerDegreeLng = 111000 * Math.cos((avgLat * Math.PI) / 180);
  const metersPerDegreeLat = 111000;

  return area * metersPerDegreeLat * metersPerDegreeLng;
}

/**
 * Calculate circle area in square meters
 */
export function calculateCircleArea(radius: number): number {
  return Math.PI * radius * radius;
}
