/**
 * Mock Social Media Adapter
 * For testing and development - simulates platform API responses
 */

import type { SocialActivityType } from '@/types/social-monitoring.types';
import {
  SocialMediaAdapter,
  type AdapterConfig,
  type ProfileData,
  type ActivityCheckResult,
  type PlatformActivity,
  DEFAULT_RATE_LIMITS,
  DEFAULT_RETRY_CONFIG,
} from './base-adapter';

// =============================================================================
// MOCK CONFIGURATION TYPES
// =============================================================================

export interface MockScenario {
  name: string;
  profiles: Map<string, MockProfile>;
  activities: Map<string, MockActivitySet>;
}

export interface MockProfile extends ProfileData {
  exists: boolean;
  throwError?: string;
}

export interface MockActivitySet {
  activities: PlatformActivity[];
  generateRandom?: boolean;
  randomConfig?: RandomActivityConfig;
}

export interface RandomActivityConfig {
  minActivities: number;
  maxActivities: number;
  activityTypes: SocialActivityType[];
  includeLocation: boolean;
  locationProbability: number;
}

// =============================================================================
// MOCK ADAPTER CLASS
// =============================================================================

export class MockSocialMediaAdapter extends SocialMediaAdapter {
  private scenario: MockScenario;
  private simulateLatency: boolean;
  private minLatencyMs: number;
  private maxLatencyMs: number;
  private failureRate: number;

  constructor(
    config: Partial<AdapterConfig> = {},
    options: {
      scenario?: MockScenario;
      simulateLatency?: boolean;
      minLatencyMs?: number;
      maxLatencyMs?: number;
      failureRate?: number;
    } = {}
  ) {
    super({
      platform: config.platform || 'other',
      rateLimit: config.rateLimit || DEFAULT_RATE_LIMITS.other,
      retryConfig: config.retryConfig || DEFAULT_RETRY_CONFIG,
      credentials: config.credentials,
    });

    this.scenario = options.scenario || this.createDefaultScenario();
    this.simulateLatency = options.simulateLatency ?? true;
    this.minLatencyMs = options.minLatencyMs ?? 100;
    this.maxLatencyMs = options.maxLatencyMs ?? 500;
    this.failureRate = options.failureRate ?? 0;
    this.isAuthenticated = true;
  }

  /**
   * Authenticate (always succeeds for mock)
   */
  async authenticate(): Promise<boolean> {
    await this.simulateDelay();
    this.isAuthenticated = true;
    return true;
  }

  /**
   * Check activity for a username
   */
  async checkActivity(
    username: string,
    since?: string
  ): Promise<ActivityCheckResult> {
    return this.withRetry(async () => {
      await this.simulateDelay();
      this.maybeThrowRandomError();

      const activitySet = this.scenario.activities.get(username);
      let activities: PlatformActivity[] = [];

      if (activitySet?.generateRandom && activitySet.randomConfig) {
        activities = this.generateRandomActivities(activitySet.randomConfig);
      } else if (activitySet?.activities) {
        activities = activitySet.activities;
      }

      // Filter by since date if provided
      if (since) {
        const sinceDate = new Date(since).getTime();
        activities = activities.filter(
          (a) => new Date(a.activityTimestamp).getTime() > sinceDate
        );
      }

      return {
        activities,
        lastCheckedAt: new Date().toISOString(),
        hasMore: false,
      };
    }, 'checkActivity');
  }

  /**
   * Get profile information for a username
   */
  async getProfile(username: string): Promise<ProfileData | null> {
    return this.withRetry(async () => {
      await this.simulateDelay();
      this.maybeThrowRandomError();

      const profile = this.scenario.profiles.get(username);

      if (profile?.throwError) {
        throw this.createError('API_ERROR', profile.throwError);
      }

      if (!profile || !profile.exists) {
        return null;
      }

      return {
        username: profile.username,
        displayName: profile.displayName,
        profileUrl: profile.profileUrl,
        profilePhotoUrl: profile.profilePhotoUrl,
        bio: profile.bio,
        followerCount: profile.followerCount,
        followingCount: profile.followingCount,
        isPrivate: profile.isPrivate,
        isVerified: profile.isVerified,
        lastActivityAt: profile.lastActivityAt,
      };
    }, 'getProfile');
  }

  /**
   * Validate credentials (always valid for mock)
   */
  async validateCredentials(): Promise<boolean> {
    await this.simulateDelay();
    return true;
  }

  /**
   * Refresh tokens (no-op for mock)
   */
  async refreshTokens(): Promise<boolean> {
    await this.simulateDelay();
    return true;
  }

  // =============================================================================
  // SCENARIO CONFIGURATION
  // =============================================================================

  /**
   * Set the current scenario
   */
  setScenario(scenario: MockScenario): void {
    this.scenario = scenario;
  }

  /**
   * Add a profile to the current scenario
   */
  addProfile(username: string, profile: MockProfile): void {
    this.scenario.profiles.set(username, profile);
  }

  /**
   * Add activities for a username
   */
  addActivities(username: string, activities: PlatformActivity[]): void {
    this.scenario.activities.set(username, { activities });
  }

  /**
   * Configure random activity generation for a username
   */
  setRandomActivityConfig(username: string, config: RandomActivityConfig): void {
    this.scenario.activities.set(username, {
      activities: [],
      generateRandom: true,
      randomConfig: config,
    });
  }

  /**
   * Set failure rate (0-1)
   */
  setFailureRate(rate: number): void {
    this.failureRate = Math.max(0, Math.min(1, rate));
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  /**
   * Create default scenario with sample data
   */
  private createDefaultScenario(): MockScenario {
    return {
      name: 'default',
      profiles: new Map(),
      activities: new Map(),
    };
  }

  /**
   * Simulate network latency
   */
  private async simulateDelay(): Promise<void> {
    if (!this.simulateLatency) return;

    const delay =
      this.minLatencyMs +
      Math.random() * (this.maxLatencyMs - this.minLatencyMs);
    await this.sleep(delay);
  }

  /**
   * Maybe throw a random error based on failure rate
   */
  private maybeThrowRandomError(): void {
    if (Math.random() < this.failureRate) {
      const errors = [
        { code: 'NETWORK_ERROR' as const, message: 'Simulated network error' },
        { code: 'RATE_LIMIT_EXCEEDED' as const, message: 'Simulated rate limit' },
        { code: 'API_ERROR' as const, message: 'Simulated API error' },
      ];
      const error = errors[Math.floor(Math.random() * errors.length)];
      throw this.createError(error.code, error.message, true);
    }
  }

  /**
   * Generate random activities based on config
   */
  private generateRandomActivities(config: RandomActivityConfig): PlatformActivity[] {
    const count =
      config.minActivities +
      Math.floor(Math.random() * (config.maxActivities - config.minActivities + 1));

    const activities: PlatformActivity[] = [];

    for (let i = 0; i < count; i++) {
      const activityType =
        config.activityTypes[Math.floor(Math.random() * config.activityTypes.length)];

      const activity: PlatformActivity = {
        platformPostId: `mock-${Date.now()}-${i}`,
        activityType,
        activityTimestamp: this.generateRandomTimestamp(),
        contentPreview: this.generateMockContent(activityType),
        engagement: {
          likes: Math.floor(Math.random() * 100),
          comments: Math.floor(Math.random() * 20),
          shares: Math.floor(Math.random() * 10),
          views: Math.floor(Math.random() * 1000),
        },
      };

      // Add location based on probability
      if (config.includeLocation && Math.random() < config.locationProbability) {
        activity.location = this.generateMockLocation();
      }

      activities.push(activity);
    }

    return activities;
  }

  /**
   * Generate a random timestamp within the last 24 hours
   */
  private generateRandomTimestamp(): string {
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const randomTime = dayAgo + Math.random() * (now - dayAgo);
    return new Date(randomTime).toISOString();
  }

  /**
   * Generate mock content based on activity type
   */
  private generateMockContent(activityType: SocialActivityType): string {
    const contentTemplates: Record<string, string[]> = {
      post: [
        'Just checked in at this place!',
        'Having a great time today',
        'Look at this view!',
        'Update: things are going well',
      ],
      story: [
        'Story update',
        'Quick update for everyone',
        'Behind the scenes',
      ],
      login: ['Logged in from new device'],
      location_tag: ['Tagged at a location'],
      profile_update: ['Updated profile information'],
      live_video: ['Started a live video'],
      reel: ['Posted a new reel'],
    };

    const templates = contentTemplates[activityType] || ['Activity detected'];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Generate a mock location
   */
  private generateMockLocation(): { name: string; latitude: number; longitude: number } {
    const locations = [
      { name: 'Downtown Coffee Shop', latitude: 40.7128, longitude: -74.006 },
      { name: 'Central Park', latitude: 40.7829, longitude: -73.9654 },
      { name: 'Local Mall', latitude: 40.758, longitude: -73.9855 },
      { name: 'Train Station', latitude: 40.7527, longitude: -73.9772 },
      { name: 'Restaurant', latitude: 40.7614, longitude: -73.9776 },
    ];
    return locations[Math.floor(Math.random() * locations.length)];
  }
}

// =============================================================================
// PRE-BUILT SCENARIOS
// =============================================================================

/**
 * Create a scenario with active social media activity
 */
export function createActiveUserScenario(username: string): MockScenario {
  const scenario: MockScenario = {
    name: 'active-user',
    profiles: new Map(),
    activities: new Map(),
  };

  scenario.profiles.set(username, {
    username,
    exists: true,
    displayName: 'Test User',
    followerCount: 500,
    followingCount: 300,
    isPrivate: false,
    lastActivityAt: new Date().toISOString(),
  });

  scenario.activities.set(username, {
    activities: [],
    generateRandom: true,
    randomConfig: {
      minActivities: 2,
      maxActivities: 5,
      activityTypes: ['post', 'story', 'login', 'location_tag'],
      includeLocation: true,
      locationProbability: 0.4,
    },
  });

  return scenario;
}

/**
 * Create a scenario with high-priority activity (location detected)
 */
export function createHighPriorityScenario(username: string): MockScenario {
  const scenario: MockScenario = {
    name: 'high-priority',
    profiles: new Map(),
    activities: new Map(),
  };

  scenario.profiles.set(username, {
    username,
    exists: true,
    displayName: 'Person of Interest',
    isPrivate: false,
    lastActivityAt: new Date().toISOString(),
  });

  const activities: PlatformActivity[] = [
    {
      platformPostId: `hp-${Date.now()}-1`,
      activityType: 'login',
      activityTimestamp: new Date().toISOString(),
      contentPreview: 'Logged in from new location',
      location: {
        name: 'Unknown Location',
        latitude: 41.8781,
        longitude: -87.6298,
      },
    },
    {
      platformPostId: `hp-${Date.now()}-2`,
      activityType: 'post',
      activityTimestamp: new Date(Date.now() - 3600000).toISOString(),
      contentPreview: 'Check out where I am!',
      location: {
        name: 'Chicago Downtown',
        latitude: 41.8781,
        longitude: -87.6298,
      },
      engagement: { likes: 15, comments: 3, shares: 1, views: 200 },
    },
  ];

  scenario.activities.set(username, { activities });

  return scenario;
}

/**
 * Create a scenario for a private/inactive account
 */
export function createPrivateAccountScenario(username: string): MockScenario {
  const scenario: MockScenario = {
    name: 'private-account',
    profiles: new Map(),
    activities: new Map(),
  };

  scenario.profiles.set(username, {
    username,
    exists: true,
    displayName: 'Private User',
    isPrivate: true,
    followerCount: 100,
    followingCount: 50,
  });

  scenario.activities.set(username, { activities: [] });

  return scenario;
}

/**
 * Create a scenario where the account doesn't exist
 */
export function createNotFoundScenario(username: string): MockScenario {
  const scenario: MockScenario = {
    name: 'not-found',
    profiles: new Map(),
    activities: new Map(),
  };

  scenario.profiles.set(username, {
    username,
    exists: false,
  });

  return scenario;
}
