import { describe, it, expect, beforeEach } from 'vitest';
import {
  MockSocialMediaAdapter,
  createActiveUserScenario,
  createHighPriorityScenario,
  createPrivateAccountScenario,
  createNotFoundScenario,
} from './mock-adapter';
import {
  adapterRegistry,
  getAdapter,
  DEFAULT_RATE_LIMITS,
  DEFAULT_RETRY_CONFIG,
} from './index';
import type { SocialMediaPlatform } from '@/types/social-monitoring.types';

describe('Social Media Adapters', () => {
  describe('MockSocialMediaAdapter', () => {
    let adapter: MockSocialMediaAdapter;

    beforeEach(() => {
      adapter = new MockSocialMediaAdapter({
        platform: 'facebook',
        rateLimit: DEFAULT_RATE_LIMITS.facebook,
        retryConfig: DEFAULT_RETRY_CONFIG,
      }, {
        simulateLatency: false, // Disable latency for faster tests
      });
    });

    describe('authenticate', () => {
      it('should successfully authenticate', async () => {
        const result = await adapter.authenticate();
        expect(result).toBe(true);
      });
    });

    describe('validateCredentials', () => {
      it('should return true for valid credentials', async () => {
        const result = await adapter.validateCredentials();
        expect(result).toBe(true);
      });
    });

    describe('refreshTokens', () => {
      it('should successfully refresh tokens', async () => {
        const result = await adapter.refreshTokens();
        expect(result).toBe(true);
      });
    });

    describe('getProfile', () => {
      it('should return null for unknown username', async () => {
        const result = await adapter.getProfile('unknown_user');
        expect(result).toBeNull();
      });

      it('should return profile data for known username', async () => {
        const username = 'test_user';
        adapter.addProfile(username, {
          username,
          exists: true,
          displayName: 'Test User',
          followerCount: 500,
          isPrivate: false,
        });

        const result = await adapter.getProfile(username);
        expect(result).not.toBeNull();
        expect(result?.username).toBe(username);
        expect(result?.displayName).toBe('Test User');
        expect(result?.followerCount).toBe(500);
        expect(result?.isPrivate).toBe(false);
      });

      it('should return null for non-existent account', async () => {
        const username = 'deleted_user';
        adapter.addProfile(username, {
          username,
          exists: false,
        });

        const result = await adapter.getProfile(username);
        expect(result).toBeNull();
      });
    });

    describe('checkActivity', () => {
      it('should return empty activities for unknown username', async () => {
        const result = await adapter.checkActivity('unknown_user');
        expect(result.activities).toHaveLength(0);
        expect(result.hasMore).toBe(false);
      });

      it('should return activities for known username', async () => {
        const username = 'active_user';
        adapter.addActivities(username, [
          {
            platformPostId: 'post-1',
            activityType: 'post',
            activityTimestamp: new Date().toISOString(),
            contentPreview: 'Test post content',
          },
          {
            platformPostId: 'post-2',
            activityType: 'story',
            activityTimestamp: new Date().toISOString(),
            contentPreview: 'Test story content',
          },
        ]);

        const result = await adapter.checkActivity(username);
        expect(result.activities).toHaveLength(2);
        expect(result.activities[0].activityType).toBe('post');
        expect(result.activities[1].activityType).toBe('story');
      });

      it('should filter activities by since date', async () => {
        const username = 'active_user';
        const oldDate = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago
        const recentDate = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago

        adapter.addActivities(username, [
          {
            platformPostId: 'old-post',
            activityType: 'post',
            activityTimestamp: oldDate.toISOString(),
            contentPreview: 'Old post',
          },
          {
            platformPostId: 'recent-post',
            activityType: 'post',
            activityTimestamp: recentDate.toISOString(),
            contentPreview: 'Recent post',
          },
        ]);

        // Filter to get only posts from the last 24 hours
        const sinceDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const result = await adapter.checkActivity(username, sinceDate);

        expect(result.activities).toHaveLength(1);
        expect(result.activities[0].platformPostId).toBe('recent-post');
      });

      it('should generate random activities when configured', async () => {
        const username = 'random_user';
        adapter.setRandomActivityConfig(username, {
          minActivities: 2,
          maxActivities: 5,
          activityTypes: ['post', 'story'],
          includeLocation: true,
          locationProbability: 1.0, // Always include location
        });

        const result = await adapter.checkActivity(username);
        expect(result.activities.length).toBeGreaterThanOrEqual(2);
        expect(result.activities.length).toBeLessThanOrEqual(5);

        // All activities should have location since probability is 1.0
        result.activities.forEach((activity) => {
          expect(activity.location).toBeDefined();
        });
      });
    });

    describe('scenarios', () => {
      it('should handle active user scenario', async () => {
        const username = 'active_person';
        adapter.setScenario(createActiveUserScenario(username));

        const profile = await adapter.getProfile(username);
        expect(profile).not.toBeNull();
        expect(profile?.isPrivate).toBe(false);

        const activities = await adapter.checkActivity(username);
        expect(activities.activities.length).toBeGreaterThanOrEqual(2);
      });

      it('should handle high-priority scenario with location', async () => {
        const username = 'high_priority_person';
        adapter.setScenario(createHighPriorityScenario(username));

        const profile = await adapter.getProfile(username);
        expect(profile).not.toBeNull();

        const activities = await adapter.checkActivity(username);
        expect(activities.activities.length).toBeGreaterThan(0);

        // Should have activities with locations
        const activitiesWithLocation = activities.activities.filter((a) => a.location);
        expect(activitiesWithLocation.length).toBeGreaterThan(0);
      });

      it('should handle private account scenario', async () => {
        const username = 'private_person';
        adapter.setScenario(createPrivateAccountScenario(username));

        const profile = await adapter.getProfile(username);
        expect(profile).not.toBeNull();
        expect(profile?.isPrivate).toBe(true);

        const activities = await adapter.checkActivity(username);
        expect(activities.activities).toHaveLength(0);
      });

      it('should handle not found scenario', async () => {
        const username = 'nonexistent_person';
        adapter.setScenario(createNotFoundScenario(username));

        const profile = await adapter.getProfile(username);
        expect(profile).toBeNull();
      });
    });

    describe('error simulation', () => {
      it('should throw errors at configured failure rate', async () => {
        const failingAdapter = new MockSocialMediaAdapter(
          {
            platform: 'twitter',
            rateLimit: DEFAULT_RATE_LIMITS.twitter,
            retryConfig: { maxRetries: 0, baseDelayMs: 0, maxDelayMs: 0 },
          },
          {
            simulateLatency: false,
            failureRate: 1.0, // 100% failure rate
          }
        );

        await expect(failingAdapter.checkActivity('any_user')).rejects.toThrow();
      });

      it('should not throw errors when failure rate is 0', async () => {
        const reliableAdapter = new MockSocialMediaAdapter(
          {
            platform: 'instagram',
            rateLimit: DEFAULT_RATE_LIMITS.instagram,
            retryConfig: DEFAULT_RETRY_CONFIG,
          },
          {
            simulateLatency: false,
            failureRate: 0,
          }
        );

        const result = await reliableAdapter.checkActivity('any_user');
        expect(result).toBeDefined();
        expect(result.lastCheckedAt).toBeDefined();
      });
    });
  });

  describe('AdapterRegistry', () => {
    beforeEach(() => {
      adapterRegistry.clearCache();
      adapterRegistry.enableMockMode(true);
    });

    describe('getAdapter', () => {
      it('should return adapter for supported platform', () => {
        const platforms: SocialMediaPlatform[] = ['facebook', 'instagram', 'twitter', 'tiktok', 'linkedin'];

        platforms.forEach((platform) => {
          const adapter = getAdapter(platform);
          expect(adapter).not.toBeNull();
          expect(adapter?.platform).toBe(platform);
        });
      });

      it('should return adapter for "other" platform', () => {
        const adapter = getAdapter('other');
        expect(adapter).not.toBeNull();
      });
    });

    describe('isAvailable', () => {
      it('should return true for supported platforms', () => {
        expect(adapterRegistry.isAvailable('facebook')).toBe(true);
        expect(adapterRegistry.isAvailable('instagram')).toBe(true);
        expect(adapterRegistry.isAvailable('twitter')).toBe(true);
      });
    });

    describe('getAvailablePlatforms', () => {
      it('should return list of all available platforms', () => {
        const platforms = adapterRegistry.getAvailablePlatforms();
        expect(platforms).toContain('facebook');
        expect(platforms).toContain('instagram');
        expect(platforms).toContain('twitter');
        expect(platforms).toContain('tiktok');
        expect(platforms).toContain('linkedin');
        expect(platforms).toContain('other');
      });
    });

    describe('mock mode', () => {
      it('should return mock adapters when mock mode is enabled', () => {
        adapterRegistry.enableMockMode(true);

        const adapter = adapterRegistry.getAdapter('facebook');
        expect(adapter).toBeInstanceOf(MockSocialMediaAdapter);
      });
    });
  });

  describe('Activity conversion', () => {
    it('should convert platform activity to activity event format', () => {
      const adapter = new MockSocialMediaAdapter({
        platform: 'instagram',
        rateLimit: DEFAULT_RATE_LIMITS.instagram,
        retryConfig: DEFAULT_RETRY_CONFIG,
      });

      const platformActivity = {
        platformPostId: 'post-123',
        activityType: 'post' as const,
        activityTimestamp: '2024-01-15T12:00:00Z',
        contentPreview: 'Test content',
        contentUrl: 'https://instagram.com/p/123',
        location: {
          name: 'Test Location',
          latitude: 40.7128,
          longitude: -74.006,
        },
        engagement: {
          likes: 100,
          comments: 10,
          shares: 5,
          views: 500,
        },
      };

      const activityEvent = adapter.toActivityEvent(
        platformActivity,
        'account-456',
        'case-789'
      );

      expect(activityEvent.monitored_account_id).toBe('account-456');
      expect(activityEvent.case_id).toBe('case-789');
      expect(activityEvent.activity_type).toBe('post');
      expect(activityEvent.activity_timestamp).toBe('2024-01-15T12:00:00Z');
      expect(activityEvent.content_preview).toBe('Test content');
      expect(activityEvent.content_url).toBe('https://instagram.com/p/123');
      expect(activityEvent.location_name).toBe('Test Location');
      expect(activityEvent.location_latitude).toBe(40.7128);
      expect(activityEvent.location_longitude).toBe(-74.006);
      expect(activityEvent.engagement_likes).toBe(100);
      expect(activityEvent.engagement_comments).toBe(10);
      expect(activityEvent.engagement_shares).toBe(5);
      expect(activityEvent.engagement_views).toBe(500);
      expect(activityEvent.is_processed).toBe(false);
      expect(activityEvent.alert_sent).toBe(false);
    });

    it('should handle missing optional fields', () => {
      const adapter = new MockSocialMediaAdapter({
        platform: 'twitter',
        rateLimit: DEFAULT_RATE_LIMITS.twitter,
        retryConfig: DEFAULT_RETRY_CONFIG,
      });

      const platformActivity = {
        platformPostId: 'tweet-123',
        activityType: 'login' as const,
        activityTimestamp: '2024-01-15T12:00:00Z',
      };

      const activityEvent = adapter.toActivityEvent(
        platformActivity,
        'account-456',
        'case-789'
      );

      expect(activityEvent.content_preview).toBeUndefined();
      expect(activityEvent.location_name).toBeUndefined();
      expect(activityEvent.engagement_likes).toBe(0);
    });
  });

  describe('Rate Limit Configuration', () => {
    it('should have correct default rate limits for each platform', () => {
      expect(DEFAULT_RATE_LIMITS.facebook.requestsPerMinute).toBe(30);
      expect(DEFAULT_RATE_LIMITS.instagram.requestsPerMinute).toBe(30);
      expect(DEFAULT_RATE_LIMITS.twitter.requestsPerMinute).toBe(15);
      expect(DEFAULT_RATE_LIMITS.tiktok.requestsPerMinute).toBe(20);
      expect(DEFAULT_RATE_LIMITS.linkedin.requestsPerMinute).toBe(10);
      expect(DEFAULT_RATE_LIMITS.other.requestsPerMinute).toBe(10);
    });

    it('should have correct default retry configuration', () => {
      expect(DEFAULT_RETRY_CONFIG.maxRetries).toBe(3);
      expect(DEFAULT_RETRY_CONFIG.baseDelayMs).toBe(1000);
      expect(DEFAULT_RETRY_CONFIG.maxDelayMs).toBe(30000);
    });
  });
});
