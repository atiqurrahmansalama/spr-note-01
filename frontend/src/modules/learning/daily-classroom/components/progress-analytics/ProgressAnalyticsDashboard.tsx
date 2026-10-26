import React, { useState } from "react";
import {
  MetricType,
  ProgressAnalyticsDashboardProps,
} from "./types";
import { useProgressAnalyticsEngine } from "./useProgressAnalyticsEngine";
import ProgressSparklineKPIs from "./ProgressSparklineKPIs";
import { ProgressTrendsChart, ProgressSessionBreakdown } from "@/components/analytics";
import { TrendingUpIcon, ChevronIcon } from "@/components/ui/Icons";

export const ProgressAnalyticsDashboard: React.FC<ProgressAnalyticsDashboardProps> = ({
  reports = [],
  startDate,
  endDate,
  variant = "full",
  title = "Recitation Analytics & Performance",
  subtitle = "Dynamic visual metrics computed from current filter selection",
  collapsible = false,
  isExpanded: controlledExpanded,
  onToggleExpand,
  defaultMetric = "combined",
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

  const analytics = useProgressAnalyticsEngine(reports, activeMetric, startDate, endDate);

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
              {analytics.totalPages} Pages · {analytics.totalReports} Sessions
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
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
              {/* Left Column: Recitation Progress Trends Chart */}
              <div
                className={
                  showBreakdown && variant !== "chart-only"
                    ? "col-span-12 lg:col-span-8 flex flex-col"
                    : "col-span-12 flex flex-col"
                }
              >
                {showTrendsChart && (
                  <ProgressTrendsChart
                    trendPoints={analytics.trendPoints}
                    activeMetric={activeMetric}
                    onMetricChange={setActiveMetric}
                    maxMetricValue={analytics.maxMetricValue}
                    totalPages={analytics.totalPages}
                    totalMistakes={analytics.totalMistakes}
                    totalStucks={analytics.totalStucks}
                    totalErrors={analytics.totalErrors}
                    avgPagesPerDay={analytics.avgPagesPerDay}
                    peakDayPages={analytics.peakDayPages}
                    studentCount={analytics.studentCount}
                    totalReports={analytics.totalReports}
                    departmentNames={analytics.overallDepartments}
                    classNames={analytics.overallClasses}
                    sectionNames={analytics.overallSections}
                    teacherNames={analytics.overallTeachers}
                    className="h-full flex flex-col justify-between"
                  />
                )}
              </div>

              {/* Right Column: Session & Distribution Breakdown */}
              {showBreakdown && variant !== "chart-only" && (
                <div className="col-span-12 lg:col-span-4 flex flex-col">
                  <ProgressSessionBreakdown
                    sessionBreakdown={analytics.sessionBreakdown}
                    aiInsight={analytics.aiInsight}
                    className="h-full flex flex-col justify-between"
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
