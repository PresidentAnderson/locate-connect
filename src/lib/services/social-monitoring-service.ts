/**
 * Social Media Monitoring Service
 * LC-M4-002
 *
 * Provides utilities for webhook verification, URL validation, and notification formatting.
 */

import crypto from 'crypto';
import type {
  SocialMediaPlatform,
  SocialActivityType,
  ALERTABLE_ACTIVITY_TYPES,
  HIGH_PRIORITY_ACTIVITIES,
} from '@/types/social-monitoring.types';

// Platform URL patterns for validation
const PLATFORM_URL_PATTERNS: Record<SocialMediaPlatform, RegExp[]> = {
  facebook: [
    /^https?:\/\/(www\.)?facebook\.com\/[a-zA-Z0-9._-]+/i,
    /^https?:\/\/(www\.)?fb\.com\/[a-zA-Z0-9._-]+/i,
  ],
  instagram: [
    /^https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9._-]+/i,
    /^https?:\/\/(www\.)?instagr\.am\/[a-zA-Z0-9._-]+/i,
  ],
  twitter: [
    /^https?:\/\/(www\.)?twitter\.com\/[a-zA-Z0-9_]+/i,
    /^https?:\/\/(www\.)?x\.com\/[a-zA-Z0-9_]+/i,
  ],
  tiktok: [
    /^https?:\/\/(www\.)?tiktok\.com\/@[a-zA-Z0-9._-]+/i,
  ],
  linkedin: [
    /^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/i,
    /^https?:\/\/(www\.)?linkedin\.com\/company\/[a-zA-Z0-9_-]+/i,
  ],
  other: [], // No validation for 'other' platform
};

/**
 * Verify webhook signature using HMAC-SHA256
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!payload || !signature || !secret) {
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // Use timing-safe comparison
    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

/**
 * Validate that a profile URL matches the specified platform
 */
export function validateProfileUrl(
  platform: SocialMediaPlatform,
  url: string
): { valid: boolean; error?: string } {
  if (!url) {
    return { valid: true }; // URL is optional
  }

  // Parse URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  // Ensure HTTPS (or HTTP for dev)
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return { valid: false, error: 'URL must use HTTP or HTTPS protocol' };
  }

  // 'other' platform accepts any valid URL
  if (platform === 'other') {
    return { valid: true };
  }

  // Check against platform patterns
  const patterns = PLATFORM_URL_PATTERNS[platform];
  const matches = patterns.some((pattern) => pattern.test(url));

  if (!matches) {
    return {
      valid: false,
      error: `URL does not match ${platform} profile URL format`,
    };
  }

  return { valid: true };
}

/**
 * Extract username from a platform URL
 */
export function extractUsernameFromUrl(
  platform: SocialMediaPlatform,
  url: string
): string | null {
  if (!url) return null;

  try {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname;

    switch (platform) {
      case 'facebook':
      case 'instagram':
      case 'linkedin':
        // Extract username from path like /username or /in/username
        const parts = pathname.split('/').filter(Boolean);
        if (parts.length > 0) {
          // For LinkedIn, skip 'in' or 'company'
          if (platform === 'linkedin' && (parts[0] === 'in' || parts[0] === 'company')) {
            return parts[1] || null;
          }
          return parts[0];
        }
        break;
      case 'twitter':
        // Extract username from path like /username
        const twitterMatch = pathname.match(/^\/([a-zA-Z0-9_]+)/);
        return twitterMatch ? twitterMatch[1] : null;
      case 'tiktok':
        // Extract username from path like /@username
        const tiktokMatch = pathname.match(/^\/@([a-zA-Z0-9._-]+)/);
        return tiktokMatch ? tiktokMatch[1] : null;
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Determine if an activity should trigger an alert
 */
export function shouldTriggerAlert(
  activityType: SocialActivityType,
  hasLocation: boolean
): boolean {
  // Alertable activity types
  const alertableTypes: SocialActivityType[] = [
    'post',
    'story',
    'location_tag',
    'live_video',
    'login',
  ];

  // Always alert for location_tag and live_video
  if (activityType === 'location_tag' || activityType === 'live_video') {
    return true;
  }

  // Alert for other types if they have location
  if (hasLocation && alertableTypes.includes(activityType)) {
    return true;
  }

  // Alert for login activity (potential access indicator)
  if (activityType === 'login') {
    return true;
  }

  return false;
}

/**
 * Calculate activity priority for sorting/alerting
 */
export function calculateActivityPriority(
  activityType: SocialActivityType,
  hasLocation: boolean,
  isRecent: boolean
): 'critical' | 'high' | 'medium' | 'low' {
  // High priority activities
  const highPriorityTypes: SocialActivityType[] = [
    'location_tag',
    'live_video',
  ];

  // Critical: location_tag that's recent
  if (activityType === 'location_tag' && isRecent) {
    return 'critical';
  }

  // Critical: live_video (real-time)
  if (activityType === 'live_video') {
    return 'critical';
  }

  // High: login or any activity with location
  if (activityType === 'login' || (hasLocation && highPriorityTypes.includes(activityType))) {
    return 'high';
  }

  // Medium: posts, stories, or activities with location
  if (hasLocation || ['post', 'story'].includes(activityType)) {
    return 'medium';
  }

  // Low: everything else
  return 'low';
}

/**
 * Format activity notification message
 */
export function formatActivityNotification(
  platform: SocialMediaPlatform,
  username: string,
  activityType: SocialActivityType,
  locationName?: string
): { title: string; content: string } {
  const platformNames: Record<SocialMediaPlatform, string> = {
    facebook: 'Facebook',
    instagram: 'Instagram',
    twitter: 'Twitter/X',
    tiktok: 'TikTok',
    linkedin: 'LinkedIn',
    other: 'Social Media',
  };

  const activityLabels: Record<SocialActivityType, string> = {
    post: 'new post',
    story: 'new story',
    comment: 'new comment',
    like: 'liked content',
    share: 'shared content',
    login: 'account login',
    location_tag: 'location tagged',
    profile_update: 'profile update',
    friend_added: 'added a friend',
    group_joined: 'joined a group',
    event_rsvp: 'RSVP to event',
    live_video: 'started live video',
    reel: 'posted a reel',
    other: 'activity detected',
  };

  const platformName = platformNames[platform];
  const activityLabel = activityLabels[activityType];

  let title = `${platformName}: ${activityLabel}`;
  let content = `Activity detected on ${platformName} account @${username}: ${activityLabel}`;

  if (locationName) {
    title = `${platformName}: ${activityLabel} at ${locationName}`;
    content += ` at ${locationName}`;
  }

  return { title, content };
}

/**
 * Generate webhook verification token
 */
export function generateVerifyToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
