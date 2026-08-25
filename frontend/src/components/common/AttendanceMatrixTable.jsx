import React, { useRef, useEffect, useMemo } from 'react';
import {
  RefreshIcon,
  FilledCheckCircleIcon,
  FilledXCircleIcon,
  TimerIcon,
  AttendanceIcon,
} from '../ui/Icons';
import FullscreenButton from '../ui/FullscreenButton';
import { getHijriDateString } from '../../utils/hijriUtils';
import DateHeaderCell from './DateHeaderCell';
import {
  ATTENDANCE_STATUSES,
  getAttendanceRateColor,
} from '../../constants/attendanceConstants';

/**
 * Universal Attendance Matrix Table Component
 * Enterprise spreadsheet register supporting:
 * - Student Class Attendance (with multi-period schedule slots)
 * - Student Residential Attendance (with prayer & hostel checkpoints)
 * - Teacher Class Attendance (with assigned classes & subjects)
 * - Staff Daily Attendance (with departments & roles)
 */
export default function AttendanceMatrixTable({
  // Matrix data (Supports both legacy matrixData format and normalized props)
  matrixData,
  daysHeader: propDaysHeader,
  rows: propRows,

  // Column Labels & Config
  idLabel = 'Roll',
  nameLabel = 'Name',
  descriptorLabel = 'Time & Period',
  descriptorIcon: DescriptorIcon = TimerIcon,
  showDescriptor = true,

  // State & Interactivity
  isEditing = false,
  onToggleCell,
  isHijriEnabled = false,
  selectedYear,
  selectedMonth,
  onRowClick,
  onStudentClick,
  onDateClick,
  isLoading = false,
  emptyMessage = 'No attendance records found matching your filter criteria.',
  tableContainerClass = 'overflow-x-auto max-h-[75vh]',

  // Footer Legend Ribbon Config
  showFooter = true,
  totalCount,
  totalCountLabel,
  isFullscreen = false,
  onToggleFullscreen,
}) {
  const containerRef = useRef(null);

  // Enable Shift + Mouse Wheel Left-Right horizontal scroll
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e) => {
      if (e.shiftKey && e.deltaY !== 0) {
        el.scrollLeft += e.deltaY * 1.2;
        e.preventDefault();
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  // Normalize Days Header
  const daysHeader = propDaysHeader || matrixData?.days_header || [];

  // Normalize Rows
  const rows = propRows || matrixData?.students_matrix || [];

  // Calculate Overall Aggregate Attendance Metrics across all visible rows
  const summaryMetrics = useMemo(() => {
    let totalPresent = 0;
    let totalLate = 0;
    let totalAbsent = 0;
    let totalHalfDay = 0;
    let totalLeave = 0;

    rows.forEach((row) => {
      const daily = row.daily_statuses || row.records || {};
      Object.values(daily).forEach((status) => {
        const st = typeof status === 'object' ? status?.status : status;
        if (st === 'PRESENT') totalPresent += 1;
        else if (st === 'LATE') totalLate += 1;
        else if (st === 'ABSENT') totalAbsent += 1;
        else if (st === 'HALF_DAY') totalHalfDay += 1;
        else if (st === 'ON_LEAVE') totalLeave += 1;
      });
    });

    const attendedUnits = totalPresent + totalLate + totalHalfDay * 0.5;
    const totalMarked = totalPresent + totalLate + totalAbsent + totalHalfDay + totalLeave;
    const overallRate = totalMarked > 0 ? Math.round((attendedUnits / totalMarked) * 100) : 100;

    return {
      present: totalPresent,
      late: totalLate,
      absent: totalAbsent,
      halfDay: totalHalfDay,
      leave: totalLeave,
      rate: overallRate,
    };
  }, [rows]);

  if (isLoading) {
    return (
      <div className="p-16 text-center text-xs theme-text-secondary flex flex-col items-center justify-center gap-3">
        <RefreshIcon className="w-6 h-6 animate-spin theme-accent" />
        <span>Loading attendance matrix register...</span>
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <div className="p-16 text-center text-xs theme-text-secondary">
        {emptyMessage}
      </div>
    );
  }

  const handleRowClick = onRowClick || onStudentClick;
  const countDisplay = totalCount !== undefined ? totalCount : rows.length;
  const countLabelDisplay = totalCountLabel || `Total ${nameLabel}s`;

  return (
    <div className="flex flex-col h-full">
      <div ref={containerRef} className={`${tableContainerClass} scrollbar-none overflow-x-auto flex-1`}>
        <table className="w-full text-left border-separate border-spacing-0 text-[11px]">
          {/* Table Sticky Headers */}
          <thead className="sticky top-0 z-30 theme-bg-sub select-none">
            <tr className="text-center font-bold">
              {/* Sticky ID / Roll Header */}
              <th className="py-2.5 px-0.5 sm:px-1 w-[46px] min-w-[46px] max-w-[46px] sm:w-[56px] sm:min-w-[56px] sm:max-w-[56px] sticky left-0 z-40 theme-bg-sub border-r border-b theme-border text-xs text-center">
                {idLabel}
              </th>

              {/* Sticky Entity Name Header */}
              <th className="py-2.5 px-2 sm:px-2.5 w-[120px] min-w-[120px] max-w-[120px] sm:w-[150px] sm:min-w-[150px] sm:max-w-[150px] left-[46px] sm:left-[56px] sticky z-40 theme-bg-sub border-r border-b theme-border text-left text-xs shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_4px_-1px_rgba(0,0,0,0.25)]">
                {nameLabel}
              </th>

              {/* Dedicated Descriptor Header (Period, Checkpoint, Department) */}
              {showDescriptor && (
                <th className="py-2.5 px-1.5 sm:px-2 w-[100px] min-w-[100px] max-w-[100px] sm:w-[130px] sm:min-w-[130px] sm:max-w-[130px] border-r border-b theme-border text-left text-xs">
                  <div className="flex items-center gap-1">
                    <DescriptorIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
                    <span className="truncate">{descriptorLabel}</span>
                  </div>
                </th>
              )}

              {/* Dynamic Date Headers with 3 Lines (Gregorian Day -> Hijri -> Centered Weekday) */}
              {daysHeader.map((d) => {
                const fullDateStr =
                  d.date ||
                  (selectedYear && selectedMonth
                    ? `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
                    : String(d.day));

                return (
                  <DateHeaderCell
                    key={d.date || d.day}
                    as="th"
                    dateStr={fullDateStr}
                    dayNum={d.day}
                    weekday={d.weekday}
                    isHijriEnabled={isHijriEnabled}
                    hasEvent={Boolean(d.event_colors)}
                    eventColors={d.event_colors}
                    eventTitle={d.event_title || d.calendar_event?.title}
                    isHoliday={Boolean(d.is_holiday || d.is_disabled)}
                    holidayTitle={d.holiday_title}
                    onClick={() => onDateClick && onDateClick(d.date ? d.date : d)}
                    className="w-[32px] min-w-[32px] max-w-[32px] sm:w-[38px] sm:min-w-[38px] sm:max-w-[38px]"
                  />
                );
              })}

              {/* Summary Metric Headers with EXACT same width as date columns */}
              <th className={`py-2 sm:py-2.5 px-0.5 sm:px-1 w-[32px] min-w-[32px] max-w-[32px] sm:w-[38px] sm:min-w-[38px] sm:max-w-[38px] text-center font-bold ${ATTENDANCE_STATUSES.PRESENT.textClass} border-l border-b theme-border text-xs`} title="Present (P)">P</th>
              <th className={`py-2 sm:py-2.5 px-0.5 sm:px-1 w-[32px] min-w-[32px] max-w-[32px] sm:w-[38px] sm:min-w-[38px] sm:max-w-[38px] text-center font-bold ${ATTENDANCE_STATUSES.LATE.textClass} border-l border-b theme-border text-xs`} title="Late (L)">L</th>
              <th className={`py-2 sm:py-2.5 px-0.5 sm:px-1 w-[32px] min-w-[32px] max-w-[32px] sm:w-[38px] sm:min-w-[38px] sm:max-w-[38px] text-center font-bold ${ATTENDANCE_STATUSES.ABSENT.textClass} border-l border-b theme-border text-xs`} title="Absent (A)">A</th>
              <th className="py-2 sm:py-2.5 px-1 w-[46px] min-w-[46px] max-w-[46px] sm:w-[54px] sm:min-w-[54px] sm:max-w-[54px] text-center font-bold text-xs border-l border-r border-b theme-border" title="Attendance Rate %">Rate %</th>
            </tr>
          </thead>

          {/* Rows with Uniform Subtle Borders */}
          <tbody className="divide-y theme-border">
            {rows.map((row, idx) => {
              const rowId = row.id || row.student_id;
              const rollVal = row.roll_number || row.employee_id || row.code || '—';
              const nameVal = row.name || row.student_name || row.user_name || 'Member';
              const subVal = row.group_name || row.class_name || row.designation || row.sub_title;
              const descMain = row.start_time ? `${row.start_time} - ${row.end_time || '--:--'}` : row.department_name || row.assigned_class_name || row.schedule_time || row.checkpoint_name;
              const descSub = row.period_name || row.checkpoint_time || row.role_title;
              const descExtra = row.teacher_name;

              const totals = row.totals || {};
              let pCount = totals.present !== undefined ? totals.present : totals.present_count;
              let lCount = totals.late !== undefined ? totals.late : totals.late_count;
              let aCount = totals.absent !== undefined ? totals.absent : totals.absent_count;
              let rate = totals.attendance_rate !== undefined ? totals.attendance_rate : totals.rate;

              if (pCount === undefined || aCount === undefined) {
                let p = 0, l = 0, a = 0, hd = 0, lv = 0;
                const daily = row.daily_statuses || row.records || {};
                Object.values(daily).forEach((status) => {
                  const st = typeof status === 'object' ? status?.status : status;
                  if (st === 'PRESENT') p += 1;
                  else if (st === 'LATE') l += 1;
                  else if (st === 'ABSENT') a += 1;
                  else if (st === 'HALF_DAY') hd += 1;
                  else if (st === 'ON_LEAVE') lv += 1;
                });
                pCount = p;
                lCount = l;
                aCount = a;
                const total = p + l + a + hd + lv;
                const effective = p + l + hd * 0.5;
                rate = total > 0 ? Math.round((effective / total) * 100) : 100;
              }

              const slotCount = row.period_count || row.checkpoint_count || 1;
              const slotIndex = row.period_index !== undefined ? row.period_index : row.checkpoint_index || 0;
              const isFirstSlotRow = slotIndex === 0;

              return (
                <tr
                  key={row.row_key || `${rowId}_${row.period_slot_id || row.checkpoint_id || idx}`}
                  className={`hover:theme-bg-elevated/40 transition-colors h-11 sm:h-12 ${
                    idx % 2 === 1 ? 'theme-bg-sub/20' : ''
                  }`}
                >
                  {/* Sticky ID / Roll (Merged across all slots for this entity) */}
                  {isFirstSlotRow && (
                    <td
                      rowSpan={slotCount}
                      className="py-2 px-0.5 sm:px-1 w-[46px] min-w-[46px] max-w-[46px] sm:w-[56px] sm:min-w-[56px] sm:max-w-[56px] text-center font-bold font-mono sticky left-0 z-20 theme-bg-surface border-r border-b theme-border theme-text-primary align-middle"
                    >
                      <span className="inline-flex items-center justify-center font-bold font-mono text-xs">
                        {rollVal}
                      </span>
                    </td>
                  )}

                  {/* Sticky Name (Merged across all slots for this entity) */}
                  {isFirstSlotRow && (
                    <td
                      rowSpan={slotCount}
                      onClick={() => handleRowClick && handleRowClick(rowId)}
                      className={`py-2 px-2 sm:px-2.5 w-[120px] min-w-[120px] max-w-[120px] sm:w-[150px] sm:min-w-[150px] sm:max-w-[150px] left-[46px] sm:left-[56px] sticky z-20 theme-bg-surface border-r border-b theme-border align-middle shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_4px_-1px_rgba(0,0,0,0.25)] ${
                        handleRowClick ? 'cursor-pointer hover:underline' : ''
                      }`}
                    >
                      <div className="font-bold text-xs theme-text-primary truncate max-w-[105px] sm:max-w-[135px]" title={nameVal}>
                        {nameVal}
                      </div>
                      {subVal && (
                        <div className="text-[10px] theme-text-secondary truncate max-w-[105px] sm:max-w-[135px] mt-0.5">
                          {subVal}
                        </div>
                      )}
                    </td>
                  )}

                  {/* Dedicated Descriptor Column (Period, Checkpoint, Department) */}
                  {showDescriptor && (
                    <td className="py-2 px-1.5 sm:px-2 border-r border-b theme-border theme-bg-sub/30 w-[100px] min-w-[100px] max-w-[100px] sm:w-[130px] sm:min-w-[130px] sm:max-w-[130px]">
                      {descMain && (
                        <div className="font-mono font-bold text-[11px] sm:text-xs theme-text-primary truncate">
                          {descMain}
                        </div>
                      )}
                      {descSub && (
                        <div className="text-[10px] theme-text-secondary font-medium truncate max-w-[90px] sm:max-w-[120px] mt-0.5" title={descSub}>
                          {descSub}
                        </div>
                      )}
                      {descExtra && (
                        <div className="text-[9px] theme-accent font-semibold truncate max-w-[90px] sm:max-w-[120px] mt-0.5" title={descExtra}>
                          {descExtra}
                        </div>
                      )}
                    </td>
                  )}

                  {/* Day Status Cells */}
                  {daysHeader.map((d) => {
                    const dateStr =
                      d.date ||
                      (selectedYear && selectedMonth
                        ? `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
                        : String(d.day));
                    const isHoliday = Boolean(d.is_holiday || d.is_disabled);

                    const dailyMap = row.daily_statuses || row.records || {};
                    const statusObj = dailyMap[d.date] || dailyMap[d.day] || dailyMap[dateStr];
                    const status = typeof statusObj === 'object' ? statusObj?.status : statusObj;

                    const hasEvent = Boolean(d.event_colors);
                    const eventTitle = d.event_title || d.calendar_event?.title || d.holiday_title;
                    const canEditCell = isEditing && !isHoliday;
                    const slotId = row.period_slot_id || row.checkpoint_id || 'main';

                    return (
                      <td
                        key={d.date || d.day}
                        onClick={() => {
                          if (canEditCell && onToggleCell) {
                            onToggleCell(rowId, dateStr, status, slotId);
                          }
                        }}
                        className={`py-2 px-0.5 sm:px-1 w-[32px] min-w-[32px] max-w-[32px] sm:w-[38px] sm:min-w-[38px] sm:max-w-[38px] text-center font-mono text-[10px] border-r border-b theme-border transition-colors ${
                          hasEvent
                            ? `${d.event_colors.bg} ${d.event_colors.text}`
                            : isHoliday
                            ? 'select-none bg-zinc-500/[0.04] dark:bg-zinc-400/[0.04] opacity-60'
                            : ''
                        } ${
                          canEditCell
                            ? 'cursor-pointer select-none hover:brightness-95'
                            : isEditing && isHoliday
                            ? 'cursor-not-allowed select-none'
                            : 'cursor-default select-none'
                        }`}
                        title={
                          eventTitle
                            ? `${eventTitle} [${dateStr}] (Attendance Disabled)`
                            : isHoliday
                            ? `${d.holiday_title || 'Scheduled Holiday'} (Attendance Disabled)`
                            : isEditing
                            ? `${dateStr} [${nameVal}]: ${status || 'Unrecorded'} (Click to toggle)`
                            : `${dateStr} [${nameVal}]: ${status || 'Unrecorded'}`
                        }
                      >
                        {isHoliday ? (
                          <span className={`text-[9px] opacity-30 font-bold select-none ${isEditing ? 'cursor-not-allowed' : 'cursor-default'}`}>--</span>
                        ) : status === 'PRESENT' ? (
                          <FilledCheckCircleIcon className={`w-4 h-4 ${ATTENDANCE_STATUSES.PRESENT.circleClass} hover:scale-125 active:scale-95 transition-transform inline-block drop-shadow-xs`} />
                        ) : status === 'ABSENT' ? (
                          <FilledXCircleIcon className={`w-4 h-4 ${ATTENDANCE_STATUSES.ABSENT.circleClass} hover:scale-125 active:scale-95 transition-transform inline-block drop-shadow-xs`} />
                        ) : status === 'LATE' ? (
                          <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full ${ATTENDANCE_STATUSES.LATE.circleClass} text-[10px] hover:scale-125 active:scale-95 transition-transform`}>
                            L
                          </span>
                        ) : status === 'HALF_DAY' ? (
                          <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full ${ATTENDANCE_STATUSES.HALF_DAY.circleClass} text-[10px]`}>
                            H
                          </span>
                        ) : status === 'ON_LEAVE' ? (
                          <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full ${ATTENDANCE_STATUSES.ON_LEAVE.circleClass} text-[10px]`}>
                            LV
                          </span>
                        ) : canEditCell ? (
                          <span className="inline-block w-3.5 h-3.5 rounded-md border border-dashed theme-border hover:border-[var(--accent-main)] hover:theme-bg-accent-soft transition-all opacity-70 hover:opacity-100" title="Click to mark Present" />
                        ) : (
                          <span className="opacity-35 font-mono text-xs select-none theme-text-secondary">—</span>
                        )}
                      </td>
                    );
                  })}

                  {/* Totals & Attendance Percentage */}
                  <td className={`py-2 sm:py-2.5 px-0.5 sm:px-1 w-[32px] min-w-[32px] max-w-[32px] sm:w-[38px] sm:min-w-[38px] sm:max-w-[38px] text-center font-bold font-mono ${ATTENDANCE_STATUSES.PRESENT.textClass} border-l border-b theme-border`}>
                    {pCount}
                  </td>
                  <td className={`py-2 sm:py-2.5 px-0.5 sm:px-1 w-[32px] min-w-[32px] max-w-[32px] sm:w-[38px] sm:min-w-[38px] sm:max-w-[38px] text-center font-bold font-mono ${ATTENDANCE_STATUSES.LATE.textClass} border-l border-b theme-border`}>
                    {lCount}
                  </td>
                  <td className={`py-2 sm:py-2.5 px-0.5 sm:px-1 w-[32px] min-w-[32px] max-w-[32px] sm:w-[38px] sm:min-w-[38px] sm:max-w-[38px] text-center font-bold font-mono ${ATTENDANCE_STATUSES.ABSENT.textClass} border-l border-b theme-border`}>
                    {aCount}
                  </td>
                  <td className="py-2 sm:py-2.5 px-1 w-[46px] min-w-[46px] max-w-[46px] sm:w-[54px] sm:min-w-[54px] sm:max-w-[54px] text-center font-bold font-mono text-xs border-l border-r border-b theme-border">
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${getAttendanceRateColor(rate)}`}>
                      {rate}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Built-in Unified Legend Ribbon & Bottom Counter */}
      {showFooter && (
        <div className="p-3 sm:p-3.5 border-t theme-border theme-bg-sub flex flex-wrap items-center justify-between gap-3 text-[11px] theme-text-secondary shrink-0 select-none">
          {/* Left: Status Badges Legend */}
          <div className="flex items-center gap-3 sm:gap-3.5 flex-wrap font-mono">
            <span className="flex items-center gap-1.5">
              <FilledCheckCircleIcon className={`w-3.5 h-3.5 ${ATTENDANCE_STATUSES.PRESENT.circleClass}`} /> Present
            </span>
            <span className="flex items-center gap-1.5">
              <FilledXCircleIcon className={`w-3.5 h-3.5 ${ATTENDANCE_STATUSES.ABSENT.circleClass}`} /> Absent
            </span>
            <span className="flex items-center gap-1.5">
              <span className={`w-3.5 h-3.5 rounded-full ${ATTENDANCE_STATUSES.LATE.circleClass} flex items-center justify-center text-[9px]`}>L</span> Late
            </span>
            <span className="flex items-center gap-1.5">
              <span className={`w-3.5 h-3.5 rounded-full ${ATTENDANCE_STATUSES.HALF_DAY.circleClass} flex items-center justify-center text-[9px]`}>H</span> Half Day
            </span>
            <span className="flex items-center gap-1.5">
              <span className={`w-3.5 h-3.5 rounded-full ${ATTENDANCE_STATUSES.ON_LEAVE.circleClass} flex items-center justify-center text-[9px]`}>LV</span> Leave
            </span>
            <span className="flex items-center gap-1.5">
              <span className="opacity-35 font-mono text-xs">—</span> Unmarked
            </span>
          </div>

          {/* Right: Overall Aggregate Attendance Summary Metrics Banner */}
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap font-mono text-[11px]">
            <span>{countLabelDisplay}: <strong className="theme-text-primary">{countDisplay}</strong></span>
            <span>Present: <strong className="theme-accent">{summaryMetrics.present}</strong></span>
            <span>Late: <strong className="text-amber-500">{summaryMetrics.late}</strong></span>
            <span>Absent: <strong className="text-rose-500">{summaryMetrics.absent}</strong></span>
            <span>Attendance Rate: <strong className="theme-accent">{summaryMetrics.rate}%</strong></span>

            {onToggleFullscreen && (
              <FullscreenButton
                isFullscreen={isFullscreen}
                onToggle={onToggleFullscreen}
                className="ml-1"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Universal Take / Edit Attendance Mode Toggle Button Component
 * Reusable across Class Attendance, Residential Attendance, Teacher Attendance, and Staff Attendance.
 */
export function TakeAttendanceButton({
  isEditing = false,
  onToggle,
  activeLabel = 'Done Marking',
  inactiveLabel = 'Take Attendance',
  size = 'md',
  className = '',
  title,
  disabled = false,
  ...rest
}) {
  if (!onToggle) return null;

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-xl',
    md: 'px-3.5 sm:px-4 py-2 text-xs font-semibold gap-1.5 rounded-xl',
    lg: 'px-4 py-2.5 text-sm font-bold gap-2 rounded-xl',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-4.5 h-4.5',
  };

  const defaultTitle = isEditing
    ? 'Finish taking attendance and exit editing mode'
    : 'Enter interactive attendance taking and editing mode';

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`inline-flex items-center justify-center transition-all cursor-pointer select-none shadow-xs active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
        isEditing
          ? 'theme-bg-accent theme-accent-text hover:opacity-90 ring-2 ring-[var(--accent-main)]/40 shadow-sm'
          : 'theme-bg-accent theme-accent-text hover:opacity-90'
      } ${sizeClasses[size] || sizeClasses.md} ${className}`}
      title={title || defaultTitle}
      aria-label={isEditing ? activeLabel : inactiveLabel}
      {...rest}
    >
      {isEditing ? (
        <>
          <FilledCheckCircleIcon className={`${iconSizes[size] || iconSizes.md} shrink-0 drop-shadow-xs`} />
          <span>{activeLabel}</span>
        </>
      ) : (
        <>
          <AttendanceIcon className={`${iconSizes[size] || iconSizes.md} shrink-0`} />
          <span>{inactiveLabel}</span>
        </>
      )}
    </button>
  );
}

// Compound component attachment
AttendanceMatrixTable.TakeButton = TakeAttendanceButton;
AttendanceMatrixTable.TakeAttendanceButton = TakeAttendanceButton;
