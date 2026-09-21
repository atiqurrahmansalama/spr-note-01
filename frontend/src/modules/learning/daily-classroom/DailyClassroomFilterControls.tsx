import React, { useState, useEffect } from "react";
import CustomSelect from "../../../components/ui/CustomSelect";
import ReusableCalendar from "../../../components/common/ReusableCalendar";
import ClassPeriodSwitcherBar from "./ClassPeriodSwitcherBar";
import { classroomSettings, calendarSettings } from "../../../stores";
import { getEnrichedTimezoneList, getSystemTimezone, getTimezoneOffsetString } from "../../../constants/calendarConstants";

export interface DailyClassroomFilterProps {
  showDate?: boolean;
  dateLabel?: string;
  selectedDate?: string;
  onDateChange?: (date: string) => void;
  dateFormat?: string;
  datePlaceholder?: string;

  hasDepartments?: boolean;
  selectedDepartmentId?: string;
  onDepartmentChange?: (val: any) => void;
  departmentSelectOptions?: Array<{ value: string; label: string; [key: string]: any }>;
  departmentLabel?: string;
  departmentPlaceholder?: string;

  selectedClassId?: string;
  onClassChange?: (val: any) => void;
  classSelectOptions?: Array<{ value: string; label: string; [key: string]: any }>;
  classLabel?: string;
  classPlaceholder?: string;

  hasSectionsForClass?: boolean;
  selectedSectionId?: string;
  onSectionChange?: (val: any) => void;
  sectionSelectOptions?: Array<{ value: string; label: string; [key: string]: any }>;
  sectionLabel?: string;
  sectionPlaceholder?: string;

  showPeriodSwitcher?: boolean;
  periodSwitcherTitle?: string;
  allPeriodFilterOptions?: Array<{ value: string; label: string; [key: string]: any }>;
  activePeriodId?: string;
  onPeriodChange?: (periodId: string) => void;
  getSlotCount?: (periodId: string) => number;
  getPeriodSubtitle?: (periodId: string) => string;

  onBatchHierarchyChange?: (params: { departmentId?: string; classId?: string; sectionId?: string }) => void;
  setAcademicFilters?: (params: { departmentId?: string; classId?: string; sectionId?: string }) => void;
  [key: string]: any;
}

export interface DailyClassroomFilterControlsProps {
  filterProps?: DailyClassroomFilterProps | null;
  showCardWrapper?: boolean;
  wrapGrid?: boolean;
  gridClassName?: string;
  className?: string;

  // Date configuration
  showDate?: boolean;
  dateLabel?: string;
  selectedDate?: string;
  onDateChange?: (date: string) => void;
  dateFormat?: string;
  datePlaceholder?: string;

  // Department configuration
  hasDepartments?: boolean;
  selectedDepartmentId?: string;
  onDepartmentChange?: (val: any) => void;
  departmentSelectOptions?: Array<{ value: string; label: string; [key: string]: any }>;
  departmentLabel?: string;
  departmentPlaceholder?: string;

  // Class configuration
  selectedClassId?: string;
  onClassChange?: (val: any) => void;
  classSelectOptions?: Array<{ value: string; label: string; [key: string]: any }>;
  classLabel?: string;
  classPlaceholder?: string;

  // Section configuration
  hasSectionsForClass?: boolean;
  selectedSectionId?: string;
  onSectionChange?: (val: any) => void;
  sectionSelectOptions?: Array<{ value: string; label: string; [key: string]: any }>;
  sectionLabel?: string;
  sectionPlaceholder?: string;

  // Period Switcher Bar configuration
  showPeriodSwitcher?: boolean;
  periodSwitcherTitle?: string;
  allPeriodFilterOptions?: Array<{ value: string; label: string; [key: string]: any }>;
  activePeriodId?: string;
  onPeriodChange?: (periodId: string) => void;
  getSlotCount?: (periodId: string) => number;
  getPeriodSubtitle?: (periodId: string) => string;
}

/**
 * DailyClassroomFilterControls
 * Enterprise Reusable Filter Grid for Daily Classroom modules (Daily Lessons, Daily Progress, Daily Student Assessment).
 * Encapsulates Date picker, Department selector, Class selector, Section selector,
 * and optional Routine Period Switcher Bar with container-query responsive layout.
 */
export default function DailyClassroomFilterControls({
  filterProps = null,
  showCardWrapper = false,
  wrapGrid = false,
  gridClassName = "",
  className = "",

  // Date configuration
  showDate = filterProps?.showDate ?? true,
  dateLabel = filterProps?.dateLabel ?? "Delivery Date",
  selectedDate = filterProps?.selectedDate,
  onDateChange = filterProps?.onDateChange,
  dateFormat = filterProps?.dateFormat ?? "DD/MM/YYYY",
  datePlaceholder = filterProps?.datePlaceholder ?? "Select Date",

  // Department configuration
  hasDepartments = filterProps?.hasDepartments ?? false,
  selectedDepartmentId = filterProps?.selectedDepartmentId ?? "",
  onDepartmentChange = filterProps?.onDepartmentChange,
  departmentSelectOptions = filterProps?.departmentSelectOptions ?? [],
  departmentLabel = filterProps?.departmentLabel ?? "Department",
  departmentPlaceholder = filterProps?.departmentPlaceholder ?? "Select Department...",

  // Class configuration
  selectedClassId = filterProps?.selectedClassId ?? "",
  onClassChange = filterProps?.onClassChange,
  classSelectOptions = filterProps?.classSelectOptions ?? [],
  classLabel = filterProps?.classLabel ?? "Class",
  classPlaceholder = filterProps?.classPlaceholder ?? "Select Class...",

  // Section configuration
  hasSectionsForClass = filterProps?.hasSectionsForClass ?? false,
  selectedSectionId = filterProps?.selectedSectionId ?? "",
  onSectionChange = filterProps?.onSectionChange,
  sectionSelectOptions = filterProps?.sectionSelectOptions ?? [],
  sectionLabel = filterProps?.sectionLabel ?? "Section",
  sectionPlaceholder = filterProps?.sectionPlaceholder ?? "Select Section...",

  // Period Switcher Bar configuration
  showPeriodSwitcher = filterProps?.showPeriodSwitcher ?? true,
  periodSwitcherTitle = filterProps?.periodSwitcherTitle ?? "CLASS ROUTINE PERIODS",
  allPeriodFilterOptions = filterProps?.allPeriodFilterOptions ?? [],
  activePeriodId = filterProps?.activePeriodId ?? "1",
  onPeriodChange = filterProps?.onPeriodChange,
  getSlotCount = filterProps?.getSlotCount,
  getPeriodSubtitle = filterProps?.getPeriodSubtitle,
}: DailyClassroomFilterControlsProps) {
  const [isTimezoneEnabled, setIsTimezoneEnabled] = useState(() => classroomSettings?.getTimezoneEnabled?.() ?? true);
  const [classroomTz, setClassroomTz] = useState(() => classroomSettings?.getTimezone?.() ?? "APP_DEFAULT");
  const [appTz, setAppTz] = useState(() => calendarSettings?.getTimezone?.() ?? (typeof getSystemTimezone === "function" ? getSystemTimezone() : "UTC"));

  useEffect(() => {
    const handleClassroomUpdate = (e: any) => {
      if (e?.detail?.timezoneEnabled !== undefined) {
        setIsTimezoneEnabled(e.detail.timezoneEnabled);
      } else {
        setIsTimezoneEnabled(classroomSettings?.getTimezoneEnabled?.() ?? true);
      }
      if (e?.detail?.timezone !== undefined) {
        setClassroomTz(e.detail.timezone);
      } else {
        setClassroomTz(classroomSettings?.getTimezone?.() ?? "APP_DEFAULT");
      }
    };

    const handleCalendarUpdate = (e: any) => {
      if (e?.detail?.timezone !== undefined) {
        setAppTz(e.detail.timezone);
      } else {
        setAppTz(calendarSettings?.getTimezone?.() ?? "UTC");
      }
    };

    window.addEventListener("spr_classroom_settings_updated", handleClassroomUpdate);
    window.addEventListener("spr_calendar_settings_updated", handleCalendarUpdate);
    window.addEventListener("spr_date_time_updated", handleCalendarUpdate);
    return () => {
      window.removeEventListener("spr_classroom_settings_updated", handleClassroomUpdate);
      window.removeEventListener("spr_calendar_settings_updated", handleCalendarUpdate);
      window.removeEventListener("spr_date_time_updated", handleCalendarUpdate);
    };
  }, []);

  const effectiveTimezone = (classroomTz && classroomTz !== "APP_DEFAULT") ? classroomTz : (appTz || "UTC");
  const timezoneList = typeof getEnrichedTimezoneList === "function" ? getEnrichedTimezoneList() : [];
  const tzObj = timezoneList.find((t: any) => t?.id === effectiveTimezone);
  const tzAbbr = tzObj?.offset || (typeof getTimezoneOffsetString === "function" ? getTimezoneOffsetString(effectiveTimezone) : "");

  // Clean grid-span layout calculations (1 cell per control)
  const dateSpanClass = "col-span-1";
  const deptSpanClass = "col-span-1";
  const classSpanClass = "col-span-1";
  const sectionSpanClass = "col-span-1";

  const filterFields = (
    <>
      {/* 1. Date Picker */}
      {showDate && (
        <div className={dateSpanClass}>
          <ReusableCalendar
            label={dateLabel}
            headerAction={isTimezoneEnabled ? <span className="text-xs font-semibold theme-accent">{tzAbbr}</span> : undefined}
            dateFormat={dateFormat}
            timeZone={effectiveTimezone}
            showHijri={false}
            selectedDate={selectedDate}
            onSelectDate={onDateChange}
            placeholder={datePlaceholder}
            size="md"
          />
        </div>
      )}

      {/* 2. Academic Department Selector */}
      {hasDepartments && (
        <div className={deptSpanClass}>
          <CustomSelect
            label={departmentLabel}
            placeholder={departmentPlaceholder}
            options={departmentSelectOptions}
            value={selectedDepartmentId}
            onChange={onDepartmentChange}
            size="md"
          />
        </div>
      )}

      {/* 3. Target Class Selector */}
      <div className={classSpanClass}>
        <CustomSelect
          label={classLabel}
          placeholder={classPlaceholder}
          options={classSelectOptions}
          value={selectedClassId}
          onChange={onClassChange}
          size="md"
        />
      </div>

      {/* 4. Target Section Selector */}
      {hasSectionsForClass && (
        <div className={sectionSpanClass}>
          <CustomSelect
            label={sectionLabel}
            placeholder={sectionPlaceholder}
            options={sectionSelectOptions}
            value={selectedSectionId}
            onChange={onSectionChange}
            size="md"
          />
        </div>
      )}
    </>
  );

  // 1. If showCardWrapper is true, render inside standard enterprise toolbar/filter background box
  if (showCardWrapper) {
    return (
      <div
        className={`@container p-3 sm:p-4 rounded-2xl theme-bg-surface border theme-border shadow-xs space-y-3 w-full min-w-0 ${className}`}
      >
        <div
          className={`grid grid-cols-1 ${
            hasDepartments && hasSectionsForClass
              ? "@[480px]:grid-cols-2 @[800px]:grid-cols-4"
              : hasDepartments || hasSectionsForClass
              ? "@[480px]:grid-cols-2 @[720px]:grid-cols-3"
              : "@[480px]:grid-cols-2"
          } gap-2.5 sm:gap-3 w-full items-end ${gridClassName}`}
        >
          {filterFields}
        </div>

        {/* Routine Period Fast Selector Bar */}
        {showPeriodSwitcher && (
          <ClassPeriodSwitcherBar
            title={periodSwitcherTitle}
            allPeriodFilterOptions={allPeriodFilterOptions}
            activePeriodId={activePeriodId}
            onPeriodChange={onPeriodChange}
            getSlotCount={getSlotCount}
            getPeriodSubtitle={getPeriodSubtitle}
          />
        )}
      </div>
    );
  }

  // 2. If wrapGrid is true, render wrapped in container query grid
  if (wrapGrid) {
    return (
      <div
        className={`@container grid grid-cols-1 ${
          hasDepartments && hasSectionsForClass
            ? "@[480px]:grid-cols-2 @[800px]:grid-cols-4"
            : hasDepartments || hasSectionsForClass
            ? "@[480px]:grid-cols-2 @[720px]:grid-cols-3"
            : "@[480px]:grid-cols-2"
        } gap-3 ${gridClassName}`}
      >
        {filterFields}
        {showPeriodSwitcher && (
          <ClassPeriodSwitcherBar
            title={periodSwitcherTitle}
            allPeriodFilterOptions={allPeriodFilterOptions}
            activePeriodId={activePeriodId}
            onPeriodChange={onPeriodChange}
            getSlotCount={getSlotCount}
            getPeriodSubtitle={getPeriodSubtitle}
          />
        )}
      </div>
    );
  }

  // 3. Management Grid mode (raw items inside 6-col DataViewToolbar)
  return (
    <>
      {filterFields}
      {showPeriodSwitcher && (
        <ClassPeriodSwitcherBar
          title={periodSwitcherTitle}
          allPeriodFilterOptions={allPeriodFilterOptions}
          activePeriodId={activePeriodId}
          onPeriodChange={onPeriodChange}
          getSlotCount={getSlotCount}
          getPeriodSubtitle={getPeriodSubtitle}
        />
      )}
    </>
  );
}
