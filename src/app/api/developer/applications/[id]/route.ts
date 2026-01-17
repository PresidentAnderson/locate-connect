import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiSuccess, apiBadRequest, apiUnauthorized, apiNotFound, apiServerError, apiForbidden, apiNoContent } from '@/lib/api/response';
import type { UpdateApiApplicationInput } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/developer/applications/[id]
 * Get a specific API application
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

    // Get the application
    const { data, error } = await supabase
      .from('api_applications')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return apiNotFound('Application not found');
      }
      console.error('Application fetch error:', error);
      return apiServerError('Failed to fetch application');
    }

    // Check ownership
    if (data.owner_id !== user.id) {
      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || !['admin', 'developer'].includes(profile.role)) {
        return apiForbidden('Access denied');
      }
    }

    return apiSuccess(data);
  } catch (error) {
    console.error('Application API error:', error);
    return apiServerError('Internal server error');
  }
}

/**
 * PATCH /api/developer/applications/[id]
 * Update an API application
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
    const { data: existingApp, error: fetchError } = await supabase
      .from('api_applications')
      .select('owner_id')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return apiNotFound('Application not found');
      }
      return apiServerError('Failed to fetch application');
    }

    if (existingApp.owner_id !== user.id) {
      return apiForbidden('Access denied');
    }

    const body: UpdateApiApplicationInput = await request.json();

    // Build update object
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.description !== undefined) updates.description = body.description?.trim() || null;
    if (body.website_url !== undefined) updates.website_url = body.website_url?.trim() || null;
    if (body.callback_urls !== undefined) updates.callback_urls = body.callback_urls;
    if (body.logo_url !== undefined) updates.logo_url = body.logo_url?.trim() || null;
    if (body.organization_name !== undefined) updates.organization_name = body.organization_name?.trim() || null;
    if (body.organization_type !== undefined) updates.organization_type = body.organization_type?.trim() || null;
    if (body.organization_contact_email !== undefined) updates.organization_contact_email = body.organization_contact_email?.trim() || null;
    if (body.organization_contact_phone !== undefined) updates.organization_contact_phone = body.organization_contact_phone?.trim() || null;

    if (Object.keys(updates).length === 0) {
      return apiBadRequest('No updates provided', 'no_updates');
    }

    // Update the application
    const { data, error } = await supabase
      .from('api_applications')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Application update error:', error);
      return apiServerError('Failed to update application');
    }

    return apiSuccess(data);
  } catch (error) {
    console.error('Application API error:', error);
    return apiServerError('Internal server error');
  }
}

/**
 * DELETE /api/developer/applications/[id]
 * Delete an API application
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
    const { data: existingApp, error: fetchError } = await supabase
      .from('api_applications')
      .select('owner_id')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return apiNotFound('Application not found');
      }
      return apiServerError('Failed to fetch application');
    }

    if (existingApp.owner_id !== user.id) {
      return apiForbidden('Access denied');
    }

    // Delete the application (cascades to keys, webhooks, etc.)
    const { error } = await supabase
      .from('api_applications')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Application delete error:', error);
      return apiServerError('Failed to delete application');
    }

    return apiNoContent();
  } catch (error) {
    console.error('Application API error:', error);
    return apiServerError('Internal server error');
  }
}
