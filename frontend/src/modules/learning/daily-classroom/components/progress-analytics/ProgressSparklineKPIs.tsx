import React, { useMemo } from "react";
import { ProgressKPI } from "./types";
import MetricsGrid, { MetricItem } from "@/components/ui/MetricsGrid";

export interface ProgressSparklineKPIsProps {
  kpis: ProgressKPI[];
  className?: string;
}

export const ProgressSparklineKPIs: React.FC<ProgressSparklineKPIsProps> = ({
  kpis,
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

  return (
    <div className={className}>
      <MetricsGrid items={metricItems} cols={4} variant="kpi" />
    </div>
  );
};

export default ProgressSparklineKPIs;
