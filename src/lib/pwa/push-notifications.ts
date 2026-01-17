/**
 * Push Notification utilities
 * LC-FEAT-031: Mobile App Companion
 */

export interface PushSubscriptionData {
  endpoint: string;
  p256dhKey: string;
  authKey: string;
  expirationTime: number | null;
}

// Extended NotificationOptions with vibrate support (ServiceWorker API)
interface ExtendedNotificationOptions extends NotificationOptions {
  vibrate?: number | number[];
}

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(
  vapidPublicKey: string
): Promise<PushSubscriptionData | null> {
  if (!isPushSupported()) {
    console.warn('Push notifications are not supported');
    return null;
  }

  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    console.warn('Notification permission denied');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // Convert VAPID key to Uint8Array
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey as BufferSource,
    });

    const subscriptionData = formatSubscriptionData(subscription);
    return subscriptionData;
  } catch (error) {
    console.error('Failed to subscribe to push:', error);
    return null;
  }
}

/**
 * Get current push subscription
 */
export async function getCurrentSubscription(): Promise<PushSubscriptionData | null> {
  if (!isPushSupported()) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      return null;
    }

    return formatSubscriptionData(subscription);
  } catch (error) {
    console.error('Failed to get subscription:', error);
    return null;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      return subscription.unsubscribe();
    }
    return true;
  } catch (error) {
    console.error('Failed to unsubscribe:', error);
    return false;
  }
}

/**
 * Show a local notification (not push)
 */
export async function showLocalNotification(
  title: string,
  options: NotificationOptions
): Promise<void> {
  if (!('Notification' in window)) {
    return;
  }

  if (Notification.permission !== 'granted') {
    return;
  }

  // Use service worker to show notification if available
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      ...options,
    });
  } else {
    new Notification(title, options);
  }
}

/**
 * Save subscription to server
 */
export async function saveSubscriptionToServer(
  subscription: PushSubscriptionData
): Promise<boolean> {
  try {
    const response = await fetch('/api/notifications/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription,
        deviceInfo: getDeviceInfo(),
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to save subscription to server:', error);
    return false;
  }
}

/**
 * Remove subscription from server
 */
export async function removeSubscriptionFromServer(
  endpoint: string
): Promise<boolean> {
  try {
    const response = await fetch('/api/notifications/push/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ endpoint }),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to remove subscription from server:', error);
    return false;
  }
}

/**
 * Format PushSubscription into our data structure
 */
function formatSubscriptionData(
  subscription: PushSubscription
): PushSubscriptionData {
  const json = subscription.toJSON();
  const keys = json.keys || {};

  return {
    endpoint: subscription.endpoint,
    p256dhKey: keys.p256dh || '',
    authKey: keys.auth || '',
    expirationTime: subscription.expirationTime,
  };
}

/**
 * Convert VAPID public key to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Get device info for subscription
 */
function getDeviceInfo(): Record<string, string> {
  const ua = navigator.userAgent;
  let browser = 'Unknown';
  let deviceType = 'desktop';

  // Detect browser
  if (ua.includes('Firefox')) {
    browser = 'Firefox';
  } else if (ua.includes('Chrome')) {
    browser = 'Chrome';
  } else if (ua.includes('Safari')) {
    browser = 'Safari';
  } else if (ua.includes('Edge')) {
    browser = 'Edge';
  }

  // Detect device type
  if (/Mobi|Android/i.test(ua)) {
    deviceType = 'mobile';
  } else if (/Tablet|iPad/i.test(ua)) {
    deviceType = 'tablet';
  }

  return {
    browser,
    deviceType,
    platform: navigator.platform || 'Unknown',
    language: navigator.language || 'en',
  };
}

/**
 * Notification categories for LE users
 */
export const LE_NOTIFICATION_CATEGORIES = {
  CASE_ASSIGNMENT: 'case_assignment',
  URGENT_TIP: 'urgent_tip',
  CASE_UPDATE: 'case_update',
  AMBER_ALERT: 'amber_alert',
  FIELD_SYNC: 'field_sync',
} as const;

/**
 * Notification categories for public users
 */
export const PUBLIC_NOTIFICATION_CATEGORIES = {
  NEARBY_CASE: 'nearby_case',
  TIP_SUBMITTED: 'tip_submitted',
  CASE_RESOLVED: 'case_resolved',
  AMBER_ALERT: 'amber_alert',
} as const;

/**
 * Create notification options based on type
 */
export function createNotificationOptions(
  type: string,
  data: Record<string, unknown>
): ExtendedNotificationOptions {
  const baseOptions: ExtendedNotificationOptions = {
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data,
  };

  switch (type) {
    case 'amber_alert':
      return {
        ...baseOptions,
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200],
        tag: `amber-${data.caseId}`,
        actions: [
          { action: 'view', title: 'View Alert' },
          { action: 'share', title: 'Share' },
        ],
      };

    case 'case_assignment':
      return {
        ...baseOptions,
        requireInteraction: true,
        tag: `assignment-${data.caseId}`,
        actions: [
          { action: 'accept', title: 'Accept' },
          { action: 'view', title: 'View Details' },
        ],
      };

    case 'urgent_tip':
      return {
        ...baseOptions,
        requireInteraction: true,
        vibrate: [150, 75, 150],
        tag: `tip-${data.tipId}`,
        actions: [
          { action: 'review', title: 'Review Now' },
          { action: 'dismiss', title: 'Later' },
        ],
      };

    case 'nearby_case':
      return {
        ...baseOptions,
        tag: `nearby-${data.caseId}`,
        actions: [
          { action: 'view', title: 'View Case' },
          { action: 'share', title: 'Share' },
        ],
      };

    default:
      return {
        ...baseOptions,
        tag: `notification-${Date.now()}`,
        actions: [
          { action: 'view', title: 'View' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
      };
  }
}
