import { useMemo } from "react";
import { ReportItem } from "../../progress-management/progress-reports/types";
import {
  MetricType,
  TimeHorizon,
  ProgressTrendPoint,
  ProgressKPI,
  SessionBreakdownItem,
  ProgressAnalyticsEngineResult,
} from "./types";

const getReportDate = (r: ReportItem): string => {
  if (r.isoDateOnly) return r.isoDateOnly;
  const raw = r.report_date || r.date || r.selectedDate || r.generate_date || r.created_at || "";
  if (!raw) return "";
  return String(raw).substring(0, 10);
};

const getReportPages = (r: ReportItem): number => {
  return Number(r.total_page ?? r.total_pages ?? r.pages ?? r.totalPages ?? 0) || 0;
};

const getReportMistakes = (r: ReportItem): number => {
  if (r.total_mistake !== undefined && r.total_mistake !== null) {
    return Number(r.total_mistake) || 0;
  }
  if (r.mistakesCount !== undefined && r.mistakesCount !== null) {
    return Number(r.mistakesCount) || 0;
  }
  if (Array.isArray(r.mistake_details)) {
    return r.mistake_details.length;
  }
  if (Array.isArray(r.mistakes)) {
    return r.mistakes.length;
  }
  return 0;
};

const getReportStucks = (r: ReportItem): number => {
  if (r.total_stuck !== undefined && r.total_stuck !== null) {
    return Number(r.total_stuck) || 0;
  }
  if (r.stucksCount !== undefined && r.stucksCount !== null) {
    return Number(r.stucksCount) || 0;
  }
  if (Array.isArray(r.stuck_details)) {
    return r.stuck_details.length;
  }
  if (Array.isArray(r.stucks)) {
    return r.stucks.length;
  }
  return 0;
};

const formatDayLabel = (dateStr: string): string => {
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
  } catch {}
  return dateStr;
};

const formatMonthLabel = (monthStr: string): string => {
  try {
    const parts = monthStr.split("-");
    if (parts.length === 2) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
      return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    }
  } catch {}
  return monthStr;
};

const getWeekKey = (dateStr: string): { key: string; label: string } => {
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      const startOfWeek = new Date(date);
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      const key = `${startOfWeek.getFullYear()}-W${Math.ceil(diff / 7)}`;
      const label = `${startOfWeek.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${endOfWeek.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
      return { key, label };
    }
  } catch {}
  return { key: dateStr, label: dateStr };
};

export function useProgressAnalyticsEngine(
  reports: ReportItem[] = [],
  metric: MetricType = "pages",
  horizon: TimeHorizon = "daily"
): ProgressAnalyticsEngineResult {
  return useMemo(() => {
    // 1. Overall Aggregations
    const totalReports = reports.length;
    let totalPages = 0;
    let totalMistakes = 0;
    let totalStucks = 0;
    const studentSet = new Set<string>();
    const sessionMap = new Map<string, { totalReports: number; totalPages: number; totalErrors: number }>();

    reports.forEach((r) => {
      const p = getReportPages(r);
      const m = getReportMistakes(r);
      const s = getReportStucks(r);

      totalPages += p;
      totalMistakes += m;
      totalStucks += s;

      const studentIdentifier = r.student_name || r.studentId || r.student_id;
      if (studentIdentifier) {
        studentSet.add(String(studentIdentifier));
      }

      const sess = r.session_name || r.session || "Regular Session";
      if (!sessionMap.has(sess)) {
        sessionMap.set(sess, { totalReports: 0, totalPages: 0, totalErrors: 0 });
      }
      const sessStat = sessionMap.get(sess)!;
      sessStat.totalReports += 1;
      sessStat.totalPages += p;
      sessStat.totalErrors += m + s;
    });

    const totalErrors = totalMistakes + totalStucks;
    const studentCount = studentSet.size;
    const averagePagesPerReport = totalReports > 0 ? Number((totalPages / totalReports).toFixed(1)) : 0;

    // Quality/Clean Rate: Calculated realistically based on error frequency per page
    const accuracyRate =
      totalPages > 0
        ? Math.max(0, Math.min(100, Math.round(100 - (totalErrors / Math.max(1, totalPages)) * 6)))
        : totalReports > 0
        ? 100
        : 0;

    // 2. Timeline Aggregation (Group by Daily, Weekly, or Monthly)
    interface BucketData {
      key: string;
      label: string;
      dateStr: string;
      totalPages: number;
      totalReports: number;
      totalMistakes: number;
      totalStucks: number;
      studentSet: Set<string>;
      sessionSet: Set<string>;
    }

    const bucketMap = new Map<string, BucketData>();

    reports.forEach((r) => {
      const dateStr = getReportDate(r);
      if (!dateStr) return;

      let bKey = dateStr;
      let bLabel = formatDayLabel(dateStr);

      if (horizon === "weekly") {
        const weekInfo = getWeekKey(dateStr);
        bKey = weekInfo.key;
        bLabel = weekInfo.label;
      } else if (horizon === "monthly") {
        bKey = dateStr.substring(0, 7);
        bLabel = formatMonthLabel(bKey);
      }

      if (!bucketMap.has(bKey)) {
        bucketMap.set(bKey, {
          key: bKey,
          label: bLabel,
          dateStr,
          totalPages: 0,
          totalReports: 0,
          totalMistakes: 0,
          totalStucks: 0,
          studentSet: new Set<string>(),
          sessionSet: new Set<string>(),
        });
      }

      const b = bucketMap.get(bKey)!;
      const p = getReportPages(r);
      const m = getReportMistakes(r);
      const s = getReportStucks(r);

      b.totalPages += p;
      b.totalReports += 1;
      b.totalMistakes += m;
      b.totalStucks += s;

      const sid = r.student_name || r.studentId || r.student_id;
      if (sid) b.studentSet.add(String(sid));

      const sName = r.session_name || r.session;
      if (sName) b.sessionSet.add(sName);
    });

    // Sort buckets chronologically
    const sortedBuckets = Array.from(bucketMap.values()).sort((a, b) =>
      a.dateStr.localeCompare(b.dateStr)
    );

    // Build trend points with dynamic active value
    const trendPoints: ProgressTrendPoint[] = sortedBuckets.map((b) => {
      const bErrors = b.totalMistakes + b.totalStucks;
      const bAcc =
        b.totalPages > 0
          ? Math.max(0, Math.min(100, Math.round(100 - (bErrors / Math.max(1, b.totalPages)) * 6)))
          : 100;

      let activeValue = b.totalPages;
      if (metric === "reports") activeValue = b.totalReports;
      else if (metric === "mistakes") activeValue = bErrors;
      else if (metric === "accuracy") activeValue = bAcc;

      return {
        key: b.key,
        label: b.label,
        dateStr: b.dateStr,
        totalPages: b.totalPages,
        totalReports: b.totalReports,
        totalMistakes: b.totalMistakes,
        totalStucks: b.totalStucks,
        totalErrors: bErrors,
        accuracyRate: bAcc,
        studentCount: b.studentSet.size,
        sessionNames: Array.from(b.sessionSet),
        activeValue,
      };
    });

    const maxMetricValue = Math.max(...trendPoints.map((p) => p.activeValue), 1);

    // 3. Sparklines for KPIs (Extracted from the last 7 to 10 points)
    const recentPoints = trendPoints.slice(-10);
    const sparklinePages = recentPoints.map((p) => p.totalPages);
    const sparklineReports = recentPoints.map((p) => p.totalReports);
    const sparklineErrors = recentPoints.map((p) => p.totalErrors);
    const sparklineAccuracy = recentPoints.map((p) => p.accuracyRate);

    // Ensure fallback sparkline array if points are sparse
    const padSparkline = (arr: number[], defVal: number) => {
      if (arr.length === 0) return [defVal, defVal];
      if (arr.length === 1) return [arr[0], arr[0]];
      return arr;
    };

    // Calculate Trend Deltas (Comparing last point to previous)
    const getDelta = (arr: number[]) => {
      if (arr.length < 2) return undefined;
      const last = arr[arr.length - 1];
      const prev = arr[arr.length - 2];
      if (prev === 0) return { value: `${last > 0 ? "+" : ""}${last}`, isPositive: last >= 0 };
      const pct = Math.round(((last - prev) / prev) * 100);
      return { value: `${pct >= 0 ? "+" : ""}${pct}% vs prior`, isPositive: pct >= 0 };
    };

    const kpis: ProgressKPI[] = [
      {
        id: "total_pages",
        label: "Total Pages Covered",
        value: `${totalPages} Pages`,
        subValue: `Avg ${averagePagesPerReport}p per session`,
        sparkline: padSparkline(sparklinePages, totalPages),
        trend: getDelta(sparklinePages),
      },
      {
        id: "total_evaluations",
        label: "Evaluations Completed",
        value: totalReports,
        subValue: `Across ${studentCount} students`,
        sparkline: padSparkline(sparklineReports, totalReports),
        trend: getDelta(sparklineReports),
      },
      {
        id: "total_errors",
        label: "Mistakes & Stucks",
        value: totalErrors,
        subValue: `${totalMistakes} Mistakes · ${totalStucks} Stucks`,
        sparkline: padSparkline(sparklineErrors, totalErrors),
        trend: getDelta(sparklineErrors)
          ? {
              value: getDelta(sparklineErrors)!.value,
              isPositive: !getDelta(sparklineErrors)!.isPositive, // For errors, less is positive
            }
          : undefined,
      },
      {
        id: "accuracy_rate",
        label: "Average Quality Rate",
        value: `${accuracyRate}%`,
        subValue: accuracyRate >= 90 ? "Excellent retention" : "Moderate revisions needed",
        sparkline: padSparkline(sparklineAccuracy, accuracyRate),
        trend: getDelta(sparklineAccuracy),
      },
    ];

    // 4. Session Breakdown List
    const sessionBreakdown: SessionBreakdownItem[] = Array.from(sessionMap.entries())
      .map(([name, s]) => {
        const cleanRate =
          s.totalPages > 0
            ? Math.max(0, Math.min(100, Math.round(100 - (s.totalErrors / Math.max(1, s.totalPages)) * 6)))
            : 100;
        const percentOfTotal = totalPages > 0 ? Math.round((s.totalPages / totalPages) * 100) : 0;

        return {
          sessionKey: name,
          sessionName: name,
          totalReports: s.totalReports,
          totalPages: s.totalPages,
          totalErrors: s.totalErrors,
          cleanRate,
          percentOfTotal,
        };
      })
      .sort((a, b) => b.totalPages - a.totalPages);

    // 5. Intelligent Data-Driven Summary Text
    let aiInsight = "No progress records found matching the active filter criteria.";
    if (totalReports > 0) {
      const topSession = sessionBreakdown[0];
      const errorRateText =
        totalErrors === 0
          ? "with zero recorded mistakes"
          : `with an average of ${(totalErrors / Math.max(1, totalPages)).toFixed(1)} mistakes per page`;

      aiInsight = `${studentCount} student${studentCount === 1 ? "" : "s"} evaluated across ${totalReports} session${totalReports === 1 ? "" : "s"}, covering ${totalPages} pages ${errorRateText}. ${
        topSession ? `${topSession.sessionName} conducted the highest recitation volume (${topSession.totalPages} pages, ${topSession.cleanRate}% clean rate).` : ""
      }`;
    }

    return {
      totalReports,
      totalPages,
      totalMistakes,
      totalStucks,
      totalErrors,
      accuracyRate,
      studentCount,
      averagePagesPerReport,
      kpis,
      trendPoints,
      sessionBreakdown,
      maxMetricValue,
      aiInsight,
    };
  }, [reports, metric, horizon]);
}
