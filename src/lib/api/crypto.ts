/**
 * Cryptographic utilities for API authentication
 */

import { createHash, randomBytes } from 'crypto';

/**
 * Generate a secure random API key
 * Format: lc_{access_level}_{random_bytes}
 */
export function generateApiKey(accessLevel: 'pub' | 'ptn' | 'le' = 'pub'): string {
  const randomPart = randomBytes(32).toString('base64url');
  return `lc_${accessLevel}_${randomPart}`;
}

/**
 * Extract the prefix from an API key (first 8 characters after prefix)
 */
export function getApiKeyPrefix(key: string): string {
  // Skip the "lc_xxx_" prefix (7 chars) and take next 8
  return key.substring(7, 15);
}

/**
 * Hash an API key for storage
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Generate a secure OAuth client ID
 */
export function generateClientId(): string {
  return `lc_client_${randomBytes(16).toString('hex')}`;
}

/**
 * Generate a secure OAuth client secret
 */
export function generateClientSecret(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Generate a secure OAuth authorization code
 */
export function generateAuthorizationCode(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Generate a secure access token
 */
export function generateAccessToken(): string {
  return randomBytes(48).toString('base64url');
}

/**
 * Generate a secure refresh token
 */
export function generateRefreshToken(): string {
  return randomBytes(48).toString('base64url');
}

/**
 * Generate a webhook secret for signature verification
 */
export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(32).toString('base64url')}`;
}

/**
 * Verify a PKCE code verifier against a code challenge
 */
export function verifyCodeChallenge(
  codeVerifier: string,
  codeChallenge: string,
  method: 'S256' | 'plain' = 'S256'
): boolean {
  if (method === 'plain') {
    return codeVerifier === codeChallenge;
  }

  // S256 method
  const computed = createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  return computed === codeChallenge;
}

/**
 * Generate HMAC signature for webhook payloads
 */
export function generateWebhookSignature(
  payload: string,
  secret: string,
  timestamp: number
): string {
  const signedPayload = `${timestamp}.${payload}`;
  const signature = createHash('sha256')
    .update(signedPayload + secret)
    .digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  toleranceSeconds: number = 300
): boolean {
  const parts = signature.split(',');
  const timestampPart = parts.find(p => p.startsWith('t='));
  const signaturePart = parts.find(p => p.startsWith('v1='));

  if (!timestampPart || !signaturePart) {
    return false;
  }

  const timestamp = parseInt(timestampPart.substring(2), 10);
  const receivedSignature = signaturePart.substring(3);

  // Check timestamp tolerance
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > toleranceSeconds) {
    return false;
  }

  // Verify signature
  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = createHash('sha256')
    .update(signedPayload + secret)
    .digest('hex');

  return receivedSignature === expectedSignature;
}
