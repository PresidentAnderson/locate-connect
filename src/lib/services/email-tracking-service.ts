/**
 * Email Tracking Service
 * LC-M4-001
 *
 * Provides utilities for generating tracking pixels and geolocating IP addresses.
 */

import type { GeoLocation } from '@/types/email-tracking.types';

// 1x1 transparent GIF pixel (43 bytes)
// Base64: R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7
export const TRANSPARENT_PIXEL_BUFFER = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

/**
 * Generate a tracking pixel URL for a given pixel ID
 */
export function generateTrackingPixelUrl(pixelId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/api/tracking/pixel/${pixelId}`;
}

/**
 * Generate embeddable HTML for a tracking pixel
 */
export function generateTrackingPixelHtml(pixelId: string): string {
  const url = generateTrackingPixelUrl(pixelId);
  return `<img src="${url}" width="1" height="1" alt="" style="display:none;border:0;width:1px;height:1px;" />`;
}

/**
 * Lookup geolocation for an IP address using ip-api.com (free tier)
 * Rate limit: 45 requests per minute
 */
export async function lookupGeoLocation(ip: string): Promise<GeoLocation | null> {
  // Skip localhost/private IPs
  if (isPrivateIP(ip)) {
    return null;
  }

  try {
    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,lat,lon,timezone,isp`,
      {
        next: { revalidate: 86400 }, // Cache for 24 hours
        signal: AbortSignal.timeout(5000) // 5 second timeout
      }
    );

    if (!response.ok) {
      console.error('Geolocation API error:', response.status);
      return null;
    }

    const data = await response.json();

    if (data.status !== 'success') {
      console.error('Geolocation lookup failed:', data.message);
      return null;
    }

    return {
      city: data.city || undefined,
      region: data.regionName || undefined,
      country: data.country || undefined,
      country_code: data.countryCode || undefined,
      latitude: data.lat || undefined,
      longitude: data.lon || undefined,
      timezone: data.timezone || undefined,
      isp: data.isp || undefined,
    };
  } catch (error) {
    console.error('Geolocation lookup error:', error);
    return null;
  }
}

/**
 * Check if an IP address is private/local
 */
function isPrivateIP(ip: string): boolean {
  // IPv6 localhost
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    return true;
  }

  // IPv4 patterns
  const parts = ip.split('.');
  if (parts.length !== 4) {
    // Might be IPv6, check for localhost patterns
    return ip.startsWith('fe80:') || ip.startsWith('fc') || ip.startsWith('fd');
  }

  const first = parseInt(parts[0], 10);
  const second = parseInt(parts[1], 10);

  // 10.x.x.x
  if (first === 10) return true;

  // 172.16.x.x - 172.31.x.x
  if (first === 172 && second >= 16 && second <= 31) return true;

  // 192.168.x.x
  if (first === 192 && second === 168) return true;

  // 127.x.x.x (localhost)
  if (first === 127) return true;

  return false;
}

/**
 * Extract IP address from request headers
 */
export function extractIPAddress(request: Request): string | null {
  // Check various headers for the real IP
  const headers = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip', // Cloudflare
    'true-client-ip',
    'x-client-ip',
  ];

  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      // x-forwarded-for can contain multiple IPs, take the first
      const ip = value.split(',')[0].trim();
      if (ip) return ip;
    }
  }

  return null;
}
