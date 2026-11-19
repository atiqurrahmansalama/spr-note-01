import React from 'react';

export interface WidgetSkeletonProps {
  title?: string;
  minHeight?: string;
  className?: string;
}

/**
 * Enterprise Widget Loading Skeleton (Rule 14: Borderless, Soft-Surface)
 * Guarantees zero Cumulative Layout Shift (CLS = 0) while heavy widgets are loaded asynchronously.
 */
export default function WidgetSkeleton({
  title,
  minHeight = 'min-h-[220px]',
  className = '',
}: WidgetSkeletonProps) {
  return (
    <div
      className={`p-4 @sm:p-5 rounded-3xl theme-bg-surface shadow-xs border-0 ring-0 flex flex-col justify-between select-none min-w-0 ${minHeight} animate-pulse ${className}`}
      aria-busy="true"
      aria-label={title ? `Loading ${title}` : 'Loading widget'}
    >
      {/* Top Header Placeholder */}
      <div className="flex items-center justify-between gap-3 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl theme-bg-app shrink-0" />
          <div className="space-y-1.5 min-w-0">
            {title ? (
              <span className="text-xs font-bold theme-text-secondary opacity-60 truncate block">
                {title}
              </span>
            ) : (
              <div className="h-3.5 w-28 rounded-md theme-bg-app" />
            )}
            <div className="h-2.5 w-40 rounded-md theme-bg-app opacity-70" />
          </div>
        </div>
        <div className="w-14 h-6 rounded-lg theme-bg-app shrink-0 opacity-50" />
      </div>

      {/* Middle Content Placeholder */}
      <div className="my-auto py-3 space-y-2.5">
        <div className="h-4 w-3/4 rounded-lg theme-bg-app" />
        <div className="h-4 w-1/2 rounded-lg theme-bg-app opacity-80" />
      </div>

      {/* Bottom Footer / Action Bar Placeholder */}
      <div className="pt-2 flex items-center justify-between gap-2 border-t border-transparent">
        <div className="h-3 w-20 rounded-md theme-bg-app opacity-60" />
        <div className="h-6 w-16 rounded-lg theme-bg-app opacity-60" />
      </div>
    </div>
  );
}
