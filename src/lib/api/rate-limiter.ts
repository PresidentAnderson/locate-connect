/**
 * Rate limiting utilities for the Public API
 */

import { createClient } from '@/lib/supabase/server';
import type { RateLimitInfo } from '@/types';

export interface RateLimitResult {
  allowed: boolean;
  info: RateLimitInfo;
  headers: Record<string, string>;
}

/**
 * Check and update rate limits for an API application
 */
export async function checkRateLimit(
  applicationId: string
): Promise<RateLimitResult> {
  const supabase = await createClient();

  // Call the database function to check limits
  const { data, error } = await supabase
    .rpc('check_rate_limits', { p_application_id: applicationId });

  if (error) {
    console.error('Rate limit check error:', error);
    // On error, allow the request but log it
    return {
      allowed: true,
      info: {
        is_allowed: true,
        minute_remaining: -1,
        day_remaining: -1,
        month_remaining: -1,
        retry_after_seconds: 0,
      },
      headers: {},
    };
  }

  const result = data?.[0] || {
    is_allowed: true,
    minute_remaining: 60,
    day_remaining: 10000,
    month_remaining: 100000,
    retry_after_seconds: 0,
  };

  const headers: Record<string, string> = {
    'X-RateLimit-Limit-Minute': '60',
    'X-RateLimit-Remaining-Minute': String(Math.max(0, result.minute_remaining)),
    'X-RateLimit-Limit-Day': '10000',
    'X-RateLimit-Remaining-Day': String(Math.max(0, result.day_remaining)),
    'X-Quota-Limit-Month': '100000',
    'X-Quota-Remaining-Month': String(Math.max(0, result.month_remaining)),
  };

  if (!result.is_allowed) {
    headers['Retry-After'] = String(result.retry_after_seconds);
  }

  return {
    allowed: result.is_allowed,
    info: result,
    headers,
  };
}

/**
 * Update rate limit counters after a successful request
 */
export async function updateRateLimitCounters(
  applicationId: string
): Promise<void> {
  const supabase = await createClient();

  await supabase.rpc('update_rate_limits', { p_application_id: applicationId });
}

/**
 * Get current rate limit status without incrementing
 */
export async function getRateLimitStatus(
  applicationId: string
): Promise<RateLimitInfo | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc('check_rate_limits', { p_application_id: applicationId });

  if (error) {
    console.error('Rate limit status error:', error);
    return null;
  }

  return data?.[0] || null;
}

/**
 * Get rate limit configuration for an application
 */
export async function getRateLimitConfig(
  applicationId: string
): Promise<{
  requests_per_minute: number;
  requests_per_day: number;
  quota_monthly: number;
} | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('api_applications')
    .select('rate_limit_requests_per_minute, rate_limit_requests_per_day, quota_monthly')
    .eq('id', applicationId)
    .single();

  if (error) {
    console.error('Rate limit config error:', error);
    return null;
  }

  return {
    requests_per_minute: data.rate_limit_requests_per_minute,
    requests_per_day: data.rate_limit_requests_per_day,
    quota_monthly: data.quota_monthly,
  };
}

/**
 * Clean up old rate limit records (run periodically)
 */
export async function cleanupOldRateLimitRecords(): Promise<void> {
  const supabase = await createClient();

  // Delete minute records older than 1 hour
  await supabase
    .from('api_rate_limits')
    .delete()
    .lt('minute_window', new Date(Date.now() - 60 * 60 * 1000).toISOString());
}
