/**
 * Data Access Logs API Routes (LC-FEAT-037)
 * Track who accessed what data and when
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/audit/data-access
 * Retrieve data access logs (admin only)
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has admin/developer role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || !['admin', 'developer'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');
  const resourceType = searchParams.get('resourceType');
  const resourceId = searchParams.get('resourceId');
  const containsPii = searchParams.get('containsPii');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  let query = supabase
    .from('data_access_logs')
    .select('*', { count: 'exact' });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  if (resourceType) {
    query = query.eq('resource_type', resourceType);
  }

  if (resourceId) {
    query = query.eq('resource_id', resourceId);
  }

  if (containsPii === 'true') {
    query = query.eq('contains_pii', true);
  }

  if (startDate) {
    query = query.gte('created_at', startDate);
  }

  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching data access logs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: data || [],
    meta: {
      total: count || 0,
      limit,
      offset,
    },
  });
}

/**
 * POST /api/audit/data-access
 * Log a data access event
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                    request.headers.get('x-real-ip') ||
                    'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  // Determine resource owner if applicable
  let resourceOwnerId = null;
  if (body.resourceType === 'cases') {
    const { data: caseData } = await supabase
      .from('cases')
      .select('reporter_id')
      .eq('id', body.resourceId)
      .single();
    resourceOwnerId = caseData?.reporter_id;
  } else if (body.resourceType === 'profiles') {
    resourceOwnerId = body.resourceId;
  }

  const logData = {
    user_id: user.id,
    session_id: body.sessionId,
    resource_type: body.resourceType,
    resource_id: body.resourceId,
    resource_owner_id: resourceOwnerId,
    access_type: body.accessType,
    fields_accessed: body.fieldsAccessed,
    query_parameters: body.queryParameters,
    access_reason: body.accessReason,
    is_authorized: body.isAuthorized ?? true,
    authorization_rule: body.authorizationRule,
    contains_pii: body.containsPii ?? false,
    pii_fields_accessed: body.piiFieldsAccessed,
    data_sensitivity_level: body.dataSensitivityLevel,
    ip_address: ipAddress,
    user_agent: userAgent,
  };

  const { data, error } = await supabase
    .from('data_access_logs')
    .insert(logData)
    .select()
    .single();

  if (error) {
    console.error('Error logging data access:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
