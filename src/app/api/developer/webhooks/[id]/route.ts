import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiSuccess, apiBadRequest, apiUnauthorized, apiNotFound, apiServerError, apiForbidden, apiNoContent } from '@/lib/api/response';
import type { UpdateWebhookInput, WebhookEventType } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

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
 * GET /api/developer/webhooks/[id]
 * Get a specific webhook
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiUnauthorized('Authentication required');
    }

    // Get the webhook with application ownership check
    const { data, error } = await supabase
      .from('webhooks')
      .select(`
        *,
        api_applications!inner (owner_id)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return apiNotFound('Webhook not found');
      }
      console.error('Webhook fetch error:', error);
      return apiServerError('Failed to fetch webhook');
    }

    // Check ownership
    const app = data.api_applications as unknown as { owner_id: string };
    if (app.owner_id !== user.id) {
      return apiForbidden('Access denied');
    }

    // Remove sensitive data
    const { api_applications, secret_hash, ...webhookData } = data;

    return apiSuccess(webhookData);
  } catch (error) {
    console.error('Webhook API error:', error);
    return apiServerError('Internal server error');
  }
}

/**
 * PATCH /api/developer/webhooks/[id]
 * Update a webhook
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiUnauthorized('Authentication required');
    }

    // Verify ownership
    const { data: existingWebhook, error: fetchError } = await supabase
      .from('webhooks')
      .select(`
        id,
        api_applications!inner (owner_id)
      `)
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return apiNotFound('Webhook not found');
      }
      return apiServerError('Failed to fetch webhook');
    }

    const app = existingWebhook.api_applications as unknown as { owner_id: string };
    if (app.owner_id !== user.id) {
      return apiForbidden('Access denied');
    }

    const body: UpdateWebhookInput = await request.json();

    // Build update object
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) {
      if (body.name.trim().length < 3) {
        return apiBadRequest('Webhook name must be at least 3 characters', 'invalid_name');
      }
      updates.name = body.name.trim();
    }

    if (body.description !== undefined) {
      updates.description = body.description?.trim() || null;
    }

    if (body.endpoint_url !== undefined) {
      try {
        const url = new URL(body.endpoint_url);
        if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1' && url.protocol !== 'https:') {
          return apiBadRequest('Production webhook endpoints must use HTTPS', 'invalid_endpoint_url');
        }
      } catch {
        return apiBadRequest('Invalid endpoint URL', 'invalid_endpoint_url');
      }
      updates.endpoint_url = body.endpoint_url;
    }

    if (body.events !== undefined) {
      if (body.events.length === 0) {
        return apiBadRequest('At least one event is required', 'missing_events');
      }
      const invalidEvents = body.events.filter(e => !VALID_EVENTS.includes(e));
      if (invalidEvents.length > 0) {
        return apiBadRequest(`Invalid events: ${invalidEvents.join(', ')}`, 'invalid_events');
      }
      updates.events = body.events;
    }

    if (body.filter_jurisdictions !== undefined) updates.filter_jurisdictions = body.filter_jurisdictions;
    if (body.filter_priority_levels !== undefined) updates.filter_priority_levels = body.filter_priority_levels;
    if (body.filter_case_statuses !== undefined) updates.filter_case_statuses = body.filter_case_statuses;
    if (body.max_retries !== undefined) updates.max_retries = body.max_retries;
    if (body.retry_delay_seconds !== undefined) updates.retry_delay_seconds = body.retry_delay_seconds;
    if (body.timeout_seconds !== undefined) updates.timeout_seconds = body.timeout_seconds;
    if (body.is_active !== undefined) updates.is_active = body.is_active;

    if (Object.keys(updates).length === 0) {
      return apiBadRequest('No updates provided', 'no_updates');
    }

    // Update the webhook
    const { data, error } = await supabase
      .from('webhooks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Webhook update error:', error);
      return apiServerError('Failed to update webhook');
    }

    // Remove secret hash
    const { secret_hash, ...webhookData } = data;

    return apiSuccess(webhookData);
  } catch (error) {
    console.error('Webhook API error:', error);
    return apiServerError('Internal server error');
  }
}

/**
 * DELETE /api/developer/webhooks/[id]
 * Delete a webhook
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiUnauthorized('Authentication required');
    }

    // Verify ownership
    const { data: existingWebhook, error: fetchError } = await supabase
      .from('webhooks')
      .select(`
        id,
        api_applications!inner (owner_id)
      `)
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return apiNotFound('Webhook not found');
      }
      return apiServerError('Failed to fetch webhook');
    }

    const app = existingWebhook.api_applications as unknown as { owner_id: string };
    if (app.owner_id !== user.id) {
      return apiForbidden('Access denied');
    }

    // Delete the webhook
    const { error } = await supabase
      .from('webhooks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Webhook delete error:', error);
      return apiServerError('Failed to delete webhook');
    }

    return apiNoContent();
  } catch (error) {
    console.error('Webhook API error:', error);
    return apiServerError('Internal server error');
  }
}
