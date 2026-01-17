'use client';

import React from 'react';
import { captureError, ErrorType } from '@/lib/monitoring';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
  eventId?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  eventId?: string;
}

/**
 * Default error fallback UI
 */
function DefaultErrorFallback({ error, resetError, eventId }: ErrorFallbackProps) {
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
          We apologize for the inconvenience. The error has been reported to our team.
        </p>
        
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-gray-700 font-mono overflow-auto">
            {error.message}
          </div>
        )}
        
        {eventId && (
          <p className="mt-3 text-xs text-gray-500 text-center">
            Error ID: {eventId}
          </p>
        )}
        
        <div className="mt-6 flex gap-3">
          <button
            onClick={resetError}
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

/**
 * Global error boundary component
 * Catches JavaScript errors and reports them to Sentry
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      eventId: undefined,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Capture the error with Sentry
    const eventId = captureError(error, {
      type: ErrorType.JAVASCRIPT,
      metadata: {
        componentStack: errorInfo.componentStack,
      },
    });

    this.setState({ eventId });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      eventId: undefined,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      
      return (
        <FallbackComponent
          error={this.state.error}
          resetError={this.resetError}
          eventId={this.state.eventId}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Hook version for functional components
 * Note: This wraps the component with ErrorBoundary, so it should be used at component level
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<ErrorFallbackProps>
): React.ComponentType<P> {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}
