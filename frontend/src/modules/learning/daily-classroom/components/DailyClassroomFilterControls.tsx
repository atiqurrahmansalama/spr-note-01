import React, { useState, useEffect, useMemo } from 'react';
import { FilterBox, FilterBoxScopeItem } from '@/components/ui';
import CustomSelect from '@/components/ui/CustomSelect';
import ReusableCalendar from '@/components/common/ReusableCalendar';
import TeacherSelect from '@/components/selectors/TeacherSelect';
import ClassPeriodSwitcherBar from './ClassPeriodSwitcherBar';
import { classroomSettings, calendarSettings } from '@/stores';
import { getSystemTimezone } from '@/constants/calendarConstants';
import { useAcademicData } from '@/hooks/useAcademicData';

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

  hasTeachers?: boolean;
  allowAllTeachers?: boolean;
  selectedTeacherId?: string;
  onTeacherChange?: (val: any, item?: any) => void;
  teacherSelectOptions?: Array<{ value: string; label: string; [key: string]: any }>;
  teacherLabel?: string;
  teacherPlaceholder?: string;

  showPeriodSwitcher?: boolean;
  periodSwitcherTitle?: string;
  allPeriodFilterOptions?: Array<{ value: string; label: string; [key: string]: any }>;
  activePeriodId?: string;
  onPeriodChange?: (periodId: string) => void;
  getSlotCount?: (periodId: string) => number;
  getPeriodSubtitle?: (periodId: string) => string;

  onBatchHierarchyChange?: (params: { departmentId?: string; classId?: string; sectionId?: string; teacherId?: string }) => void;
  setAcademicFilters?: (params: { departmentId?: string; classId?: string; sectionId?: string; teacherId?: string }) => void;
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

  // Collapsible configuration
  collapsible?: boolean;
  defaultExpanded?: boolean;

  // Custom filter extensions
  searchControl?: React.ReactNode;
  studentControl?: React.ReactNode;
  sessionControl?: React.ReactNode;
  customDateComponent?: React.ReactNode;
  extraFields?: React.ReactNode;
  children?:
    | React.ReactNode
    | ((props: { moreButton: React.ReactNode; isExpanded: boolean; hasVisibleScope: boolean }) => React.ReactNode);

  // Date configuration
  showDate?: boolean;
  dateLabel?: string;
  selectedDate?: string;
  onDateChange?: (date: string) => void;
  dateFormat?: string;
  datePlaceholder?: string;
  dateActionLabel?: string | null;
  dateActionTo?: string | ((searchTerm: string) => string) | null;
  dateActionTitle?: string | null;
  onDateActionClick?: () => void;
  dateHeaderAction?: React.ReactNode;

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

  // Teacher configuration
  hasTeachers?: boolean;
  allowAllTeachers?: boolean;
  selectedTeacherId?: string;
  onTeacherChange?: (val: any, item?: any) => void;
  teacherSelectOptions?: Array<{ value: string; label: string; [key: string]: any }>;
  teacherLabel?: string;
  teacherPlaceholder?: string;
  teacherControl?: React.ReactNode;

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
 * DailyClassroomFilterControls (also LearningFilterControls)
 * Composed on top of the reusable FilterBox UI container.
 * Line 1 (Always Visible): Date | Student | Session
 * Line 2 (Collapsible): Department | Class | Section | Teacher
 * Bottom: Table action toolbars, batch buttons, and routine period switcher bar.
 */
export default function DailyClassroomFilterControls({
  filterProps = null,
  showCardWrapper = true,
  className = '',
  collapsible = true,
  defaultExpanded = false,

  // Custom extensions
  searchControl,
  studentControl,
  sessionControl,
  customDateComponent,
  extraFields,
  children,

  // Date
  showDate = filterProps?.showDate ?? true,
  dateLabel = filterProps?.dateLabel ?? 'Delivery Date',
  selectedDate = filterProps?.selectedDate,
  onDateChange = filterProps?.onDateChange,
  dateFormat = filterProps?.dateFormat ?? 'DD/MM/YYYY',
  datePlaceholder = filterProps?.datePlaceholder ?? 'Select Date',
  dateActionLabel = null,
  dateActionTo = null,
  dateActionTitle = null,
  onDateActionClick = null,
  dateHeaderAction = null,

  // Department
  hasDepartments = filterProps?.hasDepartments ?? false,
  selectedDepartmentId = filterProps?.selectedDepartmentId ?? '',
  onDepartmentChange = filterProps?.onDepartmentChange,
  departmentSelectOptions = filterProps?.departmentSelectOptions ?? [],
  departmentLabel = filterProps?.departmentLabel ?? 'Department',
  departmentPlaceholder = filterProps?.departmentPlaceholder ?? 'Select Department...',

  // Class
  selectedClassId = filterProps?.selectedClassId ?? '',
  onClassChange = filterProps?.onClassChange,
  classSelectOptions = filterProps?.classSelectOptions ?? [],
  classLabel = filterProps?.classLabel ?? 'Class',
  classPlaceholder = filterProps?.classPlaceholder ?? 'Select Class...',

  // Section
  hasSectionsForClass = filterProps?.hasSectionsForClass ?? false,
  selectedSectionId = filterProps?.selectedSectionId ?? '',
  onSectionChange = filterProps?.onSectionChange,
  sectionSelectOptions = filterProps?.sectionSelectOptions ?? [],
  sectionLabel = filterProps?.sectionLabel ?? 'Section',
  sectionPlaceholder = filterProps?.sectionPlaceholder ?? 'Select Section...',

  // Teacher
  hasTeachers = filterProps?.hasTeachers ?? true,
  allowAllTeachers = filterProps?.allowAllTeachers ?? true,
  selectedTeacherId = filterProps?.selectedTeacherId ?? '',
  onTeacherChange = filterProps?.onTeacherChange,
  teacherSelectOptions = filterProps?.teacherSelectOptions ?? [],
  teacherLabel = filterProps?.teacherLabel ?? 'Teacher',
  teacherPlaceholder = filterProps?.teacherPlaceholder ?? 'Select Teacher...',
  teacherControl,

  // Period Switcher
  showPeriodSwitcher = filterProps?.showPeriodSwitcher ?? false,
  periodSwitcherTitle = filterProps?.periodSwitcherTitle ?? 'CLASS ROUTINE PERIODS',
  allPeriodFilterOptions = filterProps?.allPeriodFilterOptions ?? [],
  activePeriodId = filterProps?.activePeriodId ?? '1',
  onPeriodChange = filterProps?.onPeriodChange,
  getSlotCount = filterProps?.getSlotCount,
  getPeriodSubtitle = filterProps?.getPeriodSubtitle,
}: DailyClassroomFilterControlsProps) {
  const academicData: any = useAcademicData() || {};

  // Timezone resolution with graceful fallback
  const [isTimezoneEnabled, setIsTimezoneEnabled] = useState(() => {
    try {
      return classroomSettings?.getTimezoneEnabled?.() ?? true;
    } catch {
      return true;
    }
  });

  const [classroomTz, setClassroomTz] = useState(() => {
    try {
      return classroomSettings?.getTimezone?.() ?? 'APP_DEFAULT';
    } catch {
      return 'APP_DEFAULT';
    }
  });

  const [appTz, setAppTz] = useState(() => {
    try {
      return calendarSettings?.getTimezone?.() ?? (typeof getSystemTimezone === 'function' ? getSystemTimezone() : 'UTC');
    } catch {
      return 'UTC';
    }
  });

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

  // Active labels calculation for collapsed scope badge
  const activeDepartmentLabel = useMemo(() => {
    if (!selectedDepartmentId || selectedDepartmentId === 'ALL') return '';
    const opt = departmentSelectOptions.find((d) => String(d.value) === String(selectedDepartmentId));
    if (opt) return opt.label;
    const fromData = (academicData.departments || []).find((d: any) => String(d.id) === String(selectedDepartmentId));
    return fromData?.name || '';
  }, [selectedDepartmentId, departmentSelectOptions, academicData.departments]);

  const activeClassLabel = useMemo(() => {
    if (!selectedClassId || selectedClassId === 'ALL') return '';
    const opt = classSelectOptions.find((c) => String(c.value) === String(selectedClassId));
    if (opt) return opt.label;
    const fromData = (academicData.classes || []).find((c: any) => String(c.id) === String(selectedClassId));
    return fromData?.name || '';
  }, [selectedClassId, classSelectOptions, academicData.classes]);

  const activeSectionLabel = useMemo(() => {
    if (!selectedSectionId || selectedSectionId === 'ALL') return '';
    const opt = sectionSelectOptions.find((s) => String(s.value) === String(selectedSectionId));
    if (opt) return opt.label;
    const fromData = (academicData.sections || []).find((s: any) => String(s.id) === String(selectedSectionId));
    return fromData?.name || '';
  }, [selectedSectionId, sectionSelectOptions, academicData.sections]);

  const activeTeacherLabel = useMemo(() => {
    if (!selectedTeacherId || selectedTeacherId === 'ALL') return '';
    const opt = teacherSelectOptions.find((t) => String(t.value) === String(selectedTeacherId));
    if (opt) return opt.label;
    const fromStaff = (academicData.staff || academicData.teachers || []).find(
      (s: any) => String(s.id) === String(selectedTeacherId) || String(s.user) === String(selectedTeacherId)
    );
    return fromStaff?.name_en || fromStaff?.name || fromStaff?.full_name || '';
  }, [selectedTeacherId, teacherSelectOptions, academicData]);

  const scopeItems: FilterBoxScopeItem[] = useMemo(() => {
    const items: FilterBoxScopeItem[] = [];
    if (activeDepartmentLabel) items.push({ label: 'Dept', value: activeDepartmentLabel });
    if (activeClassLabel) items.push({ label: 'Class', value: activeClassLabel });
    if (activeSectionLabel) items.push({ label: 'Sec', value: activeSectionLabel });
    if (activeTeacherLabel) items.push({ label: 'Teacher', value: activeTeacherLabel });
    return items;
  }, [activeDepartmentLabel, activeClassLabel, activeSectionLabel, activeTeacherLabel]);

  const effectiveStudent = studentControl || searchControl;
  const effectiveSession = sessionControl || extraFields;

  // Primary Row Controls (Always Visible)
  const primaryRow = (
    <div className="grid grid-cols-1 @[640px]:grid-cols-3 gap-2.5 sm:gap-3 w-full items-end">
      {/* Slot 1: Date */}
      <div className="col-span-1">
        {customDateComponent ? (
          customDateComponent
        ) : showDate ? (
          <ReusableCalendar
            label={dateLabel}
            showTimezone={isTimezoneEnabled}
            timezoneLink="/admin-tools?tab=classroom-config"
            dateFormat={dateFormat}
            timeZone={effectiveTimezone}
            showHijri={false}
            selectedDate={selectedDate}
            onSelectDate={onDateChange}
            placeholder={datePlaceholder}
            actionLabel={dateActionLabel}
            actionTo={dateActionTo}
            actionTitle={dateActionTitle}
            onActionClick={onDateActionClick}
            headerAction={dateHeaderAction}
            size="md"
          />
        ) : null}
      </div>

      {/* Slot 2: Student */}
      <div className="col-span-1">
        {effectiveStudent}
      </div>

      {/* Slot 3: Session */}
      <div className="col-span-1">
        {effectiveSession}
      </div>
    </div>
  );

  // Secondary Row Controls (Collapsible)
  const secondaryRow = (
    <div className="grid grid-cols-1 @[480px]:grid-cols-2 @[800px]:grid-cols-4 gap-2.5 sm:gap-3 w-full items-end">
      {/* Slot 1: Department */}
      <div className="col-span-1">
        <CustomSelect
          label={departmentLabel}
          placeholder={departmentPlaceholder}
          options={departmentSelectOptions}
          value={selectedDepartmentId}
          onChange={onDepartmentChange}
          size="md"
          disabled={!hasDepartments}
        />
      </div>

      {/* Slot 2: Class */}
      <div className="col-span-1">
        <CustomSelect
          label={classLabel}
          placeholder={classPlaceholder}
          options={classSelectOptions}
          value={selectedClassId}
          onChange={onClassChange}
          size="md"
        />
      </div>

      {/* Slot 3: Section */}
      <div className="col-span-1">
        <CustomSelect
          label={sectionLabel}
          placeholder={sectionPlaceholder}
          options={sectionSelectOptions}
          value={selectedSectionId}
          onChange={onSectionChange}
          size="md"
          disabled={!hasSectionsForClass}
        />
      </div>

      {/* Slot 4: Teacher */}
      <div className="col-span-1">
        {teacherControl ? (
          teacherControl
        ) : hasTeachers ? (
          teacherSelectOptions.length > 0 ? (
            <CustomSelect
              label={teacherLabel}
              placeholder={teacherPlaceholder}
              options={teacherSelectOptions}
              value={selectedTeacherId}
              onChange={onTeacherChange}
              size="md"
            />
          ) : (
            <TeacherSelect
              value={selectedTeacherId}
              onChange={(val, item) => {
                const v = typeof val === 'object' ? (val?.value ?? val?.id) : val;
                if (onTeacherChange) onTeacherChange(v, item?.raw || item);
              }}
              label={teacherLabel}
              placeholder={teacherPlaceholder}
              allowAll={allowAllTeachers}
              allLabel="All Teachers"
              size="md"
            />
          )
        ) : null}
      </div>
    </div>
  );

  return (
    <FilterBox
      className={className}
      showCardWrapper={showCardWrapper}
      collapsible={collapsible}
      defaultExpanded={defaultExpanded}
      primaryRow={primaryRow}
      secondaryRow={secondaryRow}
      scopeItems={scopeItems}
      scopeLabel="Selected Scope:"
    >
      {({ moreButton, isExpanded, hasVisibleScope }) => (
        <>
          {/* Custom Action Children (e.g. Table Action Toolbar, SelectionActionBar, Analytics Toggle) */}
          {typeof children === 'function'
            ? (children as any)({ moreButton, isExpanded, hasVisibleScope })
            : children}

          {/* Routine Period Fast Selector Bar */}
          {showPeriodSwitcher && (
            <ClassPeriodSwitcherBar
              title={periodSwitcherTitle}
              allPeriodFilterOptions={allPeriodFilterOptions}
              activePeriodId={activePeriodId}
              onPeriodChange={onPeriodChange}
              getSlotCount={getSlotCount}
              getPeriodSubtitle={getPeriodSubtitle}
              headerRightAction={moreButton}
            />
          )}

          {/* Fallback next line for More button if not consumed by children or period switcher */}
          {!hasVisibleScope && !showPeriodSwitcher && typeof children !== 'function' && moreButton && (
            <div className="pt-2 border-t theme-border flex items-center justify-end gap-2 text-xs select-none">
              {moreButton}
            </div>
          )}
        </>
      )}
    </FilterBox>
  );
}

export { DailyClassroomFilterControls as LearningFilterControls };
