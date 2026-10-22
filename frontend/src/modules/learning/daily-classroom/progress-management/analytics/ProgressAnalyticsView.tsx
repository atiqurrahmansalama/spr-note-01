import React, { useState } from "react";
import DailyClassroomFilterControls, {
  DailyClassroomFilterProps,
} from "../../components/DailyClassroomFilterControls";
import { StudentSelector } from "../../components";
import { useProgressAnalytics } from "./hooks/useProgressAnalytics";
import { useAcademicData } from "@/hooks/useAcademicData";
import { DateRangePicker } from "@/components/selectors";
import {
  ProgressSparklineKPIs,
  ProgressTrendsChart,
  ProgressBreakdownCard,
  TodayRecitationLogsTable,
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

  const [timeHorizon, setTimeHorizon] = useState<"weekly" | "monthly" | "yearly">("weekly");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedStudentName, setSelectedStudentName] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const selectedDate = filterProps?.selectedDate || "";
  const selectedDepartmentId = filterProps?.selectedDepartmentId || "";
  const selectedClassId = filterProps?.selectedClassId || "";
  const selectedSectionId = filterProps?.selectedSectionId || "";

  const analytics = useProgressAnalytics({
    selectedDate,
    startDate,
    endDate,
    timeHorizon,
    selectedDepartmentId,
    selectedClassId,
    selectedSectionId,
    selectedStudentId,
    selectedStudentName,
    students,
    classes,
    sections,
  });

  const handleRangeSelect = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  const handleResetDates = () => {
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className={`w-full space-y-4.5 animate-fade-in select-none ${className}`}>
      {/* 1. Academic Hierarchy Scope Controls with Student Selector & Date Range Picker */}
      <DailyClassroomFilterControls
        showCardWrapper={true}
        maxColumns={4}
        filterProps={filterProps}
        showPeriodSwitcher={false}
        searchControl={
          <StudentSelector
            studentName={selectedStudentName}
            studentId={selectedStudentId}
            departmentId={selectedDepartmentId}
            classId={selectedClassId}
            sectionId={selectedSectionId}
            size="md"
            label="STUDENT"
            placeholder="Search student or roll..."
            onStudentSelect={(selected) => {
              if (!selected) {
                setSelectedStudentName("");
                setSelectedStudentId(null);
              } else if (typeof selected === "string") {
                setSelectedStudentName(selected);
                setSelectedStudentId(null);
              } else {
                setSelectedStudentName(selected.label || selected.name || "");
                setSelectedStudentId(selected.id ? String(selected.id) : null);
              }
            }}
          />
        }
        customDateComponent={
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onRangeSelect={handleRangeSelect}
            onReset={handleResetDates}
            label="Date Range"
            placeholder="Select Range..."
            size="md"
          />
        }
      />

      {/* 3. Top 4 Sleek KPI Stat Cards with Micro-bars Sparkline (Matching Reference Image) */}
      <ProgressSparklineKPIs kpis={analytics.kpis} />

      {/* 4. Main Chart & Analytics Split Section (2:1 Grid matching Reference Image) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left 2/3: Recitation Progress Trend Stacked Chart */}
        <div className="col-span-12 lg:col-span-8">
          <ProgressTrendsChart
            trendHistory={analytics.trendHistory}
            timeHorizon={timeHorizon}
            onHorizonChange={setTimeHorizon}
            totalPages={analytics.totalPages}
          />
        </div>

        {/* Right 1/3: Session & Portion Breakdown + AI Insight Box */}
        <div className="col-span-12 lg:col-span-4">
          <ProgressBreakdownCard
            sessionBreakdown={analytics.sessionBreakdown}
            portionBreakdown={analytics.portionBreakdown}
            aiInsight={analytics.aiInsight}
          />
        </div>
      </div>

      {/* 5. Bottom Section: Today's Recitations & Progress Logs (Matching Reference Image) */}
      <TodayRecitationLogsTable records={analytics.todayReports} />
    </div>
  );
};

export default ProgressAnalyticsView;
