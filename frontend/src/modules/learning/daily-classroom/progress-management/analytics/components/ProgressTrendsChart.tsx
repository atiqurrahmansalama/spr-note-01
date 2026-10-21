import React, { useState } from "react";
import { ProgressTrendPoint } from "../types";
import { InfoIcon } from "@/components/ui/Icons";

export interface ProgressTrendsChartProps {
  trendHistory: ProgressTrendPoint[];
  timeHorizon: "weekly" | "monthly" | "yearly";
  onHorizonChange: (horizon: "weekly" | "monthly" | "yearly") => void;
  totalPages: number;
}

export const ProgressTrendsChart: React.FC<ProgressTrendsChartProps> = ({
  trendHistory,
  timeHorizon,
  onHorizonChange,
  totalPages,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const maxPages = Math.max(
    ...trendHistory.map((p) => p.totalPages),
    1
  );

  return (
    <div className="theme-bg-surface border theme-border rounded-2xl p-5 shadow-sm space-y-5">
      {/* 1. Header: Title + Info + Time Horizon Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold tracking-wider uppercase theme-text-secondary">
            Recitation Progress Trend
          </span>
          <InfoIcon className="w-3.5 h-3.5 theme-text-secondary opacity-60" />
        </div>

        {/* Time Horizon Switcher */}
        <div className="flex items-center p-1 theme-bg-sub border theme-border rounded-xl self-start sm:self-auto">
          {(["weekly", "monthly", "yearly"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onHorizonChange(mode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition capitalize cursor-pointer ${
                timeHorizon === mode
                  ? "theme-bg-accent theme-accent-text shadow-sm"
                  : "theme-text-secondary hover:theme-text-primary"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Controls & Summary Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b theme-border pb-3">
        {/* Metric Summary + Legends */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs theme-text-secondary">Total Volume:</span>
            <span className="text-lg font-bold font-mono theme-text-primary">
              {totalPages} Pages
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs theme-text-secondary">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full theme-bg-accent inline-block" />
              <span>New Lesson (Sabaq)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full theme-bg-sub border theme-border inline-block" />
              <span>Revision (Sabqi / Ampara)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Chart Canvas (Stacked Block / Histogram Style) */}
      <div className="relative pt-4 pb-2">
        {/* Hover Details Floating Tooltip (Matching Image Tooltip) */}
        {hoveredIndex !== null && trendHistory[hoveredIndex] && (
          <div
            className="absolute z-20 theme-bg-elevated border theme-border rounded-xl p-2.5 shadow-xl text-xs space-y-1 pointer-events-none transition-all duration-150 animate-fade-in"
            style={{
              left: `${Math.min(80, Math.max(10, (hoveredIndex / trendHistory.length) * 100))}%`,
              top: "10px",
            }}
          >
            <div className="font-bold theme-text-primary border-b theme-border pb-1">
              {trendHistory[hoveredIndex].label} ({trendHistory[hoveredIndex].date})
            </div>
            <div className="flex items-center justify-between gap-3 text-[11px]">
              <span className="theme-text-secondary">• New Lesson:</span>
              <span className="font-mono font-bold theme-accent">
                {trendHistory[hoveredIndex].newLessonPages}p
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 text-[11px]">
              <span className="theme-text-secondary">• Revision:</span>
              <span className="font-mono font-bold theme-text-primary">
                {trendHistory[hoveredIndex].revisionPages}p
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 text-[11px] pt-0.5 border-t theme-border font-bold">
              <span>Total Sessions:</span>
              <span className="font-mono">{trendHistory[hoveredIndex].totalReports}</span>
            </div>
          </div>
        )}

        {/* Chart Grid Lines & Columns */}
        <div className="h-52 w-full flex items-end justify-between gap-2 sm:gap-3 px-2 border-b theme-border">
          {trendHistory.map((point, idx) => {
            const totalH = Math.max(12, Math.round((point.totalPages / maxPages) * 100));
            const newShare = point.totalPages > 0 ? point.newLessonPages / point.totalPages : 0.6;
            const newH = Math.round(totalH * newShare);
            const revH = Math.max(0, totalH - newH);

            const isHovered = hoveredIndex === idx;

            return (
              <div
                key={`col-${point.date}-${idx}`}
                className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer relative"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Column Stack (Matching segmented block look from reference image) */}
                <div
                  className={`w-full max-w-[28px] flex flex-col justify-end rounded-t-lg overflow-hidden transition-all duration-300 ${
                    isHovered ? "ring-2 ring-[var(--accent-main)] scale-105" : "hover:opacity-90"
                  }`}
                  style={{ height: `${totalH}%` }}
                >
                  {/* Revision Segment (Lighter block) */}
                  {revH > 0 && (
                    <div
                      className="w-full theme-bg-sub border-b border-white/10"
                      style={{ height: `${revH}%` }}
                    />
                  )}
                  {/* New Lesson Segment (Dark / Accent block) */}
                  <div
                    className="w-full theme-bg-accent"
                    style={{ height: `${newH}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* X-Axis Timeline Labels */}
        <div className="flex items-center justify-between px-2 pt-2 text-[10px] sm:text-xs font-mono theme-text-secondary uppercase tracking-wider">
          {trendHistory.map((point, idx) => (
            <span
              key={`label-${point.date}-${idx}`}
              className={`flex-1 text-center truncate ${
                hoveredIndex === idx ? "theme-accent font-bold" : ""
              }`}
            >
              {point.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProgressTrendsChart;
