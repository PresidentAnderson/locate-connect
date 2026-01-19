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
 * GET /api/integrations/monitoring/rules
 * List integration alert rules
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

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return apiForbidden('Admin role required');
    }

    const { searchParams } = new URL(request.url);
    const integrationId = searchParams.get('integrationId');
    const enabled = searchParams.get('enabled');

    let query = supabase
      .from('integration_alert_rules')
      .select(`
        *,
        integrations (id, name)
      `)
      .order('created_at', { ascending: false });

    if (integrationId) {
      query = query.eq('integration_id', integrationId);
    }
    if (enabled !== null && enabled !== '') {
      query = query.eq('enabled', enabled === 'true');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Alert rules fetch error:', error);
      return apiServerError('Failed to fetch alert rules');
    }

    return apiSuccess({
      rules: data?.map(rule => ({
        id: rule.id,
        integrationId: rule.integration_id,
        integrationName: (rule.integrations as { name: string } | null)?.name || 'Global',
        name: rule.name,
        description: rule.description,
        enabled: rule.enabled,
        metric: rule.metric,
        operator: rule.operator,
        threshold: parseFloat(rule.threshold),
        durationSeconds: rule.duration_seconds,
        alertSeverity: rule.alert_severity,
        notificationChannels: rule.notification_channels,
        createdAt: rule.created_at,
        updatedAt: rule.updated_at,
      })) || [],
    });
  } catch (error) {
    console.error('Alert rules API error:', error);
    return apiServerError('Internal server error');
  }
}

/**
 * POST /api/integrations/monitoring/rules
 * Create a new alert rule
 */
export async function POST(request: NextRequest) {
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

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return apiForbidden('Admin role required');
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name) {
      return apiBadRequest('Rule name is required');
    }
    if (!body.metric) {
      return apiBadRequest('Metric is required');
    }
    if (!body.operator) {
      return apiBadRequest('Operator is required');
    }
    if (body.threshold === undefined || body.threshold === null) {
      return apiBadRequest('Threshold is required');
    }
    if (!body.alertSeverity) {
      return apiBadRequest('Alert severity is required');
    }

    // Validate metric
    const validMetrics = ['error_rate', 'response_time', 'availability', 'rate_limit'];
    if (!validMetrics.includes(body.metric)) {
      return apiBadRequest(`Invalid metric. Must be one of: ${validMetrics.join(', ')}`);
    }

    // Validate operator
    const validOperators = ['gt', 'lt', 'eq'];
    if (!validOperators.includes(body.operator)) {
      return apiBadRequest(`Invalid operator. Must be one of: ${validOperators.join(', ')}`);
    }

    // Validate severity
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (!validSeverities.includes(body.alertSeverity)) {
      return apiBadRequest(`Invalid severity. Must be one of: ${validSeverities.join(', ')}`);
    }

    const { data: rule, error } = await supabase
      .from('integration_alert_rules')
      .insert({
        integration_id: body.integrationId || null,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        enabled: body.enabled !== false,
        metric: body.metric,
        operator: body.operator,
        threshold: body.threshold,
        duration_seconds: body.durationSeconds || 60,
        alert_severity: body.alertSeverity,
        notification_channels: body.notificationChannels || [],
      })
      .select()
      .single();

    if (error) {
      console.error('Alert rule creation error:', error);
      return apiServerError('Failed to create alert rule');
    }

    return apiSuccess({
      message: 'Alert rule created successfully',
      rule: {
        id: rule.id,
        name: rule.name,
        metric: rule.metric,
        operator: rule.operator,
        threshold: parseFloat(rule.threshold),
        alertSeverity: rule.alert_severity,
        enabled: rule.enabled,
      },
    });
  } catch (error) {
    console.error('Alert rules API error:', error);
    return apiServerError('Internal server error');
  }
}

/**
 * PATCH /api/integrations/monitoring/rules
 * Update an alert rule
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

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return apiForbidden('Admin role required');
    }

    const body = await request.json();

    if (!body.ruleId) {
      return apiBadRequest('Rule ID is required');
    }

    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.description !== undefined) updates.description = body.description?.trim() || null;
    if (body.enabled !== undefined) updates.enabled = body.enabled;
    if (body.metric !== undefined) updates.metric = body.metric;
    if (body.operator !== undefined) updates.operator = body.operator;
    if (body.threshold !== undefined) updates.threshold = body.threshold;
    if (body.durationSeconds !== undefined) updates.duration_seconds = body.durationSeconds;
    if (body.alertSeverity !== undefined) updates.alert_severity = body.alertSeverity;
    if (body.notificationChannels !== undefined) updates.notification_channels = body.notificationChannels;

    const { data: rule, error } = await supabase
      .from('integration_alert_rules')
      .update(updates)
      .eq('id', body.ruleId)
      .select()
      .single();

    if (error) {
      console.error('Alert rule update error:', error);
      return apiServerError('Failed to update alert rule');
    }

    return apiSuccess({
      message: 'Alert rule updated successfully',
      rule: {
        id: rule.id,
        name: rule.name,
        enabled: rule.enabled,
        updatedAt: rule.updated_at,
      },
    });
  } catch (error) {
    console.error('Alert rules API error:', error);
    return apiServerError('Internal server error');
  }
}

/**
 * DELETE /api/integrations/monitoring/rules
 * Delete an alert rule
 */
export async function DELETE(request: NextRequest) {
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

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return apiForbidden('Admin role required');
    }

    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get('ruleId');

    if (!ruleId) {
      return apiBadRequest('Rule ID is required');
    }

    const { error } = await supabase
      .from('integration_alert_rules')
      .delete()
      .eq('id', ruleId);

    if (error) {
      console.error('Alert rule deletion error:', error);
      return apiServerError('Failed to delete alert rule');
    }

    return apiSuccess({ message: 'Alert rule deleted successfully' });
  } catch (error) {
    console.error('Alert rules API error:', error);
    return apiServerError('Internal server error');
  }
}
