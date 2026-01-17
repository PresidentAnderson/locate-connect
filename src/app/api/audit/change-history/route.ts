/**
 * Record Change History API Routes (LC-FEAT-037)
 * Complete audit trail for all record modifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/audit/change-history
 * Retrieve change history for records
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
  const tableName = searchParams.get('tableName');
  const recordId = searchParams.get('recordId');
  const changedBy = searchParams.get('changedBy');
  const operation = searchParams.get('operation');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  let query = supabase
    .from('record_change_history')
    .select('*', { count: 'exact' });

  if (tableName) {
    query = query.eq('table_name', tableName);
  }

  if (recordId) {
    query = query.eq('record_id', recordId);
  }

  if (changedBy) {
    query = query.eq('changed_by', changedBy);
  }

  if (operation) {
    query = query.eq('operation', operation);
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
    console.error('Error fetching change history:', error);
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
 * GET /api/audit/change-history/[recordId]
 * Get complete version history for a specific record
 */
export async function getRecordVersionHistory(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  tableName: string,
  recordId: string
) {
  const { data, error } = await supabase
    .from('record_change_history')
    .select('*')
    .eq('table_name', tableName)
    .eq('record_id', recordId)
    .order('version_number', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}
