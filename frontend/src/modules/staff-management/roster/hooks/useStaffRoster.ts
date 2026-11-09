import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/context/ToastContext';
import { useTenant } from '@/context/TenantContext';
import { fetchWithAuth } from '@/utils/authService';
import { getStaffList, getStaffMetrics, deleteStaff } from '@/api/staff';
import { staffRanksStore } from '@/utils/localStore';
import type { StaffMember, StaffMetrics, StaffRankItem, DepartmentItem } from '../../types';

export function useStaffRoster() {
  const { showToast } = useToast();
  const { activeTenantId } = useTenant();

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [ranksList, setRanksList] = useState<StaffRankItem[]>(() =>
    staffRanksStore.getRanks(activeTenantId)
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const [metrics, setMetrics] = useState<StaffMetrics>({
    total_staff: 0,
    teaching_staff: 0,
    active_staff: 0,
    on_leave_today: 0,
  });

  // Load Departments
  useEffect(() => {
    let isMounted = true;
    const fetchDepts = async () => {
      try {
        const res = await fetchWithAuth('/api/v1/departments/');
        if (res.ok && isMounted) {
          const data = await res.json();
          setDepartments(Array.isArray(data) ? data : data.results || []);
        }
      } catch (err) {
        console.warn('[useStaffRoster] Error fetching departments:', err);
      }
    };
    fetchDepts();
    return () => {
      isMounted = false;
    };
  }, [activeTenantId]);

  // Load Staff List & Metrics
  const loadData = useCallback(
    async (isSilent = false, searchParamsOverride?: Record<string, any>) => {
      if (!isSilent) setLoading(true);
      else setIsRefreshing(true);

      try {
        const [listRes, metricsRes] = await Promise.allSettled([
          getStaffList(searchParamsOverride || {}),
          getStaffMetrics(),
        ]);

        if (listRes.status === 'fulfilled') {
          const items = Array.isArray(listRes.value) ? listRes.value : listRes.value.results || [];
          setStaffList(items);
        }

        if (metricsRes.status === 'fulfilled' && metricsRes.value) {
          setMetrics({
            total_staff: metricsRes.value.total_staff || 0,
            teaching_staff: metricsRes.value.teaching_staff || 0,
            active_staff: metricsRes.value.active_staff || 0,
            on_leave_today: metricsRes.value.on_leave_today || 0,
          });
        }
      } catch (err: any) {
        console.error('Failed to load staff roster:', err);
        showToast(err.message || 'Failed to load teacher & staff roster', 'error');
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    loadData();
  }, [loadData, activeTenantId]);

  // Listen for tenant switch
  useEffect(() => {
    const handleTenantChanged = () => {
      loadData();
    };
    window.addEventListener('spr_tenant_changed', handleTenantChanged);
    return () => window.removeEventListener('spr_tenant_changed', handleTenantChanged);
  }, [loadData]);

  // Listen for live rank updates from Developer Tools
  useEffect(() => {
    const handleRanksUpdated = () => {
      setRanksList(staffRanksStore.getRanks(activeTenantId));
    };
    window.addEventListener('spr_staff_ranks_updated', handleRanksUpdated);
    return () => window.removeEventListener('spr_staff_ranks_updated', handleRanksUpdated);
  }, [activeTenantId]);

  // Delete Single Staff Member
  const handleDeleteStaff = async (staff: StaffMember) => {
    const staffName = staff.user_name || staff.name_en || staff.employee_id;
    if (
      !window.confirm(
        `Are you sure you want to delete staff member "${staffName}"? All active duties and assignments will be deactivated.`
      )
    ) {
      return false;
    }

    try {
      await deleteStaff(staff.id);
      showToast(`Staff member "${staffName}" has been deleted.`, 'success');
      await loadData(true);
      return true;
    } catch (err: any) {
      showToast(err.message || 'Failed to delete staff member', 'error');
      return false;
    }
  };

  return {
    staffList,
    departments,
    ranksList,
    metrics,
    loading,
    isRefreshing,
    loadData,
    handleDeleteStaff,
  };
}
