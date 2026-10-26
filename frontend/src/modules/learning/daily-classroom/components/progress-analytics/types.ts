export * from "@/components/analytics/types";
import { ReportItem } from "../../progress-management/progress-reports/types";
import {
  MetricType,
  TimeHorizon,
  ProgressTrendPoint,
  ProgressKPI,
  SessionBreakdownItem,
} from "@/components/analytics/types";

export interface ProgressAnalyticsEngineResult {
  totalReports: number;
  totalPages: number;
  totalMistakes: number;
  totalStucks: number;
  totalErrors: number;
  accuracyRate: number;
  studentCount: number;
  averagePagesPerReport: number;
  avgPagesPerDay: number;
  peakDayPages: number;
  kpis: ProgressKPI[];
  trendPoints: ProgressTrendPoint[];
  sessionBreakdown: SessionBreakdownItem[];
  maxMetricValue: number;
  aiInsight: string;
  overallDepartments?: string[];
  overallClasses?: string[];
  overallSections?: string[];
  overallTeachers?: string[];
}

export interface ProgressAnalyticsDashboardProps {
  reports: ReportItem[];
  startDate?: string;
  endDate?: string;
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
