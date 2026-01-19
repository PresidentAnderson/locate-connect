/**
 * Social Media Adapter Factory and Registry
 * Manages adapter instances and provides factory functions for creating adapters
 */

import type { SocialMediaPlatform } from '@/types/social-monitoring.types';
import {
  SocialMediaAdapter,
  type AdapterConfig,
  type PlatformCredentials,
  DEFAULT_RATE_LIMITS,
  DEFAULT_RETRY_CONFIG,
} from './base-adapter';
import { MockSocialMediaAdapter, createActiveUserScenario } from './mock-adapter';

// Re-export types and classes for convenience
export * from './base-adapter';
export * from './mock-adapter';

// =============================================================================
// TYPES
// =============================================================================

export type AdapterFactoryFn = (credentials?: PlatformCredentials) => SocialMediaAdapter;

interface RegistryEntry {
  factory: AdapterFactoryFn;
  isAvailable: boolean;
  requiresCredentials: boolean;
}

// =============================================================================
// ADAPTER REGISTRY
// =============================================================================

class AdapterRegistry {
  private adapters: Map<SocialMediaPlatform, RegistryEntry> = new Map();
  private instances: Map<string, SocialMediaAdapter> = new Map();
  private useMockAdapters = false;

  constructor() {
    this.registerDefaults();
  }

  /**
   * Register default adapters
   */
  private registerDefaults(): void {
    // Register mock adapter as fallback for all platforms
    const mockFactory: AdapterFactoryFn = (credentials) =>
      new MockSocialMediaAdapter({ credentials });

    // Register platforms - in development, all use mock adapter
    // Future: Replace with real platform adapters when implemented
    const platforms: SocialMediaPlatform[] = [
      'facebook',
      'instagram',
      'twitter',
      'tiktok',
      'linkedin',
      'other',
    ];

    for (const platform of platforms) {
      this.adapters.set(platform, {
        factory: (credentials) =>
          new MockSocialMediaAdapter({
            platform,
            credentials,
            rateLimit: DEFAULT_RATE_LIMITS[platform],
            retryConfig: DEFAULT_RETRY_CONFIG,
          }),
        isAvailable: true,
        requiresCredentials: platform !== 'other',
      });
    }
  }

  /**
   * Register a custom adapter factory for a platform
   */
  register(
    platform: SocialMediaPlatform,
    factory: AdapterFactoryFn,
    options: { isAvailable?: boolean; requiresCredentials?: boolean } = {}
  ): void {
    this.adapters.set(platform, {
      factory,
      isAvailable: options.isAvailable ?? true,
      requiresCredentials: options.requiresCredentials ?? true,
    });
  }

  /**
   * Get or create an adapter for a platform
   */
  getAdapter(
    platform: SocialMediaPlatform,
    credentials?: PlatformCredentials
  ): SocialMediaAdapter | null {
    // Check if we should use mock adapters (development/testing)
    if (this.useMockAdapters) {
      return this.createMockAdapter(platform, credentials);
    }

    const entry = this.adapters.get(platform);
    if (!entry || !entry.isAvailable) {
      console.warn(`[AdapterRegistry] No adapter available for platform: ${platform}`);
      return null;
    }

    // Check if credentials are required but not provided
    if (entry.requiresCredentials && !credentials) {
      console.warn(`[AdapterRegistry] Credentials required for platform: ${platform}`);
      return null;
    }

    // Create instance key for caching
    const instanceKey = `${platform}-${credentials?.accessToken || 'default'}`;

    // Return cached instance if available
    if (this.instances.has(instanceKey)) {
      return this.instances.get(instanceKey)!;
    }

    // Create new instance
    const adapter = entry.factory(credentials);
    this.instances.set(instanceKey, adapter);

    return adapter;
  }

  /**
   * Create a mock adapter for testing
   */
  createMockAdapter(
    platform: SocialMediaPlatform,
    credentials?: PlatformCredentials
  ): MockSocialMediaAdapter {
    return new MockSocialMediaAdapter({
      platform,
      credentials,
      rateLimit: DEFAULT_RATE_LIMITS[platform],
      retryConfig: DEFAULT_RETRY_CONFIG,
    });
  }

  /**
   * Enable mock mode for all adapters (for testing/development)
   */
  enableMockMode(enabled = true): void {
    this.useMockAdapters = enabled;
    if (enabled) {
      console.log('[AdapterRegistry] Mock mode enabled - all adapters will return mock data');
    }
  }

  /**
   * Check if a platform adapter is available
   */
  isAvailable(platform: SocialMediaPlatform): boolean {
    const entry = this.adapters.get(platform);
    return entry?.isAvailable ?? false;
  }

  /**
   * Get list of available platforms
   */
  getAvailablePlatforms(): SocialMediaPlatform[] {
    return Array.from(this.adapters.entries())
      .filter(([, entry]) => entry.isAvailable)
      .map(([platform]) => platform);
  }

  /**
   * Clear cached adapter instances
   */
  clearCache(): void {
    this.instances.clear();
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const adapterRegistry = new AdapterRegistry();

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Get an adapter for a platform
 */
export function getAdapter(
  platform: SocialMediaPlatform,
  credentials?: PlatformCredentials
): SocialMediaAdapter | null {
  return adapterRegistry.getAdapter(platform, credentials);
}

/**
 * Create a mock adapter with a specific scenario
 */
export function createMockAdapterWithScenario(
  platform: SocialMediaPlatform,
  scenarioType: 'active' | 'high-priority' | 'private' | 'not-found',
  username: string
): MockSocialMediaAdapter {
  const adapter = new MockSocialMediaAdapter({
    platform,
    rateLimit: DEFAULT_RATE_LIMITS[platform],
    retryConfig: DEFAULT_RETRY_CONFIG,
  });

  // Import scenario creators dynamically to avoid circular imports
  switch (scenarioType) {
    case 'active':
      adapter.setScenario(createActiveUserScenario(username));
      break;
    // Add other scenarios as needed
  }

  return adapter;
}

/**
 * Check if credentials are valid for a platform
 */
export async function validatePlatformCredentials(
  platform: SocialMediaPlatform,
  credentials: PlatformCredentials
): Promise<boolean> {
  const adapter = adapterRegistry.getAdapter(platform, credentials);
  if (!adapter) return false;

  try {
    return await adapter.validateCredentials();
  } catch {
    return false;
  }
}

// =============================================================================
// CREDENTIAL RETRIEVAL (INTEGRATION WITH VAULT)
// =============================================================================

/**
 * Retrieve platform credentials from vault
 * This integrates with the vault service for secure credential storage
 */
export async function getCredentialsFromVault(
  platform: SocialMediaPlatform,
  accountId: string
): Promise<PlatformCredentials | null> {
  // In production, this would integrate with VaultService
  // For now, return null to indicate no credentials available
  // The system will fall back to mock adapters in development
  console.log(
    `[AdapterRegistry] Credential retrieval for ${platform}/${accountId} - using mock mode`
  );
  return null;
}

// =============================================================================
// DEVELOPMENT HELPERS
// =============================================================================

/**
 * Initialize adapters for development/testing
 * Enables mock mode by default when NODE_ENV is not production
 */
export function initializeAdapters(): void {
  const isDevelopment = process.env.NODE_ENV !== 'production';

  if (isDevelopment) {
    adapterRegistry.enableMockMode(true);
    console.log('[AdapterRegistry] Development mode - using mock adapters');
  }
}

// Auto-initialize in non-production environments
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
  initializeAdapters();
}
