/**
 * Offline Page
 * Shown when user is offline and requested page is not cached
 * LC-FEAT-031: Mobile App Companion
 */

import Link from "next/link";
import { RefreshButton } from "./refresh-button";

export const dynamic = "force-dynamic";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Offline icon */}
        <div className="mb-6">
          <div className="w-24 h-24 mx-auto bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
            <svg
              className="w-12 h-12 text-amber-600 dark:text-amber-400"
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
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          You&apos;re Offline
        </h1>

        {/* Description */}
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          It looks like you&apos;ve lost your internet connection. Some features may
          be limited until you&apos;re back online.
        </p>

        {/* Available actions */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4">
            What you can do offline:
          </h2>
          <ul className="text-left space-y-3">
            <li className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="text-slate-700 dark:text-slate-300">
                View previously cached case information
              </span>
            </li>
            <li className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="text-slate-700 dark:text-slate-300">
                Draft tips and field data entries (will sync when online)
              </span>
            </li>
            <li className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="text-slate-700 dark:text-slate-300">
                Take photos and record voice notes
              </span>
            </li>
            <li className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="text-slate-700 dark:text-slate-300">
                Access emergency contact numbers
              </span>
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <RefreshButton />
          <Link
            href="/"
            className="block w-full px-4 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-medium transition-colors"
          >
            Go to Home
          </Link>
        </div>

        {/* Emergency notice */}
        <div className="mt-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="text-left">
              <p className="font-medium text-red-800 dark:text-red-300 text-sm">
                In an Emergency
              </p>
              <p className="text-red-700 dark:text-red-400 text-sm mt-1">
                Call{" "}
                <a href="tel:911" className="font-bold underline">
                  911
                </a>{" "}
                immediately if someone is in danger.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-xs text-slate-500 dark:text-slate-500">
          Your data will automatically sync when you reconnect to the internet.
        </p>
      </div>
    </div>
  );
}
