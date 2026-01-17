/**
 * LocateConnect Service Worker
 * Provides offline support, push notifications, and background sync
 * LC-FEAT-031: Mobile App Companion
 */

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `locateconnect-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `locateconnect-dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `locateconnect-images-${CACHE_VERSION}`;
const OFFLINE_CACHE = `locateconnect-offline-${CACHE_VERSION}`;

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/logo.svg',
  '/favicon.svg',
];

// API routes that should be cached for offline access
const CACHEABLE_API_ROUTES = [
  '/api/v1/cases',
  '/api/v1/alerts',
  '/api/notifications/preferences',
];

// IndexedDB configuration for offline data
const DB_NAME = 'locateconnect-offline';
const DB_VERSION = 1;

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[ServiceWorker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName !== STATIC_CACHE &&
              cacheName !== DYNAMIC_CACHE &&
              cacheName !== IMAGE_CACHE &&
              cacheName !== OFFLINE_CACHE
            ) {
              console.log('[ServiceWorker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

/**
 * Fetch event - serve from cache, network fallback
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests for caching
  if (request.method !== 'GET') {
    // Handle background sync for POST/PUT requests when offline
    if (!navigator.onLine && (request.method === 'POST' || request.method === 'PUT')) {
      event.respondWith(queueRequest(request));
      return;
    }
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle image requests
  if (request.destination === 'image') {
    event.respondWith(handleImageRequest(request));
    return;
  }

  // Handle navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Default: network first, cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

/**
 * Handle API requests with stale-while-revalidate strategy
 */
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const isCacheable = CACHEABLE_API_ROUTES.some(route => url.pathname.startsWith(route));

  if (!isCacheable) {
    return fetch(request);
  }

  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch((error) => {
      console.log('[ServiceWorker] API fetch failed:', error);
      if (cachedResponse) {
        return cachedResponse;
      }
      return new Response(JSON.stringify({
        error: 'Offline',
        message: 'You are currently offline. This data may be stale.',
        offline: true
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    });

  // Return cached response immediately if available, but still update cache
  return cachedResponse || fetchPromise;
}

/**
 * Handle image requests with cache-first strategy
 */
async function handleImageRequest(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Return a placeholder image for missing person photos
    return caches.match('/images/placeholder-person.png');
  }
}

/**
 * Handle navigation requests with network-first, offline fallback
 */
async function handleNavigationRequest(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Try to return cached page
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Return offline page
    return caches.match('/offline');
  }
}

/**
 * Queue failed requests for background sync
 */
async function queueRequest(request) {
  const db = await openDB();
  const requestData = {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: await request.text(),
    timestamp: Date.now(),
  };

  await saveToStore(db, 'sync-queue', requestData);

  // Register for background sync
  if ('sync' in self.registration) {
    await self.registration.sync.register('sync-pending-requests');
  }

  return new Response(JSON.stringify({
    queued: true,
    message: 'Request queued for sync when online'
  }), {
    status: 202,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Push notification event handler
 */
self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log('[ServiceWorker] Push event with no data');
    return;
  }

  const data = event.data.json();
  const options = {
    body: data.body || data.message,
    icon: data.icon || '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      caseId: data.caseId,
      type: data.type,
      timestamp: Date.now(),
    },
    actions: getNotificationActions(data.type),
    tag: data.tag || `locateconnect-${data.type}-${Date.now()}`,
    renotify: true,
    requireInteraction: data.urgent || data.type === 'amber_alert',
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'LocateConnect', options)
  );
});

/**
 * Get notification actions based on type
 */
function getNotificationActions(type) {
  switch (type) {
    case 'case_update':
      return [
        { action: 'view', title: 'View Case', icon: '/icons/action-view.png' },
        { action: 'dismiss', title: 'Dismiss', icon: '/icons/action-dismiss.png' },
      ];
    case 'nearby_alert':
      return [
        { action: 'view', title: 'View Details', icon: '/icons/action-view.png' },
        { action: 'share', title: 'Share', icon: '/icons/action-share.png' },
        { action: 'dismiss', title: 'Dismiss', icon: '/icons/action-dismiss.png' },
      ];
    case 'tip_submitted':
      return [
        { action: 'review', title: 'Review Tip', icon: '/icons/action-review.png' },
        { action: 'dismiss', title: 'Dismiss', icon: '/icons/action-dismiss.png' },
      ];
    case 'amber_alert':
      return [
        { action: 'view', title: 'View Alert', icon: '/icons/action-alert.png' },
        { action: 'share', title: 'Share Now', icon: '/icons/action-share.png' },
      ];
    case 'assignment':
      return [
        { action: 'accept', title: 'Accept', icon: '/icons/action-accept.png' },
        { action: 'view', title: 'View Details', icon: '/icons/action-view.png' },
      ];
    default:
      return [
        { action: 'view', title: 'View', icon: '/icons/action-view.png' },
        { action: 'dismiss', title: 'Dismiss', icon: '/icons/action-dismiss.png' },
      ];
  }
}

/**
 * Notification click handler
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const { action } = event;
  const { url, caseId, type } = event.notification.data;

  let targetUrl = url;

  switch (action) {
    case 'view':
    case 'review':
      targetUrl = caseId ? `/cases/${caseId}` : url;
      break;
    case 'share':
      // Handle share action
      targetUrl = caseId ? `/cases/${caseId}/share` : url;
      break;
    case 'accept':
      // Handle assignment acceptance
      targetUrl = `/assignments/accept?caseId=${caseId}`;
      break;
    case 'dismiss':
      // Just close the notification
      return;
    default:
      targetUrl = url || '/';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus an existing window
        for (const client of clientList) {
          if (client.url === targetUrl && 'focus' in client) {
            return client.focus();
          }
        }
        // Open a new window
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

/**
 * Background sync event handler
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-requests') {
    event.waitUntil(syncPendingRequests());
  } else if (event.tag === 'sync-offline-tips') {
    event.waitUntil(syncOfflineTips());
  } else if (event.tag === 'sync-evidence-uploads') {
    event.waitUntil(syncEvidenceUploads());
  } else if (event.tag === 'sync-field-data') {
    event.waitUntil(syncFieldData());
  }
});

/**
 * Sync pending requests when back online
 */
async function syncPendingRequests() {
  const db = await openDB();
  const requests = await getFromStore(db, 'sync-queue');

  for (const requestData of requests) {
    try {
      const response = await fetch(requestData.url, {
        method: requestData.method,
        headers: requestData.headers,
        body: requestData.body,
      });

      if (response.ok) {
        await deleteFromStore(db, 'sync-queue', requestData.id);
        // Notify the client of successful sync
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({
            type: 'SYNC_COMPLETE',
            url: requestData.url,
            success: true,
          });
        });
      }
    } catch (error) {
      console.error('[ServiceWorker] Sync failed for:', requestData.url, error);
    }
  }
}

/**
 * Sync offline tips to server
 */
async function syncOfflineTips() {
  const db = await openDB();
  const tips = await getFromStore(db, 'offline-tips');

  for (const tip of tips) {
    try {
      const response = await fetch('/api/v1/tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tip.data),
      });

      if (response.ok) {
        await deleteFromStore(db, 'offline-tips', tip.id);
        // Notify user
        await self.registration.showNotification('Tip Submitted', {
          body: 'Your offline tip has been successfully submitted.',
          icon: '/icons/icon-192x192.png',
          tag: 'tip-synced',
        });
      }
    } catch (error) {
      console.error('[ServiceWorker] Failed to sync tip:', error);
    }
  }
}

/**
 * Sync evidence uploads
 */
async function syncEvidenceUploads() {
  const db = await openDB();
  const uploads = await getFromStore(db, 'evidence-uploads');

  for (const upload of uploads) {
    try {
      const formData = new FormData();
      formData.append('file', upload.file);
      formData.append('caseId', upload.caseId);
      formData.append('metadata', JSON.stringify(upload.metadata));

      const response = await fetch('/api/evidence/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        await deleteFromStore(db, 'evidence-uploads', upload.id);
      }
    } catch (error) {
      console.error('[ServiceWorker] Failed to sync evidence:', error);
    }
  }
}

/**
 * Sync field data entries
 */
async function syncFieldData() {
  const db = await openDB();
  const fieldData = await getFromStore(db, 'field-data');

  for (const entry of fieldData) {
    try {
      const response = await fetch('/api/field-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry.data),
      });

      if (response.ok) {
        await deleteFromStore(db, 'field-data', entry.id);
      }
    } catch (error) {
      console.error('[ServiceWorker] Failed to sync field data:', error);
    }
  }
}

/**
 * Periodic background sync for case updates
 */
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-case-updates') {
    event.waitUntil(checkCaseUpdates());
  } else if (event.tag === 'check-nearby-cases') {
    event.waitUntil(checkNearbyCases());
  }
});

/**
 * Check for case updates
 */
async function checkCaseUpdates() {
  try {
    const response = await fetch('/api/v1/cases/updates');
    if (response.ok) {
      const updates = await response.json();
      if (updates.length > 0) {
        await self.registration.showNotification('Case Updates', {
          body: `${updates.length} case(s) have been updated`,
          icon: '/icons/icon-192x192.png',
          data: { url: '/cases' },
        });
      }
    }
  } catch (error) {
    console.error('[ServiceWorker] Failed to check case updates:', error);
  }
}

/**
 * Check for nearby cases based on stored location
 */
async function checkNearbyCases() {
  try {
    const db = await openDB();
    const location = await getFromStore(db, 'user-location');

    if (location && location.length > 0) {
      const { latitude, longitude } = location[0];
      const response = await fetch(
        `/api/v1/alerts/nearby?lat=${latitude}&lng=${longitude}&radius=50`
      );

      if (response.ok) {
        const cases = await response.json();
        if (cases.newCases && cases.newCases.length > 0) {
          await self.registration.showNotification('Nearby Alert', {
            body: `${cases.newCases.length} missing person case(s) near your location`,
            icon: '/icons/icon-192x192.png',
            data: { url: '/cases/nearby', type: 'nearby_alert' },
            requireInteraction: true,
          });
        }
      }
    }
  } catch (error) {
    console.error('[ServiceWorker] Failed to check nearby cases:', error);
  }
}

/**
 * Message handler for client communication
 */
self.addEventListener('message', (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'CACHE_CASE':
      cacheCaseForOffline(data.caseId);
      break;
    case 'UPDATE_LOCATION':
      updateStoredLocation(data.latitude, data.longitude);
      break;
    case 'CLEAR_CACHE':
      clearAllCaches();
      break;
    case 'QUEUE_TIP':
      queueOfflineTip(data);
      break;
    case 'QUEUE_EVIDENCE':
      queueEvidenceUpload(data);
      break;
  }
});

/**
 * Cache specific case data for offline viewing
 */
async function cacheCaseForOffline(caseId) {
  try {
    const response = await fetch(`/api/v1/cases/${caseId}`);
    if (response.ok) {
      const cache = await caches.open(OFFLINE_CACHE);
      await cache.put(`/api/v1/cases/${caseId}`, response.clone());

      // Also cache the case page
      const pageResponse = await fetch(`/cases/${caseId}`);
      if (pageResponse.ok) {
        await cache.put(`/cases/${caseId}`, pageResponse);
      }
    }
  } catch (error) {
    console.error('[ServiceWorker] Failed to cache case:', error);
  }
}

/**
 * Update stored user location for geofencing
 */
async function updateStoredLocation(latitude, longitude) {
  const db = await openDB();
  await saveToStore(db, 'user-location', {
    latitude,
    longitude,
    timestamp: Date.now(),
  });
}

/**
 * Clear all caches
 */
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(name => caches.delete(name)));
}

/**
 * Queue offline tip for later submission
 */
async function queueOfflineTip(tipData) {
  const db = await openDB();
  await saveToStore(db, 'offline-tips', {
    data: tipData,
    timestamp: Date.now(),
  });

  if ('sync' in self.registration) {
    await self.registration.sync.register('sync-offline-tips');
  }
}

/**
 * Queue evidence upload for later
 */
async function queueEvidenceUpload(uploadData) {
  const db = await openDB();
  await saveToStore(db, 'evidence-uploads', {
    ...uploadData,
    timestamp: Date.now(),
  });

  if ('sync' in self.registration) {
    await self.registration.sync.register('sync-evidence-uploads');
  }
}

// IndexedDB helper functions
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create object stores
      if (!db.objectStoreNames.contains('sync-queue')) {
        db.createObjectStore('sync-queue', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('offline-tips')) {
        db.createObjectStore('offline-tips', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('evidence-uploads')) {
        db.createObjectStore('evidence-uploads', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('field-data')) {
        db.createObjectStore('field-data', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('user-location')) {
        db.createObjectStore('user-location', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('cached-cases')) {
        const store = db.createObjectStore('cached-cases', { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };
  });
}

function saveToStore(db, storeName, data) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.add(data);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function getFromStore(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function deleteFromStore(db, storeName, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
