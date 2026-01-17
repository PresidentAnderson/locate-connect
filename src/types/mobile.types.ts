/**
 * Mobile App Companion Types
 * LC-FEAT-031
 */

// ============================================
// Push Notification Types
// ============================================

export interface PushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  p256dhKey: string;
  authKey: string;
  expirationTime?: number | null;
  deviceName?: string;
  deviceType?: "mobile" | "tablet" | "desktop";
  browser?: string;
  platform?: string;
  isActive: boolean;
  lastUsedAt?: string;
  failedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  data?: {
    url?: string;
    caseId?: string;
    type?: string;
    [key: string]: unknown;
  };
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  vibrate?: number[];
}

export type PushNotificationType =
  | "case_update"
  | "nearby_alert"
  | "tip_submitted"
  | "amber_alert"
  | "assignment"
  | "urgent_tip"
  | "case_resolved"
  | "system";

// ============================================
// WebAuthn Types
// ============================================

export interface WebAuthnCredential {
  id: string;
  userId: string;
  credentialId: string;
  publicKey: Uint8Array;
  counter: number;
  deviceType?: "platform" | "cross-platform";
  transports?: string[];
  backedUp: boolean;
  deviceName?: string;
  lastUsedAt?: string;
  createdAt: string;
}

export interface WebAuthnChallenge {
  id: string;
  userId?: string;
  challenge: string;
  type: "registration" | "authentication";
  expiresAt: string;
  usedAt?: string;
  createdAt: string;
}

// ============================================
// Offline Sync Types
// ============================================

export interface OfflineSyncItem {
  id: string;
  userId: string;
  entityType: string;
  entityId?: string;
  operation: "create" | "update" | "delete";
  payload: Record<string, unknown>;
  priority: number;
  retryCount: number;
  maxRetries: number;
  status: "pending" | "processing" | "completed" | "failed";
  errorMessage?: string;
  clientTimestamp: string;
  serverTimestamp: string;
  processedAt?: string;
  createdAt: string;
}

export interface SyncStatus {
  pendingCount: number;
  failedCount: number;
  lastSyncAt?: string;
  isOnline: boolean;
  isSyncing: boolean;
}

// ============================================
// Field Data Types
// ============================================

export interface FieldDataEntry {
  id: string;
  caseId?: string;
  userId: string;
  entryType: FieldEntryType;
  data: Record<string, unknown>;
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    address?: string;
  };
  attachments?: FieldAttachment[];
  isSynced: boolean;
  syncedAt?: string;
  offlineId?: string;
  deviceInfo?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type FieldEntryType =
  | "sighting"
  | "witness_interview"
  | "location_check"
  | "vehicle_check"
  | "evidence_log"
  | "status_update"
  | "general_note";

export interface FieldAttachment {
  id: string;
  type: "photo" | "video" | "audio" | "document";
  url: string;
  filename: string;
  mimeType?: string;
  size?: number;
  capturedAt: number;
  location?: {
    latitude: number;
    longitude: number;
  };
}

// ============================================
// Mobile Evidence Types
// ============================================

export interface MobileEvidence {
  id: string;
  caseId: string;
  userId: string;
  fieldEntryId?: string;
  fileType: "image" | "video" | "audio" | "document";
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  storagePath?: string;
  storageBucket: string;
  thumbnailPath?: string;
  durationSeconds?: number;
  captureLocation?: {
    latitude: number;
    longitude: number;
  };
  captureTimestamp?: string;
  deviceInfo?: Record<string, unknown>;
  metadata: Record<string, unknown>;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  notes?: string;
  createdAt: string;
}

// ============================================
// Geofence Types
// ============================================

export interface GeofenceZone {
  id: string;
  caseId: string;
  name: string;
  zoneType: "last_seen" | "search_area" | "alert_zone" | "exclusion_zone";
  geometry: GeoJSON.Polygon;
  radiusMeters?: number;
  priority: number;
  isActive: boolean;
  alertEnabled: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

export interface NearbyCase {
  id: string;
  personName: string;
  age?: number;
  lastSeenDate: string;
  lastSeenLocation: string;
  photoUrl?: string;
  distance: number; // in km
  priority: "critical" | "high" | "medium" | "low";
  type: "missing" | "endangered" | "amber_alert";
}

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestamp: number;
  source?: "gps" | "network" | "ip" | "manual";
}

// ============================================
// Voice Note Types
// ============================================

export interface VoiceNote {
  id: string;
  userId: string;
  caseId?: string;
  fieldEntryId?: string;
  audioStoragePath: string;
  audioDurationSeconds: number;
  transcript?: string;
  transcriptionStatus: "pending" | "processing" | "completed" | "failed";
  transcriptionConfidence?: number;
  language: string;
  isReviewed: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

// ============================================
// Mobile Device Types
// ============================================

export interface MobileDevice {
  id: string;
  userId: string;
  deviceId: string;
  deviceName?: string;
  deviceType?: "ios" | "android" | "web";
  osVersion?: string;
  appVersion?: string;
  pushSubscriptionId?: string;
  lastActiveAt?: string;
  isTrusted: boolean;
  trustedAt?: string;
  trustedBy?: string;
  createdAt: string;
}

// ============================================
// GPS-Tagged Tip Types
// ============================================

export interface GPSTaggedTip {
  id: string;
  caseId?: string;
  tipId: string;
  location: {
    latitude: number;
    longitude: number;
  };
  locationAccuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  address?: string;
  capturedAt: string;
  deviceInfo?: Record<string, unknown>;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  verificationNotes?: string;
}

// ============================================
// Push Notification Log Types
// ============================================

export interface PushNotificationLog {
  id: string;
  subscriptionId?: string;
  userId: string;
  notificationType: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  caseId?: string;
  sentAt: string;
  deliveredAt?: string;
  clickedAt?: string;
  dismissedAt?: string;
  errorMessage?: string;
  status: "sent" | "delivered" | "clicked" | "dismissed" | "failed";
}

// ============================================
// GeoJSON Types (for geofencing)
// ============================================

export namespace GeoJSON {
  export interface Point {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  }

  export interface Polygon {
    type: "Polygon";
    coordinates: Array<Array<[number, number]>>;
  }
}
