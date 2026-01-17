'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  NotificationPreferences,
  NotificationTypePreference,
  NotificationType,
  NotificationChannel,
  NotificationFrequency,
  NOTIFICATION_TYPE_LABELS,
  CHANNEL_LABELS,
  FREQUENCY_LABELS,
  TIMEZONE_OPTIONS,
} from '@/types/notification.types';

type TabType = 'channels' | 'types' | 'quiet-hours';

export default function NotificationSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('channels');
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [typePreferences, setTypePreferences] = useState<NotificationTypePreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    try {
      const [prefsRes, typesRes] = await Promise.all([
        fetch('/api/notifications/preferences'),
        fetch('/api/notifications/preferences/types'),
      ]);

      if (!prefsRes.ok || !typesRes.ok) {
        throw new Error('Failed to load notification preferences');
      }

      const [prefs, types] = await Promise.all([prefsRes.json(), typesRes.json()]);

      setPreferences(prefs);
      setTypePreferences(types);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const savePreferences = async (updates: Partial<NotificationPreferences>) => {
    if (!preferences) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...preferences, ...updates }),
      });

      if (!res.ok) throw new Error('Failed to save preferences');

      const updated = await res.json();
      setPreferences(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const saveTypePreference = async (
    notificationType: NotificationType,
    updates: Partial<NotificationTypePreference>
  ) => {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/notifications/preferences/types', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationType, ...updates }),
      });

      if (!res.ok) throw new Error('Failed to save type preference');

      const updated = await res.json();
      setTypePreferences((prev) =>
        prev.map((p) => (p.notificationType === notificationType ? updated : p))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
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

  if (!preferences) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          {error || 'Failed to load notification preferences'}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notification Preferences</h1>
        <p className="text-gray-600 mt-1">
          Control how and when you receive notifications from LocateConnect.
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>
      )}

      {/* Master Toggle */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">All Notifications</h2>
            <p className="text-gray-600 text-sm">
              Master switch to enable or disable all notifications
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.notificationsEnabled}
              onChange={(e) => savePreferences({ notificationsEnabled: e.target.checked })}
              className="sr-only peer"
              disabled={saving}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {[
            { id: 'channels', label: 'Channels' },
            { id: 'types', label: 'Notification Types' },
            { id: 'quiet-hours', label: 'Quiet Hours & Digest' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow">
        {activeTab === 'channels' && (
          <div className="p-6 space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Notification Channels</h3>
            <p className="text-gray-600 text-sm">
              Choose which channels you want to receive notifications through.
            </p>

            <div className="space-y-4">
              {(Object.entries(CHANNEL_LABELS) as [NotificationChannel, { title: string; icon: string }][]).map(
                ([channel, { title }]) => {
                  const key = `${channel}Enabled` as keyof NotificationPreferences;
                  const enabled = preferences[key] as boolean;

                  return (
                    <div
                      key={channel}
                      className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{title}</p>
                        {channel === 'sms' && (
                          <p className="text-sm text-gray-500">
                            Phone: {preferences.phoneNumber || 'Not set'}
                          </p>
                        )}
                        {channel === 'email' && (
                          <p className="text-sm text-gray-500">
                            Email: {preferences.emailAddress || 'Not set'}
                          </p>
                        )}
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={(e) =>
                            savePreferences({ [key]: e.target.checked } as Partial<NotificationPreferences>)
                          }
                          className="sr-only peer"
                          disabled={saving || !preferences.notificationsEnabled}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
                      </label>
                    </div>
                  );
                }
              )}
            </div>

            {/* Default Frequency */}
            <div className="pt-6 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Notification Frequency
              </label>
              <select
                value={preferences.defaultFrequency}
                onChange={(e) =>
                  savePreferences({ defaultFrequency: e.target.value as NotificationFrequency })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                disabled={saving || !preferences.notificationsEnabled}
              >
                {(Object.entries(FREQUENCY_LABELS) as [NotificationFrequency, string][]).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>
        )}

        {activeTab === 'types' && (
          <div className="p-6 space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Notification Types</h3>
            <p className="text-gray-600 text-sm">
              Configure which types of notifications you want to receive.
            </p>

            <div className="space-y-4">
              {typePreferences.map((pref) => {
                const labels = NOTIFICATION_TYPE_LABELS[pref.notificationType];
                return (
                  <div
                    key={pref.notificationType}
                    className="flex items-start justify-between py-4 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{labels.title}</p>
                      <p className="text-sm text-gray-500">{labels.description}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-4">
                      <input
                        type="checkbox"
                        checked={pref.enabled}
                        onChange={(e) =>
                          saveTypePreference(pref.notificationType, { enabled: e.target.checked })
                        }
                        className="sr-only peer"
                        disabled={saving || !preferences.notificationsEnabled}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'quiet-hours' && (
          <div className="p-6 space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Quiet Hours</h3>
            <p className="text-gray-600 text-sm">
              Set times when you don&apos;t want to receive notifications.
            </p>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-gray-900">Enable Quiet Hours</p>
                <p className="text-sm text-gray-500">
                  Pause notifications during specified times
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.quietHoursEnabled}
                  onChange={(e) => savePreferences({ quietHoursEnabled: e.target.checked })}
                  className="sr-only peer"
                  disabled={saving || !preferences.notificationsEnabled}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
              </label>
            </div>

            {preferences.quietHoursEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={preferences.quietHoursStart}
                    onChange={(e) => savePreferences({ quietHoursStart: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={preferences.quietHoursEnd}
                    onChange={(e) => savePreferences({ quietHoursEnd: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Timezone
                  </label>
                  <select
                    value={preferences.quietHoursTimezone}
                    onChange={(e) => savePreferences({ quietHoursTimezone: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    disabled={saving}
                  >
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Digest Settings */}
            <div className="pt-6 border-t border-gray-200">
              <h4 className="font-medium text-gray-900 mb-4">Digest Settings</h4>
              <p className="text-sm text-gray-500 mb-4">
                When using daily or weekly digest, configure when you receive them.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Digest Time
                  </label>
                  <input
                    type="time"
                    value={preferences.digestTime}
                    onChange={(e) => savePreferences({ digestTime: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    disabled={saving || !preferences.notificationsEnabled}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Weekly Digest Day
                  </label>
                  <select
                    value={preferences.digestDayOfWeek}
                    onChange={(e) =>
                      savePreferences({ digestDayOfWeek: parseInt(e.target.value, 10) })
                    }
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    disabled={saving || !preferences.notificationsEnabled}
                  >
                    <option value={0}>Sunday</option>
                    <option value={1}>Monday</option>
                    <option value={2}>Tuesday</option>
                    <option value={3}>Wednesday</option>
                    <option value={4}>Thursday</option>
                    <option value={5}>Friday</option>
                    <option value={6}>Saturday</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {saving && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
          Saving...
        </div>
      )}
    </div>
  );
}
