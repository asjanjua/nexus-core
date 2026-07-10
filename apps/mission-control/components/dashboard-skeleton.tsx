export function DashboardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="panel space-y-3">
            <div className="h-2.5 w-36 rounded bg-white/10" />
            <div className="space-y-2">
              <div className="h-2.5 w-full rounded bg-white/10" />
              <div className="h-2.5 w-5/6 rounded bg-white/10" />
              <div className="h-2.5 w-4/6 rounded bg-white/10" />
            </div>
            <div className="flex gap-2 pt-1">
              <div className="h-5 w-24 rounded-full bg-white/10" />
              <div className="h-5 w-20 rounded-full bg-white/10" />
            </div>
          </div>
        ))}
      </div>
      <div className="panel space-y-3">
        <div className="h-2.5 w-44 rounded bg-white/10" />
        <div className="space-y-2">
          <div className="h-2.5 w-full rounded bg-white/10" />
          <div className="h-2.5 w-3/4 rounded bg-white/10" />
          <div className="h-2.5 w-2/3 rounded bg-white/10" />
        </div>
      </div>
    </div>
  );
}
