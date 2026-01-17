'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib';
import type {
  ConsentRecord,
  ConsentType,
  ConsentStatus,
  AllowedUses,
} from '@/types/facial-recognition.types';
import {
  CONSENT_TYPE_LABELS,
  CONSENT_STATUS_LABELS,
} from '@/types/facial-recognition.types';

interface ConsentManagerProps {
  caseId?: string;
  subjectId?: string;
  onConsentChange?: (consent: ConsentRecord) => void;
}

const CONSENT_VERSION = '1.0.0';
const PRIVACY_POLICY_VERSION = '2026-01';

export function ConsentManager({ caseId, subjectId, onConsentChange }: ConsentManagerProps) {
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchConsents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ activeOnly: 'false' });
      if (caseId) params.set('caseId', caseId);
      if (subjectId) params.set('subjectId', subjectId);

      const response = await fetch(`/api/facial-recognition/consent?${params}`);
      if (!response.ok) throw new Error('Failed to fetch consents');

      const data = await response.json();
      setConsents(data.data);
    } catch (error) {
      console.error('Error fetching consents:', error);
    } finally {
      setLoading(false);
    }
  }, [caseId, subjectId]);

  useEffect(() => {
    fetchConsents();
  }, [fetchConsents]);

  const handleConsentGranted = (consent: ConsentRecord) => {
    setConsents((prev) => [consent, ...prev]);
    setShowForm(false);
    onConsentChange?.(consent);
  };

  const handleWithdraw = async (consentId: string, reason: string) => {
    try {
      const response = await fetch('/api/facial-recognition/consent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consentId,
          action: 'withdraw',
          withdrawalReason: reason,
        }),
      });

      if (!response.ok) throw new Error('Failed to withdraw consent');

      const data = await response.json();
      setConsents((prev) =>
        prev.map((c) => (c.id === consentId ? data.data : c))
      );
      onConsentChange?.(data.data);
    } catch (error) {
      console.error('Error withdrawing consent:', error);
    }
  };

  const activeConsents = consents.filter((c) => c.consentStatus === 'granted');
  const inactiveConsents = consents.filter((c) => c.consentStatus !== 'granted');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Consent Management</h3>
          <p className="text-sm text-gray-500 mt-1">
            Manage consent for facial recognition and photo processing
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-md hover:bg-cyan-700"
        >
          Record New Consent
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <LoadingSpinner className="h-8 w-8 text-cyan-600" />
        </div>
      ) : (
        <>
          {/* Active Consents */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Active Consents</h4>
            {activeConsents.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <ShieldIcon className="mx-auto h-10 w-10 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">No active consents</p>
                <p className="text-xs text-gray-500">
                  Record consent before using facial recognition features
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeConsents.map((consent) => (
                  <ConsentCard
                    key={consent.id}
                    consent={consent}
                    onWithdraw={handleWithdraw}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Inactive/Withdrawn Consents */}
          {inactiveConsents.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Previous Consents
              </h4>
              <div className="space-y-3 opacity-75">
                {inactiveConsents.map((consent) => (
                  <ConsentCard key={consent.id} consent={consent} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Consent Form Modal */}
      {showForm && (
        <ConsentFormModal
          caseId={caseId}
          onClose={() => setShowForm(false)}
          onSubmit={handleConsentGranted}
        />
      )}
    </div>
  );
}

interface ConsentCardProps {
  consent: ConsentRecord;
  onWithdraw?: (consentId: string, reason: string) => void;
}

function ConsentCard({ consent, onWithdraw }: ConsentCardProps) {
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const statusConfig = CONSENT_STATUS_LABELS[consent.consentStatus];
  const typeConfig = CONSENT_TYPE_LABELS[consent.consentType];

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h5 className="font-medium text-gray-900">{typeConfig.label}</h5>
              <span
                className={cn(
                  'px-2 py-0.5 rounded text-xs font-medium',
                  statusConfig.bgColor,
                  statusConfig.color
                )}
              >
                {statusConfig.label}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">{typeConfig.description}</p>

            {/* Allowed Uses */}
            {consent.allowedUses && (
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(consent.allowedUses).map(([key, value]) => (
                  value && (
                    <span
                      key={key}
                      className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded"
                    >
                      {formatUseName(key)}
                    </span>
                  )
                ))}
              </div>
            )}

            {/* Dates */}
            <div className="mt-3 text-xs text-gray-500 space-y-1">
              {consent.grantedAt && (
                <p>Granted: {new Date(consent.grantedAt).toLocaleDateString()}</p>
              )}
              {consent.expiresAt && (
                <p>Expires: {new Date(consent.expiresAt).toLocaleDateString()}</p>
              )}
              {consent.withdrawnAt && (
                <p>Withdrawn: {new Date(consent.withdrawnAt).toLocaleDateString()}</p>
              )}
            </div>

            {/* Compliance */}
            {consent.complianceFramework && (
              <p className="mt-2 text-xs text-blue-600">
                Compliance: {consent.complianceFramework}
              </p>
            )}
          </div>

          {/* Actions */}
          {consent.consentStatus === 'granted' && onWithdraw && (
            <button
              onClick={() => setShowWithdrawModal(true)}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Withdraw
            </button>
          )}
        </div>
      </div>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <WithdrawModal
          consentId={consent.id}
          onClose={() => setShowWithdrawModal(false)}
          onConfirm={(reason) => {
            onWithdraw?.(consent.id, reason);
            setShowWithdrawModal(false);
          }}
        />
      )}
    </>
  );
}

interface WithdrawModalProps {
  consentId: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

function WithdrawModal({ consentId, onClose, onConfirm }: WithdrawModalProps) {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900">Withdraw Consent</h3>
        <p className="text-sm text-gray-500 mt-2">
          Are you sure you want to withdraw this consent? This will prevent further
          processing of data under this consent.
        </p>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reason for Withdrawal (optional)
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Please provide a reason..."
            className="w-full rounded-md border-gray-300 text-sm focus:border-cyan-500 focus:ring-cyan-500"
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
          >
            Withdraw Consent
          </button>
        </div>
      </div>
    </div>
  );
}

interface ConsentFormModalProps {
  caseId?: string;
  onClose: () => void;
  onSubmit: (consent: ConsentRecord) => void;
}

function ConsentFormModal({ caseId, onClose, onSubmit }: ConsentFormModalProps) {
  const [consentType, setConsentType] = useState<ConsentType>('facial_recognition');
  const [allowedUses, setAllowedUses] = useState<AllowedUses>({
    facialRecognition: true,
    ageProgression: false,
    databaseStorage: true,
    thirdPartySharing: false,
    researchUse: false,
  });
  const [signature, setSignature] = useState('');
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [complianceFramework, setComplianceFramework] = useState<'PIPEDA' | 'GDPR'>('PIPEDA');
  const [subjectRelationship, setSubjectRelationship] = useState<ConsentRecord['subjectRelationship']>('self');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signature.trim()) {
      setError('Electronic signature is required');
      return;
    }

    if (!acceptedPolicy) {
      setError('You must accept the privacy policy');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/facial-recognition/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectCaseId: caseId,
          consentType,
          consentVersion: CONSENT_VERSION,
          scopeDescription: 'Consent for facial recognition processing',
          allowedUses,
          consentMethod: 'electronic',
          electronicSignature: signature,
          privacyPolicyVersion: PRIVACY_POLICY_VERSION,
          complianceFramework,
          subjectRelationship,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to record consent');
      }

      const data = await response.json();
      onSubmit(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record consent');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />

        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Record Consent for Facial Recognition
              </h3>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Consent Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Consent Type
                </label>
                <select
                  value={consentType}
                  onChange={(e) => setConsentType(e.target.value as ConsentType)}
                  className="w-full rounded-md border-gray-300 text-sm focus:border-cyan-500 focus:ring-cyan-500"
                >
                  {Object.entries(CONSENT_TYPE_LABELS).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Relationship */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Relationship to Subject
                </label>
                <select
                  value={subjectRelationship}
                  onChange={(e) =>
                    setSubjectRelationship(e.target.value as ConsentRecord['subjectRelationship'])
                  }
                  className="w-full rounded-md border-gray-300 text-sm focus:border-cyan-500 focus:ring-cyan-500"
                >
                  <option value="self">Self</option>
                  <option value="parent">Parent</option>
                  <option value="guardian">Legal Guardian</option>
                  <option value="next_of_kin">Next of Kin</option>
                </select>
              </div>

              {/* Allowed Uses */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Authorized Uses
                </label>
                <div className="space-y-3">
                  {[
                    { key: 'facialRecognition', label: 'Facial Recognition Search', required: true },
                    { key: 'ageProgression', label: 'Age Progression Generation' },
                    { key: 'databaseStorage', label: 'Store in Database', required: true },
                    { key: 'thirdPartySharing', label: 'Share with Partner Organizations' },
                    { key: 'researchUse', label: 'Use for Research & Improvement' },
                  ].map(({ key, label, required }) => (
                    <label key={key} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowedUses[key as keyof AllowedUses] || false}
                        onChange={(e) =>
                          setAllowedUses({ ...allowedUses, [key]: e.target.checked })
                        }
                        disabled={required}
                        className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500 disabled:opacity-50"
                      />
                      <span className="text-sm text-gray-700">
                        {label}
                        {required && (
                          <span className="text-xs text-gray-500 ml-1">(required)</span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Compliance Framework */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Applicable Privacy Framework
                </label>
                <div className="flex gap-4">
                  {(['PIPEDA', 'GDPR'] as const).map((framework) => (
                    <label key={framework} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="framework"
                        value={framework}
                        checked={complianceFramework === framework}
                        onChange={(e) =>
                          setComplianceFramework(e.target.value as 'PIPEDA' | 'GDPR')
                        }
                        className="border-gray-300 text-cyan-600 focus:ring-cyan-500"
                      />
                      <span className="text-sm text-gray-700">{framework}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Privacy Policy */}
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptedPolicy}
                    onChange={(e) => setAcceptedPolicy(e.target.checked)}
                    className="mt-1 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                  />
                  <span className="text-sm text-gray-700">
                    I have read and agree to the{' '}
                    <a href="#" className="text-cyan-600 hover:underline">
                      Privacy Policy
                    </a>{' '}
                    (version {PRIVACY_POLICY_VERSION}) and understand how my biometric data
                    will be processed in accordance with{' '}
                    {complianceFramework === 'PIPEDA'
                      ? 'the Personal Information Protection and Electronic Documents Act'
                      : 'the General Data Protection Regulation'}
                    .
                  </span>
                </label>
              </div>

              {/* Electronic Signature */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Electronic Signature
                </label>
                <input
                  type="text"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  placeholder="Type your full legal name"
                  className="w-full rounded-md border-gray-300 text-sm focus:border-cyan-500 focus:ring-cyan-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  By typing your name above, you are providing your electronic signature
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !signature.trim() || !acceptedPolicy}
                className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-md hover:bg-cyan-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Recording...' : 'Record Consent'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function formatUseName(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

// Icon components
function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  );
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg className={cn('animate-spin', className)} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}
