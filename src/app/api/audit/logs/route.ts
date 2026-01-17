/**
 * Audit Logs API Routes (LC-FEAT-037)
 * Comprehensive audit log management and querying
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  AuditLogFilters,
  mapAuditLogFromDb,
  AuditActionType,
} from '@/types/audit.types';

/**
 * GET /api/audit/logs
 * Retrieve audit logs with filtering and pagination
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Check authentication
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

  // Parse query parameters
  const searchParams = request.nextUrl.searchParams;
  const filters: AuditLogFilters = {
    userId: searchParams.get('userId') || undefined,
    action: searchParams.get('action') as AuditActionType | undefined,
    resourceType: searchParams.get('resourceType') || undefined,
    resourceId: searchParams.get('resourceId') || undefined,
    startDate: searchParams.get('startDate') || undefined,
    endDate: searchParams.get('endDate') || undefined,
    complianceRelevant: searchParams.get('complianceRelevant') === 'true' ? true : undefined,
    isSensitiveData: searchParams.get('isSensitiveData') === 'true' ? true : undefined,
    ipAddress: searchParams.get('ipAddress') || undefined,
    limit: parseInt(searchParams.get('limit') || '50', 10),
    offset: parseInt(searchParams.get('offset') || '0', 10),
  };

  // Build query
  let query = supabase
    .from('comprehensive_audit_logs')
    .select('*', { count: 'exact' });

  if (filters.userId) {
    query = query.eq('user_id', filters.userId);
  }

  if (filters.action) {
    query = query.eq('action', filters.action);
  }

  if (filters.resourceType) {
    query = query.eq('resource_type', filters.resourceType);
  }

  if (filters.resourceId) {
    query = query.eq('resource_id', filters.resourceId);
  }

  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate);
  }

  if (filters.endDate) {
    query = query.lte('created_at', filters.endDate);
  }

  if (filters.complianceRelevant !== undefined) {
    query = query.eq('compliance_relevant', filters.complianceRelevant);
  }

  if (filters.isSensitiveData !== undefined) {
    query = query.eq('is_sensitive_data', filters.isSensitiveData);
  }

  if (filters.ipAddress) {
    query = query.eq('ip_address', filters.ipAddress);
  }

  // Apply pagination and ordering
  query = query
    .order('created_at', { ascending: false })
    .range(filters.offset!, filters.offset! + filters.limit! - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const logs = (data || []).map((row) => mapAuditLogFromDb(row as Record<string, unknown>));

  return NextResponse.json({
    data: logs,
    meta: {
      total: count || 0,
      limit: filters.limit,
      offset: filters.offset,
    },
  });
}

/**
 * POST /api/audit/logs
 * Create a new audit log entry (internal use)
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

  // Get IP and user agent from request
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                    request.headers.get('x-real-ip') ||
                    'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, role, organization')
    .eq('id', user.id)
    .single();

  const logData = {
    user_id: user.id,
    session_id: body.sessionId || null,
    actor_email: profile?.email,
    actor_role: profile?.role,
    actor_organization: profile?.organization,
    action: body.action,
    action_description: body.actionDescription,
    resource_type: body.resourceType,
    resource_id: body.resourceId,
    resource_name: body.resourceName,
    old_values: body.oldValues,
    new_values: body.newValues,
    ip_address: ipAddress,
    user_agent: userAgent,
    request_method: body.requestMethod,
    request_path: body.requestPath,
    is_sensitive_data: body.isSensitiveData || false,
    compliance_relevant: body.complianceRelevant || false,
    compliance_frameworks: body.complianceFrameworks,
  };

  const { data, error } = await supabase
    .from('comprehensive_audit_logs')
    .insert(logData)
    .select()
    .single();

  if (error) {
    console.error('Error creating audit log:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(mapAuditLogFromDb(data as Record<string, unknown>), { status: 201 });
}
