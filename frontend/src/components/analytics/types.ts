/**
 * Enterprise Analytics Types & Contracts
 * High-reusability interfaces for analytical charts, time-series metrics, KPIs,
 * and dimensional breakdowns across any application domain.
 */

export type TimeHorizon = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

export type ChartViewMode = "bars" | "line";

export type MetricType = "combined" | "primary" | "secondary" | "pages" | "mistakes" | "reports" | "accuracy" | string;
export type ActiveMetricType = "combined" | "primary" | "secondary" | "pages" | "mistakes" | string;

/**
 * Enterprise Reusable Time-Series Trend Data Point
 * Universally models periodic data points across any domain (Learning, Attendance, HR, Finance, etc.)
 */
export interface TrendDataPoint {
  key: string;
  label: string;
  dateStr: string;

  // Universal metric values
  value?: number; // Primary metric value (e.g., volume, pages, attendance, amount, score)
  secondaryValue?: number; // Secondary metric value (e.g., mistakes, late arrivals, expense)
  tertiaryValue?: number; // Tertiary metric value (e.g., stucks, absences, discount)
  totalCount?: number; // Total count of records / transactions in this bucket
  activeValue?: number; // Currently highlighted or normalized active comparison value
  rate?: number; // Generic percentage or completion rate (0-100)

  // Generic grouping & entity dimensions
  entitiesCount?: number; // Count of entities active (e.g., students, staff, customers)
  entityNames?: string[]; // Names of active entities in this period
  groupNames?: string[]; // Names of active groups / sessions / classes in this period
  metadata?: Record<string, any>; // Arbitrary extensible metadata for domain-specific enrichment

  // Backward-compatibility aliases for recitation & progress reports
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
 * High-value Key Performance Indicator definition
 */
export interface AnalyticsKPI {
  id: string;
  label: string;
  value: string | number;
  subValue?: string;
  sparkline?: number[];
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export type ProgressKPI = AnalyticsKPI;

/**
 * Generic Dimension Breakdown Item (e.g., by session, department, category)
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
  metadata?: Record<string, any>;
}

export type SessionBreakdownItem = DimensionBreakdownItem;
export type SessionSlice = DimensionBreakdownItem;

/**
 * Reusable Trend Chart Component Props
 */
export interface TrendChartProps {
  trendPoints: TrendDataPoint[];
  title?: string;
  subtitle?: string;
  primaryMetricLabel?: string;
  secondaryMetricLabel?: string;
  tertiaryMetricLabel?: string;
  activeMetric?: MetricType;
  onMetricChange?: (metric: MetricType) => void;
  maxMetricValue?: number;
  viewMode?: ChartViewMode;
  onViewModeChange?: (mode: ChartViewMode) => void;
  timeHorizon?: TimeHorizon;
  onHorizonChange?: (horizon: TimeHorizon) => void;
  className?: string;

  // Domain-specific aliases for backward compatibility with progress reports
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

export interface DimensionBreakdownProps {
  breakdownItems?: DimensionBreakdownItem[];
  sessionBreakdown?: DimensionBreakdownItem[];
  aiInsight?: string;
  className?: string;
}

export type ProgressSessionBreakdownProps = DimensionBreakdownProps;
