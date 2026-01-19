"use client";

import { useMemo, useState } from "react";
import { getLanguageByCode, ALL_LANGUAGES, IMMIGRANT_LANGUAGES } from "@/config/languages";
import {
  SUPPORTED_LOCALES,
  getLocalesByCategory,
  isLocaleComplete,
  getLocaleDirection,
} from "@/lib/i18n";
import type { Locale, LocaleCategory } from "@/lib/i18n";
import { useLocale } from "./LocaleProvider";

// Extended language data for the new priority languages
const EXTENDED_LANGUAGE_DATA: Record<string, { name: string; nativeName: string }> = {
  es: { name: "Spanish", nativeName: "Espanol" },
  zh: { name: "Mandarin Chinese", nativeName: "普通话" },
  yue: { name: "Cantonese", nativeName: "廣東話" },
  pa: { name: "Punjabi", nativeName: "ਪੰਜਾਬੀ" },
  tl: { name: "Tagalog", nativeName: "Tagalog" },
  ar: { name: "Arabic", nativeName: "العربية" },
};

function getLanguageInfo(code: string): { name: string; nativeName: string } {
  // Check extended data first
  if (EXTENDED_LANGUAGE_DATA[code]) {
    return EXTENDED_LANGUAGE_DATA[code];
  }

  // Check immigrant languages
  const immigrant = IMMIGRANT_LANGUAGES.find((l) => l.code === code);
  if (immigrant) {
    return { name: immigrant.name, nativeName: immigrant.nativeName };
  }

  // Check all languages from config
  const language = getLanguageByCode(code);
  if (language) {
    return { name: language.name, nativeName: language.nativeName };
  }

  return { name: code.toUpperCase(), nativeName: code.toUpperCase() };
}

const CATEGORY_LABELS: Record<LocaleCategory, { en: string; native: string }> = {
  official: { en: "Official Languages", native: "Official Languages" },
  immigrant: { en: "Community Languages", native: "Community Languages" },
  indigenous: { en: "Indigenous Languages", native: "Indigenous Languages" },
};

interface LocaleSwitcherProps {
  label?: string;
  className?: string;
  showGroups?: boolean;
  compact?: boolean;
}

export function LocaleSwitcher({
  label,
  className = "",
  showGroups = true,
  compact = false,
}: LocaleSwitcherProps) {
  const { locale, setLocale, isComplete } = useLocale();

  const groupedOptions = useMemo(() => {
    const byCategory = getLocalesByCategory();

    return Object.entries(byCategory).map(([category, locales]) => ({
      category: category as LocaleCategory,
      label: CATEGORY_LABELS[category as LocaleCategory],
      locales: locales.map((code) => {
        const info = getLanguageInfo(code);
        const direction = getLocaleDirection(code);
        const complete = isLocaleComplete(code);

        return {
          code,
          name: info.name,
          nativeName: info.nativeName,
          displayLabel:
            info.nativeName !== info.name
              ? `${info.name} (${info.nativeName})`
              : info.name,
          direction,
          complete,
        };
      }),
    }));
  }, []);

  const flatOptions = useMemo(() => {
    return SUPPORTED_LOCALES.map((code) => {
      const info = getLanguageInfo(code);
      return {
        code,
        displayLabel:
          info.nativeName !== info.name
            ? `${info.name} (${info.nativeName})`
            : info.name,
      };
    });
  }, []);

  if (compact) {
    return (
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className={`rounded-lg border border-gray-300 px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 ${className}`}
        aria-label="Select language"
      >
        {flatOptions.map((option) => (
          <option key={option.code} value={option.code}>
            {option.displayLabel}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className={className}>
      {label && (
        <label className="block text-xs font-medium text-gray-500 mb-1">
          {label}
        </label>
      )}
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 min-w-[200px]"
        aria-label="Select language"
      >
        {showGroups ? (
          groupedOptions.map((group) => (
            <optgroup key={group.category} label={group.label.en}>
              {group.locales.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.displayLabel}
                  {!option.complete ? " *" : ""}
                </option>
              ))}
            </optgroup>
          ))
        ) : (
          flatOptions.map((option) => (
            <option key={option.code} value={option.code}>
              {option.displayLabel}
            </option>
          ))
        )}
      </select>
      {!isComplete && (
        <p className="mt-1 text-xs text-amber-600">
          * Translations in progress. Some content shown in English.
        </p>
      )}
    </div>
  );
}

/**
 * A more visual language switcher with flags/icons
 */
interface LanguageSwitcherButtonProps {
  className?: string;
}

export function LanguageSwitcherButton({ className = "" }: LanguageSwitcherButtonProps) {
  const { locale, setLocale, direction } = useLocale();
  const [isOpen, setIsOpen] = useState(false);

  const groupedOptions = useMemo(() => {
    const byCategory = getLocalesByCategory();

    return Object.entries(byCategory).map(([category, locales]) => ({
      category: category as LocaleCategory,
      label: CATEGORY_LABELS[category as LocaleCategory],
      locales: locales.map((code) => {
        const info = getLanguageInfo(code);
        return {
          code,
          name: info.name,
          nativeName: info.nativeName,
          complete: isLocaleComplete(code),
        };
      }),
    }));
  }, []);

  const currentLanguage = getLanguageInfo(locale);

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-black hover:bg-gray-50"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
          />
        </svg>
        <span>{currentLanguage.nativeName}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div
            className={`absolute z-50 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto ${
              direction === "rtl" ? "left-0" : "right-0"
            }`}
            role="listbox"
          >
            {groupedOptions.map((group) => (
              <div key={group.category}>
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 sticky top-0">
                  {group.label.en}
                </div>
                {group.locales.map((option) => (
                  <button
                    key={option.code}
                    type="button"
                    role="option"
                    aria-selected={locale === option.code}
                    onClick={() => {
                      setLocale(option.code as Locale);
                      setIsOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-gray-50 ${
                      locale === option.code ? "bg-cyan-50 text-cyan-700" : ""
                    }`}
                  >
                    <span>
                      <span className="font-medium">{option.name}</span>
                      {option.nativeName !== option.name && (
                        <span className="ml-1 text-gray-500">
                          ({option.nativeName})
                        </span>
                      )}
                    </span>
                    {locale === option.code && (
                      <svg
                        className="w-4 h-4 text-cyan-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                    {!option.complete && (
                      <span className="text-xs text-amber-500">*</span>
                    )}
                  </button>
                ))}
              </div>
            ))}
            <div className="px-3 py-2 text-xs text-gray-400 border-t">
              * Translation in progress
            </div>
          </div>
        </>
      )}
    </div>
  );
}
