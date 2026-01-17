'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { setUserContext, trackApiRequest, addBreadcrumb } from '@/lib/monitoring';

interface ErrorTrackingProviderProps {
  children: React.ReactNode;
  user?: {
    id?: string;
    email?: string;
    role?: string;
    username?: string;
    anonymize?: boolean;
  };
}

/**
 * Client-side error tracking provider
 * Handles automatic navigation tracking and API request monitoring
 */
export function ErrorTrackingProvider({ children, user }: ErrorTrackingProviderProps) {
  const pathname = usePathname();

  // Set user context when available
  useEffect(() => {
    if (user) {
      setUserContext(user);
    }
  }, [user]);

  // Track page navigation
  useEffect(() => {
    if (pathname) {
      addBreadcrumb(`Navigation to ${pathname}`, 'navigation', 'info', {
        pathname,
      });
    }
  }, [pathname]);

  // Track API requests
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    // Intercept fetch requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = Date.now();
      const url = typeof args[0] === 'string' ? args[0] : args[0].url;
      const method = (args[1]?.method || 'GET').toUpperCase();

      try {
        const response = await originalFetch(...args);
        const duration = Date.now() - startTime;

        // Track the request
        trackApiRequest(method, url, response.status, duration);

        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        trackApiRequest(method, url, undefined, duration);
        throw error;
      }
    };

    // Cleanup
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return <>{children}</>;
}
