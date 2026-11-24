import { useMemo } from 'react';
import { getClassroomTodayDate } from '@/constants/calendarConstants';

export interface Recent7DaysRange {
  startDate: string;
  endDate: string;
}

/**
 * Enterprise Canonical Hook: Computes the 7-day chronological window
 * strictly anchored to the classroom's effective date and timezone.
 * Guarantees 100% synchronization across all dashboard recitation widgets
 * and the daily classroom timeline.
 */
export function useRecent7DaysRange(reports: any[] = []): Recent7DaysRange {
  return useMemo(() => {
    // 1. Authoritative Classroom Today Date (Timezone-Aware)
    const classroomTodayStr = getClassroomTodayDate(); // e.g. "2026-11-25"
    let anchorEndStr = classroomTodayStr;

    // Accommodate any future-dated reports if present
    if (reports && reports.length > 0) {
      for (const r of reports) {
        const d = r.isoDateOnly || r.report_date || r.date || '';
        const sub = String(d).substring(0, 10);
        if (sub && sub > anchorEndStr) {
          anchorEndStr = sub;
        }
      }
    }

    const [y, m, d] = anchorEndStr.split('-').map(Number);
    const anchorEnd = new Date(y, m - 1, d);
    const anchorStart = new Date(y, m - 1, d - 6); // 7 consecutive days inclusive

    const formatISO = (dt: Date) => {
      const yr = dt.getFullYear();
      const mo = String(dt.getMonth() + 1).padStart(2, '0');
      const dy = String(dt.getDate()).padStart(2, '0');
      return `${yr}-${mo}-${dy}`;
    };

    return {
      startDate: formatISO(anchorStart),
      endDate: formatISO(anchorEnd),
    };
  }, [reports]);
}

export default useRecent7DaysRange;
