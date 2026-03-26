/**
 * Centralized Logger Utility
 *
 * Provides structured logging with context/metadata support.
 * In development, logs go to the console.
 * In production, these methods can be wired to a real logging service
 * (e.g., Datadog, Sentry, CloudWatch) by replacing the transport layer.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
}

type LogTransport = (entry: LogEntry) => void;

const isProduction = typeof process !== "undefined" && process.env?.NODE_ENV === "production";

/**
 * Default console transport for development.
 * In production, replace this with your logging service integration.
 */
const consoleTransport: LogTransport = (entry: LogEntry) => {
  const { level, message, timestamp, context } = entry;
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

  const args: unknown[] = [prefix, message];
  if (context && Object.keys(context).length > 0) {
    args.push(context);
  }

  switch (level) {
    case "error":
      console.error(...args);
      break;
    case "warn":
      console.warn(...args);
      break;
    case "info":
      console.info(...args);
      break;
    case "debug":
      if (!isProduction) {
        console.debug(...args);
      }
      break;
  }
};

/**
 * Production transport stub.
 * Wire this to your logging service (Datadog, Sentry, etc.).
 */
const productionTransport: LogTransport = (entry: LogEntry) => {
  // In production, send to external logging service.
  // For now, fall through to console transport.
  consoleTransport(entry);
};

const transport: LogTransport = isProduction ? productionTransport : consoleTransport;

function createLogEntry(level: LogLevel, message: string, context?: LogContext): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    context,
  };
}

export const logger = {
  /**
   * Log an error message with optional context/metadata.
   */
  error(message: string, context?: LogContext): void {
    transport(createLogEntry("error", message, context));
  },

  /**
   * Log a warning message with optional context/metadata.
   */
  warn(message: string, context?: LogContext): void {
    transport(createLogEntry("warn", message, context));
  },

  /**
   * Log an informational message with optional context/metadata.
   */
  info(message: string, context?: LogContext): void {
    transport(createLogEntry("info", message, context));
  },

  /**
   * Log a debug message with optional context/metadata.
   * Suppressed in production by default.
   */
  debug(message: string, context?: LogContext): void {
    transport(createLogEntry("debug", message, context));
  },
};

export default logger;
