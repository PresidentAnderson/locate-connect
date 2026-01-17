/**
 * Service Worker registration and management utilities
 * LC-FEAT-031: Mobile App Companion
 */

export interface ServiceWorkerStatus {
  isSupported: boolean;
  isRegistered: boolean;
  registration: ServiceWorkerRegistration | null;
  isWaiting: boolean;
  isActive: boolean;
}

/**
 * Check if service workers are supported
 */
export function isServiceWorkerSupported(): boolean {
  return 'serviceWorker' in navigator;
}

/**
 * Register the service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isServiceWorkerSupported()) {
    console.warn('Service workers are not supported in this browser');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    });

    console.log('ServiceWorker registered successfully:', registration.scope);

    // Check for updates periodically
    setInterval(
      () => {
        registration.update();
      },
      60 * 60 * 1000
    ); // Check every hour

    return registration;
  } catch (error) {
    console.error('ServiceWorker registration failed:', error);
    return null;
  }
}

/**
 * Get current service worker status
 */
export async function getServiceWorkerStatus(): Promise<ServiceWorkerStatus> {
  if (!isServiceWorkerSupported()) {
    return {
      isSupported: false,
      isRegistered: false,
      registration: null,
      isWaiting: false,
      isActive: false,
    };
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();

    return {
      isSupported: true,
      isRegistered: !!registration,
      registration: registration || null,
      isWaiting: !!registration?.waiting,
      isActive: !!registration?.active,
    };
  } catch {
    return {
      isSupported: true,
      isRegistered: false,
      registration: null,
      isWaiting: false,
      isActive: false,
    };
  }
}

/**
 * Unregister the service worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!isServiceWorkerSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      return registration.unregister();
    }
    return false;
  } catch (error) {
    console.error('Failed to unregister service worker:', error);
    return false;
  }
}

/**
 * Skip waiting and activate new service worker
 */
export async function skipWaiting(): Promise<void> {
  const registration = await navigator.serviceWorker.getRegistration();
  if (registration?.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
}

/**
 * Send message to service worker
 */
export async function sendMessageToSW(
  message: Record<string, unknown>
): Promise<void> {
  const registration = await navigator.serviceWorker.getRegistration();
  if (registration?.active) {
    registration.active.postMessage(message);
  }
}

/**
 * Listen for service worker messages
 */
export function onServiceWorkerMessage(
  callback: (event: MessageEvent) => void
): () => void {
  if (!isServiceWorkerSupported()) {
    return () => {};
  }

  navigator.serviceWorker.addEventListener('message', callback);

  return () => {
    navigator.serviceWorker.removeEventListener('message', callback);
  };
}

/**
 * Request service worker to cache a specific case
 */
export async function requestCaseCache(caseId: string): Promise<void> {
  await sendMessageToSW({
    type: 'CACHE_CASE',
    data: { caseId },
  });
}

/**
 * Update location in service worker for geofencing
 */
export async function updateLocationInSW(
  latitude: number,
  longitude: number
): Promise<void> {
  await sendMessageToSW({
    type: 'UPDATE_LOCATION',
    data: { latitude, longitude },
  });
}

/**
 * Request service worker to clear all caches
 */
export async function clearServiceWorkerCaches(): Promise<void> {
  await sendMessageToSW({ type: 'CLEAR_CACHE' });
}

/**
 * Queue a tip for offline sync via service worker
 */
export async function queueTipViaSW(
  tipData: Record<string, unknown>
): Promise<void> {
  await sendMessageToSW({
    type: 'QUEUE_TIP',
    data: tipData,
  });
}

/**
 * Queue evidence upload via service worker
 */
export async function queueEvidenceViaSW(
  uploadData: Record<string, unknown>
): Promise<void> {
  await sendMessageToSW({
    type: 'QUEUE_EVIDENCE',
    data: uploadData,
  });
}

/**
 * Register for background sync
 */
export async function registerBackgroundSync(tag: string): Promise<boolean> {
  if (!isServiceWorkerSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    if ('sync' in registration) {
      await (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register(tag);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to register background sync:', error);
    return false;
  }
}

/**
 * Register for periodic background sync
 */
export async function registerPeriodicSync(
  tag: string,
  minInterval: number
): Promise<boolean> {
  if (!isServiceWorkerSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    if ('periodicSync' in registration) {
      const status = await navigator.permissions.query({
        name: 'periodic-background-sync' as PermissionName,
      });

      if (status.state === 'granted') {
        await (registration as ServiceWorkerRegistration & {
          periodicSync: { register: (tag: string, options: { minInterval: number }) => Promise<void> }
        }).periodicSync.register(tag, {
          minInterval,
        });
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Failed to register periodic sync:', error);
    return false;
  }
}

/**
 * Setup service worker update handler
 */
export function setupUpdateHandler(
  onUpdateAvailable: () => void,
  onUpdateActivated: () => void
): () => void {
  if (!isServiceWorkerSupported()) {
    return () => {};
  }

  let refreshing = false;

  const handleControllerChange = () => {
    if (!refreshing) {
      refreshing = true;
      onUpdateActivated();
    }
  };

  navigator.serviceWorker.addEventListener(
    'controllerchange',
    handleControllerChange
  );

  // Check for waiting worker on page load
  navigator.serviceWorker.getRegistration().then((registration) => {
    if (registration?.waiting) {
      onUpdateAvailable();
    }

    // Listen for new workers
    registration?.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      newWorker?.addEventListener('statechange', () => {
        if (
          newWorker.state === 'installed' &&
          navigator.serviceWorker.controller
        ) {
          onUpdateAvailable();
        }
      });
    });
  });

  return () => {
    navigator.serviceWorker.removeEventListener(
      'controllerchange',
      handleControllerChange
    );
  };
}
