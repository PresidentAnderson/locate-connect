import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Notification priority and type definitions
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

// GET /api/notifications - Fetch user notifications
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const unreadOnly = searchParams.get("unread") === "true";

    // Try to get from database, fall back to mock data
    const { data: dbNotifications, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .is("dismissed_at", null)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Database error, using mock data:", error);
      // Return mock data for demo purposes
      const mockNotifications: Notification[] = [
        {
          id: "1",
          type: "new_lead",
          priority: "high",
          title: "New Lead Submitted",
          message: "A new tip has been submitted for case #LC-2026-0042. The tipster reported a potential sighting.",
          caseId: "case-1",
          caseNumber: "LC-2026-0042",
          read: false,
          dismissed: false,
          actionUrl: "/cases/case-1/tips",
          actionLabel: "View Tip",
          createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        },
        {
          id: "2",
          type: "priority_escalation",
          priority: "critical",
          title: "Case Priority Escalated",
          message: "Case #LC-2026-0038 has been escalated to Critical priority due to new evidence.",
          caseId: "case-2",
          caseNumber: "LC-2026-0038",
          read: false,
          dismissed: false,
          actionUrl: "/cases/case-2",
          actionLabel: "View Case",
          createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        },
        {
          id: "3",
          type: "sighting_reported",
          priority: "critical",
          title: "Sighting Reported",
          message: "A verified sighting was reported in Edmonton. Law enforcement has been notified.",
          caseId: "case-3",
          caseNumber: "LC-2026-0045",
          read: false,
          dismissed: false,
          actionUrl: "/cases/case-3/sightings",
          actionLabel: "View Sighting",
          createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        },
        {
          id: "4",
          type: "case_update",
          priority: "normal",
          title: "Case Status Updated",
          message: "Case #LC-2026-0041 status changed from Active to Under Investigation.",
          caseId: "case-4",
          caseNumber: "LC-2026-0041",
          read: true,
          dismissed: false,
          actionUrl: "/cases/case-4",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        },
        {
          id: "5",
          type: "email_opened",
          priority: "high",
          title: "AMBER Alert Email Opened",
          message: "The AMBER Alert email for case #LC-2026-0042 was opened by 1,247 recipients.",
          caseId: "case-1",
          caseNumber: "LC-2026-0042",
          read: true,
          dismissed: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
        },
        {
          id: "6",
          type: "case_resolved",
          priority: "normal",
          title: "Case Resolved",
          message: "Great news! Case #LC-2026-0035 has been resolved. The missing person was found safe.",
          caseId: "case-5",
          caseNumber: "LC-2026-0035",
          read: true,
          dismissed: false,
          actionUrl: "/cases/case-5",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        },
        {
          id: "7",
          type: "system_maintenance",
          priority: "low",
          title: "Scheduled Maintenance",
          message: "System maintenance is scheduled for Saturday 2:00 AM - 4:00 AM EST.",
          read: true,
          dismissed: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        },
      ];

      const filtered = unreadOnly
        ? mockNotifications.filter((n) => !n.read)
        : mockNotifications;

      // Group notifications by type
      const groupMap = new Map<NotificationType, NotificationGroup>();
      for (const notification of mockNotifications.filter((n) => !n.dismissed)) {
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

      return NextResponse.json({
        notifications: filtered,
        groups: Array.from(groupMap.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
        total: mockNotifications.length,
        unreadCount: mockNotifications.filter((n) => !n.read).length,
      });
    }

    // Transform database results
    const notifications: Notification[] = (dbNotifications || []).map((row) => ({
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
    }));

    const filtered = unreadOnly
      ? notifications.filter((n) => !n.read)
      : notifications;

    // Group notifications
    const groupMap = new Map<NotificationType, NotificationGroup>();
    for (const notification of notifications) {
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

    return NextResponse.json({
      notifications: filtered,
      groups: Array.from(groupMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
      total: notifications.length,
      unreadCount: notifications.filter((n) => !n.read).length,
    });
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
