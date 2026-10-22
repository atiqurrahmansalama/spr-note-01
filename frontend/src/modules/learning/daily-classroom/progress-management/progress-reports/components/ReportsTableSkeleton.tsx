import React from 'react';

export interface ReportsTableSkeletonProps {
  rowCount?: number;
  className?: string;
}

/**
 * High-Fidelity Table Skeleton for Progress Reports View
 * Replaces generic list cards with an exact layout-matching skeleton table
 * eliminating layout shifts, jumping badges, and visual flickering during data fetch and refresh.
 */
export default function ReportsTableSkeleton({
  rowCount = 6,
  className = '',
}: ReportsTableSkeletonProps) {
  const rows = Array.from({ length: rowCount });

  return (
    <div
      className={`w-full overflow-hidden rounded-2xl border theme-border theme-bg-surface shadow-xs animate-pulse select-none ${className}`}
    >
      {/* Table Header Skeleton */}
      <div className="flex items-center gap-3 px-4 py-3 border-b theme-border bg-slate-400/5 text-xs font-semibold">
        <div className="w-4 h-4 rounded bg-slate-400/20 shrink-0" />
        <div className="w-1/4 h-3 rounded bg-slate-400/20" />
        <div className="w-1/5 h-3 rounded bg-slate-400/20 hidden sm:block" />
        <div className="w-1/6 h-3 rounded bg-slate-400/20 hidden md:block" />
        <div className="w-1/6 h-3 rounded bg-slate-400/20 hidden lg:block" />
        <div className="w-16 h-3 rounded bg-slate-400/20 ml-auto" />
      </div>

      {/* Table Rows Skeleton */}
      <div className="divide-y theme-border">
        {rows.map((_, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 px-4 py-3.5 transition-colors"
          >
            {/* Checkbox Placeholder */}
            <div className="w-4 h-4 rounded bg-slate-400/15 shrink-0" />

            {/* Student Info: Name & ID/Roll & Pending Badge Placeholder */}
            <div className="w-1/4 space-y-1.5 min-w-0 pr-2">
              <div className="flex items-center gap-2">
                <div className="h-3.5 rounded bg-slate-400/25 w-28 max-w-full" />
                {idx === 0 && (
                  <div className="h-4 w-14 rounded-md bg-amber-500/20 border border-amber-500/30" />
                )}
              </div>
              <div className="h-2.5 rounded bg-slate-400/15 w-20" />
            </div>

            {/* Class & Dept Placeholder */}
            <div className="w-1/5 space-y-1.5 min-w-0 hidden sm:block pr-2">
              <div className="h-3 rounded bg-slate-400/20 w-24 max-w-full" />
              <div className="h-2.5 rounded bg-slate-400/15 w-16" />
            </div>

            {/* Date & Time Placeholder */}
            <div className="w-1/6 space-y-1.5 min-w-0 hidden md:block pr-2">
              <div className="h-3 rounded bg-slate-400/20 w-20" />
              <div className="h-2 rounded bg-slate-400/15 w-14" />
            </div>

            {/* Portions & Syllabus Placeholder */}
            <div className="w-1/6 space-y-1.5 min-w-0 hidden lg:block pr-2">
              <div className="h-3 rounded bg-slate-400/20 w-24" />
              <div className="h-2.5 rounded bg-slate-400/15 w-16" />
            </div>

            {/* Mistakes & Stucks Placeholder */}
            <div className="flex items-center gap-3 ml-auto shrink-0">
              <div className="h-5 w-12 rounded-md bg-slate-400/15 hidden sm:block" />
              <div className="h-5 w-5 rounded bg-slate-400/15" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
