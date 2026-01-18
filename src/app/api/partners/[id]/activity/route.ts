import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { PartnerActivity, PartnerActivityType } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/partners/[id]/activity
 * Get activity log for a partner organization
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: partnerId } = await params;
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const activityType = searchParams.get('activity_type') as PartnerActivityType | null;
  const caseId = searchParams.get('case_id');
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = Math.min(parseInt(searchParams.get('page_size') || '20'), 100);

  let query = supabase
    .from('partner_activity_log')
    .select(
      `
      *,
      member:partner_members(id, name, email),
      case:cases(id, case_number, first_name, last_name)
    `,
      { count: 'exact' }
    )
    .eq('partner_id', partnerId);

  // Apply filters
  if (activityType) {
    query = query.eq('activity_type', activityType);
  }

  if (caseId) {
    query = query.eq('case_id', caseId);
  }

  if (startDate) {
    query = query.gte('created_at', startDate);
  }

  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  // Pagination
  const offset = (page - 1) * pageSize;
  query = query.range(offset, offset + pageSize - 1);

  // Order by most recent
  query = query.order('created_at', { ascending: false });

  const { data, error, count } = await query;

  if (error) {
    console.error('Partner activity fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: data as PartnerActivity[],
    total: count || 0,
    page,
    page_size: pageSize,
  });
}
