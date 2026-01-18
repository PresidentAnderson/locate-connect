import { NextRequest, NextResponse } from 'next/server';
import { createNewsCrawlerAgent, agentRegistry } from '@/lib/agents';

/**
 * GET /api/cron/news-crawler
 * Vercel Cron Job endpoint for news article crawling
 * Runs every hour to search for news related to active cases
 */
export async function GET(request: NextRequest) {
  // Verify cron secret for Vercel
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get or create the news crawler agent
    let agent = agentRegistry.get('cron-news-crawler');

    if (!agent) {
      agent = createNewsCrawlerAgent('cron-news-crawler');
      agentRegistry.register(agent);
    }

    // Run the agent
    const result = await agent.run();

    // Log run to console for Vercel logs
    console.log('[Cron] News Crawler Agent completed:', {
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
      articlesProcessed: result.itemsProcessed,
      leadsGenerated: result.leadsGenerated,
      errors: result.errors,
      metrics: result.metrics,
    });
  } catch (error) {
    console.error('[Cron] News Crawler Agent failed:', error);

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
