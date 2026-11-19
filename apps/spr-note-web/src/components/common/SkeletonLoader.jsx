export default function SkeletonLoader({ type = "card", count = 3 }) {
  const items = Array.from({ length: count });

  if (type === "form") {
    return (
      <div className="w-full max-w-xl mx-auto space-y-4 animate-pulse">
        <div className="h-16 theme-bg-surface border theme-border rounded-2xl p-4 flex items-center justify-between">
          <div className="h-4 bg-slate-400/20 rounded w-1/3" />
          <div className="h-4 bg-slate-400/20 rounded w-1/6" />
        </div>
        <div className="h-40 theme-bg-surface border theme-border rounded-2xl p-5 space-y-3">
          <div className="h-4 bg-slate-400/20 rounded w-1/4" />
          <div className="h-10 bg-slate-400/15 rounded-xl w-full" />
          <div className="h-10 bg-slate-400/15 rounded-xl w-full" />
        </div>
        <div className="h-48 theme-bg-surface border theme-border rounded-2xl p-5 space-y-3">
          <div className="h-4 bg-slate-400/20 rounded w-1/3" />
          <div className="h-12 bg-slate-400/15 rounded-xl w-full" />
          <div className="h-12 bg-slate-400/15 rounded-xl w-full" />
        </div>
      </div>
    );
  }

  if (type === "list" || type === "table") {
    return (
      <div className="w-full space-y-3 animate-pulse">
        {items.map((_, i) => (
          <div
            key={i}
            className="w-full theme-bg-surface border theme-border rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-full bg-slate-400/20 shrink-0" />
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="h-3.5 bg-slate-400/20 rounded w-1/3" />
                <div className="h-2.5 bg-slate-400/15 rounded w-1/2" />
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-12 h-6 bg-slate-400/20 rounded-md" />
              <div className="w-12 h-6 bg-slate-400/20 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
      {items.map((_, i) => (
        <div key={i} className="theme-bg-surface border theme-border rounded-2xl p-5 space-y-3 shadow-sm">
          <div className="h-4 bg-slate-400/20 rounded w-1/2" />
          <div className="h-3 bg-slate-400/15 rounded w-3/4" />
          <div className="h-10 bg-slate-400/10 rounded-xl w-full mt-2" />
        </div>
      ))}
    </div>
  );
}
