import enCommon from "@/locales/en/common.json";
import frCommon from "@/locales/fr/common.json";
import crCommon from "@/locales/cr/common.json";
import iuCommon from "@/locales/iu/common.json";
import ojCommon from "@/locales/oj/common.json";
import micCommon from "@/locales/mic/common.json";
// Priority immigrant languages for Canada
import esCommon from "@/locales/es/common.json";
import zhCommon from "@/locales/zh/common.json";
import yueCommon from "@/locales/yue/common.json";
import paCommon from "@/locales/pa/common.json";
import tlCommon from "@/locales/tl/common.json";
import arCommon from "@/locales/ar/common.json";

import enIntake from "@/locales/en/intake.json";
import frIntake from "@/locales/fr/intake.json";
import crIntake from "@/locales/cr/intake.json";
import iuIntake from "@/locales/iu/intake.json";
import ojIntake from "@/locales/oj/intake.json";
import micIntake from "@/locales/mic/intake.json";
// Priority immigrant languages for Canada
import esIntake from "@/locales/es/intake.json";
import zhIntake from "@/locales/zh/intake.json";
import yueIntake from "@/locales/yue/intake.json";
import paIntake from "@/locales/pa/intake.json";
import tlIntake from "@/locales/tl/intake.json";
import arIntake from "@/locales/ar/intake.json";

export const DEFAULT_LOCALE = "en";

// All supported locales including official, indigenous, and priority immigrant languages
export const SUPPORTED_LOCALES = [
  "en",   // English (Official)
  "fr",   // French (Official)
  "es",   // Spanish
  "zh",   // Mandarin Chinese
  "yue",  // Cantonese
  "pa",   // Punjabi
  "tl",   // Tagalog
  "ar",   // Arabic (RTL)
  "cr",   // Cree (Indigenous)
  "iu",   // Inuktitut (Indigenous)
  "oj",   // Ojibwe (Indigenous)
  "mic",  // Mi'kmaq (Indigenous)
] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];
export type Namespace = "common" | "intake";

// RTL languages
export const RTL_LOCALES: Locale[] = ["ar"];

// Language categories for UI grouping
export type LocaleCategory = "official" | "immigrant" | "indigenous";

export interface LocaleMetadata {
  complete: boolean;
  direction: "ltr" | "rtl";
  category: LocaleCategory;
  fallbackChain: Locale[];
}

export const LOCALE_METADATA: Record<Locale, LocaleMetadata> = {
  en: { complete: true, direction: "ltr", category: "official", fallbackChain: [] },
  fr: { complete: true, direction: "ltr", category: "official", fallbackChain: ["en"] },
  es: { complete: true, direction: "ltr", category: "immigrant", fallbackChain: ["en"] },
  zh: { complete: true, direction: "ltr", category: "immigrant", fallbackChain: ["en"] },
  yue: { complete: true, direction: "ltr", category: "immigrant", fallbackChain: ["zh", "en"] },
  pa: { complete: true, direction: "ltr", category: "immigrant", fallbackChain: ["en"] },
  tl: { complete: true, direction: "ltr", category: "immigrant", fallbackChain: ["en"] },
  ar: { complete: true, direction: "rtl", category: "immigrant", fallbackChain: ["en"] },
  cr: { complete: false, direction: "ltr", category: "indigenous", fallbackChain: ["en"] },
  iu: { complete: false, direction: "ltr", category: "indigenous", fallbackChain: ["en"] },
  oj: { complete: false, direction: "ltr", category: "indigenous", fallbackChain: ["en"] },
  mic: { complete: false, direction: "ltr", category: "indigenous", fallbackChain: ["en"] },
};

const MESSAGES: Record<Locale, Record<Namespace, Record<string, unknown>>> = {
  en: { common: enCommon, intake: enIntake },
  fr: { common: frCommon, intake: frIntake },
  es: { common: esCommon, intake: esIntake },
  zh: { common: zhCommon, intake: zhIntake },
  yue: { common: yueCommon, intake: yueIntake },
  pa: { common: paCommon, intake: paIntake },
  tl: { common: tlCommon, intake: tlIntake },
  ar: { common: arCommon, intake: arIntake },
  cr: { common: crCommon, intake: crIntake },
  iu: { common: iuCommon, intake: iuIntake },
  oj: { common: ojCommon, intake: ojIntake },
  mic: { common: micCommon, intake: micIntake },
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMerge(
  base: Record<string, unknown>,
  override: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (isPlainObject(value) && isPlainObject(result[key])) {
      result[key] = deepMerge(result[key] as Record<string, unknown>, value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function getNestedValue(messages: Record<string, unknown>, key: string): string | undefined {
  const parts = key.split(".");
  let current: unknown = messages;

  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return typeof current === "string" ? current : undefined;
}

export function normalizeLocale(input: string | null | undefined): Locale {
  if (!input) return DEFAULT_LOCALE;
  const normalized = input.toLowerCase();

  // Handle common locale codes with regions (e.g., en-US, zh-CN, zh-HK, fr-CA)
  const localeMap: Record<string, Locale> = {
    "en": "en",
    "en-us": "en",
    "en-ca": "en",
    "en-gb": "en",
    "fr": "fr",
    "fr-ca": "fr",
    "fr-fr": "fr",
    "es": "es",
    "es-mx": "es",
    "es-es": "es",
    "zh": "zh",
    "zh-cn": "zh",
    "zh-hans": "zh",
    "zh-tw": "yue", // Taiwan often prefers traditional Chinese
    "zh-hk": "yue", // Hong Kong uses Cantonese
    "zh-hant": "yue",
    "yue": "yue",
    "pa": "pa",
    "pa-in": "pa",
    "tl": "tl",
    "tl-ph": "tl",
    "fil": "tl", // Filipino is based on Tagalog
    "ar": "ar",
    "ar-sa": "ar",
    "ar-eg": "ar",
    "cr": "cr",
    "iu": "iu",
    "oj": "oj",
    "mic": "mic",
  };

  // Check for exact match first
  if (localeMap[normalized]) {
    return localeMap[normalized];
  }

  // Fall back to base language code
  const base = normalized.split("-")[0];
  if (localeMap[base]) {
    return localeMap[base];
  }

  // Check if it's a valid locale
  if (SUPPORTED_LOCALES.includes(base as Locale)) {
    return base as Locale;
  }

  return DEFAULT_LOCALE;
}

/**
 * Detect the user's preferred locale from browser settings
 */
export function detectBrowserLocale(): Locale {
  if (typeof navigator === "undefined") return DEFAULT_LOCALE;

  // Check all browser languages in order of preference
  const languages = navigator.languages || [navigator.language];

  for (const lang of languages) {
    const normalized = normalizeLocale(lang);
    if (normalized !== DEFAULT_LOCALE || lang.toLowerCase().startsWith("en")) {
      return normalized;
    }
  }

  return DEFAULT_LOCALE;
}

/**
 * Build merged messages for next-intl with fallback chain support.
 */
export function getMessages(locale: Locale): Record<string, unknown> {
  const base = MESSAGES[DEFAULT_LOCALE];
  const fallbackChain = LOCALE_METADATA[locale]?.fallbackChain || [];
  const localesToMerge = [
    DEFAULT_LOCALE,
    ...fallbackChain.filter((l) => l !== DEFAULT_LOCALE),
    locale,
  ];

  const merged: Record<string, unknown> = {};

  (Object.keys(base) as Namespace[]).forEach((namespace) => {
    let namespaceMessages: Record<string, unknown> = {};
    localesToMerge.forEach((code) => {
      const messages = MESSAGES[code]?.[namespace];
      if (messages) {
        namespaceMessages = deepMerge(namespaceMessages, messages);
      }
    });
    merged[namespace] = namespaceMessages;
  });

  return merged;
}

/**
 * Translate a key with fallback chain support
 */
export function translate(locale: Locale, namespace: Namespace, key: string): string {
  const messages = MESSAGES[locale]?.[namespace];

  // Try the requested locale first
  const value = messages ? getNestedValue(messages, key) : undefined;
  if (value && value.trim().length > 0) return value;

  // Try fallback chain
  const fallbackChain = LOCALE_METADATA[locale]?.fallbackChain || [];
  for (const fallbackLocale of fallbackChain) {
    const fallbackMessages = MESSAGES[fallbackLocale]?.[namespace];
    const fallbackValue = fallbackMessages ? getNestedValue(fallbackMessages, key) : undefined;
    if (fallbackValue && fallbackValue.trim().length > 0) return fallbackValue;
  }

  // Final fallback to default locale
  const defaultMessages = MESSAGES[DEFAULT_LOCALE][namespace];
  const defaultValue = getNestedValue(defaultMessages, key);
  return defaultValue || key;
}

/**
 * Translate with variable interpolation
 * Usage: translateWithVars(locale, namespace, key, { name: "John", age: 25 })
 * Template: "Hello {{name}}, you are {{age}} years old"
 */
export function translateWithVars(
  locale: Locale,
  namespace: Namespace,
  key: string,
  vars: Record<string, string | number>
): string {
  let text = translate(locale, namespace, key);

  for (const [varName, varValue] of Object.entries(vars)) {
    text = text.replace(new RegExp(`\\{\\{${varName}\\}\\}`, "g"), String(varValue));
  }

  return text;
}

export function isLocaleComplete(locale: Locale): boolean {
  return LOCALE_METADATA[locale]?.complete ?? false;
}

export function isRTL(locale: Locale): boolean {
  return LOCALE_METADATA[locale]?.direction === "rtl";
}

export function getLocaleDirection(locale: Locale): "ltr" | "rtl" {
  return LOCALE_METADATA[locale]?.direction || "ltr";
}

export function getLocaleCategory(locale: Locale): LocaleCategory {
  return LOCALE_METADATA[locale]?.category || "official";
}

/**
 * Get locales grouped by category for UI display
 */
export function getLocalesByCategory(): Record<LocaleCategory, Locale[]> {
  const grouped: Record<LocaleCategory, Locale[]> = {
    official: [],
    immigrant: [],
    indigenous: [],
  };

  for (const locale of SUPPORTED_LOCALES) {
    const category = getLocaleCategory(locale);
    grouped[category].push(locale);
  }

  return grouped;
}
