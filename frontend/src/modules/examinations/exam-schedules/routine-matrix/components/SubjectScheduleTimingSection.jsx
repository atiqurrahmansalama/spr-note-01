import React from 'react';
import CustomInput from '../../../../../components/ui/CustomInput';
import CustomSelect from '../../../../../components/ui/CustomSelect';
import { CalendarIcon, ClockIcon } from '../../../../../components/ui/Icons';

/**
 * SubjectScheduleTimingSection
 * Handles Department Window Info Banner, Designated Examination Date, and Exam Shift Slot.
 * Streamlined Enterprise Section Headers (Zero Boxed Cards).
 */
export default function SubjectScheduleTimingSection({
  formData,
  setFormData,
  departmentSchedule = null,
  dateOptions = [],
  shiftOptions = [],
  handleShiftChange,
}) {
  return (
    <div className="space-y-3.5 text-left">
      <div className="flex items-center gap-2 pb-2 border-b theme-border">
        <CalendarIcon className="w-4 h-4 theme-accent shrink-0" />
        <h3 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
          Schedule & Time Slot
        </h3>
      </div>

      <div className="space-y-3.5 pt-1">
        {/* Department-Specific Schedule Window Banner (if active) */}
        {departmentSchedule && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl border border-[var(--accent-main)]/30 theme-bg-accent-soft text-xs theme-accent shadow-2xs">
            <CalendarIcon className="w-4 h-4 shrink-0" />
            <span>
              <strong className="font-bold">{departmentSchedule.departmentName || formData.departmentName}</strong> Department Window:{' '}
              <span className="font-mono font-bold">{departmentSchedule.startDate}</span> to{' '}
              <span className="font-mono font-bold">{departmentSchedule.endDate}</span>
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3.5">
          {dateOptions.length > 0 ? (
            <CustomSelect
              label="Designated Examination Date"
              value={formData.examDate}
              options={dateOptions}
              icon={CalendarIcon}
              onChange={(val) => setFormData((prev) => ({ ...prev, examDate: val }))}
              required
            />
          ) : (
            <CustomInput
              type="date"
              label="Examination Date"
              value={formData.examDate}
              onChange={(val) => setFormData((prev) => ({ ...prev, examDate: val }))}
              required
            />
          )}

          {shiftOptions.length > 0 ? (
            <CustomSelect
              label="Exam Shift"
              value={formData.shiftId}
              options={shiftOptions}
              icon={ClockIcon}
              onChange={handleShiftChange}
            />
          ) : (
            <CustomInput
              label="Shift Name"
              value={formData.shiftName || 'Shift 1 (Morning)'}
              onChange={(val) => setFormData((prev) => ({ ...prev, shiftName: val }))}
              icon={ClockIcon}
            />
          )}
        </div>
      </div>
    </div>
  );
}
