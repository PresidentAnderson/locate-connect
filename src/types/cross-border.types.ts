/**
 * Cross-Border Coordination Types
 * For managing cases that cross provincial or international borders
 */

export type JurisdictionType = "municipal" | "provincial" | "federal" | "international";

export type AgencyType =
  | "police_department"
  | "state_police"
  | "federal_agency"
  | "border_services"
  | "coast_guard"
  | "interpol"
  | "other";

export type HandoffStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "completed"
  | "cancelled";

export type AlertDistributionStatus =
  | "draft"
  | "pending_approval"
  | "active"
  | "expired"
  | "cancelled";

export type ComplianceStatus =
  | "compliant"
  | "pending_review"
  | "non_compliant"
  | "requires_action";

/**
 * International Agency Contact
 */
export interface InternationalAgency {
  id: string;
  name: string;
  nameLocal?: string; // Name in local language
  country: string;
  region?: string;
  agencyType: AgencyType;
  contactInfo: AgencyContactInfo;
  capabilities: AgencyCapabilities;
  treaties: string[]; // Treaty IDs this agency is party to
  dataExchangeAgreementId?: string;
  timezone: string;
  primaryLanguage: string;
  secondaryLanguages: string[];
  isActive: boolean;
  lastContactDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgencyContactInfo {
  primaryContact: string;
  email: string;
  phone: string;
  emergencyPhone?: string;
  fax?: string;
  address: string;
  website?: string;
  portal?: string; // URL to agency's data exchange portal
}

export interface AgencyCapabilities {
  acceptsCrossBorderCases: boolean;
  providesRealTimeAlerts: boolean;
  sharesIntelligence: boolean;
  hasSecureDataLink: boolean;
  supportsVideoConference: boolean;
  canIssueAlerts: boolean;
  hasTranslationServices: boolean;
}

/**
 * Multi-Jurisdiction Case Link
 */
export interface CrossBorderCase {
  id: string;
  primaryCaseId: string; // The originating case in our system
  linkedCaseIds: LinkedCase[];
  involvedJurisdictions: JurisdictionInvolvement[];
  leadJurisdiction: string; // Jurisdiction ID
  coordinatorId: string; // User ID of coordinator
  status: "active" | "resolved" | "transferred" | "closed";
  crossBorderNotes: string;
  createdAt: string;
  updatedAt: string;
}

export interface LinkedCase {
  caseId: string;
  externalCaseNumber?: string; // Case number in other jurisdiction
  jurisdictionId: string;
  agencyId: string;
  linkType: "related" | "duplicate" | "shared_subject" | "shared_location";
  linkConfidence: "confirmed" | "probable" | "possible";
  linkNotes: string;
  linkedAt: string;
  linkedBy: string; // User ID
}

export interface JurisdictionInvolvement {
  jurisdictionId: string;
  jurisdictionName: string;
  country: string;
  province?: string;
  role: "primary" | "secondary" | "supporting" | "observing";
  agencyId: string;
  contactPersonId?: string;
  involvedSince: string;
  involvementNotes: string;
}

/**
 * Cross-Border Alert Distribution
 */
export interface CrossBorderAlert {
  id: string;
  caseId: string;
  alertType: "amber_alert" | "silver_alert" | "missing_person" | "be_on_lookout" | "critical";
  title: string;
  titleTranslations?: Record<string, string>; // lang code -> translated title
  description: string;
  descriptionTranslations?: Record<string, string>;
  urgencyLevel: "critical" | "high" | "medium" | "low";
  targetJurisdictions: string[]; // Jurisdiction IDs
  distributedTo: AlertDistribution[];
  expiresAt: string;
  status: AlertDistributionStatus;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AlertDistribution {
  jurisdictionId: string;
  agencyId: string;
  distributedAt: string;
  distributionMethod: "email" | "portal" | "api" | "fax" | "manual";
  acknowledged: boolean;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  responseNotes?: string;
}

/**
 * Jurisdiction Handoff
 */
export interface JurisdictionHandoff {
  id: string;
  caseId: string;
  fromJurisdictionId: string;
  toJurisdictionId: string;
  fromAgencyId: string;
  toAgencyId: string;
  handoffType: "transfer" | "collaboration" | "information_sharing";
  reason: string;
  status: HandoffStatus;
  requestedBy: string;
  requestedAt: string;
  respondedBy?: string;
  respondedAt?: string;
  completedAt?: string;
  transferPackage: HandoffTransferPackage;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface HandoffTransferPackage {
  caseData: boolean;
  evidence: boolean;
  witnessStatements: boolean;
  forensicReports: boolean;
  timelineData: boolean;
  contactInformation: boolean;
  additionalDocuments: string[]; // Document IDs
  specialInstructions?: string;
}

/**
 * Treaty and Data Sharing Agreement
 */
export interface DataSharingAgreement {
  id: string;
  name: string;
  type: "bilateral" | "multilateral" | "treaty" | "memorandum";
  participatingJurisdictions: string[]; // Jurisdiction IDs
  participatingAgencies: string[]; // Agency IDs
  effectiveDate: string;
  expirationDate?: string;
  autoRenew: boolean;
  scope: AgreementScope;
  dataProtectionRequirements: DataProtectionRequirements;
  complianceRequirements: string[];
  documentUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgreementScope {
  allowedDataTypes: string[];
  allowedPurposes: string[];
  geographicScope: string;
  restrictions: string[];
}

export interface DataProtectionRequirements {
  encryptionRequired: boolean;
  minimumEncryptionStandard?: string;
  dataRetentionDays: number;
  deletionRequired: boolean;
  auditTrailRequired: boolean;
  consentRequired: boolean;
  anonymizationRequired: boolean;
  transferMechanism: "api" | "secure_portal" | "encrypted_email" | "physical_media";
}

/**
 * Compliance Tracking
 */
export interface ComplianceRecord {
  id: string;
  caseId?: string;
  agreementId: string;
  jurisdictionId: string;
  complianceType: "data_sharing" | "privacy_law" | "retention_policy" | "cross_border_transfer";
  status: ComplianceStatus;
  checkDate: string;
  checkedBy: string;
  findings: string;
  issuesFound: ComplianceIssue[];
  remediation?: RemediationPlan;
  nextReviewDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceIssue {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  requirement: string;
  currentState: string;
  requiredAction: string;
  deadline?: string;
  assignedTo?: string;
  resolvedAt?: string;
}

export interface RemediationPlan {
  steps: RemediationStep[];
  estimatedCompletionDate: string;
  responsibleParty: string;
  status: "planned" | "in_progress" | "completed" | "blocked";
}

export interface RemediationStep {
  step: number;
  description: string;
  assignedTo: string;
  dueDate: string;
  completed: boolean;
  completedAt?: string;
  notes?: string;
}

/**
 * Cross-Border Audit Trail
 */
export interface CrossBorderAuditLog {
  id: string;
  caseId: string;
  actionType:
    | "data_shared"
    | "alert_distributed"
    | "handoff_requested"
    | "handoff_completed"
    | "compliance_check"
    | "agreement_accessed"
    | "case_linked"
    | "case_unlinked";
  fromJurisdictionId: string;
  toJurisdictionId?: string;
  agencyId?: string;
  userId: string;
  userRole: string;
  dataShared?: string[]; // Types of data shared
  agreementId?: string;
  ipAddress: string;
  userAgent: string;
  details: Record<string, unknown>;
  timestamp: string;
}

/**
 * Time Zone Conversion
 */
export interface TimeZoneConversion {
  timestamp: string;
  sourceTimezone: string;
  targetTimezones: {
    timezone: string;
    displayTime: string;
    offset: string;
  }[];
}

/**
 * Currency Conversion for Rewards
 */
export interface CurrencyConversion {
  amount: number;
  sourceCurrency: string;
  targetCurrency: string;
  convertedAmount: number;
  exchangeRate: number;
  conversionDate: string;
  provider: string;
}

export interface RewardDistribution {
  id: string;
  caseId: string;
  totalAmount: number;
  baseCurrency: string;
  distributions: {
    jurisdictionId: string;
    amount: number;
    currency: string;
    convertedAmount?: number;
    exchangeRate?: number;
  }[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Partner Agency Registry
 */
export interface PartnerAgencyRegistry {
  usFederalAgencies: InternationalAgency[];
  usStateLawEnforcement: InternationalAgency[];
  canadianProvincialAgencies: InternationalAgency[];
  interpolOffices: InternationalAgency[];
  borderServices: {
    usCBP: InternationalAgency[];
    canadianCBSA: InternationalAgency[];
  };
  coastGuard: {
    us: InternationalAgency[];
    canada: InternationalAgency[];
  };
}
