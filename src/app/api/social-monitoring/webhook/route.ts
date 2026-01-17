import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  verifyWebhookSignature,
  shouldTriggerAlert,
  calculateActivityPriority,
  formatActivityNotification,
} from '@/lib/services/social-monitoring-service';
import type {
  SocialMediaWebhookPayload,
  WebhookVerificationRequest,
} from '@/types/social-monitoring.types';

// Use service role client for webhook processing
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const WEBHOOK_SECRET = process.env.SOCIAL_MONITORING_WEBHOOK_SECRET || '';

/**
 * GET /api/social-monitoring/webhook
 * Handle webhook verification (Facebook-style challenge verification).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get('hub.mode');
  const verifyToken = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Handle Facebook-style verification
  if (mode === 'subscribe' && verifyToken && challenge) {
    const expectedToken = process.env.SOCIAL_MONITORING_VERIFY_TOKEN;

    if (verifyToken === expectedToken) {
      // Return the challenge to verify
      return new NextResponse(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    return new NextResponse('Verification failed', { status: 403 });
  }

  return new NextResponse('Invalid request', { status: 400 });
}

/**
 * POST /api/social-monitoring/webhook
 * Receive social media activity events.
 * This endpoint processes incoming webhooks from social media platforms
 * or simulated events for testing.
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();

    // Verify webhook signature if secret is configured
    if (WEBHOOK_SECRET) {
      const signature = request.headers.get('x-webhook-signature') || '';
      if (!verifyWebhookSignature(rawBody, signature, WEBHOOK_SECRET)) {
        console.error('Invalid webhook signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    // Parse payload
    let payload: SocialMediaWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!payload.platform || !payload.account_username || !payload.activity_type) {
      return NextResponse.json(
        { error: 'Missing required fields: platform, account_username, activity_type' },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // Find the monitored account
    const { data: account, error: accountError } = await supabase
      .from('social_media_monitored_accounts')
      .select('id, case_id, platform, username')
      .eq('platform', payload.platform)
      .eq('username', payload.account_username)
      .eq('monitoring_status', 'active')
      .single();

    if (accountError || !account) {
      // Account not found or not being monitored - acknowledge but don't process
      return NextResponse.json({ received: true, processed: false });
    }

    // Determine if this activity has location
    const hasLocation = !!(
      payload.location?.latitude && payload.location?.longitude
    );

    // Calculate priority
    const now = new Date();
    const activityTime = payload.activity_timestamp
      ? new Date(payload.activity_timestamp)
      : now;
    const isRecent = now.getTime() - activityTime.getTime() < 3600000; // Within 1 hour
    const priority = calculateActivityPriority(
      payload.activity_type,
      hasLocation,
      isRecent
    );

    // Determine if alert should be triggered
    const shouldAlert = shouldTriggerAlert(payload.activity_type, hasLocation);

    // Create activity event
    const { data: activityEvent, error: createError } = await supabase
      .from('social_media_activity_events')
      .insert({
        monitored_account_id: account.id,
        case_id: account.case_id,
        activity_type: payload.activity_type,
        activity_timestamp: payload.activity_timestamp || now.toISOString(),
        content_preview: payload.content_preview || null,
        content_url: payload.content_url || null,
        media_type: payload.media_type || null,
        media_url: payload.media_url || null,
        location_name: payload.location?.name || null,
        location_latitude: payload.location?.latitude || null,
        location_longitude: payload.location?.longitude || null,
        engagement_likes: payload.engagement?.likes || 0,
        engagement_comments: payload.engagement?.comments || 0,
        engagement_shares: payload.engagement?.shares || 0,
        engagement_views: payload.engagement?.views || 0,
        raw_data: payload.raw_data || null,
        is_processed: true,
        processed_at: now.toISOString(),
        alert_priority: priority,
      })
      .select()
      .single();

    if (createError) {
      // Check for duplicate (unique constraint violation)
      if (createError.code === '23505') {
        return NextResponse.json({ received: true, processed: false, reason: 'duplicate' });
      }
      console.error('Failed to create activity event:', createError);
      return NextResponse.json(
        { error: 'Failed to process event' },
        { status: 500 }
      );
    }

    // Update account activity stats
    await supabase
      .from('social_media_monitored_accounts')
      .update({
        last_activity_at: now.toISOString(),
        total_activities_detected: supabase.rpc('increment', { x: 1 }),
        consecutive_errors: 0,
        last_error_at: null,
        last_error_message: null,
      })
      .eq('id', account.id);

    // Trigger notification if needed
    if (shouldAlert && activityEvent) {
      const notification = formatActivityNotification(
        payload.platform,
        account.username,
        payload.activity_type,
        payload.location?.name
      );

      // Get case reporter for notification
      const { data: caseData } = await supabase
        .from('cases')
        .select('reporter_id, primary_investigator_id')
        .eq('id', account.case_id)
        .single();

      if (caseData) {
        // Create notifications for case owner and investigator
        const notifyUsers = [caseData.reporter_id];
        if (caseData.primary_investigator_id) {
          notifyUsers.push(caseData.primary_investigator_id);
        }

        const notifications = notifyUsers.map((userId) => ({
          user_id: userId,
          type: 'social_media_activity',
          title: notification.title,
          content: notification.content,
          case_id: account.case_id,
        }));

        await supabase.from('notifications').insert(notifications);

        // Mark alert as sent
        await supabase
          .from('social_media_activity_events')
          .update({
            alert_sent: true,
            alert_sent_at: now.toISOString(),
          })
          .eq('id', activityEvent.id);
      }
    }

    return NextResponse.json({
      received: true,
      processed: true,
      activity_id: activityEvent?.id,
      alert_triggered: shouldAlert,
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
