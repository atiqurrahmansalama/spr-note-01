import React from "react";
import DailyClassroomFilterControls, {
  DailyClassroomFilterProps,
} from "../../components/DailyClassroomFilterControls";
import { useProgressAnalytics } from "./hooks/useProgressAnalytics";
import { useAcademicData } from "@/hooks/useAcademicData";
import {
  ProgressKPIOverview,
  ProgressTrendHistory,
  ErrorDensityIndex,
  SessionDistributionCard,
  PortionSpectrumCard,
  ProgressStudentLeaderboard,
} from "./components";

export interface ProgressAnalyticsViewProps {
  filterProps?: DailyClassroomFilterProps | null;
  isEmbedded?: boolean;
  className?: string;
  [key: string]: any;
}

export const ProgressAnalyticsView: React.FC<ProgressAnalyticsViewProps> = ({
  filterProps = null,
  isEmbedded = false,
  className = "",
}) => {
  const { students, classes, sections } = useAcademicData();

  const selectedDate = filterProps?.selectedDate || "";
  const selectedDepartmentId = filterProps?.selectedDepartmentId || "";
  const selectedClassId = filterProps?.selectedClassId || "";
  const selectedSectionId = filterProps?.selectedSectionId || "";

  const analytics = useProgressAnalytics({
    selectedDate,
    selectedDepartmentId,
    selectedClassId,
    selectedSectionId,
    students,
    classes,
    sections,
  });

  return (
    <div className={`w-full space-y-4 animate-fade-in select-none ${className}`}>
      {/* 1. Reused Enterprise Classroom Filter Controls (Top Filter Bar) */}
      <DailyClassroomFilterControls
        showCardWrapper={true}
        dateLabel="Recitation Date"
        filterProps={filterProps}
        showPeriodSwitcher={false}
      />

      {/* 2. Top KPI Overview Cards with Trend Indicators */}
      <ProgressKPIOverview kpis={analytics.kpis} />

      {/* 3. 7-Day Velocity & Error History Trend */}
      <ProgressTrendHistory
        trendHistory={analytics.trendHistory}
        selectedDate={selectedDate}
      />

      {/* 4. Recitation Error Density Index & Side-by-Side Breakdown */}
      <ErrorDensityIndex
        totalPages={analytics.totalPages}
        totalMistakes={analytics.totalMistakes}
        totalStucks={analytics.totalStucks}
        avgMistakesPerPage={analytics.avgMistakesPerPage}
        avgStucksPerPage={analytics.avgStucksPerPage}
        pagesPerMistake={analytics.pagesPerMistake}
        pagesPerStuck={analytics.pagesPerStuck}
        purityScore={analytics.purityScore}
      />

      {/* 5. Session Distribution & Portion Coverage Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SessionDistributionCard sessionBreakdown={analytics.sessionBreakdown} />
        <PortionSpectrumCard portionBreakdown={analytics.portionBreakdown} />
      </div>

      {/* 6. Student Progress Leaderboard & Action Needed Spectrum */}
      <ProgressStudentLeaderboard
        topPacesetters={analytics.topPacesetters}
        remedialLearners={analytics.remedialLearners}
      />
    </div>
  );
};

export default ProgressAnalyticsView;
