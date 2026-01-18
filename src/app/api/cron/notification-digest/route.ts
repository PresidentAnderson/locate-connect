import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/cron/notification-digest
 * Vercel Cron Job endpoint for daily notification digest
 * Runs daily at 9 AM to send summary emails
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

    // Get users who have digest enabled
    const { data: usersWithDigest, error: usersError } = await supabase
      .from('profiles')
      .select('id, email, full_name, notification_preferences')
      .eq('email_digest_enabled', true);

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    const digestsSent: string[] = [];
    const errors: Array<{ userId: string; error: string }> = [];

    // Process each user
    for (const user of usersWithDigest || []) {
      try {
        // Get unread notifications from the last 24 hours
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const { data: notifications, error: notifError } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .eq('read', false)
          .gte('created_at', yesterday.toISOString())
          .order('created_at', { ascending: false });

        if (notifError) {
          throw new Error(notifError.message);
        }

        if (!notifications || notifications.length === 0) {
          continue; // No notifications, skip user
        }

        // Get user's assigned cases summary
        const { data: assignedCases, error: casesError } = await supabase
          .from('cases')
          .select('id, case_number, priority_level, status, first_name, last_name')
          .eq('assigned_officer_id', user.id)
          .eq('status', 'active');

        if (casesError) {
          console.error('Error fetching cases:', casesError);
        }

        // Group notifications by type
        const groupedNotifications: Record<string, typeof notifications> = {};
        for (const notif of notifications) {
          const type = notif.type || 'general';
          if (!groupedNotifications[type]) {
            groupedNotifications[type] = [];
          }
          groupedNotifications[type].push(notif);
        }

        // Build digest content
        const digestContent = {
          user_id: user.id,
          email: user.email,
          full_name: user.full_name,
          total_notifications: notifications.length,
          notifications_by_type: Object.entries(groupedNotifications).map(([type, notifs]) => ({
            type,
            count: notifs.length,
            items: notifs.slice(0, 5).map(n => ({
              title: n.title,
              message: n.message,
              created_at: n.created_at,
            })),
          })),
          assigned_cases: {
            total: assignedCases?.length || 0,
            by_priority: {
              critical: assignedCases?.filter(c => c.priority_level === 0).length || 0,
              high: assignedCases?.filter(c => c.priority_level === 1).length || 0,
              medium: assignedCases?.filter(c => c.priority_level === 2).length || 0,
              low: assignedCases?.filter(c => c.priority_level <= 4 && c.priority_level >= 3).length || 0,
            },
          },
          generated_at: new Date().toISOString(),
        };

        // Queue email for sending (would integrate with email service)
        await supabase.from('email_queue').insert({
          to_email: user.email,
          to_name: user.full_name,
          template: 'daily_digest',
          subject: `LocateConnect Daily Digest - ${notifications.length} notification(s)`,
          data: digestContent,
          status: 'pending',
          scheduled_for: new Date().toISOString(),
        });

        // Create a digest record
        await supabase.from('notification_digests').insert({
          user_id: user.id,
          notification_count: notifications.length,
          digest_content: digestContent,
          sent_at: new Date().toISOString(),
        });

        digestsSent.push(user.id);

      } catch (userError) {
        errors.push({
          userId: user.id,
          error: userError instanceof Error ? userError.message : 'Unknown error',
        });
      }
    }

    // Log agent run
    await supabase.from('agent_runs').insert({
      id: runId,
      agent_type: 'notification_digest',
      started_at: startedAt.toISOString(),
      completed_at: new Date().toISOString(),
      status: errors.length > 0 ? 'completed_with_errors' : 'completed',
      cases_processed: usersWithDigest?.length || 0,
      cases_affected: digestsSent.length,
      results: {
        users_processed: usersWithDigest?.length || 0,
        digests_sent: digestsSent.length,
      },
      errors: errors.length > 0 ? errors : null,
    });

    console.log('[Cron] Notification Digest completed:', {
      runId,
      usersProcessed: usersWithDigest?.length || 0,
      digestsSent: digestsSent.length,
      errors: errors.length,
    });

    return NextResponse.json({
      success: true,
      runId,
      duration: Date.now() - startedAt.getTime(),
      usersProcessed: usersWithDigest?.length || 0,
      digestsSent: digestsSent.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('[Cron] Notification Digest failed:', error);

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
