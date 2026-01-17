"use client";

import { useState, ReactNode } from "react";
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
} from "@/types/notification.types";

interface NotificationPreferenceCenterProps {
  initialPreferences: NotificationPreferences;
  initialTypePreferences: NotificationTypePreference[];
  onSave: (
    preferences: Partial<NotificationPreferences>,
    typePreferences: Partial<NotificationTypePreference>[]
  ) => Promise<void>;
}

export function NotificationPreferenceCenter({
  initialPreferences,
  initialTypePreferences,
  onSave,
}: NotificationPreferenceCenterProps) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [typePreferences, setTypePreferences] = useState(initialTypePreferences);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"channels" | "types" | "schedule">("channels");

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(preferences, typePreferences);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const updateTypePreference = (
    type: NotificationType,
    updates: Partial<NotificationTypePreference>
  ) => {
    setTypePreferences((prev) =>
      prev.map((tp) =>
        tp.notificationType === type ? { ...tp, ...updates } : tp
      )
    );
  };

  const channels: NotificationChannel[] = ["email", "sms", "push", "in_app", "browser"];
  const notificationTypes: NotificationType[] = [
    "case_status_update",
    "new_lead_tip",
    "comment_reply",
    "system_announcement",
    "nearby_case_alert",
    "scheduled_reminder",
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">
          Notification Preferences
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Control how and when you receive notifications
        </p>
      </div>

      {/* Master Toggle */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-medium text-gray-900">
              Enable Notifications
            </span>
            <p className="text-sm text-gray-500">
              Turn off to disable all notifications
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              updatePreference(
                "notificationsEnabled",
                !preferences.notificationsEnabled
              )
            }
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 ${
              preferences.notificationsEnabled ? "bg-cyan-600" : "bg-gray-200"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                preferences.notificationsEnabled
                  ? "translate-x-5"
                  : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          {[
            { id: "channels", label: "Channels" },
            { id: "types", label: "Notification Types" },
            { id: "schedule", label: "Schedule & Timing" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-cyan-500 text-cyan-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === "channels" && (
          <div className="space-y-6">
            <p className="text-sm text-gray-600">
              Choose which channels you want to receive notifications on
            </p>

            {channels.map((channel) => {
              const label = CHANNEL_LABELS[channel];
              const enabledKey = `${channel}Enabled` as keyof NotificationPreferences;
              const isEnabled = preferences[enabledKey] as boolean;

              return (
                <div
                  key={channel}
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <ChannelIcon channel={channel} />
                    <div>
                      <span className="font-medium text-gray-900">
                        {label.title}
                      </span>
                      {channel === "email" && preferences.emailAddress && (
                        <p className="text-sm text-gray-500">
                          {preferences.emailAddress}
                        </p>
                      )}
                      {channel === "sms" && preferences.phoneNumber && (
                        <p className="text-sm text-gray-500">
                          {preferences.phoneNumber}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => updatePreference(enabledKey, !isEnabled)}
                    disabled={!preferences.notificationsEnabled}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                      isEnabled ? "bg-cyan-600" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              );
            })}

            {/* Channel Priority */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="font-medium text-gray-900 mb-2">
                Channel Priority
              </h4>
              <p className="text-sm text-gray-500 mb-4">
                Drag to reorder. We&apos;ll try the first available channel.
              </p>
              <div className="space-y-2">
                {preferences.channelPriority.map((channel, index) => (
                  <div
                    key={channel}
                    className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                  >
                    <span className="text-gray-400 text-sm w-6">
                      {index + 1}.
                    </span>
                    <ChannelIcon channel={channel} />
                    <span className="text-sm text-gray-700">
                      {CHANNEL_LABELS[channel].title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "types" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Choose which types of notifications you want to receive
            </p>

            {notificationTypes.map((type) => {
              const label = NOTIFICATION_TYPE_LABELS[type];
              const typePref = typePreferences.find(
                (tp) => tp.notificationType === type
              );
              const isEnabled = typePref?.enabled ?? true;

              return (
                <div
                  key={type}
                  className="p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-900">
                        {label.title}
                      </span>
                      <p className="text-sm text-gray-500">
                        {label.description}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateTypePreference(type, { enabled: !isEnabled })
                      }
                      disabled={!preferences.notificationsEnabled}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                        isEnabled ? "bg-cyan-600" : "bg-gray-200"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          isEnabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {isEnabled && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Frequency for this type
                      </label>
                      <select
                        value={typePref?.frequency || preferences.defaultFrequency}
                        onChange={(e) =>
                          updateTypePreference(type, {
                            frequency: e.target.value as NotificationFrequency,
                          })
                        }
                        className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      >
                        {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "schedule" && (
          <div className="space-y-6">
            {/* Default Frequency */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Default Notification Frequency
              </label>
              <select
                value={preferences.defaultFrequency}
                onChange={(e) =>
                  updatePreference(
                    "defaultFrequency",
                    e.target.value as NotificationFrequency
                  )
                }
                className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Quiet Hours */}
            <div className="pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="font-medium text-gray-900">Quiet Hours</span>
                  <p className="text-sm text-gray-500">
                    Pause notifications during specific hours
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updatePreference(
                      "quietHoursEnabled",
                      !preferences.quietHoursEnabled
                    )
                  }
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 ${
                    preferences.quietHoursEnabled ? "bg-cyan-600" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      preferences.quietHoursEnabled
                        ? "translate-x-5"
                        : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {preferences.quietHoursEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={preferences.quietHoursStart}
                      onChange={(e) =>
                        updatePreference("quietHoursStart", e.target.value)
                      }
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={preferences.quietHoursEnd}
                      onChange={(e) =>
                        updatePreference("quietHoursEnd", e.target.value)
                      }
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Timezone
                    </label>
                    <select
                      value={preferences.quietHoursTimezone}
                      onChange={(e) =>
                        updatePreference("quietHoursTimezone", e.target.value)
                      }
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
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
            </div>

            {/* Digest Settings */}
            {(preferences.defaultFrequency === "daily_digest" ||
              preferences.defaultFrequency === "weekly_digest") && (
              <div className="pt-6 border-t border-gray-200">
                <h4 className="font-medium text-gray-900 mb-4">
                  Digest Settings
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Send digest at
                    </label>
                    <input
                      type="time"
                      value={preferences.digestTime}
                      onChange={(e) =>
                        updatePreference("digestTime", e.target.value)
                      }
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                  {preferences.defaultFrequency === "weekly_digest" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Day of week
                      </label>
                      <select
                        value={preferences.digestDayOfWeek}
                        onChange={(e) =>
                          updatePreference(
                            "digestDayOfWeek",
                            parseInt(e.target.value)
                          )
                        }
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
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
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
        <div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {saved && (
            <p className="text-sm text-green-600">Preferences saved!</p>
          )}
        </div>
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
  );
}

function ChannelIcon({ channel }: { channel: NotificationChannel }) {
  const icons: Record<NotificationChannel, ReactNode> = {
    email: (
      <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    sms: (
      <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    push: (
      <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    in_app: (
      <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
    ),
    browser: (
      <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    ),
  };
  return icons[channel];
}

export default NotificationPreferenceCenter;
