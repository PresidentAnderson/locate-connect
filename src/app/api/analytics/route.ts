import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getExecutiveDashboardData } from '@/lib/services/analytics';
import type { TimeRange } from '@/types/analytics.types';

/**
 * GET /api/analytics
 * Returns executive dashboard analytics data
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // Only allow admin and law_enforcement roles
    if (!profile || !['admin', 'law_enforcement'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const timeRange = (searchParams.get('timeRange') || '30d') as TimeRange;

    // Validate time range
    const validTimeRanges: TimeRange[] = ['24h', '7d', '30d', '90d', '1y', 'all'];
    if (!validTimeRanges.includes(timeRange)) {
      return NextResponse.json(
        { error: 'Invalid timeRange parameter' },
        { status: 400 }
      );
    }

    // Get dashboard data
    const data = await getExecutiveDashboardData(timeRange);

    return NextResponse.json(data);
  } catch (error) {
    console.error('[API] Analytics error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
