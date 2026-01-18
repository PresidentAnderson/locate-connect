/**
 * Basic Authentication Adapter
 * Handles HTTP Basic authentication for external services
 */

import type { DecryptedCredential } from '@/types';

/**
 * Basic Authentication Adapter
 */
export class BasicAuthAdapter {
  private username?: string;
  private password?: string;
  private encodedCredentials?: string;

  /**
   * Configure the adapter with credentials
   */
  configure(credential: DecryptedCredential): void {
    if (credential.type !== 'basic') {
      throw new Error('Invalid credential type for Basic auth adapter');
    }

    if (!credential.data.username || !credential.data.password) {
      throw new Error('Username and password required for Basic auth');
    }

    this.username = credential.data.username;
    this.password = credential.data.password;

    // Pre-encode credentials
    this.encodedCredentials = Buffer.from(
      `${this.username}:${this.password}`
    ).toString('base64');
  }

  /**
   * Configure with raw username/password
   */
  configureRaw(username: string, password: string): void {
    this.username = username;
    this.password = password;
    this.encodedCredentials = Buffer.from(`${username}:${password}`).toString(
      'base64'
    );
  }

  /**
   * Get auth headers
   */
  getAuthHeaders(): Record<string, string> {
    if (!this.encodedCredentials) {
      throw new Error('Basic auth adapter not configured');
    }

    return {
      Authorization: `Basic ${this.encodedCredentials}`,
    };
  }

  /**
   * Apply authentication to a fetch request
   */
  applyToRequest(
    url: string,
    init: RequestInit = {}
  ): { url: string; init: RequestInit } {
    const headers = new Headers(init.headers);
    const authHeaders = this.getAuthHeaders();

    for (const [key, value] of Object.entries(authHeaders)) {
      headers.set(key, value);
    }

    return {
      url,
      init: {
        ...init,
        headers,
      },
    };
  }

  /**
   * Check if adapter is configured
   */
  isConfigured(): boolean {
    return !!this.encodedCredentials;
  }

  /**
   * Clear stored credentials
   */
  clear(): void {
    this.username = undefined;
    this.password = undefined;
    this.encodedCredentials = undefined;
  }
}

/**
 * Create a Basic auth adapter
 */
export function createBasicAuthAdapter(): BasicAuthAdapter {
  return new BasicAuthAdapter();
}
