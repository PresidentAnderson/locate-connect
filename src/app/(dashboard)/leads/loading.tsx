export default function LeadsLoading() {
  return (
    <div className="space-y-6 animate-pulse" role="status" aria-label="Loading leads">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="h-7 w-40 rounded bg-gray-200" />
          <div className="mt-2 h-4 w-56 rounded bg-gray-200" />
        </div>
        <div className="h-10 w-28 rounded-lg bg-gray-200" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px] h-10 rounded-lg bg-gray-200" />
        <div className="h-10 w-36 rounded-lg bg-gray-200" />
        <div className="h-10 w-36 rounded-lg bg-gray-200" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="rounded-lg bg-white border border-gray-200 p-4">
            <div className="h-7 w-10 rounded bg-gray-200" />
            <div className="mt-1 h-3 w-16 rounded bg-gray-200" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="bg-gray-50 px-6 py-3">
          <div className="flex gap-12">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-3 w-16 rounded bg-gray-200" />
            ))}
          </div>
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="border-t border-gray-200 px-6 py-4 flex items-center gap-8">
            <div className="flex-1">
              <div className="h-4 w-40 rounded bg-gray-200" />
              <div className="mt-1 h-3 w-56 rounded bg-gray-200" />
            </div>
            <div className="h-4 w-20 rounded bg-gray-200" />
            <div className="h-5 w-16 rounded-full bg-gray-200" />
            <div className="h-5 w-16 rounded-full bg-gray-200" />
            <div className="h-5 w-16 rounded-full bg-gray-200" />
            <div className="h-4 w-20 rounded bg-gray-200" />
          </div>
        ))}
      </div>

      <span className="sr-only">Loading leads...</span>
    </div>
  );
}
