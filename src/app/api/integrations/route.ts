import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiBadRequest,
  apiUnauthorized,
  apiServerError,
  apiCreated,
  apiForbidden,
} from '@/lib/api/response';
import type { Integration, IntegrationCategory, AuthenticationType } from '@/types';

interface CreateIntegrationInput {
  name: string;
  description?: string;
  category: IntegrationCategory;
  provider: string;
  baseUrl: string;
  authType: AuthenticationType;
  config?: Record<string, unknown>;
  rateLimit?: {
    requestsPerMinute?: number;
    requestsPerHour?: number;
    requestsPerDay?: number;
  };
}

/**
 * GET /api/integrations
 * List all integrations
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiUnauthorized('Authentication required');
    }

    // Check user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['coordinator', 'investigator', 'admin', 'super_admin'].includes(profile.role)) {
      return apiForbidden('Insufficient permissions');
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as IntegrationCategory | null;
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from('integrations')
      .select('*', { count: 'exact' });

    if (category) {
      query = query.eq('category', category);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('Integrations fetch error:', error);
      return apiServerError('Failed to fetch integrations');
    }

    return apiSuccess(data, {
      total: count || 0,
      page,
      page_size: pageSize,
      total_pages: Math.ceil((count || 0) / pageSize),
    });
  } catch (error) {
    console.error('Integrations API error:', error);
    return apiServerError('Internal server error');
  }
}

/**
 * POST /api/integrations
 * Create a new integration
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiUnauthorized('Authentication required');
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return apiForbidden('Admin role required');
    }

    const body: CreateIntegrationInput = await request.json();

    // Validate required fields
    if (!body.name || body.name.trim().length < 3) {
      return apiBadRequest('Name must be at least 3 characters', 'invalid_name');
    }

    if (!body.baseUrl || !body.baseUrl.match(/^https?:\/\//)) {
      return apiBadRequest('Valid base URL required', 'invalid_base_url');
    }

    if (!body.category) {
      return apiBadRequest('Category is required', 'invalid_category');
    }

    if (!body.authType) {
      return apiBadRequest('Authentication type is required', 'invalid_auth_type');
    }

    // Create integration
    const { data, error } = await supabase
      .from('integrations')
      .insert({
        name: body.name.trim(),
        description: body.description?.trim(),
        category: body.category,
        provider: body.provider?.trim() || 'unknown',
        base_url: body.baseUrl.trim(),
        auth_type: body.authType,
        config: body.config || {},
        rate_limit_per_minute: body.rateLimit?.requestsPerMinute || 60,
        rate_limit_per_hour: body.rateLimit?.requestsPerHour || 1000,
        rate_limit_per_day: body.rateLimit?.requestsPerDay || 10000,
        status: 'pending',
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Integration creation error:', error);
      return apiServerError('Failed to create integration');
    }

    // Create connector record
    await supabase
      .from('integration_connectors')
      .insert({
        integration_id: data.id,
        state: 'disconnected',
      });

    return apiCreated(data);
  } catch (error) {
    console.error('Integrations API error:', error);
    return apiServerError('Internal server error');
  }
}
