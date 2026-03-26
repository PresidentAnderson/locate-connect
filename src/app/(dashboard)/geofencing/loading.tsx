export default function GeofencingLoading() {
  return (
    <div className="space-y-6 animate-pulse" role="status" aria-label="Loading geofencing">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="h-7 w-52 rounded bg-gray-200" />
          <div className="mt-2 h-4 w-72 rounded bg-gray-200" />
        </div>
        <div className="h-10 w-36 rounded-lg bg-gray-200" />
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

      {/* Map placeholder */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="h-96 bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-gray-200" />
            <div className="mt-3 h-4 w-32 mx-auto rounded bg-gray-200" />
          </div>
        </div>
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="h-5 w-28 rounded bg-gray-200 mb-4" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-lg border border-gray-100">
              <div className="h-10 w-10 rounded-lg bg-gray-200" />
              <div className="flex-1">
                <div className="h-4 w-40 rounded bg-gray-200" />
                <div className="mt-1 h-3 w-56 rounded bg-gray-200" />
              </div>
              <div className="h-6 w-16 rounded-full bg-gray-200" />
            </div>
          ))}
        </div>
      </div>

      <span className="sr-only">Loading geofencing...</span>
    </div>
  );
}
