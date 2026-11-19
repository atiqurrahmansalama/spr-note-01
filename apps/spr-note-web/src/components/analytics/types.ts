import React from "react";
import { SegmentedSwitchOption } from "@/components/ui/SegmentedSwitch";
import type { ActionMenuItem } from "@/components/ui/ActionMenu";

/**
 * Enterprise Analytics Types & Contracts
 * Universal, domain-agnostic interfaces for analytical charts, time-series metrics,
 * KPIs, and dimensional breakdowns across any application domain (Learning, Attendance,
 * HR, Finance, Examinations, etc.).
 */

export type TimeHorizon = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

export type ChartViewMode = "bars" | "line";

export type MetricType = "combined" | "primary" | "secondary" | "pages" | "mistakes" | "reports" | "accuracy" | string;
export type ActiveMetricType = "combined" | "primary" | "secondary" | "pages" | "mistakes" | string;

/**
 * Enterprise Reusable Time-Series Trend Data Point
 * Universally models periodic data points across any domain.
 */
export interface TrendDataPoint {
  key: string;
  label: string;
  dateStr: string;
  dayName?: string;

  // Universal metric values map: { pages: 5, mistakes: 2, attendance: 95, amount: 1200, ... }
  values?: Record<string, number>;

  // Common universal fields
  value?: number;
  secondaryValue?: number;
  tertiaryValue?: number;
  totalCount?: number;
  activeValue?: number;
  rate?: number;

  // Generic grouping & entity dimensions
  entitiesCount?: number;
  entityNames?: string[];
  groupNames?: string[];
  metadata?: Record<string, any>;

  // Backward-compatibility aliases for legacy progress report consumers
  totalPages?: number;
  totalReports?: number;
  totalMistakes?: number;
  totalStucks?: number;
  totalErrors?: number;
  accuracyRate?: number;
  studentCount?: number;
  studentNames?: string[];
  sessionNames?: string[];
  departmentNames?: string[];
  classNames?: string[];
  sectionNames?: string[];
  teacherNames?: string[];
}

export type ProgressTrendPoint = TrendDataPoint;
export type RecitationTrendPoint = TrendDataPoint;

/**
 * Configuration for a single data series on a chart (bar or line)
 */
export interface ChartSeriesConfig {
  key: string;
  label: string;
  color: string;
  strokeColor?: string;
  fillColor?: string;
  indicatorClass?: string;
  ringClass?: string;
  circleBorderClass?: string;
  visible?: boolean;
  unit?: string;
}

/**
 * High-value Key Performance Indicator definition
 */
export interface AnalyticsKPI {
  id: string;
  label: string;
  value: string | number;
  subValue?: string;
  icon?: React.ComponentType<{ className?: string }>;
  sparkline?: number[];
  variant?: "default" | "accent" | "rose" | "amber" | "indigo";
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export type ProgressKPI = AnalyticsKPI;

/**
 * Generic Metadata Field definition for Chart Footers
 */
export interface TrendFooterFieldConfig {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: string[];
  emptyText?: string;
  totalSuffix?: string;
}

/**
 * Generic Dimension Breakdown Item (e.g. by session, department, category, account)
 */
export interface DimensionBreakdownItem {
  id?: string;
  label?: string;
  sessionKey?: string;
  sessionName?: string;
  totalCount?: number;
  totalReports?: number;
  primaryValue?: number;
  totalPages?: number;
  secondaryValue?: number;
  totalErrors?: number;
  rate?: number;
  cleanRate?: number;
  percentOfTotal: number;
  subLabel?: string;
  color?: string;
  metadata?: Record<string, any>;
}

export type SessionBreakdownItem = DimensionBreakdownItem;
export type SessionSlice = DimensionBreakdownItem;

/**
 * Universal Domain-Agnostic Trend Chart Component Props
 */
export interface TrendChartProps {
  dataPoints: TrendDataPoint[];
  series: ChartSeriesConfig[];
  activeMetric?: MetricType;
  onMetricChange?: (metric: MetricType) => void;
  metricOptions?: SegmentedSwitchOption[];
  title?: string;
  subtitle?: string;
  emptyMessage?: string;
  emptyIcon?: React.ComponentType<{ className?: string }>;
  kpiItems?: AnalyticsKPI[];
  footerFields?:
    | TrendFooterFieldConfig[]
    | ((
        hoveredIndex: number | null,
        hoveredPoint: TrendDataPoint | null
      ) => TrendFooterFieldConfig[]);
  hoveredIndex?: number | null;
  onHoverIndexChange?: (index: number | null) => void;
  viewMode?: ChartViewMode;
  onViewModeChange?: (mode: ChartViewMode) => void;
  exportFilename?: string;
  exportTitle?: string;
  className?: string;
  customTooltipRenderer?: (point: TrendDataPoint, series: ChartSeriesConfig[]) => React.ReactNode;
  extraMenuItems?: ActionMenuItem[];

  // Optional legacy props kept for backward-compatibility with upstream consumers
  trendPoints?: TrendDataPoint[];
  primaryMetricLabel?: string;
  secondaryMetricLabel?: string;
  tertiaryMetricLabel?: string;
  maxMetricValue?: number;
  timeHorizon?: TimeHorizon;
  onHorizonChange?: (horizon: TimeHorizon) => void;
  totalPages?: number;
  totalMistakes?: number;
  totalStucks?: number;
  totalErrors?: number;
  avgPagesPerDay?: number;
  peakDayPages?: number;
  studentCount?: number;
  totalReports?: number;
  accuracyRate?: number;
  departmentNames?: string[];
  classNames?: string[];
  sectionNames?: string[];
  teacherNames?: string[];
}

export type ProgressTrendsChartProps = TrendChartProps;

/**
 * Universal Dimension Breakdown Card Props
 */
export interface DimensionBreakdownProps {
  title?: string;
  subtitle?: string;
  dimensionLabel?: string;
  insightTitle?: string;
  insightText?: string;
  emptyText?: string;
  items?: DimensionBreakdownItem[];
  className?: string;

  // Backward compatibility aliases
  breakdownItems?: DimensionBreakdownItem[];
  sessionBreakdown?: DimensionBreakdownItem[];
  aiInsight?: string;
}

export type ProgressSessionBreakdownProps = DimensionBreakdownProps;
