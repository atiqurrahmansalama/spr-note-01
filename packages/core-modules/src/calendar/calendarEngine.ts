/**
 * Calendar Domain Resolution Engine
 * =================================
 * Pure calculation logic for calendar day matrix, date formatting,
 * and event occurrence resolution.
 */

import { CalendarEvent, UserPersonalTask } from './types';

/**
 * Checks if a given event occurs on a specific target date string (YYYY-MM-DD).
 */
export function isEventOnDate(event: CalendarEvent, targetDateStr: string): boolean {
  if (!event || !targetDateStr) return false;

  // Single date check
  if (event.startDate === targetDateStr) return true;

  // Range check
  if (event.startDate && event.endDate) {
    if (targetDateStr >= event.startDate && targetDateStr <= event.endDate) {
      return true;
    }
  }

  // Recurring weekly check
  if (event.repeats && Array.isArray(event.repeatDays) && event.repeatDays.length > 0) {
    const targetDate = new Date(targetDateStr + 'T00:00:00Z');
    const dayOfWeek = targetDate.getUTCDay(); // 0 = Sun, 1 = Mon ...
    if (event.repeatDays.includes(dayOfWeek)) {
      if (!event.startDate || targetDateStr >= event.startDate) {
        if (!event.endDate || targetDateStr <= event.endDate) {
          // Check exceptions
          if (event.exceptions && event.exceptions.includes(targetDateStr)) {
            return false;
          }
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Filters tasks scheduled for a specific date (YYYY-MM-DD).
 */
export function getTasksForDate(tasks: UserPersonalTask[], targetDateStr: string): UserPersonalTask[] {
  if (!Array.isArray(tasks) || !targetDateStr) return [];
  return tasks.filter((t) => t.dueDate === targetDateStr);
}

/**
 * Formats a 24-hour time string ("14:30") into a clean 12-hour formatted time ("2:30 PM").
 */
export function formatTime12H(timeStr?: string): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;

  let hour = parseInt(parts[0], 10);
  const minutes = parts[1];
  if (isNaN(hour)) return timeStr;

  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  hour = hour ? hour : 12; // 0 hour should be 12
  return `${hour}:${minutes} ${ampm}`;
}

/**
 * Generates an array of all days in a given year and month (0-indexed month: 0=Jan, 11=Dec).
 */
export function getMonthDaysMatrix(year: number, monthIndex: number): string[] {
  const dates: string[] = [];
  const date = new Date(Date.UTC(year, monthIndex, 1));
  while (date.getUTCMonth() === monthIndex) {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return dates;
}
