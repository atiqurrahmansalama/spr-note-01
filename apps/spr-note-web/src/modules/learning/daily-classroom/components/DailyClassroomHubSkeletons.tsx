import React from 'react';

export interface HubTabSkeletonLoaderProps {
  isProgress?: boolean;
  isReports?: boolean;
  className?: string;
}

export interface DrawerFallbackSkeletonProps {
  className?: string;
}

/**
 * High-fidelity structural skeleton for Progress Reports Table tab
 */
export function ReportsTabSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`w-full space-y-4 animate-pulse pt-1 ${className}`}>
      {/* 1. Filter bar skeleton */}
      <div className="w-full rounded-2xl theme-bg-surface border theme-border p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="h-10 rounded-xl bg-slate-400/10 border theme-border" />
          <div className="h-10 rounded-xl bg-slate-400/10 border theme-border" />
          <div className="h-10 rounded-xl bg-slate-400/10 border theme-border" />
          <div className="h-10 rounded-xl bg-slate-400/10 border theme-border" />
        </div>
      </div>

      {/* 2. Switcher toolbar skeleton */}
      <div className="flex items-center justify-between gap-3 px-2">
        <div className="h-5 w-32 rounded bg-slate-400/15" />
        <div className="h-9 w-48 rounded-xl bg-slate-400/15 border theme-border" />
        <div className="h-8 w-20 rounded-xl bg-slate-400/15" />
      </div>

      {/* 3. Table Rows Skeleton */}
      <div className="w-full rounded-2xl theme-bg-surface border theme-border overflow-hidden shadow-xs divide-y theme-border">
        <div className="h-11 bg-slate-400/5 px-4 flex items-center gap-3">
          <div className="w-4 h-4 rounded bg-slate-400/20" />
          <div className="w-28 h-3 rounded bg-slate-400/20" />
          <div className="w-24 h-3 rounded bg-slate-400/20 hidden sm:block" />
          <div className="w-20 h-3 rounded bg-slate-400/20 hidden md:block" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="px-4 py-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-4 h-4 rounded bg-slate-400/15 shrink-0" />
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="h-3.5 rounded bg-slate-400/20 w-32" />
                <div className="h-2.5 rounded bg-slate-400/15 w-20" />
              </div>
            </div>
            <div className="h-3 rounded bg-slate-400/15 w-24 hidden sm:block" />
            <div className="h-3 rounded bg-slate-400/15 w-20 hidden md:block" />
            <div className="h-5 w-16 rounded bg-slate-400/15 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Lightweight High-Fidelity Skeleton Fallback for Classroom Hub Async Sub-views
 */
export function HubTabSkeletonLoader({ isProgress = false, isReports = false, className = '' }: HubTabSkeletonLoaderProps) {
  if (isReports) {
    return <ReportsTabSkeleton className={className} />;
  }
  if (isProgress) {
    return <ProgressTabSkeleton className={className} />;
  }
  return <LessonTabSkeleton className={className} />;
}

/**
 * High-fidelity structural skeleton for Daily Progress Management tab
 */
export function ProgressTabSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`w-full space-y-6 pb-12 animate-pulse pt-1 ${className}`}>
      {/* 1. Classroom Filter Controls Skeleton */}
      <div className="w-full rounded-2xl theme-bg-surface border theme-border p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="h-10 rounded-xl bg-slate-400/10 border theme-border" />
          <div className="h-10 rounded-xl bg-slate-400/10 border theme-border" />
          <div className="h-10 rounded-xl bg-slate-400/10 border theme-border" />
          <div className="h-10 rounded-xl bg-slate-400/10 border theme-border" />
        </div>
      </div>

      {/* 2. Student & Session Input Card Skeleton */}
      <div className="w-full rounded-2xl theme-bg-surface border theme-border p-5 shadow-sm space-y-4">
        <div className="h-4 w-40 rounded bg-slate-400/20" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-11 rounded-xl bg-slate-400/10 border theme-border" />
          <div className="h-11 rounded-xl bg-slate-400/10 border theme-border" />
        </div>
      </div>

      {/* 3. Juz & Page Target Section Skeleton */}
      <div className="w-full rounded-2xl theme-bg-surface border theme-border p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-4 w-48 rounded bg-slate-400/20" />
          <div className="h-8 w-24 rounded-lg bg-slate-400/10" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="h-11 rounded-xl bg-slate-400/10 border theme-border" />
          <div className="h-11 rounded-xl bg-slate-400/10 border theme-border" />
          <div className="h-11 rounded-xl bg-slate-400/10 border theme-border" />
        </div>
      </div>

      {/* 4. Mistakes & Stuck Trackers (2 columns) Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="w-full rounded-2xl theme-bg-surface border theme-border p-5 shadow-sm space-y-3">
          <div className="h-4 w-36 rounded bg-slate-400/20" />
          <div className="h-28 rounded-xl bg-slate-400/10 border theme-border" />
        </div>
        <div className="w-full rounded-2xl theme-bg-surface border theme-border p-5 shadow-sm space-y-3">
          <div className="h-4 w-36 rounded bg-slate-400/20" />
          <div className="h-28 rounded-xl bg-slate-400/10 border theme-border" />
        </div>
      </div>

      {/* 5. Comment & Action Footer Skeleton */}
      <div className="w-full rounded-2xl theme-bg-surface border theme-border p-5 shadow-sm space-y-4">
        <div className="h-20 rounded-xl bg-slate-400/10 border theme-border" />
        <div className="flex items-center justify-end gap-3 pt-2">
          <div className="h-10 w-28 rounded-xl bg-slate-400/15" />
          <div className="h-10 w-36 rounded-xl bg-slate-400/20" />
        </div>
      </div>
    </div>
  );
}

/**
 * Structural skeleton for Lesson Management tabs
 */
export function LessonTabSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`w-full space-y-4 animate-pulse pt-1 ${className}`}>
      <div className="h-14 rounded-xl theme-card theme-border border" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="h-20 rounded-xl theme-card theme-border border" />
        <div className="h-20 rounded-xl theme-card theme-border border" />
        <div className="h-20 rounded-xl theme-card theme-border border" />
        <div className="h-20 rounded-xl theme-card theme-border border" />
      </div>
      <div className="h-96 rounded-xl theme-card theme-border border" />
    </div>
  );
}


/**
 * Lightweight Drawer Fallback Skeleton
 */
export function DrawerFallbackSkeleton({ className = '' }: DrawerFallbackSkeletonProps) {
  return (
    <div className={`p-4 space-y-4 animate-pulse ${className}`}>
      <div className="h-8 rounded theme-card" />
      <div className="h-24 rounded theme-card" />
      <div className="h-32 rounded theme-card" />
    </div>
  );
}

export default HubTabSkeletonLoader;
