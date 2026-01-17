"use client";

import {
  LanguageMultiSelect,
  InterpreterRequest,
  LanguageBadge,
} from "@/components/ui/LanguageSelect";

interface ReporterLanguageData {
  reporter_languages: string[];
  reporter_preferred_language: string;
  reporter_needs_interpreter: boolean;
}

interface SubjectLanguageData {
  subject_primary_languages: string[];
  subject_responds_to_languages: string[];
  subject_can_communicate_official: boolean;
}

interface IntakeLanguageSectionProps {
  // Reporter language data
  reporterLanguages: string[];
  onReporterLanguagesChange: (languages: string[]) => void;
  reporterPreferredLanguage: string;
  onReporterPreferredLanguageChange: (language: string) => void;
  reporterNeedsInterpreter: boolean;
  onReporterNeedsInterpreterChange: (needs: boolean) => void;

  // Subject (missing person) language data
  subjectPrimaryLanguages: string[];
  onSubjectPrimaryLanguagesChange: (languages: string[]) => void;
  subjectRespondsToLanguages: string[];
  onSubjectRespondsToLanguagesChange: (languages: string[]) => void;
  subjectCanCommunicateOfficial: boolean;
  onSubjectCanCommunicateOfficialChange: (can: boolean) => void;
}

export function IntakeLanguageSection({
  reporterLanguages,
  onReporterLanguagesChange,
  reporterPreferredLanguage,
  onReporterPreferredLanguageChange,
  reporterNeedsInterpreter,
  onReporterNeedsInterpreterChange,
  subjectPrimaryLanguages,
  onSubjectPrimaryLanguagesChange,
  subjectRespondsToLanguages,
  onSubjectRespondsToLanguagesChange,
  subjectCanCommunicateOfficial,
  onSubjectCanCommunicateOfficialChange,
}: IntakeLanguageSectionProps) {
  return (
    <div className="space-y-8">
      {/* Reporter Language Information */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Your Language Information
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          This helps us communicate with you effectively and connect you with
          appropriate support services.
        </p>

        <div className="space-y-4">
          <LanguageMultiSelect
            value={reporterLanguages}
            onChange={onReporterLanguagesChange}
            label="Languages you speak"
            placeholder="Select all languages you can communicate in"
            maxSelections={5}
          />

          {reporterLanguages.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred contact language
              </label>
              <div className="flex flex-wrap gap-2">
                {reporterLanguages.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => onReporterPreferredLanguageChange(code)}
                    className={`transition-all ${
                      reporterPreferredLanguage === code
                        ? "ring-2 ring-cyan-500 ring-offset-2"
                        : "opacity-70 hover:opacity-100"
                    }`}
                  >
                    <LanguageBadge code={code} />
                  </button>
                ))}
              </div>
            </div>
          )}

          <InterpreterRequest
            needsInterpreter={reporterNeedsInterpreter}
            onNeedsInterpreterChange={onReporterNeedsInterpreterChange}
            interpreterLanguage={reporterPreferredLanguage}
            onInterpreterLanguageChange={onReporterPreferredLanguageChange}
          />
        </div>
      </div>

      {/* Missing Person Language Information */}
      <div className="bg-amber-50 rounded-lg p-6 border border-amber-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Missing Person&apos;s Language Information
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Understanding what languages the missing person speaks helps with
          community outreach and communication if they are found.
        </p>

        <div className="space-y-4">
          <LanguageMultiSelect
            value={subjectPrimaryLanguages}
            onChange={onSubjectPrimaryLanguagesChange}
            label="Primary languages spoken by the missing person"
            placeholder="Select languages the missing person speaks"
            maxSelections={5}
          />

          <LanguageMultiSelect
            value={subjectRespondsToLanguages}
            onChange={onSubjectRespondsToLanguagesChange}
            label="Languages they may respond to"
            placeholder="Select languages they might respond to if approached"
            maxSelections={5}
          />
          <p className="text-xs text-gray-500">
            This is helpful for search teams and community outreach. Include
            languages they understand even if they don&apos;t speak them
            fluently.
          </p>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="can-communicate-official"
              checked={subjectCanCommunicateOfficial}
              onChange={(e) =>
                onSubjectCanCommunicateOfficialChange(e.target.checked)
              }
              className="w-4 h-4 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500"
            />
            <label
              htmlFor="can-communicate-official"
              className="text-sm text-gray-700"
            >
              Can communicate in English or French
            </label>
          </div>
          <p className="text-xs text-gray-500 ml-6">
            This helps determine if language-specific outreach or translators
            may be needed during the search.
          </p>
        </div>
      </div>

      {/* Language Summary */}
      {(reporterLanguages.length > 0 || subjectPrimaryLanguages.length > 0) && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Language Summary
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {reporterLanguages.length > 0 && (
              <div>
                <span className="text-gray-500">Your languages: </span>
                <span className="flex flex-wrap gap-1 mt-1">
                  {reporterLanguages.map((code) => (
                    <LanguageBadge key={code} code={code} size="sm" />
                  ))}
                </span>
              </div>
            )}
            {subjectPrimaryLanguages.length > 0 && (
              <div>
                <span className="text-gray-500">
                  Missing person&apos;s languages:{" "}
                </span>
                <span className="flex flex-wrap gap-1 mt-1">
                  {subjectPrimaryLanguages.map((code) => (
                    <LanguageBadge key={code} code={code} size="sm" />
                  ))}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Simpler version for quick forms
interface SimpleLanguageInputProps {
  languages: string[];
  onLanguagesChange: (languages: string[]) => void;
  label?: string;
  placeholder?: string;
}

export function SimpleLanguageInput({
  languages,
  onLanguagesChange,
  label = "Languages spoken",
  placeholder = "Select languages",
}: SimpleLanguageInputProps) {
  return (
    <LanguageMultiSelect
      value={languages}
      onChange={onLanguagesChange}
      label={label}
      placeholder={placeholder}
      maxSelections={5}
    />
  );
}

// Export types for form integration
export type { ReporterLanguageData, SubjectLanguageData };

export default IntakeLanguageSection;
