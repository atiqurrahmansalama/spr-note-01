import React from 'react';
import {
  RefreshIcon,
  FilledCheckCircleIcon,
  FilledXCircleIcon,
  TimerIcon,
} from '../ui/Icons';
import { getHijriDateString } from '../../utils/hijriUtils';

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
  isLoading = false,
  emptyMessage = "No attendance records found for this class and period.",
}) {
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
    <div className="overflow-x-auto max-h-[75vh]">
      <table className="w-full text-left border-collapse text-[11px]">
        {/* Table Sticky Headers */}
        <thead className="sticky top-0 z-20 theme-bg-sub border-b theme-border shadow-xs select-none">
          <tr className="border-b theme-border text-center font-bold">
            {/* Sticky Roll No Header */}
            <th className="py-3 px-3 w-12 sticky left-0 z-30 theme-bg-sub border-r theme-border text-xs">
              Roll
            </th>

            {/* Sticky Student Name Header */}
            <th className="py-3 px-3 min-w-[150px] sticky left-12 z-30 theme-bg-sub border-r theme-border text-left text-xs">
              Student Name
            </th>

            {/* Dedicated Time & Period Schedule Header */}
            <th className="py-3 px-3 min-w-[170px] border-r theme-border text-left text-xs">
              <div className="flex items-center gap-1.5">
                <TimerIcon className="w-3.5 h-3.5 theme-accent" />
                <span>Time & Period</span>
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

              const isWeekend = d.is_weekend;
              const isHoliday = d.is_holiday;

              return (
                <th
                  key={d.date || d.day}
                  className={`py-3 px-1 min-w-[36px] sm:min-w-[42px] font-mono border-r theme-border transition-colors ${
                    isWeekend
                      ? 'bg-rose-400/[0.045] dark:bg-rose-400/[0.08] text-rose-500/80'
                      : isHoliday
                      ? 'theme-bg-accent-soft theme-accent'
                      : ''
                  }`}
                  title={d.holiday_title || `${d.weekday} - ${fullDateStr}${hijriDayNumber ? ` (Hijri: ${hijriDayNumber})` : ''}`}
                >
                  <div className="flex flex-col items-center justify-between min-h-[58px] py-0.5">
                    {/* Top Group: Gregorian & Hijri Dates */}
                    <div className="space-y-0.5">
                      <div className="font-bold text-sm sm:text-base tracking-tight leading-none theme-text-primary">
                        {d.day}
                      </div>

                      {isHijriEnabled && hijriDayNumber && (
                        <div className="text-[11px] sm:text-xs font-mono theme-accent font-semibold leading-none pt-0.5">
                          {hijriDayNumber}
                        </div>
                      )}
                    </div>

                    {/* Bottom: Weekday Name with clear spacing and subtle separator line */}
                    <div className="text-[10px] font-semibold uppercase opacity-60 leading-none mt-2.5 pt-1.5 border-t theme-border w-full text-center">
                      {d.weekday.slice(0, 2)}
                    </div>
                  </div>
                </th>
              );
            })}

            {/* Summary Metric Headers */}
            <th className="py-3 px-2 w-11 text-emerald-600/90 dark:text-emerald-400/90 border-l theme-border text-xs" title="Present">P</th>
            <th className="py-3 px-2 w-11 text-amber-600/90 dark:text-amber-400/90 text-xs" title="Late">L</th>
            <th className="py-3 px-2 w-11 text-rose-500/85 dark:text-rose-400/85 text-xs" title="Absent">A</th>
            <th className="py-3 px-2 w-20 sm:w-24 min-w-[76px] text-right pr-4 text-xs" title="Attendance Rate % (Excludes holidays)">Rate %</th>
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
                className={`border-b theme-border hover:theme-bg-elevated/40 transition-colors h-11 sm:h-12 ${
                  isFirstPeriodRow && idx > 0 ? "border-t border-t-[var(--border-color)]" : ""
                }`}
              >
                {/* Sticky Roll No (Merged across all periods for this student) */}
                {isFirstPeriodRow && (
                  <td
                    rowSpan={row.period_count || 1}
                    className="py-2.5 px-3 text-center font-bold font-mono sticky left-0 z-10 theme-bg-surface border-r border-b theme-border theme-text-primary align-middle"
                  >
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg font-bold font-mono shadow-xs">
                      {row.roll_number || '—'}
                    </span>
                  </td>
                )}

                {/* Sticky Student Name (Merged across all periods for this student) */}
                {isFirstPeriodRow && (
                  <td
                    rowSpan={row.period_count || 1}
                    onClick={() => onStudentClick && onStudentClick(row.student_id)}
                    className={`py-2.5 px-3 sticky left-12 z-10 theme-bg-surface border-r border-b theme-border align-middle ${
                      onStudentClick ? 'cursor-pointer hover:underline' : ''
                    }`}
                  >
                    <div className="font-bold theme-text-primary truncate max-w-[140px]" title={row.name}>
                      {row.name}
                    </div>
                    <div className="text-[10px] theme-text-secondary truncate max-w-[140px] mt-0.5">
                      {row.group_name || row.class_name}
                    </div>
                  </td>
                )}

                {/* Dedicated Time & Period Schedule Column */}
                <td className="py-2.5 px-3 border-r theme-border theme-bg-sub/30 min-w-[170px]">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-xs theme-text-primary">
                      {row.start_time || "--:--"} - {row.end_time || "--:--"}
                    </span>
                  </div>
                  <div className="text-[10px] theme-text-secondary font-medium truncate max-w-[155px] mt-0.5 flex items-center gap-1" title={row.period_name}>
                    <span className="truncate">{row.period_name || 'General Routine'}</span>
                  </div>
                  {row.teacher_name && (
                    <div className="text-[9px] theme-accent font-semibold truncate max-w-[155px] mt-0.5 flex items-center gap-1" title={`Teacher: ${row.teacher_name}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-main)] shrink-0"></span>
                      <span className="truncate">{row.teacher_name}</span>
                    </div>
                  )}
                </td>

                {/* Day Status Cells */}
                {matrixData.days_header.map((d) => {
                  const dateStr =
                    d.date ||
                    `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
                  const status = row.daily_statuses[d.date] || row.daily_statuses[d.day];
                  const isWeekend = d.is_weekend;
                  const isHoliday = d.is_holiday;
                  const isOffDay = isWeekend || isHoliday;

                  const canEditCell = isEditing && !isOffDay;

                  return (
                    <td
                      key={d.date || d.day}
                      onClick={() => {
                        if (canEditCell && onToggleCell) {
                          onToggleCell(row.student_id, dateStr, status, row.period_slot_id);
                        }
                      }}
                      className={`py-2 px-1 min-w-[36px] sm:min-w-[42px] text-center font-mono text-[10px] border-r theme-border transition-colors ${
                        isWeekend
                          ? 'bg-rose-400/[0.025] dark:bg-rose-400/[0.045]'
                          : ''
                      } ${
                        canEditCell
                          ? 'cursor-pointer select-none hover:theme-bg-elevated/80'
                          : isOffDay
                          ? 'cursor-default'
                          : 'cursor-default'
                      }`}
                      title={
                        isOffDay
                          ? `${d.holiday_title || (isWeekend ? 'Weekly Weekend' : 'Holiday')}: No Attendance`
                          : isEditing
                          ? `${dateStr} [${row.period_name}]: ${status || 'Unrecorded'} (Click to change)`
                          : `${dateStr} [${row.period_name}]: ${status || 'Unrecorded'}`
                      }
                    >
                      {status === 'PRESENT' ? (
                        <FilledCheckCircleIcon className="w-4.5 h-4.5 text-emerald-600/80 dark:text-emerald-400/85 hover:scale-125 active:scale-95 transition-transform inline-block drop-shadow-xs" />
                      ) : status === 'ABSENT' ? (
                        <FilledXCircleIcon className="w-4.5 h-4.5 text-rose-500/75 dark:text-rose-400/80 hover:scale-125 active:scale-95 transition-transform inline-block drop-shadow-xs" />
                      ) : status === 'LATE' ? (
                        <span className="inline-flex items-center justify-center w-4.5 h-4.5 rounded-full bg-amber-500/10 text-amber-600/85 dark:text-amber-400/85 font-bold text-[10px] hover:scale-125 active:scale-95 transition-transform">
                          L
                        </span>
                      ) : status === 'HALF_DAY' ? (
                        <span className="inline-flex items-center justify-center w-4.5 h-4.5 rounded-full bg-sky-500/10 text-sky-600/85 dark:text-sky-400/85 font-bold text-[10px]">
                          H
                        </span>
                      ) : status === 'ON_LEAVE' ? (
                        <span className="inline-flex items-center justify-center w-4.5 h-4.5 rounded-full bg-purple-500/10 text-purple-600/85 dark:text-purple-400/85 font-bold text-[10px]">
                          LV
                        </span>
                      ) : isOffDay ? (
                        <span className="opacity-35 font-mono text-xs select-none">—</span>
                      ) : canEditCell ? (
                        <span className="inline-block w-3.5 h-3.5 rounded-full border theme-border hover:border-[var(--accent-main)] hover:theme-bg-accent-soft transition-all"></span>
                      ) : (
                        <span className="opacity-25 font-mono text-xs select-none">·</span>
                      )}
                    </td>
                  );
                })}

                {/* Totals & Attendance Percentage */}
                <td className="py-2.5 px-1 text-center font-bold font-mono text-emerald-600/90 dark:text-emerald-400/90 border-l theme-border">
                  {row.totals.present}
                </td>
                <td className="py-2.5 px-1 text-center font-bold font-mono text-amber-600/90 dark:text-amber-400/90">
                  {row.totals.late}
                </td>
                <td className="py-2.5 px-1 text-center font-bold font-mono text-rose-500/85 dark:text-rose-400/85">
                  {row.totals.absent}
                </td>
                <td className="py-2.5 px-2 text-right pr-4 font-mono">
                  <span
                    className={`px-2 py-0.5 rounded-lg text-[10px] ${
                      rate >= 85
                        ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                        : rate >= 70
                        ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10'
                        : 'text-rose-600 dark:text-rose-400 bg-rose-500/10'
                    }`}
                  >
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
