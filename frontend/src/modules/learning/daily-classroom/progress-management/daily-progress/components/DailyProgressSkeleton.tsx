import React from "react";
import { PageContainer } from "@/components/layout";

export interface DailyProgressSkeletonProps {
  isEmbedded?: boolean;
  maxWidth?: any;
  className?: string;
}

export function DailyProgressSkeleton({
  isEmbedded = false,
  maxWidth = "7xl",
  className = "",
}: DailyProgressSkeletonProps) {
  return (
    <PageContainer
      isEmbedded={isEmbedded}
      maxWidth={maxWidth}
      className={`space-y-6 pb-12 animate-pulse ${className}`}
    >
      {/* 1. Classroom Filter Controls Skeleton (5 inputs together) */}
      <div className="w-full rounded-2xl theme-bg-surface border theme-border p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="h-10 rounded-xl bg-slate-400/10 border theme-border" />
          <div className="h-10 rounded-xl bg-slate-400/10 border theme-border" />
          <div className="h-10 rounded-xl bg-slate-400/10 border theme-border" />
          <div className="h-10 rounded-xl bg-slate-400/10 border theme-border" />
          <div className="h-10 rounded-xl bg-slate-400/10 border theme-border" />
        </div>
      </div>

      {/* 2. Mode Switcher Bar Skeleton */}
      <div className="flex items-center justify-between px-1">
        <div className="h-4 w-32 rounded bg-slate-400/20" />
        <div className="h-8 w-44 rounded-xl bg-slate-400/15" />
      </div>

      {/* 3. Card 1: Session, Lesson & Page Details Unified Card Skeleton */}
      <div className="w-full rounded-2xl theme-bg-surface border theme-border p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
          <div className="h-10 rounded-xl bg-slate-400/10 border theme-border" />
          <div className="h-10 rounded-xl bg-slate-400/10 border theme-border" />
        </div>
        <div className="border-t theme-border border-opacity-30 my-3" />
        <div className="flex items-center justify-between">
          <div className="h-4 w-40 rounded bg-slate-400/20" />
          <div className="h-7 w-20 rounded-lg bg-slate-400/10" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="h-11 rounded-xl bg-slate-400/10 border theme-border" />
          <div className="h-11 rounded-xl bg-slate-400/10 border theme-border" />
          <div className="h-11 rounded-xl bg-slate-400/10 border theme-border" />
        </div>
      </div>

      {/* 4. Card 2: Mistakes & Stuck Trackers Skeleton */}
      <div className="w-full rounded-2xl theme-bg-surface border theme-border p-5 shadow-sm space-y-4">
        <div className="space-y-3">
          <div className="h-4 w-36 rounded bg-slate-400/20" />
          <div className="h-20 rounded-xl bg-slate-400/10 border theme-border" />
        </div>
        <div className="border-t theme-border border-opacity-30 my-3" />
        <div className="space-y-3">
          <div className="h-4 w-36 rounded bg-slate-400/20" />
          <div className="h-20 rounded-xl bg-slate-400/10 border theme-border" />
        </div>
      </div>

      {/* 5. Card 3: Comment & Action Footer Skeleton */}
      <div className="w-full rounded-2xl theme-bg-surface border theme-border p-5 shadow-sm space-y-4">
        <div className="h-20 rounded-xl bg-slate-400/10 border theme-border" />
        <div className="flex items-center justify-end gap-3 pt-2">
          <div className="h-10 w-28 rounded-xl bg-slate-400/15" />
          <div className="h-10 w-36 rounded-xl bg-slate-400/20" />
        </div>
      </div>
    </PageContainer>
  );
}

export default DailyProgressSkeleton;
