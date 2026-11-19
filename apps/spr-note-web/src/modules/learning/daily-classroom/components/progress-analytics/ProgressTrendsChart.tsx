import React, { useMemo, useState } from "react";
import {
  TrendChart,
  type TrendDataPoint,
  type ChartSeriesConfig,
  type MetricType,
  type ChartViewMode,
} from "@/components/analytics";
import { SegmentedSwitchOption } from "@/components/ui/SegmentedSwitch";
import {
  TrendingUpIcon,
  BookOpenIcon,
  InfoIcon,
  StudentIcon,
  SessionsIcon,
  BuildingOfficeIcon,
  AcademicCapIcon,
  SectionIcon,
  TeacherIcon,
} from "@/components/ui/Icons";
import type { TrendKpiItem, FooterFieldItemConfig } from "@/components/analytics/trends";

export interface ProgressTrendsChartProps {
  trendPoints: TrendDataPoint[];
  activeMetric: MetricType;
  onMetricChange: (metric: MetricType) => void;
  totalPages: number;
  totalMistakes?: number;
  totalStucks?: number;
  totalErrors: number;
  avgPagesPerDay?: number;
  peakDayPages?: number;
  studentCount?: number;
  totalReports?: number;
  departmentNames?: string[];
  classNames?: string[];
  sectionNames?: string[];
  teacherNames?: string[];
  viewMode?: ChartViewMode;
  onViewModeChange?: (mode: ChartViewMode) => void;
  className?: string;
  maxMetricValue?: number;
  timeHorizon?: any;
  onHorizonChange?: (horizon: any) => void;
  accuracyRate?: number;
  extraMenuItems?: any[];
}

/**
 * Domain-Specific Recitation Progress Trends Chart
 * Located in Learning / Daily Classroom module.
 * Bridges daily recitation report domain metrics (pages, mistakes, stucks, student metadata)
 * by directly reusing the universal TrendChart engine.
 */
export const ProgressTrendsChart: React.FC<ProgressTrendsChartProps> = ({
  trendPoints = [],
  activeMetric = "combined",
  onMetricChange,
  totalPages = 0,
  totalMistakes: propMistakes,
  totalStucks: propStucks,
  totalErrors = 0,
  avgPagesPerDay: propAvgPages,
  peakDayPages: propPeakPages,
  studentCount: propStudentCount,
  departmentNames: propDepartmentNames,
  classNames: propClassNames,
  sectionNames: propSectionNames,
  teacherNames: propTeacherNames,
  viewMode,
  onViewModeChange,
  className = "",
  extraMenuItems = [],
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const currentMetric: "combined" | "pages" | "mistakes" =
    activeMetric === "mistakes"
      ? "mistakes"
      : activeMetric === "pages"
      ? "pages"
      : "combined";

  const formattedTotalPages = Number(Number(totalPages || 0).toFixed(1));
  const avgPagesVal = Number(
    (
      propAvgPages ??
      (trendPoints.length > 0
        ? Number((totalPages / Math.max(1, trendPoints.filter((p) => (p.totalPages || 0) > 0).length || 1)).toFixed(1))
        : 0)
    ).toFixed(1)
  );
  const peakPagesVal = Number(
    (propPeakPages ?? Math.max(...trendPoints.map((p) => p.totalPages || 0), 0)).toFixed(1)
  );

  const totalMistakesVal =
    propMistakes ?? trendPoints.reduce((acc, p) => acc + (p.totalMistakes || 0), 0);
  const totalStucksVal =
    propStucks ?? trendPoints.reduce((acc, p) => acc + (p.totalStucks || 0), 0);

  // 1. Metric switch options (both value and id supported)
  const metricOptions: SegmentedSwitchOption[] = useMemo(
    () => [
      { value: "combined", id: "combined", label: "All", icon: TrendingUpIcon },
      { value: "pages", id: "pages", label: "Pages", icon: BookOpenIcon },
      { value: "mistakes", id: "mistakes", label: "Errors", icon: InfoIcon },
    ],
    []
  );

  // 2. Series definitions based on active metric
  const series: ChartSeriesConfig[] = useMemo(() => {
    const list: ChartSeriesConfig[] = [];
    if (currentMetric === "combined" || currentMetric === "pages") {
      list.push({
        key: "totalPages",
        label: "Pages Recited",
        color: "theme-bg-accent",
        strokeColor: "var(--accent-main)",
        fillColor: "var(--accent-main)",
        indicatorClass: "theme-bg-accent",
        ringClass: "ring-[var(--accent-main)]",
        circleBorderClass: "border-[var(--accent-main)]",
        unit: "p",
      });
    }
    if (currentMetric === "combined" || currentMetric === "mistakes") {
      list.push({
        key: "totalMistakes",
        label: "Mistakes",
        color: "bg-[var(--color-danger)]",
        strokeColor: "var(--color-danger)",
        fillColor: "var(--color-danger)",
        indicatorClass: "bg-rose-500",
        ringClass: "ring-[var(--color-danger)]",
        circleBorderClass: "border-[var(--color-danger)]",
      });
      list.push({
        key: "totalStucks",
        label: "Stucks",
        color: "bg-amber-500",
        strokeColor: "#f59e0b",
        fillColor: "#f59e0b",
        indicatorClass: "bg-amber-500",
        ringClass: "ring-amber-500",
        circleBorderClass: "border-amber-500",
      });
    }
    return list;
  }, [currentMetric]);

  // 3. Exact Top KPI Cards
  const kpiItems: TrendKpiItem[] = useMemo(() => {
    if (currentMetric === "combined") {
      return [
        { label: "Total Recited", value: `${formattedTotalPages}p`, borderVar: "var(--accent-main)" },
        { label: "Daily Average", value: `${avgPagesVal}p`, borderVar: "var(--accent-main)" },
        { label: "Total Mistakes", value: totalMistakesVal, borderVar: "var(--color-danger)" },
        { label: "Total Stucks", value: totalStucksVal, borderVar: "var(--color-warning, #f59e0b)" },
      ];
    }
    if (currentMetric === "mistakes") {
      return [
        { label: "Total Mistakes", value: totalMistakesVal, borderVar: "var(--color-danger)" },
        { label: "Total Stucks", value: totalStucksVal, borderVar: "var(--color-warning, #f59e0b)" },
        {
          label: "Combined Errors",
          value: totalErrors,
          borderVar: "var(--border-strong)",
          colSpanClass: "col-span-2 sm:col-span-1",
        },
      ];
    }
    return [
      { label: "Total Recited", value: `${formattedTotalPages}p`, borderVar: "var(--accent-main)" },
      { label: "Daily Average", value: `${avgPagesVal}p`, borderVar: "var(--accent-main)" },
      {
        label: "Peak Day Volume",
        value: `${peakPagesVal}p`,
        borderVar: "var(--border-strong)",
        colSpanClass: "col-span-2 sm:col-span-1",
      },
    ];
  }, [currentMetric, formattedTotalPages, avgPagesVal, totalMistakesVal, totalStucksVal, totalErrors, peakPagesVal]);

  // 4. Overall and Context-Aware Footer Metadata
  const overallDepartments = useMemo(() => {
    if (propDepartmentNames && propDepartmentNames.length > 0) return propDepartmentNames;
    const set = new Set<string>();
    trendPoints.forEach((p) => (p.departmentNames || []).forEach((d) => d && set.add(d)));
    return Array.from(set);
  }, [propDepartmentNames, trendPoints]);

  const overallClasses = useMemo(() => {
    if (propClassNames && propClassNames.length > 0) return propClassNames;
    const set = new Set<string>();
    trendPoints.forEach((p) => (p.classNames || []).forEach((c) => c && set.add(c)));
    return Array.from(set);
  }, [propClassNames, trendPoints]);

  const overallSections = useMemo(() => {
    if (propSectionNames && propSectionNames.length > 0) return propSectionNames;
    const set = new Set<string>();
    trendPoints.forEach((p) => (p.sectionNames || []).forEach((s) => s && set.add(s)));
    return Array.from(set);
  }, [propSectionNames, trendPoints]);

  const overallTeachers = useMemo(() => {
    if (propTeacherNames && propTeacherNames.length > 0) return propTeacherNames;
    const set = new Set<string>();
    trendPoints.forEach((p) => (p.teacherNames || []).forEach((t) => t && set.add(t)));
    return Array.from(set);
  }, [propTeacherNames, trendPoints]);

  const overallSessions = useMemo(() => {
    const set = new Set<string>();
    trendPoints.forEach((p) => (p.sessionNames || []).forEach((s) => s && set.add(s)));
    return Array.from(set);
  }, [trendPoints]);

  const overallStudents = useMemo(() => {
    const set = new Set<string>();
    trendPoints.forEach((p) => (p.studentNames || []).forEach((s) => s && set.add(s)));
    return Array.from(set);
  }, [trendPoints]);

  const isPointHovered = hoveredIndex !== null && trendPoints[hoveredIndex] !== undefined;
  const activeHoverPoint = isPointHovered ? trendPoints[hoveredIndex] : null;

  const footerFields: FooterFieldItemConfig[] = useMemo(
    () => [
      {
        id: "students",
        icon: StudentIcon,
        label: "Students",
        items:
          activeHoverPoint?.studentNames && activeHoverPoint.studentNames.length > 0
            ? activeHoverPoint.studentNames
            : overallStudents,
        emptyText: propStudentCount ? `${propStudentCount} Students` : "No student details",
        totalSuffix: "Total Students",
      },
      {
        id: "sessions",
        icon: SessionsIcon,
        label: "Sessions",
        items:
          activeHoverPoint?.sessionNames && activeHoverPoint.sessionNames.length > 0
            ? activeHoverPoint.sessionNames
            : overallSessions,
        emptyText: "No session details",
        totalSuffix: "Total Sessions",
      },
      {
        id: "departments",
        icon: BuildingOfficeIcon,
        label: "Department",
        items:
          activeHoverPoint?.departmentNames && activeHoverPoint.departmentNames.length > 0
            ? activeHoverPoint.departmentNames
            : overallDepartments,
        emptyText: "General",
      },
      {
        id: "classes",
        icon: AcademicCapIcon,
        label: "Class",
        items:
          activeHoverPoint?.classNames && activeHoverPoint.classNames.length > 0
            ? activeHoverPoint.classNames
            : overallClasses,
        emptyText: "All Classes",
      },
      {
        id: "sections",
        icon: SectionIcon,
        label: "Section",
        items:
          activeHoverPoint?.sectionNames && activeHoverPoint.sectionNames.length > 0
            ? activeHoverPoint.sectionNames
            : overallSections,
        emptyText: "All Sections",
      },
      {
        id: "teachers",
        icon: TeacherIcon,
        label: "Teacher",
        items:
          activeHoverPoint?.teacherNames && activeHoverPoint.teacherNames.length > 0
            ? activeHoverPoint.teacherNames
            : overallTeachers,
        emptyText: "Staff Teacher",
      },
    ],
    [
      activeHoverPoint,
      overallStudents,
      overallSessions,
      overallDepartments,
      overallClasses,
      overallSections,
      overallTeachers,
      propStudentCount,
    ]
  );

  return (
    <TrendChart
      title="Recitation Trends"
      subtitle="Chronological progress driven by date criteria"
      emptyMessage="No recitation reports found matching the selected date criteria."
      emptyIcon={BookOpenIcon}
      dataPoints={trendPoints}
      series={series}
      activeMetric={currentMetric}
      onMetricChange={onMetricChange}
      metricOptions={metricOptions}
      viewMode={viewMode}
      onViewModeChange={onViewModeChange}
      hoveredIndex={hoveredIndex}
      onHoverIndexChange={setHoveredIndex}
      kpiItems={kpiItems as any}
      footerFields={footerFields as any}
      exportFilename="recitation_trends"
      exportTitle="Recitation Trends"
      extraMenuItems={extraMenuItems}
      className={className}
    />
  );
};

export default ProgressTrendsChart;
