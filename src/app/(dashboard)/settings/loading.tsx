export default function SettingsLoading() {
  return (
    <div className="space-y-6 animate-pulse" role="status" aria-label="Loading settings">
      <div>
        <div className="h-7 w-28 rounded bg-gray-200" />
        <div className="mt-2 h-4 w-48 rounded bg-gray-200" />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-24 rounded bg-gray-200" />
            <div className="h-10 w-full rounded-lg bg-gray-100" />
          </div>
        ))}
        <div className="h-10 w-28 rounded-lg bg-gray-200" />
      </div>

      <span className="sr-only">Loading settings...</span>
    </div>
  );
}
