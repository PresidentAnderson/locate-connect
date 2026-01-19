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
import type { CredentialData } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface RotateCredentialInput {
  data: CredentialData;
  reason?: string;
}

/**
 * POST /api/integrations/credentials/[id]/rotate
 * Rotate credential with new secret data
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    const body: RotateCredentialInput = await request.json();

    // Validate required fields
    if (!body.data || Object.keys(body.data).length === 0) {
      return apiBadRequest('New credential data is required', 'invalid_data');
    }

    const context: AccessControlContext = {
      userId: user.id,
      userRole: profile.role as any,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    };

    const vault = getCredentialsVault();

    try {
      const rotated = await vault.rotate(context, id, body.data, body.reason);

      // Return metadata without encrypted data
      return apiSuccess({
        id: rotated.id,
        name: rotated.name,
        type: rotated.type,
        status: rotated.status,
        lastRotated: rotated.lastRotated,
        rotationCount: rotated.rotationCount,
        updatedAt: rotated.updatedAt,
        message: 'Credential rotated successfully',
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Credential not found') {
          return apiNotFound('Credential not found');
        }
        if (error.message.includes('denied')) {
          return apiForbidden(error.message);
        }
      }
      throw error;
    }
  } catch (error) {
    console.error('Credential rotate error:', error);
    return apiServerError('Internal server error');
  }
}
