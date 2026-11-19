/**
 * Exam Schedules & Routine Matrix Shared Utilities
 * 100% reusable, clean date helpers, time formatters, and shift presets.
 */

export const DAY_NAMES: readonly string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTH_NAMES: readonly string[] = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export interface ShiftPreset {
  name: string;
  startTime: string;
  endTime: string;
}

/**
 * Generate an array of YYYY-MM-DD strings between two dates (inclusive)
 */
export const generateDateRange = (startDateStr?: string | null, endDateStr?: string | null): string[] => {
  if (!startDateStr || !endDateStr) return [];
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [];

  const dates: string[] = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

/**
 * Format date string (YYYY-MM-DD) into readable day & date label (e.g. "Mon, 12 Oct 2026")
 */
export const formatDateLabel = (dateStr?: string | null): string => {
  if (!dateStr) return 'TBD';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  const dayName = DAY_NAMES[d.getDay()];
  const monthName = MONTH_NAMES[d.getMonth()];
  const dayNum = d.getDate();
  const year = d.getFullYear();
  return `${dayName}, ${dayNum} ${monthName} ${year}`;
};

/**
 * Format date string into short day & date label (e.g. "Mon, 12 Oct")
 */
export const formatShortDateLabel = (dateStr?: string | null): string => {
  if (!dateStr) return 'TBD';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  const dayName = DAY_NAMES[d.getDay()];
  const monthName = MONTH_NAMES[d.getMonth()];
  const dayNum = d.getDate();
  return `${dayName}, ${dayNum} ${monthName}`;
};

/**
 * Clean leading zeros from time strings (e.g. "09:00 AM" -> "9:00 AM")
 */
export const formatCleanTime = (t?: string | null): string => {
  if (!t) return '';
  return t.replace(/^0(\d:)/, '$1');
};

/**
 * Format a time range cleanly (e.g. "9:00 AM – 11:00 AM")
 */
export const formatCleanRange = (start?: string | null, end?: string | null): string => {
  if (!start || !end) return '';
  const s = formatCleanTime(start);
  const e = formatCleanTime(end);
  return `${s} – ${e}`;
};

/**
 * Standard shift presets for default creation and fallback
 */
export const DEFAULT_SHIFT_PRESETS: ShiftPreset[] = [
  { name: 'Shift 1', startTime: '09:00 AM', endTime: '11:00 AM' },
  { name: 'Shift 2', startTime: '11:30 AM', endTime: '01:30 PM' },
  { name: 'Shift 3', startTime: '02:00 PM', endTime: '04:00 PM' },
  { name: 'Shift 4', startTime: '04:30 PM', endTime: '06:30 PM' },
  { name: 'Shift 5', startTime: '07:00 PM', endTime: '09:00 PM' },
  { name: 'Shift 6', startTime: '09:30 PM', endTime: '11:30 PM' },
];
