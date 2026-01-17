import enCommon from "@/locales/en/common.json";
import frCommon from "@/locales/fr/common.json";
import crCommon from "@/locales/cr/common.json";
import iuCommon from "@/locales/iu/common.json";
import ojCommon from "@/locales/oj/common.json";
import micCommon from "@/locales/mic/common.json";
import enIntake from "@/locales/en/intake.json";
import frIntake from "@/locales/fr/intake.json";
import crIntake from "@/locales/cr/intake.json";
import iuIntake from "@/locales/iu/intake.json";
import ojIntake from "@/locales/oj/intake.json";
import micIntake from "@/locales/mic/intake.json";

export const DEFAULT_LOCALE = "en";
export const SUPPORTED_LOCALES = ["en", "fr", "cr", "iu", "oj", "mic"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];
export type Namespace = "common" | "intake";

export const LOCALE_METADATA: Record<Locale, { complete: boolean }> = {
  en: { complete: true },
  fr: { complete: true },
  cr: { complete: false },
  iu: { complete: false },
  oj: { complete: false },
  mic: { complete: false },
};

const MESSAGES: Record<Locale, Record<Namespace, Record<string, unknown>>> = {
  en: { common: enCommon, intake: enIntake },
  fr: { common: frCommon, intake: frIntake },
  cr: { common: crCommon, intake: crIntake },
  iu: { common: iuCommon, intake: iuIntake },
  oj: { common: ojCommon, intake: ojIntake },
  mic: { common: micCommon, intake: micIntake },
};

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
  const base = normalized.split("-")[0] as Locale;
  return SUPPORTED_LOCALES.includes(base) ? base : DEFAULT_LOCALE;
}

export function translate(locale: Locale, namespace: Namespace, key: string): string {
  const messages = MESSAGES[locale]?.[namespace];
  const fallback = MESSAGES[DEFAULT_LOCALE][namespace];

  const value = messages ? getNestedValue(messages, key) : undefined;
  if (value && value.trim().length > 0) return value;

  const fallbackValue = getNestedValue(fallback, key);
  return fallbackValue || key;
}

export function isLocaleComplete(locale: Locale): boolean {
  return LOCALE_METADATA[locale]?.complete ?? false;
}
