import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiSuccess, apiBadRequest, apiUnauthorized, apiNotFound, apiServerError, apiForbidden } from '@/lib/api/response';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/developer/webhooks/[id]/deliveries
 * Get delivery history for a webhook
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

    // Verify ownership of the webhook
    const { data: webhook, error: webhookError } = await supabase
      .from('webhooks')
      .select(`
        id,
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const offset = (page - 1) * pageSize;

    // Get deliveries
    const { data, error, count } = await supabase
      .from('webhook_deliveries')
      .select('*', { count: 'exact' })
      .eq('webhook_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('Deliveries fetch error:', error);
      return apiServerError('Failed to fetch deliveries');
    }

    return apiSuccess(data, {
      total: count || 0,
      page,
      page_size: pageSize,
      total_pages: Math.ceil((count || 0) / pageSize),
    });
  } catch (error) {
    console.error('Webhook deliveries API error:', error);
    return apiServerError('Internal server error');
  }
}
