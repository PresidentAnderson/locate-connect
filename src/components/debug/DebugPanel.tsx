"use client";

import { useState, useEffect } from "react";

interface DebugInfo {
  environment: string;
  nodeVersion: string;
  buildTime: string;
  gitCommit: string;
  requestId?: string;
}

interface ErrorLog {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
}

export function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "errors" | "network" | "performance">("info");
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [networkLogs, setNetworkLogs] = useState<Array<{ url: string; status: number; duration: number }>>([]);

  const isDev = process.env.NODE_ENV === "development";

  useEffect(() => {
    if (!isDev) return;

    setDebugInfo({
      environment: process.env.NODE_ENV || "unknown",
      nodeVersion: process.env.NODE_VERSION || "unknown",
      buildTime: process.env.BUILD_TIME || new Date().toISOString(),
      gitCommit: process.env.GIT_COMMIT || "unknown",
    });

    // Capture console errors
    const originalError = console.error;
    console.error = (...args) => {
      const error: ErrorLog = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        message: args.map(a => String(a)).join(" "),
      };
      setErrors(prev => [error, ...prev].slice(0, 50));
      originalError.apply(console, args);
    };

    // Capture unhandled errors
    const errorHandler = (event: ErrorEvent) => {
      const error: ErrorLog = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        message: event.message,
        stack: event.error?.stack,
      };
      setErrors(prev => [error, ...prev].slice(0, 50));
    };
    window.addEventListener("error", errorHandler);

    return () => {
      console.error = originalError;
      window.removeEventListener("error", errorHandler);
    };
  }, [isDev]);

  if (!isDev) return null;

  // Keyboard shortcut: Ctrl+Shift+D
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "D") {
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 rounded-full bg-gray-900 p-3 text-white shadow-lg hover:bg-gray-800"
        title="Open Debug Panel (Ctrl+Shift+D)"
      >
        <BugIcon className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 right-0 z-50 w-full max-w-lg rounded-tl-xl border-l border-t border-gray-200 bg-white shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2">
        <h3 className="text-sm font-semibold text-gray-900">Debug Panel</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="rounded p-1 text-gray-500 hover:bg-gray-100"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {(["info", "errors", "network", "performance"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2 text-xs font-medium ${
              activeTab === tab
                ? "border-b-2 border-cyan-500 text-cyan-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === "errors" && errors.length > 0 && (
              <span className="ml-1 rounded-full bg-red-100 px-1.5 text-red-600">
                {errors.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="max-h-80 overflow-y-auto p-4">
        {activeTab === "info" && debugInfo && (
          <dl className="space-y-2 text-xs">
            <div className="flex justify-between">
              <dt className="text-gray-500">Environment</dt>
              <dd className="font-mono text-gray-900">{debugInfo.environment}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Build Time</dt>
              <dd className="font-mono text-gray-900">{debugInfo.buildTime}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Git Commit</dt>
              <dd className="font-mono text-gray-900">{debugInfo.gitCommit.slice(0, 7)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Window Size</dt>
              <dd className="font-mono text-gray-900">
                {typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "N/A"}
              </dd>
            </div>
          </dl>
        )}

        {activeTab === "errors" && (
          <div className="space-y-2">
            {errors.length === 0 ? (
              <p className="text-xs text-gray-500">No errors captured</p>
            ) : (
              errors.map(error => (
                <div key={error.id} className="rounded border border-red-200 bg-red-50 p-2">
                  <p className="text-xs font-medium text-red-800">{error.message}</p>
                  <p className="mt-1 text-xs text-red-600">{error.timestamp}</p>
                  {error.stack && (
                    <pre className="mt-2 overflow-x-auto text-xs text-red-700">
                      {error.stack.slice(0, 500)}
                    </pre>
                  )}
                </div>
              ))
            )}
            {errors.length > 0 && (
              <button
                onClick={() => setErrors([])}
                className="text-xs text-red-600 hover:underline"
              >
                Clear errors
              </button>
            )}
          </div>
        )}

        {activeTab === "network" && (
          <div className="space-y-2">
            {networkLogs.length === 0 ? (
              <p className="text-xs text-gray-500">No network requests captured</p>
            ) : (
              networkLogs.map((log, i) => (
                <div key={i} className="rounded border border-gray-200 p-2 text-xs">
                  <p className="font-mono">{log.url}</p>
                  <p className="text-gray-500">
                    Status: {log.status} | Duration: {log.duration}ms
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "performance" && (
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Memory Used</span>
              <span className="font-mono">
                {typeof performance !== "undefined" && "memory" in performance
                  ? `${Math.round((performance as unknown as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize / 1024 / 1024)}MB`
                  : "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">DOM Nodes</span>
              <span className="font-mono">
                {typeof document !== "undefined" ? document.querySelectorAll("*").length : "N/A"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BugIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 12.75c1.148 0 2.278.08 3.383.237 1.037.146 1.866.966 1.866 2.013 0 3.728-2.35 6.75-5.25 6.75S6.75 18.728 6.75 15c0-1.046.83-1.867 1.866-2.013A24.204 24.204 0 0 1 12 12.75Zm0 0c2.883 0 5.647.508 8.207 1.44a23.91 23.91 0 0 1-1.152 6.06M12 12.75c-2.883 0-5.647.508-8.208 1.44.125 2.104.52 4.136 1.153 6.06M12 12.75a2.25 2.25 0 0 0 2.248-2.354M12 12.75a2.25 2.25 0 0 1-2.248-2.354M12 8.25c.995 0 1.971-.08 2.922-.236.403-.066.74-.358.795-.762a3.778 3.778 0 0 0-.399-2.25M12 8.25c-.995 0-1.97-.08-2.922-.236-.402-.066-.74-.358-.795-.762a3.734 3.734 0 0 1 .4-2.253M12 8.25a2.25 2.25 0 0 0-2.248 2.146M12 8.25a2.25 2.25 0 0 1 2.248 2.146M8.683 5a6.032 6.032 0 0 1-1.155-1.002c.07-.63.27-1.222.574-1.747m.581 2.749A3.75 3.75 0 0 1 15.318 5m0 0c.427-.283.815-.62 1.155-.999a4.471 4.471 0 0 0-.575-1.752M4.921 6a24.048 24.048 0 0 0-.392 3.314c1.668.546 3.416.914 5.223 1.082M19.08 6c.205 1.08.337 2.187.392 3.314a23.882 23.882 0 0 1-5.223 1.082" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

export default DebugPanel;
