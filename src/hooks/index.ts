// Custom React hooks

// i18n hooks
export { useTranslations } from "./useTranslations";

// PWA hooks
export {
  useServiceWorkerRegistration,
  usePushNotifications,
  useOnlineStatus,
  useIsInstalled,
  useInstallPrompt,
  useGeolocation,
  useWatchPosition,
} from "./usePWA";

// Real-time hooks
export {
  useRealtime,
  useRealtimePresence,
  useRealtimeBroadcast,
} from "./useRealtime";

// Notification hooks
export {
  useNotifications,
  useNotificationPreferences,
} from "./useNotifications";

// Form hooks
export {
  useFormPersistence,
  hasSavedDraft,
  clearSavedDraft,
} from "./useFormPersistence";
