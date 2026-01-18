import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiBadRequest,
  apiUnauthorized,
  apiServerError,
  apiForbidden,
} from '@/lib/api/response';

/**
 * GET /api/integrations/monitoring/alerts
 * List integration alerts
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiUnauthorized('Authentication required');
    }

    // Check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['coordinator', 'investigator', 'admin', 'super_admin'].includes(profile.role)) {
      return apiForbidden('Insufficient permissions');
    }

    const { searchParams } = new URL(request.url);
    const integrationId = searchParams.get('integrationId');
    const status = searchParams.get('status');
    const severity = searchParams.get('severity');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from('integration_alerts')
      .select(`
        *,
        integrations (id, name)
      `, { count: 'exact' });

    if (integrationId) {
      query = query.eq('integration_id', integrationId);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (severity) {
      query = query.eq('severity', severity);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('Alerts fetch error:', error);
      return apiServerError('Failed to fetch alerts');
    }

    return apiSuccess(data, {
      total: count || 0,
      page,
      page_size: pageSize,
      total_pages: Math.ceil((count || 0) / pageSize),
    });
  } catch (error) {
    console.error('Alerts API error:', error);
    return apiServerError('Internal server error');
  }
}

/**
 * PATCH /api/integrations/monitoring/alerts
 * Update alert status (acknowledge/resolve)
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiUnauthorized('Authentication required');
    }

    // Check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['coordinator', 'investigator', 'admin', 'super_admin'].includes(profile.role)) {
      return apiForbidden('Insufficient permissions');
    }

    const body = await request.json();

    if (!body.alertId) {
      return apiBadRequest('Alert ID is required', 'missing_alert_id');
    }

    if (!body.action || !['acknowledge', 'resolve'].includes(body.action)) {
      return apiBadRequest('Action must be "acknowledge" or "resolve"', 'invalid_action');
    }

    const updateData: Record<string, unknown> = {};

    if (body.action === 'acknowledge') {
      updateData.status = 'acknowledged';
      updateData.acknowledged_by = user.id;
      updateData.acknowledged_at = new Date().toISOString();
    } else if (body.action === 'resolve') {
      updateData.status = 'resolved';
      updateData.resolved_by = user.id;
      updateData.resolved_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('integration_alerts')
      .update(updateData)
      .eq('id', body.alertId)
      .select()
      .single();

    if (error) {
      console.error('Alert update error:', error);
      return apiServerError('Failed to update alert');
    }

    return apiSuccess(data);
  } catch (error) {
    console.error('Alerts API error:', error);
    return apiServerError('Internal server error');
  }
}
