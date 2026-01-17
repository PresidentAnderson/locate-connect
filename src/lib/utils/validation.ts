/**
 * Validation utilities for form fields
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate email address
 */
export function validateEmail(email: string): ValidationResult {
  if (!email) {
    return { isValid: false, error: "Email is required" };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: "Invalid email format" };
  }
  
  return { isValid: true };
}

/**
 * Validate phone number (supports North American formats)
 */
export function validatePhone(phone: string): ValidationResult {
  if (!phone) {
    return { isValid: false, error: "Phone number is required" };
  }
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");
  
  // Check if it's a valid North American number (10 or 11 digits)
  if (digits.length < 10 || digits.length > 11) {
    return { isValid: false, error: "Invalid phone number format" };
  }
  
  return { isValid: true };
}

/**
 * Validate required field
 */
export function validateRequired(value: string, fieldName: string): ValidationResult {
  if (!value || value.trim().length === 0) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  
  return { isValid: true };
}

/**
 * Validate date is not in the future
 */
export function validatePastDate(dateString: string, fieldName: string): ValidationResult {
  if (!dateString) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  
  const date = new Date(dateString);
  const now = new Date();
  
  if (isNaN(date.getTime())) {
    return { isValid: false, error: "Invalid date format" };
  }
  
  if (date > now) {
    return { isValid: false, error: `${fieldName} cannot be in the future` };
  }
  
  return { isValid: true };
}

/**
 * Validate age (for date of birth)
 */
export function validateDateOfBirth(dateString: string): ValidationResult {
  if (!dateString) {
    return { isValid: true }; // Optional field
  }
  
  const dob = new Date(dateString);
  const now = new Date();
  
  if (isNaN(dob.getTime())) {
    return { isValid: false, error: "Invalid date format" };
  }
  
  if (dob > now) {
    return { isValid: false, error: "Date of birth cannot be in the future" };
  }
  
  // Check if person is at least 0 and at most 150 years old
  const age = Math.floor((now.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  if (age < 0 || age > 150) {
    return { isValid: false, error: "Invalid date of birth" };
  }
  
  return { isValid: true };
}

/**
 * Validate reporter form
 */
export interface ReporterValidation extends Record<string, ValidationResult> {
  firstName: ValidationResult;
  lastName: ValidationResult;
  email: ValidationResult;
  phone: ValidationResult;
  relationship: ValidationResult;
}

export function validateReporterForm(data: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  relationship: string;
}): ReporterValidation {
  return {
    firstName: validateRequired(data.firstName, "First name"),
    lastName: validateRequired(data.lastName, "Last name"),
    email: validateEmail(data.email),
    phone: validatePhone(data.phone),
    relationship: validateRequired(data.relationship, "Relationship"),
  };
}

/**
 * Check if validation result has errors
 */
export function hasValidationErrors(validation: Record<string, ValidationResult>): boolean {
  return Object.values(validation).some(v => !v.isValid);
}

/**
 * Validate missing person form
 */
export interface MissingPersonValidation extends Record<string, ValidationResult> {
  firstName: ValidationResult;
  lastName: ValidationResult;
  dateOfBirth: ValidationResult;
}

export function validateMissingPersonForm(data: {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
}): MissingPersonValidation {
  return {
    firstName: validateRequired(data.firstName, "First name"),
    lastName: validateRequired(data.lastName, "Last name"),
    dateOfBirth: validateDateOfBirth(data.dateOfBirth),
  };
}

/**
 * Validate circumstances form
 */
export interface CircumstancesValidation extends Record<string, ValidationResult> {
  lastSeenDate: ValidationResult;
  lastSeenLocation: ValidationResult;
}

export function validateCircumstancesForm(data: {
  lastSeenDate: string;
  lastSeenLocation: string;
}): CircumstancesValidation {
  return {
    lastSeenDate: validatePastDate(data.lastSeenDate, "Last seen date"),
    lastSeenLocation: validateRequired(data.lastSeenLocation, "Last seen location"),
  };
}
