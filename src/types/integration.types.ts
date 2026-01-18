/**
 * Integration System Types
 * Types for external API integrations and connectors
 */

// Integration Status
export type IntegrationStatus =
  | "active"
  | "inactive"
  | "error"
  | "pending"
  | "suspended"
  | "configuring";

// Integration Categories
export type IntegrationCategory =
  | "healthcare"
  | "law_enforcement"
  | "government"
  | "transportation"
  | "border_services"
  | "social_services"
  | "communication"
  | "data_provider"
  | "custom";

// Authentication Types
export type AuthenticationType =
  | "api_key"
  | "oauth2"
  | "basic"
  | "bearer"
  | "certificate"
  | "custom";

// Base Integration Configuration
export interface Integration {
  id: string;
  name: string;
  description: string;
  category: IntegrationCategory;
  provider: string;
  version: string;
  status: IntegrationStatus;

  // Connection details
  baseUrl: string;
  authType: AuthenticationType;
  credentialId?: string;

  // Configuration
  config: IntegrationConfig;

  // Rate limiting
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };

  // Health monitoring
  health: IntegrationHealth;

  // Metadata
  createdAt: string;
  updatedAt: string;
  lastSyncAt?: string;
  createdBy: string;
}

export interface IntegrationConfig {
  endpoints: IntegrationEndpoint[];
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  webhookUrl?: string;
  syncSchedule?: string; // cron expression
  dataMapping?: DataMapping[];
  customSettings?: Record<string, unknown>;
}

export interface IntegrationEndpoint {
  id: string;
  name: string;
  path: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  description?: string;
  requestSchema?: Record<string, unknown>;
  responseSchema?: Record<string, unknown>;
  rateLimit?: number;
  cacheTTL?: number;
}

export interface DataMapping {
  sourceField: string;
  targetField: string;
  transform?: "string" | "number" | "date" | "boolean" | "array" | "custom";
  customTransform?: string;
}

export interface IntegrationHealth {
  status: "healthy" | "degraded" | "unhealthy" | "unknown";
  lastCheck: string;
  uptime: number; // percentage
  avgResponseTime: number; // ms
  errorRate: number; // percentage
  consecutiveFailures: number;
}

// Credentials Vault
export interface IntegrationCredential {
  id: string;
  integrationId?: string;
  name: string;
  type: AuthenticationType;

  // Encrypted credential data
  data: EncryptedCredentialData;

  // Access control
  allowedUsers: string[];
  allowedRoles: string[];

  // Rotation
  expiresAt?: string;
  rotationSchedule?: string;
  lastRotated?: string;

  // Audit
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastAccessedAt?: string;
  lastAccessedBy?: string;
}

export interface EncryptedCredentialData {
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  username?: string;
  password?: string;
  accessToken?: string;
  refreshToken?: string;
  certificate?: string;
  privateKey?: string;
  custom?: Record<string, string>;
}

// Route Binding
export interface RouteBinding {
  id: string;
  integrationId: string;
  name: string;
  description?: string;

  // Trigger
  trigger: RouteTrigger;

  // Action
  action: RouteAction;

  // Conditions
  conditions?: RouteCondition[];

  // Status
  enabled: boolean;
  lastTriggeredAt?: string;
  triggerCount: number;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface RouteTrigger {
  type: "event" | "schedule" | "webhook" | "manual";
  event?: string;
  schedule?: string; // cron
  webhookPath?: string;
}

export interface RouteAction {
  type: "api_call" | "data_sync" | "notification" | "workflow";
  endpointId?: string;
  payload?: Record<string, unknown>;
  transformations?: DataMapping[];
}

export interface RouteCondition {
  field: string;
  operator: "eq" | "ne" | "gt" | "lt" | "contains" | "exists";
  value: unknown;
}

// Integration Templates (Marketplace)
export interface IntegrationTemplate {
  id: string;
  name: string;
  description: string;
  category: IntegrationCategory;
  provider: string;
  version: string;

  // Template content
  configTemplate: Partial<IntegrationConfig>;
  credentialRequirements: CredentialRequirement[];

  // Documentation
  documentation?: string;
  setupGuide?: string;

  // Ratings/Usage
  rating: number;
  usageCount: number;

  // Metadata
  tags: string[];
  icon?: string;
  createdAt: string;
  updatedAt: string;
  isOfficial: boolean;
}

export interface CredentialRequirement {
  name: string;
  type: AuthenticationType;
  description: string;
  required: boolean;
  fields: Array<{
    name: string;
    label: string;
    type: "text" | "password" | "textarea" | "file";
    required: boolean;
    placeholder?: string;
  }>;
}

// Monitoring & Alerts
export interface IntegrationAlert {
  id: string;
  integrationId: string;
  type: "error" | "warning" | "info";
  severity: "critical" | "high" | "medium" | "low";

  title: string;
  message: string;
  details?: Record<string, unknown>;

  // Status
  status: "active" | "acknowledged" | "resolved";
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;

  // Metadata
  createdAt: string;
  expiresAt?: string;
}

export interface IntegrationMetrics {
  integrationId: string;
  period: "hour" | "day" | "week" | "month";
  startTime: string;
  endTime: string;

  // Request metrics
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;

  // Performance metrics
  avgResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;

  // Error metrics
  errorsByType: Record<string, number>;

  // Data metrics
  dataIn: number; // bytes
  dataOut: number; // bytes
  recordsProcessed: number;
}

export interface AlertRule {
  id: string;
  integrationId?: string; // null for global rules
  name: string;
  description?: string;
  enabled: boolean;

  // Condition
  metric: "error_rate" | "response_time" | "availability" | "rate_limit";
  operator: "gt" | "lt" | "eq";
  threshold: number;
  duration: number; // seconds

  // Action
  alertSeverity: "critical" | "high" | "medium" | "low";
  notificationChannels: string[];

  // Metadata
  createdAt: string;
  updatedAt: string;
}

// External Service Types

// Hospital Registry
export interface HospitalRegistryConfig {
  hospitalId: string;
  hospitalName: string;
  region: string;
  apiVersion: string;
  supportedQueries: string[];
}

// Border Services (CBSA/ICE)
export interface BorderServicesConfig {
  agency: "cbsa" | "ice" | "cbp";
  region: string;
  clearanceLevel: string;
  dataTypes: string[];
}

// Morgue/Coroner
export interface MorgueRegistryConfig {
  jurisdiction: string;
  registryType: "morgue" | "coroner" | "medical_examiner";
  dataRetentionDays: number;
}

// Transit Authority
export interface TransitAuthorityConfig {
  authority: string;
  city: string;
  dataFeeds: string[];
  realTimeEnabled: boolean;
}

// Cross-Border Coordination
export interface CrossBorderCase {
  id: string;
  localCaseId: string;
  foreignCaseId?: string;

  // Jurisdictions
  originCountry: string;
  originJurisdiction: string;
  targetCountry: string;
  targetJurisdiction?: string;

  // Status
  status: "pending" | "active" | "resolved" | "closed";
  coordinationLevel: "basic" | "enhanced" | "urgent";

  // Contacts
  localContact: {
    name: string;
    agency: string;
    email: string;
    phone: string;
  };
  foreignContact?: {
    name: string;
    agency: string;
    email: string;
    phone: string;
  };

  // Timeline
  createdAt: string;
  updatedAt: string;
  lastCommunication?: string;

  // Documentation
  notes: string[];
  attachments: string[];
}

// Sync Job
export interface SyncJob {
  id: string;
  integrationId: string;
  type: "full" | "incremental" | "delta";
  status: "pending" | "running" | "completed" | "failed";

  // Progress
  totalRecords: number;
  processedRecords: number;
  failedRecords: number;

  // Timing
  startedAt?: string;
  completedAt?: string;
  duration?: number;

  // Results
  errors: Array<{
    record: string;
    error: string;
    timestamp: string;
  }>;

  // Metadata
  createdAt: string;
  createdBy: string;
}

// =============================================================================
// CONNECTOR FRAMEWORK TYPES
// =============================================================================

// Circuit Breaker States
export type CircuitBreakerState = "closed" | "open" | "half-open";

// Connector States
export type ConnectorState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

// Retry Policy Configuration
export interface RetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterEnabled: boolean;
  retryableErrors: string[];
}

// Circuit Breaker Configuration
export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number; // ms to wait before trying half-open
  monitoringPeriod: number; // ms
  halfOpenMaxAttempts: number;
}

// Connector Configuration
export interface ConnectorConfig {
  id: string;
  integrationId: string;
  name: string;
  enabled: boolean;

  // Connection
  baseUrl: string;
  timeout: number;
  keepAlive: boolean;

  // Auth
  authType: AuthenticationType;
  credentialId: string;

  // Retry & Circuit Breaker
  retryPolicy: RetryPolicy;
  circuitBreaker: CircuitBreakerConfig;

  // Rate Limiting
  rateLimit: {
    maxRequestsPerSecond: number;
    maxConcurrentRequests: number;
  };

  // Headers
  defaultHeaders?: Record<string, string>;

  // Custom settings
  customConfig?: Record<string, unknown>;
}

// Connector Request
export interface ConnectorRequest {
  id: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  metadata?: Record<string, unknown>;
}

// Connector Response
export interface ConnectorResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ConnectorError;
  metadata: {
    requestId: string;
    statusCode: number;
    responseTimeMs: number;
    retryCount: number;
    circuitBreakerState: CircuitBreakerState;
    fromCache?: boolean;
  };
}

// Connector Error
export interface ConnectorError {
  code: string;
  message: string;
  statusCode?: number;
  retryable: boolean;
  details?: Record<string, unknown>;
  timestamp: string;
}

// Health Check Result
export interface HealthCheckResult {
  healthy: boolean;
  status: "healthy" | "degraded" | "unhealthy" | "unknown";
  responseTimeMs: number;
  lastCheck: string;
  message?: string;
  details?: Record<string, unknown>;
}

// =============================================================================
// CREDENTIALS VAULT TYPES
// =============================================================================

// Vault Credential (stored in vault)
export interface VaultCredential {
  id: string;
  name: string;
  type: AuthenticationType;
  integrationId?: string;

  // Encrypted envelope
  encryptedData: string;
  encryptionKeyId: string;
  iv: string;
  authTag: string;

  // Access control
  allowedUsers: string[];
  allowedRoles: string[];

  // Rotation
  expiresAt?: string;
  rotationSchedule?: string;
  lastRotated?: string;
  rotationCount: number;

  // Audit
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastAccessedAt?: string;
  lastAccessedBy?: string;

  // Status
  status: "active" | "expired" | "revoked" | "rotating";
  revokedAt?: string;
  revokedBy?: string;
  revokeReason?: string;
}

// Decrypted Credential (in memory only)
export interface DecryptedCredential {
  id: string;
  name: string;
  type: AuthenticationType;
  data: CredentialData;
  expiresAt?: string;
}

// Raw Credential Data (decrypted)
export interface CredentialData {
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  username?: string;
  password?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  certificate?: string;
  privateKey?: string;
  passphrase?: string;
  custom?: Record<string, string>;
}

// Credential Input (for creating/updating)
export interface CredentialInput {
  name: string;
  type: AuthenticationType;
  integrationId?: string;
  data: CredentialData;
  allowedUsers?: string[];
  allowedRoles?: string[];
  expiresAt?: string;
  rotationSchedule?: string;
}

// Credential Access Log
export interface CredentialAccessLog {
  id: string;
  credentialId: string;
  userId: string;
  action: "retrieve" | "rotate" | "revoke" | "create" | "update";
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  reason?: string;
  timestamp: string;
}

// =============================================================================
// ROUTE BINDING ENGINE TYPES
// =============================================================================

// Trigger Event
export interface TriggerEvent {
  type: "event" | "schedule" | "webhook" | "manual";
  source: string;
  eventName?: string;
  payload: Record<string, unknown>;
  metadata: {
    timestamp: string;
    correlationId: string;
    userId?: string;
  };
}

// Binding Result
export interface BindingResult {
  success: boolean;
  bindingId: string;
  executionId: string;
  responses: Array<{
    integrationId: string;
    success: boolean;
    data?: unknown;
    error?: string;
    responseTimeMs: number;
  }>;
  aggregatedData?: unknown;
  totalTimeMs: number;
  timestamp: string;
}

// Transformation Rule
export interface TransformationRule {
  id: string;
  name: string;
  sourceField: string;
  targetField: string;
  transformType:
    | "direct"
    | "format"
    | "lookup"
    | "calculate"
    | "conditional"
    | "custom";
  config?: {
    format?: string;
    lookupTable?: Record<string, unknown>;
    expression?: string;
    condition?: RouteCondition;
    defaultValue?: unknown;
  };
}

// Aggregation Config
export interface AggregationConfig {
  type: "merge" | "first" | "all" | "custom";
  mergeStrategy?: "shallow" | "deep" | "array";
  deduplicationField?: string;
  customAggregator?: string;
}

// =============================================================================
// SPECIFIC INTEGRATION RESULT TYPES
// =============================================================================

// Hospital Patient Match
export interface HospitalPatientMatch {
  id: string;
  caseId: string;
  hospitalId: string;
  hospitalName: string;
  matchScore: number;
  matchType: "exact" | "probable" | "possible";

  // Patient info (redacted for privacy)
  patientInfo: {
    admissionDate: string;
    department: string;
    status: "admitted" | "discharged" | "transferred" | "unknown";
    ageRange?: string;
    gender?: string;
    physicalDescription?: string;
  };

  // Match details
  matchingFields: string[];
  confidenceFactors: Record<string, number>;

  // Contact
  contactPerson?: {
    name: string;
    role: string;
    phone: string;
    email: string;
  };

  // Status
  verificationStatus: "pending" | "verified" | "rejected" | "expired";
  verifiedBy?: string;
  verifiedAt?: string;

  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

// Border Crossing Alert
export interface BorderCrossingAlert {
  id: string;
  caseId: string;
  alertType: "crossing_detected" | "watch_match" | "document_flag";
  severity: "critical" | "high" | "medium" | "low";

  // Crossing details
  crossing: {
    portOfEntry: string;
    direction: "inbound" | "outbound";
    timestamp: string;
    country: string;
    travelMethod: "air" | "land" | "sea";
  };

  // Match info
  matchDetails: {
    documentType?: string;
    matchScore: number;
    matchingFields: string[];
    biometricMatch?: boolean;
  };

  // Agency info
  agency: "cbsa" | "ice" | "cbp" | "other";
  agencyReference?: string;
  agentContact?: {
    name: string;
    badge: string;
    phone: string;
    email: string;
  };

  // Status
  status: "active" | "acknowledged" | "resolved" | "expired";
  acknowledgedBy?: string;
  acknowledgedAt?: string;

  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

// Unidentified Remains Match
export interface UnidentifiedRemainsMatch {
  id: string;
  caseId: string;
  registryId: string;
  jurisdiction: string;
  matchScore: number;
  matchType: "dna" | "dental" | "physical" | "circumstantial";

  // Remains info
  remainsInfo: {
    discoveryDate: string;
    discoveryLocation: string;
    estimatedAge?: string;
    estimatedGender?: string;
    estimatedTimeOfDeath?: string;
    causeOfDeath?: string;
    physicalDescription?: string;
  };

  // Match details
  matchingFactors: Array<{
    type: string;
    description: string;
    confidence: number;
  }>;

  // Contact
  investigator?: {
    name: string;
    agency: string;
    phone: string;
    email: string;
    caseNumber: string;
  };

  // Status
  verificationStatus: "pending" | "verified" | "excluded" | "confirmed";
  verifiedBy?: string;
  verifiedAt?: string;

  createdAt: string;
  updatedAt: string;
}

// Transit Sighting
export interface TransitSighting {
  id: string;
  caseId: string;
  transitAuthority: string;
  sightingType: "camera" | "fare_card" | "operator_report" | "passenger_report";
  confidence: "high" | "medium" | "low";

  // Location
  location: {
    station?: string;
    line?: string;
    vehicleId?: string;
    latitude?: number;
    longitude?: number;
    address?: string;
  };

  // Timing
  timestamp: string;
  duration?: number;

  // Evidence
  evidence: {
    hasVideo: boolean;
    videoUrl?: string;
    hasPhoto: boolean;
    photoUrl?: string;
    fareCardId?: string;
    operatorId?: string;
    description?: string;
  };

  // Direction
  travelDirection?: string;
  possibleDestinations?: string[];

  // Status
  status: "new" | "investigating" | "verified" | "false_positive" | "resolved";
  investigatedBy?: string;
  investigatedAt?: string;
  notes?: string;

  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// INTEGRATION CONNECTOR INTERFACE
// =============================================================================

// External Connector Interface (for implementation)
export interface ExternalConnector {
  id: string;
  name: string;
  type: IntegrationCategory;
  state: ConnectorState;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<HealthCheckResult>;
  execute<T>(request: ConnectorRequest): Promise<ConnectorResponse<T>>;

  getState(): ConnectorState;
  getConfig(): ConnectorConfig;
  getMetrics(): ConnectorMetrics;
}

// Connector Metrics
export interface ConnectorMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTimeMs: number;
  circuitBreakerTrips: number;
  lastRequestAt?: string;
  uptime: number;
}

// =============================================================================
// MONITORING DASHBOARD TYPES
// =============================================================================

// Dashboard Summary
export interface IntegrationDashboardSummary {
  totalIntegrations: number;
  activeIntegrations: number;
  healthyIntegrations: number;
  degradedIntegrations: number;
  unhealthyIntegrations: number;

  totalRequestsToday: number;
  successRateToday: number;
  avgResponseTimeMs: number;

  activeAlerts: number;
  criticalAlerts: number;

  lastUpdated: string;
}

// Integration Status Card
export interface IntegrationStatusCard {
  integrationId: string;
  name: string;
  category: IntegrationCategory;
  status: IntegrationStatus;
  health: IntegrationHealth;

  // Quick metrics
  requestsLast24h: number;
  successRate: number;
  avgResponseTimeMs: number;
  activeAlerts: number;

  lastSync?: string;
  nextScheduledSync?: string;
}
