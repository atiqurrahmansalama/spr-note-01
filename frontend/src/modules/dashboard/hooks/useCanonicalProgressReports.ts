import { useMemo, useCallback } from 'react';
import { useTenant } from '../../../context/TenantContext';
import { useAcademicData } from '../../../hooks/useAcademicData';
import { useProgressReportsData } from '../../learning/daily-classroom/progress-management/progress-reports/hooks/useProgressReportsData';
import type { ReportItem } from '../../learning/daily-classroom/progress-management/progress-reports/types';

/**
 * Enterprise Canonical Progress Reports Hook (Rule 10: Single Source of Truth)
 * Reuses the authoritative useProgressReportsData hook directly from Progress Management.
 * Guarantees 100% mathematical, normalization, and deduplication parity across Progress Reports
 * and all Dashboard recitation widgets.
 */
export function useCanonicalProgressReports(): {
  reports: ReportItem[];
  loading: boolean;
  refresh: () => void;
} {
  const { activeTenantId } = useTenant();
  const academicData = useAcademicData();

  const silentToast = useCallback(() => {}, []);

  const { reportsList, loading, handleRefresh } = useProgressReportsData({
    activeTenantId,
    academicData,
    showToast: silentToast,
  });

  return useMemo(
    () => ({
      reports: reportsList,
      loading,
      refresh: handleRefresh,
    }),
    [reportsList, loading, handleRefresh]
  );
}

export default useCanonicalProgressReports;
