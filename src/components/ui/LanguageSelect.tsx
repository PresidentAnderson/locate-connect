"use client";

import { useState, useMemo, useCallback } from "react";
import {
  ALL_LANGUAGES,
  LANGUAGE_FAMILIES,
  Language,
  getLanguagesByFamily,
  OFFICIAL_LANGUAGES,
  INDIGENOUS_LANGUAGES,
} from "@/config/languages";

// Check if text contains Canadian Aboriginal Syllabics (U+1400-167F, U+18B0-18FF)
export function containsSyllabics(text: string): boolean {
  return /[\u1400-\u167F\u18B0-\u18FF]/.test(text);
}

// Language Badge Component
interface LanguageBadgeProps {
  code: string;
  showNativeName?: boolean;
  onRemove?: () => void;
  size?: "sm" | "md";
}

export function LanguageBadge({
  code,
  showNativeName = true,
  onRemove,
  size = "md",
}: LanguageBadgeProps) {
  const language = ALL_LANGUAGES.find((l) => l.code === code);
  if (!language) return null;

  const hasSyllabics = containsSyllabics(language.nativeName);
  const badgeClass = language.isIndigenous
    ? "language-badge-indigenous"
    : "language-badge-official";

  return (
    <span
      className={`language-badge ${badgeClass} ${size === "sm" ? "text-xs py-0" : ""}`}
      data-syllabics={hasSyllabics}
    >
      <span className={hasSyllabics ? "font-syllabics" : ""}>
        {showNativeName ? language.nativeName : language.name}
      </span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-1 hover:text-red-600 focus:outline-none"
          aria-label={`Remove ${language.name}`}
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </span>
  );
}

// Single Language Select Component
interface LanguageSelectProps {
  value: string;
  onChange: (value: string) => void;
  includeOfficial?: boolean;
  includeIndigenous?: boolean;
  placeholder?: string;
  label?: string;
  required?: boolean;
  className?: string;
  showNativeNames?: boolean;
}

export function LanguageSelect({
  value,
  onChange,
  includeOfficial = true,
  includeIndigenous = true,
  placeholder = "Select a language",
  label,
  required = false,
  className = "",
  showNativeNames = true,
}: LanguageSelectProps) {
  const languages = useMemo(() => {
    const result: Language[] = [];
    if (includeOfficial) result.push(...OFFICIAL_LANGUAGES);
    if (includeIndigenous) result.push(...INDIGENOUS_LANGUAGES);
    return result;
  }, [includeOfficial, includeIndigenous]);

  const groupedLanguages = useMemo(() => {
    const groups: Record<string, Language[]> = {};

    if (includeOfficial) {
      groups["Official Languages"] = OFFICIAL_LANGUAGES;
    }

    if (includeIndigenous) {
      LANGUAGE_FAMILIES.filter((f) => f.id !== "official").forEach((family) => {
        const familyLangs = getLanguagesByFamily(family.name);
        if (familyLangs.length > 0) {
          groups[family.nameEn] = familyLangs;
        }
      });

      // Add languages without a family match
      const otherIndigenous = INDIGENOUS_LANGUAGES.filter(
        (lang) =>
          !LANGUAGE_FAMILIES.some(
            (f) => f.name === lang.family || f.id === lang.family?.toLowerCase()
          )
      );
      if (otherIndigenous.length > 0) {
        groups["Other Indigenous Languages"] = [
          ...(groups["Other Indigenous Languages"] || []),
          ...otherIndigenous,
        ];
      }
    }

    return groups;
  }, [includeOfficial, includeIndigenous]);

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
      >
        <option value="">{placeholder}</option>
        {Object.entries(groupedLanguages).map(([groupName, groupLangs]) => (
          <optgroup key={groupName} label={groupName}>
            {groupLangs.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
                {showNativeNames && lang.nativeName !== lang.name
                  ? ` (${lang.nativeName})`
                  : ""}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

// Multi-Select Language Component
interface LanguageMultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  includeOfficial?: boolean;
  includeIndigenous?: boolean;
  placeholder?: string;
  label?: string;
  maxSelections?: number;
  showSearch?: boolean;
  className?: string;
}

export function LanguageMultiSelect({
  value,
  onChange,
  includeOfficial = true,
  includeIndigenous = true,
  placeholder = "Search languages...",
  label,
  maxSelections,
  showSearch = true,
  className = "",
}: LanguageMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(
    new Set(["Official Languages"])
  );

  const languages = useMemo(() => {
    const result: Language[] = [];
    if (includeOfficial) result.push(...OFFICIAL_LANGUAGES);
    if (includeIndigenous) result.push(...INDIGENOUS_LANGUAGES);
    return result;
  }, [includeOfficial, includeIndigenous]);

  const filteredLanguages = useMemo(() => {
    if (!searchQuery.trim()) return languages;
    const query = searchQuery.toLowerCase();
    return languages.filter(
      (lang) =>
        lang.name.toLowerCase().includes(query) ||
        lang.nativeName.toLowerCase().includes(query) ||
        lang.code.toLowerCase().includes(query) ||
        lang.family?.toLowerCase().includes(query) ||
        lang.region?.toLowerCase().includes(query)
    );
  }, [languages, searchQuery]);

  const groupedLanguages = useMemo(() => {
    const groups: Record<string, Language[]> = {};

    if (includeOfficial) {
      const officialFiltered = filteredLanguages.filter((l) => l.isOfficial);
      if (officialFiltered.length > 0) {
        groups["Official Languages"] = officialFiltered;
      }
    }

    if (includeIndigenous) {
      const indigenousFiltered = filteredLanguages.filter((l) => l.isIndigenous);

      LANGUAGE_FAMILIES.filter((f) => f.id !== "official").forEach((family) => {
        const familyLangs = indigenousFiltered.filter(
          (lang) => lang.family === family.name
        );
        if (familyLangs.length > 0) {
          groups[family.nameEn] = familyLangs;
        }
      });

      // Languages that don't match any family
      const unmatchedLangs = indigenousFiltered.filter(
        (lang) =>
          !LANGUAGE_FAMILIES.some((f) => f.name === lang.family) && lang.family
      );
      if (unmatchedLangs.length > 0) {
        groups["Other Indigenous Languages"] = unmatchedLangs;
      }
    }

    return groups;
  }, [filteredLanguages, includeOfficial, includeIndigenous]);

  const toggleLanguage = useCallback(
    (code: string) => {
      if (value.includes(code)) {
        onChange(value.filter((v) => v !== code));
      } else {
        if (maxSelections && value.length >= maxSelections) return;
        onChange([...value, code]);
      }
    },
    [value, onChange, maxSelections]
  );

  const toggleFamily = (family: string) => {
    setExpandedFamilies((prev) => {
      const next = new Set(prev);
      if (next.has(family)) {
        next.delete(family);
      } else {
        next.add(family);
      }
      return next;
    });
  };

  const selectedLanguages = languages.filter((l) => value.includes(l.code));

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}

      {/* Selected Languages */}
      <div
        className="min-h-[42px] p-2 border border-gray-300 rounded-lg cursor-pointer hover:border-cyan-500 focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedLanguages.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {selectedLanguages.map((lang) => (
              <LanguageBadge
                key={lang.code}
                code={lang.code}
                size="sm"
                onRemove={() => toggleLanguage(lang.code)}
              />
            ))}
          </div>
        ) : (
          <span className="text-gray-400 text-sm">{placeholder}</span>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
          {/* Search */}
          {showSearch && (
            <div className="p-2 border-b">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search languages..."
                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:border-cyan-500"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          {/* Language List */}
          <div className="overflow-y-auto max-h-60">
            {Object.entries(groupedLanguages).map(([groupName, groupLangs]) => (
              <div key={groupName}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 flex items-center justify-between"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFamily(groupName);
                  }}
                >
                  <span>{groupName}</span>
                  <svg
                    className={`w-4 h-4 transition-transform ${
                      expandedFamilies.has(groupName) ? "rotate-180" : ""
                    }`}
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
                {expandedFamilies.has(groupName) && (
                  <div>
                    {groupLangs.map((lang) => {
                      const isSelected = value.includes(lang.code);
                      const hasSyllabics = containsSyllabics(lang.nativeName);
                      const isDisabled =
                        !isSelected &&
                        maxSelections !== undefined &&
                        value.length >= maxSelections;

                      return (
                        <button
                          key={lang.code}
                          type="button"
                          disabled={isDisabled}
                          className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
                            isSelected
                              ? "bg-cyan-50 text-cyan-700"
                              : isDisabled
                              ? "text-gray-400 cursor-not-allowed"
                              : "hover:bg-gray-50"
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLanguage(lang.code);
                          }}
                        >
                          <span
                            className={`w-4 h-4 border rounded flex items-center justify-center ${
                              isSelected
                                ? "bg-cyan-600 border-cyan-600"
                                : "border-gray-300"
                            }`}
                          >
                            {isSelected && (
                              <svg
                                className="w-3 h-3 text-white"
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
                          </span>
                          <span>
                            {lang.name}
                            {lang.nativeName !== lang.name && (
                              <span
                                className={`ml-1 text-gray-500 ${
                                  hasSyllabics ? "font-syllabics" : ""
                                }`}
                              >
                                ({lang.nativeName})
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
            {Object.keys(groupedLanguages).length === 0 && (
              <div className="px-4 py-8 text-center text-gray-500 text-sm">
                No languages found matching &quot;{searchQuery}&quot;
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t bg-gray-50 flex justify-between items-center">
            <span className="text-xs text-gray-500">
              {value.length} selected
              {maxSelections && ` (max ${maxSelections})`}
            </span>
            <button
              type="button"
              className="text-xs text-cyan-600 hover:text-cyan-700"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

// Interpreter Request Component
interface InterpreterRequestProps {
  needsInterpreter: boolean;
  onNeedsInterpreterChange: (value: boolean) => void;
  interpreterLanguage?: string;
  onInterpreterLanguageChange?: (value: string) => void;
  className?: string;
}

export function InterpreterRequest({
  needsInterpreter,
  onNeedsInterpreterChange,
  interpreterLanguage,
  onInterpreterLanguageChange,
  className = "",
}: InterpreterRequestProps) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="needs-interpreter"
          checked={needsInterpreter}
          onChange={(e) => onNeedsInterpreterChange(e.target.checked)}
          className="w-4 h-4 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500"
        />
        <label
          htmlFor="needs-interpreter"
          className="text-sm font-medium text-gray-700"
        >
          Interpreter assistance needed
        </label>
      </div>

      {needsInterpreter && onInterpreterLanguageChange && (
        <div className="mt-2 ml-6">
          <LanguageSelect
            value={interpreterLanguage || ""}
            onChange={onInterpreterLanguageChange}
            includeOfficial={true}
            includeIndigenous={true}
            placeholder="Select interpreter language"
            label="Interpreter language"
          />
        </div>
      )}
    </div>
  );
}

export default {
  LanguageBadge,
  LanguageSelect,
  LanguageMultiSelect,
  InterpreterRequest,
  containsSyllabics,
};
