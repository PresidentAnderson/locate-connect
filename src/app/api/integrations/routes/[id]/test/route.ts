import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiUnauthorized,
  apiServerError,
  apiForbidden,
  apiNotFound,
  apiBadRequest,
} from '@/lib/api/response';
import { executeRoute } from '@/lib/integrations/route-binding';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/integrations/routes/[id]/test
 * Test execute a route binding with sample data
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

    // Get the route
    const { data: route, error: routeError } = await supabase
      .from('integration_routes')
      .select('id, route_path, route_method, name, is_enabled')
      .eq('id', id)
      .single();

    if (routeError || !route) {
      return apiNotFound('Route not found');
    }

    if (!route.is_enabled) {
      return apiBadRequest('Route is disabled');
    }

    // Get test data from request body
    const body = await request.json().catch(() => ({}));
    const testRequest = {
      method: route.route_method,
      path: route.route_path,
      query: body.query || {},
      body: body.body || {},
      headers: body.headers || {},
    };

    // Execute the route
    const result = await executeRoute(
      route.route_path,
      route.route_method,
      testRequest
    );

    return apiSuccess({
      route: {
        id: route.id,
        name: route.name,
        path: route.route_path,
        method: route.route_method,
      },
      testRequest,
      result: {
        success: result.success,
        status: result.status,
        data: result.data,
        errors: result.errors,
        durationMs: result.metadata.durationMs,
        integrationCalls: result.metadata.integrationCalls,
        aggregationStrategy: result.metadata.aggregationStrategy,
      },
    });
  } catch (error) {
    console.error('Route test error:', error);
    return apiServerError('Internal server error');
  }
}
