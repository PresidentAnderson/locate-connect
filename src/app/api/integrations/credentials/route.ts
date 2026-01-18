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
import { getCredentialsVault, type AccessControlContext } from '@/lib/integrations/credentials-vault';
import type { AuthenticationType, CredentialData } from '@/types';

interface CreateCredentialInput {
  name: string;
  type: AuthenticationType;
  integrationId?: string;
  data: CredentialData;
  allowedUsers?: string[];
  allowedRoles?: string[];
  expiresAt?: string;
}

/**
 * GET /api/integrations/credentials
 * List credentials (metadata only, no secrets)
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const integrationId = searchParams.get('integrationId');
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from('integration_credentials')
      .select(
        'id, name, type, integration_id, status, expires_at, rotation_schedule, last_rotated, rotation_count, created_at, updated_at, created_by, last_accessed_at',
        { count: 'exact' }
      );

    if (integrationId) {
      query = query.eq('integration_id', integrationId);
    }
    if (type) {
      query = query.eq('type', type);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('Credentials fetch error:', error);
      return apiServerError('Failed to fetch credentials');
    }

    return apiSuccess(data, {
      total: count || 0,
      page,
      page_size: pageSize,
      total_pages: Math.ceil((count || 0) / pageSize),
    });
  } catch (error) {
    console.error('Credentials API error:', error);
    return apiServerError('Internal server error');
  }
}

/**
 * POST /api/integrations/credentials
 * Store a new credential
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

    const body: CreateCredentialInput = await request.json();

    // Validate required fields
    if (!body.name || body.name.trim().length < 3) {
      return apiBadRequest('Name must be at least 3 characters', 'invalid_name');
    }

    if (!body.type) {
      return apiBadRequest('Credential type is required', 'invalid_type');
    }

    if (!body.data || Object.keys(body.data).length === 0) {
      return apiBadRequest('Credential data is required', 'invalid_data');
    }

    // Build access control context
    const context: AccessControlContext = {
      userId: user.id,
      userRole: profile.role as any,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    };

    // Use credentials vault to store
    const vault = getCredentialsVault();
    const credential = await vault.store(context, {
      name: body.name.trim(),
      type: body.type,
      integrationId: body.integrationId,
      data: body.data,
      allowedUsers: body.allowedUsers,
      allowedRoles: body.allowedRoles || ['admin', 'super_admin'],
      expiresAt: body.expiresAt,
    });

    // Also store in database (encrypted)
    const { data, error } = await supabase
      .from('integration_credentials')
      .insert({
        id: credential.id,
        name: credential.name,
        type: credential.type,
        integration_id: body.integrationId,
        encrypted_data: credential.encryptedData,
        encryption_key_id: credential.encryptionKeyId,
        iv: credential.iv,
        auth_tag: credential.authTag,
        allowed_users: credential.allowedUsers,
        allowed_roles: credential.allowedRoles,
        expires_at: credential.expiresAt,
        created_by: user.id,
        status: 'active',
      })
      .select('id, name, type, integration_id, status, expires_at, created_at')
      .single();

    if (error) {
      console.error('Credential storage error:', error);
      return apiServerError('Failed to store credential');
    }

    // Link to integration if specified
    if (body.integrationId) {
      await supabase
        .from('integrations')
        .update({ credential_id: data.id })
        .eq('id', body.integrationId);
    }

    return apiCreated(data);
  } catch (error) {
    console.error('Credentials API error:', error);
    return apiServerError('Internal server error');
  }
}
