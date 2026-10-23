import { ReportItem } from "../../progress-management/progress-reports/types";

export type MetricType = "pages" | "reports" | "mistakes" | "accuracy";
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
  accuracyRate: number;
  studentCount: number;
  sessionNames: string[];
  activeValue: number;
}

export interface ProgressKPI {
  id: string;
  label: string;
  value: string | number;
  subValue?: string;
  sparkline: number[];
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

export interface ProgressAnalyticsEngineResult {
  totalReports: number;
  totalPages: number;
  totalMistakes: number;
  totalStucks: number;
  totalErrors: number;
  accuracyRate: number;
  studentCount: number;
  averagePagesPerReport: number;
  kpis: ProgressKPI[];
  trendPoints: ProgressTrendPoint[];
  sessionBreakdown: SessionBreakdownItem[];
  maxMetricValue: number;
  aiInsight: string;
}

export interface ProgressAnalyticsDashboardProps {
  reports: ReportItem[];
  variant?: "full" | "compact" | "chart-only" | "kpi-only";
  title?: string;
  subtitle?: string;
  collapsible?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: (expanded: boolean) => void;
  defaultMetric?: MetricType;
  allowedMetrics?: MetricType[];
  defaultTimeHorizon?: TimeHorizon;
  showKpis?: boolean;
  showTrendsChart?: boolean;
  showBreakdown?: boolean;
  className?: string;
}
