import React from "react";
import { ProgressTrendPoint } from "../types";
import { TrendingUpIcon } from "@/components/ui/Icons";

interface ProgressTrendHistoryProps {
  trendHistory: ProgressTrendPoint[];
  selectedDate: string;
}

export const ProgressTrendHistory: React.FC<ProgressTrendHistoryProps> = ({
  trendHistory,
  selectedDate,
}) => {
  // Max pages to scale the relative bar height
  const maxPages = Math.max(10, ...trendHistory.map((p) => p.totalPages));

  return (
    <div className="theme-bg-surface border theme-border rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 @container">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b theme-border pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg theme-bg-subtle border theme-border">
            <TrendingUpIcon className="w-4 h-4 theme-accent" />
          </div>
          <div>
            <h3 className="text-sm font-bold theme-text-primary">
              Progress Velocity & Error History (7-Day Trend)
            </h3>
            <p className="text-[11px] theme-text-secondary">
              Incremental page volume pace, clean recitation purity, and error counts
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
            <span className="theme-text-secondary">Volume (Pages)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
            <span className="theme-text-secondary">Clean Rate (%)</span>
          </div>
        </div>
      </div>

      {/* Daily Trend Bars Grid */}
      <div className="grid grid-cols-2 @[480px]:grid-cols-4 @[800px]:grid-cols-7 gap-2.5 pt-1">
        {trendHistory.map((point) => {
          const isSelected = point.date === selectedDate;
          const volumePercent = Math.min(100, Math.round((point.totalPages / maxPages) * 100));

          return (
            <div
              key={point.date}
              className={`rounded-xl p-3 border transition-all duration-200 flex flex-col justify-between space-y-2.5 ${
                isSelected
                  ? "theme-bg-subtle border-blue-500/50 ring-1 ring-blue-500/30 shadow-sm"
                  : "theme-bg-surface border theme-border hover:theme-border-strong"
              }`}
            >
              {/* Day Label */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
                  {point.label}
                </span>
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" title="Selected Date" />
                )}
              </div>

              {/* Visual Bars Container */}
              <div className="space-y-2">
                {/* Volume Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="theme-text-secondary">Pages</span>
                    <span className="font-bold text-blue-400">{point.totalPages}</span>
                  </div>
                  <div className="w-full bg-slate-700/20 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${volumePercent}%` }}
                    />
                  </div>
                </div>

                {/* Clean Rate Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="theme-text-secondary">Clean</span>
                    <span className="font-bold text-emerald-400">{point.cleanRate}%</span>
                  </div>
                  <div className="w-full bg-slate-700/20 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, point.cleanRate)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Sub-text summary */}
              <div className="text-[10px] theme-text-secondary font-mono pt-1 border-t theme-border flex justify-between">
                <span>{point.totalReports} logs</span>
                <span>{point.totalMistakes + point.totalStucks} err</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
