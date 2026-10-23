import React, { useState } from "react";
import { ProgressTrendPoint, MetricType, TimeHorizon } from "./types";
import {
  TrendingUpIcon,
  BookOpenIcon,
  ChecklistIcon,
  SparklesIcon,
  InfoIcon,
} from "@/components/ui/Icons";

export interface ProgressTrendsChartProps {
  trendPoints: ProgressTrendPoint[];
  activeMetric: MetricType;
  onMetricChange: (metric: MetricType) => void;
  timeHorizon: TimeHorizon;
  onHorizonChange: (horizon: TimeHorizon) => void;
  maxMetricValue: number;
  totalPages: number;
  totalReports: number;
  totalErrors: number;
  accuracyRate: number;
  className?: string;
}

export const ProgressTrendsChart: React.FC<ProgressTrendsChartProps> = ({
  trendPoints,
  activeMetric,
  onMetricChange,
  timeHorizon,
  onHorizonChange,
  maxMetricValue,
  totalPages,
  totalReports,
  totalErrors,
  accuracyRate,
  className = "",
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const getMetricSummary = () => {
    switch (activeMetric) {
      case "pages":
        return `${totalPages} Pages`;
      case "reports":
        return `${totalReports} Sessions`;
      case "mistakes":
        return `${totalErrors} Errors`;
      case "accuracy":
        return `${accuracyRate}% Clean`;
      default:
        return `${totalPages} Pages`;
    }
  };

  const metricOptions: Array<{ id: MetricType; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: "pages", label: "Pages Recited", icon: BookOpenIcon },
    { id: "reports", label: "Evaluations", icon: ChecklistIcon },
    { id: "mistakes", label: "Mistakes & Stucks", icon: InfoIcon },
    { id: "accuracy", label: "Quality Rate", icon: SparklesIcon },
  ];

  const horizonOptions: Array<{ id: TimeHorizon; label: string }> = [
    { id: "daily", label: "Daily" },
    { id: "weekly", label: "Weekly" },
    { id: "monthly", label: "Monthly" },
  ];

  return (
    <div
      className={`theme-bg-surface border theme-border rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4 select-none ${className}`}
    >
      {/* 1. Header Toolbar: Title + Metric Switcher + Horizon Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b theme-border pb-3">
        {/* Title & Badge */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0">
            <TrendingUpIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-bold tracking-wider uppercase theme-text-primary">
                Recitation Trends
              </h4>
              <InfoIcon className="w-3.5 h-3.5 theme-text-secondary opacity-60" />
            </div>
            <p className="text-[11px] theme-text-secondary">
              Real-time progression driven by current academic filter criteria
            </p>
          </div>
        </div>

        {/* Right Side Controls: Metric Switcher + Horizon Switcher */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          {/* Metric Selector Pills */}
          <div className="flex items-center p-0.5 theme-bg-sub border theme-border rounded-xl">
            {metricOptions.map((opt) => {
              const Icon = opt.icon;
              const isActive = activeMetric === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onMetricChange(opt.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? "theme-bg-accent theme-accent-text shadow-2xs"
                      : "theme-text-secondary hover:theme-text-primary"
                  }`}
                  title={`View by ${opt.label}`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">{opt.label}</span>
                </button>
              );
            })}
          </div>

          {/* Time Horizon Pills (Daily / Weekly / Monthly) */}
          <div className="flex items-center p-0.5 theme-bg-sub border theme-border rounded-xl">
            {horizonOptions.map((h) => {
              const isActive = timeHorizon === h.id;
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => onHorizonChange(h.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    isActive
                      ? "theme-bg-accent theme-accent-text shadow-2xs"
                      : "theme-text-secondary hover:theme-text-primary"
                  }`}
                >
                  {h.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Volume Summary & Legend Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs theme-text-secondary">
        <div className="flex items-baseline gap-2">
          <span>Active Dataset Total:</span>
          <span className="text-base font-extrabold font-mono theme-text-primary">
            {getMetricSummary()}
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs theme-bg-accent inline-block" />
            <span>Target Volume</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs theme-bg-sub border theme-border inline-block" />
            <span>Capacity</span>
          </div>
        </div>
      </div>

      {/* 3. Main Chart Canvas */}
      {trendPoints.length === 0 ? (
        <div className="h-48 w-full flex flex-col items-center justify-center text-center p-6 border border-dashed theme-border rounded-xl">
          <BookOpenIcon className="w-8 h-8 theme-text-secondary opacity-40 mb-2" />
          <p className="text-xs font-semibold theme-text-secondary">
            No recitation reports found matching the selected filters.
          </p>
          <span className="text-[11px] theme-text-secondary opacity-75 mt-0.5">
            Try adjusting the date range or student / class criteria.
          </span>
        </div>
      ) : (
        <div className="relative pt-6 pb-2">
          {/* Hover Details Floating Tooltip */}
          {hoveredIndex !== null && trendPoints[hoveredIndex] && (
            <div
              className="absolute z-20 theme-bg-elevated border theme-border rounded-xl p-3 shadow-xl text-xs space-y-1.5 pointer-events-none transition-all duration-150 animate-fade-in w-56"
              style={{
                left: `${Math.min(75, Math.max(5, (hoveredIndex / trendPoints.length) * 100))}%`,
                top: "0px",
              }}
            >
              <div className="font-bold theme-text-primary border-b theme-border pb-1 flex items-center justify-between">
                <span>{trendPoints[hoveredIndex].label}</span>
                <span className="text-[10px] font-mono theme-accent">
                  {trendPoints[hoveredIndex].studentCount} Student
                  {trendPoints[hoveredIndex].studentCount === 1 ? "" : "s"}
                </span>
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="theme-text-secondary">Pages Recited:</span>
                  <span className="font-mono font-bold theme-text-primary">
                    {trendPoints[hoveredIndex].totalPages}p
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="theme-text-secondary">Evaluations:</span>
                  <span className="font-mono font-bold theme-accent">
                    {trendPoints[hoveredIndex].totalReports}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="theme-text-secondary">Mistakes & Stucks:</span>
                  <span className="font-mono font-bold text-amber-500">
                    {trendPoints[hoveredIndex].totalErrors}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t theme-border font-bold">
                  <span>Quality Score:</span>
                  <span className="font-mono theme-accent">
                    {trendPoints[hoveredIndex].accuracyRate}%
                  </span>
                </div>
                {trendPoints[hoveredIndex].sessionNames.length > 0 && (
                  <div className="pt-1 text-[10px] theme-text-secondary truncate">
                    Sessions: {trendPoints[hoveredIndex].sessionNames.join(", ")}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Histogram Columns Container */}
          <div className="h-52 w-full flex items-end justify-between gap-1.5 sm:gap-2.5 px-2 border-b theme-border">
            {trendPoints.map((point, idx) => {
              const colHeightPct = Math.max(
                10,
                Math.round((point.activeValue / maxMetricValue) * 100)
              );
              const isHovered = hoveredIndex === idx;

              return (
                <div
                  key={`col-${point.key}-${idx}`}
                  className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer relative"
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {/* Histogram Bar Column */}
                  <div
                    className={`w-full max-w-[32px] rounded-t-lg transition-all duration-300 flex flex-col justify-end overflow-hidden ${
                      isHovered
                        ? "ring-2 ring-[var(--accent-main)] scale-105 shadow-md"
                        : "hover:opacity-90"
                    } ${
                      activeMetric === "mistakes"
                        ? "bg-amber-500/80"
                        : activeMetric === "accuracy"
                        ? "theme-bg-accent"
                        : "theme-bg-accent"
                    }`}
                    style={{ height: `${colHeightPct}%` }}
                  >
                    {/* Subtle top cap for enterprise visual depth */}
                    <div className="w-full h-1 bg-white/20" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* X-Axis Timeline Labels */}
          <div className="flex items-center justify-between px-2 pt-2 text-[10px] sm:text-xs font-mono theme-text-secondary tracking-wider">
            {trendPoints.map((point, idx) => (
              <span
                key={`label-${point.key}-${idx}`}
                className={`flex-1 text-center truncate ${
                  hoveredIndex === idx ? "theme-accent font-bold" : ""
                }`}
                title={point.label}
              >
                {point.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressTrendsChart;
