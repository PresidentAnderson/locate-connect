/**
 * Draft saving utilities for intake form
 */

const DRAFT_KEY = "intake_form_draft";
const DRAFT_TIMESTAMP_KEY = "intake_form_draft_timestamp";

export interface IntakeFormDraft {
  // Reporter info
  reporterFirstName: string;
  reporterLastName: string;
  reporterEmail: string;
  reporterPhone: string;
  reporterAddress: string;
  reporterRelationship: string;
  
  // Missing person info
  missingFirstName: string;
  missingLastName: string;
  missingDateOfBirth: string;
  missingGender: string;
  missingHeight: string;
  missingWeight: string;
  missingHairColor: string;
  missingEyeColor: string;
  missingDistinguishing: string;
  photoUrl: string;
  
  // Circumstances
  lastSeenDate: string;
  lastSeenTime: string;
  lastSeenLocation: string;
  lastSeenLocationDetails: string;
  outOfCharacter: boolean;
  circumstances: string;
  
  // Contacts
  contactEmails: string;
  contactPhones: string;
  socialHandles: Record<string, string>;
  contactFriends: Array<{ name: string; relationship: string; contact: string }>;
  
  // Risks
  medicalConditions: string;
  medications: string;
  mentalHealthStatus: string;
  suicidalRisk: boolean;
  threats: Array<{ name: string; relationship: string; description: string }>;
  
  // Languages
  reporterLanguages: string[];
  reporterPreferredLanguage: string;
  reporterNeedsInterpreter: boolean;
  reporterOtherLanguage: string;
  subjectPrimaryLanguages: string[];
  subjectRespondsToLanguages: string[];
  subjectCanCommunicateOfficial: boolean;
  subjectOtherLanguage: string;
}

/**
 * Save draft to localStorage
 */
export function saveDraft(data: Partial<IntakeFormDraft>): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    localStorage.setItem(DRAFT_TIMESTAMP_KEY, new Date().toISOString());
  } catch (error) {
    console.error("Failed to save draft:", error);
  }
}

/**
 * Load draft from localStorage
 */
export function loadDraft(): IntakeFormDraft | null {
  try {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (!draft) return null;
    
    return JSON.parse(draft) as IntakeFormDraft;
  } catch (error) {
    console.error("Failed to load draft:", error);
    return null;
  }
}

/**
 * Clear draft from localStorage
 */
export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(DRAFT_TIMESTAMP_KEY);
  } catch (error) {
    console.error("Failed to clear draft:", error);
  }
}

/**
 * Get draft timestamp
 */
export function getDraftTimestamp(): Date | null {
  try {
    const timestamp = localStorage.getItem(DRAFT_TIMESTAMP_KEY);
    if (!timestamp) return null;
    
    return new Date(timestamp);
  } catch (error) {
    console.error("Failed to get draft timestamp:", error);
    return null;
  }
}

/**
 * Check if draft exists
 */
export function hasDraft(): boolean {
  return localStorage.getItem(DRAFT_KEY) !== null;
}
