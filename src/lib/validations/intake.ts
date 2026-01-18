/**
 * Intake Form Validation Schemas
 * Zod schemas for multi-step missing person intake form
 */

import { z } from 'zod';

// Phone number regex (flexible format)
const phoneRegex = /^[\d\s\-\+\(\)\.]{10,20}$/;

// Email regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// =============================================================================
// Step 1: Reporter Information
// =============================================================================

export const reporterSchema = z.object({
  reporterFirstName: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name must be less than 100 characters'),
  reporterLastName: z
    .string()
    .min(1, 'Last name is required')
    .max(100, 'Last name must be less than 100 characters'),
  reporterEmail: z
    .string()
    .min(1, 'Email is required')
    .regex(emailRegex, 'Please enter a valid email address'),
  reporterPhone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(phoneRegex, 'Please enter a valid phone number'),
  reporterAddress: z
    .string()
    .max(500, 'Address must be less than 500 characters')
    .optional(),
  reporterRelationship: z
    .string()
    .min(1, 'Please select your relationship to the missing person'),
});

export type ReporterFormData = z.infer<typeof reporterSchema>;

// =============================================================================
// Step 2: Missing Person Information
// =============================================================================

export const missingPersonSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name must be less than 100 characters'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(100, 'Last name must be less than 100 characters'),
  dateOfBirth: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const date = new Date(val);
        return !isNaN(date.getTime()) && date <= new Date();
      },
      { message: 'Please enter a valid date of birth' }
    ),
  gender: z.enum(['male', 'female', 'other', '']).optional(),
  height: z
    .string()
    .max(50, 'Height must be less than 50 characters')
    .optional(),
  weight: z
    .string()
    .max(50, 'Weight must be less than 50 characters')
    .optional(),
  hairColor: z
    .string()
    .max(50, 'Hair color must be less than 50 characters')
    .optional(),
  eyeColor: z
    .string()
    .max(50, 'Eye color must be less than 50 characters')
    .optional(),
  distinguishing: z
    .string()
    .max(2000, 'Distinguishing features must be less than 2000 characters')
    .optional(),
  photos: z
    .array(
      z.object({
        id: z.string(),
        url: z.string().url(),
        filename: z.string(),
        size: z.number(),
        uploadedAt: z.string(),
      })
    )
    .optional(),
});

export type MissingPersonFormData = z.infer<typeof missingPersonSchema>;

// =============================================================================
// Step 3: Circumstances
// =============================================================================

export const circumstancesSchema = z.object({
  lastSeenDate: z
    .string()
    .min(1, 'Last seen date is required')
    .refine(
      (val) => {
        const date = new Date(val);
        return !isNaN(date.getTime());
      },
      { message: 'Please enter a valid date' }
    ),
  lastSeenTime: z.string().optional(),
  lastSeenLocation: z
    .string()
    .min(1, 'Last known location is required')
    .max(500, 'Location must be less than 500 characters'),
  lastSeenLocationDetails: z
    .string()
    .max(1000, 'Location details must be less than 1000 characters')
    .optional(),
  lastSeenLocationConfidence: z.enum(['unknown', 'low', 'medium', 'high']).default('unknown'),
  lastSeenWitnessType: z
    .enum([
      'unknown',
      'self_reported',
      'family',
      'friend',
      'public',
      'law_enforcement',
      'camera',
      'other',
    ])
    .default('unknown'),
  outOfCharacter: z.boolean().default(false),
  circumstances: z
    .string()
    .max(5000, 'Circumstances must be less than 5000 characters')
    .optional(),
  unverifiedNotes: z
    .string()
    .max(2000, 'Notes must be less than 2000 characters')
    .optional(),
});

export type CircumstancesFormData = z.infer<typeof circumstancesSchema>;

// =============================================================================
// Step 4: Contacts
// =============================================================================

export const contactsSchema = z.object({
  contactEmails: z
    .string()
    .max(1000, 'Emails must be less than 1000 characters')
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const emails = val.split(/[\n,]+/).map((e) => e.trim()).filter(Boolean);
        return emails.every((email) => emailRegex.test(email) || email.length === 0);
      },
      { message: 'One or more email addresses are invalid' }
    ),
  contactPhones: z
    .string()
    .max(500, 'Phone numbers must be less than 500 characters')
    .optional(),
  socialHandles: z.record(z.string().max(100)).optional(),
  contactFriends: z
    .array(
      z.object({
        name: z.string().max(200).optional(),
        relationship: z.string().max(100).optional(),
        contact: z.string().max(200).optional(),
      })
    )
    .optional(),
});

export type ContactsFormData = z.infer<typeof contactsSchema>;

// =============================================================================
// Step 5: Languages
// =============================================================================

export const languagesSchema = z.object({
  reporterLanguages: z.array(z.string()).default([]),
  reporterPreferredLanguage: z.string().optional(),
  reporterNeedsInterpreter: z.boolean().default(false),
  reporterOtherLanguage: z.string().max(200).optional(),
  subjectPrimaryLanguages: z.array(z.string()).default([]),
  subjectRespondsToLanguages: z.array(z.string()).default([]),
  subjectCanCommunicateOfficial: z.boolean().default(true),
  subjectOtherLanguage: z.string().max(200).optional(),
});

export type LanguagesFormData = z.infer<typeof languagesSchema>;

// =============================================================================
// Step 6: Risks
// =============================================================================

export const risksSchema = z.object({
  medicalConditions: z
    .string()
    .max(2000, 'Medical conditions must be less than 2000 characters')
    .optional(),
  medications: z
    .string()
    .max(2000, 'Medications must be less than 2000 characters')
    .optional(),
  mentalHealthStatus: z.enum(['none', 'history', 'current', 'crisis']).default('none'),
  suicidalRisk: z.boolean().default(false),
  threats: z
    .array(
      z.object({
        name: z.string().max(200).optional(),
        relationship: z.string().max(100).optional(),
        description: z.string().max(500).optional(),
      })
    )
    .optional(),
});

export type RisksFormData = z.infer<typeof risksSchema>;

// =============================================================================
// Complete Intake Form Schema
// =============================================================================

export const intakeFormSchema = z.object({
  // Reporter
  ...reporterSchema.shape,
  // Missing Person
  ...missingPersonSchema.shape,
  // Circumstances
  ...circumstancesSchema.shape,
  // Contacts
  ...contactsSchema.shape,
  // Languages
  ...languagesSchema.shape,
  // Risks
  ...risksSchema.shape,
  // Review step confirmation
  confirmed: z.boolean().refine((val) => val === true, {
    message: 'You must confirm the information is accurate',
  }),
});

export type IntakeFormData = z.infer<typeof intakeFormSchema>;

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Validate a specific step of the form
 */
export function validateStep(
  step: number,
  data: Partial<IntakeFormData>
): { success: boolean; errors: Record<string, string> } {
  const schemas: Record<number, z.ZodSchema> = {
    0: reporterSchema,
    1: missingPersonSchema,
    2: circumstancesSchema,
    3: contactsSchema,
    4: languagesSchema,
    5: risksSchema,
  };

  const schema = schemas[step];
  if (!schema) {
    return { success: true, errors: {} };
  }

  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, errors: {} };
  }

  const errors: Record<string, string> = {};
  result.error.errors.forEach((err) => {
    const path = err.path.join('.');
    errors[path] = err.message;
  });

  return { success: false, errors };
}

/**
 * Get required fields for a step
 */
export function getRequiredFields(step: number): string[] {
  const requiredFields: Record<number, string[]> = {
    0: ['reporterFirstName', 'reporterLastName', 'reporterEmail', 'reporterPhone', 'reporterRelationship'],
    1: ['firstName', 'lastName'],
    2: ['lastSeenDate', 'lastSeenLocation'],
    3: [],
    4: [],
    5: [],
  };

  return requiredFields[step] || [];
}

/**
 * Check if a step is complete
 */
export function isStepComplete(step: number, data: Partial<IntakeFormData>): boolean {
  const requiredFields = getRequiredFields(step);

  return requiredFields.every((field) => {
    const value = data[field as keyof IntakeFormData];
    return value !== undefined && value !== null && value !== '';
  });
}

/**
 * Parse height string to centimeters
 */
export function parseHeightCm(value: string): number | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;

  // Match feet/inches format (e.g., "5'11", "5 ft 11 in")
  const footInchMatch = trimmed.match(/(\d+)\s*(?:ft|')\s*(\d+)?\s*(?:in|"|inches)?/);
  if (footInchMatch) {
    const feet = parseInt(footInchMatch[1], 10);
    const inches = footInchMatch[2] ? parseInt(footInchMatch[2], 10) : 0;
    if (!isNaN(feet) && !isNaN(inches)) {
      return Math.round((feet * 12 + inches) * 2.54);
    }
  }

  // Match cm format
  const cmMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*cm/);
  if (cmMatch) {
    return Math.round(parseFloat(cmMatch[1]));
  }

  // Plain number (assume cm)
  const numeric = parseFloat(trimmed);
  if (!isNaN(numeric)) {
    return Math.round(numeric);
  }

  return null;
}

/**
 * Parse weight string to kilograms
 */
export function parseWeightKg(value: string): number | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;

  // Match kg format
  const kgMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*kg/);
  if (kgMatch) {
    return Math.round(parseFloat(kgMatch[1]));
  }

  // Match lb format
  const lbMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*(?:lb|lbs|pounds?)/);
  if (lbMatch) {
    return Math.round(parseFloat(lbMatch[1]) * 0.453592);
  }

  // Plain number (assume kg)
  const numeric = parseFloat(trimmed);
  if (!isNaN(numeric)) {
    return Math.round(numeric);
  }

  return null;
}

/**
 * Parse comma/newline separated list
 */
export function parseList(value: string): string[] {
  return value
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}
