/**
 * Authentication Adapters
 * Provides adapters for different authentication mechanisms
 */

export {
  ApiKeyAuthAdapter,
  createApiKeyAdapter,
  type ApiKeyConfig,
} from './api-key';

export {
  OAuth2AuthAdapter,
  createOAuth2Adapter,
  type OAuth2Config,
  type TokenResponse,
} from './oauth2';

export {
  BasicAuthAdapter,
  createBasicAuthAdapter,
} from './basic';

import type { DecryptedCredential, AuthenticationType } from '@/types';
import { ApiKeyAuthAdapter } from './api-key';
import { OAuth2AuthAdapter, type OAuth2Config } from './oauth2';
import { BasicAuthAdapter } from './basic';

/**
 * Authentication Adapter Interface
 */
export interface AuthAdapter {
  configure(credential: DecryptedCredential): void;
  getAuthHeaders(): Record<string, string> | Promise<Record<string, string>>;
  applyToRequest(
    url: string,
    init: RequestInit
  ): { url: string; init: RequestInit } | Promise<{ url: string; init: RequestInit }>;
  isConfigured(): boolean;
  clear(): void;
}

/**
 * Create an auth adapter based on authentication type
 */
export function createAuthAdapter(
  type: AuthenticationType,
  config?: Record<string, unknown>
): AuthAdapter {
  switch (type) {
    case 'api_key':
      return new ApiKeyAuthAdapter(config);
    case 'oauth2':
      if (!config?.tokenUrl) {
        throw new Error('OAuth2 requires tokenUrl in config');
      }
      return new OAuth2AuthAdapter(config as unknown as OAuth2Config);
    case 'basic':
      return new BasicAuthAdapter();
    case 'bearer':
      // Bearer is similar to API key but with "Bearer" prefix
      return new ApiKeyAuthAdapter({
        headerName: 'Authorization',
        prefix: 'Bearer',
        location: 'header',
      });
    default:
      throw new Error(`Unsupported authentication type: ${type}`);
  }
}
