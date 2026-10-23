import React from "react";
import { ProgressKPI } from "./types";
import { InfoIcon } from "@/components/ui/Icons";

export interface ProgressSparklineKPIsProps {
  kpis: ProgressKPI[];
  className?: string;
}

export const ProgressSparklineKPIs: React.FC<ProgressSparklineKPIsProps> = ({
  kpis,
  className = "",
}) => {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 ${className}`}>
      {kpis.map((kpi) => {
        const sparkValues = kpi.sparkline && kpi.sparkline.length > 0 ? kpi.sparkline : [1, 1];
        const maxVal = Math.max(...sparkValues, 1);

        return (
          <div
            key={kpi.id}
            className="theme-bg-surface border theme-border rounded-2xl p-4 sm:p-4.5 shadow-2xs space-y-3 transition-all duration-200 hover:border-[var(--border-hover)] select-none"
          >
            {/* 1. Header: Label + Info Indicator */}
            <div className="flex items-center justify-between text-[11px] font-bold tracking-wider uppercase theme-text-secondary">
              <span className="truncate">{kpi.label}</span>
              <InfoIcon className="w-3.5 h-3.5 theme-text-secondary opacity-50 shrink-0 ml-1" />
            </div>

            {/* 2. Middle Row: Big Bold Metric + Right-aligned Vertical Micro-bars Graph */}
            <div className="flex items-end justify-between gap-3">
              <div className="space-y-0.5 min-w-0 flex-1">
                <span className="text-xl sm:text-2xl font-extrabold theme-text-primary tracking-tight font-mono block truncate">
                  {kpi.value}
                </span>
                {kpi.subValue && (
                  <span className="text-[11px] theme-text-secondary block truncate" title={kpi.subValue}>
                    {kpi.subValue}
                  </span>
                )}
              </div>

              {/* Mini Sparkline Vertical Micro-Bars */}
              <div className="flex items-end gap-1 h-8 shrink-0 px-1 py-0.5">
                {sparkValues.map((val, idx) => {
                  const barHeight = Math.max(15, Math.round((val / maxVal) * 100));
                  const isLatest = idx === sparkValues.length - 1;
                  return (
                    <div
                      key={`spark-${kpi.id}-${idx}`}
                      className="w-1 rounded-full transition-all duration-300"
                      style={{
                        height: `${barHeight}%`,
                        backgroundColor: isLatest ? "var(--accent-main)" : "var(--border-strong)",
                        opacity: isLatest ? 1 : 0.45 + (idx / sparkValues.length) * 0.4,
                      }}
                      title={`Interval ${idx + 1}: ${val}`}
                    />
                  );
                })}
              </div>
            </div>

            {/* 3. Footer: Trend Delta Indicator */}
            {kpi.trend && (
              <div className="flex items-center gap-1.5 pt-2 text-[11px] font-mono border-t theme-border">
                <span
                  className={
                    kpi.trend.isPositive
                      ? "theme-accent font-bold"
                      : "text-amber-500 font-bold"
                  }
                >
                  {kpi.trend.value}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ProgressSparklineKPIs;
