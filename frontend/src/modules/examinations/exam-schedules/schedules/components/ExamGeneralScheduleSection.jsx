import React from 'react';
import CustomInput from '../../../../../components/ui/CustomInput';
import CustomSelect from '../../../../../components/ui/CustomSelect';
import CustomTimePicker from '../../../../../components/ui/CustomTimePicker';
import ReusableCalendar from '../../../../../components/common/ReusableCalendar';
import CollapsibleCard from '../../../../../components/ui/CollapsibleCard';
import { DrawerSection } from '../../../../../components/layout';
import {
  CalendarIcon,
  ClockIcon,
  DocumentTextIcon,
  PlusIcon,
  TrashIcon,
} from '../../../../../components/ui/Icons';
import ExamDateMappingGrid from './ExamDateMappingGrid';

/**
 * ExamGeneralScheduleSection
 * Unified Master Section 1: Examination Information, Session Scope & Day-by-Day Schedule.
 * 
 * Follows SPR Note Enterprise Engineering Guidelines:
 * - 100% Theme Tokens & Zero Hardcoded Colors
 * - Container Queries (@container, @[480px]:grid-cols-2)
 * - Clean Complementary Field Pairing
 * - Reusable DrawerSection wrappers
 */
export default function ExamGeneralScheduleSection({
  name = '',
  onNameChange,
  academicYearOptions = [],
  academicYearId = '',
  onAcademicYearChange,
  semesterOptions = [],
  semesterId = '',
  onSemesterChange,
  gradingSystemOptions = [],
  gradingSystemId = '',
  onGradingSystemChange,
  startDate = '',
  endDate = '',
  onExamDateRangeSelect,
  prepStartDate = '',
  prepEndDate = '',
  onPrepDateRangeSelect,
  shifts = [],
  onAddShift,
  onRemoveShift,
  onShiftChange,
  scheduleDays = [],
  onScheduleDaysChange,
  description = '',
  onDescriptionChange,
}) {
  return (
    <div className="space-y-6">
      {/* ── Sub-Section 1: Examination Information & Dates ── */}
      <DrawerSection
        title="Examination Information Details"
        icon={CalendarIcon}
        className="!pt-0"
      >
        <div className="space-y-3.5">
          {/* Row 1: Examination Name & Academic Year */}
          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3.5">
            <CustomInput
              label="Examination Name"
              placeholder="e.g. Annual Final Examination 2026"
              value={name}
              onChange={onNameChange}
              required
            />
            <CustomSelect
              label="Academic Year"
              options={academicYearOptions}
              value={academicYearId}
              onChange={onAcademicYearChange}
              required
            />
          </div>

          {/* Row 2: Term / Semester & Grading Policy Scale */}
          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3.5">
            <CustomSelect
              label="Examination Term"
              options={semesterOptions}
              value={semesterId}
              onChange={onSemesterChange}
              required
            />
            <CustomSelect
              label="Grading Policy"
              options={gradingSystemOptions}
              value={gradingSystemId}
              onChange={onGradingSystemChange}
              required
            />
          </div>

          {/* Row 3: Preparation Gap Range & Exam Date Range */}
          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3.5">
            <ReusableCalendar
              label="Preparation Date Range"
              placeholder="Select Preparation Dates"
              isRange={true}
              startDate={prepStartDate}
              endDate={prepEndDate}
              onRangeSelect={onPrepDateRangeSelect}
              clearable
            />
            <ReusableCalendar
              label="Exam Date Range"
              placeholder="Select Exam Dates"
              isRange={true}
              startDate={startDate}
              endDate={endDate}
              onRangeSelect={onExamDateRangeSelect}
              required
            />
          </div>
        </div>
      </DrawerSection>

      {/* Reusable Collapsible Examination Shifts Box */}
      <CollapsibleCard
        title="Examination Shifts"
        icon={ClockIcon}
        subtitle={
          shifts.length === 0
            ? 'No shifts configured'
            : shifts.length === 1
            ? `1 Shift (${shifts[0]?.name || 'Shift 1'})`
            : `${shifts.length} Shifts (${shifts.map((s, idx) => s.name || `Shift ${idx + 1}`).join(', ')})`
        }
        defaultExpanded={true}
        headerRight={
          <button
            type="button"
            onClick={onAddShift}
            className="px-2 py-1 rounded-lg text-xs font-bold theme-bg-surface border theme-border hover:border-[var(--accent-main)]/60 theme-text-primary hover:theme-accent transition-all cursor-pointer shadow-2xs active:scale-95 flex items-center gap-1.5 shrink-0"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span className="hidden @[480px]:inline text-[11px]">Add Shift</span>
            <span className="@[480px]:hidden text-[11px]">Add</span>
          </button>
        }
      >
        <div className="space-y-3">
          {shifts.map((shift, idx) => (
            <div
              key={shift.id || `shift-${idx}`}
              className="p-3.5 rounded-xl border theme-border theme-bg-surface space-y-3 shadow-2xs transition-all duration-150 animate-fade-in"
            >
              {/* Shift Row Header */}
              <div className="flex items-center justify-between gap-2 pb-2 border-b theme-border">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="w-2 h-2 rounded-full theme-bg-accent shrink-0" />
                  <input
                    type="text"
                    value={shift.name}
                    onChange={(e) => onShiftChange(idx, 'name', e.target.value)}
                    placeholder={`Shift ${idx + 1}`}
                    className="text-xs font-bold theme-text-primary bg-transparent border-b border-dashed border-transparent hover:border-current focus:border-solid focus:border-[var(--accent-main)] focus:outline-none px-1 py-0.5 transition-colors w-full max-w-[200px]"
                  />
                </div>

                {shifts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveShift(idx)}
                    title="Remove this shift"
                    className="text-[11px] font-semibold theme-text-secondary hover:text-rose-500 cursor-pointer flex items-center gap-1 transition-colors px-2 py-1 rounded-md hover:theme-bg-danger-soft active:scale-95 shrink-0"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                    <span className="hidden @[480px]:inline">Remove Shift</span>
                  </button>
                )}
              </div>

              {/* Start & End Time Inputs */}
              <div className="grid grid-cols-2 gap-2.5 @[480px]:gap-3">
                <CustomTimePicker
                  label="Start Time"
                  placeholder="09:00 AM"
                  value={shift.startTime}
                  onChange={(val) => onShiftChange(idx, 'startTime', val)}
                />
                <CustomTimePicker
                  label="End Time"
                  placeholder="11:00 AM"
                  value={shift.endTime}
                  onChange={(val) => onShiftChange(idx, 'endTime', val)}
                />
              </div>
            </div>
          ))}
        </div>
      </CollapsibleCard>

      {/* Interactive Day-by-Day Schedule & Study Gap Mapper */}
      <ExamDateMappingGrid
        startDate={startDate}
        endDate={endDate}
        scheduleDays={scheduleDays}
        shifts={shifts}
        onAddShift={onAddShift}
        onChange={onScheduleDaysChange}
      />

      {/* ── Sub-Section 4: Description & General Guidelines ── */}
      <DrawerSection
        title="Description & Instructions"
        icon={DocumentTextIcon}
      >
        <CustomInput
          type="textarea"
          rows={2}
          placeholder="Type Description here..."
          value={description}
          onChange={onDescriptionChange}
        />
      </DrawerSection>
    </div>
  );
}
