import React, { useRef, useEffect, useMemo, memo, useCallback } from 'react';
import {
  RefreshIcon,
  FilledCheckCircleIcon,
  FilledXCircleIcon,
  TimerIcon,
  AttendanceIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  TimelineIcon,
} from '../ui/Icons';
import FullscreenButton from '../ui/FullscreenButton';
import DateHeaderCell from './DateHeaderCell';
import {
  ATTENDANCE_STATUSES,
  getAttendanceRateColor,
} from '../../constants/attendanceConstants';

export interface DayHeaderItem {
  date?: string;
  day?: number | string;
  month?: number;
  year?: number;
  weekday?: string | number;
  is_weekend?: boolean;
  is_holiday?: boolean;
  is_disabled?: boolean;
  holiday_title?: string;
  calendar_event?: any;
  event_title?: string;
  event_color?: string;
  event_colors?: any;
  [key: string]: any;
}

export interface AttendanceRowTotals {
  present?: number;
  late?: number;
  absent?: number;
  half_day?: number;
  on_leave?: number;
  leave_count?: number;
  present_count?: number;
  late_count?: number;
  absent_count?: number;
  holiday_excused?: number;
  total_recorded?: number;
  attendance_rate?: number;
  rate?: number;
}

export interface AttendanceRowItem {
  id?: string | number;
  student_id?: string | number;
  user_id?: string | number;
  roll_number?: string | number;
  employee_id?: string | number;
  code?: string | number;
  name?: string;
  student_name?: string;
  user_name?: string;
  group_name?: string;
  class_name?: string;
  designation?: string;
  sub_title?: string;
  start_time?: string;
  end_time?: string;
  schedule_time?: string;
  department_name?: string;
  assigned_class_name?: string;
  checkpoint_name?: string;
  checkpoint_time?: string;
  period_name?: string;
  name_display?: string;
  role_title?: string;
  teacher_name?: string;
  warden_name?: string;
  period_count?: number;
  checkpoint_count?: number;
  period_index?: number;
  checkpoint_index?: number;
  period_slot_id?: string | number;
  checkpoint_id?: string | number;
  row_key?: string;
  daily_statuses?: Record<string, any>;
  records?: Record<string, any>;
  totals?: AttendanceRowTotals;
  [key: string]: any;
}

export interface AttendanceTableProps {
  matrixData?: any;
  daysHeader?: DayHeaderItem[];
  rows?: AttendanceRowItem[];
  idLabel?: string;
  nameLabel?: string;
  descriptorLabel?: string;
  descriptorIcon?: React.ComponentType<{ className?: string }>;
  showDescriptor?: boolean;
  isEditing?: boolean;
  onToggleCell?: ((studentId: string | number, date: string, currentStatus?: string, slotId?: string | number) => void) | null;
  onAdminEditCell?: ((row: AttendanceRowItem, date: string, status?: string, slotId?: string | number) => void) | null;
  onInspectHistory?: ((row: AttendanceRowItem) => void) | null;
  isHijriEnabled?: boolean;
  selectedYear?: number | null;
  selectedMonth?: number | null;
  onRowClick?: ((id: string | number) => void) | null;
  onStudentClick?: ((id: string | number) => void) | null;
  onDateClick?: ((date: string) => void) | null;
  isLoading?: boolean;
  emptyMessage?: string;
  tableContainerClass?: string;
  showFooter?: boolean;
  totalCount?: number;
  totalCountLabel?: string;
  calculationBaselineDate?: string | null;
  calculationBaselineLabel?: string;
  isFullscreen?: boolean;
  onToggleFullscreen?: (() => void) | null;
}

/**
 * Individual memoized Attendance Cell for zero-lag high volume spreadsheet rendering
 */
interface AttendanceCellProps {
  dateStr: string;
  dayHeader: DayHeaderItem;
  row: AttendanceRowItem;
  rowId: string | number;
  isEditing: boolean;
  onToggleCell: AttendanceTableProps['onToggleCell'];
  onAdminEditCell: AttendanceTableProps['onAdminEditCell'];
  nameVal: string;
}

const AttendanceCell = memo(function AttendanceCell({
  dateStr,
  dayHeader,
  row,
  rowId,
  isEditing,
  onToggleCell,
  onAdminEditCell,
  nameVal,
}: AttendanceCellProps) {
  const isHoliday = Boolean(dayHeader.is_holiday || dayHeader.is_disabled);
  const dailyMap = row.daily_statuses || row.records || {};
  const statusObj = dailyMap[dayHeader.date as string] || dailyMap[dayHeader.day as number] || dailyMap[dateStr];
  const status = typeof statusObj === 'object' ? statusObj?.status : statusObj;

  const hasEvent = Boolean(dayHeader.event_colors);
  const eventTitle = dayHeader.event_title || dayHeader.calendar_event?.title || dayHeader.holiday_title;
  const canEditCell = isEditing && !isHoliday;
  const slotId = row.period_slot_id || row.checkpoint_id || 'main';

  const handleClick = useCallback(() => {
    if (canEditCell && onToggleCell) {
      onToggleCell(rowId, dateStr, status, slotId);
    }
  }, [canEditCell, onToggleCell, rowId, dateStr, status, slotId]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (onAdminEditCell && !isHoliday) {
      e.preventDefault();
      onAdminEditCell(row, dateStr, status, slotId);
    }
  }, [onAdminEditCell, isHoliday, row, dateStr, status, slotId]);

  const titleText = eventTitle
    ? `${eventTitle} [${dateStr}] (Attendance Disabled)`
    : isHoliday
    ? `${dayHeader.holiday_title || 'Scheduled Holiday'} (Attendance Disabled)`
    : isEditing
    ? `${dateStr} [${nameVal}]: ${status || 'Unrecorded'} (Click to cycle / Right-click to edit details)`
    : onAdminEditCell
    ? `${dateStr} [${nameVal}]: ${status || 'Unrecorded'} (Right-click or click to edit)`
    : `${dateStr} [${nameVal}]: ${status || 'Unrecorded'}`;

  return (
    <td
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      className={`py-2 px-0.5 sm:px-1 w-[32px] min-w-[32px] max-w-[32px] sm:w-[38px] sm:min-w-[38px] sm:max-w-[38px] text-center font-mono text-[10px] border-r border-b theme-border transition-colors ${
        hasEvent
          ? `${dayHeader.event_colors.bg} ${dayHeader.event_colors.text}`
          : isHoliday
          ? 'select-none bg-zinc-500/[0.04] dark:bg-zinc-400/[0.04] opacity-60'
          : ''
      } ${
        canEditCell
          ? 'cursor-pointer select-none hover:brightness-95'
          : isEditing && isHoliday
          ? 'cursor-not-allowed select-none'
          : onAdminEditCell
          ? 'cursor-pointer select-none hover:brightness-95'
          : 'cursor-default select-none'
      }`}
      title={titleText}
    >
      {isHoliday ? (
        <span className={`text-[9px] opacity-30 font-bold select-none ${isEditing ? 'cursor-not-allowed' : 'cursor-default'}`}>--</span>
      ) : status === 'PRESENT' ? (
        <FilledCheckCircleIcon className={`w-4 h-4 ${ATTENDANCE_STATUSES.PRESENT.circleClass} hover:scale-125 active:scale-95 transition-transform inline-block drop-shadow-xs`} />
      ) : status === 'ABSENT' ? (
        <FilledXCircleIcon className={`w-4 h-4 ${ATTENDANCE_STATUSES.ABSENT.circleClass} hover:scale-125 active:scale-95 transition-transform inline-block drop-shadow-xs`} />
      ) : status === 'LATE' ? (
        <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full ${ATTENDANCE_STATUSES.LATE.circleClass} text-[10px] hover:scale-125 active:scale-95 transition-transform font-bold`}>
          L
        </span>
      ) : status === 'ON_LEAVE' || status === 'LEAVE' ? (
        <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full ${ATTENDANCE_STATUSES.ON_LEAVE.circleClass} text-[10px] font-bold`}>
          LV
        </span>
      ) : canEditCell ? (
        <span className="inline-block w-3.5 h-3.5 rounded-md border border-dashed theme-border hover:border-[var(--accent-main)] hover:theme-bg-accent-soft transition-all opacity-70 hover:opacity-100" title="Click to mark Attendance" />
      ) : (
        <span className="opacity-35 font-mono text-xs select-none theme-text-secondary">—</span>
      )}
    </td>
  );
});

/**
 * Individual memoized Attendance Row component to prevent cascading full-table re-renders
 */
interface AttendanceRowProps {
  row: AttendanceRowItem;
  idx: number;
  daysHeader: DayHeaderItem[];
  selectedYear: number | null;
  selectedMonth: number | null;
  showDescriptor: boolean;
  isEditing: boolean;
  onToggleCell: AttendanceTableProps['onToggleCell'];
  onAdminEditCell: AttendanceTableProps['onAdminEditCell'];
  onInspectHistory: AttendanceTableProps['onInspectHistory'];
  handleRowClick: ((id: string | number) => void) | null;
}

const AttendanceRow = memo(function AttendanceRow({
  row,
  idx,
  daysHeader,
  selectedYear,
  selectedMonth,
  showDescriptor,
  isEditing,
  onToggleCell,
  onAdminEditCell,
  onInspectHistory,
  handleRowClick,
}: AttendanceRowProps) {
  const rowId = row.id || row.student_id || idx;
  const rollVal = row.roll_number || row.employee_id || row.code || '—';
  const nameVal = row.name || row.student_name || row.user_name || 'Member';
  const subVal = row.group_name || row.class_name || row.designation || row.sub_title;
  const descMain = row.start_time
    ? `${row.start_time} - ${row.end_time || '--:--'}`
    : row.schedule_time || row.department_name || row.assigned_class_name || row.checkpoint_name || '';
  const descSub = row.checkpoint_time || row.period_name || row.name_display || row.role_title || '';
  const descExtra = row.teacher_name || (row.warden_name ? `Warden: ${row.warden_name}` : '');

  const totals = row.totals || {};
  let pCount = totals.present !== undefined ? totals.present : totals.present_count;
  let lCount = totals.late !== undefined ? totals.late : totals.late_count;
  let aCount = totals.absent !== undefined ? totals.absent : totals.absent_count;
  let lvCount = totals.on_leave !== undefined ? totals.on_leave : totals.leave_count;
  let rate = totals.attendance_rate !== undefined ? totals.attendance_rate : totals.rate;

  if (pCount === undefined || aCount === undefined) {
    let p = 0, l = 0, a = 0, lv = 0;
    const daily = row.daily_statuses || row.records || {};
    Object.values(daily).forEach((status) => {
      const st = typeof status === 'object' ? status?.status : status;
      if (st === 'PRESENT') p += 1;
      else if (st === 'LATE') l += 1;
      else if (st === 'ABSENT') a += 1;
      else if (st === 'ON_LEAVE' || st === 'LEAVE') lv += 1;
    });
    pCount = p;
    lCount = l;
    aCount = a;
    lvCount = lv;
    const total = p + l + a + lv;
    const effective = p + l;
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
          <div className="flex items-center justify-between gap-1 group/desc">
            <div className="font-mono font-bold text-[11px] sm:text-xs theme-text-primary truncate min-w-0 flex-1">
              {descMain || '—'}
            </div>

            {onInspectHistory && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onInspectHistory(row);
                }}
                className="p-0.5 rounded text-zinc-400 hover:theme-accent hover:theme-bg-sub/60 transition-colors opacity-70 group-hover/desc:opacity-100 shrink-0 cursor-pointer"
                title="Inspect schedule timeline & evolution"
                aria-label="Inspect History"
              >
                <TimelineIcon className="w-3 h-3" />
              </button>
            )}
          </div>

          {descSub && (
            <div className="text-[10px] theme-text-secondary font-medium truncate max-w-[95px] sm:max-w-[125px] mt-0.5" title={descSub}>
              {descSub}
            </div>
          )}

          {descExtra && (
            <div className="text-[9px] theme-accent font-semibold truncate max-w-[95px] sm:max-w-[125px] mt-0.5" title={descExtra}>
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

        return (
          <AttendanceCell
            key={d.date || d.day || dateStr}
            dateStr={dateStr}
            dayHeader={d}
            row={row}
            rowId={rowId}
            isEditing={isEditing}
            onToggleCell={onToggleCell}
            onAdminEditCell={onAdminEditCell}
            nameVal={nameVal}
          />
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
      <td className={`py-2 sm:py-2.5 px-0.5 sm:px-1 w-[32px] min-w-[32px] max-w-[32px] sm:w-[38px] sm:min-w-[38px] sm:max-w-[38px] text-center font-bold font-mono ${ATTENDANCE_STATUSES.ON_LEAVE.textClass} border-l border-b theme-border`}>
        {lvCount ?? 0}
      </td>
      <td className="py-2 sm:py-2.5 px-1 w-[46px] min-w-[46px] max-w-[46px] sm:w-[54px] sm:min-w-[54px] sm:max-w-[54px] text-center font-bold font-mono text-xs border-l border-r border-b theme-border">
        <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${getAttendanceRateColor(rate)}`}>
          {rate}%
        </span>
      </td>
    </tr>
  );
});

/**
 * Universal Attendance Table Component (formerly AttendanceMatrixTable)
 * High-performance enterprise spreadsheet register supporting:
 * - Student Class Attendance (with multi-period schedule slots)
 * - Student Residential Attendance (with prayer & hostel checkpoints)
 * - Teacher Class Attendance (with assigned classes & subjects)
 * - Staff Daily Attendance (with departments & roles)
 */
function AttendanceTable({
  matrixData = null,
  daysHeader: propDaysHeader = [],
  rows: propRows = [],
  idLabel = 'Roll',
  nameLabel = 'Name',
  descriptorLabel = 'Time & Period',
  descriptorIcon: DescriptorIcon = TimerIcon,
  showDescriptor = true,
  isEditing = false,
  onToggleCell = null,
  onAdminEditCell = null,
  onInspectHistory = null,
  isHijriEnabled = false,
  selectedYear = null,
  selectedMonth = null,
  onRowClick = null,
  onStudentClick = null,
  onDateClick = null,
  isLoading = false,
  emptyMessage = 'No attendance records found matching your filter criteria.',
  tableContainerClass = 'overflow-x-auto max-h-[75vh]',
  showFooter = true,
  totalCount = 0,
  totalCountLabel = '',
  calculationBaselineDate = null,
  calculationBaselineLabel = 'Calculated Since',
  isFullscreen = false,
  onToggleFullscreen = null,
}: AttendanceTableProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Enable Shift + Mouse Wheel Left-Right horizontal scroll
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.shiftKey && e.deltaY !== 0) {
        el.scrollLeft += e.deltaY * 1.2;
        e.preventDefault();
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  // Normalize Days Header
  const daysHeader = useMemo(() => {
    return propDaysHeader && propDaysHeader.length > 0 ? propDaysHeader : matrixData?.days_header || [];
  }, [propDaysHeader, matrixData?.days_header]);

  // Normalize Rows
  const rows = useMemo(() => {
    return propRows && propRows.length > 0 ? propRows : matrixData?.students_matrix || [];
  }, [propRows, matrixData?.students_matrix]);

  // Calculate Overall Aggregate Attendance Metrics across all visible rows
  const summaryMetrics = useMemo(() => {
    let totalPresent = 0;
    let totalLate = 0;
    let totalAbsent = 0;
    let totalLeave = 0;

    rows.forEach((row: AttendanceRowItem) => {
      const daily = row.daily_statuses || row.records || {};
      Object.values(daily).forEach((status) => {
        const st = typeof status === 'object' ? status?.status : status;
        if (st === 'PRESENT') totalPresent += 1;
        else if (st === 'LATE') totalLate += 1;
        else if (st === 'ABSENT') totalAbsent += 1;
        else if (st === 'ON_LEAVE' || st === 'LEAVE') totalLeave += 1;
      });
    });

    const attendedUnits = totalPresent + totalLate;
    const totalMarked = totalPresent + totalLate + totalAbsent + totalLeave;
    const overallRate = totalMarked > 0 ? Math.round((attendedUnits / totalMarked) * 100) : 100;

    return {
      present: totalPresent,
      late: totalLate,
      absent: totalAbsent,
      leave: totalLeave,
      rate: overallRate,
    };
  }, [rows]);

  const handleRowClick = onRowClick || onStudentClick;
  const countDisplay = totalCount !== undefined && totalCount > 0 ? totalCount : rows.length;
  const countLabelDisplay = totalCountLabel || `Total ${nameLabel}s`;

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

  return (
    <div className="flex flex-col h-full select-none">
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

              {/* Dynamic Date Headers */}
              {daysHeader.map((d) => {
                const fullDateStr =
                  d.date ||
                  (selectedYear && selectedMonth
                    ? `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
                    : String(d.day));

                return (
                  <DateHeaderCell
                    key={d.date || d.day || fullDateStr}
                    as="th"
                    dayData={d}
                    dateStr={fullDateStr}
                    dayNum={d.day}
                    weekday={d.weekday}
                    isHijriEnabled={isHijriEnabled}
                    hasEvent={Boolean(d.event_colors)}
                    eventColors={d.event_colors}
                    eventTitle={d.event_title || d.calendar_event?.title}
                    isHoliday={Boolean(d.is_holiday || d.is_disabled)}
                    holidayTitle={d.holiday_title}
                    onClick={() => onDateClick && onDateClick(fullDateStr)}
                    className="w-[32px] min-w-[32px] max-w-[32px] sm:w-[38px] sm:min-w-[38px] sm:max-w-[38px]"
                  />
                );
              })}

              {/* Summary Metric Headers */}
              <th className={`py-2 sm:py-2.5 px-0.5 sm:px-1 w-[32px] min-w-[32px] max-w-[32px] sm:w-[38px] sm:min-w-[38px] sm:max-w-[38px] text-center font-bold ${ATTENDANCE_STATUSES.PRESENT.textClass} border-l border-b theme-border text-xs`} title="Present (P)">P</th>
              <th className={`py-2 sm:py-2.5 px-0.5 sm:px-1 w-[32px] min-w-[32px] max-w-[32px] sm:w-[38px] sm:min-w-[38px] sm:max-w-[38px] text-center font-bold ${ATTENDANCE_STATUSES.LATE.textClass} border-l border-b theme-border text-xs`} title="Late (L)">L</th>
              <th className={`py-2 sm:py-2.5 px-0.5 sm:px-1 w-[32px] min-w-[32px] max-w-[32px] sm:w-[38px] sm:min-w-[38px] sm:max-w-[38px] text-center font-bold ${ATTENDANCE_STATUSES.ABSENT.textClass} border-l border-b theme-border text-xs`} title="Absent (A)">A</th>
              <th className={`py-2 sm:py-2.5 px-0.5 sm:px-1 w-[32px] min-w-[32px] max-w-[32px] sm:w-[38px] sm:min-w-[38px] sm:max-w-[38px] text-center font-bold ${ATTENDANCE_STATUSES.ON_LEAVE.textClass} border-l border-b theme-border text-xs`} title="Leave (LV)">LV</th>
              <th className="py-2 sm:py-2.5 px-1 w-[46px] min-w-[46px] max-w-[46px] sm:w-[54px] sm:min-w-[54px] sm:max-w-[54px] text-center font-bold text-xs border-l border-r border-b theme-border" title="Attendance Rate %">Rate %</th>
            </tr>
          </thead>

          {/* Rows with Uniform Subtle Borders */}
          <tbody className="divide-y theme-border">
            {rows.map((row, idx) => (
              <AttendanceRow
                key={row.row_key || `${row.id || row.student_id || idx}_${row.period_slot_id || row.checkpoint_id || idx}`}
                row={row}
                idx={idx}
                daysHeader={daysHeader}
                selectedYear={selectedYear}
                selectedMonth={selectedMonth}
                showDescriptor={showDescriptor}
                isEditing={isEditing}
                onToggleCell={onToggleCell}
                onAdminEditCell={onAdminEditCell}
                onInspectHistory={onInspectHistory}
                handleRowClick={handleRowClick}
              />
            ))}
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
              <span className={`w-3.5 h-3.5 rounded-full ${ATTENDANCE_STATUSES.ON_LEAVE.circleClass} flex items-center justify-center text-[9px]`}>LV</span> Leave
            </span>
            <span className="flex items-center gap-1.5">
              <span className="opacity-35 font-mono text-xs">—</span> Unmarked
            </span>
          </div>

          {/* Right: Overall Aggregate Attendance Summary Metrics Banner */}
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap font-mono text-[11px]">
            {calculationBaselineDate && (
              <span className="theme-text-secondary border-r theme-border pr-3">
                {calculationBaselineLabel}: <strong className="theme-text-primary">{calculationBaselineDate}</strong>
              </span>
            )}
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
 * Universal Standalone Today Button Component
 */
export interface TodayButtonProps {
  onToday?: () => void;
  isToday?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  title?: string;
}

export function TodayButton({
  onToday,
  isToday = false,
  size = 'md',
  className = '',
  title = "Jump to Today's date",
}: TodayButtonProps) {
  if (!onToday) return null;
  const paddingClass = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs';
  const iconClass = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <button
      type="button"
      onClick={onToday}
      className={`flex items-center gap-1.5 rounded-xl border font-semibold transition-all shadow-xs select-none ${paddingClass} ${
        isToday
          ? 'theme-bg-accent-soft theme-accent border-[var(--accent-main)]/40 cursor-default'
          : 'theme-bg-sub hover:theme-bg-elevated border theme-border theme-text-secondary hover:theme-text-primary cursor-pointer active:scale-95'
      } ${className}`}
      title={title}
      aria-label="Go to Today"
    >
      <CalendarIcon className={`${iconClass} shrink-0`} />
      <span>Today</span>
    </button>
  );
}

/**
 * Universal Attendance Date Stepper Controls Component
 * Provides unified, theme-compliant prev/today/next navigation across all attendance registers.
 */
export interface AttendanceDateStepperProps {
  stepLabels?: { prev: string; next: string };
  onStepBackward?: () => void;
  onStepForward?: () => void;
  onToday?: () => void;
  isToday?: boolean;
  isAtMinBound?: boolean;
  isAtMaxBound?: boolean;
  minBoundTooltip?: string;
  maxBoundTooltip?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function AttendanceDateStepper({
  stepLabels = { prev: 'Prev Month', next: 'Next Month' },
  onStepBackward,
  onStepForward,
  onToday,
  isToday = false,
  isAtMinBound = false,
  isAtMaxBound = false,
  minBoundTooltip = 'Reached start of active Academic Year',
  maxBoundTooltip = 'Reached end of active Academic Year',
  className = '',
  size = 'md',
}: AttendanceDateStepperProps) {
  const prevTitle = isAtMinBound ? minBoundTooltip : (stepLabels?.prev || 'Previous');
  const nextTitle = isAtMaxBound ? maxBoundTooltip : (stepLabels?.next || 'Next');

  const paddingClass = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs';
  const iconClass = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <div className={`flex items-center gap-1.5 sm:gap-2 shrink-0 ${className}`}>
      {/* Previous Step Button */}
      <button
        type="button"
        onClick={onStepBackward}
        disabled={isAtMinBound}
        className={`flex items-center gap-1.5 rounded-xl border font-medium transition-all shadow-xs select-none ${paddingClass} ${
          isAtMinBound
            ? 'opacity-40 cursor-not-allowed theme-bg-sub theme-border theme-text-secondary'
            : 'theme-bg-sub hover:theme-bg-elevated border theme-border theme-text-secondary hover:theme-text-primary cursor-pointer active:scale-95'
        }`}
        title={prevTitle}
        aria-label={prevTitle}
      >
        <ChevronLeftIcon className={`${iconClass} shrink-0`} />
        <span>{stepLabels?.prev || 'Prev'}</span>
      </button>

      {/* Reusable Today Quick Button */}
      {onToday && (
        <button
          type="button"
          onClick={onToday}
          className={`flex items-center gap-1.5 rounded-xl border font-semibold transition-all shadow-xs select-none ${paddingClass} ${
            isToday
              ? 'theme-bg-accent-soft theme-accent border-[var(--accent-main)]/40 cursor-default'
              : 'theme-bg-sub hover:theme-bg-elevated border theme-border theme-text-secondary hover:theme-text-primary cursor-pointer active:scale-95'
          }`}
          title="Jump to Today's date"
          aria-label="Go to Today"
        >
          <CalendarIcon className={`${iconClass} shrink-0`} />
          <span>Today</span>
        </button>
      )}

      {/* Next Step Button */}
      <button
        type="button"
        onClick={onStepForward}
        disabled={isAtMaxBound}
        className={`flex items-center gap-1.5 rounded-xl border font-medium transition-all shadow-xs select-none ${paddingClass} ${
          isAtMaxBound
            ? 'opacity-40 cursor-not-allowed theme-bg-sub theme-border theme-text-secondary'
            : 'theme-bg-sub hover:theme-bg-elevated border theme-border theme-text-secondary hover:theme-text-primary cursor-pointer active:scale-95'
        }`}
        title={nextTitle}
        aria-label={nextTitle}
      >
        <span>{stepLabels?.next || 'Next'}</span>
        <ChevronRightIcon className={`${iconClass} shrink-0`} />
      </button>
    </div>
  );
}

/**
 * Universal Take / Edit Attendance Mode Toggle Button Component
 * Reusable across Class Attendance, Residential Attendance, Teacher Attendance, and Staff Attendance.
 */
export interface TakeAttendanceButtonProps {
  isEditing?: boolean;
  onToggle?: () => void;
  activeLabel?: string;
  inactiveLabel?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  title?: string;
  disabled?: boolean;
  [key: string]: any;
}

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
}: TakeAttendanceButtonProps) {
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

const MemoizedAttendanceTable = memo(AttendanceTable) as typeof AttendanceTable & {
  TodayButton: typeof TodayButton;
  TakeButton: typeof TakeAttendanceButton;
  TakeAttendanceButton: typeof TakeAttendanceButton;
  DateStepper: typeof AttendanceDateStepper;
  AttendanceDateStepper: typeof AttendanceDateStepper;
};

// Compound component attachments
MemoizedAttendanceTable.TodayButton = TodayButton;
MemoizedAttendanceTable.TakeButton = TakeAttendanceButton;
MemoizedAttendanceTable.TakeAttendanceButton = TakeAttendanceButton;
MemoizedAttendanceTable.DateStepper = AttendanceDateStepper;
MemoizedAttendanceTable.AttendanceDateStepper = AttendanceDateStepper;

// Alias export for backward compatibility
export const AttendanceMatrixTable = MemoizedAttendanceTable;

export default MemoizedAttendanceTable;
