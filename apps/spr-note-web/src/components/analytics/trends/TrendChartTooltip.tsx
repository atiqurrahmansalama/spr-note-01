import React from "react";

export interface TooltipMetricRow {
  label: string;
  value: string | number;
  colorClass?: string;
  dotColorClass?: string;
  valueColorClass?: string;
}

export interface TrendChartTooltipProps {
  hoveredIndex: number | null;
  label: string;
  subLabel?: string;
  totalPointsCount: number;
  containerWidth: number;
  rows?: TooltipMetricRow[];
  footerNote?: string;
  children?: React.ReactNode;
}

/**
 * Universal, Enterprise Domain-Agnostic Floating Pill Tooltip
 * Strictly zero domain-specific strings or hardcoded models.
 */
export const TrendChartTooltip: React.FC<TrendChartTooltipProps> = ({
  hoveredIndex,
  label,
  subLabel,
  totalPointsCount,
  containerWidth,
  rows = [],
  footerNote,
  children,
}) => {
  if (hoveredIndex === null || totalPointsCount <= 0 || !label) return null;

  const leftPx = ((hoveredIndex + 0.5) / totalPointsCount) * containerWidth;
  const clampedLeft = Math.max(100, Math.min(containerWidth - 100, leftPx));

  return (
    <div
      className="absolute z-50 pointer-events-none transition-all duration-150 animate-fade-in"
      style={{
        left: `${clampedLeft}px`,
        top: "8px",
        transform: "translateX(-50%)",
      }}
    >
      <div className="bg-white dark:bg-[#18191c] dark:theme-bg-surface rounded-2xl p-3.5 theme-shadow-popover text-xs space-y-2 border-0 ring-0 w-max min-w-[170px] max-w-[280px] select-none">
        <div className="font-bold theme-text-primary flex items-center justify-between gap-3 text-[12px]">
          <span className="truncate">{label}</span>
          {subLabel && (
            <span className="text-[10px] font-mono theme-text-secondary opacity-80 shrink-0">
              {subLabel}
            </span>
          )}
        </div>

        <div className="h-px w-full theme-bg-sub/80 border-0" />

        <div className="space-y-1.5 text-[11px]">
          {children ? (
            children
          ) : (
            rows.map((row, idx) => (
              <div key={idx} className="flex items-center justify-between gap-4">
                <span className={`flex items-center gap-1.5 ${row.colorClass || "theme-text-secondary"}`}>
                  {row.dotColorClass && (
                    <span className={`w-1.5 h-1.5 rounded-full ${row.dotColorClass} inline-block shrink-0`} />
                  )}
                  {row.label}
                </span>
                <span className={`font-mono font-bold ${row.valueColorClass || "theme-text-primary"}`}>
                  {row.value}
                </span>
              </div>
            ))
          )}

          {footerNote && (
            <div className="flex items-center justify-between gap-4 pt-0.5 border-t theme-border/60">
              <span className="theme-text-secondary">Accuracy:</span>
              <span className="font-mono font-bold theme-text-primary">{footerNote}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrendChartTooltip;
