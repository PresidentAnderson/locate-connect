'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface CredentialRequirement {
  name: string;
  type: string;
  description: string;
  required: boolean;
}

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  provider: string;
  version: string;
  configTemplate: Record<string, unknown>;
  credentialRequirements: CredentialRequirement[];
  endpointsTemplate: Record<string, unknown>[];
  documentation?: string;
  setupGuide?: string;
  logoUrl?: string;
  rating: number;
  ratingCount: number;
  usageCount: number;
  tags: string[];
  isOfficial: boolean;
  isVerified: boolean;
}

const categoryLabels: Record<string, string> = {
  healthcare: 'Healthcare',
  law_enforcement: 'Law Enforcement',
  government: 'Government',
  transportation: 'Transportation',
  border_services: 'Border Services',
  social_services: 'Social Services',
  communication: 'Communication',
  data_provider: 'Data Provider',
  custom: 'Custom',
};

export default function TemplateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [installing, setInstalling] = useState(false);

  // Install form state
  const [installName, setInstallName] = useState('');
  const [installDescription, setInstallDescription] = useState('');
  const [credentials, setCredentials] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const response = await fetch(`/api/integrations/templates/${id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error?.message || 'Failed to fetch template');
        }

        setTemplate(data.data?.template);
        setInstallName(data.data?.template?.name || '');
        setInstallDescription(data.data?.template?.description || '');

        // Initialize credentials
        const creds: Record<string, string> = {};
        data.data?.template?.credentialRequirements?.forEach((req: CredentialRequirement) => {
          creds[req.name] = '';
        });
        setCredentials(creds);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplate();
  }, [id]);

  const handleInstall = async () => {
    if (!template) return;

    setInstalling(true);
    try {
      const credArray = Object.entries(credentials).map(([name, value]) => ({ name, value }));

      const response = await fetch(`/api/integrations/templates/${id}/install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: installName,
          description: installDescription,
          credentials: credArray,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to install template');
      }

      // Redirect to the new integration
      router.push(`/admin/integrations/${data.data.integration.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Installation failed');
    } finally {
      setInstalling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-800">{error || 'Template not found'}</p>
        <Link href="/admin/integrations/templates" className="mt-2 text-sm font-medium text-red-600 hover:text-red-500">
          Back to templates
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/integrations/templates"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{template.name}</h1>
            {template.isOfficial && (
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                Official
              </span>
            )}
            {template.isVerified && !template.isOfficial && (
              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                Verified
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">
            by {template.provider} | {categoryLabels[template.category]} | v{template.version}
          </p>
        </div>
        <button
          onClick={() => setShowInstall(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 transition-colors"
        >
          <InstallIcon className="h-5 w-5" />
          Install
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <div className="flex items-center justify-center gap-1">
            <StarIcon className="h-5 w-5 text-yellow-400" />
            <span className="text-2xl font-bold text-gray-900">{template.rating.toFixed(1)}</span>
          </div>
          <p className="text-sm text-gray-500">{template.ratingCount} ratings</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{template.usageCount.toLocaleString()}</p>
          <p className="text-sm text-gray-500">installs</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{template.endpointsTemplate.length}</p>
          <p className="text-sm text-gray-500">endpoints</p>
        </div>
      </div>

      {/* Description */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Description</h2>
        <p className="text-gray-600">{template.description}</p>

        {template.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {template.tags.map((tag) => (
              <span key={tag} className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Requirements */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Credential Requirements</h2>
        <div className="space-y-3">
          {template.credentialRequirements.map((req) => (
            <div key={req.name} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-gray-200">
                <KeyIcon className="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{req.name}</span>
                  {req.required && (
                    <span className="text-xs text-red-500">Required</span>
                  )}
                </div>
                <p className="text-sm text-gray-500">{req.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Setup Guide */}
      {template.setupGuide && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Setup Guide</h2>
          <div className="prose prose-sm max-w-none text-gray-600">
            {template.setupGuide}
          </div>
        </div>
      )}

      {/* Documentation Link */}
      {template.documentation && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Documentation</h2>
          <a
            href={template.documentation}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-cyan-600 hover:text-cyan-500"
          >
            View full documentation
            <ExternalLinkIcon className="h-4 w-4" />
          </a>
        </div>
      )}

      {/* Install Modal */}
      {showInstall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Install {template.name}</h2>

            <div className="space-y-4">
              {/* Integration Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Integration Name</label>
                <input
                  type="text"
                  value={installName}
                  onChange={(e) => setInstallName(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 py-2 px-3 text-sm focus:ring-2 focus:ring-cyan-500"
                  placeholder="My Integration"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={installDescription}
                  onChange={(e) => setInstallDescription(e.target.value)}
                  rows={2}
                  className="mt-1 block w-full rounded-lg border border-gray-300 py-2 px-3 text-sm focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              {/* Credentials */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Credentials</label>
                <div className="space-y-3">
                  {template.credentialRequirements.map((req) => (
                    <div key={req.name}>
                      <label className="block text-xs text-gray-500 mb-1">
                        {req.name} {req.required && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type={req.type === 'password' || req.name.toLowerCase().includes('secret') ? 'password' : 'text'}
                        value={credentials[req.name] || ''}
                        onChange={(e) => setCredentials({ ...credentials, [req.name]: e.target.value })}
                        className="block w-full rounded-lg border border-gray-300 py-2 px-3 text-sm focus:ring-2 focus:ring-cyan-500"
                        placeholder={req.description}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowInstall(false);
                  setError(null);
                }}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleInstall}
                disabled={installing || !installName}
                className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
              >
                {installing ? 'Installing...' : 'Install Integration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function InstallIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

function KeyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}
