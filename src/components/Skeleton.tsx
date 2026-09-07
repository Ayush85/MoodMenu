export function SkeletonBlock({ className = "", height = "h-20" }: { className?: string; height?: string }) {
  return <div className={`surface-card animate-pulse ${height} ${className}`} />;
}

export function SkeletonLine({ width = "100%", height = "16px" }: { width?: string; height?: string }) {
  return (
    <div
      className="rounded-lg animate-pulse"
      style={{ width, height, backgroundColor: "rgba(0,0,0,0.06)" }}
    />
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="surface-card p-5 space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} width={i === 0 ? "60%" : i === lines - 1 ? "40%" : "80%"} />
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="page-shell max-w-5xl animate-fade-in">
      <SkeletonLine width="200px" height="32px" />
      <div className="mt-2 mb-8">
        <SkeletonLine width="300px" height="16px" />
      </div>
      <SkeletonGrid count={4} />
    </div>
  );
}
