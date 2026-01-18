import { NextRequest, NextResponse } from 'next/server';
import { createHospitalRegistryAgent, agentRegistry } from '@/lib/agents';

/**
 * GET /api/cron/hospital-registry
 * Vercel Cron Job endpoint for hospital registry checks
 * Runs every 2 hours to check hospital registries for case matches
 */
export async function GET(request: NextRequest) {
  // Verify cron secret for Vercel
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get or create the hospital registry agent
    let agent = agentRegistry.get('cron-hospital-registry');

    if (!agent) {
      agent = createHospitalRegistryAgent('cron-hospital-registry');
      agentRegistry.register(agent);
    }

    // Run the agent
    const result = await agent.run();

    // Log run to console for Vercel logs
    console.log('[Cron] Hospital Registry Agent completed:', {
      runId: result.runId,
      duration: result.duration,
      itemsProcessed: result.itemsProcessed,
      leadsGenerated: result.leadsGenerated,
      alertsTriggered: result.alertsTriggered,
      errors: result.errors.length,
    });

    return NextResponse.json({
      success: result.success,
      runId: result.runId,
      duration: result.duration,
      hospitalsChecked: result.itemsProcessed,
      matchesFound: result.leadsGenerated,
      alertsTriggered: result.alertsTriggered,
      errors: result.errors,
      metrics: result.metrics,
    });
  } catch (error) {
    console.error('[Cron] Hospital Registry Agent failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
