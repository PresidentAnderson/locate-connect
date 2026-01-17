import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiSuccess, apiBadRequest, apiUnauthorized, apiServerError, apiCreated } from '@/lib/api/response';
import type { CreateApiApplicationInput, ApiApplication } from '@/types';

/**
 * GET /api/developer/applications
 * List all API applications for the current user
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
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const offset = (page - 1) * pageSize;

    // Get applications
    const { data, error, count } = await supabase
      .from('api_applications')
      .select('*', { count: 'exact' })
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('Applications fetch error:', error);
      return apiServerError('Failed to fetch applications');
    }

    return apiSuccess(data, {
      total: count || 0,
      page,
      page_size: pageSize,
      total_pages: Math.ceil((count || 0) / pageSize),
    });
  } catch (error) {
    console.error('Applications API error:', error);
    return apiServerError('Internal server error');
  }
}

/**
 * POST /api/developer/applications
 * Create a new API application
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiUnauthorized('Authentication required');
    }

    const body: CreateApiApplicationInput = await request.json();

    // Validate required fields
    if (!body.name || body.name.trim().length < 3) {
      return apiBadRequest('Application name must be at least 3 characters', 'invalid_name');
    }

    // Create the application
    const { data, error } = await supabase
      .from('api_applications')
      .insert({
        owner_id: user.id,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        website_url: body.website_url?.trim() || null,
        callback_urls: body.callback_urls || [],
        organization_name: body.organization_name?.trim() || null,
        organization_type: body.organization_type?.trim() || null,
        organization_contact_email: body.organization_contact_email?.trim() || null,
        organization_contact_phone: body.organization_contact_phone?.trim() || null,
        access_level: 'public', // Default to public, upgrade requires verification
        terms_accepted_at: new Date().toISOString(),
        terms_version: '1.0',
      })
      .select()
      .single();

    if (error) {
      console.error('Application creation error:', error);
      return apiServerError('Failed to create application');
    }

    return apiCreated(data);
  } catch (error) {
    console.error('Applications API error:', error);
    return apiServerError('Internal server error');
  }
}
