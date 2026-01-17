"use client";

import { useLocale } from "./LocaleProvider";
import { translate } from "@/lib/i18n";

interface TranslationNoticeProps {
  className?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

/**
 * Displays a notice when the current locale has incomplete translations
 */
export function TranslationNotice({
  className = "",
  dismissible = true,
  onDismiss,
}: TranslationNoticeProps) {
  const { locale, isComplete, direction } = useLocale();

  // Don't show notice for complete translations
  if (isComplete) return null;

  const noticeText = translate(locale, "common", "language.translationNotice");

  return (
    <div
      className={`translation-notice ${direction === "rtl" ? "translation-notice-rtl" : ""} ${className}`}
      role="alert"
      dir={direction}
    >
      <div className="flex items-start gap-2">
        <svg
          className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        <span className="flex-1">{noticeText}</span>
        {dismissible && onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-amber-500 hover:text-amber-700"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export default TranslationNotice;
