"use client";

export function RefreshButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
    >
      Try Again
    </button>
  );
}
