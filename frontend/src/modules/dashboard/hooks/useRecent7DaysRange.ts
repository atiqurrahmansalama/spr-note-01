import { useMemo } from 'react';

export interface Recent7DaysRange {
  startDate: string;
  endDate: string;
}

/**
 * Enterprise Canonical Hook: Computes the 7-day chronological window
 * based on the latest available data in the report set (or today if empty).
 * Guarantees 100% synchronization across all dashboard recitation widgets.
 */
export function useRecent7DaysRange(reports: any[] = []): Recent7DaysRange {
  return useMemo(() => {
    let anchorEnd = new Date();

    if (reports && reports.length > 0) {
      let maxDateStr = '';
      for (const r of reports) {
        const d = r.isoDateOnly || r.report_date || r.date || '';
        if (d && String(d).substring(0, 10) > maxDateStr) {
          maxDateStr = String(d).substring(0, 10);
        }
      }
      if (maxDateStr) {
        const [y, m, d] = maxDateStr.split('-').map(Number);
        const maxDate = new Date(y, m - 1, d);
        const diffDays = Math.round((anchorEnd.getTime() - maxDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 7) {
          anchorEnd = maxDate;
        }
      }
    }

    const anchorStart = new Date(anchorEnd);
    anchorStart.setDate(anchorEnd.getDate() - 6); // 7 days inclusive

    const formatISO = (dt: Date) => {
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const day = String(dt.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    return {
      startDate: formatISO(anchorStart),
      endDate: formatISO(anchorEnd),
    };
  }, [reports]);
}

export default useRecent7DaysRange;
