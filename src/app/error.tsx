'use client';

import { useEffect } from 'react';
import { captureError, ErrorType } from '@/lib/monitoring';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to Sentry
    captureError(error, {
      type: ErrorType.JAVASCRIPT,
      metadata: {
        digest: error.digest,
      },
    });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
          <svg
            className="w-6 h-6 text-red-600"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        
        <h1 className="mt-4 text-xl font-semibold text-gray-900 text-center">
          Something went wrong
        </h1>
        
        <p className="mt-2 text-sm text-gray-600 text-center">
          We encountered an unexpected error. Our team has been notified.
        </p>
        
        {process.env.NODE_ENV === 'development' && error.message && (
          <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-gray-700 font-mono overflow-auto max-h-32">
            {error.message}
          </div>
        )}
        
        {error.digest && (
          <p className="mt-3 text-xs text-gray-500 text-center">
            Error ID: {error.digest}
          </p>
        )}
        
        <div className="mt-6 flex gap-3">
          <button
            onClick={reset}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded transition-colors"
          >
            Go home
          </button>
        </div>
      </div>
    </div>
  );
}
