"use client";

/**
 * PWA Provider Component
 * Manages PWA functionality including service worker and install prompt
 * LC-FEAT-031: Mobile App Companion
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  registerServiceWorker,
  getServiceWorkerStatus,
  setupUpdateHandler,
  skipWaiting,
  type ServiceWorkerStatus,
} from "@/lib/pwa/service-worker";
import {
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPush,
  getCurrentSubscription,
  type PushSubscriptionData,
} from "@/lib/pwa/push-notifications";
import {
  isStoragePersistent,
  requestPersistentStorage,
  getStorageEstimate,
} from "@/lib/pwa/indexeddb";

interface PWAContextValue {
  // Installation
  isInstalled: boolean;
  canInstall: boolean;
  promptInstall: () => Promise<void>;

  // Service Worker
  swStatus: ServiceWorkerStatus;
  swUpdateAvailable: boolean;
  updateServiceWorker: () => void;

  // Push Notifications
  pushSupported: boolean;
  pushPermission: NotificationPermission;
  pushSubscription: PushSubscriptionData | null;
  requestPushPermission: () => Promise<NotificationPermission>;
  subscribePush: () => Promise<PushSubscriptionData | null>;

  // Offline
  isOnline: boolean;
  isStoragePersistent: boolean;
  storageUsage: { usage: number; quota: number; percentUsed: number };

  // Registration
  registerPeriodicSync: (tag: string, minInterval: number) => Promise<boolean>;
}

const PWAContext = createContext<PWAContextValue | null>(null);

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PWAProviderProps {
  children: ReactNode;
  vapidPublicKey?: string;
}

export function PWAProvider({ children, vapidPublicKey }: PWAProviderProps) {
  // Installation state
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  // Service worker state
  const [swStatus, setSwStatus] = useState<ServiceWorkerStatus>({
    isSupported: false,
    isRegistered: false,
    registration: null,
    isWaiting: false,
    isActive: false,
  });
  const [swUpdateAvailable, setSwUpdateAvailable] = useState(false);

  // Push notification state
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");
  const [pushSubscription, setPushSubscription] = useState<PushSubscriptionData | null>(null);

  // Offline state
  const [isOnline, setIsOnline] = useState(true);
  const [isPersistent, setIsPersistent] = useState(false);
  const [storageUsage, setStorageUsage] = useState({
    usage: 0,
    quota: 0,
    percentUsed: 0,
  });

  // Initialize PWA features
  useEffect(() => {
    const init = async () => {
      // Check if already installed
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
      setIsInstalled(isStandalone);

      // Check online status
      setIsOnline(navigator.onLine);

      // Register service worker
      const registration = await registerServiceWorker();
      if (registration) {
        const status = await getServiceWorkerStatus();
        setSwStatus(status);
      }

      // Setup push notifications
      setPushPermission(getNotificationPermission());

      if (isPushSupported()) {
        const subscription = await getCurrentSubscription();
        setPushSubscription(subscription);
      }

      // Check storage
      const persistent = await isStoragePersistent();
      setIsPersistent(persistent);

      const estimate = await getStorageEstimate();
      setStorageUsage(estimate);
    };

    init();
  }, []);

  // Listen for install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // Listen for online/offline
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Setup service worker update handler
  useEffect(() => {
    const cleanup = setupUpdateHandler(
      () => setSwUpdateAvailable(true),
      () => window.location.reload()
    );

    return cleanup;
  }, []);

  // Prompt install
  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
    setCanInstall(false);
  }, [deferredPrompt]);

  // Update service worker
  const updateServiceWorker = useCallback(() => {
    skipWaiting();
  }, []);

  // Request push permission
  const requestPushPermissionHandler = useCallback(async () => {
    const permission = await requestNotificationPermission();
    setPushPermission(permission);
    return permission;
  }, []);

  // Subscribe to push
  const subscribePushHandler = useCallback(async () => {
    if (!vapidPublicKey) {
      console.warn("VAPID public key not provided");
      return null;
    }

    const subscription = await subscribeToPush(vapidPublicKey);
    setPushSubscription(subscription);
    return subscription;
  }, [vapidPublicKey]);

  // Register periodic sync
  const registerPeriodicSyncHandler = useCallback(
    async (tag: string, minInterval: number) => {
      if (!swStatus.registration) return false;

      try {
        const reg = swStatus.registration as ServiceWorkerRegistration & {
          periodicSync?: { register: (tag: string, options: { minInterval: number }) => Promise<void> };
        };

        if ("periodicSync" in reg && reg.periodicSync) {
          await reg.periodicSync.register(tag, { minInterval });
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [swStatus.registration]
  );

  const value: PWAContextValue = {
    isInstalled,
    canInstall,
    promptInstall,
    swStatus,
    swUpdateAvailable,
    updateServiceWorker,
    pushSupported: isPushSupported(),
    pushPermission,
    pushSubscription,
    requestPushPermission: requestPushPermissionHandler,
    subscribePush: subscribePushHandler,
    isOnline,
    isStoragePersistent: isPersistent,
    storageUsage,
    registerPeriodicSync: registerPeriodicSyncHandler,
  };

  return <PWAContext.Provider value={value}>{children}</PWAContext.Provider>;
}

export function usePWA() {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error("usePWA must be used within a PWAProvider");
  }
  return context;
}

/**
 * PWA Install Banner Component
 */
export function PWAInstallBanner() {
  const { canInstall, promptInstall, isInstalled } = usePWA();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const wasDismissed = localStorage.getItem("pwa-banner-dismissed");
    if (wasDismissed) {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("pwa-banner-dismissed", "true");
  };

  if (isInstalled || !canInstall || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-blue-600 text-white safe-area-inset-bottom z-50">
      <div className="flex items-center gap-4 max-w-lg mx-auto">
        <div className="flex-1">
          <p className="font-medium">Install LocateConnect</p>
          <p className="text-sm text-blue-100">
            Get quick access and offline support
          </p>
        </div>
        <button
          onClick={promptInstall}
          className="px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="p-2 hover:bg-blue-500 rounded-lg"
          aria-label="Dismiss"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

/**
 * Service Worker Update Banner
 */
export function SWUpdateBanner() {
  const { swUpdateAvailable, updateServiceWorker } = usePWA();

  if (!swUpdateAvailable) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 p-3 bg-green-600 text-white safe-area-inset-top z-50">
      <div className="flex items-center justify-center gap-4 max-w-lg mx-auto">
        <p className="text-sm">A new version is available</p>
        <button
          onClick={updateServiceWorker}
          className="px-3 py-1 bg-white text-green-600 rounded font-medium text-sm hover:bg-green-50"
        >
          Update Now
        </button>
      </div>
    </div>
  );
}

/**
 * Offline Indicator Component
 */
export function OfflineIndicator() {
  const { isOnline } = usePWA();

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 p-2 bg-amber-500 text-amber-900 text-center text-sm font-medium safe-area-inset-top z-50">
      <span className="inline-flex items-center gap-2">
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
          />
        </svg>
        You are offline
      </span>
    </div>
  );
}
