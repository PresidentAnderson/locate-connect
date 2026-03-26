export default function ColdCasesLoading() {
  return (
    <div className="space-y-6 animate-pulse" role="status" aria-label="Loading cold cases">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="h-7 w-40 rounded bg-gray-200" />
          <div className="mt-2 h-4 w-64 rounded bg-gray-200" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-28 rounded-lg bg-gray-200" />
          <div className="h-10 w-28 rounded-lg bg-gray-200" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="h-4 w-24 rounded bg-gray-200" />
            <div className="mt-2 h-8 w-12 rounded bg-gray-200" />
          </div>
        ))}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-start gap-3">
              <div className="h-16 w-16 shrink-0 rounded-lg bg-gray-200" />
              <div className="flex-1">
                <div className="h-5 w-32 rounded bg-gray-200" />
                <div className="mt-2 h-3 w-24 rounded bg-gray-200" />
                <div className="mt-2 h-3 w-40 rounded bg-gray-200" />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <div className="h-6 w-16 rounded-full bg-gray-200" />
              <div className="h-6 w-20 rounded-full bg-gray-200" />
            </div>
          </div>
        ))}
      </div>

      <span className="sr-only">Loading cold cases...</span>
    </div>
  );
}
