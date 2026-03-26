export default function ReportsLoading() {
  return (
    <div className="space-y-6 animate-pulse" role="status" aria-label="Loading reports">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-44 rounded bg-gray-200" />
          <div className="mt-2 h-4 w-72 rounded bg-gray-200" />
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 w-32 rounded bg-gray-200 mb-1" />
          ))}
        </div>
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="h-5 w-28 rounded bg-gray-200 mb-4" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-lg border-2 border-gray-200 p-4">
                  <div className="h-4 w-32 rounded bg-gray-200" />
                  <div className="mt-2 h-3 w-48 rounded bg-gray-200" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="h-5 w-32 rounded bg-gray-200 mb-4" />
            <div className="h-40 rounded-lg bg-gray-100" />
            <div className="mt-4 h-12 w-full rounded-lg bg-gray-200" />
          </div>
        </div>
      </div>

      <span className="sr-only">Loading reports...</span>
    </div>
  );
}
