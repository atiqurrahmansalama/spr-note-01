import React, { useState, useEffect, useMemo } from 'react';
import CustomInput from '../ui/CustomInput';
import CustomSelect from '../ui/CustomSelect';
import { DrawerContainer } from '../layout';
import { calculateLateDelayMinutes, minutesToTimeString, timeStringToMinutes } from '../../utils/attendanceTimingEngine';
import { ATTENDANCE_STATUSES } from '../../constants/attendanceConstants';
import { CheckIcon, ClockIcon } from '../ui/Icons';

/**
 * Enterprise Admin Attendance Editor Drawer
 * Allows privileged administrators to override attendance status, adjust in-time / arrival time,
 * view live late delay minutes, set approved leave, and save remarks.
 */
export default function AdminAttendanceDrawer({
  personName = '',
  personSubtitle = '',
  dateStr = '',
  scheduledStartTime = '',
  initialStatus = 'PRESENT',
  initialInTime = '',
  initialRemarks = '',
  onSave,
  onClose,
}) {
  const [status, setStatus] = useState(initialStatus || 'PRESENT');
  const [inTime, setInTime] = useState(initialInTime || scheduledStartTime || '08:00');
  const [remarks, setRemarks] = useState(initialRemarks || '');

  // Calculate live late delay minutes
  const lateDelay = useMemo(() => {
    if (status !== 'LATE' && status !== 'PRESENT') return 0;
    return calculateLateDelayMinutes(scheduledStartTime, inTime);
  }, [scheduledStartTime, inTime, status]);

  const STATUS_OPTIONS = [
    { value: 'PRESENT', label: 'Present (On-Time)', description: 'Full presence recorded' },
    { value: 'LATE', label: 'Late Arrival', description: 'Arrived after scheduled start' },
    { value: 'ABSENT', label: 'Absent', description: 'Unexcused / Missing session' },
    { value: 'ON_LEAVE', label: 'Approved Leave (On Leave)', description: 'Authorized institutional leave (Admin only)' },
  ];

  const handleSave = () => {
    if (onSave) {
      onSave({
        status,
        in_time: (status === 'PRESENT' || status === 'LATE') ? inTime : null,
        late_minutes: lateDelay,
        remarks,
      });
    }
  };

  return (
    <DrawerContainer padding="normal" spacing="normal">
      <div className="space-y-4 text-left">
        {/* Person & Date Summary Banner */}
        <div className="p-3.5 rounded-2xl theme-bg-sub/80 border theme-border space-y-1">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold theme-text-primary truncate">{personName || 'Student / Staff'}</h4>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md theme-bg-elevated theme-accent border theme-border">
              {dateStr}
            </span>
          </div>
          {personSubtitle && (
            <p className="text-xs theme-text-secondary truncate">{personSubtitle}</p>
          )}
          {scheduledStartTime && (
            <div className="text-[11px] theme-text-secondary flex items-center gap-1.5 pt-1">
              <ClockIcon className="w-3.5 h-3.5 theme-accent" />
              <span>Scheduled Session Start: <strong>{scheduledStartTime}</strong></span>
            </div>
          )}
        </div>

        {/* Status Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
            Attendance Status *
          </label>
          <div className="grid grid-cols-2 gap-2">
            {STATUS_OPTIONS.map((opt) => {
              const isSelected = status === opt.value;
              const meta = ATTENDANCE_STATUSES[opt.value] || {};
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer select-none ${
                    isSelected
                      ? 'theme-bg-accent-soft theme-accent border-[var(--accent-main)] shadow-xs ring-1 ring-[var(--accent-main)]/30'
                      : 'theme-bg-surface theme-border hover:theme-bg-sub/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold theme-text-primary">{opt.label}</span>
                    {isSelected && <CheckIcon className="w-4 h-4 theme-accent" />}
                  </div>
                  <p className="text-[10px] theme-text-secondary line-clamp-1">{opt.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Arrival Time Input (Only when Present or Late) */}
        {(status === 'PRESENT' || status === 'LATE') && (
          <div className="space-y-2 p-3.5 rounded-2xl border theme-border theme-bg-surface animate-fade-in">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider theme-text-primary flex items-center gap-1.5">
                <ClockIcon className="w-4 h-4 theme-accent" />
                Actual Arrival Time (In-Time)
              </label>
              {lateDelay > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md theme-bg-warning-soft theme-warning border border-[var(--warning-main,#f59e0b)]/30">
                  {lateDelay} mins late
                </span>
              )}
            </div>

            <CustomInput
              type="time"
              value={inTime}
              onChange={(val) => setInTime(val)}
              placeholder="HH:MM"
            />
          </div>
        )}

        {/* Remarks Input */}
        <div className="space-y-1">
          <CustomInput
            type="textarea"
            label="Administrative Remarks / Notes"
            value={remarks}
            onChange={(val) => setRemarks(val)}
            placeholder="e.g. Arrived late with guardian slip / Approved sick leave..."
            rows={3}
          />
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t theme-border flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border theme-border text-xs font-bold theme-text-secondary hover:theme-bg-sub cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl theme-bg-accent theme-accent-text text-xs font-bold hover:opacity-90 shadow-sm cursor-pointer"
          >
            Save Changes
          </button>
        </div>
      </div>
    </DrawerContainer>
  );
}
