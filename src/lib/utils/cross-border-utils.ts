/**
 * Cross-Border Utilities
 * Time zone management and currency conversion for cross-border coordination
 */

/**
 * Common time zones for cross-border coordination
 */
export const COMMON_TIMEZONES = {
  // Canada
  NST: "America/St_Johns", // Newfoundland
  AST: "America/Halifax", // Atlantic
  EST: "America/Toronto", // Eastern
  CST: "America/Winnipeg", // Central
  MST: "America/Edmonton", // Mountain
  PST: "America/Vancouver", // Pacific

  // United States
  US_EASTERN: "America/New_York",
  US_CENTRAL: "America/Chicago",
  US_MOUNTAIN: "America/Denver",
  US_PACIFIC: "America/Los_Angeles",
  US_ALASKA: "America/Anchorage",
  US_HAWAII: "Pacific/Honolulu",

  // Europe
  UTC: "UTC",
  GMT: "Europe/London",
  CET: "Europe/Paris", // Central European Time
  EET: "Europe/Athens", // Eastern European Time
} as const;

export type CommonTimezone = (typeof COMMON_TIMEZONES)[keyof typeof COMMON_TIMEZONES];

/**
 * Convert a timestamp to multiple time zones
 */
export function convertToTimezones(
  timestamp: Date | string,
  targetTimezones: string[]
): { timezone: string; displayTime: string; offset: string }[] {
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;

  return targetTimezones.map((timezone) => {
    try {
      const displayTime = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(date);

      // Calculate offset
      const offset = getTimezoneOffset(date, timezone);

      return {
        timezone,
        displayTime,
        offset,
      };
    } catch (error) {
      console.error(`Error converting to timezone ${timezone}:`, error);
      return {
        timezone,
        displayTime: "Invalid timezone",
        offset: "+00:00",
      };
    }
  });
}

/**
 * Get timezone offset in +/-HH:MM format
 */
function getTimezoneOffset(date: Date, timezone: string): string {
  const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const tzDate = new Date(date.toLocaleString("en-US", { timeZone: timezone }));
  const offsetMs = tzDate.getTime() - utcDate.getTime();
  const offsetHours = Math.floor(Math.abs(offsetMs) / (1000 * 60 * 60));
  const offsetMinutes = Math.floor((Math.abs(offsetMs) % (1000 * 60 * 60)) / (1000 * 60));
  const sign = offsetMs >= 0 ? "+" : "-";
  return `${sign}${String(offsetHours).padStart(2, "0")}:${String(offsetMinutes).padStart(2, "0")}`;
}

/**
 * Format time for display in a specific timezone
 */
export function formatTimeInTimezone(
  timestamp: Date | string,
  timezone: string,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  };

  return new Intl.DateTimeFormat("en-US", defaultOptions).format(date);
}

/**
 * Get current time in multiple time zones (for real-time coordination)
 */
export function getCurrentTimeInTimezones(
  timezones: string[]
): { timezone: string; time: string; date: string }[] {
  const now = new Date();

  return timezones.map((timezone) => {
    const timeFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const dateFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    return {
      timezone,
      time: timeFormatter.format(now),
      date: dateFormatter.format(now),
    };
  });
}

// ============================================================================
// Currency Conversion
// ============================================================================

/**
 * Common currencies for cross-border coordination
 */
export const COMMON_CURRENCIES = {
  CAD: "Canadian Dollar",
  USD: "US Dollar",
  EUR: "Euro",
  GBP: "British Pound",
  MXN: "Mexican Peso",
} as const;

export type CommonCurrency = keyof typeof COMMON_CURRENCIES;

/**
 * Exchange rates (would typically come from an API)
 * These are approximate rates and should be updated from a real-time source
 */
const EXCHANGE_RATES: Record<string, Record<string, number>> = {
  CAD: {
    USD: 0.73,
    EUR: 0.68,
    GBP: 0.58,
    MXN: 13.5,
  },
  USD: {
    CAD: 1.37,
    EUR: 0.93,
    GBP: 0.79,
    MXN: 18.5,
  },
  EUR: {
    CAD: 1.47,
    USD: 1.08,
    GBP: 0.85,
    MXN: 20.0,
  },
  GBP: {
    CAD: 1.72,
    USD: 1.27,
    EUR: 1.18,
    MXN: 23.5,
  },
  MXN: {
    CAD: 0.074,
    USD: 0.054,
    EUR: 0.050,
    GBP: 0.043,
  },
};

/**
 * Convert currency amount
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): {
  amount: number;
  sourceCurrency: string;
  targetCurrency: string;
  convertedAmount: number;
  exchangeRate: number;
  conversionDate: string;
  provider: string;
} {
  if (fromCurrency === toCurrency) {
    return {
      amount,
      sourceCurrency: fromCurrency,
      targetCurrency: toCurrency,
      convertedAmount: amount,
      exchangeRate: 1.0,
      conversionDate: new Date().toISOString(),
      provider: "internal",
    };
  }

  const rate = EXCHANGE_RATES[fromCurrency]?.[toCurrency] ?? 1.0;
  const convertedAmount = Number((amount * rate).toFixed(2));

  return {
    amount,
    sourceCurrency: fromCurrency,
    targetCurrency: toCurrency,
    convertedAmount,
    exchangeRate: rate,
    conversionDate: new Date().toISOString(),
    provider: "static_rates", // In production, use a real API
  };
}

/**
 * Convert an amount to multiple currencies
 */
export function convertToMultipleCurrencies(
  amount: number,
  sourceCurrency: string,
  targetCurrencies: string[]
): Array<{
  currency: string;
  amount: number;
  exchangeRate: number;
}> {
  return targetCurrencies.map((targetCurrency) => {
    const conversion = convertCurrency(amount, sourceCurrency, targetCurrency);
    return {
      currency: targetCurrency,
      amount: conversion.convertedAmount,
      exchangeRate: conversion.exchangeRate,
    };
  });
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: string, locale = "en-US"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
  }).format(amount);
}

/**
 * Distribute reward amounts across jurisdictions with currency conversion
 */
export function distributeRewardAcrossJurisdictions(
  totalAmount: number,
  baseCurrency: string,
  distributions: Array<{
    jurisdictionId: string;
    percentage: number;
    currency: string;
  }>
): Array<{
  jurisdictionId: string;
  amount: number;
  currency: string;
  convertedAmount: number;
  exchangeRate: number;
}> {
  // Validate percentages sum to 100
  const totalPercentage = distributions.reduce((sum, d) => sum + d.percentage, 0);
  if (Math.abs(totalPercentage - 100) > 0.01) {
    throw new Error("Distribution percentages must sum to 100");
  }

  return distributions.map((dist) => {
    const baseAmount = (totalAmount * dist.percentage) / 100;
    const conversion = convertCurrency(baseAmount, baseCurrency, dist.currency);

    return {
      jurisdictionId: dist.jurisdictionId,
      amount: baseAmount,
      currency: dist.currency,
      convertedAmount: conversion.convertedAmount,
      exchangeRate: conversion.exchangeRate,
    };
  });
}

// ============================================================================
// Language and Communication Utilities
// ============================================================================

/**
 * Supported languages for cross-border communication
 */
export const SUPPORTED_LANGUAGES = {
  en: "English",
  fr: "French",
  es: "Spanish",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  zh: "Chinese",
  ja: "Japanese",
  ar: "Arabic",
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

/**
 * Get language name
 */
export function getLanguageName(code: string): string {
  return SUPPORTED_LANGUAGES[code as SupportedLanguage] || code;
}

/**
 * Check if translation is needed
 */
export function needsTranslation(sourceLanguage: string, targetLanguages: string[]): boolean {
  return !targetLanguages.includes(sourceLanguage);
}

/**
 * Get missing translations
 */
export function getMissingTranslations(
  availableLanguages: string[],
  requiredLanguages: string[]
): string[] {
  return requiredLanguages.filter((lang) => !availableLanguages.includes(lang));
}

// ============================================================================
// Jurisdiction Distance Calculator
// ============================================================================

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Determine if a case is cross-border based on coordinates
 */
export function isCrossBorderCase(
  lastSeenLat: number,
  lastSeenLon: number,
  borderCoordinates: Array<{ lat: number; lon: number }>,
  thresholdKm = 50
): boolean {
  return borderCoordinates.some((border) => {
    const distance = calculateDistance(lastSeenLat, lastSeenLon, border.lat, border.lon);
    return distance <= thresholdKm;
  });
}
