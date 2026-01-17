"use client";

import { useState } from "react";
import {
  LanguageSelect,
  LanguageMultiSelect,
  LanguageBadge,
  InterpreterRequest,
} from "@/components/ui/LanguageSelect";
import { getLanguageByCode } from "@/config/languages";

interface LanguagePreferencesProps {
  initialPreferredLanguage?: string;
  initialAdditionalLanguages?: string[];
  initialCommunicationLanguage?: string;
  initialNeedsInterpreter?: boolean;
  onSave: (preferences: LanguagePreferencesData) => Promise<void>;
}

export interface LanguagePreferencesData {
  preferred_language: string;
  additional_languages: string[];
  communication_language: string;
  needs_interpreter: boolean;
}

export function LanguagePreferences({
  initialPreferredLanguage = "en",
  initialAdditionalLanguages = [],
  initialCommunicationLanguage = "en",
  initialNeedsInterpreter = false,
  onSave,
}: LanguagePreferencesProps) {
  const [preferredLanguage, setPreferredLanguage] = useState(
    initialPreferredLanguage
  );
  const [additionalLanguages, setAdditionalLanguages] = useState<string[]>(
    initialAdditionalLanguages
  );
  const [communicationLanguage, setCommunicationLanguage] = useState(
    initialCommunicationLanguage
  );
  const [needsInterpreter, setNeedsInterpreter] = useState(
    initialNeedsInterpreter
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      await onSave({
        preferred_language: preferredLanguage,
        additional_languages: additionalLanguages,
        communication_language: communicationLanguage,
        needs_interpreter: needsInterpreter,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const preferredLang = getLanguageByCode(preferredLanguage);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Language Preferences
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Set your preferred language for the interface and communications.
          Indigenous language support helps us serve all Canadian communities.
        </p>
      </div>

      <div className="space-y-6">
        {/* Primary Language */}
        <div>
          <LanguageSelect
            value={preferredLanguage}
            onChange={setPreferredLanguage}
            label="Primary Language"
            placeholder="Select your primary language"
            showNativeNames={true}
          />
          {preferredLang && preferredLang.isIndigenous && (
            <p className="mt-1 text-xs text-amber-600">
              Note: Full UI translation may not be available for all Indigenous
              languages. We are working with community partners to expand
              support.
            </p>
          )}
        </div>

        {/* Additional Languages */}
        <div>
          <LanguageMultiSelect
            value={additionalLanguages}
            onChange={setAdditionalLanguages}
            label="Additional Languages (optional)"
            placeholder="Select additional languages you speak"
            maxSelections={5}
          />
          <p className="mt-1 text-xs text-gray-500">
            Select up to 5 additional languages you can communicate in.
          </p>
        </div>

        {/* Communication Preference */}
        <div>
          <LanguageSelect
            value={communicationLanguage}
            onChange={setCommunicationLanguage}
            label="Preferred Communication Language"
            placeholder="Select language for notifications and emails"
            showNativeNames={true}
          />
          <p className="mt-1 text-xs text-gray-500">
            We will send notifications and emails in this language when
            translations are available.
          </p>
        </div>

        {/* Interpreter Request */}
        <div className="pt-4 border-t border-gray-200">
          <InterpreterRequest
            needsInterpreter={needsInterpreter}
            onNeedsInterpreterChange={setNeedsInterpreter}
          />
          {needsInterpreter && (
            <p className="mt-2 ml-6 text-xs text-gray-500">
              We will note your interpreter preference and try to accommodate
              when you contact support or speak with law enforcement.
            </p>
          )}
        </div>

        {/* Current Selection Summary */}
        <div className="pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Your Language Profile
          </h4>
          <div className="flex flex-wrap gap-2">
            <LanguageBadge code={preferredLanguage} />
            {additionalLanguages.map((code) => (
              <LanguageBadge key={code} code={code} />
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {saved && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-3">
            <p className="text-sm text-green-700">
              Language preferences saved successfully!
            </p>
          </div>
        )}

        {/* Save Button */}
        <div className="pt-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-cyan-600 text-white text-sm font-medium rounded-lg hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LanguagePreferences;
