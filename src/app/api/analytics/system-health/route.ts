import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSystemHealth, getAgentMetrics } from '@/lib/services/analytics';

/**
 * GET /api/analytics/system-health
 * Returns system health and agent metrics
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

    // Only allow admin role for system health
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Get health data
    const [systemHealth, agentMetrics] = await Promise.all([
      getSystemHealth(),
      getAgentMetrics(),
    ]);

    return NextResponse.json({
      systemHealth,
      agentMetrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API] System health error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
