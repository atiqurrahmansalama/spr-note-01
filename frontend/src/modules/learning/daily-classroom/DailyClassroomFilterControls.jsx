import React from 'react';
import CustomSelect from '../../../components/ui/CustomSelect';
import ReusableCalendar from '../../../components/common/ReusableCalendar';
import ClassPeriodSwitcherBar from './ClassPeriodSwitcherBar';

/**
 * DailyClassroomFilterControls
 * Enterprise Reusable Filter Grid for Daily Classroom modules (Lesson Delivery, Student Assessment, etc.)
 * Encapsulates Date picker, Department selector, Class selector, Section selector,
 * and the Routine Period Switcher Bar with container-query responsive layout.
 */
export default function DailyClassroomFilterControls({
  filterProps = null,

  // Date configuration
  showDate = filterProps?.showDate ?? true,
  dateLabel = filterProps?.dateLabel ?? 'Delivery Date',
  selectedDate = filterProps?.selectedDate,
  onDateChange = filterProps?.onDateChange,
  datePlaceholder = filterProps?.datePlaceholder ?? 'Select Date',

  // Department configuration
  hasDepartments = filterProps?.hasDepartments ?? false,
  selectedDepartmentId = filterProps?.selectedDepartmentId ?? 'ALL',
  onDepartmentChange = filterProps?.onDepartmentChange,
  departmentSelectOptions = filterProps?.departmentSelectOptions ?? [],
  departmentLabel = filterProps?.departmentLabel ?? 'Department',

  // Class configuration
  selectedClassId = filterProps?.selectedClassId ?? 'ALL',
  onClassChange = filterProps?.onClassChange,
  classSelectOptions = filterProps?.classSelectOptions ?? [],
  classLabel = filterProps?.classLabel ?? 'Class',

  // Section configuration
  hasSectionsForClass = filterProps?.hasSectionsForClass ?? false,
  selectedSectionId = filterProps?.selectedSectionId ?? 'ALL',
  onSectionChange = filterProps?.onSectionChange,
  sectionSelectOptions = filterProps?.sectionSelectOptions ?? [],
  sectionLabel = filterProps?.sectionLabel ?? 'Section',

  // Period Switcher Bar configuration
  showPeriodSwitcher = filterProps?.showPeriodSwitcher ?? true,
  periodSwitcherTitle = filterProps?.periodSwitcherTitle ?? 'CLASS ROUTINE PERIODS',
  allPeriodFilterOptions = filterProps?.allPeriodFilterOptions ?? [],
  activePeriodId = filterProps?.activePeriodId ?? 'ALL',
  onPeriodChange = filterProps?.onPeriodChange,
  getSlotCount = filterProps?.getSlotCount,
  getPeriodSubtitle = filterProps?.getPeriodSubtitle,
}) {
  // Container query grid-span layout calculations
  const dateSpanClass = hasDepartments && hasSectionsForClass
    ? 'col-span-6 @[540px]:col-span-3 @[900px]:col-span-1'
    : 'col-span-6 @[540px]:col-span-3 @[900px]:col-span-2';

  const deptSpanClass = hasSectionsForClass
    ? 'col-span-6 @[540px]:col-span-2 @[900px]:col-span-1'
    : 'col-span-6 @[540px]:col-span-3 @[900px]:col-span-1';

  const classSpanClass = hasDepartments && hasSectionsForClass
    ? 'col-span-6 @[540px]:col-span-2 @[900px]:col-span-1'
    : hasDepartments || hasSectionsForClass
      ? 'col-span-6 @[540px]:col-span-3 @[900px]:col-span-1'
      : 'col-span-6 @[540px]:col-span-6 @[900px]:col-span-2';

  const sectionSpanClass = hasDepartments
    ? 'col-span-6 @[540px]:col-span-2 @[900px]:col-span-1'
    : 'col-span-6 @[540px]:col-span-3 @[900px]:col-span-1';

  return (
    <>
      {/* 1. Date Picker */}
      {showDate && (
        <div className={dateSpanClass}>
          <ReusableCalendar
            label={dateLabel}
            selectedDate={selectedDate}
            onSelectDate={onDateChange}
            placeholder={datePlaceholder}
          />
        </div>
      )}

      {/* 2. Academic Department Selector */}
      {hasDepartments && (
        <div className={deptSpanClass}>
          <CustomSelect
            label={departmentLabel}
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
            options={sectionSelectOptions}
            value={selectedSectionId}
            onChange={onSectionChange}
            size="md"
          />
        </div>
      )}

      {/* 5. Routine Period Fast Selector Bar */}
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
