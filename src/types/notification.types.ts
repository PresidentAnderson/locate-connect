/**
 * Notification Preference Types (LC-FEAT-040)
 * Comprehensive user control over notifications and communication preferences
 */

export type NotificationChannel = 'email' | 'sms' | 'push' | 'in_app' | 'browser';
export type NotificationFrequency = 'immediate' | 'daily_digest' | 'weekly_digest';
export type NotificationType =
  | 'case_status_update'
  | 'new_lead_tip'
  | 'comment_reply'
  | 'system_announcement'
  | 'nearby_case_alert'
  | 'scheduled_reminder';

export interface Notification {
  id: string;
  userId?: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
  read: boolean;
  dismissed?: boolean;
  createdAt: string;
  updatedAt?: string;
  caseId?: string;
  actions?: Array<{ label: string; href: string }>;
}

export interface NotificationPreferences {
  id: string;
  userId: string;
  notificationsEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  browserEnabled: boolean;
  emailAddress?: string;
  phoneNumber?: string;
  defaultFrequency: NotificationFrequency;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  quietHoursTimezone: string;
  channelPriority: NotificationChannel[];
  digestTime: string;
  digestDayOfWeek: number;
  types?: Partial<Record<NotificationType, boolean>>;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationTypePreference {
  id: string;
  userId: string;
  notificationType: NotificationType;
  enabled: boolean;
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  pushEnabled?: boolean;
  inAppEnabled?: boolean;
  browserEnabled?: boolean;
  frequency?: NotificationFrequency;
  createdAt: string;
  updatedAt: string;
}

export interface CaseNotificationPreference {
  id: string;
  userId: string;
  caseId: string;
  enabled: boolean;
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  pushEnabled?: boolean;
  inAppEnabled?: boolean;
  browserEnabled?: boolean;
  frequency?: NotificationFrequency;
  notifyStatusUpdates: boolean;
  notifyNewLeads: boolean;
  notifyComments: boolean;
  notifyAssignments: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  p256dhKey: string;
  authKey: string;
  deviceName?: string;
  deviceType?: string;
  browser?: string;
  isActive: boolean;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationUnsubscribe {
  id: string;
  userId: string;
  token: string;
  channel?: NotificationChannel;
  notificationType?: NotificationType;
  caseId?: string;
  unsubscribeAll: boolean;
  unsubscribedAt?: string;
  createdAt: string;
}

export interface NotificationQueueItem {
  id: string;
  userId: string;
  notificationType: NotificationType;
  channel: NotificationChannel;
  caseId?: string;
  subject?: string;
  body: string;
  metadata: Record<string, unknown>;
  scheduledFor: string;
  sentAt?: string;
  failedAt?: string;
  failureReason?: string;
  retryCount: number;
  createdAt: string;
}

export interface NotificationDeliveryLog {
  id: string;
  userId: string;
  notificationType: NotificationType;
  channel: NotificationChannel;
  caseId?: string;
  subject?: string;
  deliveredAt: string;
  openedAt?: string;
  clickedAt?: string;
  metadata: Record<string, unknown>;
}

// UI Labels and Constants
export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, { title: string; description: string }> = {
  case_status_update: {
    title: 'Case Status Updates',
    description: 'Get notified when a case status changes (active, resolved, closed)',
  },
  new_lead_tip: {
    title: 'New Leads & Tips',
    description: 'Receive alerts when new leads or tips are submitted for your cases',
  },
  comment_reply: {
    title: 'Comment Replies',
    description: 'Be notified when someone replies to your comments',
  },
  system_announcement: {
    title: 'System Announcements',
    description: 'Important updates and announcements from LocateConnect',
  },
  nearby_case_alert: {
    title: 'Nearby Case Alerts',
    description: 'Get alerted about new missing person cases in your area',
  },
  scheduled_reminder: {
    title: 'Scheduled Reminders',
    description: 'Reminders for follow-ups and scheduled actions',
  },
};

export const CHANNEL_LABELS: Record<NotificationChannel, { title: string; icon: string }> = {
  email: { title: 'Email', icon: 'envelope' },
  sms: { title: 'SMS/Text', icon: 'device-mobile' },
  push: { title: 'Push Notifications', icon: 'bell' },
  in_app: { title: 'In-App Notifications', icon: 'inbox' },
  browser: { title: 'Browser Notifications', icon: 'globe' },
};

export const FREQUENCY_LABELS: Record<NotificationFrequency, string> = {
  immediate: 'Immediately',
  daily_digest: 'Daily Digest',
  weekly_digest: 'Weekly Digest',
};

export const TIMEZONE_OPTIONS = [
  { value: 'America/Toronto', label: 'Eastern Time (Toronto)' },
  { value: 'America/New_York', label: 'Eastern Time (New York)' },
  { value: 'America/Chicago', label: 'Central Time (Chicago)' },
  { value: 'America/Denver', label: 'Mountain Time (Denver)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)' },
  { value: 'America/Vancouver', label: 'Pacific Time (Vancouver)' },
  { value: 'America/Halifax', label: 'Atlantic Time (Halifax)' },
  { value: 'America/St_Johns', label: 'Newfoundland Time' },
  { value: 'America/Edmonton', label: 'Mountain Time (Edmonton)' },
  { value: 'America/Winnipeg', label: 'Central Time (Winnipeg)' },
];

// Database row to TypeScript object mappers
export function mapNotificationPreferencesFromDb(row: Record<string, unknown>): NotificationPreferences {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    notificationsEnabled: row.notifications_enabled as boolean,
    emailEnabled: row.email_enabled as boolean,
    smsEnabled: row.sms_enabled as boolean,
    pushEnabled: row.push_enabled as boolean,
    inAppEnabled: row.in_app_enabled as boolean,
    browserEnabled: row.browser_enabled as boolean,
    emailAddress: row.email_address as string | undefined,
    phoneNumber: row.phone_number as string | undefined,
    defaultFrequency: row.default_frequency as NotificationFrequency,
    quietHoursEnabled: row.quiet_hours_enabled as boolean,
    quietHoursStart: row.quiet_hours_start as string,
    quietHoursEnd: row.quiet_hours_end as string,
    quietHoursTimezone: row.quiet_hours_timezone as string,
    channelPriority: row.channel_priority as NotificationChannel[],
    digestTime: row.digest_time as string,
    digestDayOfWeek: row.digest_day_of_week as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function mapNotificationTypePreferenceFromDb(row: Record<string, unknown>): NotificationTypePreference {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    notificationType: row.notification_type as NotificationType,
    enabled: row.enabled as boolean,
    emailEnabled: row.email_enabled as boolean | undefined,
    smsEnabled: row.sms_enabled as boolean | undefined,
    pushEnabled: row.push_enabled as boolean | undefined,
    inAppEnabled: row.in_app_enabled as boolean | undefined,
    browserEnabled: row.browser_enabled as boolean | undefined,
    frequency: row.frequency as NotificationFrequency | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function mapCaseNotificationPreferenceFromDb(row: Record<string, unknown>): CaseNotificationPreference {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    caseId: row.case_id as string,
    enabled: row.enabled as boolean,
    emailEnabled: row.email_enabled as boolean | undefined,
    smsEnabled: row.sms_enabled as boolean | undefined,
    pushEnabled: row.push_enabled as boolean | undefined,
    inAppEnabled: row.in_app_enabled as boolean | undefined,
    browserEnabled: row.browser_enabled as boolean | undefined,
    frequency: row.frequency as NotificationFrequency | undefined,
    notifyStatusUpdates: row.notify_status_updates as boolean,
    notifyNewLeads: row.notify_new_leads as boolean,
    notifyComments: row.notify_comments as boolean,
    notifyAssignments: row.notify_assignments as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
