import React, { useState } from "react";
import {
  MetricType,
  TimeHorizon,
  ProgressAnalyticsDashboardProps,
} from "./types";
import { useProgressAnalyticsEngine } from "./useProgressAnalyticsEngine";
import ProgressSparklineKPIs from "./ProgressSparklineKPIs";
import ProgressTrendsChart from "./ProgressTrendsChart";
import ProgressSessionBreakdown from "./ProgressSessionBreakdown";
import { TrendingUpIcon, ChevronIcon } from "@/components/ui/Icons";

export const ProgressAnalyticsDashboard: React.FC<ProgressAnalyticsDashboardProps> = ({
  reports = [],
  variant = "full",
  title = "Recitation Analytics & Performance",
  subtitle = "Dynamic visual metrics computed from current filter selection",
  collapsible = false,
  isExpanded: controlledExpanded,
  onToggleExpand,
  defaultMetric = "pages",
  defaultTimeHorizon = "daily",
  showKpis = true,
  showTrendsChart = true,
  showBreakdown = true,
  className = "",
}) => {
  const [internalExpanded, setInternalExpanded] = useState(true);
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

  const handleToggle = () => {
    if (onToggleExpand) {
      onToggleExpand(!isExpanded);
    } else {
      setInternalExpanded(!internalExpanded);
    }
  };

  const [activeMetric, setActiveMetric] = useState<MetricType>(defaultMetric);
  const [timeHorizon, setTimeHorizon] = useState<TimeHorizon>(defaultTimeHorizon);

  const analytics = useProgressAnalyticsEngine(reports, activeMetric, timeHorizon);

  return (
    <div className={`w-full space-y-4 animate-fade-in ${className}`}>
      {/* Optional Top Collapsible Header Bar (if collapsible) */}
      {collapsible && (
        <div
          role="button"
          tabIndex={0}
          onClick={handleToggle}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleToggle();
            }
          }}
          className="flex items-center justify-between p-3.5 rounded-2xl theme-bg-surface border theme-border shadow-2xs hover:border-[var(--border-hover)] transition cursor-pointer select-none"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0">
              <TrendingUpIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
                {title}
              </h3>
              {subtitle && (
                <p className="text-[11px] theme-text-secondary truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold theme-accent">
              {analytics.totalReports} Evaluations · {analytics.totalPages} Pages
            </span>
            <ChevronIcon isOpen={isExpanded} className="w-4 h-4 theme-text-secondary shrink-0" />
          </div>
        </div>
      )}

      {/* Analytics Content Body */}
      {(!collapsible || isExpanded) && (
        <div className="space-y-4 animate-fade-in">
          {/* 1. Sparkline KPI Cards */}
          {showKpis && variant !== "chart-only" && (
            <ProgressSparklineKPIs kpis={analytics.kpis} />
          )}

          {/* 2. Visual Trends & Breakdown Split */}
          {variant !== "kpi-only" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left Column: Recitation Progress Trends Chart */}
              <div
                className={
                  showBreakdown && variant !== "chart-only"
                    ? "col-span-12 lg:col-span-8"
                    : "col-span-12"
                }
              >
                {showTrendsChart && (
                  <ProgressTrendsChart
                    trendPoints={analytics.trendPoints}
                    activeMetric={activeMetric}
                    onMetricChange={setActiveMetric}
                    timeHorizon={timeHorizon}
                    onHorizonChange={setTimeHorizon}
                    maxMetricValue={analytics.maxMetricValue}
                    totalPages={analytics.totalPages}
                    totalReports={analytics.totalReports}
                    totalErrors={analytics.totalErrors}
                    accuracyRate={analytics.accuracyRate}
                  />
                )}
              </div>

              {/* Right Column: Session & Distribution Breakdown */}
              {showBreakdown && variant !== "chart-only" && (
                <div className="col-span-12 lg:col-span-4">
                  <ProgressSessionBreakdown
                    sessionBreakdown={analytics.sessionBreakdown}
                    aiInsight={analytics.aiInsight}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProgressAnalyticsDashboard;
