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
import type { IntegrationCategory, IntegrationTemplate } from '@/types';

interface CreateTemplateInput {
  name: string;
  description: string;
  category: IntegrationCategory;
  provider: string;
  configTemplate: Record<string, unknown>;
  credentialRequirements: IntegrationTemplate['credentialRequirements'];
  endpointsTemplate?: Record<string, unknown>[];
  documentation?: string;
  setupGuide?: string;
  tags?: string[];
  logoUrl?: string;
}

/**
 * GET /api/integrations/templates
 * List integration templates (marketplace)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as IntegrationCategory | null;
    const provider = searchParams.get('provider');
    const search = searchParams.get('search');
    const tags = searchParams.get('tags')?.split(',');
    const official = searchParams.get('official');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from('integration_templates')
      .select('*', { count: 'exact' })
      .eq('is_published', true);

    if (category) {
      query = query.eq('category', category);
    }
    if (provider) {
      query = query.ilike('provider', `%${provider}%`);
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }
    if (tags && tags.length > 0) {
      query = query.overlaps('tags', tags);
    }
    if (official === 'true') {
      query = query.eq('is_official', true);
    }

    const { data, error, count } = await query
      .order('usage_count', { ascending: false })
      .order('rating', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('Templates fetch error:', error);
      return apiServerError('Failed to fetch templates');
    }

    return apiSuccess(data, {
      total: count || 0,
      page,
      page_size: pageSize,
      total_pages: Math.ceil((count || 0) / pageSize),
    });
  } catch (error) {
    console.error('Templates API error:', error);
    return apiServerError('Internal server error');
  }
}

/**
 * POST /api/integrations/templates
 * Create a new integration template
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

    const body: CreateTemplateInput = await request.json();

    // Validate required fields
    if (!body.name || body.name.trim().length < 3) {
      return apiBadRequest('Name must be at least 3 characters', 'invalid_name');
    }

    if (!body.description || body.description.trim().length < 10) {
      return apiBadRequest('Description must be at least 10 characters', 'invalid_description');
    }

    if (!body.category) {
      return apiBadRequest('Category is required', 'invalid_category');
    }

    if (!body.provider) {
      return apiBadRequest('Provider is required', 'invalid_provider');
    }

    if (!body.configTemplate) {
      return apiBadRequest('Config template is required', 'invalid_config');
    }

    if (!body.credentialRequirements || body.credentialRequirements.length === 0) {
      return apiBadRequest('Credential requirements are required', 'invalid_credentials');
    }

    const { data, error } = await supabase
      .from('integration_templates')
      .insert({
        name: body.name.trim(),
        description: body.description.trim(),
        category: body.category,
        provider: body.provider.trim(),
        config_template: body.configTemplate,
        credential_requirements: body.credentialRequirements,
        endpoints_template: body.endpointsTemplate || [],
        documentation: body.documentation,
        setup_guide: body.setupGuide,
        logo_url: body.logoUrl,
        tags: body.tags || [],
        is_official: false,
        is_verified: false,
        is_published: true,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Template creation error:', error);
      return apiServerError('Failed to create template');
    }

    return apiCreated(data);
  } catch (error) {
    console.error('Templates API error:', error);
    return apiServerError('Internal server error');
  }
}
