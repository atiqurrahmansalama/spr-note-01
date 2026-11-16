import React from "react";

export interface TrendBarProps {
  pct: number;
  barWidth?: number;
  widthClass?: string;
  colorClass: string;
  ringColorClass?: string;
  isHovered: boolean;
  circleColorClass?: string;
  circleSize?: number;
  circleSizeClass?: string;
  roundedClass?: string;
  showWhiteCap?: boolean;
}

/**
 * Reusable individual bar renderer with rounded corners, unoccupied softer empty bar with bottom radius, and hover-only circle indicator
 */
export const TrendBar: React.FC<TrendBarProps> = ({
  pct,
  barWidth,
  widthClass = "",
  colorClass,
  ringColorClass,
  isHovered,
  circleColorClass,
  circleSize = 8,
  circleSizeClass = "w-2.5 h-2.5",
  roundedClass = "rounded-md",
  showWhiteCap = true,
}) => {
  const emptyPct = Math.max(0, 100 - pct);

  return (
    <div
      data-trend-bar="true"
      className={`relative h-full shrink-0 flex flex-col justify-end ${widthClass}`}
      style={barWidth ? { width: `${barWidth}px`, maxWidth: "100%" } : undefined}
    >
      {/* 1. Unoccupied Upper Bar (Starts where the real bar ends and goes to the top, completely borderless, ultra-light soft shade, with bottom radius as well) */}
      <div
        className={`w-full ${roundedClass} transition-colors duration-200 pointer-events-none ${
          isHovered
            ? "bg-[color-mix(in_srgb,var(--text-primary)_5%,transparent)]"
            : "bg-[color-mix(in_srgb,var(--text-primary)_2.2%,transparent)]"
        }`}
        style={{ height: `${emptyPct}%` }}
      />

      {/* 2. Active Data Filled Bar (Starts from baseline up to pct%, borderless, with rounded corners) */}
      <div
        className={`relative w-full ${roundedClass} transition-all duration-300 flex flex-col justify-end overflow-hidden ${
          isHovered && ringColorClass
            ? `ring-2 ${ringColorClass} scale-[1.03] shadow-md z-10`
            : "hover:opacity-95"
        } ${colorClass}`}
        style={{ height: `${pct}%` }}
      >
        {pct > 0 && showWhiteCap && (
          <div className="w-full h-0.5 sm:h-1 bg-white/20 shrink-0" />
        )}
      </div>

      {/* 3. Small Indicator Circle: ONLY visible when hovered! */}
      {isHovered && pct > 0 && circleColorClass && (
        <div
          className={`absolute z-20 rounded-full theme-bg-surface border-2 ${circleColorClass} shadow-md pointer-events-none transition-all duration-150 scale-110 ${
            !circleSize ? circleSizeClass : ""
          }`}
          style={{
            width: circleSize ? `${circleSize}px` : undefined,
            height: circleSize ? `${circleSize}px` : undefined,
            bottom: `${pct}%`,
            left: "50%",
            transform: "translate(-50%, 50%)",
          }}
        />
      )}
    </div>
  );
};

export default TrendBar;
