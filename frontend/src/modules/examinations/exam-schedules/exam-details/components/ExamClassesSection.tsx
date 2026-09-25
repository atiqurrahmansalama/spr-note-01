import React from 'react';
import CustomSelect from '../../../../../components/ui/CustomSelect';
import CustomCheckbox from '../../../../../components/ui/CustomCheckbox';
import EmptyState from '../../../../../components/ui/EmptyState';
import ReusableCalendar from '../../../../../components/common/ReusableCalendar';
import { DrawerSection } from '../../../../../components/layout';
import {
  AcademicCapIcon,
  BuildingLibraryIcon,
  CheckIcon,
  CalendarIcon,
  DepartmentIcon,
  RefreshIcon,
} from '../../../../../components/ui/Icons';
import { ExamClassesSectionProps } from '../types';

/**
 * ExamClassesSection
 * Wizard Step 2: Target Department, Participating Classes & Multi-Department Date Windows.
 * 
 * Follows SPR Note Enterprise Engineering Guidelines:
 * - 100% Theme Tokens & Zero Hardcoded Colors
 * - Container Queries (@container, @[480px]:grid-cols-2)
 * - Reusable DrawerSection components
 * - Highly aesthetic interactive class selection cards
 * - Multi-Department Custom Date Windows mapping with ReusableCalendar
 */
export default function ExamClassesSection({
  departmentOptions = [],
  departmentId = 'ALL',
  onDepartmentChange,
  visibleClasses = [],
  targetClassIds = [],
  onClassToggle,
  onSelectAllClasses,
  isMultiDepartmentSchedule = false,
  onMultiDepartmentScheduleToggle,
  departmentSchedules = [],
  onDepartmentScheduleChange,
  globalStartDate = '',
  globalEndDate = '',
  globalPrepStartDate = '',
  globalPrepEndDate = '',
}: ExamClassesSectionProps) {
  const visibleSelectedCount = visibleClasses.filter((c) =>
    targetClassIds.some((id) => String(id) === String(c.value))
  ).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Sub-Section 1: Target Department & Faculty Scope ── */}
      <DrawerSection
        title="Target Department Scope"
        icon={BuildingLibraryIcon}
        className="!pt-0"
      >
        <CustomSelect
          label={false}
          options={departmentOptions}
          value={departmentId}
          onChange={onDepartmentChange}
          multiple={true}
          placeholder="Select Department..."
        />
      </DrawerSection>

      {/* ── Sub-Section 2: Participating Classes Selection ── */}
      <DrawerSection
        title="Participating Classes"
        subtitle={`${visibleSelectedCount} / ${visibleClasses.length} Selected`}
        icon={AcademicCapIcon}
        headerRight={
          visibleClasses.length > 0 ? (
            <button
              type="button"
              onClick={onSelectAllClasses}
              className="px-2.5 py-1 rounded-lg text-xs font-bold theme-bg-surface border theme-border hover:border-[var(--accent-main)]/60 theme-text-primary hover:theme-accent transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
            >
              {visibleSelectedCount === visibleClasses.length
                ? 'Deselect All'
                : 'Select All'}
            </button>
          ) : undefined
        }
      >
        {/* Interactive Classes Multi-Select Card Grid */}
        {visibleClasses.length === 0 ? (
          <EmptyState
            icon={AcademicCapIcon}
            iconVariant="default"
            title="No Academy Classes Found"
            description="Please configure classes in the Academy module first."
            variant="dashed"
            size="sm"
          />
        ) : (
          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1 no-scrollbar p-1">
            {visibleClasses.map((c) => {
              const isSelected = targetClassIds.some((id) => String(id) === String(c.value));
              return (
                <div
                  key={c.value}
                  onClick={() => onClassToggle(c.value)}
                  className={`group p-3 rounded-xl border theme-border transition-all duration-150 cursor-pointer flex items-center justify-between gap-2.5 shadow-2xs select-none active:scale-[0.98] ${
                    isSelected
                      ? 'theme-bg-surface'
                      : 'theme-bg-surface/60 hover:theme-bg-surface opacity-85 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border theme-border transition-colors ${
                        isSelected
                          ? 'theme-bg-accent-soft theme-accent'
                          : 'theme-bg-sub theme-text-secondary'
                      }`}
                    >
                      <AcademicCapIcon className="w-3.5 h-3.5" />
                    </div>
                    <span
                      className={`text-xs font-bold truncate transition-colors ${
                        isSelected ? 'theme-text-primary' : 'theme-text-secondary group-hover:theme-text-primary'
                      }`}
                    >
                      {c.label}
                    </span>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center border text-[11px] shrink-0 transition-all ${
                      isSelected
                        ? 'theme-bg-accent theme-accent-text border-[var(--accent-main)] shadow-2xs'
                        : 'theme-border theme-bg-sub/60 group-hover:border-[var(--accent-main)]/40'
                    }`}
                  >
                    {isSelected && <CheckIcon className="w-3 h-3 theme-accent-text stroke-[2.5]" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DrawerSection>

      {/* ── Sub-Section 3: Multi-Department Date Windows ── */}
      <DrawerSection
        title="Department Exam Date Windows"
        subtitle="Configure independent date spans for each participating department"
        icon={CalendarIcon}
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl border theme-border theme-bg-sub/20 flex items-start gap-3">
            <CustomCheckbox
              checked={isMultiDepartmentSchedule}
              onChange={onMultiDepartmentScheduleToggle}
            />
            <div
              className="space-y-0.5 min-w-0 flex-1 cursor-pointer"
              onClick={() => onMultiDepartmentScheduleToggle(!isMultiDepartmentSchedule)}
            >
              <div className="text-xs font-bold theme-text-primary">
                Enable Department-Specific Date Windows
              </div>
              <div className="text-[11px] theme-text-secondary">
                Assign separate examination start and end dates to each department under this term session.
              </div>
            </div>
          </div>

          {isMultiDepartmentSchedule && (
            <div className="space-y-3 pt-1 animate-fade-in">
              {departmentSchedules.length === 0 ? (
                <EmptyState
                  icon={DepartmentIcon}
                  description="No departments selected. Select departments or participating classes above."
                  variant="dashed"
                  size="compact"
                />
              ) : (
                departmentSchedules.map((ds) => {
                  const isModified = Boolean(
                    (ds.startDate && ds.startDate !== globalStartDate) ||
                    (ds.endDate && ds.endDate !== globalEndDate) ||
                    ((ds.prepStartDate || '') !== (globalPrepStartDate || '')) ||
                    ((ds.prepEndDate || '') !== (globalPrepEndDate || ''))
                  );

                  return (
                    <div
                      key={ds.departmentId}
                      className="p-3.5 rounded-2xl border theme-border theme-bg-surface space-y-3 shadow-2xs transition-all hover:border-[var(--accent-main)]/40"
                    >
                      {/* Header: Dept Name & Code */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-lg theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0 border border-[var(--accent-main)]/20">
                            <DepartmentIcon className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-xs font-bold theme-text-primary truncate">
                            {ds.departmentName}
                          </span>
                        </div>

                        {isModified && (
                          <button
                            type="button"
                            onClick={() => {
                              onDepartmentScheduleChange(ds.departmentId, {
                                startDate: globalStartDate,
                                endDate: globalEndDate,
                                prepStartDate: globalPrepStartDate,
                                prepEndDate: globalPrepEndDate,
                              });
                            }}
                            className="text-[11px] font-semibold theme-accent hover:underline inline-flex items-center gap-1 cursor-pointer transition-all active:scale-95 animate-fade-in"
                            title="Reset to main examination dates"
                          >
                            <RefreshIcon className="w-3 h-3 theme-accent" />
                            <span>Reset to Term Dates</span>
                          </button>
                        )}
                      </div>

                      {/* Date Ranges Grid Reusing ReusableCalendar */}
                      <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3.5">
                        <ReusableCalendar
                          label="Preparation Date Range"
                          placeholder="Select Preparation Dates"
                          isRange={true}
                          startDate={ds.prepStartDate || ''}
                          endDate={ds.prepEndDate || ''}
                          onRangeSelect={(start: string, end: string) =>
                            onDepartmentScheduleChange(ds.departmentId, {
                              prepStartDate: start,
                              prepEndDate: end,
                            })
                          }
                          clearable
                        />
                        <ReusableCalendar
                          label="Exam Date Range"
                          placeholder="Select Exam Dates"
                          isRange={true}
                          startDate={ds.startDate || globalStartDate}
                          endDate={ds.endDate || globalEndDate}
                          onRangeSelect={(start: string, end: string) =>
                            onDepartmentScheduleChange(ds.departmentId, {
                              startDate: start,
                              endDate: end,
                            })
                          }
                          required
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </DrawerSection>
    </div>
  );
}
