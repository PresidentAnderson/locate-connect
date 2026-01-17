/**
 * Audit & Compliance Types (LC-FEAT-037)
 * Comprehensive type definitions for audit logging, compliance monitoring,
 * and privacy regulation requirements (PIPEDA, GDPR, etc.)
 */

// =============================================================================
// ENUMS
// =============================================================================

export type AuditActionType =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'failed_login'
  | 'export'
  | 'import'
  | 'search'
  | 'share'
  | 'download'
  | 'print'
  | 'consent_given'
  | 'consent_withdrawn'
  | 'data_request'
  | 'data_erasure'
  | 'data_portability';

export type ComplianceFramework =
  | 'pipeda'
  | 'gdpr'
  | 'ccpa'
  | 'phipa'
  | 'pipa_ab'
  | 'pipa_bc'
  | 'qc_private_sector';

export type ComplianceStatus =
  | 'compliant'
  | 'non_compliant'
  | 'partial'
  | 'pending_review'
  | 'not_applicable';

export type DataRequestType =
  | 'access'
  | 'rectification'
  | 'erasure'
  | 'portability'
  | 'restriction'
  | 'objection'
  | 'legal_hold'
  | 'law_enforcement';

export type DataRequestStatus =
  | 'submitted'
  | 'under_review'
  | 'in_progress'
  | 'completed'
  | 'denied'
  | 'partially_completed'
  | 'cancelled';

export type RetentionPolicyStatus = 'active' | 'paused' | 'completed' | 'failed';

export type ViolationSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type RemediationStatus =
  | 'open'
  | 'in_progress'
  | 'resolved'
  | 'verified'
  | 'closed'
  | 'wont_fix';

// =============================================================================
// CORE TYPES
// =============================================================================

export interface ComprehensiveAuditLog {
  id: string;
  userId?: string;
  sessionId?: string;
  actorEmail?: string;
  actorRole?: string;
  actorOrganization?: string;
  impersonatedBy?: string;
  action: AuditActionType;
  actionDescription?: string;
  resourceType: string;
  resourceId?: string;
  resourceName?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  changedFields?: string[];
  ipAddress?: string;
  userAgent?: string;
  requestMethod?: string;
  requestPath?: string;
  requestQuery?: Record<string, unknown>;
  responseStatus?: number;
  responseTimeMs?: number;
  geoCountry?: string;
  geoRegion?: string;
  geoCity?: string;
  geoCoordinates?: { lat: number; lng: number };
  isSensitiveData: boolean;
  dataClassification?: string;
  complianceRelevant: boolean;
  complianceFrameworks?: ComplianceFramework[];
  retentionUntil?: string;
  isArchived: boolean;
  archivedAt?: string;
  createdAt: string;
}

export interface UserSession {
  id: string;
  userId: string;
  sessionTokenHash: string;
  refreshTokenHash?: string;
  deviceId?: string;
  deviceType?: string;
  deviceName?: string;
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
  ipAddress?: string;
  geoCountry?: string;
  geoRegion?: string;
  geoCity?: string;
  isActive: boolean;
  loginAt: string;
  lastActivityAt: string;
  logoutAt?: string;
  logoutReason?: string;
  isSuspicious: boolean;
  suspiciousReason?: string;
  mfaUsed: boolean;
  mfaMethod?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DataAccessLog {
  id: string;
  auditLogId?: string;
  userId?: string;
  sessionId?: string;
  resourceType: string;
  resourceId: string;
  resourceOwnerId?: string;
  accessType: string;
  fieldsAccessed?: string[];
  queryParameters?: Record<string, unknown>;
  accessReason?: string;
  isAuthorized: boolean;
  authorizationRule?: string;
  containsPii: boolean;
  piiFieldsAccessed?: string[];
  dataSensitivityLevel?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface RecordChangeHistory {
  id: string;
  tableName: string;
  recordId: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  changedBy?: string;
  changedByEmail?: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  changes?: FieldChange[];
  changeReason?: string;
  changeSource: string;
  transactionId?: string;
  versionNumber: number;
  isCurrent: boolean;
  complianceRelevant: boolean;
  createdAt: string;
}

export interface FieldChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

// =============================================================================
// COMPLIANCE TYPES
// =============================================================================

export interface ComplianceAssessment {
  id: string;
  framework: ComplianceFramework;
  assessmentDate: string;
  assessorId?: string;
  assessorName?: string;
  overallStatus: ComplianceStatus;
  complianceScore?: number;
  findings?: ComplianceFinding[];
  recommendations?: string[];
  actionItems?: ComplianceActionItem[];
  evidenceDocuments?: EvidenceDocument[];
  nextReviewDate?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceFinding {
  code: string;
  title: string;
  description: string;
  severity: ViolationSeverity;
  status: ComplianceStatus;
  affectedAreas: string[];
}

export interface ComplianceActionItem {
  id: string;
  title: string;
  description: string;
  assignee?: string;
  dueDate?: string;
  status: RemediationStatus;
  priority: ViolationSeverity;
}

export interface EvidenceDocument {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface ComplianceRequirement {
  id: string;
  framework: ComplianceFramework;
  requirementCode: string;
  requirementName: string;
  description?: string;
  category?: string;
  subcategory?: string;
  isMandatory: boolean;
  implementationStatus: ComplianceStatus;
  implementationNotes?: string;
  evidenceRequired?: string[];
  evidenceProvided?: EvidenceDocument[];
  controlReference?: string;
  relatedRequirements?: string[];
  lastReviewedAt?: string;
  lastReviewedBy?: string;
  nextReviewAt?: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// DATA RETENTION TYPES
// =============================================================================

export interface DataRetentionPolicy {
  id: string;
  name: string;
  description?: string;
  tableName: string;
  recordFilter?: Record<string, unknown>;
  retentionPeriodDays: number;
  retentionBasis: string;
  applicableFrameworks?: ComplianceFramework[];
  actionOnExpiry: 'delete' | 'archive' | 'anonymize';
  archiveLocation?: string;
  status: RetentionPolicyStatus;
  isActive: boolean;
  lastExecutedAt?: string;
  nextExecutionAt?: string;
  recordsProcessedLastRun?: number;
  createdAt: string;
  updatedAt: string;
}

export interface RetentionExecutionLog {
  id: string;
  policyId: string;
  startedAt: string;
  completedAt?: string;
  status: RetentionPolicyStatus;
  recordsEvaluated: number;
  recordsRetained: number;
  recordsDeleted: number;
  recordsArchived: number;
  recordsAnonymized: number;
  recordsFailed: number;
  errorMessage?: string;
  executionLog?: Record<string, unknown>;
  createdAt: string;
}

// =============================================================================
// DATA SUBJECT REQUEST TYPES
// =============================================================================

export interface DataSubjectRequest {
  id: string;
  requestNumber?: string;
  requestorId?: string;
  requestorEmail: string;
  requestorName?: string;
  requestorPhone?: string;
  identityVerified: boolean;
  identityVerifiedAt?: string;
  identityVerifiedBy?: string;
  verificationMethod?: string;
  verificationDocuments?: VerificationDocument[];
  requestType: DataRequestType;
  requestDescription?: string;
  specificDataRequested?: string[];
  applicableFramework?: ComplianceFramework;
  status: DataRequestStatus;
  assignedTo?: string;
  priority: ViolationSeverity;
  submittedAt: string;
  acknowledgedAt?: string;
  dueDate?: string;
  completedAt?: string;
  responseNotes?: string;
  dataProvided?: Record<string, unknown>;
  denialReason?: string;
  processingLog?: ProcessingStep[];
  createdAt: string;
  updatedAt: string;
}

export interface VerificationDocument {
  id: string;
  type: string;
  name: string;
  verifiedAt?: string;
}

export interface ProcessingStep {
  timestamp: string;
  action: string;
  performedBy: string;
  notes?: string;
}

export interface DataErasureRecord {
  id: string;
  requestId?: string;
  subjectId?: string;
  subjectEmail?: string;
  erasureType: 'full' | 'partial' | 'anonymization';
  tablesAffected?: string[];
  recordsErased?: Record<string, number>;
  fieldsAnonymized?: Record<string, string[]>;
  dataRetained?: RetainedDataInfo[];
  retentionReason?: string;
  requestedAt: string;
  executedAt?: string;
  executedBy?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  verificationNotes?: string;
  complianceCertificate?: string;
  createdAt: string;
}

export interface RetainedDataInfo {
  table: string;
  fields: string[];
  reason: string;
  legalBasis: string;
}

export interface DataPortabilityExport {
  id: string;
  requestId?: string;
  subjectId: string;
  exportFormat: 'json' | 'csv' | 'xml';
  tablesIncluded?: string[];
  recordCounts?: Record<string, number>;
  totalRecords?: number;
  fileSizeBytes?: number;
  filePath?: string;
  fileHash?: string;
  encryptionKeyHash?: string;
  downloadUrl?: string;
  downloadExpiresAt?: string;
  downloadCount: number;
  lastDownloadedAt?: string;
  status: 'pending' | 'processing' | 'ready' | 'downloaded' | 'expired' | 'failed';
  errorMessage?: string;
  requestedAt: string;
  generatedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

// =============================================================================
// COMPLIANCE VIOLATION TYPES
// =============================================================================

export interface ComplianceViolation {
  id: string;
  violationCode?: string;
  title: string;
  description?: string;
  framework?: ComplianceFramework;
  requirementId?: string;
  severity: ViolationSeverity;
  detectedAt: string;
  detectedBy: string;
  detectorId?: string;
  affectedResourceType?: string;
  affectedResourceId?: string;
  affectedUsers?: number;
  evidence?: ViolationEvidence[];
  auditLogIds?: string[];
  status: RemediationStatus;
  assignedTo?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
  resolutionEvidence?: EvidenceDocument[];
  verifiedAt?: string;
  verifiedBy?: string;
  potentialFine?: number;
  actualImpact?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ViolationEvidence {
  type: string;
  description: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

export interface RemediationTask {
  id: string;
  violationId: string;
  title: string;
  description?: string;
  priority: ViolationSeverity;
  assignedTo?: string;
  dueDate?: string;
  startedAt?: string;
  completedAt?: string;
  status: RemediationStatus;
  progressNotes?: string;
  evidenceProvided?: EvidenceDocument[];
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// AUDIT REPORT TYPES
// =============================================================================

export interface AuditReport {
  id: string;
  reportNumber?: string;
  reportType: 'compliance' | 'access' | 'security' | 'activity' | 'custom';
  title: string;
  dateRangeStart?: string;
  dateRangeEnd?: string;
  frameworks?: ComplianceFramework[];
  generatedBy?: string;
  generatedAt: string;
  generationParameters?: ReportParameters;
  summary?: string;
  findings?: ReportFinding[];
  statistics?: ReportStatistics;
  recommendations?: string[];
  exportFormat?: 'pdf' | 'csv' | 'json';
  filePath?: string;
  fileSizeBytes?: number;
  recipients?: string[];
  sentAt?: string;
  status: 'draft' | 'final' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface ReportParameters {
  includeUserActivity?: boolean;
  includeDataAccess?: boolean;
  includeComplianceStatus?: boolean;
  includeViolations?: boolean;
  filterByUsers?: string[];
  filterByResources?: string[];
  filterByActions?: AuditActionType[];
}

export interface ReportFinding {
  category: string;
  title: string;
  description: string;
  severity: ViolationSeverity;
  count?: number;
  examples?: string[];
}

export interface ReportStatistics {
  totalActions: number;
  actionsByType: Record<AuditActionType, number>;
  uniqueUsers: number;
  topUsers: { userId: string; email: string; count: number }[];
  topResources: { resourceType: string; resourceId: string; count: number }[];
  complianceScore?: number;
  violationsCount: number;
  violationsBySeverity: Record<ViolationSeverity, number>;
}

// =============================================================================
// LEGAL HOLD TYPES
// =============================================================================

export interface LegalHold {
  id: string;
  holdName: string;
  holdReference?: string;
  matterDescription?: string;
  custodians?: string[];
  tablesInScope?: string[];
  recordFilters?: Record<string, unknown>;
  dateRangeStart?: string;
  dateRangeEnd?: string;
  isActive: boolean;
  status: 'active' | 'released' | 'expired';
  effectiveFrom: string;
  expiresAt?: string;
  releasedAt?: string;
  releasedBy?: string;
  releaseReason?: string;
  createdBy?: string;
  legalContact?: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// CONSENT TYPES
// =============================================================================

export interface ConsentRecord {
  id: string;
  userId: string;
  consentType: 'data_processing' | 'marketing' | 'analytics' | 'third_party_sharing';
  consentVersion: string;
  isGranted: boolean;
  grantedAt?: string;
  withdrawnAt?: string;
  ipAddress?: string;
  userAgent?: string;
  consentSource: string;
  consentText?: string;
  privacyPolicyVersion?: string;
  withdrawalReason?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// DASHBOARD & STATISTICS TYPES
// =============================================================================

export interface ComplianceDashboardData {
  overallScore: number;
  frameworkScores: Record<ComplianceFramework, number>;
  pendingRequests: number;
  openViolations: number;
  violationsBySeverity: Record<ViolationSeverity, number>;
  recentActivity: ComprehensiveAuditLog[];
  upcomingDeadlines: DataSubjectRequest[];
  retentionPolicyStatus: DataRetentionPolicy[];
  requirementsByStatus: Record<ComplianceStatus, number>;
}

export interface AuditDashboardData {
  totalLogsToday: number;
  totalLogsThisWeek: number;
  uniqueUsersToday: number;
  actionDistribution: Record<AuditActionType, number>;
  topAccessedResources: { resourceType: string; count: number }[];
  suspiciousActivity: ComprehensiveAuditLog[];
  recentSessions: UserSession[];
  dataAccessByUser: { userId: string; email: string; count: number }[];
}

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

export interface AuditLogFilters {
  userId?: string;
  action?: AuditActionType | AuditActionType[];
  resourceType?: string;
  resourceId?: string;
  startDate?: string;
  endDate?: string;
  complianceRelevant?: boolean;
  isSensitiveData?: boolean;
  ipAddress?: string;
  limit?: number;
  offset?: number;
}

export interface DataRequestFilters {
  status?: DataRequestStatus | DataRequestStatus[];
  requestType?: DataRequestType | DataRequestType[];
  assignedTo?: string;
  framework?: ComplianceFramework;
  startDate?: string;
  endDate?: string;
  overdue?: boolean;
  limit?: number;
  offset?: number;
}

export interface ComplianceCheckResult {
  framework: ComplianceFramework;
  overallStatus: ComplianceStatus;
  score: number;
  requirements: {
    code: string;
    name: string;
    status: ComplianceStatus;
    notes?: string;
  }[];
  issues: string[];
  recommendations: string[];
}

export interface ExportRequest {
  format: 'json' | 'csv' | 'xml' | 'pdf';
  dateRange?: { start: string; end: string };
  includeFields?: string[];
  excludeFields?: string[];
  filters?: Record<string, unknown>;
}

export interface ExportResponse {
  exportId: string;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  downloadUrl?: string;
  expiresAt?: string;
  error?: string;
}

// =============================================================================
// CONSTANTS & LABELS
// =============================================================================

export const COMPLIANCE_FRAMEWORK_LABELS: Record<
  ComplianceFramework,
  { name: string; fullName: string; region: string }
> = {
  pipeda: {
    name: 'PIPEDA',
    fullName: 'Personal Information Protection and Electronic Documents Act',
    region: 'Canada',
  },
  gdpr: {
    name: 'GDPR',
    fullName: 'General Data Protection Regulation',
    region: 'European Union',
  },
  ccpa: {
    name: 'CCPA',
    fullName: 'California Consumer Privacy Act',
    region: 'California, USA',
  },
  phipa: {
    name: 'PHIPA',
    fullName: 'Personal Health Information Protection Act',
    region: 'Ontario, Canada',
  },
  pipa_ab: {
    name: 'PIPA (AB)',
    fullName: 'Personal Information Protection Act',
    region: 'Alberta, Canada',
  },
  pipa_bc: {
    name: 'PIPA (BC)',
    fullName: 'Personal Information Protection Act',
    region: 'British Columbia, Canada',
  },
  qc_private_sector: {
    name: 'Quebec Privacy Act',
    fullName: 'Act Respecting the Protection of Personal Information in the Private Sector',
    region: 'Quebec, Canada',
  },
};

export const AUDIT_ACTION_LABELS: Record<AuditActionType, { label: string; icon: string }> = {
  create: { label: 'Create', icon: 'plus-circle' },
  read: { label: 'View', icon: 'eye' },
  update: { label: 'Update', icon: 'pencil' },
  delete: { label: 'Delete', icon: 'trash' },
  login: { label: 'Login', icon: 'login' },
  logout: { label: 'Logout', icon: 'logout' },
  failed_login: { label: 'Failed Login', icon: 'x-circle' },
  export: { label: 'Export', icon: 'download' },
  import: { label: 'Import', icon: 'upload' },
  search: { label: 'Search', icon: 'search' },
  share: { label: 'Share', icon: 'share' },
  download: { label: 'Download', icon: 'arrow-down' },
  print: { label: 'Print', icon: 'printer' },
  consent_given: { label: 'Consent Given', icon: 'check-circle' },
  consent_withdrawn: { label: 'Consent Withdrawn', icon: 'x-circle' },
  data_request: { label: 'Data Request', icon: 'document' },
  data_erasure: { label: 'Data Erasure', icon: 'trash' },
  data_portability: { label: 'Data Export', icon: 'document-download' },
};

export const DATA_REQUEST_TYPE_LABELS: Record<
  DataRequestType,
  { label: string; description: string; deadline: string }
> = {
  access: {
    label: 'Access Request',
    description: 'Request to access personal data',
    deadline: '30 days',
  },
  rectification: {
    label: 'Rectification Request',
    description: 'Request to correct inaccurate data',
    deadline: '30 days',
  },
  erasure: {
    label: 'Erasure Request',
    description: 'Right to be forgotten',
    deadline: '30 days',
  },
  portability: {
    label: 'Portability Request',
    description: 'Request data in portable format',
    deadline: '30 days',
  },
  restriction: {
    label: 'Restriction Request',
    description: 'Request to restrict processing',
    deadline: '30 days',
  },
  objection: {
    label: 'Objection',
    description: 'Object to data processing',
    deadline: '30 days',
  },
  legal_hold: {
    label: 'Legal Hold',
    description: 'Legal discovery request',
    deadline: 'Varies',
  },
  law_enforcement: {
    label: 'Law Enforcement',
    description: 'Law enforcement data request',
    deadline: 'Varies',
  },
};

export const VIOLATION_SEVERITY_CONFIG: Record<
  ViolationSeverity,
  { label: string; color: string; bgColor: string }
> = {
  critical: { label: 'Critical', color: 'text-red-700', bgColor: 'bg-red-100' },
  high: { label: 'High', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  medium: { label: 'Medium', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  low: { label: 'Low', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  info: { label: 'Info', color: 'text-gray-700', bgColor: 'bg-gray-100' },
};

export const COMPLIANCE_STATUS_CONFIG: Record<
  ComplianceStatus,
  { label: string; color: string; bgColor: string }
> = {
  compliant: { label: 'Compliant', color: 'text-green-700', bgColor: 'bg-green-100' },
  non_compliant: { label: 'Non-Compliant', color: 'text-red-700', bgColor: 'bg-red-100' },
  partial: { label: 'Partial', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  pending_review: { label: 'Pending Review', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  not_applicable: { label: 'N/A', color: 'text-gray-700', bgColor: 'bg-gray-100' },
};

// =============================================================================
// DATABASE MAPPERS
// =============================================================================

export function mapAuditLogFromDb(row: Record<string, unknown>): ComprehensiveAuditLog {
  return {
    id: row.id as string,
    userId: row.user_id as string | undefined,
    sessionId: row.session_id as string | undefined,
    actorEmail: row.actor_email as string | undefined,
    actorRole: row.actor_role as string | undefined,
    actorOrganization: row.actor_organization as string | undefined,
    impersonatedBy: row.impersonated_by as string | undefined,
    action: row.action as AuditActionType,
    actionDescription: row.action_description as string | undefined,
    resourceType: row.resource_type as string,
    resourceId: row.resource_id as string | undefined,
    resourceName: row.resource_name as string | undefined,
    oldValues: row.old_values as Record<string, unknown> | undefined,
    newValues: row.new_values as Record<string, unknown> | undefined,
    changedFields: row.changed_fields as string[] | undefined,
    ipAddress: row.ip_address as string | undefined,
    userAgent: row.user_agent as string | undefined,
    requestMethod: row.request_method as string | undefined,
    requestPath: row.request_path as string | undefined,
    requestQuery: row.request_query as Record<string, unknown> | undefined,
    responseStatus: row.response_status as number | undefined,
    responseTimeMs: row.response_time_ms as number | undefined,
    geoCountry: row.geo_country as string | undefined,
    geoRegion: row.geo_region as string | undefined,
    geoCity: row.geo_city as string | undefined,
    geoCoordinates: row.geo_coordinates as { lat: number; lng: number } | undefined,
    isSensitiveData: row.is_sensitive_data as boolean,
    dataClassification: row.data_classification as string | undefined,
    complianceRelevant: row.compliance_relevant as boolean,
    complianceFrameworks: row.compliance_frameworks as ComplianceFramework[] | undefined,
    retentionUntil: row.retention_until as string | undefined,
    isArchived: row.is_archived as boolean,
    archivedAt: row.archived_at as string | undefined,
    createdAt: row.created_at as string,
  };
}

export function mapDataSubjectRequestFromDb(row: Record<string, unknown>): DataSubjectRequest {
  return {
    id: row.id as string,
    requestNumber: row.request_number as string | undefined,
    requestorId: row.requestor_id as string | undefined,
    requestorEmail: row.requestor_email as string,
    requestorName: row.requestor_name as string | undefined,
    requestorPhone: row.requestor_phone as string | undefined,
    identityVerified: row.identity_verified as boolean,
    identityVerifiedAt: row.identity_verified_at as string | undefined,
    identityVerifiedBy: row.identity_verified_by as string | undefined,
    verificationMethod: row.verification_method as string | undefined,
    verificationDocuments: row.verification_documents as VerificationDocument[] | undefined,
    requestType: row.request_type as DataRequestType,
    requestDescription: row.request_description as string | undefined,
    specificDataRequested: row.specific_data_requested as string[] | undefined,
    applicableFramework: row.applicable_framework as ComplianceFramework | undefined,
    status: row.status as DataRequestStatus,
    assignedTo: row.assigned_to as string | undefined,
    priority: row.priority as ViolationSeverity,
    submittedAt: row.submitted_at as string,
    acknowledgedAt: row.acknowledged_at as string | undefined,
    dueDate: row.due_date as string | undefined,
    completedAt: row.completed_at as string | undefined,
    responseNotes: row.response_notes as string | undefined,
    dataProvided: row.data_provided as Record<string, unknown> | undefined,
    denialReason: row.denial_reason as string | undefined,
    processingLog: row.processing_log as ProcessingStep[] | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function mapComplianceViolationFromDb(row: Record<string, unknown>): ComplianceViolation {
  return {
    id: row.id as string,
    violationCode: row.violation_code as string | undefined,
    title: row.title as string,
    description: row.description as string | undefined,
    framework: row.framework as ComplianceFramework | undefined,
    requirementId: row.requirement_id as string | undefined,
    severity: row.severity as ViolationSeverity,
    detectedAt: row.detected_at as string,
    detectedBy: row.detected_by as string,
    detectorId: row.detector_id as string | undefined,
    affectedResourceType: row.affected_resource_type as string | undefined,
    affectedResourceId: row.affected_resource_id as string | undefined,
    affectedUsers: row.affected_users as number | undefined,
    evidence: row.evidence as ViolationEvidence[] | undefined,
    auditLogIds: row.audit_log_ids as string[] | undefined,
    status: row.status as RemediationStatus,
    assignedTo: row.assigned_to as string | undefined,
    resolvedAt: row.resolved_at as string | undefined,
    resolvedBy: row.resolved_by as string | undefined,
    resolutionNotes: row.resolution_notes as string | undefined,
    resolutionEvidence: row.resolution_evidence as EvidenceDocument[] | undefined,
    verifiedAt: row.verified_at as string | undefined,
    verifiedBy: row.verified_by as string | undefined,
    potentialFine: row.potential_fine as number | undefined,
    actualImpact: row.actual_impact as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function mapUserSessionFromDb(row: Record<string, unknown>): UserSession {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    sessionTokenHash: row.session_token_hash as string,
    refreshTokenHash: row.refresh_token_hash as string | undefined,
    deviceId: row.device_id as string | undefined,
    deviceType: row.device_type as string | undefined,
    deviceName: row.device_name as string | undefined,
    browser: row.browser as string | undefined,
    browserVersion: row.browser_version as string | undefined,
    os: row.os as string | undefined,
    osVersion: row.os_version as string | undefined,
    ipAddress: row.ip_address as string | undefined,
    geoCountry: row.geo_country as string | undefined,
    geoRegion: row.geo_region as string | undefined,
    geoCity: row.geo_city as string | undefined,
    isActive: row.is_active as boolean,
    loginAt: row.login_at as string,
    lastActivityAt: row.last_activity_at as string,
    logoutAt: row.logout_at as string | undefined,
    logoutReason: row.logout_reason as string | undefined,
    isSuspicious: row.is_suspicious as boolean,
    suspiciousReason: row.suspicious_reason as string | undefined,
    mfaUsed: row.mfa_used as boolean,
    mfaMethod: row.mfa_method as string | undefined,
    expiresAt: row.expires_at as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
