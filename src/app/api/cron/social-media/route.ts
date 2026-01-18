import { NextRequest, NextResponse } from 'next/server';
import { createSocialMediaAgent, agentRegistry } from '@/lib/agents';

/**
 * GET /api/cron/social-media
 * Vercel Cron Job endpoint for social media monitoring
 * Runs every 30 minutes to check social media for case-related activity
 */
export async function GET(request: NextRequest) {
  // Verify cron secret for Vercel
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get or create the social media agent
    let agent = agentRegistry.get('cron-social-media');

    if (!agent) {
      agent = createSocialMediaAgent('cron-social-media');
      agentRegistry.register(agent);
    }

    // Run the agent
    const result = await agent.run();

    // Log run to console for Vercel logs
    console.log('[Cron] Social Media Agent completed:', {
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
      postsAnalyzed: result.itemsProcessed,
      leadsGenerated: result.leadsGenerated,
      errors: result.errors,
      metrics: result.metrics,
    });
  } catch (error) {
    console.error('[Cron] Social Media Agent failed:', error);

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
