/**
 * SPR Note — useAcademicYears Data Hook
 * =======================================
 * Manages tenant-scoped Academic Years state, real-time sync,
 * metrics aggregation, and CRUD execution.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTenant } from '@/context/TenantContext';
import { useAcademicSession } from '@/context/AcademicSessionContext';
import { useToast } from '@/context/ToastContext';
import { academicYearsStore, getAcademicYearStatus } from '@/utils/localStore';
import { AcademicYear, AcademicYearMetrics } from '../types';

export function useAcademicYears() {
  const { activeTenantId } = useTenant();
  const { activeYear: globalActiveYear, setActiveYear } = useAcademicSession();
  const { showToast } = useToast();

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load from tenant-scoped store
  const loadData = useCallback(() => {
    try {
      setIsLoading(true);
      const data = (academicYearsStore.getAcademicYears(activeTenantId) as AcademicYear[]) || [];
      setAcademicYears(data);
    } catch (err) {
      console.error('Failed to load academic years:', err);
      showToast('Failed to load academic years.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [activeTenantId, showToast]);

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('spr_tenant_changed', handleUpdate);
    window.addEventListener('spr_academic_years_updated', handleUpdate);

    return () => {
      window.removeEventListener('spr_tenant_changed', handleUpdate);
      window.removeEventListener('spr_academic_years_updated', handleUpdate);
    };
  }, [loadData]);

  // Aggregate Metrics for Dashboard & Hub Tabs
  const metrics: AcademicYearMetrics = useMemo(() => {
    const totalTerms = academicYears.reduce((acc, y) => acc + (y.terms?.length || 0), 0);
    const activeYear =
      globalActiveYear ||
      academicYears.find((y) => getAcademicYearStatus(y.startDate, y.endDate) === 'ACTIVE');

    return {
      total_years: academicYears.length,
      active_year_name: activeYear ? activeYear.name : 'None',
      total_terms: totalTerms,
      avg_terms_per_year:
        academicYears.length > 0 ? (totalTerms / academicYears.length).toFixed(1) : 0,
    };
  }, [academicYears, globalActiveYear]);

  // Delete Academic Year
  const deleteAcademicYear = useCallback(
    (id: string, name: string) => {
      if (typeof window !== 'undefined' && window.confirm(`Are you sure you want to delete academic year "${name}"? All associated terms will be removed.`)) {
        academicYearsStore.deleteAcademicYear(activeTenantId, id);
        loadData();
        showToast(`Academic year "${name}" deleted successfully.`, 'info');
      }
    },
    [activeTenantId, loadData, showToast]
  );

  // Set active academic year
  const setAsActiveYear = useCallback(
    (year: AcademicYear) => {
      setActiveYear(year);
      showToast(`Set "${year.name}" as active academic session.`, 'success');
    },
    [setActiveYear, showToast]
  );

  return {
    academicYears,
    isLoading,
    metrics,
    globalActiveYear,
    loadData,
    deleteAcademicYear,
    setAsActiveYear,
  };
}
