"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRealtime } from "@/hooks/useRealtime";

// Notification types based on issue requirements
type NotificationPriority = "low" | "normal" | "high" | "critical";
type NotificationType =
  | "new_lead"
  | "priority_escalation"
  | "case_update"
  | "email_opened"
  | "sighting_reported"
  | "case_resolved"
  | "system_maintenance";

interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  caseId?: string;
  caseNumber?: string;
  read: boolean;
  dismissed: boolean;
  actionUrl?: string;
  actionLabel?: string;
  createdAt: string;
}

interface NotificationGroup {
  id: string;
  type: NotificationType;
  title: string;
  count: number;
  latestNotification: Notification;
  read: boolean;
  createdAt: string;
}

interface NotificationRow {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
  id: string;
  user_id: string;
  notification_type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  case_id?: string;
  action_url?: string;
  action_label?: string;
  read_at?: string;
  dismissed_at?: string;
  created_at: string;
  metadata?: {
    case_number?: string;
  };
}

const TYPE_CONFIG: Record<NotificationType, { label: string; icon: string; color: string }> = {
  new_lead: { label: "New Lead", icon: "💡", color: "bg-blue-100 text-blue-800" },
  priority_escalation: { label: "Priority Escalation", icon: "⚠️", color: "bg-red-100 text-red-800" },
  case_update: { label: "Case Update", icon: "📋", color: "bg-gray-100 text-gray-800" },
  email_opened: { label: "Email Opened", icon: "📧", color: "bg-green-100 text-green-800" },
  sighting_reported: { label: "Sighting Reported", icon: "👁️", color: "bg-orange-100 text-orange-800" },
  case_resolved: { label: "Case Resolved", icon: "✅", color: "bg-emerald-100 text-emerald-800" },
  system_maintenance: { label: "System", icon: "🔧", color: "bg-purple-100 text-purple-800" },
};

const PRIORITY_STYLES: Record<NotificationPriority, string> = {
  low: "border-l-gray-300",
  normal: "border-l-blue-400",
  high: "border-l-orange-500",
  critical: "border-l-red-600",
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

interface NotificationCenterProps {
  userId?: string;
  enableRealtime?: boolean;
}

export function NotificationCenter({ userId, enableRealtime = true }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [groups, setGroups] = useState<NotificationGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [groupMode, setGroupMode] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const unreadCount = notifications.filter((n) => !n.read && !n.dismissed).length;

  // Transform database row to Notification type
  const transformNotification = useCallback((row: NotificationRow): Notification => ({
    id: row.id,
    type: row.notification_type,
    priority: row.priority || "normal",
    title: row.title,
    message: row.message,
    caseId: row.case_id,
    caseNumber: row.metadata?.case_number,
    read: !!row.read_at,
    dismissed: !!row.dismissed_at,
    actionUrl: row.action_url,
    actionLabel: row.action_label,
    createdAt: row.created_at,
  }), []);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio("/sounds/notification.mp3");
        audioRef.current.volume = 0.5;
      }
      audioRef.current.play().catch(() => {
        // Ignore audio play errors (autoplay restrictions)
      });
    } catch {
      // Ignore audio errors
    }
  }, []);

  // Real-time subscription for new notifications
  const { isConnected } = useRealtime<NotificationRow>({
    table: "notifications",
    filter: userId ? `user_id=eq.${userId}` : undefined,
    enabled: enableRealtime && !!userId,
    onInsert: (newRow) => {
      const notification = transformNotification(newRow);
      setNotifications((prev) => [notification, ...prev]);

      // Play sound for high/critical priority notifications
      if (notification.priority === "high" || notification.priority === "critical") {
        playNotificationSound();
      }

      // Show browser notification if permission granted
      if (Notification.permission === "granted") {
        new Notification(notification.title, {
          body: notification.message,
          icon: "/icons/icon-192x192.png",
          tag: notification.id,
        });
      }
    },
    onUpdate: ({ new: updated }) => {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === updated.id
            ? {
                ...n,
                read: !!updated.read_at,
                dismissed: !!updated.dismissed_at,
              }
            : n
        )
      );
    },
    onDelete: (deleted) => {
      setNotifications((prev) => prev.filter((n) => n.id !== deleted.id));
    },
  });

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setGroups(data.groups || []);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Fall back to polling if real-time is disabled or not connected
    // Use longer interval when real-time is enabled as a backup
    const pollInterval = enableRealtime && isConnected ? 60000 : 30000;
    const interval = setInterval(fetchNotifications, pollInterval);
    return () => clearInterval(interval);
  }, [fetchNotifications, enableRealtime, isConnected]);

  // Recompute groups when notifications change
  useEffect(() => {
    const groupMap = new Map<NotificationType, NotificationGroup>();
    for (const notification of notifications.filter((n) => !n.dismissed)) {
      const existing = groupMap.get(notification.type);
      if (existing) {
        existing.count++;
        if (new Date(notification.createdAt) > new Date(existing.createdAt)) {
          existing.latestNotification = notification;
          existing.createdAt = notification.createdAt;
        }
        if (!notification.read) {
          existing.read = false;
        }
      } else {
        groupMap.set(notification.type, {
          id: `group-${notification.type}`,
          type: notification.type,
          title: notification.title,
          count: 1,
          latestNotification: notification,
          read: notification.read,
          createdAt: notification.createdAt,
        });
      }
    }
    setGroups(
      Array.from(groupMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    );
  }, [notifications]);

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, { method: "POST" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications/read-all", { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setGroups((prev) => prev.map((g) => ({ ...g, read: true })));
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const dismissNotification = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}/dismiss`, { method: "POST" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, dismissed: true } : n))
      );
    } catch (error) {
      console.error("Failed to dismiss:", error);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (n.dismissed) return false;
    if (activeTab === "unread") return !n.read;
    return true;
  });

  const filteredGroups = groups.filter((g) => {
    if (activeTab === "unread") return !g.read;
    return true;
  });

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center min-w-[18px] h-[18px] text-xs font-bold text-white bg-red-500 rounded-full px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-h-[80vh] bg-white rounded-lg shadow-xl border border-gray-200 z-50 flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                {enableRealtime && (
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isConnected ? "bg-green-500" : "bg-yellow-500"
                    }`}
                    title={isConnected ? "Real-time connected" : "Connecting..."}
                  />
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Mark all read
                  </button>
                )}
                <a
                  href="/settings/notifications"
                  className="p-1 text-gray-500 hover:text-gray-700"
                  title="Notification Settings"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </a>
              </div>
            </div>
            {/* Tabs */}
            <div className="flex mt-3 gap-2">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1 text-sm rounded-full ${
                  activeTab === "all"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab("unread")}
                className={`px-3 py-1 text-sm rounded-full ${
                  activeTab === "unread"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Unread ({unreadCount})
              </button>
              <button
                onClick={() => setGroupMode(!groupMode)}
                className={`ml-auto px-2 py-1 text-sm rounded ${
                  groupMode ? "text-blue-600" : "text-gray-500"
                }`}
                title={groupMode ? "Show individual" : "Group notifications"}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : groupMode && filteredGroups.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {filteredGroups.map((group) => {
                  const config = TYPE_CONFIG[group.type];
                  return (
                    <div
                      key={group.id}
                      className={`p-4 hover:bg-gray-50 cursor-pointer ${
                        !group.read ? "bg-blue-50/50" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-xl">{config.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${config.color}`}>
                              {config.label}
                            </span>
                            {group.count > 1 && (
                              <span className="text-xs text-gray-500">
                                +{group.count - 1} more
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm font-medium text-gray-900 truncate">
                            {group.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatTimeAgo(group.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : filteredNotifications.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {filteredNotifications.map((notification) => {
                  const config = TYPE_CONFIG[notification.type];
                  return (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 border-l-4 ${
                        PRIORITY_STYLES[notification.priority]
                      } ${!notification.read ? "bg-blue-50/50" : ""}`}
                      onClick={() => {
                        if (!notification.read) markAsRead(notification.id);
                        if (notification.actionUrl) {
                          window.location.href = notification.actionUrl;
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-xl">{config.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${config.color}`}>
                              {config.label}
                            </span>
                            {notification.caseNumber && (
                              <span className="text-xs text-gray-500">
                                {notification.caseNumber}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm font-medium text-gray-900">
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-500">
                              {formatTimeAgo(notification.createdAt)}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                dismissNotification(notification.id);
                              }}
                              className="text-xs text-gray-400 hover:text-gray-600"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p className="text-sm">
                  {activeTab === "unread" ? "No unread notifications" : "No notifications yet"}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <a
              href="/notifications/history"
              className="block text-center text-sm text-blue-600 hover:text-blue-800"
            >
              View all notifications
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
