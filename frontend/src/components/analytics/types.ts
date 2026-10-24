export type MetricType = "combined" | "pages" | "mistakes" | "reports" | "accuracy";
export type ActiveMetricType = "combined" | "pages" | "mistakes";
export type ChartViewMode = "bars" | "line";
export type TimeHorizon = "daily" | "weekly" | "monthly";

export interface ProgressTrendPoint {
  key: string;
  label: string;
  dateStr: string;
  totalPages: number;
  totalReports: number;
  totalMistakes: number;
  totalStucks: number;
  totalErrors: number;
  accuracyRate?: number;
  studentCount: number;
  sessionNames: string[];
  activeValue: number;
}

export type RecitationTrendPoint = ProgressTrendPoint;

export interface ProgressKPI {
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

export interface SessionBreakdownItem {
  sessionKey: string;
  sessionName: string;
  totalReports: number;
  totalPages: number;
  totalErrors: number;
  cleanRate: number;
  percentOfTotal: number;
}

export type SessionSlice = SessionBreakdownItem;

export interface ProgressTrendsChartProps {
  trendPoints: ProgressTrendPoint[];
  activeMetric?: MetricType;
  onMetricChange?: (metric: MetricType) => void;
  maxMetricValue?: number;
  totalPages?: number;
  totalMistakes?: number;
  totalStucks?: number;
  totalErrors?: number;
  avgPagesPerDay?: number;
  peakDayPages?: number;
  studentCount?: number;
  totalReports?: number;
  timeHorizon?: TimeHorizon;
  onHorizonChange?: (horizon: TimeHorizon) => void;
  accuracyRate?: number;
  className?: string;
}

export interface ProgressSessionBreakdownProps {
  sessionBreakdown: SessionBreakdownItem[];
  aiInsight: string;
  className?: string;
}
