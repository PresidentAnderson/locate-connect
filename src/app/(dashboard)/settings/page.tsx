'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const settingsNav = [
  {
    name: 'Language Preferences',
    href: '/settings/language',
    description: 'Set your preferred language for the interface and communications',
    icon: GlobeIcon,
  },
  {
    name: 'Notifications',
    href: '/settings/notifications',
    description: 'Configure how and when you receive notifications',
    icon: BellIcon,
  },
  {
    name: 'Privacy',
    href: '/settings/privacy',
    description: 'Manage your privacy and data settings',
    icon: ShieldIcon,
  },
];

export default function SettingsPage() {
  const pathname = usePathname();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {settingsNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-white rounded-lg border border-gray-200 p-6 hover:border-cyan-500 hover:shadow-md transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <item.icon className="h-8 w-8 text-cyan-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {item.name}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {item.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  );
}
