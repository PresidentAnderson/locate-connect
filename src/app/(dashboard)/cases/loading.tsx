export default function CasesLoading() {
  return (
    <div className="space-y-6 animate-pulse" role="status" aria-label="Loading cases">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="h-7 w-32 rounded bg-gray-200" />
          <div className="mt-2 h-4 w-64 rounded bg-gray-200" />
        </div>
        <div className="h-10 w-48 rounded-lg bg-gray-200" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="h-4 w-20 rounded bg-gray-200" />
            <div className="mt-2 h-8 w-12 rounded bg-gray-200" />
          </div>
        ))}
      </div>

      {/* Case card skeleton */}
      <div className="rounded-xl border-2 border-gray-200 bg-white p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="h-20 w-20 rounded-lg bg-gray-200 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-40 rounded bg-gray-200" />
            <div className="h-4 w-32 rounded bg-gray-200" />
            <div className="h-4 w-64 rounded bg-gray-200" />
          </div>
          <div className="h-10 w-28 rounded-lg bg-gray-200 shrink-0" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-6 w-32 rounded-full bg-gray-200" />
          ))}
        </div>
      </div>

      {/* Two-column content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="h-5 w-32 rounded bg-gray-200 mb-4" />
            <div className="space-y-3">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="rounded-lg border border-gray-100 p-4">
                  <div className="h-4 w-3/4 rounded bg-gray-200" />
                  <div className="mt-2 h-3 w-full rounded bg-gray-200" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <span className="sr-only">Loading cases...</span>
    </div>
  );
}
