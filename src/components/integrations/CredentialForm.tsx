"use client";

import { useState } from "react";
import type { AuthenticationType, CredentialData } from "@/types";

interface CredentialFormProps {
  integrationId?: string;
  initialData?: {
    name: string;
    type: AuthenticationType;
    expiresAt?: string;
  };
  onSubmit: (data: CredentialFormData) => Promise<void>;
  onCancel?: () => void;
  isEditing?: boolean;
}

export interface CredentialFormData {
  name: string;
  type: AuthenticationType;
  data: CredentialData;
  integrationId?: string;
  expiresAt?: string;
  rotationSchedule?: string;
  allowedRoles?: string[];
}

const CREDENTIAL_TYPES: { value: AuthenticationType; label: string }[] = [
  { value: "api_key", label: "API Key" },
  { value: "oauth2", label: "OAuth 2.0" },
  { value: "basic", label: "Basic Auth" },
  { value: "bearer", label: "Bearer Token" },
  { value: "certificate", label: "Certificate" },
  { value: "custom", label: "Custom" },
];

const ROTATION_SCHEDULES = [
  { value: "", label: "No auto-rotation" },
  { value: "0 0 1 * *", label: "Monthly" },
  { value: "0 0 1 */3 *", label: "Quarterly" },
  { value: "0 0 1 1,7 *", label: "Semi-annually" },
  { value: "0 0 1 1 *", label: "Annually" },
];

export function CredentialForm({
  integrationId,
  initialData,
  onSubmit,
  onCancel,
  isEditing = false,
}: CredentialFormProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [type, setType] = useState<AuthenticationType>(
    initialData?.type || "api_key"
  );
  const [credentialData, setCredentialData] = useState<CredentialData>({});
  const [expiresAt, setExpiresAt] = useState(initialData?.expiresAt || "");
  const [rotationSchedule, setRotationSchedule] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Validate required fields based on type
      const validation = validateCredentialData(type, credentialData);
      if (!validation.valid) {
        setError(validation.error || "Invalid credential data");
        return;
      }

      await onSubmit({
        name: name.trim(),
        type,
        data: credentialData,
        integrationId,
        expiresAt: expiresAt || undefined,
        rotationSchedule: rotationSchedule || undefined,
        allowedRoles: ["admin", "super_admin"],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save credential");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateCredentialField = (field: string, value: string) => {
    setCredentialData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Credential Details</h3>

        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700"
          >
            Name *
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="e.g., Production API Key"
            required
            minLength={3}
          />
          <p className="mt-1 text-xs text-gray-500">
            A descriptive name for this credential
          </p>
        </div>

        <div>
          <label
            htmlFor="type"
            className="block text-sm font-medium text-gray-700"
          >
            Authentication Type *
          </label>
          <select
            id="type"
            value={type}
            onChange={(e) => {
              setType(e.target.value as AuthenticationType);
              setCredentialData({}); // Reset data when type changes
            }}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            disabled={isEditing}
          >
            {CREDENTIAL_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Secret Data Fields */}
      <div className="space-y-4 border-t pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Secret Data</h3>
          <button
            type="button"
            onClick={() => setShowSecrets(!showSecrets)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showSecrets ? "Hide secrets" : "Show secrets"}
          </button>
        </div>

        <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
          Secrets are encrypted using AES-256-GCM before storage. Never share
          these values or include them in logs.
        </p>

        {renderCredentialFields(
          type,
          credentialData,
          updateCredentialField,
          showSecrets
        )}
      </div>

      {/* Expiration & Rotation */}
      <div className="space-y-4 border-t pt-4">
        <h3 className="text-lg font-medium text-gray-900">
          Expiration & Rotation
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="expiresAt"
              className="block text-sm font-medium text-gray-700"
            >
              Expires At
            </label>
            <input
              type="datetime-local"
              id="expiresAt"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              Leave empty for no expiration
            </p>
          </div>

          <div>
            <label
              htmlFor="rotationSchedule"
              className="block text-sm font-medium text-gray-700"
            >
              Auto-Rotation Schedule
            </label>
            <select
              id="rotationSchedule"
              value={rotationSchedule}
              onChange={(e) => setRotationSchedule(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              {ROTATION_SCHEDULES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3 border-t pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isSubmitting
            ? "Saving..."
            : isEditing
            ? "Update Credential"
            : "Create Credential"}
        </button>
      </div>
    </form>
  );
}

function renderCredentialFields(
  type: AuthenticationType,
  data: CredentialData,
  updateField: (field: string, value: string) => void,
  showSecrets: boolean
) {
  const inputType = showSecrets ? "text" : "password";

  switch (type) {
    case "api_key":
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              API Key *
            </label>
            <input
              type={inputType}
              value={data.apiKey || ""}
              onChange={(e) => updateField("apiKey", e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm font-mono"
              placeholder="Enter API key"
              required
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Header Name
            </label>
            <input
              type="text"
              value={data.custom?.headerName || "X-API-Key"}
              onChange={(e) =>
                updateField("custom", JSON.stringify({ headerName: e.target.value }))
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="X-API-Key"
            />
            <p className="mt-1 text-xs text-gray-500">
              Header name used to send the API key
            </p>
          </div>
        </div>
      );

    case "oauth2":
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Client ID *
            </label>
            <input
              type="text"
              value={data.clientId || ""}
              onChange={(e) => updateField("clientId", e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm font-mono"
              placeholder="Enter client ID"
              required
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Client Secret *
            </label>
            <input
              type={inputType}
              value={data.clientSecret || ""}
              onChange={(e) => updateField("clientSecret", e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm font-mono"
              placeholder="Enter client secret"
              required
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Token URL *
            </label>
            <input
              type="url"
              value={data.custom?.tokenUrl || ""}
              onChange={(e) =>
                updateField("custom", JSON.stringify({ ...data.custom, tokenUrl: e.target.value }))
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="https://auth.example.com/oauth/token"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Access Token
            </label>
            <input
              type={inputType}
              value={data.accessToken || ""}
              onChange={(e) => updateField("accessToken", e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm font-mono"
              placeholder="Current access token (if available)"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Refresh Token
            </label>
            <input
              type={inputType}
              value={data.refreshToken || ""}
              onChange={(e) => updateField("refreshToken", e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm font-mono"
              placeholder="Refresh token (if available)"
              autoComplete="off"
            />
          </div>
        </div>
      );

    case "basic":
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Username *
            </label>
            <input
              type="text"
              value={data.username || ""}
              onChange={(e) => updateField("username", e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="Enter username"
              required
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Password *
            </label>
            <input
              type={inputType}
              value={data.password || ""}
              onChange={(e) => updateField("password", e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm font-mono"
              placeholder="Enter password"
              required
              autoComplete="off"
            />
          </div>
        </div>
      );

    case "bearer":
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Bearer Token *
          </label>
          <textarea
            value={data.accessToken || ""}
            onChange={(e) => updateField("accessToken", e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm font-mono"
            placeholder="Enter bearer token"
            rows={3}
            required
            autoComplete="off"
            style={{
              WebkitTextSecurity: showSecrets ? "none" : "disc",
            } as React.CSSProperties}
          />
        </div>
      );

    case "certificate":
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Certificate (PEM) *
            </label>
            <textarea
              value={data.certificate || ""}
              onChange={(e) => updateField("certificate", e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm font-mono"
              placeholder="-----BEGIN CERTIFICATE-----"
              rows={4}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Private Key (PEM) *
            </label>
            <textarea
              value={data.privateKey || ""}
              onChange={(e) => updateField("privateKey", e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm font-mono"
              placeholder="-----BEGIN PRIVATE KEY-----"
              rows={4}
              required
              style={{
                WebkitTextSecurity: showSecrets ? "none" : "disc",
              } as React.CSSProperties}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Passphrase
            </label>
            <input
              type={inputType}
              value={data.passphrase || ""}
              onChange={(e) => updateField("passphrase", e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm font-mono"
              placeholder="Private key passphrase (if encrypted)"
              autoComplete="off"
            />
          </div>
        </div>
      );

    case "custom":
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Custom Credential Data (JSON) *
          </label>
          <textarea
            value={JSON.stringify(data.custom || {}, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                updateField("custom", JSON.stringify(parsed));
              } catch {
                // Allow invalid JSON during editing
              }
            }}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm font-mono"
            placeholder='{"key": "value"}'
            rows={6}
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            Enter custom credential data as JSON
          </p>
        </div>
      );

    default:
      return null;
  }
}

function validateCredentialData(
  type: AuthenticationType,
  data: CredentialData
): { valid: boolean; error?: string } {
  switch (type) {
    case "api_key":
      if (!data.apiKey?.trim()) {
        return { valid: false, error: "API key is required" };
      }
      break;
    case "oauth2":
      if (!data.clientId?.trim()) {
        return { valid: false, error: "Client ID is required" };
      }
      if (!data.clientSecret?.trim()) {
        return { valid: false, error: "Client secret is required" };
      }
      break;
    case "basic":
      if (!data.username?.trim()) {
        return { valid: false, error: "Username is required" };
      }
      if (!data.password?.trim()) {
        return { valid: false, error: "Password is required" };
      }
      break;
    case "bearer":
      if (!data.accessToken?.trim()) {
        return { valid: false, error: "Bearer token is required" };
      }
      break;
    case "certificate":
      if (!data.certificate?.trim()) {
        return { valid: false, error: "Certificate is required" };
      }
      if (!data.privateKey?.trim()) {
        return { valid: false, error: "Private key is required" };
      }
      break;
    case "custom":
      if (!data.custom || Object.keys(data.custom).length === 0) {
        return { valid: false, error: "Custom credential data is required" };
      }
      break;
  }
  return { valid: true };
}

export default CredentialForm;
