import React from 'react';
import CustomSelect from '../../../../../components/ui/CustomSelect';
import CustomButton from '../../../../../components/ui/CustomButton';
import DataViewToolbar from '../../../../../components/ui/DataViewToolbar';
import { DepartmentSelect, ClassSelect, TeacherSelect } from '../../../../../components/selectors';
import {
  SparklesIcon,
  CalendarIcon,
  UserIcon,
  TrashIcon,
} from '../../../../../components/ui/Icons';

/**
 * SubjectMatrixHeader
 * Unified Enterprise Control Header for Subject Exam Routine Matrix and Invigilation Schedules.
 * Reuses the standard DataViewToolbar from Academy/Enterprise UI with:
 * - Active Examination Session selector & primary actions (Auto-Populate & Add Row)
 * - Optional inlineSessionSelector mode for single-row compact headers
 * - Search, Department, Class, Exam Date, and Invigilator filters
 * - Dynamic live counts, active filter badges, and one-click Reset
 */
export default function SubjectMatrixHeader({
  examOptions = [],
  selectedExamId,
  setSelectedExamId,
  onAutoPopulate,
  onAddRow,
  rightActions,
  showSearch = true,
  searchQuery = '',
  setSearchQuery,
  searchPlaceholder = 'Subject, book, teacher, hall...',
  showDepartmentFilter = true,
  filterDepartmentId = 'ALL',
  setFilterDepartmentId,
  showClassFilter = true,
  filterClassId = 'ALL',
  setFilterClassId,
  showExamDateFilter = true,
  filterExamDate = 'ALL',
  setFilterExamDate,
  showTeacherFilter = true,
  filterTeacherId = 'ALL',
  setFilterTeacherId,
  dateFilterOptions = [],
  allAvailableClasses = [],
  totalCount = 0,
  filteredCount = 0,
  itemLabel,
  selectedCount = 0,
  onBulkDelete,
  filterGridClassName,
  inlineSessionSelector = false,
}) {
  const isFilterActive = Boolean(
    (showSearch && searchQuery && searchQuery.trim()) ||
    (showDepartmentFilter && filterDepartmentId && filterDepartmentId !== 'ALL') ||
    (showClassFilter && filterClassId && filterClassId !== 'ALL') ||
    (showExamDateFilter && filterExamDate && filterExamDate !== 'ALL') ||
    (showTeacherFilter && filterTeacherId && filterTeacherId !== 'ALL')
  );

  const activeFilterCount = [
    Boolean(showSearch && searchQuery && searchQuery.trim()),
    Boolean(showDepartmentFilter && filterDepartmentId && filterDepartmentId !== 'ALL'),
    Boolean(showClassFilter && filterClassId && filterClassId !== 'ALL'),
    Boolean(showExamDateFilter && filterExamDate && filterExamDate !== 'ALL'),
    Boolean(showTeacherFilter && filterTeacherId && filterTeacherId !== 'ALL'),
  ].filter(Boolean).length;

  const totalGridItemsCount = [
    inlineSessionSelector,
    showDepartmentFilter,
    showClassFilter,
    showExamDateFilter,
    showTeacherFilter,
  ].filter(Boolean).length;

  const resolvedGridClassName =
    filterGridClassName ||
    (totalGridItemsCount <= 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : totalGridItemsCount === 3
      ? 'grid-cols-1 sm:grid-cols-3'
      : totalGridItemsCount === 4
      ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4'
      : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5');

  const handleResetFilters = () => {
    if (setSearchQuery) setSearchQuery('');
    if (setFilterDepartmentId) setFilterDepartmentId('ALL');
    if (setFilterClassId) setFilterClassId('ALL');
    if (setFilterExamDate) setFilterExamDate('ALL');
    if (setFilterTeacherId) setFilterTeacherId('ALL');
  };

  return (
    <div className="p-3.5 sm:p-4 rounded-2xl border theme-border theme-bg-surface shadow-xs space-y-3.5 text-left animate-fade-in">
      {/* ── 1. Top Section: Active Session Selector & Primary Actions (when not inline) ── */}
      {!inlineSessionSelector && (
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
          <div className="flex-1 max-w-xl">
            <CustomSelect
              label="Active Examination Session"
              options={examOptions}
              value={selectedExamId}
              onChange={(val) => {
                setSelectedExamId(val);
              }}
              placeholder="Select Examination Session..."
              required
            />
          </div>

          {(onAutoPopulate || rightActions) && (
            <div className="flex items-center gap-2 flex-wrap pb-0.5">
              {onAutoPopulate && (
                <CustomButton
                  variant="sub"
                  size="sm"
                  icon={SparklesIcon}
                  onClick={onAutoPopulate}
                  title="Automatically generate and save rows for all curriculum books belonging to this exam"
                >
                  Auto-Populate
                </CustomButton>
              )}
              {rightActions}
            </div>
          )}
        </div>
      )}

      {/* ── 2. Integrated Data View Toolbar (Search, Filters, Reset, and Live Counters) ── */}
      <div className={!inlineSessionSelector ? 'border-t theme-border pt-3.5' : ''}>
        <DataViewToolbar
          className="!border-0 !shadow-none !p-0 !bg-transparent"
          searchLabel="Search"
          searchQuery={searchQuery}
          onSearchChange={showSearch ? setSearchQuery : null}
          searchPlaceholder={searchPlaceholder}
          searchSpanClassName="col-span-1"
          filterGridClassName={resolvedGridClassName}
          stackedSwitcher={true}
          filteredCount={filteredCount}
          totalCount={totalCount}
          itemLabel={itemLabel || (filteredCount === 1 ? 'subject' : 'subjects')}
          hasActiveFilters={isFilterActive}
          onResetFilters={handleResetFilters}
          activeFilterCount={activeFilterCount}
          customFilters={
            <>
              {inlineSessionSelector && (
                <div>
                  <CustomSelect
                    label="Active Examination Session"
                    options={examOptions}
                    value={selectedExamId}
                    onChange={(val) => setSelectedExamId(val)}
                    placeholder="Select Examination Session..."
                    size="md"
                    required
                  />
                </div>
              )}

              {showDepartmentFilter && (
                <div>
                  <DepartmentSelect
                    label="Department"
                    value={filterDepartmentId}
                    allowAll={true}
                    allValue="ALL"
                    allLabel="All Departments"
                    placeholder="All Departments"
                    size="md"
                    onChange={(val) => {
                      setFilterDepartmentId?.(val || 'ALL');
                    }}
                  />
                </div>
              )}

              {showClassFilter && (
                <div>
                  <ClassSelect
                    label="Class"
                    value={filterClassId}
                    departmentId={filterDepartmentId !== 'ALL' ? filterDepartmentId : ''}
                    classes={allAvailableClasses}
                    allowAll={true}
                    allValue="ALL"
                    allLabel="All Classes"
                    placeholder="All Classes"
                    size="md"
                    onChange={(val) => setFilterClassId?.(val || 'ALL')}
                  />
                </div>
              )}

              {showExamDateFilter && (
                <div>
                  <CustomSelect
                    label="Exam Date"
                    value={filterExamDate}
                    options={dateFilterOptions}
                    icon={CalendarIcon}
                    placeholder="All Exam Dates"
                    size="md"
                    onChange={(val) => setFilterExamDate?.(val || 'ALL')}
                  />
                </div>
              )}

              {showTeacherFilter && (
                <div>
                  <TeacherSelect
                    label="Invigilator"
                    value={filterTeacherId}
                    allowAll={true}
                    allValue="ALL"
                    allLabel="All Invigilators"
                    placeholder="All Invigilators"
                    icon={UserIcon}
                    size="md"
                    onChange={(val) => setFilterTeacherId?.(val || 'ALL')}
                  />
                </div>
              )}
            </>
          }
          actions={
            selectedCount > 0 ? (
              <div className="flex items-center gap-2 p-1.5 px-2.5 rounded-xl theme-bg-danger-soft border border-[var(--danger-main)]/30 theme-danger animate-fade-in text-xs font-semibold shadow-2xs">
                <span className="font-bold font-mono">{selectedCount} selected</span>
                <button
                  type="button"
                  onClick={onBulkDelete}
                  className="p-1 rounded-lg hover:theme-bg-danger-soft theme-danger transition-colors cursor-pointer"
                  title="Delete Selected Subject Routines"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ) : (
              (inlineSessionSelector && (onAutoPopulate || rightActions)) ? (
                <div className="flex items-center gap-2 flex-wrap">
                  {onAutoPopulate && (
                    <CustomButton
                      variant="sub"
                      size="sm"
                      icon={SparklesIcon}
                      onClick={onAutoPopulate}
                      title="Automatically generate and save rows for all curriculum books belonging to this exam"
                    >
                      Auto-Populate
                    </CustomButton>
                  )}
                  {rightActions}
                </div>
              ) : null
            )
          }
        />
      </div>
    </div>
  );
}
