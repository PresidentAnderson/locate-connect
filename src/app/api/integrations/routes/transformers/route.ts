import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiUnauthorized,
  apiServerError,
  apiForbidden,
} from '@/lib/api/response';

/**
 * GET /api/integrations/routes/transformers
 * List available route transformers
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

    // Check coordinator+ role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['coordinator', 'investigator', 'admin', 'super_admin'].includes(profile.role)) {
      return apiForbidden('Coordinator role or higher required');
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const builtinOnly = searchParams.get('builtin') === 'true';

    let query = supabase
      .from('route_transformers')
      .select('*')
      .eq('is_enabled', true)
      .order('is_builtin', { ascending: false })
      .order('name');

    if (type) {
      query = query.eq('transform_type', type);
    }

    if (builtinOnly) {
      query = query.eq('is_builtin', true);
    }

    const { data: transformers, error } = await query;

    if (error) {
      console.error('Error fetching transformers:', error);
      return apiServerError('Failed to fetch transformers');
    }

    const transformedData = transformers?.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      transformType: t.transform_type,
      transformExpression: t.transform_expression,
      inputSchema: t.input_schema,
      outputSchema: t.output_schema,
      isEnabled: t.is_enabled,
      isBuiltin: t.is_builtin,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      createdBy: t.created_by,
    }));

    return apiSuccess({
      transformers: transformedData,
      total: transformers?.length || 0,
    });
  } catch (error) {
    console.error('Transformer listing error:', error);
    return apiServerError('Internal server error');
  }
}
