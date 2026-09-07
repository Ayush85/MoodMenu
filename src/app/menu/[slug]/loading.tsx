export default function MenuLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero skeleton */}
      <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-100 animate-pulse" />

      <div className="max-w-lg mx-auto px-5 -mt-6">
        {/* Category pills skeleton */}
        <div className="flex gap-2 mb-6">
          {[80, 100, 70].map((w, i) => (
            <div key={i} className="h-9 rounded-full bg-gray-200 animate-pulse" style={{ width: w }} />
          ))}
        </div>

        {/* Item row skeletons — mirrors MenuItemCard's list-row layout */}
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 p-2.5 mb-2 rounded-2xl bg-white">
            <div className="w-20 h-20 rounded-xl bg-gray-200 animate-pulse shrink-0" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-3.5 w-2/3 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-full bg-gray-100 rounded animate-pulse" />
              <div className="h-3.5 w-14 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="w-11 h-11 rounded-full bg-gray-200 animate-pulse shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
