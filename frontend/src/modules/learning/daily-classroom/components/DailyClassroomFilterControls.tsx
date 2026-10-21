import React, { useState, useEffect, useMemo } from 'react';
import CustomSelect from '@/components/ui/CustomSelect';
import ReusableCalendar from '@/components/common/ReusableCalendar';
import ClassPeriodSwitcherBar from './ClassPeriodSwitcherBar';
import { classroomSettings, calendarSettings } from '@/stores';
import { getEnrichedTimezoneList, getSystemTimezone, getTimezoneOffsetString } from '@/constants/calendarConstants';

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
  maxColumns?: 1 | 2 | 3 | 4 | 5 | 6;
  [key: string]: any;
}

export interface DailyClassroomFilterControlsProps {
  filterProps?: DailyClassroomFilterProps | null;
  showCardWrapper?: boolean;
  wrapGrid?: boolean;
  gridClassName?: string;
  className?: string;
  maxColumns?: 1 | 2 | 3 | 4 | 5 | 6;

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

  // Custom filter extensions
  searchControl?: React.ReactNode;
  customDateComponent?: React.ReactNode;
  extraFields?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * DailyClassroomFilterControls (also LearningFilterControls)
 * Enterprise Reusable Filter Grid for Learning & Classroom modules.
 */
export default function DailyClassroomFilterControls({
  filterProps = null,
  showCardWrapper = false,
  wrapGrid = false,
  gridClassName = '',
  className = '',
  maxColumns,

  // Custom extensions
  searchControl,
  customDateComponent,
  extraFields,
  children,

  // Date configuration
  showDate = filterProps?.showDate ?? true,
  dateLabel = filterProps?.dateLabel ?? 'Delivery Date',
  selectedDate = filterProps?.selectedDate,
  onDateChange = filterProps?.onDateChange,
  dateFormat = filterProps?.dateFormat ?? 'DD/MM/YYYY',
  datePlaceholder = filterProps?.datePlaceholder ?? 'Select Date',

  // Department configuration
  hasDepartments = filterProps?.hasDepartments ?? false,
  selectedDepartmentId = filterProps?.selectedDepartmentId ?? '',
  onDepartmentChange = filterProps?.onDepartmentChange,
  departmentSelectOptions = filterProps?.departmentSelectOptions ?? [],
  departmentLabel = filterProps?.departmentLabel ?? 'Department',
  departmentPlaceholder = filterProps?.departmentPlaceholder ?? 'Select Department...',

  // Class configuration
  selectedClassId = filterProps?.selectedClassId ?? '',
  onClassChange = filterProps?.onClassChange,
  classSelectOptions = filterProps?.classSelectOptions ?? [],
  classLabel = filterProps?.classLabel ?? 'Class',
  classPlaceholder = filterProps?.classPlaceholder ?? 'Select Class...',

  // Section configuration
  hasSectionsForClass = filterProps?.hasSectionsForClass ?? false,
  selectedSectionId = filterProps?.selectedSectionId ?? '',
  onSectionChange = filterProps?.onSectionChange,
  sectionSelectOptions = filterProps?.sectionSelectOptions ?? [],
  sectionLabel = filterProps?.sectionLabel ?? 'Section',
  sectionPlaceholder = filterProps?.sectionPlaceholder ?? 'Select Section...',

  // Period Switcher Bar configuration
  showPeriodSwitcher = filterProps?.showPeriodSwitcher ?? true,
  periodSwitcherTitle = filterProps?.periodSwitcherTitle ?? 'CLASS ROUTINE PERIODS',
  allPeriodFilterOptions = filterProps?.allPeriodFilterOptions ?? [],
  activePeriodId = filterProps?.activePeriodId ?? '1',
  onPeriodChange = filterProps?.onPeriodChange,
  getSlotCount = filterProps?.getSlotCount,
  getPeriodSubtitle = filterProps?.getPeriodSubtitle,
}: DailyClassroomFilterControlsProps) {
  const [isTimezoneEnabled, setIsTimezoneEnabled] = useState(() => classroomSettings?.getTimezoneEnabled?.() ?? true);
  const [classroomTz, setClassroomTz] = useState(() => classroomSettings?.getTimezone?.() ?? 'APP_DEFAULT');
  const [appTz, setAppTz] = useState(() => calendarSettings?.getTimezone?.() ?? (typeof getSystemTimezone === 'function' ? getSystemTimezone() : 'UTC'));

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
        setClassroomTz(classroomSettings?.getTimezone?.() ?? 'APP_DEFAULT');
      }
    };

    const handleCalendarUpdate = (e: any) => {
      if (e?.detail?.timezone !== undefined) {
        setAppTz(e.detail.timezone);
      } else {
        setAppTz(calendarSettings?.getTimezone?.() ?? 'UTC');
      }
    };

    window.addEventListener('spr_classroom_settings_updated', handleClassroomUpdate);
    window.addEventListener('spr_calendar_settings_updated', handleCalendarUpdate);
    window.addEventListener('spr_date_time_updated', handleCalendarUpdate);
    return () => {
      window.removeEventListener('spr_classroom_settings_updated', handleClassroomUpdate);
      window.removeEventListener('spr_calendar_settings_updated', handleCalendarUpdate);
      window.removeEventListener('spr_date_time_updated', handleCalendarUpdate);
    };
  }, []);

  const effectiveTimezone = classroomTz && classroomTz !== 'APP_DEFAULT' ? classroomTz : appTz || 'UTC';
  const timezoneList = typeof getEnrichedTimezoneList === 'function' ? getEnrichedTimezoneList() : [];
  const tzObj = timezoneList.find((t: any) => t?.id === effectiveTimezone);
  const tzAbbr = tzObj?.offset || (typeof getTimezoneOffsetString === 'function' ? getTimezoneOffsetString(effectiveTimezone) : '');

  // Clean grid-span layout calculations (1 cell per control)
  const dateSpanClass = 'col-span-1';
  const deptSpanClass = 'col-span-1';
  const classSpanClass = 'col-span-1';
  const sectionSpanClass = 'col-span-1';

  const filterFields = (
    <>
      {/* 0. Optional Search Bar */}
      {searchControl && (
        <div className="col-span-1">
          {searchControl}
        </div>
      )}

      {/* 1. Date Picker or Custom Date Component */}
      {customDateComponent ? (
        <div className="col-span-1">
          {customDateComponent}
        </div>
      ) : showDate ? (
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
      ) : null}

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

      {/* 5. Extra Fields */}
      {extraFields}
    </>
  );

  const hasExtra = Boolean(searchControl || customDateComponent || extraFields);
  const effectiveMaxColumns = maxColumns ?? filterProps?.maxColumns;

  const responsiveGridCols = useMemo(() => {
    if (effectiveMaxColumns === 1) return 'grid-cols-1';
    if (effectiveMaxColumns === 2) return 'grid-cols-1 @[480px]:grid-cols-2';
    if (effectiveMaxColumns === 3) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 @[480px]:grid-cols-2 @[720px]:grid-cols-3';
    if (effectiveMaxColumns === 4) return 'grid-cols-1 @[480px]:grid-cols-2 @[720px]:grid-cols-3 @[940px]:grid-cols-4';
    if (effectiveMaxColumns === 5) return 'grid-cols-1 @[480px]:grid-cols-2 @[720px]:grid-cols-3 @[940px]:grid-cols-4 @[1080px]:grid-cols-5';
    if (effectiveMaxColumns === 6) return 'grid-cols-1 @[480px]:grid-cols-2 @[720px]:grid-cols-3 @[940px]:grid-cols-4 @[1080px]:grid-cols-5 @[1280px]:grid-cols-6';

    return hasExtra
      ? 'grid-cols-1 @[480px]:grid-cols-2 @[720px]:grid-cols-3 @[940px]:grid-cols-4 @[1080px]:grid-cols-5 @[1280px]:grid-cols-6'
      : `grid-cols-2 ${
          hasDepartments && hasSectionsForClass
            ? '@[800px]:grid-cols-4'
            : hasDepartments || hasSectionsForClass
            ? '@[720px]:grid-cols-3'
            : '@[480px]:grid-cols-2'
        }`;
  }, [effectiveMaxColumns, hasExtra, hasDepartments, hasSectionsForClass]);

  // 1. If showCardWrapper is true, render inside standard enterprise toolbar/filter background box
  if (showCardWrapper) {
    return (
      <div
        className={`@container p-3 sm:p-4 rounded-2xl theme-bg-surface border theme-border shadow-xs space-y-3 w-full min-w-0 ${className}`}
      >
        <div
          className={`grid ${responsiveGridCols} gap-2.5 sm:gap-3 w-full items-end ${gridClassName}`}
        >
          {filterFields}
        </div>
        {children}

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
        className={`@container grid ${responsiveGridCols} gap-3 ${gridClassName}`}
      >
        {filterFields}
        {children}
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

  // 3. Management Grid mode
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

export { DailyClassroomFilterControls as LearningFilterControls };
