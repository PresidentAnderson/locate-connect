import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiSuccess, apiUnauthorized, apiNotFound, apiServerError, apiForbidden } from '@/lib/api/response';
import { generateWebhookSignature } from '@/lib/api/crypto';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/developer/webhooks/[id]/test
 * Send a test webhook delivery
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiUnauthorized('Authentication required');
    }

    // Get webhook with secret
    const { data: webhook, error: webhookError } = await supabase
      .from('webhooks')
      .select(`
        id,
        endpoint_url,
        secret_hash,
        events,
        timeout_seconds,
        success_count,
        failure_count,
        consecutive_failures,
        api_applications!inner (owner_id)
      `)
      .eq('id', id)
      .single();

    if (webhookError) {
      if (webhookError.code === 'PGRST116') {
        return apiNotFound('Webhook not found');
      }
      console.error('Webhook fetch error:', webhookError);
      return apiServerError('Failed to fetch webhook');
    }

    const app = webhook.api_applications as unknown as { owner_id: string };
    if (app.owner_id !== user.id) {
      return apiForbidden('Access denied');
    }

    // Create test payload
    const testPayload = {
      event: 'test.ping',
      timestamp: new Date().toISOString(),
      webhook_id: id,
      data: {
        message: 'This is a test webhook delivery from LocateConnect',
        triggered_by: user.id,
      },
    };

    const payloadString = JSON.stringify(testPayload);
    const timestamp = Math.floor(Date.now() / 1000);

    // We need the actual secret to sign, but we only have the hash
    // For testing, we'll use a placeholder signature explanation
    // In production, you'd store the secret or use a different approach

    let response;
    let responseStatus = 0;
    let responseBody = '';
    let responseTime = 0;
    let errorMessage = '';

    try {
      const startTime = Date.now();

      // Make the webhook request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), webhook.timeout_seconds * 1000);

      const webhookResponse = await fetch(webhook.endpoint_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'LocateConnect-Webhook/1.0',
          'X-Webhook-ID': id,
          'X-Webhook-Event': 'test.ping',
          'X-Webhook-Timestamp': String(timestamp),
          // In production, include: 'X-Webhook-Signature': signature,
        },
        body: payloadString,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      responseTime = Date.now() - startTime;
      responseStatus = webhookResponse.status;
      responseBody = await webhookResponse.text();

    } catch (fetchError) {
      responseTime = webhook.timeout_seconds * 1000;

      if (fetchError instanceof Error) {
        if (fetchError.name === 'AbortError') {
          errorMessage = 'Request timed out';
          responseStatus = 0;
        } else {
          errorMessage = fetchError.message;
          responseStatus = 0;
        }
      }
    }

    // Record the test delivery
    await supabase
      .from('webhook_deliveries')
      .insert({
        webhook_id: id,
        event_type: 'case.created', // Using a valid enum value for the test
        payload: testPayload,
        attempt_count: 1,
        max_attempts: 1,
        response_status_code: responseStatus || null,
        response_body: responseBody.substring(0, 10000), // Limit size
        response_time_ms: responseTime,
        scheduled_at: new Date().toISOString(),
        delivered_at: responseStatus >= 200 && responseStatus < 300 ? new Date().toISOString() : null,
        is_successful: responseStatus >= 200 && responseStatus < 300,
        error_message: errorMessage || null,
      });

    // Update webhook statistics
    const isSuccess = responseStatus >= 200 && responseStatus < 300;
    await supabase
      .from('webhooks')
      .update({
        last_triggered_at: new Date().toISOString(),
        ...(isSuccess
          ? {
              last_success_at: new Date().toISOString(),
              consecutive_failures: 0,
              success_count: webhook.success_count + 1,
            }
          : {
              last_failure_at: new Date().toISOString(),
              last_failure_reason: errorMessage || `HTTP ${responseStatus}`,
              consecutive_failures: webhook.consecutive_failures + 1,
              failure_count: webhook.failure_count + 1,
            }),
      })
      .eq('id', id);

    return apiSuccess({
      success: isSuccess,
      status_code: responseStatus,
      response_time_ms: responseTime,
      error: errorMessage || undefined,
      payload: testPayload,
    });
  } catch (error) {
    console.error('Webhook test API error:', error);
    return apiServerError('Internal server error');
  }
}
