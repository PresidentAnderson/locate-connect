import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/cron/stale-case-check
 * Vercel Cron Job endpoint for checking stale cases
 * Runs every 6 hours to identify cases that need attention
 */
export async function GET(request: NextRequest) {
  // Verify cron secret for Vercel
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const runId = crypto.randomUUID();
  const startedAt = new Date();

  try {
    const supabase = await createClient();

    // Configuration
    const STALE_THRESHOLDS = {
      p0_critical: 6,    // Hours without update for P0
      p1_high: 12,       // Hours without update for P1
      p2_medium: 24,     // Hours without update for P2
      p3_low: 48,        // Hours without update for P3
      p4_minimal: 72,    // Hours without update for P4
    };

    const COLD_CASE_THRESHOLD_DAYS = 90;

    // Get all active cases with their last update timestamp
    const { data: activeCases, error: fetchError } = await supabase
      .from('cases')
      .select(`
        id,
        case_number,
        priority_level,
        status,
        assigned_officer_id,
        created_at,
        updated_at
      `)
      .eq('status', 'active')
      .order('priority_level', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch cases: ${fetchError.message}`);
    }

    const now = new Date();
    const staleCases: Array<{
      caseId: string;
      caseNumber: string;
      priority: number;
      hoursSinceUpdate: number;
      assignedOfficerId: string | null;
    }> = [];

    const coldCaseCandidates: Array<{
      caseId: string;
      caseNumber: string;
      daysSinceCreated: number;
    }> = [];

    const notificationsSent: string[] = [];

    // Process each case
    for (const caseRecord of activeCases || []) {
      const lastUpdate = new Date(caseRecord.updated_at);
      const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);

      const createdAt = new Date(caseRecord.created_at);
      const daysSinceCreated = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

      // Check for stale cases based on priority
      const priorityKey = `p${caseRecord.priority_level}_${
        caseRecord.priority_level === 0 ? 'critical' :
        caseRecord.priority_level === 1 ? 'high' :
        caseRecord.priority_level === 2 ? 'medium' :
        caseRecord.priority_level === 3 ? 'low' : 'minimal'
      }` as keyof typeof STALE_THRESHOLDS;

      const threshold = STALE_THRESHOLDS[priorityKey] || 72;

      if (hoursSinceUpdate >= threshold) {
        staleCases.push({
          caseId: caseRecord.id,
          caseNumber: caseRecord.case_number,
          priority: caseRecord.priority_level,
          hoursSinceUpdate: Math.round(hoursSinceUpdate),
          assignedOfficerId: caseRecord.assigned_officer_id,
        });

        // Create notification for assigned officer
        if (caseRecord.assigned_officer_id) {
          await supabase.from('notifications').insert({
            user_id: caseRecord.assigned_officer_id,
            type: 'stale_case_alert',
            title: `Case ${caseRecord.case_number} needs attention`,
            message: `This P${caseRecord.priority_level} case has not been updated in ${Math.round(hoursSinceUpdate)} hours.`,
            data: {
              case_id: caseRecord.id,
              case_number: caseRecord.case_number,
              hours_since_update: Math.round(hoursSinceUpdate),
            },
            read: false,
          });
          notificationsSent.push(caseRecord.assigned_officer_id);
        }
      }

      // Check for cold case candidates
      if (daysSinceCreated >= COLD_CASE_THRESHOLD_DAYS) {
        coldCaseCandidates.push({
          caseId: caseRecord.id,
          caseNumber: caseRecord.case_number,
          daysSinceCreated: Math.round(daysSinceCreated),
        });
      }
    }

    // Log agent run
    await supabase.from('agent_runs').insert({
      id: runId,
      agent_type: 'stale_case_check',
      started_at: startedAt.toISOString(),
      completed_at: new Date().toISOString(),
      status: 'completed',
      cases_processed: activeCases?.length || 0,
      cases_affected: staleCases.length,
      results: {
        stale_cases: staleCases,
        cold_case_candidates: coldCaseCandidates,
        notifications_sent: notificationsSent.length,
      },
      errors: null,
    });

    console.log('[Cron] Stale Case Check completed:', {
      runId,
      casesProcessed: activeCases?.length || 0,
      staleCases: staleCases.length,
      coldCaseCandidates: coldCaseCandidates.length,
      notificationsSent: notificationsSent.length,
    });

    return NextResponse.json({
      success: true,
      runId,
      duration: Date.now() - startedAt.getTime(),
      casesProcessed: activeCases?.length || 0,
      staleCases: staleCases.length,
      coldCaseCandidates: coldCaseCandidates.length,
      notificationsSent: notificationsSent.length,
      details: {
        stale_cases: staleCases,
        cold_case_candidates: coldCaseCandidates,
      },
    });
  } catch (error) {
    console.error('[Cron] Stale Case Check failed:', error);

    return NextResponse.json(
      {
        success: false,
        runId,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
