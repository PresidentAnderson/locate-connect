"use client";

import { useMemo } from "react";
import { getLanguageByCode } from "@/config/languages";
import { SUPPORTED_LOCALES } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { useLocale } from "./LocaleProvider";

interface LocaleSwitcherProps {
  label?: string;
  className?: string;
}

export function LocaleSwitcher({ label, className = "" }: LocaleSwitcherProps) {
  const { locale, setLocale } = useLocale();

  const options = useMemo(() => {
    return SUPPORTED_LOCALES.map((code) => {
      const language = getLanguageByCode(code);
      return {
        code,
        label: language ? `${language.name} (${language.nativeName})` : code.toUpperCase(),
      };
    });
  }, []);

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
        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        {options.map((option) => (
          <option key={option.code} value={option.code}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
