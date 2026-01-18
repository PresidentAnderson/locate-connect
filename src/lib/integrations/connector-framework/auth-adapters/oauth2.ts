/**
 * OAuth2 Authentication Adapter
 * Handles OAuth2-based authentication for external services
 */

import type { DecryptedCredential, CredentialData } from '@/types';

export interface OAuth2Config {
  tokenUrl: string;
  authorizationUrl?: string;
  scope?: string;
  grantType: 'client_credentials' | 'authorization_code' | 'refresh_token';
  tokenRefreshBuffer?: number; // ms before expiry to refresh
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

const DEFAULT_CONFIG: Partial<OAuth2Config> = {
  grantType: 'client_credentials',
  tokenRefreshBuffer: 60000, // 1 minute before expiry
};

/**
 * OAuth2 Authentication Adapter
 */
export class OAuth2AuthAdapter {
  private config: OAuth2Config;
  private clientId?: string;
  private clientSecret?: string;
  private accessToken?: string;
  private refreshToken?: string;
  private tokenExpiresAt?: Date;
  private onTokenRefresh?: (token: string, expiresAt?: Date) => Promise<void>;

  constructor(config: OAuth2Config) {
    this.config = { ...DEFAULT_CONFIG, ...config } as OAuth2Config;
  }

  /**
   * Configure the adapter with credentials
   */
  configure(credential: DecryptedCredential): void {
    if (credential.type !== 'oauth2') {
      throw new Error('Invalid credential type for OAuth2 adapter');
    }

    const data = credential.data;

    if (!data.clientId || !data.clientSecret) {
      throw new Error('Client ID and secret required for OAuth2');
    }

    this.clientId = data.clientId;
    this.clientSecret = data.clientSecret;

    // If we have existing tokens, use them
    if (data.accessToken) {
      this.accessToken = data.accessToken;
      if (data.tokenExpiresAt) {
        this.tokenExpiresAt = new Date(data.tokenExpiresAt);
      }
    }

    if (data.refreshToken) {
      this.refreshToken = data.refreshToken;
    }
  }

  /**
   * Set callback for token refresh
   */
  setTokenRefreshCallback(
    callback: (token: string, expiresAt?: Date) => Promise<void>
  ): void {
    this.onTokenRefresh = callback;
  }

  /**
   * Get auth headers with valid access token
   */
  async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getValidAccessToken();
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  /**
   * Get a valid access token, refreshing if necessary
   */
  async getValidAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && !this.isTokenExpiringSoon()) {
      return this.accessToken;
    }

    // Try to refresh using refresh token
    if (this.refreshToken) {
      try {
        await this.refreshAccessToken();
        return this.accessToken!;
      } catch (error) {
        console.warn('[OAuth2Adapter] Token refresh failed:', error);
        // Fall through to get new token
      }
    }

    // Get new token
    await this.fetchNewToken();
    return this.accessToken!;
  }

  /**
   * Fetch a new access token using client credentials
   */
  async fetchNewToken(): Promise<void> {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('OAuth2 adapter not configured');
    }

    const params = new URLSearchParams({
      grant_type: this.config.grantType,
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    if (this.config.scope) {
      params.set('scope', this.config.scope);
    }

    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OAuth2 token request failed: ${error}`);
    }

    const data: TokenResponse = await response.json();
    this.updateToken(data);
  }

  /**
   * Refresh the access token using the refresh token
   */
  async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken,
      client_id: this.clientId!,
      client_secret: this.clientSecret!,
    });

    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OAuth2 token refresh failed: ${error}`);
    }

    const data: TokenResponse = await response.json();
    this.updateToken(data);
  }

  /**
   * Update stored token from response
   */
  private updateToken(data: TokenResponse): void {
    this.accessToken = data.access_token;

    if (data.refresh_token) {
      this.refreshToken = data.refresh_token;
    }

    if (data.expires_in) {
      this.tokenExpiresAt = new Date(Date.now() + data.expires_in * 1000);
    } else {
      this.tokenExpiresAt = undefined;
    }

    // Notify callback if set
    if (this.onTokenRefresh) {
      this.onTokenRefresh(this.accessToken, this.tokenExpiresAt);
    }
  }

  /**
   * Check if token is expiring soon
   */
  private isTokenExpiringSoon(): boolean {
    if (!this.tokenExpiresAt) {
      return false;
    }
    const buffer = this.config.tokenRefreshBuffer || 60000;
    return Date.now() >= this.tokenExpiresAt.getTime() - buffer;
  }

  /**
   * Apply authentication to a fetch request
   */
  async applyToRequest(
    url: string,
    init: RequestInit = {}
  ): Promise<{ url: string; init: RequestInit }> {
    const authHeaders = await this.getAuthHeaders();
    const headers = new Headers(init.headers);

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
    return !!(this.clientId && this.clientSecret);
  }

  /**
   * Check if we have a valid token
   */
  hasValidToken(): boolean {
    return !!(this.accessToken && !this.isTokenExpiringSoon());
  }

  /**
   * Get current token data for persistence
   */
  getTokenData(): Partial<CredentialData> {
    return {
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
      tokenExpiresAt: this.tokenExpiresAt?.toISOString(),
    };
  }

  /**
   * Clear stored tokens
   */
  clear(): void {
    this.accessToken = undefined;
    this.refreshToken = undefined;
    this.tokenExpiresAt = undefined;
  }
}

/**
 * Create an OAuth2 auth adapter
 */
export function createOAuth2Adapter(config: OAuth2Config): OAuth2AuthAdapter {
  return new OAuth2AuthAdapter(config);
}
