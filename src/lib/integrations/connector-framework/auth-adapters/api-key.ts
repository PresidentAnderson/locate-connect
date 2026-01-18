/**
 * API Key Authentication Adapter
 * Handles API key-based authentication for external services
 */

import type { DecryptedCredential } from '@/types';

export interface ApiKeyConfig {
  headerName?: string;
  queryParamName?: string;
  prefix?: string;
  location: 'header' | 'query' | 'both';
}

const DEFAULT_CONFIG: ApiKeyConfig = {
  headerName: 'X-API-Key',
  queryParamName: 'api_key',
  location: 'header',
};

/**
 * API Key Authentication Adapter
 */
export class ApiKeyAuthAdapter {
  private config: ApiKeyConfig;
  private apiKey?: string;

  constructor(config: Partial<ApiKeyConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Configure the adapter with credentials
   */
  configure(credential: DecryptedCredential): void {
    if (credential.type !== 'api_key') {
      throw new Error('Invalid credential type for API key adapter');
    }

    if (!credential.data.apiKey) {
      throw new Error('API key not found in credential');
    }

    this.apiKey = credential.data.apiKey;
  }

  /**
   * Get auth headers to add to requests
   */
  getAuthHeaders(): Record<string, string> {
    if (!this.apiKey) {
      throw new Error('API key adapter not configured');
    }

    if (this.config.location === 'query') {
      return {};
    }

    const value = this.config.prefix
      ? `${this.config.prefix} ${this.apiKey}`
      : this.apiKey;

    return {
      [this.config.headerName!]: value,
    };
  }

  /**
   * Get auth query parameters to add to requests
   */
  getAuthQueryParams(): Record<string, string> {
    if (!this.apiKey) {
      throw new Error('API key adapter not configured');
    }

    if (this.config.location === 'header') {
      return {};
    }

    return {
      [this.config.queryParamName!]: this.apiKey,
    };
  }

  /**
   * Apply authentication to a fetch request
   */
  applyToRequest(url: string, init: RequestInit = {}): { url: string; init: RequestInit } {
    const headers = new Headers(init.headers);
    const authHeaders = this.getAuthHeaders();

    for (const [key, value] of Object.entries(authHeaders)) {
      headers.set(key, value);
    }

    const queryParams = this.getAuthQueryParams();
    let finalUrl = url;

    if (Object.keys(queryParams).length > 0) {
      const urlObj = new URL(url);
      for (const [key, value] of Object.entries(queryParams)) {
        urlObj.searchParams.set(key, value);
      }
      finalUrl = urlObj.toString();
    }

    return {
      url: finalUrl,
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
    return !!this.apiKey;
  }

  /**
   * Clear the stored API key
   */
  clear(): void {
    this.apiKey = undefined;
  }
}

/**
 * Create an API key auth adapter
 */
export function createApiKeyAdapter(config?: Partial<ApiKeyConfig>): ApiKeyAuthAdapter {
  return new ApiKeyAuthAdapter(config);
}
