import React, { useMemo } from "react";
import { ProgressKPI } from "./types";
import MetricsGrid, { MetricItem } from "@/components/ui/MetricsGrid";

export interface ProgressSparklineKPIsProps {
  kpis: ProgressKPI[];
  cols?: number;
  className?: string;
}

export const ProgressSparklineKPIs: React.FC<ProgressSparklineKPIsProps> = ({
  kpis,
  cols,
  className = "",
}) => {
  const metricItems: MetricItem[] = useMemo(() => {
    return kpis.map((kpi) => ({
      id: kpi.id,
      label: kpi.label,
      value: kpi.value,
      subLabel: kpi.subValue,
      badge: kpi.trend ? (
        <span
          className={`font-mono font-bold text-[11px] ${
            kpi.trend.isPositive ? "theme-accent" : "text-amber-500"
          }`}
        >
          {kpi.trend.value}
        </span>
      ) : undefined,
    }));
  }, [kpis]);

  const effectiveCols = cols || (metricItems.length <= 3 ? 3 : 4);

  return (
    <div className={className}>
      <MetricsGrid items={metricItems} cols={effectiveCols} variant="kpi" />
    </div>
  );
};

export default ProgressSparklineKPIs;
