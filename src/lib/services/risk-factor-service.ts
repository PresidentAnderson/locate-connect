/**
 * Risk Factor Service (LC-M2-003)
 * Service for managing sensitive risk factors with access controls and audit logging
 */

import type {
  SensitiveRiskFactor,
  RiskFactorInput,
  RiskFactorConsent,
  RiskFactorConsentInput,
  RiskFactorAccessLog,
  mapSensitiveRiskFactorFromDb,
  mapRiskFactorConsentFromDb,
} from '@/types';

export interface CreateRiskFactorParams {
  caseId: string;
  reporterId: string;
  factors: RiskFactorInput[];
  consent: RiskFactorConsentInput;
  ipAddress?: string;
  userAgent?: string;
}

export interface RiskFactorAccessCheck {
  canView: boolean;
  canEdit: boolean;
  reason?: string;
  requiresCorrelation: boolean;
}

/**
 * Check if a user can access a specific risk factor
 */
export function checkRiskFactorAccess(
  userId: string,
  userRole: string,
  riskFactor: SensitiveRiskFactor
): RiskFactorAccessCheck {
  // Admin always has access
  if (userRole === 'admin') {
    return {
      canView: true,
      canEdit: true,
      requiresCorrelation: false,
    };
  }

  // Reporter who created it can view
  if (riskFactor.reporterId === userId) {
    return {
      canView: true,
      canEdit: false,
      requiresCorrelation: false,
    };
  }

  // Law enforcement requires correlation for viewing
  if (userRole === 'law_enforcement') {
    const hasCorrelation =
      (riskFactor.behavioralCorrelation && riskFactor.behavioralCorrelation.trim() !== '') ||
      (riskFactor.medicalCorrelation && riskFactor.medicalCorrelation.trim() !== '');

    if (!hasCorrelation) {
      return {
        canView: false,
        canEdit: false,
        reason: 'Risk factor requires behavioral or medical correlation to be viewed',
        requiresCorrelation: true,
      };
    }

    // Check if user is in authorized viewers
    const isAuthorized = riskFactor.authorizedViewers.includes(userId);
    
    return {
      canView: isAuthorized,
      canEdit: isAuthorized,
      reason: isAuthorized ? undefined : 'Not in authorized viewers list',
      requiresCorrelation: true,
    };
  }

  // Default: no access
  return {
    canView: false,
    canEdit: false,
    reason: 'Insufficient permissions',
    requiresCorrelation: true,
  };
}

/**
 * Validate risk factor consent
 */
export function validateRiskFactorConsent(
  consent: RiskFactorConsentInput
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!consent.acknowledgedNonAccusatory) {
    errors.push('Must acknowledge non-accusatory nature');
  }

  if (!consent.acknowledgedCorroborationRequired) {
    errors.push('Must acknowledge corroboration requirement');
  }

  if (!consent.acknowledgedLimitedWeight) {
    errors.push('Must acknowledge limited weight in priority');
  }

  if (!consent.acknowledgedPrivacyProtections) {
    errors.push('Must acknowledge privacy protections');
  }

  if (!consent.acceptedSensitivityDisclaimer) {
    errors.push('Must accept sensitivity disclaimer');
  }

  if (!consent.acceptedPrivacyPolicy) {
    errors.push('Must accept privacy policy');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate weight for risk factor in priority calculation
 * Per LC-M2-003: Low weight, only surfaces with behavioral/medical correlation
 */
export function calculateRiskFactorWeight(
  factor: SensitiveRiskFactor
): number {
  // Base weight is low (0.05 to 0.15 depending on severity)
  let weight = factor.weightInPriority;

  // Only apply weight if there's correlation
  const hasCorrelation =
    (factor.behavioralCorrelation && factor.behavioralCorrelation.trim() !== '') ||
    (factor.medicalCorrelation && factor.medicalCorrelation.trim() !== '');

  if (!hasCorrelation) {
    weight = 0; // No weight without correlation
  }

  // Further reduce weight if not corroborated
  if (!factor.isCorroborated) {
    weight = weight * 0.5;
  }

  return weight;
}

/**
 * Generate correlation summary for display
 */
export function generateCorrelationSummary(
  factor: SensitiveRiskFactor
): string {
  const correlations: string[] = [];

  if (factor.behavioralCorrelation && factor.behavioralCorrelation.trim()) {
    correlations.push('behavioral indicators');
  }

  if (factor.medicalCorrelation && factor.medicalCorrelation.trim()) {
    correlations.push('medical factors');
  }

  if (correlations.length === 0) {
    return 'No correlation established';
  }

  return `Correlated with ${correlations.join(' and ')}`;
}

/**
 * Sanitize risk factor for display to prevent identifiers
 */
export function sanitizeRiskFactorForLE(
  factor: SensitiveRiskFactor
): Partial<SensitiveRiskFactor> | null {
  // Don't show if not included in LE view
  if (!factor.includedInLeView) {
    return null;
  }

  // Don't show without correlation
  const hasCorrelation =
    (factor.behavioralCorrelation && factor.behavioralCorrelation.trim() !== '') ||
    (factor.medicalCorrelation && factor.medicalCorrelation.trim() !== '');

  if (!hasCorrelation) {
    return null;
  }

  // Return sanitized version (no reporter info, no specific identifiers)
  return {
    id: factor.id,
    category: factor.category,
    factorType: factor.factorType,
    severity: factor.severity,
    behavioralCorrelation: factor.behavioralCorrelation,
    medicalCorrelation: factor.medicalCorrelation,
    isCorroborated: factor.isCorroborated,
    weightInPriority: factor.weightInPriority,
  };
}

/**
 * Get default authorized viewers based on case and jurisdiction
 */
export function getDefaultAuthorizedViewers(
  caseId: string,
  primaryInvestigatorId?: string,
  assignedOrganizationAdmins?: string[]
): string[] {
  const authorized: string[] = [];

  // Primary investigator if assigned
  if (primaryInvestigatorId) {
    authorized.push(primaryInvestigatorId);
  }

  // Organization admins if applicable
  if (assignedOrganizationAdmins) {
    authorized.push(...assignedOrganizationAdmins);
  }

  return authorized;
}

/**
 * Create audit log entry for risk factor access
 */
export function createAccessLogEntry(params: {
  riskFactorId: string;
  caseId: string;
  accessedBy: string;
  accessType: 'read' | 'create' | 'update' | 'delete' | 'export';
  accessReason?: string;
  factor: SensitiveRiskFactor;
  userRole?: string;
  userOrganization?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}): Omit<RiskFactorAccessLog, 'id' | 'accessedAt'> {
  const hasCorrelation =
    (params.factor.behavioralCorrelation && params.factor.behavioralCorrelation.trim() !== '') ||
    (params.factor.medicalCorrelation && params.factor.medicalCorrelation.trim() !== '');

  return {
    riskFactorId: params.riskFactorId,
    caseId: params.caseId,
    accessedBy: params.accessedBy,
    accessType: params.accessType,
    accessReason: params.accessReason,
    accessGranted: true,
    userRole: params.userRole,
    userOrganization: params.userOrganization,
    hadBehavioralCorrelation: !!(params.factor.behavioralCorrelation && params.factor.behavioralCorrelation.trim()),
    hadMedicalCorrelation: !!(params.factor.medicalCorrelation && params.factor.medicalCorrelation.trim()),
    correlationDetails: hasCorrelation
      ? generateCorrelationSummary(params.factor)
      : 'No correlation provided',
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    sessionId: params.sessionId,
    denialReason: undefined,
  };
}

/**
 * Get non-accusatory language helpers
 */
export const NON_ACCUSATORY_LANGUAGE = {
  prompts: {
    interpersonal: 'Is there anyone in the missing person\'s life who you have concerns about? (This helps us understand context, not to accuse anyone)',
    behavioral: 'Have you noticed any changes in behavior or patterns that might help us understand the situation?',
    environmental: 'Are there any environmental factors or circumstances that might be relevant?',
    historical: 'Is there any background information that might provide helpful context?',
  },
  disclaimers: {
    beforeSection: 'The following questions are asked to provide context that may help in the search. This information is not used to accuse or blame anyone.',
    afterSubmit: 'Thank you for providing this information. It will be handled with appropriate privacy protections and used only to aid in the search.',
  },
  labels: {
    concern: 'concern',
    context: 'context',
    information: 'information',
    circumstance: 'circumstance',
  },
};
