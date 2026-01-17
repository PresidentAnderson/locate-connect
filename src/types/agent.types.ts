/**
 * Agent System Types
 * Types for autonomous monitoring agents
 */

export type AgentStatus = "idle" | "running" | "error" | "paused" | "disabled";

export type AgentType =
  | "social_media_monitor"
  | "email_tracker"
  | "hospital_registry"
  | "priority_escalation"
  | "news_crawler"
  | "public_records";

export interface AgentConfig {
  id: string;
  type: AgentType;
  name: string;
  enabled: boolean;
  schedule: string; // cron expression
  timeout: number; // ms
  retryAttempts: number;
  retryDelay: number; // ms
  settings: Record<string, unknown>;
}

export interface AgentResult {
  success: boolean;
  agentId: string;
  runId: string;
  startedAt: string;
  completedAt: string;
  duration: number;
  itemsProcessed: number;
  leadsGenerated: number;
  alertsTriggered: number;
  errors: AgentError[];
  metrics: Record<string, number>;
}

export interface AgentError {
  code: string;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  stack?: string;
}

export interface AgentRun {
  id: string;
  agentId: string;
  agentType: AgentType;
  status: "pending" | "running" | "completed" | "failed";
  startedAt: string;
  completedAt?: string;
  result?: AgentResult;
  error?: AgentError;
}

export interface AgentMetrics {
  agentId: string;
  period: "hour" | "day" | "week" | "month";
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  avgDuration: number;
  totalLeadsGenerated: number;
  totalAlertsTriggered: number;
}

// Social Media Agent Types
export interface SocialMediaAccount {
  platform: "facebook" | "instagram" | "twitter" | "tiktok" | "linkedin";
  username: string;
  profileUrl?: string;
  lastCheckedAt?: string;
}

export interface SocialMediaActivity {
  id: string;
  caseId: string;
  platform: string;
  activityType: "post" | "comment" | "like" | "share" | "story" | "login";
  content?: string;
  url?: string;
  timestamp: string;
  detectedAt: string;
  metadata?: Record<string, unknown>;
}

// Email Tracking Types
export interface EmailTrackingPixel {
  id: string;
  caseId: string;
  recipientEmail: string;
  pixelUrl: string;
  createdAt: string;
  openedAt?: string;
  openCount: number;
}

export interface EmailOpenEvent {
  id: string;
  pixelId: string;
  caseId: string;
  ipAddress: string;
  userAgent?: string;
  geolocation?: {
    city?: string;
    region?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  };
  timestamp: string;
}

// Hospital Registry Types
export interface HospitalMatch {
  id: string;
  caseId: string;
  hospitalId: string;
  hospitalName: string;
  patientId?: string;
  matchScore: number;
  matchDetails: {
    nameMatch: number;
    ageMatch: number;
    physicalMatch: number;
    dateMatch: number;
  };
  admissionDate?: string;
  detectedAt: string;
  status: "pending" | "verified" | "dismissed";
}

// Priority Escalation Types
export interface EscalationRule {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  conditions: EscalationCondition[];
  action: EscalationAction;
}

export interface EscalationCondition {
  field: string;
  operator: "eq" | "gt" | "lt" | "gte" | "lte" | "contains" | "in";
  value: unknown;
}

export interface EscalationAction {
  type: "escalate_priority" | "send_alert" | "assign_to" | "add_tag";
  params: Record<string, unknown>;
}

export interface EscalationEvent {
  id: string;
  caseId: string;
  ruleId: string;
  previousPriority: number;
  newPriority: number;
  reason: string;
  triggeredAt: string;
  triggeredBy: "agent" | "manual";
}

// Crawler Types
export interface CrawlerSource {
  id: string;
  name: string;
  type: "news" | "public_records" | "social";
  url: string;
  enabled: boolean;
  credibilityScore: number;
  rateLimit: number;
  lastCrawledAt?: string;
}

export interface CrawlerResult {
  sourceId: string;
  url: string;
  title?: string;
  content?: string;
  publishedAt?: string;
  crawledAt: string;
  matchedCaseIds: string[];
  sentiment?: "positive" | "negative" | "neutral";
  relevanceScore: number;
}

// News Article Types
export interface NewsArticle {
  id: string;
  sourceId: string;
  sourceName: string;
  url: string;
  title: string;
  content: string;
  summary?: string;
  author?: string;
  publishedAt: string;
  crawledAt: string;
  relevanceScore: number;
  matchedTerms: string[];
  sentiment?: "positive" | "negative" | "neutral";
  imageUrl?: string;
  metadata?: Record<string, unknown>;
}

// Public Records Types
export interface PublicRecord {
  id: string;
  sourceId: string;
  recordType: "court" | "property" | "vital" | "dmv" | "arrest" | "registry";
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  ssn?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  recordDate: string;
  jurisdiction?: string;
  caseNumber?: string;
  description?: string;
  status?: string;
  rawData?: Record<string, unknown>;
  fetchedAt: string;
}

// Data Ingestion Types
export interface IngestionJob {
  id: string;
  type: "lead" | "case" | "contact" | "bulk_import";
  source: string;
  status: "pending" | "processing" | "completed" | "failed";
  totalItems: number;
  processedItems: number;
  failedItems: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  errors: IngestionError[];
}

export interface IngestionError {
  itemIndex: number;
  field?: string;
  message: string;
  value?: unknown;
}

export interface BulkImportConfig {
  fileType: "csv" | "json";
  targetEntity: "cases" | "leads" | "contacts";
  fieldMapping: Record<string, string>;
  validationRules: ValidationRule[];
  onDuplicate: "skip" | "update" | "error";
}

export interface ValidationRule {
  field: string;
  type: "required" | "format" | "range" | "enum";
  params?: Record<string, unknown>;
  message: string;
}
