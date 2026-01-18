/**
 * Notification Service
 * Centralized service for creating and managing notifications
 */

import { createClient } from '@/lib/supabase/server';
import type { Notification, NotificationPreferences, NotificationType } from '@/types/notification.types';

// =============================================================================
// Types
// =============================================================================

type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';

interface CreateNotificationOptions {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  caseId?: string;
  caseNumber?: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
}

interface BulkNotificationOptions {
  userIds: string[];
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  caseId?: string;
  caseNumber?: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
}

interface NotificationResult {
  success: boolean;
  notificationId?: string;
  error?: string;
}

interface BulkNotificationResult {
  success: boolean;
  created: number;
  failed: number;
  errors?: string[];
}

// =============================================================================
// Service Functions
// =============================================================================

/**
 * Create a notification for a user
 */
export async function createNotification({
  userId,
  type,
  title,
  message,
  priority = 'normal',
  caseId,
  caseNumber,
  actionUrl,
  actionLabel,
  metadata = {},
}: CreateNotificationOptions): Promise<NotificationResult> {
  try {
    const supabase = await createClient();

    // Check user preferences before creating notification
    const shouldSend = await checkNotificationPreferences(userId, type);
    if (!shouldSend) {
      return { success: true, notificationId: undefined };
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        notification_type: type,
        title,
        message,
        priority,
        case_id: caseId,
        action_url: actionUrl,
        action_label: actionLabel,
        metadata: {
          ...metadata,
          case_number: caseNumber,
        },
      })
      .select('id')
      .single();

    if (error) {
      console.error('[NotificationService] Create failed:', error);
      return { success: false, error: error.message };
    }

    // Trigger push notification if enabled
    await triggerPushNotification(userId, {
      title,
      message,
      actionUrl,
      priority,
    });

    return { success: true, notificationId: data?.id };
  } catch (error) {
    console.error('[NotificationService] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create notifications for multiple users
 */
export async function createBulkNotifications({
  userIds,
  type,
  title,
  message,
  priority = 'normal',
  caseId,
  caseNumber,
  actionUrl,
  actionLabel,
  metadata = {},
}: BulkNotificationOptions): Promise<BulkNotificationResult> {
  const results = await Promise.allSettled(
    userIds.map((userId) =>
      createNotification({
        userId,
        type,
        title,
        message,
        priority,
        caseId,
        caseNumber,
        actionUrl,
        actionLabel,
        metadata,
      })
    )
  );

  const created = results.filter(
    (r) => r.status === 'fulfilled' && r.value.success
  ).length;
  const failed = results.length - created;
  const errors = results
    .filter((r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success))
    .map((r) =>
      r.status === 'rejected'
        ? String(r.reason)
        : (r as PromiseFulfilledResult<NotificationResult>).value.error || 'Unknown error'
    );

  return {
    success: failed === 0,
    created,
    failed,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Create a case-related notification
 */
export async function createCaseNotification(
  caseId: string,
  caseNumber: string,
  options: {
    type: NotificationType;
    title: string;
    message: string;
    priority?: NotificationPriority;
    metadata?: Record<string, unknown>;
  }
): Promise<BulkNotificationResult> {
  try {
    const supabase = await createClient();

    // Get all users who should be notified about this case
    // This includes case owner, assigned investigators, and subscribers
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('created_by, assigned_to')
      .eq('id', caseId)
      .single();

    if (caseError) {
      return { success: false, created: 0, failed: 1, errors: [caseError.message] };
    }

    // Get case subscribers
    const { data: subscribers } = await supabase
      .from('case_subscriptions')
      .select('user_id')
      .eq('case_id', caseId)
      .eq('active', true);

    // Collect unique user IDs
    const userIds = new Set<string>();
    if (caseData?.created_by) userIds.add(caseData.created_by);
    if (caseData?.assigned_to) userIds.add(caseData.assigned_to);
    subscribers?.forEach((s) => userIds.add(s.user_id));

    if (userIds.size === 0) {
      return { success: true, created: 0, failed: 0 };
    }

    return createBulkNotifications({
      userIds: Array.from(userIds),
      caseId,
      caseNumber,
      actionUrl: `/cases/${caseId}`,
      actionLabel: 'View Case',
      ...options,
    });
  } catch (error) {
    return {
      success: false,
      created: 0,
      failed: 1,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

/**
 * Mark notification as read
 */
export async function markAsRead(
  notificationId: string,
  userId: string
): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', userId);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Dismiss a notification
 */
export async function dismissNotification(
  notificationId: string,
  userId: string
): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('notifications')
      .update({ dismissed_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', userId);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Dismiss all notifications for a user
 */
export async function dismissAllNotifications(userId: string): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('notifications')
      .update({ dismissed_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('dismissed_at', null);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const supabase = await createClient();

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null)
      .is('dismissed_at', null);

    return error ? 0 : (count || 0);
  } catch {
    return 0;
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if a user has notifications enabled for a specific type
 */
async function checkNotificationPreferences(
  userId: string,
  type: NotificationType
): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('preferences')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      // Default to enabled if no preferences set
      return true;
    }

    const preferences = data.preferences as NotificationPreferences;

    // Check if this notification type is enabled
    const typePreferences = preferences.types?.[type];
    if (typePreferences === false) {
      return false;
    }

    return true;
  } catch {
    return true;
  }
}

/**
 * Trigger a push notification for a user
 */
async function triggerPushNotification(
  userId: string,
  options: {
    title: string;
    message: string;
    actionUrl?: string;
    priority?: NotificationPriority;
  }
): Promise<void> {
  try {
    const supabase = await createClient();

    // Get user's push subscription
    const { data: subscription, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, keys')
      .eq('user_id', userId)
      .single();

    if (error || !subscription) {
      return;
    }

    // Send push notification via web-push
    // This would typically call a separate push notification service
    // For now, we'll just log that we would send it
    console.log('[NotificationService] Would send push notification:', {
      userId,
      endpoint: subscription.endpoint,
      ...options,
    });
  } catch (error) {
    console.error('[NotificationService] Push notification error:', error);
  }
}

// =============================================================================
// Notification Templates
// =============================================================================

/**
 * Pre-defined notification templates for common events
 */
export const NotificationTemplates = {
  newLead: (caseNumber: string, summary: string) => ({
    type: 'new_lead' as NotificationType,
    title: 'New Lead Submitted',
    message: `A new tip has been submitted for case #${caseNumber}. ${summary}`,
    priority: 'high' as NotificationPriority,
  }),

  priorityEscalation: (caseNumber: string, newPriority: string, reason: string) => ({
    type: 'priority_escalation' as NotificationType,
    title: 'Case Priority Escalated',
    message: `Case #${caseNumber} has been escalated to ${newPriority} priority. ${reason}`,
    priority: 'critical' as NotificationPriority,
  }),

  caseUpdate: (caseNumber: string, updateType: string, details: string) => ({
    type: 'case_update' as NotificationType,
    title: `Case ${updateType}`,
    message: `Case #${caseNumber}: ${details}`,
    priority: 'normal' as NotificationPriority,
  }),

  sightingReported: (caseNumber: string, location: string) => ({
    type: 'sighting_reported' as NotificationType,
    title: 'Sighting Reported',
    message: `A sighting was reported for case #${caseNumber} in ${location}.`,
    priority: 'critical' as NotificationPriority,
  }),

  caseResolved: (caseNumber: string, outcome: string) => ({
    type: 'case_resolved' as NotificationType,
    title: 'Case Resolved',
    message: `Case #${caseNumber} has been resolved. ${outcome}`,
    priority: 'normal' as NotificationPriority,
  }),

  amberAlert: (caseNumber: string, personName: string) => ({
    type: 'amber_alert' as NotificationType,
    title: 'AMBER Alert Issued',
    message: `An AMBER Alert has been issued for ${personName} (Case #${caseNumber}).`,
    priority: 'critical' as NotificationPriority,
  }),

  geofenceAlert: (caseNumber: string, locationName: string) => ({
    type: 'geofence_alert' as NotificationType,
    title: 'Geofence Alert',
    message: `Activity detected in monitored area "${locationName}" for case #${caseNumber}.`,
    priority: 'high' as NotificationPriority,
  }),

  assignmentChange: (caseNumber: string, assignedTo: string) => ({
    type: 'case_update' as NotificationType,
    title: 'Case Assigned',
    message: `Case #${caseNumber} has been assigned to ${assignedTo}.`,
    priority: 'normal' as NotificationPriority,
  }),

  systemMaintenance: (scheduledTime: string, duration: string) => ({
    type: 'system_maintenance' as NotificationType,
    title: 'Scheduled Maintenance',
    message: `System maintenance is scheduled for ${scheduledTime} (approximately ${duration}).`,
    priority: 'low' as NotificationPriority,
  }),
};

export default {
  createNotification,
  createBulkNotifications,
  createCaseNotification,
  markAsRead,
  markAllAsRead,
  dismissNotification,
  dismissAllNotifications,
  getUnreadCount,
  NotificationTemplates,
};
