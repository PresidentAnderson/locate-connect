import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiUnauthorized,
  apiServerError,
  apiForbidden,
} from '@/lib/api/response';
import {
  getCredentialsVault,
  type AccessControlContext,
} from '@/lib/integrations/credentials-vault';

/**
 * GET /api/integrations/credentials/expiring
 * Get credentials expiring within specified days
 */
export async function GET(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days');
    const days = daysParam ? parseInt(daysParam, 10) : 30;

    if (isNaN(days) || days < 1 || days > 365) {
      return apiSuccess([], {
        warning: 'Invalid days parameter, using default of 30',
      });
    }

    const context: AccessControlContext = {
      userId: user.id,
      userRole: profile.role as any,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    };

    const vault = getCredentialsVault();
    const expiring = await vault.getExpiringCredentials(context, days);

    // Categorize by urgency
    const critical = expiring.filter((c) => c.daysUntilExpiry <= 7);
    const warning = expiring.filter(
      (c) => c.daysUntilExpiry > 7 && c.daysUntilExpiry <= 14
    );
    const upcoming = expiring.filter((c) => c.daysUntilExpiry > 14);

    return apiSuccess({
      total: expiring.length,
      daysChecked: days,
      critical: {
        count: critical.length,
        credentials: critical,
      },
      warning: {
        count: warning.length,
        credentials: warning,
      },
      upcoming: {
        count: upcoming.length,
        credentials: upcoming,
      },
    });
  } catch (error) {
    console.error('Expiring credentials error:', error);
    return apiServerError('Internal server error');
  }
}
