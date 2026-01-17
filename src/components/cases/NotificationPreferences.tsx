"use client";

import { cn } from "@/lib";
import { useState } from "react";
import type { NotificationChannel, NotificationFrequency } from "@/types";

export interface NotificationPreferencesProps {
  userId: string;
  initialPreferences?: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    pushEnabled: boolean;
    defaultFrequency: NotificationFrequency;
  };
  onSave?: (preferences: Record<string, unknown>) => void;
  className?: string;
}

export function NotificationPreferences({
  initialPreferences,
  onSave,
  className,
}: NotificationPreferencesProps) {
  const [emailEnabled, setEmailEnabled] = useState(
    initialPreferences?.emailEnabled ?? true
  );
  const [smsEnabled, setSmsEnabled] = useState(
    initialPreferences?.smsEnabled ?? false
  );
  const [pushEnabled, setPushEnabled] = useState(
    initialPreferences?.pushEnabled ?? true
  );
  const [frequency, setFrequency] = useState<NotificationFrequency>(
    initialPreferences?.defaultFrequency ?? "immediate"
  );

  const handleSave = () => {
    onSave?.({
      emailEnabled,
      smsEnabled,
      pushEnabled,
      defaultFrequency: frequency,
    });
  };

  return (
    <div className={cn("rounded-xl border border-gray-200 bg-white p-6", className)}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Notification Preferences
      </h3>
      
      <div className="space-y-4">
        {/* Notification Channels */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            Notification Channels
          </p>
          <div className="space-y-2">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={emailEnabled}
                onChange={(e) => setEmailEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
              />
              <span className="text-sm text-gray-700">📧 Email notifications</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={smsEnabled}
                onChange={(e) => setSmsEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
              />
              <span className="text-sm text-gray-700">📱 SMS/Text messages</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={pushEnabled}
                onChange={(e) => setPushEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
              />
              <span className="text-sm text-gray-700">🔔 Push notifications</span>
            </label>
          </div>
        </div>

        {/* Notification Frequency */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            Notification Frequency
          </p>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as NotificationFrequency)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <option value="immediate">Immediately</option>
            <option value="daily_digest">Daily Digest</option>
            <option value="weekly_digest">Weekly Digest</option>
          </select>
        </div>

        {/* Notification Types */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            Notify me about
          </p>
          <div className="space-y-2">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
              />
              <span className="text-sm text-gray-700">Case status updates</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
              />
              <span className="text-sm text-gray-700">New leads and tips</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
              />
              <span className="text-sm text-gray-700">Timeline events</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
              />
              <span className="text-sm text-gray-700">System announcements</span>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="w-full rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
        >
          Save Preferences
        </button>
      </div>
    </div>
  );
}
