/**
 * Integration Logs API Route
 * Fetches API request/response logs for integration monitoring
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiUnauthorized,
  apiServerError,
  apiForbidden,
} from '@/lib/api/response';

interface IntegrationLogRow {
  id: string;
  integration_id: string;
  request_method: string;
  request_path: string;
  request_headers?: Record<string, string>;
  request_body?: string;
  status_code: number;
  response_time_ms: number;
  response_headers?: Record<string, string>;
  response_body?: string;
  error_message?: string;
  error_details?: Record<string, unknown>;
  user_id?: string;
  ip_address?: string;
  created_at: string;
  integrations?: {
    name: string;
    category: string;
  }[] | null;
}

/**
 * GET /api/integrations/logs
 * Fetch integration request logs with filtering
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const integrationId = searchParams.get('integrationId');
    const statusFilter = searchParams.get('status'); // 'success', 'error', 'all'
    const method = searchParams.get('method');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build query with integration join
    let query = supabase
      .from('integration_request_logs')
      .select(`
        id,
        integration_id,
        request_method,
        request_path,
        request_headers,
        status_code,
        response_time_ms,
        error_message,
        error_details,
        user_id,
        ip_address,
        created_at,
        integrations:integration_id (name, category)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (integrationId) {
      query = query.eq('integration_id', integrationId);
    }

    if (statusFilter === 'success') {
      query = query.gte('status_code', 200).lt('status_code', 400);
    } else if (statusFilter === 'error') {
      query = query.gte('status_code', 400);
    }

    if (method) {
      query = query.eq('request_method', method.toUpperCase());
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    if (search) {
      query = query.or(`request_path.ilike.%${search}%,error_message.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[IntegrationLogs] Database error:', error);
      return apiServerError('Failed to fetch logs');
    }

    // Transform to camelCase for frontend
    const logs = ((data as IntegrationLogRow[] | null) || []).map(row => {
      const integration = Array.isArray(row.integrations) ? row.integrations[0] : row.integrations;
      return {
        id: row.id,
        integrationId: row.integration_id,
        integrationName: integration?.name || 'Unknown',
        integrationCategory: integration?.category || 'unknown',
        requestMethod: row.request_method,
        requestPath: row.request_path,
        requestHeaders: row.request_headers,
        statusCode: row.status_code,
        responseTimeMs: row.response_time_ms,
        errorMessage: row.error_message || null,
        errorDetails: row.error_details || null,
        userId: row.user_id,
        ipAddress: row.ip_address,
        createdAt: row.created_at,
      };
    });

    // Calculate summary stats
    const totalLogs = count || logs.length;
    const successLogs = logs.filter(l => l.statusCode >= 200 && l.statusCode < 400).length;
    const errorLogs = logs.filter(l => l.statusCode >= 400).length;
    const avgResponseTime = logs.length > 0
      ? Math.round(logs.reduce((sum, l) => sum + l.responseTimeMs, 0) / logs.length)
      : 0;

    return apiSuccess({
      logs,
      summary: {
        total: totalLogs,
        success: successLogs,
        errors: errorLogs,
        avgResponseTimeMs: avgResponseTime,
      },
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    console.error('[IntegrationLogs] Error:', error);
    return apiServerError('Internal server error');
  }
}
