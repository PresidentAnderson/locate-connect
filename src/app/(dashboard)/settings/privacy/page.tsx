'use client';

/**
 * Privacy Settings Page (LC-FEAT-037)
 * User page for managing consent and data privacy preferences
 */

import { useState, useEffect } from 'react';
import { cn } from '@/lib';

type ConsentType = 'data_processing' | 'marketing' | 'analytics' | 'third_party_sharing';

interface ConsentStatus {
  consentType: ConsentType;
  isGranted: boolean;
  grantedAt?: string;
  withdrawnAt?: string;
}

const CONSENT_LABELS: Record<ConsentType, { title: string; description: string }> = {
  data_processing: {
    title: 'Essential Data Processing',
    description:
      'Required for the platform to function. This includes storing your profile, cases, and activity data.',
  },
  marketing: {
    title: 'Marketing Communications',
    description:
      'Receive updates about new features, community resources, and relevant services.',
  },
  analytics: {
    title: 'Analytics & Improvements',
    description:
      'Help us improve the platform by allowing anonymous usage analytics.',
  },
  third_party_sharing: {
    title: 'Third-Party Sharing',
    description:
      'Allow sharing of your case information with partner organizations and law enforcement agencies.',
  },
};

export default function PrivacySettingsPage() {
  const [consents, setConsents] = useState<ConsentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<ConsentType | null>(null);
  const [showDataExport, setShowDataExport] = useState(false);
  const [showDataErasure, setShowDataErasure] = useState(false);

  useEffect(() => {
    loadConsents();
  }, []);

  async function loadConsents() {
    try {
      const response = await fetch('/api/compliance/consent');
      if (response.ok) {
        const data = await response.json();
        // Map to consent status
        const consentTypes: ConsentType[] = [
          'data_processing',
          'marketing',
          'analytics',
          'third_party_sharing',
        ];
        const statusMap: ConsentStatus[] = consentTypes.map((type) => {
          const record = data.currentStatus?.[type];
          return {
            consentType: type,
            isGranted: record?.is_granted ?? (type === 'data_processing'),
            grantedAt: record?.granted_at,
            withdrawnAt: record?.withdrawn_at,
          };
        });
        setConsents(statusMap);
      }
    } catch (error) {
      console.error('Error loading consents:', error);
      // Set defaults
      setConsents([
        { consentType: 'data_processing', isGranted: true },
        { consentType: 'marketing', isGranted: false },
        { consentType: 'analytics', isGranted: false },
        { consentType: 'third_party_sharing', isGranted: false },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function updateConsent(consentType: ConsentType, isGranted: boolean) {
    setSaving(consentType);
    try {
      const response = await fetch('/api/compliance/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consentType,
          isGranted,
          consentSource: 'settings',
        }),
      });

      if (response.ok) {
        setConsents((prev) =>
          prev.map((c) =>
            c.consentType === consentType
              ? {
                  ...c,
                  isGranted,
                  grantedAt: isGranted ? new Date().toISOString() : c.grantedAt,
                  withdrawnAt: !isGranted ? new Date().toISOString() : c.withdrawnAt,
                }
              : c
          )
        );
      }
    } catch (error) {
      console.error('Error updating consent:', error);
    } finally {
      setSaving(null);
    }
  }

  async function requestDataExport() {
    try {
      const response = await fetch('/api/compliance/data-portability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'json' }),
      });

      if (response.ok) {
        setShowDataExport(false);
        alert(
          'Your data export has been requested. You will be notified when it is ready for download.'
        );
      }
    } catch (error) {
      console.error('Error requesting data export:', error);
    }
  }

  async function requestDataErasure() {
    try {
      const response = await fetch('/api/compliance/data-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: 'erasure',
          requestDescription: 'User requested data erasure from privacy settings',
          applicableFramework: 'pipeda',
        }),
      });

      if (response.ok) {
        setShowDataErasure(false);
        alert(
          'Your data erasure request has been submitted. Our team will review and process your request within 30 days.'
        );
      }
    } catch (error) {
      console.error('Error requesting data erasure:', error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Privacy Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your consent preferences and data privacy settings
        </p>
      </div>

      {/* Consent Preferences */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Consent Preferences</h2>
        <div className="space-y-4">
          {consents.map((consent) => {
            const label = CONSENT_LABELS[consent.consentType];
            const isRequired = consent.consentType === 'data_processing';
            const isSaving = saving === consent.consentType;

            return (
              <div
                key={consent.consentType}
                className="flex items-start justify-between p-4 rounded-lg bg-gray-50"
              >
                <div className="flex-1 pr-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-gray-900">{label.title}</h3>
                    {isRequired && (
                      <span className="inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{label.description}</p>
                  {consent.isGranted && consent.grantedAt && (
                    <p className="mt-1 text-xs text-gray-400">
                      Granted on {new Date(consent.grantedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => updateConsent(consent.consentType, !consent.isGranted)}
                    disabled={isRequired || isSaving}
                    className={cn(
                      'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
                      consent.isGranted ? 'bg-indigo-600' : 'bg-gray-200',
                      (isRequired || isSaving) && 'opacity-50 cursor-not-allowed'
                    )}
                    role="switch"
                    aria-checked={consent.isGranted}
                  >
                    <span
                      className={cn(
                        'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                        consent.isGranted ? 'translate-x-5' : 'translate-x-0'
                      )}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Data Rights */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Data Rights</h2>
        <p className="text-sm text-gray-500 mb-4">
          Under PIPEDA and GDPR, you have the right to access, export, and request deletion of your
          personal data.
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Data Export */}
          <div className="p-4 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-900">Export Your Data</h3>
            <p className="mt-1 text-sm text-gray-500">
              Download a copy of all your personal data in a portable format.
            </p>
            <button
              onClick={() => setShowDataExport(true)}
              className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Request Export
            </button>
          </div>

          {/* Data Erasure */}
          <div className="p-4 rounded-lg border border-red-200 bg-red-50">
            <h3 className="text-sm font-medium text-gray-900">Delete Your Data</h3>
            <p className="mt-1 text-sm text-gray-500">
              Request permanent deletion of your account and all associated data.
            </p>
            <button
              onClick={() => setShowDataErasure(true)}
              className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Request Deletion
            </button>
          </div>
        </div>
      </div>

      {/* View Data Requests */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Data Requests</h2>
        <p className="text-sm text-gray-500 mb-4">
          View the status of your previous data access and deletion requests.
        </p>
        <a
          href="/settings/privacy/requests"
          className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          View Request History
          <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      {/* Data Export Modal */}
      {showDataExport && (
        <ConfirmationModal
          title="Export Your Data"
          message="We will prepare a download containing all your personal data, including your profile, cases, and activity history. This process may take a few minutes. You will be notified when your export is ready."
          confirmLabel="Request Export"
          onConfirm={requestDataExport}
          onCancel={() => setShowDataExport(false)}
        />
      )}

      {/* Data Erasure Modal */}
      {showDataErasure && (
        <ConfirmationModal
          title="Delete Your Data"
          message="This will permanently delete your account and all associated data. This action cannot be undone. Some data may be retained for legal compliance purposes. Your request will be processed within 30 days."
          confirmLabel="Request Deletion"
          danger
          onConfirm={requestDataErasure}
          onCancel={() => setShowDataErasure(false)}
        />
      )}
    </div>
  );
}

function ConfirmationModal({
  title,
  message,
  confirmLabel,
  danger = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-30" onClick={onCancel} />
        <div className="relative w-full max-w-md rounded-xl bg-white shadow-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="mt-3 text-sm text-gray-500">{message}</p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className={cn(
                'flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white',
                danger ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'
              )}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
