import React from "react";
import { ProgressKPIItem } from "../types";
import {
  TrendingUpIcon,
  CheckCircleIcon,
  UsersIcon,
  AlertCircleIcon,
} from "@/components/ui/Icons";

interface ProgressKPIOverviewProps {
  kpis: ProgressKPIItem[];
}

export const ProgressKPIOverview: React.FC<ProgressKPIOverviewProps> = ({ kpis }) => {
  const getIconForKpi = (id: string) => {
    switch (id) {
      case "total_pages":
        return <TrendingUpIcon className="w-5 h-5 theme-accent" />;
      case "active_learners":
        return <UsersIcon className="w-5 h-5 text-blue-400" />;
      case "clean_rate":
        return <CheckCircleIcon className="w-5 h-5 text-emerald-400" />;
      case "total_errors":
        return <AlertCircleIcon className="w-5 h-5 text-amber-400" />;
      default:
        return <TrendingUpIcon className="w-5 h-5 theme-text-secondary" />;
    }
  };

  const getBadgeClass = (variant?: string) => {
    switch (variant) {
      case "success":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "warning":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "danger":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "info":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      default:
        return "theme-bg-subtle theme-text-secondary theme-border";
    }
  };

  return (
    <div className="w-full @container">
      <div className="grid grid-cols-1 @[480px]:grid-cols-2 @[960px]:grid-cols-4 gap-3.5">
        {kpis.map((kpi) => (
          <div
            key={kpi.id}
            className="theme-bg-surface border theme-border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-3"
          >
            {/* Top row: Icon and Badge */}
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl theme-bg-subtle border theme-border">
                {getIconForKpi(kpi.id)}
              </div>
              {kpi.badge && (
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getBadgeClass(
                    kpi.badge.variant
                  )}`}
                >
                  {kpi.badge.text}
                </span>
              )}
            </div>

            {/* Middle: Value & Label */}
            <div>
              <span className="text-[11px] font-medium uppercase tracking-wider theme-text-secondary block">
                {kpi.label}
              </span>
              <div className="text-2xl font-bold font-mono theme-text-primary tracking-tight mt-0.5">
                {kpi.value}
              </div>
            </div>

            {/* Bottom: SubValue & Trend */}
            <div className="pt-2 border-t theme-border flex items-center justify-between text-[11px] theme-text-secondary">
              <span className="truncate pr-1">{kpi.subValue}</span>
              {kpi.trend && (
                <span
                  className={`font-mono font-medium shrink-0 ${
                    kpi.trend.isPositive ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {kpi.trend.value}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
