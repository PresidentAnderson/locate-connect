/**
 * In-memory rate limiter for internal API routes.
 *
 * Uses a sliding-window counter stored in a Map.  In a multi-instance
 * deployment this should be backed by Redis or a similar shared store;
 * the in-memory approach works for single-instance and development
 * environments and is intentionally kept lightweight.
 */

import { NextResponse } from "next/server";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Periodically clean expired entries (every 60 s)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}, 60_000);

export interface InternalRateLimitOptions {
  /** Maximum requests per window (default 60) */
  limit?: number;
  /** Window duration in seconds (default 60) */
  windowSeconds?: number;
}

export interface InternalRateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Check whether a request identified by `key` (usually `userId` or IP)
 * is within the rate limit.
 */
export function checkInternalRateLimit(
  key: string,
  options: InternalRateLimitOptions = {}
): InternalRateLimitResult {
  const limit = options.limit ?? 60;
  const windowMs = (options.windowSeconds ?? 60) * 1000;
  const now = Date.now();

  let entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    entry = { count: 1, resetAt: now + windowMs };
    store.set(key, entry);
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  entry.count += 1;

  if (entry.count > limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSeconds: retryAfter };
  }

  return { allowed: true, remaining: limit - entry.count, retryAfterSeconds: 0 };
}

/**
 * Convenience helper that returns a 429 NextResponse when the limit is
 * exceeded, or `null` when the request is allowed.
 *
 * Usage in a route handler:
 *   const blocked = applyInternalRateLimit(userId, { limit: 30 });
 *   if (blocked) return blocked;
 */
export function applyInternalRateLimit(
  key: string,
  options?: InternalRateLimitOptions
): NextResponse | null {
  const result = checkInternalRateLimit(key, options);

  if (!result.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(result.retryAfterSeconds),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  return null;
}
