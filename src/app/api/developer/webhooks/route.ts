import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiSuccess, apiBadRequest, apiUnauthorized, apiServerError, apiCreated, apiForbidden } from '@/lib/api/response';
import { generateWebhookSecret, hashApiKey } from '@/lib/api/crypto';
import type { CreateWebhookInput, WebhookWithSecret, WebhookEventType } from '@/types';

const VALID_EVENTS: WebhookEventType[] = [
  'case.created',
  'case.updated',
  'case.resolved',
  'case.status_changed',
  'lead.created',
  'lead.verified',
  'tip.received',
  'alert.amber_issued',
  'alert.silver_issued',
];

/**
 * GET /api/developer/webhooks
 * List webhooks for an application
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiUnauthorized('Authentication required');
    }

    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('application_id');

    if (!applicationId) {
      return apiBadRequest('application_id is required', 'missing_application_id');
    }

    // Verify ownership of the application
    const { data: app, error: appError } = await supabase
      .from('api_applications')
      .select('owner_id')
      .eq('id', applicationId)
      .single();

    if (appError || !app) {
      return apiBadRequest('Application not found', 'application_not_found');
    }

    if (app.owner_id !== user.id) {
      return apiForbidden('Access denied');
    }

    // Get webhooks
    const { data, error, count } = await supabase
      .from('webhooks')
      .select('*', { count: 'exact' })
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Webhooks fetch error:', error);
      return apiServerError('Failed to fetch webhooks');
    }

    // Remove secret hash from response
    const sanitizedData = data?.map(({ secret_hash, ...webhook }) => webhook) || [];

    return apiSuccess(sanitizedData, { total: count || 0 });
  } catch (error) {
    console.error('Webhooks API error:', error);
    return apiServerError('Internal server error');
  }
}

/**
 * POST /api/developer/webhooks
 * Create a new webhook
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiUnauthorized('Authentication required');
    }

    const body: CreateWebhookInput = await request.json();

    // Validate required fields
    if (!body.application_id) {
      return apiBadRequest('application_id is required', 'missing_application_id');
    }

    if (!body.name || body.name.trim().length < 3) {
      return apiBadRequest('Webhook name must be at least 3 characters', 'invalid_name');
    }

    if (!body.endpoint_url) {
      return apiBadRequest('endpoint_url is required', 'missing_endpoint_url');
    }

    // Validate endpoint URL
    try {
      const url = new URL(body.endpoint_url);
      if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1' && url.protocol !== 'https:') {
        return apiBadRequest('Production webhook endpoints must use HTTPS', 'invalid_endpoint_url');
      }
    } catch {
      return apiBadRequest('Invalid endpoint URL', 'invalid_endpoint_url');
    }

    if (!body.events || body.events.length === 0) {
      return apiBadRequest('At least one event is required', 'missing_events');
    }

    // Validate events
    const invalidEvents = body.events.filter(e => !VALID_EVENTS.includes(e));
    if (invalidEvents.length > 0) {
      return apiBadRequest(`Invalid events: ${invalidEvents.join(', ')}`, 'invalid_events');
    }

    // Verify ownership of the application
    const { data: app, error: appError } = await supabase
      .from('api_applications')
      .select('owner_id')
      .eq('id', body.application_id)
      .single();

    if (appError || !app) {
      return apiBadRequest('Application not found', 'application_not_found');
    }

    if (app.owner_id !== user.id) {
      return apiForbidden('Access denied');
    }

    // Generate webhook secret
    const secret = generateWebhookSecret();
    const secretHash = hashApiKey(secret);

    // Create the webhook
    const { data, error } = await supabase
      .from('webhooks')
      .insert({
        application_id: body.application_id,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        endpoint_url: body.endpoint_url,
        events: body.events,
        secret_hash: secretHash,
        filter_jurisdictions: body.filter_jurisdictions || [],
        filter_priority_levels: body.filter_priority_levels || [],
        filter_case_statuses: body.filter_case_statuses || [],
        max_retries: body.max_retries ?? 3,
        retry_delay_seconds: body.retry_delay_seconds ?? 60,
        timeout_seconds: body.timeout_seconds ?? 30,
        status: 'active',
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Webhook creation error:', error);
      return apiServerError('Failed to create webhook');
    }

    // Return with secret (only shown once)
    const { secret_hash, ...webhookData } = data;
    const response: WebhookWithSecret = {
      ...webhookData,
      secret,
    };

    return apiCreated(response);
  } catch (error) {
    console.error('Webhooks API error:', error);
    return apiServerError('Internal server error');
  }
}
