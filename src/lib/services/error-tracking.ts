/**
 * Error Tracking Service
 * Provides centralized error reporting and tracking functionality.
 */

export interface ErrorReport {
  id: string;
  message: string;
  stack?: string;
  timestamp: string;
  context?: Record<string, unknown>;
  userId?: string;
  url?: string;
  userAgent?: string;
  severity: "low" | "medium" | "high" | "critical";
}

export interface ErrorTrackingConfig {
  enabled: boolean;
  sampleRate: number;
  ignorePatterns: RegExp[];
  maxBreadcrumbs: number;
}

const defaultConfig: ErrorTrackingConfig = {
  enabled: process.env.NODE_ENV === "production",
  sampleRate: 1.0,
  ignorePatterns: [
    /ResizeObserver loop/,
    /Loading chunk/,
    /Network request failed/,
  ],
  maxBreadcrumbs: 50,
};

class ErrorTrackingService {
  private config: ErrorTrackingConfig;
  private breadcrumbs: Array<{ type: string; message: string; timestamp: string }> = [];
  private errorQueue: ErrorReport[] = [];

  constructor(config: Partial<ErrorTrackingConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  init() {
    if (typeof window === "undefined") return;

    // Capture unhandled errors
    window.addEventListener("error", (event) => {
      this.captureError(event.error || new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    // Capture unhandled promise rejections
    window.addEventListener("unhandledrejection", (event) => {
      this.captureError(
        event.reason instanceof Error
          ? event.reason
          : new Error(String(event.reason)),
        { type: "unhandledrejection" }
      );
    });

    console.log("[ErrorTracking] Initialized");
  }

  addBreadcrumb(type: string, message: string) {
    this.breadcrumbs.push({
      type,
      message,
      timestamp: new Date().toISOString(),
    });

    if (this.breadcrumbs.length > this.config.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }
  }

  captureError(error: Error, context?: Record<string, unknown>) {
    if (!this.config.enabled) return;

    // Check sample rate
    if (Math.random() > this.config.sampleRate) return;

    // Check ignore patterns
    const message = error.message || String(error);
    if (this.config.ignorePatterns.some((pattern) => pattern.test(message))) {
      return;
    }

    const report: ErrorReport = {
      id: crypto.randomUUID(),
      message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      context: {
        ...context,
        breadcrumbs: [...this.breadcrumbs],
      },
      url: typeof window !== "undefined" ? window.location.href : undefined,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      severity: this.determineSeverity(error),
    };

    this.errorQueue.push(report);
    this.flush();

    return report.id;
  }

  captureMessage(message: string, severity: ErrorReport["severity"] = "low") {
    if (!this.config.enabled) return;

    const report: ErrorReport = {
      id: crypto.randomUUID(),
      message,
      timestamp: new Date().toISOString(),
      context: {
        breadcrumbs: [...this.breadcrumbs],
      },
      url: typeof window !== "undefined" ? window.location.href : undefined,
      severity,
    };

    this.errorQueue.push(report);
    this.flush();

    return report.id;
  }

  private determineSeverity(error: Error): ErrorReport["severity"] {
    const message = error.message.toLowerCase();

    if (message.includes("fatal") || message.includes("critical")) {
      return "critical";
    }
    if (message.includes("unauthorized") || message.includes("forbidden")) {
      return "high";
    }
    if (message.includes("timeout") || message.includes("network")) {
      return "medium";
    }
    return "low";
  }

  private async flush() {
    if (this.errorQueue.length === 0) return;

    const errors = [...this.errorQueue];
    this.errorQueue = [];

    // In production, send to error tracking service
    if (process.env.NODE_ENV === "production") {
      try {
        await fetch("/api/errors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ errors }),
        });
      } catch {
        // Re-queue errors if send fails
        this.errorQueue.push(...errors);
      }
    } else {
      // In development, just log
      errors.forEach((error) => {
        console.group(`[ErrorTracking] ${error.severity.toUpperCase()}`);
        console.error(error.message);
        if (error.stack) console.error(error.stack);
        console.groupEnd();
      });
    }
  }
}

export const errorTracking = new ErrorTrackingService();

// React Error Boundary helper
export function captureComponentError(error: Error, errorInfo: { componentStack: string }) {
  errorTracking.captureError(error, {
    componentStack: errorInfo.componentStack,
    type: "react_error_boundary",
  });
}
