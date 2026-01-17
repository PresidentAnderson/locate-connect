/**
 * Indigenous Community Liaison Program Types
 * LC-FEAT-042: Specialized features for Indigenous communities
 */

// GeoJSON types (simplified subset)
declare namespace GeoJSON {
  export interface Feature {
    type: "Feature";
    geometry: Record<string, unknown>;
    properties: Record<string, unknown>;
  }
  export interface FeatureCollection {
    type: "FeatureCollection";
    features: Feature[];
  }
}

// =============================================================================
// ENUMS
// =============================================================================

export type IndigenousLanguage =
  | "cree"
  | "ojibwe"
  | "oji_cree"
  | "inuktitut"
  | "inuinnaqtun"
  | "dene"
  | "mohawk"
  | "mi_kmaq"
  | "blackfoot"
  | "salish"
  | "haida"
  | "tlingit"
  | "kwakwala"
  | "nuu_chah_nulth"
  | "gitxsan"
  | "carrier"
  | "chilcotin"
  | "shuswap"
  | "other";

export type IndigenousOrgType =
  | "national_organization"
  | "provincial_territorial_organization"
  | "tribal_council"
  | "band_council"
  | "metis_organization"
  | "inuit_organization"
  | "urban_indigenous_organization"
  | "womens_organization"
  | "youth_organization"
  | "health_services"
  | "legal_services"
  | "victim_services"
  | "friendship_centre"
  | "other";

export type DataGovernanceConsent =
  | "full_consent"
  | "limited_sharing"
  | "community_only"
  | "investigation_only"
  | "restricted"
  | "withdrawn";

export type MMIWGClassification =
  | "missing"
  | "murdered"
  | "suspicious_death"
  | "unexplained_death"
  | "historical_case"
  | "found_safe"
  | "found_deceased"
  | "under_investigation";

export type ConsultationStatus =
  | "pending"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "deferred"
  | "not_required";

export type CommunityType = "first_nation" | "inuit" | "metis";

export type PolicingArrangement =
  | "self_policed"
  | "rcmp"
  | "provincial"
  | "municipal"
  | "first_nations_police";

// =============================================================================
// INDIGENOUS COMMUNITY
// =============================================================================

export interface IndigenousCommunity {
  id: string;
  name: string;
  nameTraditional?: string;
  communityType: CommunityType;
  nation?: string;
  treatyArea?: string;
  province?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  traditionalTerritoryDescription?: string;
  primaryLanguage?: IndigenousLanguage;
  secondaryLanguages: IndigenousLanguage[];
  populationEstimate?: number;
  bandOfficePhone?: string;
  bandOfficeEmail?: string;
  bandOfficeAddress?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactEmail?: string;
  policingArrangement?: PolicingArrangement;
  policeServiceName?: string;
  policeServicePhone?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IndigenousCommunityInput {
  name: string;
  nameTraditional?: string;
  communityType: CommunityType;
  nation?: string;
  treatyArea?: string;
  province?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  traditionalTerritoryDescription?: string;
  primaryLanguage?: IndigenousLanguage;
  secondaryLanguages?: IndigenousLanguage[];
  populationEstimate?: number;
  bandOfficePhone?: string;
  bandOfficeEmail?: string;
  bandOfficeAddress?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactEmail?: string;
  policingArrangement?: PolicingArrangement;
  policeServiceName?: string;
  policeServicePhone?: string;
}

// =============================================================================
// INDIGENOUS ORGANIZATION
// =============================================================================

export interface IndigenousOrganization {
  id: string;
  name: string;
  nameFr?: string;
  nameIndigenous?: string;
  acronym?: string;
  orgType: IndigenousOrgType;
  description?: string;
  descriptionFr?: string;
  servicesOffered: string[];
  scope?: string;
  provincesServed: string[];
  regionsServed: string[];
  communitiesServed: string[];
  primaryPhone?: string;
  tollFreePhone?: string;
  crisisLine?: string;
  email?: string;
  website?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  isVerifiedPartner: boolean;
  partnershipDate?: string;
  partnershipAgreementUrl?: string;
  mouSigned: boolean;
  dataSharingAgreement: boolean;
  dataGovernanceContactName?: string;
  dataGovernanceContactEmail?: string;
  receivesAlerts: boolean;
  alertRegions: string[];
  alertCategories: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IndigenousOrganizationInput {
  name: string;
  nameFr?: string;
  nameIndigenous?: string;
  acronym?: string;
  orgType: IndigenousOrgType;
  description?: string;
  descriptionFr?: string;
  servicesOffered?: string[];
  scope?: string;
  provincesServed?: string[];
  regionsServed?: string[];
  primaryPhone?: string;
  tollFreePhone?: string;
  crisisLine?: string;
  email?: string;
  website?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  province?: string;
  postalCode?: string;
}

// =============================================================================
// INDIGENOUS LIAISON CONTACT
// =============================================================================

export interface IndigenousLiaisonContact {
  id: string;
  profileId?: string;
  firstName: string;
  lastName: string;
  title?: string;
  organizationId?: string;
  communityId?: string;
  languagesSpoken: IndigenousLanguage[];
  speaksEnglish: boolean;
  speaksFrench: boolean;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  preferredContactMethod?: "email" | "phone" | "mobile" | "in_person";
  available24_7: boolean;
  availabilityNotes?: string;
  specializations: string[];
  culturalProtocolsTrained: boolean;
  traumaInformedTrained: boolean;
  coverageRegions: string[];
  coverageCommunities: string[];
  isActive: boolean;
  isPrimaryContact: boolean;
  createdAt: string;
  updatedAt: string;
  // Joined relations
  organization?: IndigenousOrganization;
  community?: IndigenousCommunity;
}

export interface IndigenousLiaisonContactInput {
  profileId?: string;
  firstName: string;
  lastName: string;
  title?: string;
  organizationId?: string;
  communityId?: string;
  languagesSpoken?: IndigenousLanguage[];
  speaksEnglish?: boolean;
  speaksFrench?: boolean;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  preferredContactMethod?: "email" | "phone" | "mobile" | "in_person";
  available24_7?: boolean;
  availabilityNotes?: string;
  specializations?: string[];
  culturalProtocolsTrained?: boolean;
  traumaInformedTrained?: boolean;
  coverageRegions?: string[];
  coverageCommunities?: string[];
  isPrimaryContact?: boolean;
}

// =============================================================================
// CULTURAL SENSITIVITY RESOURCES
// =============================================================================

export type ResourceCategory =
  | "protocol"
  | "ceremony"
  | "communication"
  | "family_support"
  | "media"
  | "investigation";

export type ResourceType =
  | "document"
  | "video"
  | "audio"
  | "checklist"
  | "contact_list";

export interface CulturalSensitivityResource {
  id: string;
  title: string;
  titleFr?: string;
  titleIndigenous?: string;
  content: string;
  contentFr?: string;
  contentIndigenous?: string;
  category: ResourceCategory;
  subcategory?: string;
  appliesToNations: string[];
  appliesToRegions: string[];
  isUniversal: boolean;
  resourceType?: ResourceType;
  resourceUrl?: string;
  containsTraditionalKnowledge: boolean;
  traditionalKnowledgeConsent?: string;
  communityApproved: boolean;
  approvedByCommunityId?: string;
  isPublic: boolean;
  requiresTraining: boolean;
  lawEnforcementOnly: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CulturalSensitivityResourceInput {
  title: string;
  titleFr?: string;
  titleIndigenous?: string;
  content: string;
  contentFr?: string;
  contentIndigenous?: string;
  category: ResourceCategory;
  subcategory?: string;
  appliesToNations?: string[];
  appliesToRegions?: string[];
  isUniversal?: boolean;
  resourceType?: ResourceType;
  resourceUrl?: string;
  containsTraditionalKnowledge?: boolean;
  traditionalKnowledgeConsent?: string;
  communityApproved?: boolean;
  approvedByCommunityId?: string;
  isPublic?: boolean;
  requiresTraining?: boolean;
  lawEnforcementOnly?: boolean;
}

// =============================================================================
// MMIWG CASE
// =============================================================================

export interface MMIWGCase {
  id: string;
  caseId: string;
  classification: MMIWGClassification;
  isMMIWG2S: boolean;
  homeCommunityId?: string;
  nation?: string;
  treatyArea?: string;
  lastSeenOnReserve: boolean;
  lastSeenCommunityId?: string;
  traditionalTerritoryInvolved: boolean;
  familyLiaisonId?: string;
  familySupportOrgId?: string;
  culturalSupportRequested: boolean;
  ceremonySupportRequested: boolean;
  dataConsentLevel: DataGovernanceConsent;
  communityNotificationConsent: boolean;
  mediaConsent: boolean;
  researchConsent: boolean;
  priorInteractionWithSystems: string[];
  vulnerabilityFactors: string[];
  isHistoricalCase: boolean;
  originalReportDate?: string;
  originalInvestigatingAgency?: string;
  caseTransferredFrom?: string;
  consultationStatus: ConsultationStatus;
  consultationDate?: string;
  consultationNotes?: string;
  communityRepresentativePresent: boolean;
  includedInAnnualReport: boolean;
  reportedToNationalInquiry: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Joined relations
  homeCommunity?: IndigenousCommunity;
  lastSeenCommunity?: IndigenousCommunity;
  familyLiaison?: IndigenousLiaisonContact;
  familySupportOrg?: IndigenousOrganization;
}

export interface MMIWGCaseInput {
  caseId: string;
  classification: MMIWGClassification;
  isMMIWG2S?: boolean;
  homeCommunityId?: string;
  nation?: string;
  treatyArea?: string;
  lastSeenOnReserve?: boolean;
  lastSeenCommunityId?: string;
  traditionalTerritoryInvolved?: boolean;
  familyLiaisonId?: string;
  familySupportOrgId?: string;
  culturalSupportRequested?: boolean;
  ceremonySupportRequested?: boolean;
  dataConsentLevel?: DataGovernanceConsent;
  communityNotificationConsent?: boolean;
  mediaConsent?: boolean;
  researchConsent?: boolean;
  priorInteractionWithSystems?: string[];
  vulnerabilityFactors?: string[];
  isHistoricalCase?: boolean;
  originalReportDate?: string;
  originalInvestigatingAgency?: string;
  caseTransferredFrom?: string;
}

// =============================================================================
// COMMUNITY CONSULTATION
// =============================================================================

export type ConsultationType =
  | "initial"
  | "ongoing"
  | "resolution"
  | "annual_review";

export interface CommunityConsultation {
  id: string;
  caseId?: string;
  mmiwgCaseId?: string;
  communityId?: string;
  organizationId?: string;
  consultationType: ConsultationType;
  status: ConsultationStatus;
  scheduledDate?: string;
  completedDate?: string;
  lawEnforcementParticipants: string[];
  communityParticipants: string[];
  familyParticipantsPresent: boolean;
  location?: string;
  isOnReserve: boolean;
  elderPresent: boolean;
  ceremonyConducted: boolean;
  ceremonyType?: string;
  interpreterPresent: boolean;
  interpreterLanguage?: IndigenousLanguage;
  summary?: string;
  summaryFr?: string;
  actionItems: ConsultationActionItem[];
  agreementsReached: string[];
  concernsRaised: string[];
  followUpRequired: boolean;
  followUpDate?: string;
  followUpNotes?: string;
  isConfidential: boolean;
  canShareSummary: boolean;
  createdAt: string;
  updatedAt: string;
  // Joined relations
  community?: IndigenousCommunity;
  organization?: IndigenousOrganization;
}

export interface ConsultationActionItem {
  id: string;
  description: string;
  assignedTo?: string;
  dueDate?: string;
  status: "pending" | "in_progress" | "completed";
  notes?: string;
}

export interface CommunityConsultationInput {
  caseId?: string;
  mmiwgCaseId?: string;
  communityId?: string;
  organizationId?: string;
  consultationType: ConsultationType;
  scheduledDate?: string;
  location?: string;
  isOnReserve?: boolean;
}

// =============================================================================
// COMMUNITY NOTIFICATION
// =============================================================================

export type CommunityNotificationType =
  | "new_case"
  | "update"
  | "resolution"
  | "amber_alert"
  | "community_alert";

export type CommunityNotificationPriority = "low" | "normal" | "high" | "urgent";

export type IndigenousNotificationChannel = "email" | "sms" | "phone" | "in_person";

export interface CommunityNotification {
  id: string;
  caseId: string;
  communityId?: string;
  organizationId?: string;
  liaisonContactId?: string;
  notificationType: CommunityNotificationType;
  priority: CommunityNotificationPriority;
  subject: string;
  subjectFr?: string;
  message: string;
  messageFr?: string;
  messageIndigenous?: string;
  sentVia: IndigenousNotificationChannel[];
  sentAt?: string;
  sentBy?: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  responseNotes?: string;
  createdAt: string;
  updatedAt: string;
  // Joined relations
  community?: IndigenousCommunity;
  organization?: IndigenousOrganization;
  liaisonContact?: IndigenousLiaisonContact;
}

export interface CommunityNotificationInput {
  caseId: string;
  communityId?: string;
  organizationId?: string;
  liaisonContactId?: string;
  notificationType: CommunityNotificationType;
  priority?: CommunityNotificationPriority;
  subject: string;
  subjectFr?: string;
  message: string;
  messageFr?: string;
  messageIndigenous?: string;
  sentVia?: IndigenousNotificationChannel[];
}

// =============================================================================
// TRADITIONAL TERRITORY
// =============================================================================

export interface TraditionalTerritory {
  id: string;
  name: string;
  nameTraditional?: string;
  nation: string;
  description?: string;
  historicalContext?: string;
  boundsNorth?: number;
  boundsSouth?: number;
  boundsEast?: number;
  boundsWest?: number;
  centerLatitude?: number;
  centerLongitude?: number;
  boundaryGeojson?: GeoJSON.FeatureCollection | GeoJSON.Feature;
  treatyNumber?: string;
  treatyName?: string;
  treatyYear?: number;
  modernCommunityIds: string[];
  overlappingJurisdictionIds: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Joined relations
  modernCommunities?: IndigenousCommunity[];
}

export interface TraditionalTerritoryInput {
  name: string;
  nameTraditional?: string;
  nation: string;
  description?: string;
  historicalContext?: string;
  boundsNorth?: number;
  boundsSouth?: number;
  boundsEast?: number;
  boundsWest?: number;
  centerLatitude?: number;
  centerLongitude?: number;
  boundaryGeojson?: GeoJSON.FeatureCollection | GeoJSON.Feature;
  treatyNumber?: string;
  treatyName?: string;
  treatyYear?: number;
  modernCommunityIds?: string[];
  overlappingJurisdictionIds?: string[];
}

// =============================================================================
// DATA SOVEREIGNTY LOG
// =============================================================================

export type DataSovereigntyAction =
  | "data_access"
  | "data_share"
  | "consent_update"
  | "data_delete"
  | "export";

export interface IndigenousDataSovereigntyLog {
  id: string;
  caseId?: string;
  mmiwgCaseId?: string;
  communityId?: string;
  organizationId?: string;
  action: DataSovereigntyAction;
  actionDescription?: string;
  performedBy?: string;
  performedByOrganization?: string;
  consentVerified: boolean;
  consentLevel?: DataGovernanceConsent;
  communityNotificationSent: boolean;
  ocapOwnershipVerified: boolean;
  ocapControlVerified: boolean;
  ocapAccessVerified: boolean;
  ocapPossessionVerified: boolean;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

// =============================================================================
// DISPLAY HELPERS
// =============================================================================

export const INDIGENOUS_LANGUAGE_LABELS: Record<IndigenousLanguage, string> = {
  cree: "Cree",
  ojibwe: "Ojibwe",
  oji_cree: "Oji-Cree",
  inuktitut: "Inuktitut",
  inuinnaqtun: "Inuinnaqtun",
  dene: "Dene",
  mohawk: "Mohawk",
  mi_kmaq: "Mi'kmaq",
  blackfoot: "Blackfoot",
  salish: "Salish",
  haida: "Haida",
  tlingit: "Tlingit",
  kwakwala: "Kwakwala",
  nuu_chah_nulth: "Nuu-chah-nulth",
  gitxsan: "Gitxsan",
  carrier: "Carrier",
  chilcotin: "Chilcotin",
  shuswap: "Shuswap",
  other: "Other",
};

export const INDIGENOUS_ORG_TYPE_LABELS: Record<IndigenousOrgType, string> = {
  national_organization: "National Organization",
  provincial_territorial_organization: "Provincial/Territorial Organization",
  tribal_council: "Tribal Council",
  band_council: "Band Council",
  metis_organization: "Metis Organization",
  inuit_organization: "Inuit Organization",
  urban_indigenous_organization: "Urban Indigenous Organization",
  womens_organization: "Women's Organization",
  youth_organization: "Youth Organization",
  health_services: "Health Services",
  legal_services: "Legal Services",
  victim_services: "Victim Services",
  friendship_centre: "Friendship Centre",
  other: "Other",
};

export const DATA_GOVERNANCE_CONSENT_LABELS: Record<DataGovernanceConsent, string> = {
  full_consent: "Full Consent",
  limited_sharing: "Limited Sharing",
  community_only: "Community Only",
  investigation_only: "Investigation Only",
  restricted: "Restricted",
  withdrawn: "Withdrawn",
};

export const MMIWG_CLASSIFICATION_LABELS: Record<MMIWGClassification, string> = {
  missing: "Missing",
  murdered: "Murdered",
  suspicious_death: "Suspicious Death",
  unexplained_death: "Unexplained Death",
  historical_case: "Historical Case",
  found_safe: "Found Safe",
  found_deceased: "Found Deceased",
  under_investigation: "Under Investigation",
};

export const CONSULTATION_STATUS_LABELS: Record<ConsultationStatus, string> = {
  pending: "Pending",
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  deferred: "Deferred",
  not_required: "Not Required",
};

export const COMMUNITY_TYPE_LABELS: Record<CommunityType, string> = {
  first_nation: "First Nation",
  inuit: "Inuit",
  metis: "Metis",
};

// =============================================================================
// MMIWG STATISTICS
// =============================================================================

export interface MMIWGStatistics {
  totalCases: number;
  activeCases: number;
  resolvedCases: number;
  historicalCases: number;
  casesByClassification: Record<MMIWGClassification, number>;
  casesByProvince: Record<string, number>;
  casesByNation: Record<string, number>;
  averageResolutionDays?: number;
  consultationsCompleted: number;
  consultationsPending: number;
}
