/**
 * Base Social Media Adapter
 * Abstract base class for platform-specific social media API adapters
 */

import type {
  SocialMediaPlatform,
  SocialActivityType,
  SocialMediaActivityEvent,
} from '@/types/social-monitoring.types';

// =============================================================================
// TYPES
// =============================================================================

export interface PlatformCredentials {
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
}

export interface AdapterConfig {
  platform: SocialMediaPlatform;
  credentials?: PlatformCredentials;
  rateLimit: RateLimitConfig;
  retryConfig: RetryConfig;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export interface ProfileData {
  username: string;
  displayName?: string;
  profileUrl?: string;
  profilePhotoUrl?: string;
  bio?: string;
  followerCount?: number;
  followingCount?: number;
  isPrivate?: boolean;
  isVerified?: boolean;
  lastActivityAt?: string;
}

export interface ActivityCheckResult {
  activities: PlatformActivity[];
  lastCheckedAt: string;
  hasMore: boolean;
  nextCursor?: string;
}

export interface PlatformActivity {
  platformPostId: string;
  activityType: SocialActivityType;
  activityTimestamp: string;
  contentPreview?: string;
  contentUrl?: string;
  mediaType?: string;
  mediaUrl?: string;
  location?: {
    name?: string;
    latitude?: number;
    longitude?: number;
  };
  engagement?: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
  };
  rawData?: Record<string, unknown>;
}

export interface AdapterError extends Error {
  code: AdapterErrorCode;
  isRetryable: boolean;
  platform: SocialMediaPlatform;
  details?: Record<string, unknown>;
}

export type AdapterErrorCode =
  | 'AUTHENTICATION_FAILED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'ACCOUNT_NOT_FOUND'
  | 'ACCOUNT_PRIVATE'
  | 'API_ERROR'
  | 'NETWORK_ERROR'
  | 'INVALID_CREDENTIALS'
  | 'TOKEN_EXPIRED'
  | 'PERMISSION_DENIED';

// =============================================================================
// BASE ADAPTER CLASS
// =============================================================================

export abstract class SocialMediaAdapter {
  protected config: AdapterConfig;
  protected requestCount: { minute: number; hour: number; day: number } = {
    minute: 0,
    hour: 0,
    day: 0,
  };
  protected lastRequestTime = 0;
  protected isAuthenticated = false;

  constructor(config: AdapterConfig) {
    this.config = config;
  }

  get platform(): SocialMediaPlatform {
    return this.config.platform;
  }

  /**
   * Authenticate with the platform API
   * Must be called before making any API requests
   */
  abstract authenticate(): Promise<boolean>;

  /**
   * Check recent activity for a username
   */
  abstract checkActivity(
    username: string,
    since?: string
  ): Promise<ActivityCheckResult>;

  /**
   * Get profile information for a username
   */
  abstract getProfile(username: string): Promise<ProfileData | null>;

  /**
   * Validate that credentials are still valid
   */
  abstract validateCredentials(): Promise<boolean>;

  /**
   * Refresh authentication tokens if needed
   */
  abstract refreshTokens(): Promise<boolean>;

  /**
   * Check if rate limit allows another request
   */
  protected canMakeRequest(): boolean {
    const now = Date.now();
    const { requestsPerMinute, requestsPerHour, requestsPerDay } = this.config.rateLimit;

    // Reset counters if time windows have passed
    if (now - this.lastRequestTime > 60000) {
      this.requestCount.minute = 0;
    }
    if (now - this.lastRequestTime > 3600000) {
      this.requestCount.hour = 0;
    }
    if (now - this.lastRequestTime > 86400000) {
      this.requestCount.day = 0;
    }

    return (
      this.requestCount.minute < requestsPerMinute &&
      this.requestCount.hour < requestsPerHour &&
      this.requestCount.day < requestsPerDay
    );
  }

  /**
   * Record that a request was made (for rate limiting)
   */
  protected recordRequest(): void {
    this.requestCount.minute++;
    this.requestCount.hour++;
    this.requestCount.day++;
    this.lastRequestTime = Date.now();
  }

  /**
   * Wait until rate limit allows another request
   */
  protected async waitForRateLimit(): Promise<void> {
    if (this.canMakeRequest()) return;

    // Calculate wait time based on which limit is hit
    const { requestsPerMinute } = this.config.rateLimit;
    const waitTime = Math.max(
      60000 / requestsPerMinute, // Minimum wait to respect rate limit
      1000 // Minimum 1 second
    );

    await this.sleep(waitTime);
  }

  /**
   * Execute a request with retry logic
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    const { maxRetries, baseDelayMs, maxDelayMs } = this.config.retryConfig;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await this.waitForRateLimit();
        this.recordRequest();
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if error is retryable
        const isRetryable = this.isRetryableError(error);
        if (!isRetryable || attempt === maxRetries) {
          throw this.wrapError(lastError, operationName);
        }

        // Calculate exponential backoff delay
        const delay = Math.min(
          baseDelayMs * Math.pow(2, attempt),
          maxDelayMs
        );

        console.log(
          `[${this.platform}Adapter] ${operationName} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms`
        );

        await this.sleep(delay);
      }
    }

    throw this.wrapError(lastError || new Error('Max retries exceeded'), operationName);
  }

  /**
   * Check if an error is retryable
   */
  protected isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      const isAdapterError = (error as AdapterError).code !== undefined;

      if (isAdapterError) {
        const adapterError = error as AdapterError;
        return adapterError.isRetryable;
      }

      // Network and timeout errors are retryable
      return (
        message.includes('network') ||
        message.includes('timeout') ||
        message.includes('econnreset') ||
        message.includes('rate limit') ||
        message.includes('too many requests')
      );
    }
    return false;
  }

  /**
   * Wrap an error with adapter context
   */
  protected wrapError(error: Error, operation: string): AdapterError {
    const adapterError = error as AdapterError;
    adapterError.platform = this.config.platform;
    adapterError.code = adapterError.code || 'API_ERROR';
    adapterError.isRetryable = this.isRetryableError(error);
    adapterError.message = `[${this.platform}] ${operation}: ${error.message}`;
    return adapterError;
  }

  /**
   * Create a typed adapter error
   */
  protected createError(
    code: AdapterErrorCode,
    message: string,
    isRetryable = false,
    details?: Record<string, unknown>
  ): AdapterError {
    const error = new Error(message) as AdapterError;
    error.code = code;
    error.isRetryable = isRetryable;
    error.platform = this.config.platform;
    error.details = details;
    return error;
  }

  /**
   * Sleep utility
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Convert platform activity to activity event format
   */
  toActivityEvent(
    activity: PlatformActivity,
    accountId: string,
    caseId: string
  ): Omit<SocialMediaActivityEvent, 'id' | 'created_at'> {
    return {
      monitored_account_id: accountId,
      case_id: caseId,
      activity_type: activity.activityType,
      activity_timestamp: activity.activityTimestamp,
      content_preview: activity.contentPreview,
      content_url: activity.contentUrl,
      media_type: activity.mediaType,
      media_url: activity.mediaUrl,
      location_name: activity.location?.name,
      location_latitude: activity.location?.latitude,
      location_longitude: activity.location?.longitude,
      engagement_likes: activity.engagement?.likes ?? 0,
      engagement_comments: activity.engagement?.comments ?? 0,
      engagement_shares: activity.engagement?.shares ?? 0,
      engagement_views: activity.engagement?.views ?? 0,
      raw_data: activity.rawData,
      is_processed: false,
      alert_sent: false,
    };
  }
}

// Default rate limit configs per platform
export const DEFAULT_RATE_LIMITS: Record<SocialMediaPlatform, RateLimitConfig> = {
  facebook: { requestsPerMinute: 30, requestsPerHour: 200, requestsPerDay: 1000 },
  instagram: { requestsPerMinute: 30, requestsPerHour: 200, requestsPerDay: 1000 },
  twitter: { requestsPerMinute: 15, requestsPerHour: 180, requestsPerDay: 500 },
  tiktok: { requestsPerMinute: 20, requestsPerHour: 150, requestsPerDay: 800 },
  linkedin: { requestsPerMinute: 10, requestsPerHour: 100, requestsPerDay: 500 },
  other: { requestsPerMinute: 10, requestsPerHour: 60, requestsPerDay: 300 },
};

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};
