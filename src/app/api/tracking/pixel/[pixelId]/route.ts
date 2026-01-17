import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  TRANSPARENT_PIXEL_BUFFER,
  lookupGeoLocation,
  extractIPAddress,
} from '@/lib/services/email-tracking-service';

// Use service role client for this public endpoint
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * GET /api/tracking/pixel/[pixelId]
 * Public endpoint that returns a 1x1 transparent GIF and records the open event.
 * No authentication required - must work in email clients.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pixelId: string }> }
) {
  const { pixelId } = await params;

  // Always return the pixel, even if tracking fails
  const pixelResponse = () =>
    new NextResponse(TRANSPARENT_PIXEL_BUFFER, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Content-Length': String(TRANSPARENT_PIXEL_BUFFER.length),
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });

  try {
    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(pixelId)) {
      return pixelResponse();
    }

    const supabase = getServiceClient();

    // Find the tracking record
    const { data: trackingRecord, error: findError } = await supabase
      .from('email_tracking')
      .select('id, open_count')
      .eq('tracking_pixel_id', pixelId)
      .single();

    if (findError || !trackingRecord) {
      // Pixel not found, still return the image
      return pixelResponse();
    }

    // Extract IP and user agent
    const ipAddress = extractIPAddress(request);
    const userAgent = request.headers.get('user-agent') || null;

    // Lookup geolocation (async, don't block response)
    let geoLocation = null;
    if (ipAddress) {
      geoLocation = await lookupGeoLocation(ipAddress);
    }

    // Update the tracking record
    const now = new Date().toISOString();
    const updateData: Record<string, unknown> = {
      open_count: trackingRecord.open_count + 1,
      last_opened_user_agent: userAgent,
    };

    // Set opened_at only on first open
    if (trackingRecord.open_count === 0) {
      updateData.opened_at = now;
    }

    // Set IP address if available
    if (ipAddress) {
      updateData.last_opened_ip = ipAddress;
    }

    // Set geolocation if available
    if (geoLocation) {
      updateData.last_opened_location = geoLocation;
    }

    // Update the record
    const { error: updateError } = await supabase
      .from('email_tracking')
      .update(updateData)
      .eq('id', trackingRecord.id);

    if (updateError) {
      console.error('Failed to update tracking record:', updateError);
    }

    return pixelResponse();
  } catch (error) {
    console.error('Tracking pixel error:', error);
    return pixelResponse();
  }
}
