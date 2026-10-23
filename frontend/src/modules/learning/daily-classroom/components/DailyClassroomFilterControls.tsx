import React, { useState, useEffect, useMemo } from 'react';
import CustomSelect from '@/components/ui/CustomSelect';
import ReusableCalendar from '@/components/common/ReusableCalendar';
import TeacherSelect from '@/components/selectors/TeacherSelect';
import { FilterIcon, ChevronIcon } from '@/components/ui/Icons';
import ClassPeriodSwitcherBar from './ClassPeriodSwitcherBar';
import { classroomSettings, calendarSettings } from '@/stores';
import { getEnrichedTimezoneList, getSystemTimezone, getTimezoneOffsetString } from '@/constants/calendarConstants';
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
  selectedTeacherId?: string;
  onTeacherChange?: (val: any) => void;
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
  selectedTeacherId?: string;
  onTeacherChange?: (val: any) => void;
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

  // Custom filter extensions
  searchControl?: React.ReactNode;
  studentControl?: React.ReactNode;
  sessionControl?: React.ReactNode;
  customDateComponent?: React.ReactNode;
  extraFields?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * DailyClassroomFilterControls (also LearningFilterControls)
 * Enterprise Reusable Filter Grid for Learning & Classroom modules.
 * Line 1 (Always Visible): Date | Student | Session (with Academic & Teacher Collapsible Toggle)
 * Line 2 (Collapsible): Department | Class | Section | Teacher
 * Bottom: Read-only summary when collapsed, with children / action bar support.
 */
export default function DailyClassroomFilterControls({
  filterProps = null,
  showCardWrapper = false,
  wrapGrid = false,
  gridClassName = '',
  className = '',
  maxColumns,

  // Collapsible configuration
  collapsible = true,
  defaultExpanded = false,

  // Custom extensions
  searchControl,
  studentControl,
  sessionControl,
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
  dateActionLabel = null,
  dateActionTo = null,
  dateActionTitle = null,
  onDateActionClick = null,
  dateHeaderAction = null,

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

  // Teacher configuration
  hasTeachers = filterProps?.hasTeachers ?? true,
  selectedTeacherId = filterProps?.selectedTeacherId ?? '',
  onTeacherChange = filterProps?.onTeacherChange,
  teacherSelectOptions = filterProps?.teacherSelectOptions ?? [],
  teacherLabel = filterProps?.teacherLabel ?? 'Teacher',
  teacherPlaceholder = filterProps?.teacherPlaceholder ?? 'Select Teacher...',
  teacherControl,

  // Period Switcher Bar configuration
  showPeriodSwitcher = filterProps?.showPeriodSwitcher ?? true,
  periodSwitcherTitle = filterProps?.periodSwitcherTitle ?? 'CLASS ROUTINE PERIODS',
  allPeriodFilterOptions = filterProps?.allPeriodFilterOptions ?? [],
  activePeriodId = filterProps?.activePeriodId ?? '1',
  onPeriodChange = filterProps?.onPeriodChange,
  getSlotCount = filterProps?.getSlotCount,
  getPeriodSubtitle = filterProps?.getPeriodSubtitle,
}: DailyClassroomFilterControlsProps) {
  const academicData: any = useAcademicData() || {};
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
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

  // Active labels calculation for footer summary
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

  const hiddenActiveCount = useMemo(() => {
    let count = 0;
    if (activeDepartmentLabel) count += 1;
    if (activeClassLabel) count += 1;
    if (activeSectionLabel) count += 1;
    if (activeTeacherLabel) count += 1;
    return count;
  }, [activeDepartmentLabel, activeClassLabel, activeSectionLabel, activeTeacherLabel]);

  const effectiveStudent = studentControl || searchControl;
  const effectiveSession = sessionControl || extraFields;

  // ── Render Form in Collapsible Enterprise Mode ──
  if (showCardWrapper) {
    return (
      <div
        className={`@container p-3 sm:p-4 rounded-2xl theme-bg-surface border theme-border shadow-xs space-y-3 w-full min-w-0 ${className}`}
      >
        {/* 1st Line (Primary Row — Always Visible): Date | Student | Session */}
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

        {/* 2nd Line (Collapsible Secondary Row): Department | Class | Section | Teacher */}
        {(!collapsible || isExpanded) && (
          <div className="grid grid-cols-1 @[480px]:grid-cols-2 @[800px]:grid-cols-4 gap-2.5 sm:gap-3 w-full items-end pt-2.5 border-t theme-border animate-fade-in">
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
                    onChange={(val) => {
                      const v = typeof val === 'object' ? (val?.value ?? val?.id) : val;
                      if (onTeacherChange) onTeacherChange(v);
                    }}
                    label={teacherLabel}
                    placeholder={teacherPlaceholder}
                    allowAll={true}
                    allLabel="All Teachers"
                    size="md"
                  />
                )
              ) : null}
            </div>
          </div>
        )}

        {/* Footer: Bottom Scope Summary & Expand/Collapse Toggle Button */}
        {collapsible && (
          <div className="pt-2.5 border-t theme-border flex items-center justify-between text-xs font-mono theme-text-secondary flex-wrap gap-2 animate-fade-in select-none">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              {!isExpanded && hiddenActiveCount > 0 ? (
                <>
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Selected Scope:</span>
                  {activeDepartmentLabel && (
                    <span className="text-[11px] font-mono">
                      Dept: <strong className="theme-text-primary font-semibold">{activeDepartmentLabel}</strong>
                    </span>
                  )}
                  {activeDepartmentLabel && (activeClassLabel || activeSectionLabel || activeTeacherLabel) && (
                    <span className="opacity-40">·</span>
                  )}
                  {activeClassLabel && (
                    <span className="text-[11px] font-mono">
                      Class: <strong className="theme-text-primary font-semibold">{activeClassLabel}</strong>
                    </span>
                  )}
                  {activeClassLabel && (activeSectionLabel || activeTeacherLabel) && (
                    <span className="opacity-40">·</span>
                  )}
                  {activeSectionLabel && (
                    <span className="text-[11px] font-mono">
                      Sec: <strong className="theme-text-primary font-semibold">{activeSectionLabel}</strong>
                    </span>
                  )}
                  {activeSectionLabel && activeTeacherLabel && (
                    <span className="opacity-40">·</span>
                  )}
                  {activeTeacherLabel && (
                    <span className="text-[11px] font-mono">
                      Teacher: <strong className="theme-text-primary font-semibold">{activeTeacherLabel}</strong>
                    </span>
                  )}
                </>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl theme-bg-sub hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary border theme-border transition-colors cursor-pointer active:scale-95 text-xs font-semibold shrink-0 ml-auto select-none"
              title={isExpanded ? 'Collapse More Filters' : 'Expand More Filters'}
            >
              <span>{isExpanded ? 'Hide More' : 'More'}</span>
              <ChevronIcon isOpen={isExpanded} className="w-3 h-3 theme-text-secondary" />
            </button>
          </div>
        )}

        {/* Custom Action Children (e.g., SelectionActionBar) */}
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

  // ── Render Form in Generic Grid Mode ──
  return (
    <div className={`@container grid grid-cols-1 @[480px]:grid-cols-2 @[720px]:grid-cols-3 @[940px]:grid-cols-4 gap-3 ${gridClassName}`}>
      {customDateComponent || (showDate && (
        <div className="col-span-1">
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
        </div>
      ))}
      {effectiveStudent && <div className="col-span-1">{effectiveStudent}</div>}
      {effectiveSession && <div className="col-span-1">{effectiveSession}</div>}
      {hasDepartments && (
        <div className="col-span-1">
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
      {hasSectionsForClass && (
        <div className="col-span-1">
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

export { DailyClassroomFilterControls as LearningFilterControls };
