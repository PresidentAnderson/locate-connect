"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { NextIntlClientProvider } from "next-intl";
import {
  DEFAULT_LOCALE,
  getLocaleDirection,
  getMessages,
  normalizeLocale,
  detectBrowserLocale,
  SUPPORTED_LOCALES,
  isRTL,
  isLocaleComplete,
} from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  direction: "ltr" | "rtl";
  isRTL: boolean;
  isComplete: boolean;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => undefined,
  direction: "ltr",
  isRTL: false,
  isComplete: true,
});

const STORAGE_KEY = "locateconnect.locale";

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [isHydrated, setIsHydrated] = useState(false);

  // Initialize locale from storage or browser detection
  useEffect(() => {
    const stored = typeof window !== "undefined"
      ? window.localStorage.getItem(STORAGE_KEY)
      : null;

    let nextLocale: Locale;

    if (stored) {
      // User has an explicit preference stored
      nextLocale = normalizeLocale(stored);
    } else {
      // Auto-detect from browser settings using enhanced detection
      nextLocale = detectBrowserLocale();
    }

    setLocaleState(nextLocale);
    setIsHydrated(true);
  }, []);

  // Update document attributes when locale changes
  useEffect(() => {
    if (typeof document !== "undefined") {
      const html = document.documentElement;
      const direction = getLocaleDirection(locale);

      // Set language attribute
      html.lang = locale;

      // Set direction attribute for RTL support
      html.dir = direction;

      // Add/remove direction classes for styling
      if (direction === "rtl") {
        html.classList.add("rtl");
        html.classList.remove("ltr");
      } else {
        html.classList.add("ltr");
        html.classList.remove("rtl");
      }

      // Set data attributes for CSS selectors
      html.setAttribute("data-locale", locale);
      html.setAttribute("data-direction", direction);
    }
  }, [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    if (!SUPPORTED_LOCALES.includes(nextLocale)) return;
    setLocaleState(nextLocale);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, nextLocale);
    }
  }, []);

  const value = useMemo(() => ({
    locale,
    setLocale,
    direction: getLocaleDirection(locale),
    isRTL: isRTL(locale),
    isComplete: isLocaleComplete(locale),
  }), [locale, setLocale]);

  const messages = useMemo(() => getMessages(locale), [locale]);

  // Prevent hydration mismatch
  if (!isHydrated) {
    return (
      <LocaleContext.Provider value={value}>
        <NextIntlClientProvider locale={DEFAULT_LOCALE} messages={getMessages(DEFAULT_LOCALE)}>
          <div suppressHydrationWarning>{children}</div>
        </NextIntlClientProvider>
      </LocaleContext.Provider>
    );
  }

  return (
    <LocaleContext.Provider value={value}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}

/**
 * Hook to get just the direction for conditional styling
 */
export function useDirection() {
  const { direction } = useLocale();
  return direction;
}

/**
 * Hook to check if current locale is RTL
 */
export function useIsRTL() {
  const { isRTL } = useLocale();
  return isRTL;
}
