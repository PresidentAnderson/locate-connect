"use client";

import { useCallback, useEffect, useState } from "react";
import { LanguagePreferences } from "@/components/settings";
import type { LanguagePreferencesData } from "@/components/settings";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { useLocale } from "@/components/i18n/LocaleProvider";

const DEFAULT_PREFERENCES: LanguagePreferencesData = {
  preferred_language: DEFAULT_LOCALE,
  additional_languages: [],
  communication_language: DEFAULT_LOCALE,
  needs_interpreter: false,
};

type LanguagePreferencesResponse = LanguagePreferencesData & {
  locale?: string;
  updatedAt?: string | null;
};

function coerceLocale(value: string): Locale {
  if (SUPPORTED_LOCALES.includes(value as Locale)) {
    return value as Locale;
  }
  return DEFAULT_LOCALE;
}

export default function LanguageSettingsPage() {
  const [preferences, setPreferences] = useState<LanguagePreferencesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { setLocale } = useLocale();

  const fetchPreferences = useCallback(async () => {
    try {
      const response = await fetch("/api/profile/language");
      if (!response.ok) {
        throw new Error("Failed to load language preferences");
      }
      const data = (await response.json()) as LanguagePreferencesResponse;
      setPreferences({
        preferred_language: data.preferred_language ?? DEFAULT_LOCALE,
        additional_languages: data.additional_languages ?? [],
        communication_language: data.communication_language ?? DEFAULT_LOCALE,
        needs_interpreter: data.needs_interpreter ?? false,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load language preferences");
      setPreferences({ ...DEFAULT_PREFERENCES });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const handleSave = async (next: LanguagePreferencesData) => {
    if (!preferences) return;
    const previous = preferences;
    setPreferences(next);
    setError(null);

    try {
      const response = await fetch("/api/profile/language", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });

      if (!response.ok) {
        throw new Error("Failed to save language preferences");
      }

      const data = (await response.json()) as LanguagePreferencesResponse;
      const preferred = data.preferred_language ?? next.preferred_language;
      setPreferences({
        preferred_language: preferred,
        additional_languages: data.additional_languages ?? next.additional_languages,
        communication_language: data.communication_language ?? next.communication_language,
        needs_interpreter: data.needs_interpreter ?? next.needs_interpreter,
      });
      setLocale(coerceLocale(preferred));
    } catch (err) {
      setPreferences(previous);
      setError(err instanceof Error ? err.message : "Failed to save language preferences");
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          {error || "Failed to load language preferences"}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Language Preferences</h1>
        <p className="text-gray-600 mt-1">
          Choose your preferred languages for the interface and communications.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>
      )}

      <LanguagePreferences
        initialPreferredLanguage={preferences.preferred_language}
        initialAdditionalLanguages={preferences.additional_languages}
        initialCommunicationLanguage={preferences.communication_language}
        initialNeedsInterpreter={preferences.needs_interpreter}
        onSave={handleSave}
      />
    </div>
  );
}
