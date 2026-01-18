/**
 * Notifications Hook
 * Provides real-time notifications with Supabase
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRealtime } from './useRealtime';
import type { Notification, NotificationPreferences } from '@/types/notification.types';

// =============================================================================
// Types
// =============================================================================

interface UseNotificationsOptions {
  userId?: string;
  limit?: number;
  autoMarkAsRead?: boolean;
  enableRealtime?: boolean;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: Error | null;
  isConnected: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismissNotification: (notificationId: string) => Promise<void>;
  dismissAll: () => Promise<void>;
  refresh: () => Promise<void>;
}

interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  read: boolean;
  dismissed: boolean;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Hook: useNotifications
// =============================================================================

/**
 * Hook to manage notifications with real-time updates
 */
export function useNotifications({
  userId,
  limit = 50,
  autoMarkAsRead = false,
  enableRealtime = true,
}: UseNotificationsOptions = {}): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabaseRef = useRef(createClient());
  const initializedRef = useRef(false);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/notifications?limit=${limit}`);

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      setNotifications(data.notifications || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch notifications'));
    } finally {
      setIsLoading(false);
    }
  }, [userId, limit]);

  // Initial fetch
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time subscription for new notifications
  const { isConnected } = useRealtime<NotificationRow>({
    table: 'notifications',
    filter: userId ? `user_id=eq.${userId}` : undefined,
    enabled: enableRealtime && !!userId,
    onInsert: (newNotification) => {
      // Transform database row to Notification type
      const notification: Notification = {
        id: newNotification.id,
        type: newNotification.type as Notification['type'],
        title: newNotification.title,
        message: newNotification.message,
        data: newNotification.data || undefined,
        read: newNotification.read,
        createdAt: newNotification.created_at,
        caseId: (newNotification.data as { caseId?: string })?.caseId,
        actions: (newNotification.data as { actions?: Notification['actions'] })?.actions,
      };

      setNotifications((prev) => [notification, ...prev]);

      // Auto mark as read if option is enabled
      if (autoMarkAsRead) {
        markAsRead(notification.id);
      }
    },
    onUpdate: ({ new: updated }) => {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === updated.id
            ? {
                ...n,
                read: updated.read,
                title: updated.title,
                message: updated.message,
              }
            : n
        )
      );
    },
    onDelete: (deleted) => {
      setNotifications((prev) => prev.filter((n) => n.id !== deleted.id));
    },
  });

  // Mark single notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }

      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to mark notification as read'));
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }

      // Optimistic update
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to mark all notifications as read'));
    }
  }, []);

  // Dismiss single notification
  const dismissNotification = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to dismiss notification');
      }

      // Optimistic update
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to dismiss notification'));
    }
  }, []);

  // Dismiss all notifications
  const dismissAll = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/dismiss-all', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to dismiss all notifications');
      }

      // Optimistic update
      setNotifications([]);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to dismiss all notifications'));
    }
  }, []);

  // Calculate unread count
  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    isConnected,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    dismissAll,
    refresh: fetchNotifications,
  };
}

// =============================================================================
// Hook: useNotificationPreferences
// =============================================================================

interface UseNotificationPreferencesReturn {
  preferences: NotificationPreferences | null;
  isLoading: boolean;
  error: Error | null;
  updatePreferences: (updates: Partial<NotificationPreferences>) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook to manage notification preferences
 */
export function useNotificationPreferences(): UseNotificationPreferencesReturn {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPreferences = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/preferences');

      if (!response.ok) {
        throw new Error('Failed to fetch notification preferences');
      }

      const data = await response.json();
      setPreferences(data.preferences);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch preferences'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const updatePreferences = useCallback(async (updates: Partial<NotificationPreferences>) => {
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update notification preferences');
      }

      const data = await response.json();
      setPreferences(data.preferences);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update preferences'));
    }
  }, []);

  return {
    preferences,
    isLoading,
    error,
    updatePreferences,
    refresh: fetchPreferences,
  };
}

export default useNotifications;
