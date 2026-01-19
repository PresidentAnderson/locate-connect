"use client";

import { useState, useEffect, useCallback } from "react";
import type { AuthenticationType } from "@/types";

interface Credential {
  id: string;
  name: string;
  type: AuthenticationType;
  integration_id?: string;
  status: "active" | "expired" | "revoked" | "rotating";
  expires_at?: string;
  last_rotated?: string;
  rotation_count: number;
  created_at: string;
  last_accessed_at?: string;
}

interface ExpiringCredential {
  id: string;
  name: string;
  integrationId?: string;
  expiresAt: string;
  daysUntilExpiry: number;
}

interface CredentialsListProps {
  integrationId?: string;
  onCreateNew?: () => void;
  onEdit?: (credentialId: string) => void;
  onRotate?: (credentialId: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  expired: "bg-red-100 text-red-800",
  revoked: "bg-gray-100 text-gray-800",
  rotating: "bg-yellow-100 text-yellow-800",
};

const TYPE_LABELS: Record<AuthenticationType, string> = {
  api_key: "API Key",
  oauth2: "OAuth 2.0",
  basic: "Basic Auth",
  bearer: "Bearer Token",
  certificate: "Certificate",
  custom: "Custom",
};

export function CredentialsList({
  integrationId,
  onCreateNew,
  onEdit,
  onRotate,
}: CredentialsListProps) {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [expiringCredentials, setExpiringCredentials] = useState<ExpiringCredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchCredentials = useCallback(async () => {
    try {
      const url = integrationId
        ? `/api/integrations/credentials?integrationId=${integrationId}`
        : "/api/integrations/credentials";

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch credentials");
      }

      const result = await response.json();
      setCredentials(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  }, [integrationId]);

  const fetchExpiringCredentials = useCallback(async () => {
    try {
      const response = await fetch("/api/integrations/credentials/expiring?days=30");
      if (!response.ok) return;

      const result = await response.json();
      setExpiringCredentials(result.data?.critical?.credentials || []);
    } catch {
      // Silently fail for expiring credentials
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchCredentials(), fetchExpiringCredentials()]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchCredentials, fetchExpiringCredentials]);

  const handleRevoke = async (id: string) => {
    const reason = window.prompt("Enter revocation reason:");
    if (!reason) return;

    setActionLoading(id);
    try {
      const response = await fetch(`/api/integrations/credentials/${id}/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        throw new Error("Failed to revoke credential");
      }

      await fetchCredentials();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to revoke credential");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete "${name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    setActionLoading(id);
    try {
      const response = await fetch(
        `/api/integrations/credentials/${id}?reason=Deleted%20by%20admin`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error("Failed to delete credential");
      }

      await fetchCredentials();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete credential");
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Error loading credentials
            </h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Expiring Credentials Warning */}
      {expiringCredentials.length > 0 && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-amber-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-amber-800">
                Credentials Expiring Soon
              </h3>
              <div className="mt-2 text-sm text-amber-700">
                <ul className="list-disc pl-5 space-y-1">
                  {expiringCredentials.map((cred) => (
                    <li key={cred.id}>
                      <strong>{cred.name}</strong> expires in{" "}
                      {cred.daysUntilExpiry} day
                      {cred.daysUntilExpiry !== 1 ? "s" : ""}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900">
          Credentials {credentials.length > 0 && `(${credentials.length})`}
        </h2>
        {onCreateNew && (
          <button
            onClick={onCreateNew}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg
              className="-ml-1 mr-2 h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
            Add Credential
          </button>
        )}
      </div>

      {/* Credentials List */}
      {credentials.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No credentials
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new credential.
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {credentials.map((credential) => (
              <li key={credential.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center min-w-0">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <svg
                            className="h-5 w-5 text-gray-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                            />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-4 truncate">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-blue-600 truncate">
                            {credential.name}
                          </p>
                          <span
                            className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              STATUS_COLORS[credential.status]
                            }`}
                          >
                            {credential.status}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center text-sm text-gray-500">
                          <span className="truncate">
                            {TYPE_LABELS[credential.type]} |{" "}
                            {credential.rotation_count > 0
                              ? `Rotated ${credential.rotation_count} time${
                                  credential.rotation_count !== 1 ? "s" : ""
                                }`
                              : "Never rotated"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0 flex items-center space-x-2">
                      {credential.status === "active" && onRotate && (
                        <button
                          onClick={() => onRotate(credential.id)}
                          disabled={actionLoading === credential.id}
                          className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                          title="Rotate credential"
                        >
                          Rotate
                        </button>
                      )}
                      {credential.status === "active" && (
                        <button
                          onClick={() => handleRevoke(credential.id)}
                          disabled={actionLoading === credential.id}
                          className="text-sm text-amber-600 hover:text-amber-800 disabled:opacity-50"
                          title="Revoke credential"
                        >
                          Revoke
                        </button>
                      )}
                      <button
                        onClick={() =>
                          handleDelete(credential.id, credential.name)
                        }
                        disabled={actionLoading === credential.id}
                        className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                        title="Delete credential"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-xs text-gray-500">
                        Created: {formatDate(credential.created_at)}
                      </p>
                      {credential.expires_at && (
                        <p className="mt-1 flex items-center text-xs text-gray-500 sm:mt-0 sm:ml-6">
                          Expires: {formatDate(credential.expires_at)}
                        </p>
                      )}
                    </div>
                    <div className="mt-1 flex items-center text-xs text-gray-500 sm:mt-0">
                      Last accessed: {formatDate(credential.last_accessed_at)}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default CredentialsList;
