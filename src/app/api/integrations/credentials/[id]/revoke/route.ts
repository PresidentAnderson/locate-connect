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

interface RevokeCredentialInput {
  reason: string;
}

/**
 * POST /api/integrations/credentials/[id]/revoke
 * Revoke a credential (marks as unusable but doesn't delete)
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

    const body: RevokeCredentialInput = await request.json();

    // Validate required fields
    if (!body.reason || body.reason.trim().length < 3) {
      return apiBadRequest(
        'Revocation reason is required (minimum 3 characters)',
        'invalid_reason'
      );
    }

    const context: AccessControlContext = {
      userId: user.id,
      userRole: profile.role as any,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    };

    const vault = getCredentialsVault();

    try {
      await vault.revoke(context, id, body.reason.trim());

      return apiSuccess({
        id,
        status: 'revoked',
        revokedAt: new Date().toISOString(),
        revokedBy: user.id,
        reason: body.reason.trim(),
        message: 'Credential revoked successfully',
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
    console.error('Credential revoke error:', error);
    return apiServerError('Internal server error');
  }
}
