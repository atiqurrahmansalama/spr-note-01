import React, { useRef, useEffect } from 'react';
import {
  RefreshIcon,
  FilledCheckCircleIcon,
  FilledXCircleIcon,
  TimerIcon,
} from '../ui/Icons';
import { getHijriDateString } from '../../utils/hijriUtils';
import {
  ATTENDANCE_STATUSES,
  getAttendanceRateColor,
} from '../../constants/attendanceConstants';

/**
 * Reusable Attendance Matrix Table Component
 * Displays a multi-day spreadsheet register with sticky roll/name, dedicated Time & Period column,
 * multi-period rows per student, uniform subtle borders matching the theme, and interactive cell editing.
 */
export default function AttendanceMatrixTable({
  matrixData,
  isEditing = false,
  onToggleCell,
  isHijriEnabled = false,
  selectedYear,
  selectedMonth,
  onStudentClick,
  onDateClick,
  isLoading = false,
  emptyMessage = "No attendance records found for this class and period.",
  tableContainerClass = "overflow-x-auto max-h-[75vh]",
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

  if (isLoading) {
    return (
      <div className="p-16 text-center text-xs theme-text-secondary flex flex-col items-center justify-center gap-3">
        <RefreshIcon className="w-6 h-6 animate-spin theme-accent" />
        <span>Generating attendance matrix register...</span>
      </div>
    );
  }

  if (!matrixData || !matrixData.students_matrix || matrixData.students_matrix.length === 0) {
    return (
      <div className="p-16 text-center text-xs theme-text-secondary">
        {emptyMessage}
      </div>
    );
  }

  const hasMultiplePeriods = matrixData.period_count > 1 || matrixData.students_matrix.some(r => r.period_count > 1);

  return (
    <div ref={containerRef} className={`${tableContainerClass} scrollbar-none overflow-x-auto`}>
      <table className="w-full text-left border-separate border-spacing-0 text-[11px]">
        {/* Table Sticky Headers */}
        <thead className="sticky top-0 z-30 theme-bg-sub select-none">
          <tr className="text-center font-bold">
            {/* Sticky Roll No Header */}
            <th className="py-2.5 px-0.5 sm:px-1 w-[36px] min-w-[36px] max-w-[36px] sm:w-[42px] sm:min-w-[42px] sm:max-w-[42px] sticky left-0 z-40 theme-bg-sub border-r border-b theme-border text-xs text-center">
              Roll
            </th>

            {/* Sticky Student Name Header */}
            <th className="py-2.5 px-2 sm:px-2.5 w-[110px] min-w-[110px] max-w-[110px] sm:w-[140px] sm:min-w-[140px] sm:max-w-[140px] left-[36px] sm:left-[42px] sticky z-40 theme-bg-sub border-r border-b theme-border text-left text-xs shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_4px_-1px_rgba(0,0,0,0.25)]">
              Student Name
            </th>

            {/* Dedicated Time & Period Schedule Header */}
            <th className="py-2.5 px-1.5 sm:px-2 w-[100px] min-w-[100px] max-w-[100px] sm:w-[125px] sm:min-w-[125px] sm:max-w-[125px] border-r border-b theme-border text-left text-xs">
              <div className="flex items-center gap-1">
                <TimerIcon className="w-3 h-3 theme-accent shrink-0" />
                <span className="truncate">Time & Period</span>
              </div>
            </th>

            {/* Dynamic Date Headers with 3 Lines (Day -> Hijri -> Weekday) */}
            {matrixData.days_header.map((d) => {
              const fullDateStr =
                d.date ||
                `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
              const hijriDayNumber = isHijriEnabled
                ? getHijriDateString(fullDateStr).split(' ')[0]
                : null;

              const isHoliday = Boolean(d.is_holiday);
              const hasEvent = Boolean(d.event_colors);
              const eventTitle = d.event_title || d.calendar_event?.title || d.holiday_title;

              return (
                <th
                  key={d.date || d.day}
                  onClick={() => onDateClick && onDateClick(d)}
                  className={`py-2 sm:py-2.5 px-0.5 sm:px-1 w-[32px] min-w-[32px] max-w-[32px] sm:w-[38px] sm:min-w-[38px] sm:max-w-[38px] font-mono border-r border-b theme-border transition-colors cursor-pointer hover:brightness-95 select-none ${
                    hasEvent
                      ? `${d.event_colors.bg} ${d.event_colors.text} font-bold`
                      : isHoliday
                      ? 'theme-bg-accent-soft theme-accent'
                      : ''
                  }`}
                  title={
                    eventTitle
                      ? `${eventTitle} [${fullDateStr}] - Click to view schedule & tasks`
                      : d.holiday_title
                      ? `${d.holiday_title} [${fullDateStr}] - Click to view schedule`
                      : `${d.weekday} - ${fullDateStr}${hijriDayNumber ? ` (Hijri: ${hijriDayNumber})` : ''} - Click to view day agenda`
                  }
                >
                  <div className="flex flex-col items-center justify-between min-h-[50px] sm:min-h-[56px] py-0.5">
                    {/* Top Group: Gregorian & Hijri Dates */}
                    <div className="space-y-0.5 flex flex-col items-center">
                      <div className={`font-bold text-xs sm:text-sm tracking-tight leading-none ${hasEvent ? d.event_colors.text : 'theme-text-primary'}`}>
                        {d.day}
                      </div>

                      {isHijriEnabled && hijriDayNumber && (
                        <div className="text-[9px] sm:text-[10px] font-mono theme-accent font-semibold leading-none pt-0.5">
                          {hijriDayNumber}
                        </div>
                      )}

                      {hasEvent && (
                        <span className={`w-1 h-1 rounded-full mt-0.5 shrink-0 ${d.event_colors.dot}`} />
                      )}
                    </div>

                    {/* Bottom: Weekday Name with clear spacing and subtle separator line */}
                    <div className="text-[8px] sm:text-[9px] font-semibold uppercase opacity-60 leading-none mt-1.5 sm:mt-2 pt-1 border-t theme-border w-full text-center">
                      {d.weekday.slice(0, 2)}
                    </div>
                  </div>
                </th>
              );
            })}

            {/* Summary Metric Headers with EXACT same width as date columns */}
            <th className={`py-2 sm:py-2.5 px-0.5 sm:px-1 w-[32px] min-w-[32px] max-w-[32px] sm:w-[38px] sm:min-w-[38px] sm:max-w-[38px] text-center font-bold ${ATTENDANCE_STATUSES.PRESENT.textClass} border-l border-b theme-border text-xs`} title="Present">P</th>
            <th className={`py-2 sm:py-2.5 px-0.5 sm:px-1 w-[32px] min-w-[32px] max-w-[32px] sm:w-[38px] sm:min-w-[38px] sm:max-w-[38px] text-center font-bold ${ATTENDANCE_STATUSES.LATE.textClass} border-l border-b theme-border text-xs`} title="Late">L</th>
            <th className={`py-2 sm:py-2.5 px-0.5 sm:px-1 w-[32px] min-w-[32px] max-w-[32px] sm:w-[38px] sm:min-w-[38px] sm:max-w-[38px] text-center font-bold ${ATTENDANCE_STATUSES.ABSENT.textClass} border-l border-b theme-border text-xs`} title="Absent">A</th>
            <th className="py-2 sm:py-2.5 px-1 w-[46px] min-w-[46px] max-w-[46px] sm:w-[54px] sm:min-w-[54px] sm:max-w-[54px] text-center font-bold text-xs border-l border-r border-b theme-border" title="Attendance Rate % (Excludes holidays)">Rate %</th>
          </tr>
        </thead>

        {/* Student Rows with Uniform Subtle Borders */}
        <tbody>
          {matrixData.students_matrix.map((row, idx) => {
            const rate = row.totals.attendance_rate;
            const isFirstPeriodRow = !row.period_index || row.period_index === 0;

            return (
              <tr
                key={row.row_key || `${row.student_id}_${row.period_slot_id || idx}`}
                className="hover:theme-bg-elevated/40 transition-colors h-11 sm:h-12"
              >
                {/* Sticky Roll No (Merged across all periods for this student) */}
                {isFirstPeriodRow && (
                  <td
                    rowSpan={row.period_count || 1}
                    className="py-2 px-0.5 sm:px-1 w-[36px] min-w-[36px] max-w-[36px] sm:w-[42px] sm:min-w-[42px] sm:max-w-[42px] text-center font-bold font-mono sticky left-0 z-20 theme-bg-surface border-r border-b theme-border theme-text-primary align-middle"
                  >
                    <span className="inline-flex items-center justify-center font-bold font-mono text-xs">
                      {row.roll_number || '—'}
                    </span>
                  </td>
                )}

                {/* Sticky Student Name (Merged across all periods for this student) */}
                {isFirstPeriodRow && (
                  <td
                    rowSpan={row.period_count || 1}
                    onClick={() => onStudentClick && onStudentClick(row.student_id)}
                    className={`py-2 px-2 sm:px-2.5 w-[110px] min-w-[110px] max-w-[110px] sm:w-[140px] sm:min-w-[140px] sm:max-w-[140px] left-[36px] sm:left-[42px] sticky z-20 theme-bg-surface border-r border-b theme-border align-middle shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_4px_-1px_rgba(0,0,0,0.25)] ${
                      onStudentClick ? 'cursor-pointer hover:underline' : ''
                    }`}
                  >
                    <div className="font-bold text-xs theme-text-primary truncate max-w-[95px] sm:max-w-[125px]" title={row.name}>
                      {row.name}
                    </div>
                    <div className="text-[10px] theme-text-secondary truncate max-w-[95px] sm:max-w-[125px] mt-0.5">
                      {row.group_name || row.class_name}
                    </div>
                  </td>
                )}

                {/* Dedicated Time & Period Schedule Column */}
                <td className="py-2 px-1.5 sm:px-2 border-r border-b theme-border theme-bg-sub/30 w-[100px] min-w-[100px] max-w-[100px] sm:w-[125px] sm:min-w-[125px] sm:max-w-[125px]">
                  <div className="flex items-center gap-1">
                    <span className="font-mono font-bold text-[11px] sm:text-xs theme-text-primary truncate">
                      {row.start_time || "--:--"} - {row.end_time || "--:--"}
                    </span>
                  </div>
                  <div className="text-[10px] theme-text-secondary font-medium truncate max-w-[90px] sm:max-w-[115px] mt-0.5" title={row.period_name}>
                    <span className="truncate">{row.period_name || 'General Routine'}</span>
                  </div>
                  {row.teacher_name && (
                    <div className="text-[9px] theme-accent font-semibold truncate max-w-[90px] sm:max-w-[115px] mt-0.5" title={`Teacher: ${row.teacher_name}`}>
                      <span className="truncate">{row.teacher_name}</span>
                    </div>
                  )}
                </td>

                {/* Day Status Cells (Driven dynamically from semantic status tokens and event colors) */}
                {matrixData.days_header.map((d) => {
                  const dateStr =
                    d.date ||
                    `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
                  const isHoliday = Boolean(d.is_holiday || d.is_disabled);
                  const status = isHoliday ? null : (row.daily_statuses[d.date] || row.daily_statuses[d.day]);
                  const hasEvent = Boolean(d.event_colors);
                  const eventTitle = d.event_title || d.calendar_event?.title || d.holiday_title;

                  const canEditCell = isEditing && !isHoliday;

                  return (
                    <td
                      key={d.date || d.day}
                      onClick={() => {
                        if (canEditCell && onToggleCell) {
                          onToggleCell(row.student_id, dateStr, status, row.period_slot_id);
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
                          ? `${dateStr} [${row.period_name}]: ${status || 'Unrecorded'} (Click to change)`
                          : `${dateStr} [${row.period_name}]: ${status || 'Unrecorded'}`
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
                        <span className="inline-block w-3.5 h-3.5 rounded-md border border-dashed theme-border hover:border-[var(--accent-main)] hover:theme-bg-accent-soft transition-all opacity-70 hover:opacity-100" title="Click to mark Present"></span>
                      ) : (
                        <span className="opacity-35 font-mono text-xs select-none theme-text-secondary">—</span>
                      )}
                    </td>
                  );
                })}

                {/* Totals & Attendance Percentage with EXACT matching widths */}
                <td className={`py-2 sm:py-2.5 px-0.5 sm:px-1 w-[32px] min-w-[32px] max-w-[32px] sm:w-[38px] sm:min-w-[38px] sm:max-w-[38px] text-center font-bold font-mono ${ATTENDANCE_STATUSES.PRESENT.textClass} border-l border-b theme-border`}>
                  {row.totals.present}
                </td>
                <td className={`py-2 sm:py-2.5 px-0.5 sm:px-1 w-[32px] min-w-[32px] max-w-[32px] sm:w-[38px] sm:min-w-[38px] sm:max-w-[38px] text-center font-bold font-mono ${ATTENDANCE_STATUSES.LATE.textClass} border-l border-b theme-border`}>
                  {row.totals.late}
                </td>
                <td className={`py-2 sm:py-2.5 px-0.5 sm:px-1 w-[32px] min-w-[32px] max-w-[32px] sm:w-[38px] sm:min-w-[38px] sm:max-w-[38px] text-center font-bold font-mono ${ATTENDANCE_STATUSES.ABSENT.textClass} border-l border-b theme-border`}>
                  {row.totals.absent}
                </td>
                <td className="py-2 sm:py-2.5 px-1 w-[46px] min-w-[46px] max-w-[46px] sm:w-[54px] sm:min-w-[54px] sm:max-w-[54px] text-center font-bold font-mono text-xs border-l border-r border-b theme-border">
                  <span className={getAttendanceRateColor(rate)}>
                    {rate}%
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
