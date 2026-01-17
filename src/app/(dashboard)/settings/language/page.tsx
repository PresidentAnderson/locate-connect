'use client';

import { useState, useEffect, useCallback } from 'react';
import { LanguagePreferences, LanguagePreferencesData } from '@/components/settings/LanguagePreferences';

export default function LanguageSettingsPage() {
  const [preferences, setPreferences] = useState<LanguagePreferencesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    try {
      const res = await fetch('/api/profile/language');
      
      if (!res.ok) {
        throw new Error('Failed to load language preferences');
      }

      const data = await res.json();
      setPreferences(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const handleSave = async (data: LanguagePreferencesData) => {
    const res = await fetch('/api/profile/language', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to save preferences');
    }

    const updated = await res.json();
    setPreferences(updated);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !preferences) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          {error || 'Failed to load language preferences'}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Language Preferences</h1>
        <p className="text-gray-600 mt-1">
          Choose your preferred language for the interface and communications. 
          Indigenous language support helps us serve all Canadian communities.
        </p>
      </div>

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
