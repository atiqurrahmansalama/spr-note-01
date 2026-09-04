import React from 'react';
import CustomSelect from '../../../../../components/ui/CustomSelect';
import CustomButton from '../../../../../components/ui/CustomButton';
import DataViewToolbar from '../../../../../components/ui/DataViewToolbar';
import { DepartmentSelect, ClassSelect, TeacherSelect } from '../../../../../components/selectors';
import {
  PlusIcon,
  SparklesIcon,
  CalendarIcon,
  UserIcon,
  TrashIcon,
} from '../../../../../components/ui/Icons';

/**
 * SubjectMatrixHeader
 * Unified Enterprise Control Header for Subject Exam Routine Matrix.
 * Reuses the standard DataViewToolbar from Academy/Enterprise UI with:
 * - Active Examination Session selector & primary actions (Auto-Populate & Add Row)
 * - Search, Department, Class, Exam Date, and Invigilator filters
 * - Dynamic live counts, active filter badges, and one-click Reset
 */
export default function SubjectMatrixHeader({
  examOptions = [],
  selectedExamId,
  setSelectedExamId,
  onAutoPopulate,
  onAddRow,
  searchQuery = '',
  setSearchQuery,
  filterDepartmentId = 'ALL',
  setFilterDepartmentId,
  filterClassId = 'ALL',
  setFilterClassId,
  filterExamDate = 'ALL',
  setFilterExamDate,
  filterTeacherId = 'ALL',
  setFilterTeacherId,
  dateFilterOptions = [],
  allAvailableClasses = [],
  totalCount = 0,
  filteredCount = 0,
  selectedCount = 0,
  onBulkDelete,
}) {
  const isFilterActive = Boolean(
    (searchQuery && searchQuery.trim()) ||
    (filterDepartmentId && filterDepartmentId !== 'ALL') ||
    (filterClassId && filterClassId !== 'ALL') ||
    (filterExamDate && filterExamDate !== 'ALL') ||
    (filterTeacherId && filterTeacherId !== 'ALL')
  );

  const activeFilterCount = [
    Boolean(searchQuery && searchQuery.trim()),
    Boolean(filterDepartmentId && filterDepartmentId !== 'ALL'),
    Boolean(filterClassId && filterClassId !== 'ALL'),
    Boolean(filterExamDate && filterExamDate !== 'ALL'),
    Boolean(filterTeacherId && filterTeacherId !== 'ALL'),
  ].filter(Boolean).length;

  const handleResetFilters = () => {
    if (setSearchQuery) setSearchQuery('');
    if (setFilterDepartmentId) setFilterDepartmentId('ALL');
    if (setFilterClassId) setFilterClassId('ALL');
    if (setFilterExamDate) setFilterExamDate('ALL');
    if (setFilterTeacherId) setFilterTeacherId('ALL');
  };

  return (
    <div className="p-3.5 sm:p-4 rounded-2xl border theme-border theme-bg-surface shadow-xs space-y-3.5 text-left animate-fade-in">
      {/* ── 1. Top Section: Active Session Selector & Primary Actions ── */}
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

        <div className="flex items-center gap-2 flex-wrap pb-0.5">
          <CustomButton
            variant="sub"
            size="sm"
            icon={SparklesIcon}
            onClick={onAutoPopulate}
            title="Automatically generate and save rows for all curriculum books belonging to this exam"
          >
            Auto-Populate
          </CustomButton>

          <CustomButton
            variant="primary"
            size="sm"
            icon={PlusIcon}
            onClick={onAddRow}
            title="Add a new subject routine row"
          >
            Add Subject Row
          </CustomButton>
        </div>
      </div>

      {/* ── 2. Integrated Data View Toolbar (Search, Filters, Reset, and Live Counters) ── */}
      <div className="border-t theme-border pt-3.5">
        <DataViewToolbar
          className="!border-0 !shadow-none !p-0 !bg-transparent"
          searchLabel="Search"
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Subject, book, teacher, hall..."
          searchSpanClassName="col-span-1"
          filterGridClassName="grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
          stackedSwitcher={true}
          filteredCount={filteredCount}
          totalCount={totalCount}
          itemLabel={filteredCount === 1 ? 'subject' : 'subjects'}
          hasActiveFilters={isFilterActive}
          onResetFilters={handleResetFilters}
          activeFilterCount={activeFilterCount}
          customFilters={
            <>
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
                    setFilterDepartmentId(val || 'ALL');
                  }}
                />
              </div>

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
                  onChange={(val) => setFilterClassId(val || 'ALL')}
                />
              </div>

              <div>
                <CustomSelect
                  label="Exam Date"
                  value={filterExamDate}
                  options={dateFilterOptions}
                  icon={CalendarIcon}
                  placeholder="All Exam Dates"
                  size="md"
                  onChange={(val) => setFilterExamDate(val || 'ALL')}
                />
              </div>

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
                  onChange={(val) => setFilterTeacherId(val || 'ALL')}
                />
              </div>
            </>
          }
          actions={
            selectedCount > 0 ? (
              <div className="flex items-center gap-2 p-1.5 px-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 animate-fade-in text-xs font-semibold shadow-2xs">
                <span className="font-bold font-mono">{selectedCount} selected</span>
                <button
                  type="button"
                  onClick={onBulkDelete}
                  className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-500 transition-colors cursor-pointer"
                  title="Delete Selected Subject Routines"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ) : null
          }
        />
      </div>
    </div>
  );
}
