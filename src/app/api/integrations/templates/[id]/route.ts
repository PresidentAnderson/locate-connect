import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiUnauthorized,
  apiServerError,
  apiForbidden,
  apiNotFound,
} from '@/lib/api/response';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/integrations/templates/[id]
 * Get a specific template with full details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiUnauthorized('Authentication required');
    }

    const { data: template, error } = await supabase
      .from('integration_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !template) {
      return apiNotFound('Template not found');
    }

    // Increment view count (non-blocking)
    supabase
      .from('integration_templates')
      .update({ usage_count: template.usage_count })
      .eq('id', id)
      .then(() => {});

    return apiSuccess({
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        category: template.category,
        provider: template.provider,
        version: template.version,
        configTemplate: template.config_template,
        credentialRequirements: template.credential_requirements,
        endpointsTemplate: template.endpoints_template,
        documentation: template.documentation,
        setupGuide: template.setup_guide,
        logoUrl: template.logo_url,
        rating: parseFloat(template.rating) || 0,
        ratingCount: template.rating_count,
        usageCount: template.usage_count,
        tags: template.tags,
        isOfficial: template.is_official,
        isVerified: template.is_verified,
        createdAt: template.created_at,
        updatedAt: template.updated_at,
      },
    });
  } catch (error) {
    console.error('Template fetch error:', error);
    return apiServerError('Internal server error');
  }
}

/**
 * PATCH /api/integrations/templates/[id]
 * Update a template (admin only)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
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

    // Check template exists
    const { data: existing } = await supabase
      .from('integration_templates')
      .select('id')
      .eq('id', id)
      .single();

    if (!existing) {
      return apiNotFound('Template not found');
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    // Map camelCase to snake_case
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.category !== undefined) updates.category = body.category;
    if (body.provider !== undefined) updates.provider = body.provider;
    if (body.version !== undefined) updates.version = body.version;
    if (body.configTemplate !== undefined) updates.config_template = body.configTemplate;
    if (body.credentialRequirements !== undefined) updates.credential_requirements = body.credentialRequirements;
    if (body.endpointsTemplate !== undefined) updates.endpoints_template = body.endpointsTemplate;
    if (body.documentation !== undefined) updates.documentation = body.documentation;
    if (body.setupGuide !== undefined) updates.setup_guide = body.setupGuide;
    if (body.logoUrl !== undefined) updates.logo_url = body.logoUrl;
    if (body.tags !== undefined) updates.tags = body.tags;
    if (body.isPublished !== undefined) updates.is_published = body.isPublished;

    // Only super_admin can set official/verified
    if (profile.role === 'super_admin') {
      if (body.isOfficial !== undefined) updates.is_official = body.isOfficial;
      if (body.isVerified !== undefined) updates.is_verified = body.isVerified;
    }

    const { data: template, error } = await supabase
      .from('integration_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating template:', error);
      return apiServerError('Failed to update template');
    }

    return apiSuccess({
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        category: template.category,
        provider: template.provider,
        version: template.version,
        isOfficial: template.is_official,
        isVerified: template.is_verified,
        isPublished: template.is_published,
        updatedAt: template.updated_at,
      },
    });
  } catch (error) {
    console.error('Template update error:', error);
    return apiServerError('Internal server error');
  }
}

/**
 * DELETE /api/integrations/templates/[id]
 * Delete a template (admin only)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
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

    // Check template exists
    const { data: existing } = await supabase
      .from('integration_templates')
      .select('id, name, is_official')
      .eq('id', id)
      .single();

    if (!existing) {
      return apiNotFound('Template not found');
    }

    // Prevent deletion of official templates
    if (existing.is_official && profile.role !== 'super_admin') {
      return apiForbidden('Cannot delete official templates');
    }

    const { error } = await supabase
      .from('integration_templates')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting template:', error);
      return apiServerError('Failed to delete template');
    }

    return apiSuccess({ message: `Template "${existing.name}" deleted successfully` });
  } catch (error) {
    console.error('Template deletion error:', error);
    return apiServerError('Internal server error');
  }
}
