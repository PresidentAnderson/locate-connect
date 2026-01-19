import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiBadRequest,
  apiUnauthorized,
  apiNotFound,
  apiServerError,
  apiForbidden,
} from '@/lib/api/response';
import {
  getCredentialsVault,
  type AccessControlContext,
} from '@/lib/integrations/credentials-vault';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/integrations/credentials/[id]
 * Get credential metadata (without decrypted secrets)
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

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return apiForbidden('Admin role required');
    }

    const context: AccessControlContext = {
      userId: user.id,
      userRole: profile.role as any,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    };

    const vault = getCredentialsVault();
    const metadata = await vault.getMetadata(context, id);

    if (!metadata) {
      return apiNotFound('Credential not found');
    }

    return apiSuccess(metadata);
  } catch (error) {
    console.error('Credential GET error:', error);
    return apiServerError('Internal server error');
  }
}

/**
 * PATCH /api/integrations/credentials/[id]
 * Update credential metadata (not the secret data - use rotate for that)
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

    const body = await request.json();

    // Validate update fields
    const allowedFields = [
      'name',
      'expiresAt',
      'rotationSchedule',
      'allowedUsers',
      'allowedRoles',
    ];
    const updateFields: Record<string, any> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        // Map camelCase to snake_case
        const dbField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
        updateFields[dbField] = body[field];
      }
    }

    if (Object.keys(updateFields).length === 0) {
      return apiBadRequest('No valid fields to update');
    }

    // Add updated_at
    updateFields.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('integration_credentials')
      .update(updateFields)
      .eq('id', id)
      .select(
        'id, name, type, integration_id, status, expires_at, rotation_schedule, last_rotated, updated_at'
      )
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return apiNotFound('Credential not found');
      }
      console.error('Credential update error:', error);
      return apiServerError('Failed to update credential');
    }

    return apiSuccess(data);
  } catch (error) {
    console.error('Credential PATCH error:', error);
    return apiServerError('Internal server error');
  }
}

/**
 * DELETE /api/integrations/credentials/[id]
 * Permanently delete a credential
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

    // Check super_admin role (only super_admin can delete)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'super_admin') {
      return apiForbidden('Super admin role required for deletion');
    }

    const context: AccessControlContext = {
      userId: user.id,
      userRole: profile.role as any,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    };

    const { searchParams } = new URL(request.url);
    const reason = searchParams.get('reason') || 'Deleted by admin';

    const vault = getCredentialsVault();

    try {
      await vault.delete(context, id, reason);
      return apiSuccess({ deleted: true, id });
    } catch (error) {
      if (error instanceof Error && error.message === 'Credential not found') {
        return apiNotFound('Credential not found');
      }
      throw error;
    }
  } catch (error) {
    console.error('Credential DELETE error:', error);
    return apiServerError('Internal server error');
  }
}
