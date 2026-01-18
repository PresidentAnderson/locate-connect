import { NextRequest, NextResponse } from 'next/server';
import { createPriorityEscalationAgent, agentRegistry } from '@/lib/agents';

/**
 * GET /api/cron/priority-escalation
 * Vercel Cron Job endpoint for priority escalation
 * Runs every 15 minutes to check and escalate case priorities
 */
export async function GET(request: NextRequest) {
  // Verify cron secret for Vercel
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get or create the priority escalation agent
    let agent = agentRegistry.get('cron-priority-escalation');

    if (!agent) {
      agent = createPriorityEscalationAgent('cron-priority-escalation');
      agentRegistry.register(agent);
    }

    // Run the agent
    const result = await agent.run();

    // Log run to console for Vercel logs
    console.log('[Cron] Priority Escalation Agent completed:', {
      runId: result.runId,
      duration: result.duration,
      itemsProcessed: result.itemsProcessed,
      alertsTriggered: result.alertsTriggered,
      errors: result.errors.length,
    });

    return NextResponse.json({
      success: result.success,
      runId: result.runId,
      duration: result.duration,
      casesProcessed: result.itemsProcessed,
      escalations: result.alertsTriggered,
      errors: result.errors,
      metrics: result.metrics,
    });
  } catch (error) {
    console.error('[Cron] Priority Escalation Agent failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Vercel cron jobs only support GET requests
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 second timeout for cron jobs
