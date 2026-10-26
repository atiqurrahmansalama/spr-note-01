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

const parseISODateParts = (str: string): { year: number; month: number; day: number } | null => {
  const parts = str.split("-");
  if (parts.length === 3) {
    const year = Number(parts[0]);
    const month = Number(parts[1]) - 1;
    const day = Number(parts[2]);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return { year, month, day };
    }
  }
  return null;
};

const generateDatesBetween = (startStr: string, endStr: string): string[] => {
  const dates: string[] = [];
  const sParts = parseISODateParts(startStr);
  const eParts = parseISODateParts(endStr);
  if (!sParts || !eParts) return [];

  const s = new Date(sParts.year, sParts.month, sParts.day);
  const e = new Date(eParts.year, eParts.month, eParts.day);
  if (s > e) return [];

  const diffDays = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays > 90) return [];

  const cur = new Date(s);
  while (cur <= e) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, "0");
    const d = String(cur.getDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
};

export function useProgressAnalyticsEngine(
  reports: ReportItem[] = [],
  metric: MetricType = "combined",
  startDate?: string,
  endDate?: string,
  _legacyHorizon?: TimeHorizon
): ProgressAnalyticsEngineResult {
  return useMemo(() => {
    // 1. Overall Aggregations
    const totalReports = reports.length;
    let totalPages = 0;
    let totalMistakes = 0;
    let totalStucks = 0;
    const studentSet = new Set<string>();
    const sessionMap = new Map<string, { totalReports: number; totalPages: number; totalErrors: number }>();
    const departmentSet = new Set<string>();
    const classSet = new Set<string>();
    const sectionSet = new Set<string>();
    const teacherSet = new Set<string>();

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
      sessStat.totalPages = Number((sessStat.totalPages + p).toFixed(1));
      sessStat.totalErrors += m + s;

      // Extract metadata dimensions
      const dept =
        r.department_name ||
        r.departmentName ||
        r.department_code ||
        r.departmentCode ||
        r.deptCode ||
        r.student_details?.department_name ||
        r.student_details?.department?.name ||
        r.student_details?.department ||
        r.department;
      if (dept && typeof dept === "string" && dept.trim()) {
        departmentSet.add(dept.trim());
      }

      const cls =
        r.class_name ||
        r.className ||
        r.academic_class_name ||
        r.student_details?.class_name ||
        r.student_details?.class?.name ||
        r.student_group ||
        r.academic_class;
      if (cls && typeof cls === "string" && cls.trim()) {
        classSet.add(cls.trim());
      }

      const sec =
        r.section_name ||
        r.sectionName ||
        r.student_section_name ||
        r.student_details?.section_name ||
        r.student_details?.section?.name ||
        r.section;
      if (sec && typeof sec === "string" && sec.trim()) {
        sectionSet.add(sec.trim());
      }

      const tch =
        r.teacher_name ||
        r.teacherName ||
        (typeof r.teacher === "object"
          ? r.teacher?.name || r.teacher?.name_en
          : typeof r.teacher === "string" && isNaN(Number(r.teacher))
          ? r.teacher
          : "");
      if (tch && typeof tch === "string" && tch.trim()) {
        teacherSet.add(tch.trim());
      }
    });

    totalPages = Number(totalPages.toFixed(1));
    const totalErrors = totalMistakes + totalStucks;
    const studentCount = studentSet.size;
    const averagePagesPerReport = totalReports > 0 ? Number((totalPages / totalReports).toFixed(1)) : 0;
    const accuracyRate = totalPages > 0
      ? Math.max(0, Math.min(100, Math.round(100 - (totalErrors / Math.max(1, totalPages)) * 6)))
      : totalReports > 0 ? 100 : 0;

    // 2. Timeline Aggregation (Driven strictly by the Date Picker / active dates)
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
    }

    // Pre-populate date slots if generated
    if (dateSlots.length > 0) {
      dateSlots.forEach((d) => {
        bucketMap.set(d, createEmptyBucket(d));
      });
    }

    // Ingest reports into buckets
    reports.forEach((r) => {
      const dateStr = getReportDate(r);
      if (!dateStr) return;

      if (!bucketMap.has(dateStr)) {
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

      const sid =
        r.student_name ||
        (r as any).studentName ||
        (r as any).student?.name ||
        (r as any).student?.full_name ||
        r.studentId ||
        r.student_id;
      if (sid) b.studentSet.add(String(sid));

      const sName = r.session_name || r.session || (r as any).sessionName;
      if (sName) b.sessionSet.add(String(sName));

      const dept =
        r.department_name ||
        r.departmentName ||
        r.department_code ||
        r.departmentCode ||
        r.deptCode ||
        r.student_details?.department_name ||
        r.student_details?.department?.name ||
        r.student_details?.department ||
        r.department;
      if (dept && typeof dept === "string" && dept.trim()) {
        b.departmentSet.add(dept.trim());
      }

      const cls =
        r.class_name ||
        r.className ||
        r.academic_class_name ||
        r.student_details?.class_name ||
        r.student_details?.class?.name ||
        r.student_group ||
        r.academic_class;
      if (cls && typeof cls === "string" && cls.trim()) {
        b.classSet.add(cls.trim());
      }

      const sec =
        r.section_name ||
        r.sectionName ||
        r.student_section_name ||
        r.student_details?.section_name ||
        r.student_details?.section?.name ||
        r.section;
      if (sec && typeof sec === "string" && sec.trim()) {
        b.sectionSet.add(sec.trim());
      }

      const tch =
        r.teacher_name ||
        r.teacherName ||
        (typeof r.teacher === "object"
          ? r.teacher?.name || r.teacher?.name_en
          : typeof r.teacher === "string" && isNaN(Number(r.teacher))
          ? r.teacher
          : "");
      if (tch && typeof tch === "string" && tch.trim()) {
        b.teacherSet.add(tch.trim());
      }
    });

    // If dateSlots was not pre-populated but reports have multiple dates spanning <= 31 days, fill intermediate days
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

    // Build trend points with dynamic active value
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
        if (metric === "mistakes") {
          return Math.max(p.totalMistakes, p.totalStucks);
        }
        if (metric === "combined") {
          return Math.max(p.totalPages, p.totalMistakes, p.totalStucks);
        }
        return p.totalPages;
      }),
      1
    );

    // 3. Sparklines for KPIs (Extracted from the last 7 to 10 points)
    const recentPoints = trendPoints.slice(-10);
    const sparklinePages = recentPoints.map((p) => p.totalPages);
    const sparklineMistakes = recentPoints.map((p) => p.totalMistakes);
    const sparklineStucks = recentPoints.map((p) => p.totalStucks);
    const sparklineStudents = recentPoints.map((p) => p.studentCount);

    const padSparkline = (arr: number[], defVal: number) => {
      if (arr.length === 0) return [defVal, defVal];
      if (arr.length === 1) return [arr[0], arr[0]];
      return arr;
    };

    const getDelta = (arr: number[], inverse = false) => {
      if (arr.length < 2) return undefined;
      const last = arr[arr.length - 1];
      const prev = arr[arr.length - 2];
      if (prev === 0) {
        return {
          value: `${last > 0 ? "+" : ""}${last}`,
          isPositive: inverse ? last <= 0 : last >= 0,
        };
      }
      const pct = Math.round(((last - prev) / prev) * 100);
      return {
        value: `${pct >= 0 ? "+" : ""}${pct}% vs prior`,
        isPositive: inverse ? pct <= 0 : pct >= 0,
      };
    };

    // 4 High-Value KPI Cards (Zero hardcoded evaluations or quality rate)
    const kpis: ProgressKPI[] = [
      {
        id: "total_pages",
        label: "Total Pages Covered",
        value: `${totalPages} Pages`,
        subValue: `Avg ${averagePagesPerReport}p per session · ${avgPagesPerDay}p daily`,
        sparkline: padSparkline(sparklinePages, totalPages),
        trend: getDelta(sparklinePages),
      },
      {
        id: "total_mistakes",
        label: "Mistakes (Errors)",
        value: totalMistakes,
        subValue: `Across ${totalReports} sessions`,
        sparkline: padSparkline(sparklineMistakes, totalMistakes),
        trend: getDelta(sparklineMistakes, true),
      },
      {
        id: "total_stucks",
        label: "Stucks (Hesitations)",
        value: totalStucks,
        subValue: `Total pauses noted`,
        sparkline: padSparkline(sparklineStucks, totalStucks),
        trend: getDelta(sparklineStucks, true),
      },
      {
        id: "active_students",
        label: "Students Recited",
        value: studentCount,
        subValue: `Covering ${trendPoints.length} day timeline`,
        sparkline: padSparkline(sparklineStudents, studentCount),
        trend: getDelta(sparklineStudents),
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

    // 5. Intelligent Summary Text
    let aiInsight = "No progress records found matching the active date criteria.";
    if (totalReports > 0) {
      const topSession = sessionBreakdown[0];
      const errorRateText =
        totalErrors === 0
          ? "with flawless zero recorded errors"
          : `with ${totalMistakes} mistakes and ${totalStucks} stucks across ${totalPages} pages`;

      aiInsight = `${studentCount} student${studentCount === 1 ? "" : "s"} recited across ${totalReports} session${
        totalReports === 1 ? "" : "s"
      }, covering ${totalPages} pages (${errorRateText}). ${
        topSession
          ? `${topSession.sessionName} registered the highest recitation volume (${topSession.totalPages} pages, ${topSession.totalErrors} errors).`
          : ""
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
