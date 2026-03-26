export default function LawEnforcementLoading() {
  return (
    <div className="space-y-6 animate-pulse" role="status" aria-label="Loading law enforcement dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="h-7 w-56 rounded bg-gray-200" />
          <div className="mt-2 h-4 w-64 rounded bg-gray-200" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-36 rounded-full bg-gray-200" />
          <div className="h-10 w-32 rounded-lg bg-gray-200" />
        </div>
      </div>

      {/* Priority cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="h-4 w-20 rounded bg-gray-200" />
            <div className="mt-2 h-10 w-12 rounded bg-gray-200" />
            <div className="mt-1 h-3 w-28 rounded bg-gray-200" />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="h-5 w-40 rounded bg-gray-200" />
        </div>
        <div className="p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3 rounded border border-gray-100">
              <div className="h-3 w-3 rounded-full bg-gray-200" />
              <div className="flex-1">
                <div className="h-4 w-48 rounded bg-gray-200" />
                <div className="mt-1 h-3 w-32 rounded bg-gray-200" />
              </div>
              <div className="h-6 w-20 rounded-full bg-gray-200" />
              <div className="h-8 w-20 rounded-lg bg-gray-200" />
            </div>
          ))}
        </div>
      </div>

      <span className="sr-only">Loading law enforcement dashboard...</span>
    </div>
  );
}
