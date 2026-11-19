import React from "react";

export interface TrendLegendItem {
  key: string;
  label: string;
  iconNode?: React.ReactNode;
  colorClass?: string;
}

export interface TrendChartLegendProps {
  items: TrendLegendItem[];
  className?: string;
}

/**
 * Reusable Chart Legend Row matching original design
 */
export const TrendChartLegend: React.FC<TrendChartLegendProps> = ({
  items,
  className = "",
}) => {
  if (!items || items.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center justify-between gap-2 text-xs theme-text-secondary pt-1 select-none ${className}`}>
      <div className="flex flex-wrap items-center gap-3">
        {items.map((item) => (
          <div key={item.key} className="flex items-center gap-1.5 font-medium">
            {item.iconNode || (
              <span className={`w-2.5 h-2.5 rounded-full inline-block ${item.colorClass || "theme-bg-accent"}`} />
            )}
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrendChartLegend;
