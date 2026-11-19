import React from "react";
import DailyClassroomFilterControls, {
  DailyClassroomFilterProps,
} from "../../components/DailyClassroomFilterControls";
import { useLessonAnalytics } from "./hooks/useLessonAnalytics";
import {
  LessonKPIOverview,
  LessonTrendHistory,
  EvaluationStatusBreakdown,
  SubjectCoverageMatrix,
  PeriodRoutineMatrix,
  LessonStudentLeaderboard,
} from "./components";

export interface LessonAnalyticsViewProps {
  filterProps?: DailyClassroomFilterProps | null;
  filteredLessons?: any[];
  baseFilteredLessons?: any[];
  lessons?: any[];
  evaluations?: any[];
  assessmentRows?: any[];
  assessmentMetrics?: any;
  enrolledStudents?: any[];
  periodSlots?: any[];
  getSlotLessonsCount?: (slotId: string) => number;
  classes?: any[];
  tenantId?: string;
  loadData?: () => void;
  [key: string]: any;
}

export const LessonAnalyticsView: React.FC<LessonAnalyticsViewProps> = ({
  filterProps = null,
  filteredLessons = [],
  baseFilteredLessons = [],
  lessons = [],
  evaluations = [],
  assessmentRows = [],
  assessmentMetrics = {},
  enrolledStudents = [],
  periodSlots = [],
  getSlotLessonsCount,
  classes = [],
}) => {
  const selectedDate = filterProps?.selectedDate || "";
  const activePeriodId = filterProps?.activePeriodId || "1";

  const analytics = useLessonAnalytics({
    lessons,
    evaluations,
    baseFilteredLessons,
    filteredLessons,
    assessmentRows,
    assessmentMetrics,
    enrolledStudents,
    periodSlots,
    selectedDate,
    activePeriodId,
    getPeriodSubtitle: filterProps?.getPeriodSubtitle,
  });

  return (
    <div className="w-full space-y-4 animate-fade-in select-none">
      {/* 1. Reused Enterprise Classroom Filter Controls (Top Filter Bar) */}
      <DailyClassroomFilterControls
        showCardWrapper={true}
        dateLabel="Delivery Date"
        filterProps={filterProps}
        getSlotCount={getSlotLessonsCount || filterProps?.getSlotCount}
        showPeriodSwitcher={true}
      />

      {/* 2. Top KPI Overview Cards with Trend Indicators */}
      <LessonKPIOverview kpis={analytics.kpis} />

      {/* 3. 7-Day Performance & Delivery Trend Velocity */}
      <LessonTrendHistory
        trendHistory={analytics.trendHistory}
        selectedDate={selectedDate}
      />

      {/* 4. Student Assessment Status Distribution */}
      <EvaluationStatusBreakdown
        statusBreakdown={analytics.statusBreakdown}
        totalStudents={assessmentRows.length}
      />

      {/* 5. Subject Coverage & Period Matrix Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SubjectCoverageMatrix subjectCoverage={analytics.subjectCoverage} />
        <PeriodRoutineMatrix periodRoutines={analytics.periodRoutines} />
      </div>

      {/* 6. Student Performance Spectrum (Excellence Board vs Remedial Action) */}
      <LessonStudentLeaderboard
        topPerformers={analytics.topPerformers}
        remedialStudents={analytics.remedialStudents}
      />
    </div>
  );
};

export default LessonAnalyticsView;
