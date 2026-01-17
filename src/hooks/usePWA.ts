"use client";

/**
 * PWA Hooks
 * Custom hooks for PWA functionality
 * LC-FEAT-031: Mobile App Companion
 */

import { useState, useEffect, useCallback } from "react";
import {
  registerServiceWorker,
  isServiceWorkerSupported,
} from "@/lib/pwa/service-worker";
import {
  isPushSupported,
  subscribeToPush,
  getCurrentSubscription,
  saveSubscriptionToServer,
  type PushSubscriptionData,
} from "@/lib/pwa/push-notifications";

/**
 * Hook to register and manage service worker
 */
export function useServiceWorkerRegistration() {
  const [isRegistered, setIsRegistered] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isServiceWorkerSupported()) {
      return;
    }

    registerServiceWorker()
      .then((reg) => {
        if (reg) {
          setRegistration(reg);
          setIsRegistered(true);
        }
      })
      .catch((err) => {
        setError(err);
      });
  }, []);

  return { isRegistered, registration, error };
}

/**
 * Hook to manage push notification subscription
 */
export function usePushNotifications(vapidPublicKey: string) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscription, setSubscription] = useState<PushSubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Get current permission and subscription on mount
  useEffect(() => {
    if (!isPushSupported()) return;

    setPermission(Notification.permission);

    getCurrentSubscription().then((sub) => {
      setSubscription(sub);
    });
  }, []);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!isPushSupported()) {
      setError(new Error("Push notifications are not supported"));
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const sub = await subscribeToPush(vapidPublicKey);
      if (sub) {
        setSubscription(sub);
        setPermission(Notification.permission);

        // Save to server
        await saveSubscriptionToServer(sub);
      }
      return sub;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Subscription failed");
      setError(error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [vapidPublicKey]);

  return {
    permission,
    subscription,
    isLoading,
    error,
    subscribe,
    isSupported: isPushSupported(),
  };
}

/**
 * Hook to track online/offline status
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

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

  return isOnline;
}

/**
 * Hook to check if running as installed PWA
 */
export function useIsInstalled() {
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check display mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    setIsInstalled(isStandalone);

    // Listen for changes
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleChange = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return isInstalled;
}

/**
 * Hook to handle PWA install prompt
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function useInstallPrompt() {
  const [canInstall, setCanInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    setDeferredPrompt(null);
    setCanInstall(false);

    return outcome === "accepted";
  }, [deferredPrompt]);

  return { canInstall, promptInstall };
}

/**
 * Hook to get current geolocation
 */
export function useGeolocation(options?: PositionOptions) {
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<GeolocationPositionError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const getCurrentPosition = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setError({
        code: 2,
        message: "Geolocation is not supported",
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      } as GeolocationPositionError);
      return;
    }

    setIsLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition(pos);
        setIsLoading(false);
      },
      (err) => {
        setError(err);
        setIsLoading(false);
      },
      options
    );
  }, [options]);

  return { position, error, isLoading, getCurrentPosition };
}

/**
 * Hook to watch geolocation changes
 */
export function useWatchPosition(options?: PositionOptions) {
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<GeolocationPositionError | null>(null);
  const [isWatching, setIsWatching] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);

  const startWatching = useCallback(() => {
    if (!("geolocation" in navigator)) return;

    const id = navigator.geolocation.watchPosition(
      (pos) => setPosition(pos),
      (err) => setError(err),
      options
    );

    setWatchId(id);
    setIsWatching(true);
  }, [options]);

  const stopWatching = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsWatching(false);
  }, [watchId]);

  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  return { position, error, isWatching, startWatching, stopWatching };
}
