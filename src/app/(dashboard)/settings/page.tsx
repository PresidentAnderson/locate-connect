"use client";

import Link from "next/link";

const settingsLinks = [
  {
    title: "Language Preferences",
    description: "Set your preferred languages for the interface and communications.",
    href: "/settings/language",
  },
  {
    title: "Notification Preferences",
    description: "Control how and when you receive updates.",
    href: "/settings/notifications",
  },
  {
    title: "Privacy Settings",
    description: "Manage consent preferences and data privacy options.",
    href: "/settings/privacy",
  },
];

export default function SettingsPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">
          Manage your account preferences and platform settings.
        </p>
      </div>

      <div className="grid gap-4">
        {settingsLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:border-cyan-200 hover:shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{item.title}</h2>
                <p className="text-sm text-gray-600 mt-1">{item.description}</p>
              </div>
              <span className="text-cyan-600 text-sm font-medium">Open</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
