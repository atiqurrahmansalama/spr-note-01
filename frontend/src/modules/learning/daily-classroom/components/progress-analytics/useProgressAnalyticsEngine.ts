import { useMemo } from "react";
import { ReportItem } from "../../progress-management/progress-reports/types";
import {
  MetricType,
  ProgressTrendPoint,
  ProgressKPI,
  SessionBreakdownItem,
  ProgressAnalyticsEngineResult,
  TimeHorizon,
} from "./types";
import {
  getReportDate,
  getReportPages,
  getReportMistakes,
  getReportStucks,
  formatDayLabel,
  generateDatesBetween,
  extractReportDimensions,
  padSparkline,
  calculateDelta,
  generateProgressAiInsight,
} from "./utils/progressAnalyticsHelpers";

/**
 * Enterprise Canonical Hook for Calculating Daily Classroom Analytics
 * Decoupled helper utilities, zero code bloat, strictly derived from Single Source of Truth.
 */
export function useProgressAnalyticsEngine(
  reports: ReportItem[] = [],
  metric: MetricType = "combined",
  startDate?: string,
  endDate?: string,
  _legacyHorizon?: TimeHorizon
): ProgressAnalyticsEngineResult {
  return useMemo(() => {
    // 0. Filter reports by date range if explicitly requested
    const targetReports = startDate && endDate
      ? reports.filter((r) => {
          const d = getReportDate(r);
          return d && d >= startDate && d <= endDate;
        })
      : reports;

    // 1. Overall Aggregations
    const totalReports = targetReports.length;
    let totalPages = 0;
    let totalMistakes = 0;
    let totalStucks = 0;
    const studentSet = new Set<string>();
    const sessionMap = new Map<string, { totalReports: number; totalPages: number; totalErrors: number }>();
    const departmentSet = new Set<string>();
    const classSet = new Set<string>();
    const sectionSet = new Set<string>();
    const teacherSet = new Set<string>();

    targetReports.forEach((r) => {
      const p = getReportPages(r);
      const m = getReportMistakes(r);
      const s = getReportStucks(r);

      totalPages += p;
      totalMistakes += m;
      totalStucks += s;

      const dims = extractReportDimensions(r);
      if (dims.student) studentSet.add(dims.student);
      if (dims.department) departmentSet.add(dims.department);
      if (dims.className) classSet.add(dims.className);
      if (dims.section) sectionSet.add(dims.section);
      if (dims.teacher) teacherSet.add(dims.teacher);

      if (!sessionMap.has(dims.session)) {
        sessionMap.set(dims.session, { totalReports: 0, totalPages: 0, totalErrors: 0 });
      }
      const sessStat = sessionMap.get(dims.session)!;
      sessStat.totalReports += 1;
      sessStat.totalPages = Number((sessStat.totalPages + p).toFixed(1));
      sessStat.totalErrors += m + s;
    });

    totalPages = Number(totalPages.toFixed(1));
    const totalErrors = totalMistakes + totalStucks;
    const studentCount = studentSet.size;
    const averagePagesPerReport = totalReports > 0 ? Number((totalPages / totalReports).toFixed(1)) : 0;
    const accuracyRate = totalPages > 0
      ? Math.max(0, Math.min(100, Math.round(100 - (totalErrors / Math.max(1, totalPages)) * 6)))
      : totalReports > 0 ? 100 : 0;

    // 2. Timeline Aggregation
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
      departmentSet: Set<string>;
      classSet: Set<string>;
      sectionSet: Set<string>;
      teacherSet: Set<string>;
    }

    const createEmptyBucket = (d: string): BucketData => ({
      key: d,
      label: formatDayLabel(d),
      dateStr: d,
      totalPages: 0,
      totalReports: 0,
      totalMistakes: 0,
      totalStucks: 0,
      studentSet: new Set<string>(),
      sessionSet: new Set<string>(),
      departmentSet: new Set<string>(),
      classSet: new Set<string>(),
      sectionSet: new Set<string>(),
      teacherSet: new Set<string>(),
    });

    const bucketMap = new Map<string, BucketData>();

    // Determine the date sequence
    let dateSlots: string[] = [];
    if (startDate && endDate) {
      dateSlots = generateDatesBetween(startDate, endDate);
      dateSlots.forEach((d) => bucketMap.set(d, createEmptyBucket(d)));
    }

    targetReports.forEach((r) => {
      const dateStr = getReportDate(r);
      if (!dateStr) return;

      if (dateSlots.length > 0) {
        if (!bucketMap.has(dateStr)) return;
      } else if (!bucketMap.has(dateStr)) {
        bucketMap.set(dateStr, createEmptyBucket(dateStr));
      }

      const b = bucketMap.get(dateStr)!;
      const p = getReportPages(r);
      const m = getReportMistakes(r);
      const s = getReportStucks(r);

      b.totalPages = Number((b.totalPages + p).toFixed(1));
      b.totalReports += 1;
      b.totalMistakes += m;
      b.totalStucks += s;

      const dims = extractReportDimensions(r);
      if (dims.student) b.studentSet.add(dims.student);
      if (dims.session) b.sessionSet.add(dims.session);
      if (dims.department) b.departmentSet.add(dims.department);
      if (dims.className) b.classSet.add(dims.className);
      if (dims.section) b.sectionSet.add(dims.section);
      if (dims.teacher) b.teacherSet.add(dims.teacher);
    });

    // Fill intermediate days if range <= 31 days
    if (dateSlots.length === 0 && bucketMap.size > 1) {
      const allReportDates = Array.from(bucketMap.keys()).sort();
      const minD = allReportDates[0];
      const maxD = allReportDates[allReportDates.length - 1];
      const filledDates = generateDatesBetween(minD, maxD);
      if (filledDates.length > 0 && filledDates.length <= 31) {
        filledDates.forEach((d) => {
          if (!bucketMap.has(d)) {
            bucketMap.set(d, createEmptyBucket(d));
          }
        });
      }
    }

    // Sort buckets chronologically
    const sortedBuckets = Array.from(bucketMap.values()).sort((a, b) =>
      a.dateStr.localeCompare(b.dateStr)
    );

    // Build trend points with active values
    const trendPoints: ProgressTrendPoint[] = sortedBuckets.map((b) => {
      const bErrors = b.totalMistakes + b.totalStucks;
      const bAcc =
        b.totalPages > 0
          ? Math.max(0, Math.min(100, Math.round(100 - (bErrors / Math.max(1, b.totalPages)) * 6)))
          : 100;

      let activeValue = b.totalPages;
      if (metric === "mistakes") {
        activeValue = Math.max(b.totalMistakes, b.totalStucks);
      } else if (metric === "combined") {
        activeValue = Math.max(b.totalPages, b.totalMistakes, b.totalStucks);
      }

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
        studentNames: Array.from(b.studentSet),
        sessionNames: Array.from(b.sessionSet),
        departmentNames: Array.from(b.departmentSet),
        classNames: Array.from(b.classSet),
        sectionNames: Array.from(b.sectionSet),
        teacherNames: Array.from(b.teacherSet),
        activeValue,
      };
    });

    const activeDaysCount = trendPoints.filter((p) => p.totalPages > 0 || p.totalReports > 0).length || 1;
    const avgPagesPerDay = Number((totalPages / Math.max(1, activeDaysCount)).toFixed(1));
    const peakDayPages = Math.max(...trendPoints.map((p) => p.totalPages), 0);

    const maxMetricValue = Math.max(
      ...trendPoints.map((p) => {
        if (metric === "mistakes") return Math.max(p.totalMistakes, p.totalStucks);
        if (metric === "combined") return Math.max(p.totalPages, p.totalMistakes, p.totalStucks);
        return p.totalPages;
      }),
      1
    );

    // 3. Sparklines for KPIs
    const recentPoints = trendPoints.slice(-10);
    const sparklinePages = recentPoints.map((p) => p.totalPages);
    const sparklineMistakes = recentPoints.map((p) => p.totalMistakes);
    const sparklineStucks = recentPoints.map((p) => p.totalStucks);
    const sparklineStudents = recentPoints.map((p) => p.studentCount);

    const kpis: ProgressKPI[] = [
      {
        id: "total_pages",
        label: "Total Pages Covered",
        value: `${totalPages} Pages`,
        subValue: `Avg ${averagePagesPerReport}p per session · ${avgPagesPerDay}p daily`,
        sparkline: padSparkline(sparklinePages, totalPages),
        trend: calculateDelta(sparklinePages),
      },
      {
        id: "total_mistakes",
        label: "Mistakes (Errors)",
        value: totalMistakes,
        subValue: `Across ${totalReports} sessions`,
        sparkline: padSparkline(sparklineMistakes, totalMistakes),
        trend: calculateDelta(sparklineMistakes, true),
      },
      {
        id: "total_stucks",
        label: "Stucks (Hesitations)",
        value: totalStucks,
        subValue: `Total pauses noted`,
        sparkline: padSparkline(sparklineStucks, totalStucks),
        trend: calculateDelta(sparklineStucks, true),
      },
      {
        id: "active_students",
        label: "Students Recited",
        value: studentCount,
        subValue: `Covering ${trendPoints.length} day timeline`,
        sparkline: padSparkline(sparklineStudents, studentCount),
        trend: calculateDelta(sparklineStudents),
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

    // 5. Intelligent AI Summary Text
    const aiInsight = generateProgressAiInsight(
      totalReports,
      studentCount,
      totalPages,
      totalErrors,
      totalMistakes,
      totalStucks,
      sessionBreakdown[0]
    );

    return {
      totalReports,
      totalPages,
      totalMistakes,
      totalStucks,
      totalErrors,
      accuracyRate,
      studentCount,
      averagePagesPerReport,
      avgPagesPerDay,
      peakDayPages,
      kpis,
      trendPoints,
      sessionBreakdown,
      maxMetricValue,
      aiInsight,
      overallDepartments: Array.from(departmentSet),
      overallClasses: Array.from(classSet),
      overallSections: Array.from(sectionSet),
      overallTeachers: Array.from(teacherSet),
    };
  }, [reports, metric, startDate, endDate]);
}

export default useProgressAnalyticsEngine;
