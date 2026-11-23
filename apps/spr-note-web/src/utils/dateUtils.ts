/**
 * Date and Time Formatting Utilities
 * ===================================
 * Enterprise utilities for formatting database ISO timestamps and raw dates
 * into clean, readable, localized strings.
 */

/**
 * Formats a raw timestamp or date string into clean date & time format.
 * Examples:
 * - "2026-10-05T22:25:30.916719+06:00" -> "Oct 05, 2026, 10:25 PM"
 * - "2024-01-15T09:00:00Z" -> "Jan 15, 2024, 09:00 AM"
 * - "2024-01-15" -> "Jan 15, 2024"
 * - "Enrolled" -> "Enrolled"
 */
export function formatDisplayDateTime(rawDate?: string | number | Date | null, fallback = '—'): string {
  if (!rawDate) return fallback;
  if (typeof rawDate === 'string' && isNaN(Date.parse(rawDate))) {
    return rawDate;
  }
  try {
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return String(rawDate);

    const isDateOnly = typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDate.trim());
    if (isDateOnly) {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      }).format(d);
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return String(rawDate);
  }
}

/**
 * Formats a raw date or timestamp into a date-only format (e.g. "Oct 05, 2026").
 */
export function formatDisplayDate(rawDate?: string | number | Date | null, fallback = '—'): string {
  if (!rawDate) return fallback;
  if (typeof rawDate === 'string' && isNaN(Date.parse(rawDate))) {
    return rawDate;
  }
  try {
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return String(rawDate);

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch {
    return String(rawDate);
  }
}
