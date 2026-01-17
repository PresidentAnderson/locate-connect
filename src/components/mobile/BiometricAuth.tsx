"use client";

/**
 * WebAuthn Biometric Authentication Component
 * Enables passwordless login using device biometrics
 * LC-FEAT-031: Mobile App Companion
 */

import { useState, useCallback } from "react";

export interface WebAuthnCredential {
  id: string;
  rawId: ArrayBuffer;
  type: string;
  authenticatorAttachment?: string;
  createdAt: number;
  lastUsedAt?: number;
  deviceName?: string;
}

interface BiometricAuthProps {
  userId: string;
  username: string;
  onRegisterSuccess: (credential: WebAuthnCredential) => void;
  onAuthenticateSuccess: (credentialId: string) => void;
  onError?: (error: Error) => void;
  rpName?: string;
  rpId?: string;
  className?: string;
}

// Check if WebAuthn is supported
export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    window.PublicKeyCredential !== undefined &&
    typeof window.PublicKeyCredential === "function"
  );
}

// Check if platform authenticator is available (Face ID, Touch ID, Windows Hello)
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;

  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export function BiometricAuth({
  userId,
  username,
  onRegisterSuccess,
  onAuthenticateSuccess,
  onError,
  rpName = "LocateConnect",
  rpId,
  className = "",
}: BiometricAuthProps) {
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [isPlatformAvailable, setIsPlatformAvailable] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);

  // Check support on mount
  useState(() => {
    const checkSupport = async () => {
      const supported = isWebAuthnSupported();
      setIsSupported(supported);

      if (supported) {
        const platformAvailable = await isPlatformAuthenticatorAvailable();
        setIsPlatformAvailable(platformAvailable);
      }
    };
    checkSupport();
  });

  // Generate random challenge
  const generateChallenge = (): Uint8Array => {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);
    return challenge;
  };

  // Convert ArrayBuffer to Base64URL
  const bufferToBase64URL = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let str = "";
    for (const byte of bytes) {
      str += String.fromCharCode(byte);
    }
    return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  };

  // Convert Base64URL to ArrayBuffer
  const base64URLToBuffer = (base64url: string): ArrayBuffer => {
    const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (base64.length % 4)) % 4);
    const binaryStr = atob(base64 + padding);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes.buffer;
  };

  // Register a new credential (biometric enrollment)
  const registerCredential = useCallback(async () => {
    if (!isWebAuthnSupported()) {
      setError("WebAuthn is not supported in this browser");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get registration options from server
      const optionsResponse = await fetch("/api/auth/webauthn/register/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, username }),
      });

      if (!optionsResponse.ok) {
        throw new Error("Failed to get registration options");
      }

      const options = await optionsResponse.json();

      // Create credential with device biometrics
      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge: base64URLToBuffer(options.challenge),
        rp: {
          name: rpName,
          id: rpId || window.location.hostname,
        },
        user: {
          id: new TextEncoder().encode(userId),
          name: username,
          displayName: username,
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" }, // ES256
          { alg: -257, type: "public-key" }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform", // Use device biometrics
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 60000,
        attestation: "none",
      };

      const credential = (await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      })) as PublicKeyCredential | null;

      if (!credential) {
        throw new Error("Failed to create credential");
      }

      const attestationResponse = credential.response as AuthenticatorAttestationResponse;

      // Prepare credential for server
      const credentialData = {
        id: credential.id,
        rawId: bufferToBase64URL(credential.rawId),
        type: credential.type,
        response: {
          clientDataJSON: bufferToBase64URL(attestationResponse.clientDataJSON),
          attestationObject: bufferToBase64URL(attestationResponse.attestationObject),
        },
      };

      // Send credential to server for verification and storage
      const verifyResponse = await fetch("/api/auth/webauthn/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, credential: credentialData }),
      });

      if (!verifyResponse.ok) {
        throw new Error("Failed to verify registration");
      }

      const webAuthnCredential: WebAuthnCredential = {
        id: credential.id,
        rawId: credential.rawId,
        type: credential.type,
        authenticatorAttachment: (credential as PublicKeyCredential & { authenticatorAttachment?: string }).authenticatorAttachment,
        createdAt: Date.now(),
        deviceName: getDeviceName(),
      };

      setIsRegistered(true);
      onRegisterSuccess(webAuthnCredential);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Registration failed";
      setError(errorMessage);
      onError?.(new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  }, [userId, username, rpName, rpId, onRegisterSuccess, onError]);

  // Authenticate with existing credential
  const authenticateCredential = useCallback(async () => {
    if (!isWebAuthnSupported()) {
      setError("WebAuthn is not supported in this browser");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get authentication options from server
      const optionsResponse = await fetch("/api/auth/webauthn/authenticate/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!optionsResponse.ok) {
        throw new Error("Failed to get authentication options");
      }

      const options = await optionsResponse.json();

      // Get credential from device
      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge: base64URLToBuffer(options.challenge),
        rpId: rpId || window.location.hostname,
        allowCredentials: options.allowCredentials?.map((cred: { id: string; type: string }) => ({
          id: base64URLToBuffer(cred.id),
          type: cred.type,
          transports: ["internal"],
        })),
        userVerification: "required",
        timeout: 60000,
      };

      const assertion = (await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      })) as PublicKeyCredential | null;

      if (!assertion) {
        throw new Error("Authentication cancelled");
      }

      const assertionResponse = assertion.response as AuthenticatorAssertionResponse;

      // Prepare assertion for server
      const assertionData = {
        id: assertion.id,
        rawId: bufferToBase64URL(assertion.rawId),
        type: assertion.type,
        response: {
          clientDataJSON: bufferToBase64URL(assertionResponse.clientDataJSON),
          authenticatorData: bufferToBase64URL(assertionResponse.authenticatorData),
          signature: bufferToBase64URL(assertionResponse.signature),
          userHandle: assertionResponse.userHandle
            ? bufferToBase64URL(assertionResponse.userHandle)
            : null,
        },
      };

      // Verify assertion with server
      const verifyResponse = await fetch("/api/auth/webauthn/authenticate/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, assertion: assertionData }),
      });

      if (!verifyResponse.ok) {
        throw new Error("Authentication verification failed");
      }

      onAuthenticateSuccess(assertion.id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Authentication failed";
      setError(errorMessage);
      onError?.(new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  }, [userId, rpId, onAuthenticateSuccess, onError]);

  // Get device name for display
  const getDeviceName = (): string => {
    const ua = navigator.userAgent;
    if (/iPhone/.test(ua)) return "iPhone";
    if (/iPad/.test(ua)) return "iPad";
    if (/Mac/.test(ua)) return "Mac";
    if (/Android/.test(ua)) return "Android Device";
    if (/Windows/.test(ua)) return "Windows PC";
    return "Unknown Device";
  };

  // Get biometric type label
  const getBiometricLabel = (): string => {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|Mac/.test(ua)) {
      return /iPhone|iPad/.test(ua) ? "Face ID / Touch ID" : "Touch ID";
    }
    if (/Android/.test(ua)) return "Fingerprint / Face Unlock";
    if (/Windows/.test(ua)) return "Windows Hello";
    return "Biometric Authentication";
  };

  if (isSupported === null) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isSupported) {
    return (
      <div
        className={`flex flex-col items-center justify-center p-6 bg-slate-100 dark:bg-slate-800 rounded-lg ${className}`}
      >
        <svg
          className="w-12 h-12 text-slate-400 mb-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <p className="text-slate-600 dark:text-slate-300 text-center text-sm">
          Biometric authentication is not supported in this browser
        </p>
      </div>
    );
  }

  if (!isPlatformAvailable) {
    return (
      <div
        className={`flex flex-col items-center justify-center p-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg ${className}`}
      >
        <svg
          className="w-12 h-12 text-amber-500 mb-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <p className="text-amber-800 dark:text-amber-300 text-center text-sm">
          No platform authenticator available. Please ensure your device has biometrics enabled.
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Success message */}
      {isRegistered && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <p className="text-sm text-green-600 dark:text-green-400">
              Biometric authentication enabled successfully
            </p>
          </div>
        </div>
      )}

      {/* Biometric icon */}
      <div className="flex justify-center mb-4">
        <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
          <svg
            className="w-10 h-10 text-blue-600 dark:text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"
            />
          </svg>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white text-center mb-2">
        {getBiometricLabel()}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">
        {isRegistered
          ? "Use your biometrics to sign in securely"
          : "Set up biometric authentication for quick and secure access"}
      </p>

      {/* Action buttons */}
      <div className="space-y-3">
        {!isRegistered && (
          <button
            onClick={registerCredential}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Setting up...</span>
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"
                  />
                </svg>
                <span>Enable {getBiometricLabel()}</span>
              </>
            )}
          </button>
        )}

        {isRegistered && (
          <button
            onClick={authenticateCredential}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg transition-colors"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                <span>Sign in with {getBiometricLabel()}</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Security note */}
      <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-4">
        Your biometric data never leaves your device. Only a cryptographic key is stored.
      </p>
    </div>
  );
}
