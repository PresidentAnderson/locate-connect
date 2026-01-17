/**
 * Risk Factor Types (LC-M2-003)
 * Types for contextual/interpersonal risk intake with safe handling
 */

// =============================================================================
// ENUMS
// =============================================================================

export type RiskFactorCategory =
  | 'interpersonal'
  | 'behavioral'
  | 'environmental'
  | 'historical';

export type RiskFactorSeverity = 'low' | 'medium' | 'high';

export type RiskFactorAccessType =
  | 'read'
  | 'create'
  | 'update'
  | 'delete'
  | 'export';

// =============================================================================
// CORE TYPES
// =============================================================================

export interface SensitiveRiskFactor {
  id: string;
  caseId: string;
  category: RiskFactorCategory;
  factorType: string;
  description?: string;
  severity: RiskFactorSeverity;
  
  // Corroboration
  requiresCorroboration: boolean;
  isCorroborated: boolean;
  corroborationSource?: string;
  corroborationDate?: string;
  corroboratedBy?: string;
  
  // Reporter acknowledgment
  reporterAcknowledgedSensitivity: boolean;
  reporterAcknowledgmentTimestamp?: string;
  reporterId?: string;
  
  // Correlation with other factors
  behavioralCorrelation?: string;
  medicalCorrelation?: string;
  supportingEvidence?: string;
  
  // Access controls
  isRestricted: boolean;
  restrictionReason?: string;
  authorizedViewers: string[];
  
  // Metadata
  weightInPriority: number;
  includedInLeView: boolean;
  inclusionJustification?: string;
  
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface RiskFactorAccessLog {
  id: string;
  riskFactorId: string;
  caseId: string;
  
  // Access details
  accessedBy: string;
  accessType: RiskFactorAccessType;
  accessReason?: string;
  accessGranted: boolean;
  denialReason?: string;
  
  // Context
  userRole?: string;
  userOrganization?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  
  // Correlation checks
  hadBehavioralCorrelation: boolean;
  hadMedicalCorrelation: boolean;
  correlationDetails?: string;
  
  accessedAt: string;
}

export interface RiskFactorConsent {
  id: string;
  caseId: string;
  reporterId: string;
  
  // Consent
  consentGiven: boolean;
  consentText: string;
  consentVersion: string;
  
  // Acknowledgments
  acknowledgedNonAccusatory: boolean;
  acknowledgedCorroborationRequired: boolean;
  acknowledgedLimitedWeight: boolean;
  acknowledgedPrivacyProtections: boolean;
  
  // Disclaimers
  acceptedSensitivityDisclaimer: boolean;
  acceptedPrivacyPolicy: boolean;
  
  ipAddress?: string;
  userAgent?: string;
  
  consentedAt: string;
  expiresAt?: string;
  createdAt: string;
}

// =============================================================================
// FORM INPUT TYPES
// =============================================================================

export interface RiskFactorInput {
  category: RiskFactorCategory;
  factorType: string;
  description?: string;
  severity: RiskFactorSeverity;
  behavioralCorrelation?: string;
  medicalCorrelation?: string;
  supportingEvidence?: string;
}

export interface RiskFactorConsentInput {
  acknowledgedNonAccusatory: boolean;
  acknowledgedCorroborationRequired: boolean;
  acknowledgedLimitedWeight: boolean;
  acknowledgedPrivacyProtections: boolean;
  acceptedSensitivityDisclaimer: boolean;
  acceptedPrivacyPolicy: boolean;
}

// =============================================================================
// DISPLAY TYPES
// =============================================================================

export interface RiskFactorDisplay {
  factor: SensitiveRiskFactor;
  canView: boolean;
  canEdit: boolean;
  viewRestrictionReason?: string;
  correlationSummary: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const RISK_FACTOR_CATEGORIES: Record<
  RiskFactorCategory,
  { label: string; description: string; icon: string }
> = {
  interpersonal: {
    label: 'Interpersonal',
    description: 'Relationships and social dynamics',
    icon: 'users',
  },
  behavioral: {
    label: 'Behavioral',
    description: 'Patterns of behavior and activities',
    icon: 'activity',
  },
  environmental: {
    label: 'Environmental',
    description: 'Surrounding conditions and context',
    icon: 'globe',
  },
  historical: {
    label: 'Historical',
    description: 'Past events and background',
    icon: 'clock',
  },
};

export const RISK_FACTOR_SEVERITY_CONFIG: Record<
  RiskFactorSeverity,
  { label: string; color: string; bgColor: string; weight: number }
> = {
  low: {
    label: 'Low',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    weight: 0.05,
  },
  medium: {
    label: 'Medium',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    weight: 0.10,
  },
  high: {
    label: 'High',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    weight: 0.15,
  },
};

// Common interpersonal risk factor types with non-accusatory language
export const INTERPERSONAL_RISK_TYPES = [
  {
    value: 'relationship_concern',
    label: 'Relationship Concern',
    description: 'Reporter has concerns about a relationship in the missing person\'s life',
  },
  {
    value: 'social_isolation',
    label: 'Social Isolation',
    description: 'Person may have limited social support network',
  },
  {
    value: 'recent_conflict',
    label: 'Recent Conflict',
    description: 'Recent disagreement or conflict reported',
  },
  {
    value: 'custody_concern',
    label: 'Custody Concern',
    description: 'Concerns related to custody arrangements',
  },
  {
    value: 'protective_order',
    label: 'Protective Order',
    description: 'Active protective or restraining order exists',
  },
  {
    value: 'other',
    label: 'Other Interpersonal Context',
    description: 'Other relevant interpersonal information',
  },
];

// Behavioral risk factor types with neutral language
export const BEHAVIORAL_RISK_TYPES = [
  {
    value: 'pattern_change',
    label: 'Pattern Change',
    description: 'Notable change in usual patterns or routines',
  },
  {
    value: 'communication_pattern',
    label: 'Communication Pattern',
    description: 'Information about communication habits',
  },
  {
    value: 'activity_concern',
    label: 'Activity Concern',
    description: 'Concerns about recent activities or behaviors',
  },
  {
    value: 'substance_use',
    label: 'Substance Use Context',
    description: 'Context about substance use if relevant to disappearance',
  },
  {
    value: 'other',
    label: 'Other Behavioral Context',
    description: 'Other relevant behavioral information',
  },
];

// Environmental risk factor types
export const ENVIRONMENTAL_RISK_TYPES = [
  {
    value: 'housing_instability',
    label: 'Housing Instability',
    description: 'Concerns about housing stability',
  },
  {
    value: 'financial_stress',
    label: 'Financial Stress',
    description: 'Information about financial pressures',
  },
  {
    value: 'employment_concern',
    label: 'Employment Concern',
    description: 'Recent employment changes or concerns',
  },
  {
    value: 'area_concern',
    label: 'Area Concern',
    description: 'Concerns about the area or environment',
  },
  {
    value: 'other',
    label: 'Other Environmental Context',
    description: 'Other relevant environmental information',
  },
];

// Historical risk factor types
export const HISTORICAL_RISK_TYPES = [
  {
    value: 'previous_disappearance',
    label: 'Previous Disappearance',
    description: 'Person has disappeared before',
  },
  {
    value: 'trauma_history',
    label: 'Trauma History',
    description: 'History of traumatic experiences',
  },
  {
    value: 'legal_history',
    label: 'Legal History',
    description: 'Relevant legal history or involvement',
  },
  {
    value: 'victimization_history',
    label: 'Victimization History',
    description: 'History of being victimized',
  },
  {
    value: 'other',
    label: 'Other Historical Context',
    description: 'Other relevant historical information',
  },
];

// Default consent text
export const DEFAULT_CONSENT_TEXT = `
I understand that the information I am providing in this section contains sensitive 
contextual information about the missing person's circumstances. I acknowledge that:

1. This information is being collected to aid in the search and is not meant to 
   accuse or blame anyone.
   
2. Any interpersonal or behavioral information I provide will require corroboration 
   from additional sources before being fully relied upon.
   
3. This information will have limited weight in priority calculations and will be 
   used primarily for context when combined with other verified factors.
   
4. This information is stored separately with enhanced privacy protections and will 
   not be shown to law enforcement by default unless there is clear correlation 
   with medical or behavioral risk factors.
   
5. All access to this information is logged and audited for privacy compliance.

I consent to providing this information to help in the search for the missing person.
`.trim();

// =============================================================================
// MAPPERS
// =============================================================================

export function mapSensitiveRiskFactorFromDb(
  row: Record<string, unknown>
): SensitiveRiskFactor {
  return {
    id: row.id as string,
    caseId: row.case_id as string,
    category: row.category as RiskFactorCategory,
    factorType: row.factor_type as string,
    description: row.description as string | undefined,
    severity: row.severity as RiskFactorSeverity,
    requiresCorroboration: row.requires_corroboration as boolean,
    isCorroborated: row.is_corroborated as boolean,
    corroborationSource: row.corroboration_source as string | undefined,
    corroborationDate: row.corroboration_date as string | undefined,
    corroboratedBy: row.corroborated_by as string | undefined,
    reporterAcknowledgedSensitivity: row.reporter_acknowledged_sensitivity as boolean,
    reporterAcknowledgmentTimestamp: row.reporter_acknowledgment_timestamp as string | undefined,
    reporterId: row.reporter_id as string | undefined,
    behavioralCorrelation: row.behavioral_correlation as string | undefined,
    medicalCorrelation: row.medical_correlation as string | undefined,
    supportingEvidence: row.supporting_evidence as string | undefined,
    isRestricted: row.is_restricted as boolean,
    restrictionReason: row.restriction_reason as string | undefined,
    authorizedViewers: (row.authorized_viewers as string[]) || [],
    weightInPriority: row.weight_in_priority as number,
    includedInLeView: row.included_in_le_view as boolean,
    inclusionJustification: row.inclusion_justification as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    createdBy: row.created_by as string | undefined,
    updatedBy: row.updated_by as string | undefined,
  };
}

export function mapRiskFactorConsentFromDb(
  row: Record<string, unknown>
): RiskFactorConsent {
  return {
    id: row.id as string,
    caseId: row.case_id as string,
    reporterId: row.reporter_id as string,
    consentGiven: row.consent_given as boolean,
    consentText: row.consent_text as string,
    consentVersion: row.consent_version as string,
    acknowledgedNonAccusatory: row.acknowledged_non_accusatory as boolean,
    acknowledgedCorroborationRequired: row.acknowledged_corroboration_required as boolean,
    acknowledgedLimitedWeight: row.acknowledged_limited_weight as boolean,
    acknowledgedPrivacyProtections: row.acknowledged_privacy_protections as boolean,
    acceptedSensitivityDisclaimer: row.accepted_sensitivity_disclaimer as boolean,
    acceptedPrivacyPolicy: row.accepted_privacy_policy as boolean,
    ipAddress: row.ip_address as string | undefined,
    userAgent: row.user_agent as string | undefined,
    consentedAt: row.consented_at as string,
    expiresAt: row.expires_at as string | undefined,
    createdAt: row.created_at as string,
  };
}
