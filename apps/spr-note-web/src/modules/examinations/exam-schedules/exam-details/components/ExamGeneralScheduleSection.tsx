import React from 'react';
import CustomInput from '../../../../../components/ui/CustomInput';
import CustomSelect from '../../../../../components/ui/CustomSelect';
import CustomTimePicker from '../../../../../components/ui/CustomTimePicker';
import IconButton from '../../../../../components/ui/IconButton';
import ReusableCalendar from '../../../../../components/common/ReusableCalendar';
import { DrawerSection } from '../../../../../components/layout';
import {
  CalendarIcon,
  ClockIcon,
  DocumentTextIcon,
  PlusIcon,
  TrashIcon,
} from '../../../../../components/ui/Icons';
import { ExamGeneralScheduleSectionProps } from '../types';
import ExamDateMappingGrid from './ExamDateMappingGrid';

/**
 * ExamGeneralScheduleSection
 * Step 1 Master Form Component: Examination Information, Session Scope, Shifts & Day-by-Day Schedule.
 * 
 * Follows SPR Note Enterprise Engineering Guidelines:
 * - 100% Theme Tokens & Zero Hardcoded Colors
 * - Container Queries (@container, @[480px]:grid-cols-2)
 * - Clean Complementary Field Pairing
 * - Reusable DrawerSection & Collapsible CustomInput wrappers
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
}: ExamGeneralScheduleSectionProps) {
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
              label="Exam Name"
              placeholder="e.g. Annual Final Examination 2026"
              value={name}
              onChange={onNameChange}
              required
              multiLanguage={true}
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

      {/* ── Sub-Section 2: Reusable Collapsible Examination Shifts Box ── */}
      <CustomInput
        label="Examination Shifts"
        icon={ClockIcon}
        value={
          shifts.length === 0
            ? 'No shifts configured'
            : shifts.length === 1
            ? `1 Shift (${shifts[0]?.name || 'Shift 1'})`
            : `${shifts.length} Shifts (${shifts.map((s, idx) => s.name || `Shift ${idx + 1}`).join(', ')})`
        }
        collapsible={true}
        defaultExpanded={false}
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
                    className="text-xs font-bold theme-text-primary bg-transparent border-b border-dashed theme-border hover:border-[var(--accent-main)]/60 focus:border-solid focus:border-[var(--accent-main)] focus:outline-none px-1 py-0.5 transition-colors w-full max-w-[200px]"
                  />
                </div>

                {shifts.length > 1 && (
                  <IconButton
                    icon={TrashIcon}
                    size="xs"
                    variant="danger"
                    onClick={() => onRemoveShift(idx)}
                    title="Remove this shift"
                    ariaLabel="Remove this shift"
                  />
                )}
              </div>

              {/* Start & End Time Inputs */}
              <div className="grid grid-cols-2 gap-2.5 @[480px]:gap-3">
                <CustomTimePicker
                  label="Start Time"
                  placeholder="09:00 AM"
                  value={shift.startTime}
                  onChange={(val: string) => onShiftChange(idx, 'startTime', val)}
                />
                <CustomTimePicker
                  label="End Time"
                  placeholder="11:00 AM"
                  value={shift.endTime}
                  onChange={(val: string) => onShiftChange(idx, 'endTime', val)}
                />
              </div>
            </div>
          ))}

          {/* Add Shift Button */}
          <button
            type="button"
            onClick={onAddShift}
            className="w-full py-2.5 px-3 rounded-xl border border-dashed theme-border hover:border-[var(--accent-main)]/60 theme-bg-surface/50 hover:theme-bg-accent-soft/20 theme-text-secondary hover:theme-accent text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer shadow-2xs active:scale-[0.99]"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Add Shift</span>
          </button>
        </div>
      </CustomInput>

      {/* ── Sub-Section 3: Interactive Day-by-Day Schedule & Study Gap Mapper ── */}
      <ExamDateMappingGrid
        startDate={startDate}
        endDate={endDate}
        scheduleDays={scheduleDays}
        shifts={shifts}
        onAddShift={onAddShift}
        onChange={onScheduleDaysChange}
        defaultExpanded={false}
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
