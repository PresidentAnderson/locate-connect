/**
 * Facial Recognition Audit Logs API Routes (LC-FEAT-030)
 * Provides audit trail access for facial recognition operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FRAuditAction, FRAuditCategory } from '@/types/facial-recognition.types';

interface FRAuditLog {
  id: string;
  action: FRAuditAction;
  actionCategory: FRAuditCategory;
  userId?: string;
  userRole?: string;
  resourceType: string;
  resourceId: string;
  caseId?: string;
  recognitionRequestId?: string;
  actionDetails?: Record<string, unknown>;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  complianceRelevant: boolean;
  complianceFrameworks?: string[];
  personalDataAccessed: boolean;
  biometricDataAccessed: boolean;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  createdAt: string;
}

/**
 * GET /api/facial-recognition/audit
 * Retrieve facial recognition audit logs (admin only)
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

  // Check admin permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'developer'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  // Parse query parameters
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action') as FRAuditAction | null;
  const actionCategory = searchParams.get('actionCategory') as FRAuditCategory | null;
  const userId = searchParams.get('userId');
  const caseId = searchParams.get('caseId');
  const resourceType = searchParams.get('resourceType');
  const resourceId = searchParams.get('resourceId');
  const complianceRelevant = searchParams.get('complianceRelevant');
  const biometricDataAccessed = searchParams.get('biometricDataAccessed');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const limit = parseInt(searchParams.get('limit') || '100', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  // Build query with user details
  let query = supabase
    .from('facial_recognition_audit_logs')
    .select(`
      *,
      user:profiles!facial_recognition_audit_logs_user_id_fkey(
        id, email, first_name, last_name, role
      )
    `, { count: 'exact' });

  if (action) {
    query = query.eq('action', action);
  }

  if (actionCategory) {
    query = query.eq('action_category', actionCategory);
  }

  if (userId) {
    query = query.eq('user_id', userId);
  }

  if (caseId) {
    query = query.eq('case_id', caseId);
  }

  if (resourceType) {
    query = query.eq('resource_type', resourceType);
  }

  if (resourceId) {
    query = query.eq('resource_id', resourceId);
  }

  if (complianceRelevant === 'true') {
    query = query.eq('compliance_relevant', true);
  }

  if (biometricDataAccessed === 'true') {
    query = query.eq('biometric_data_accessed', true);
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
    console.error('Error fetching FR audit logs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const logs = (data || []).map((row) => mapFRAuditLogFromDb(row as Record<string, unknown>));

  return NextResponse.json({
    data: logs,
    meta: {
      total: count || 0,
      limit,
      offset,
    },
  });
}

/**
 * GET /api/facial-recognition/audit/summary
 * Get summary statistics for audit logs
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

  // Check admin permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'developer'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { startDate, endDate, groupBy = 'action' } = body as {
      startDate?: string;
      endDate?: string;
      groupBy?: 'action' | 'action_category' | 'user' | 'resource_type';
    };

    // Get total counts
    let query = supabase
      .from('facial_recognition_audit_logs')
      .select('action, action_category, user_id, resource_type, biometric_data_accessed, compliance_relevant');

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: logs, error } = await query;

    if (error) {
      console.error('Error fetching audit summary:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate summary statistics
    const summary = {
      totalLogs: logs?.length || 0,
      biometricAccessCount: logs?.filter(l => l.biometric_data_accessed).length || 0,
      complianceRelevantCount: logs?.filter(l => l.compliance_relevant).length || 0,
      byAction: groupByField(logs || [], 'action'),
      byCategory: groupByField(logs || [], 'action_category'),
      byResourceType: groupByField(logs || [], 'resource_type'),
      uniqueUsers: new Set(logs?.map(l => l.user_id).filter(Boolean)).size,
    };

    return NextResponse.json({ data: summary });

  } catch (error) {
    console.error('Audit summary error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Helper to group logs by a field
 */
function groupByField(
  logs: Record<string, unknown>[],
  field: string
): Record<string, number> {
  return logs.reduce<Record<string, number>>((acc, log) => {
    const key = (log[field] as string) || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

/**
 * Map database row to FRAuditLog type
 */
function mapFRAuditLogFromDb(row: Record<string, unknown>): FRAuditLog & { user?: Record<string, unknown> } {
  return {
    id: row.id as string,
    action: row.action as FRAuditAction,
    actionCategory: row.action_category as FRAuditCategory,
    userId: row.user_id as string | undefined,
    userRole: row.user_role as string | undefined,
    resourceType: row.resource_type as string,
    resourceId: row.resource_id as string,
    caseId: row.case_id as string | undefined,
    recognitionRequestId: row.recognition_request_id as string | undefined,
    actionDetails: row.action_details as Record<string, unknown> | undefined,
    previousState: row.previous_state as Record<string, unknown> | undefined,
    newState: row.new_state as Record<string, unknown> | undefined,
    complianceRelevant: row.compliance_relevant as boolean,
    complianceFrameworks: row.compliance_frameworks as string[] | undefined,
    personalDataAccessed: row.personal_data_accessed as boolean,
    biometricDataAccessed: row.biometric_data_accessed as boolean,
    ipAddress: row.ip_address as string | undefined,
    userAgent: row.user_agent as string | undefined,
    sessionId: row.session_id as string | undefined,
    createdAt: row.created_at as string,
    user: row.user as Record<string, unknown> | undefined,
  };
}
