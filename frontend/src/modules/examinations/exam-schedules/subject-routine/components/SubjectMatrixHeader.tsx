import React, { useMemo } from 'react';
import CustomSelect from '../../../../../components/ui/CustomSelect';
import CustomButton from '../../../../../components/ui/CustomButton';
import ActionMenu from '../../../../../components/ui/ActionMenu';
import DataViewToolbar from '../../../../../components/ui/DataViewToolbar';
import { DepartmentSelect, ClassSelect, TeacherSelect } from '../../../../../components/selectors';
import TimetableLensSelector, { LENS_MODES } from '../../../../../components/common/TimetableMatrixGrid/TimetableLensSelector';
import {
  SparklesIcon,
  CalendarIcon,
  UserCheckIcon,
  TrashIcon,
  Squares2X2Icon,
  TableIcon,
  PrinterIcon,
} from '../../../../../components/ui/Icons';
import { SubjectMatrixHeaderProps, ActionMenuItem } from '../types';

/**
 * SubjectMatrixHeader
 * Unified Enterprise Control Header for Subject Exam Routine Matrix and Routine Studio.
 * Reuses the standard DataViewToolbar in Table mode, and switches to dedicated Lens & Class filters in Studio mode.
 * - Active Examination Session selector & primary actions (Routine Studio / Matrix Table view switcher, Auto-Populate, Add, Print)
 * - Single-line unified filter grid
 * - Dynamic live counts, active filter badges, and one-click Reset
 */
export default function SubjectMatrixHeader({
  examOptions = [],
  selectedExamId = '',
  setSelectedExamId,
  viewMode = 'table',
  onToggleViewMode,
  onAutoPopulate,
  autoPopulateLabel = 'Auto-Populate',
  autoPopulateTitle,
  onPrint,
  actionMenuItems,
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
  teacherLabel = 'Examiner',
  filterTeacherId = 'ALL',
  setFilterTeacherId,
  dateFilterOptions = [],
  allAvailableClasses = [],
  totalCount = 0,
  totalRowsCount,
  filteredCount = 0,
  itemLabel,
  selectedCount = 0,
  onBulkDelete,
  filterGridClassName,
  inlineSessionSelector = false,
  activeLens = LENS_MODES.ALL,
  setActiveLens,
  density,
  setDensity,
}: SubjectMatrixHeaderProps) {
  const isTableMode = viewMode === 'table';
  const effectiveTotalCount = totalRowsCount !== undefined ? totalRowsCount : totalCount;

  const menuItems = useMemo<ActionMenuItem[]>(() => {
    if (actionMenuItems && actionMenuItems.length > 0) {
      return actionMenuItems;
    }
    return [];
  }, [actionMenuItems]);

  const isFilterActive = isTableMode
    ? Boolean(
        (showSearch && searchQuery && searchQuery.trim()) ||
        (showDepartmentFilter && filterDepartmentId && filterDepartmentId !== 'ALL') ||
        (showClassFilter && filterClassId && filterClassId !== 'ALL') ||
        (showExamDateFilter && filterExamDate && filterExamDate !== 'ALL') ||
        (showTeacherFilter && filterTeacherId && filterTeacherId !== 'ALL')
      )
    : Boolean(
        (filterDepartmentId && filterDepartmentId !== 'ALL') ||
        (filterClassId && filterClassId !== 'ALL')
      );

  const activeFilterCount = [
    Boolean(showSearch && searchQuery && searchQuery.trim() && isTableMode),
    Boolean(showDepartmentFilter && filterDepartmentId && filterDepartmentId !== 'ALL'),
    Boolean(showClassFilter && filterClassId && filterClassId !== 'ALL'),
    Boolean(showExamDateFilter && filterExamDate && filterExamDate !== 'ALL' && isTableMode),
    Boolean(showTeacherFilter && filterTeacherId && filterTeacherId !== 'ALL' && isTableMode),
  ].filter(Boolean).length;

  const totalGridItemsCount = [
    showSearch,
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
    <div className="p-3.5 sm:p-4 rounded-2xl border theme-border theme-bg-surface shadow-xs space-y-3.5 text-left animate-fade-in print:hidden">
      {/* ── 1. Top Section: Active Examination Session & Primary Action Buttons (Line 1) ── */}
      {!inlineSessionSelector && (
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div className="w-full sm:w-80 md:w-96">
            <CustomSelect
              label="Active Examination Session"
              options={examOptions}
              value={selectedExamId}
              onChange={(val: string) => {
                setSelectedExamId?.(val);
              }}
              placeholder="Select Examination Session..."
              size="md"
              required
            />
          </div>

          {(onToggleViewMode || onAutoPopulate || menuItems.length > 0 || rightActions || selectedCount > 0) && (
            <div className="flex items-center gap-2 flex-wrap pb-0.5 shrink-0">
              {selectedCount > 0 && isTableMode && (
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
              )}

              {onAutoPopulate && (
                <CustomButton
                  type="button"
                  variant="sub"
                  size="sm"
                  icon={SparklesIcon}
                  onClick={onAutoPopulate}
                  title={autoPopulateTitle || "Automatically generate and populate schedule"}
                >
                  {autoPopulateLabel || 'Auto-Populate'}
                </CustomButton>
              )}

              {/* View Switcher Button */}
              {onToggleViewMode && (
                <CustomButton
                  type="button"
                  variant="sub"
                  size="sm"
                  icon={!isTableMode ? TableIcon : Squares2X2Icon}
                  onClick={onToggleViewMode}
                  title={!isTableMode ? "Switch to Subject Routine Table View" : "Open Interactive 2D Routine Studio"}
                >
                  {!isTableMode ? 'Matrix Table' : 'Routine Studio'}
                </CustomButton>
              )}

              {rightActions}

              {/* 3-Dot Action Menu (Positioned at the far right) */}
              {menuItems.length > 0 && (
                <ActionMenu
                  items={menuItems}
                  align="right"
                  size="sm"
                  variant="sub"
                  ariaLabel="Subject Routine Options"
                  menuClassName="w-48"
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* ── 2. Integrated Controls & Filters (Line 2) ── */}
      {isTableMode ? (
        /* Table Mode: Full Search & Multi-dimension DataViewToolbar */
        <div className={!inlineSessionSelector ? 'border-t theme-border pt-3.5' : ''}>
          <DataViewToolbar
            className="!border-0 !shadow-none !p-0 !bg-transparent"
            searchLabel="Search"
            searchQuery={searchQuery}
            onSearchChange={showSearch ? (val: string) => setSearchQuery?.(val) : null}
            searchPlaceholder={searchPlaceholder}
            searchSpanClassName="col-span-1"
            filterGridClassName={resolvedGridClassName}
            stackedSwitcher={true}
            filteredCount={filteredCount}
            totalCount={effectiveTotalCount}
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
                      onChange={(val: string) => setSelectedExamId?.(val)}
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
                      onChange={(val: string) => {
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
                      onChange={(val: string) => setFilterClassId?.(val || 'ALL')}
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
                      onChange={(val: string) => setFilterExamDate?.(val || 'ALL')}
                    />
                  </div>
                )}

                {showTeacherFilter && (
                  <div>
                    <TeacherSelect
                      label={teacherLabel || 'Examiner'}
                      value={filterTeacherId}
                      allowAll={true}
                      allValue="ALL"
                      allLabel={`All ${teacherLabel ? `${teacherLabel}s` : 'Examiners'}`}
                      placeholder={`All ${teacherLabel ? `${teacherLabel}s` : 'Examiners'}`}
                      icon={UserCheckIcon}
                      size="md"
                      onChange={(val: string) => setFilterTeacherId?.(val || 'ALL')}
                    />
                  </div>
                )}
              </>
            }
          />
        </div>
      ) : (
        /* Studio Mode: Department, Class & Lens Switcher Toolbar */
        <div className="border-t theme-border pt-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left Side: Dept & Class Filters */}
          <div className="flex items-center gap-2.5 flex-wrap flex-1">
            {/* Department Filter */}
            <div className="w-full sm:w-44">
              <DepartmentSelect
                value={filterDepartmentId}
                allowAll={true}
                allValue="ALL"
                allLabel="All Departments"
                placeholder="All Departments"
                size="sm"
                onChange={(val: string) => setFilterDepartmentId?.(val || 'ALL')}
              />
            </div>

            {/* Class Filter */}
            <div className="w-full sm:w-44">
              <ClassSelect
                value={filterClassId}
                departmentId={filterDepartmentId !== 'ALL' ? filterDepartmentId : ''}
                classes={allAvailableClasses}
                allowAll={true}
                allValue="ALL"
                allLabel="All Classes"
                placeholder="All Classes"
                size="sm"
                onChange={(val: string) => setFilterClassId?.(val || 'ALL')}
              />
            </div>

            {/* Reset Filters */}
            {isFilterActive && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-semibold theme-text-secondary hover:theme-text-primary px-2 py-1 rounded-lg border theme-border hover:theme-bg-sub transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* Right Side: Lens Switcher */}
          {setActiveLens && (
            <div className="flex items-center gap-2 flex-wrap shrink-0 justify-end">
              <TimetableLensSelector
                activeLens={activeLens}
                onChange={setActiveLens}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
