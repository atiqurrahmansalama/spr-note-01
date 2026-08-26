/**
 * Enterprise Attendance Constants & Semantic Color System
 * Centralizes all attendance status definitions, metadata, and dynamic theme classes.
 * All styling is driven directly by global semantic design tokens in index.css.
 */

export const ATTENDANCE_STATUSES = {
  PRESENT: {
    id: "PRESENT",
    code: "P",
    label: "Present",
    textClass: "theme-success",
    bgClass: "theme-bg-success",
    bgSoftClass: "theme-bg-success-soft",
    borderClass: "theme-border-success",
    badgeClass: "theme-success-badge",
    btnClass: "theme-bg-success text-white shadow-xs",
    quickFillClass: "theme-success-badge hover:opacity-90",
    circleClass: "theme-success",
    kpiCardClass: "theme-bg-success-soft border theme-border-success",
    kpiTextClass: "theme-success",
  },
  LATE: {
    id: "LATE",
    code: "L",
    label: "Late",
    textClass: "theme-warning",
    bgClass: "theme-bg-warning",
    bgSoftClass: "theme-bg-warning-soft",
    borderClass: "theme-border-warning",
    badgeClass: "theme-warning-badge",
    btnClass: "theme-bg-warning text-black shadow-xs font-bold",
    quickFillClass: "theme-warning-badge hover:opacity-90",
    circleClass: "theme-bg-warning-soft theme-warning font-bold",
    kpiCardClass: "theme-bg-warning-soft border theme-border-warning",
    kpiTextClass: "theme-warning",
  },
  ABSENT: {
    id: "ABSENT",
    code: "A",
    label: "Absent",
    textClass: "theme-danger",
    bgClass: "theme-bg-danger",
    bgSoftClass: "theme-bg-danger-soft",
    borderClass: "theme-border-danger",
    badgeClass: "theme-danger-badge",
    btnClass: "theme-bg-danger text-white shadow-xs",
    quickFillClass: "theme-danger-badge hover:opacity-90",
    circleClass: "theme-danger",
    kpiCardClass: "theme-bg-danger-soft border theme-border-danger",
    kpiTextClass: "theme-danger",
  },
  ON_LEAVE: {
    id: "ON_LEAVE",
    code: "LV",
    label: "Leave",
    textClass: "theme-purple",
    bgClass: "theme-bg-purple",
    bgSoftClass: "theme-bg-purple-soft",
    borderClass: "theme-border-purple",
    badgeClass: "theme-purple-badge",
    btnClass: "theme-bg-purple text-white shadow-xs",
    quickFillClass: "theme-purple-badge hover:opacity-90",
    circleClass: "theme-bg-purple-soft theme-purple font-bold",
    kpiCardClass: "theme-bg-purple-soft border theme-border-purple",
    kpiTextClass: "theme-purple",
  },
  HOLIDAY_EXCUSED: {
    id: "HOLIDAY_EXCUSED",
    code: "HOL",
    label: "Holiday",
    textClass: "theme-neutral",
    bgClass: "theme-bg-neutral",
    bgSoftClass: "theme-bg-neutral-soft",
    borderClass: "theme-border-neutral",
    badgeClass: "theme-neutral-badge",
    btnClass: "theme-bg-neutral text-white shadow-xs",
    quickFillClass: "theme-neutral-badge hover:opacity-90",
    circleClass: "theme-bg-neutral-soft theme-neutral font-bold",
    kpiCardClass: "theme-bg-neutral-soft border theme-border-neutral",
    kpiTextClass: "theme-neutral",
  },
};

/**
 * Standard list of attendance statuses for button groups, filters, and rosters.
 */
export const ATTENDANCE_STATUS_LIST = [
  ATTENDANCE_STATUSES.PRESENT,
  ATTENDANCE_STATUSES.LATE,
  ATTENDANCE_STATUSES.ABSENT,
  ATTENDANCE_STATUSES.ON_LEAVE,
  ATTENDANCE_STATUSES.HOLIDAY_EXCUSED,
];

export const STATUS_CYCLE_LIST = [
  'PRESENT',
  'LATE',
  'ABSENT',
  'ON_LEAVE',
];

/**
 * Cycles to the next attendance status in order:
 * PRESENT -> LATE -> ABSENT -> ON_LEAVE -> [cleared/unmarked]
 */
export function cycleAttendanceStatus(currentStatus) {
  if (!currentStatus) return 'PRESENT';
  const idx = STATUS_CYCLE_LIST.indexOf(currentStatus);
  if (idx !== -1 && idx < STATUS_CYCLE_LIST.length - 1) {
    return STATUS_CYCLE_LIST[idx + 1];
  }
  return ''; // Cleared
}

/**
 * Retrieves full metadata for any given attendance status key safely.
 * Handles aliases like 'LEAVE' -> 'ON_LEAVE', 'HOLIDAY' -> 'HOLIDAY_EXCUSED'.
 */
export function getAttendanceStatusMeta(statusKey) {
  if (!statusKey) return ATTENDANCE_STATUSES.PRESENT;
  const norm = String(statusKey).toUpperCase().trim();
  if (norm === "LEAVE") return ATTENDANCE_STATUSES.ON_LEAVE;
  if (norm === "HOLIDAY") return ATTENDANCE_STATUSES.HOLIDAY_EXCUSED;
  return ATTENDANCE_STATUSES[norm] || ATTENDANCE_STATUSES.PRESENT;
}

/**
 * Resolves the dynamic semantic text color class for an attendance rate percentage.
 */
export function getAttendanceRateColor(rate) {
  const num = Number(rate) || 0;
  if (num >= 85) return "theme-success";
  if (num >= 70) return "theme-warning";
  return "theme-danger";
}
