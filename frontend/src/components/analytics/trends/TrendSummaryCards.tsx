import React from "react";

export interface TrendKpiItem {
  label: string;
  value: string | number;
  borderVar: string;
  colSpanClass?: string;
}

export interface TrendSummaryCardsProps {
  items: TrendKpiItem[];
  currentMetric?: "combined" | "pages" | "mistakes" | string;
  className?: string;
}

/**
 * Reusable Top Summary KPI Cards (border-l-2 minimalist style matching original)
 */
export const TrendSummaryCards: React.FC<TrendSummaryCardsProps> = ({
  items,
  currentMetric = "combined",
  className = "",
}) => {
  return (
    <div
      className={`grid gap-3 pt-1 ${
        currentMetric === "combined"
          ? "grid-cols-2 @[580px]:grid-cols-4"
          : "grid-cols-2 @[580px]:grid-cols-3"
      } ${className}`}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className={`border-l-2 pl-3 py-0.5 ${item.colSpanClass || ""}`}
          style={{ borderColor: item.borderVar }}
        >
          <span className="text-xl sm:text-2xl font-extrabold font-mono theme-text-primary block tracking-tight">
            {item.value}
          </span>
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider theme-text-secondary block">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
};

export default TrendSummaryCards;
