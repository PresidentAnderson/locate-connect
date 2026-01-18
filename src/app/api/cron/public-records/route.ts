import { NextRequest, NextResponse } from 'next/server';
import { createPublicRecordsCrawlerAgent, agentRegistry } from '@/lib/agents';

/**
 * GET /api/cron/public-records
 * Vercel Cron Job endpoint for public records crawling
 * Runs every 4 hours to search public records for case matches
 */
export async function GET(request: NextRequest) {
  // Verify cron secret for Vercel
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get or create the public records crawler agent
    let agent = agentRegistry.get('cron-public-records');

    if (!agent) {
      agent = createPublicRecordsCrawlerAgent('cron-public-records');
      agentRegistry.register(agent);
    }

    // Run the agent
    const result = await agent.run();

    // Log run to console for Vercel logs
    console.log('[Cron] Public Records Crawler completed:', {
      runId: result.runId,
      duration: result.duration,
      itemsProcessed: result.itemsProcessed,
      leadsGenerated: result.leadsGenerated,
      errors: result.errors.length,
    });

    return NextResponse.json({
      success: result.success,
      runId: result.runId,
      duration: result.duration,
      recordsSearched: result.itemsProcessed,
      matchesFound: result.leadsGenerated,
      errors: result.errors,
      metrics: result.metrics,
    });
  } catch (error) {
    console.error('[Cron] Public Records Crawler failed:', error);

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
