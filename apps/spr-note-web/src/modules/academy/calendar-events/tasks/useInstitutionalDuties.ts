/**
 * SPR Note — Institutional Duties Hook
 * =====================================
 * Manages official assigned duties and institutional tasks delegated by administrators.
 * Dual-layer synchronization: Live REST API with optimistic updates and offline localStorage cache.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTenant } from '@/context/TenantContext';
import { useToast } from '@/context/ToastContext';
import { fetchWithAuth } from '@/utils/authService';
import type { InstitutionalDuty } from '../types';

export function useInstitutionalDuties() {
  const { activeTenantId } = useTenant();
  const { showToast } = useToast();

  const cacheKey = useMemo(
    () => `spr_institutional_duties_${activeTenantId || 'default'}`,
    [activeTenantId]
  );

  const [duties, setDuties] = useState<InstitutionalDuty[]>(() => {
    try {
      const stored = localStorage.getItem(cacheKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState<boolean>(true);

  // Sync state to local storage cache
  const updateLocalCache = useCallback(
    (newDuties: InstitutionalDuty[]) => {
      setDuties(newDuties);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(newDuties));
      } catch {}
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('spr_institutional_duties_updated'));
      }
    },
    [cacheKey]
  );

  // Load duties from REST API
  const loadDuties = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth('/api/v1/institutional-tasks/');
      if (res.ok) {
        const data = await res.json();
        const results = Array.isArray(data) ? data : (data.results || []);
        updateLocalCache(results);
      }
    } catch {
      // Fallback cleanly to cached duties on network error (Rule 12 & Rule 13)
    } finally {
      setLoading(false);
    }
  }, [updateLocalCache]);

  useEffect(() => {
    loadDuties();

    const handleExternalUpdate = () => {
      try {
        const stored = localStorage.getItem(cacheKey);
        if (stored) setDuties(JSON.parse(stored));
      } catch {}
    };

    window.addEventListener('spr_institutional_duties_updated', handleExternalUpdate);
    window.addEventListener('spr_tenant_changed', loadDuties);

    return () => {
      window.removeEventListener('spr_institutional_duties_updated', handleExternalUpdate);
      window.removeEventListener('spr_tenant_changed', loadDuties);
    };
  }, [cacheKey, loadDuties]);

  // Toggle complete
  const toggleDutyComplete = useCallback(
    async (id: string) => {
      // Optimistic update
      const previous = [...duties];
      const updated = duties.map((d) => {
        if (d.id === id) {
          const nextCompleted = !d.is_completed;
          return {
            ...d,
            is_completed: nextCompleted,
            status: (nextCompleted ? 'COMPLETED' : 'PENDING') as 'COMPLETED' | 'PENDING',
            completed_at: nextCompleted ? new Date().toISOString() : null,
          };
        }
        return d;
      });
      updateLocalCache(updated);

      try {
        const res = await fetchWithAuth(`/api/v1/institutional-tasks/${id}/toggle-complete/`, {
          method: 'PATCH',
        });
        if (res.ok) {
          const serverUpdated = await res.json();
          updateLocalCache(
            duties.map((d) => (d.id === id ? { ...d, ...serverUpdated } : d))
          );
        } else {
          // Rollback on failure
          updateLocalCache(previous);
          showToast('Failed to update duty status.', 'error');
        }
      } catch {
        // Keep optimistic offline update
      }
    },
    [duties, updateLocalCache, showToast]
  );

  // Update duty status (e.g. to IN_PROGRESS or PENDING)
  const updateDutyStatus = useCallback(
    async (id: string, newStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED') => {
      const isComp = newStatus === 'COMPLETED';
      const previous = [...duties];
      const updated = duties.map((d) => {
        if (d.id === id) {
          return {
            ...d,
            status: newStatus,
            is_completed: isComp,
            completed_at: isComp ? new Date().toISOString() : null,
          };
        }
        return d;
      });
      updateLocalCache(updated);

      try {
        const res = await fetchWithAuth(`/api/v1/institutional-tasks/${id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: newStatus,
            is_completed: isComp,
          }),
        });
        if (res.ok) {
          const serverUpdated = await res.json();
          updateLocalCache(
            duties.map((d) => (d.id === id ? { ...d, ...serverUpdated } : d))
          );
        } else {
          updateLocalCache(previous);
          showToast('Failed to update duty status.', 'error');
        }
      } catch {
        // Keep optimistic offline update
      }
    },
    [duties, updateLocalCache, showToast]
  );

  // Create new duty (Admin / Head action)
  const createDuty = useCallback(
    async (payload: Partial<InstitutionalDuty>) => {
      try {
        const res = await fetchWithAuth('/api/v1/institutional-tasks/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const created = await res.json();
          updateLocalCache([created, ...duties]);
          showToast('Official duty assigned successfully!', 'success');
          return created;
        } else {
          showToast('Failed to assign official duty.', 'error');
          return null;
        }
      } catch {
        showToast('Error assigning official duty.', 'error');
        return null;
      }
    },
    [duties, updateLocalCache, showToast]
  );

  // Delete duty
  const deleteDuty = useCallback(
    async (id: string) => {
      const previous = [...duties];
      updateLocalCache(duties.filter((d) => d.id !== id));

      try {
        const res = await fetchWithAuth(`/api/v1/institutional-tasks/${id}/`, {
          method: 'DELETE',
        });
        if (res.ok) {
          showToast('Duty removed successfully.', 'info');
        } else {
          updateLocalCache(previous);
          showToast('Failed to delete duty.', 'error');
        }
      } catch {
        updateLocalCache(previous);
        showToast('Error deleting duty.', 'error');
      }
    },
    [duties, updateLocalCache, showToast]
  );

  // Derived metrics
  const metrics = useMemo(() => {
    const total = duties.length;
    const completed = duties.filter((d) => d.is_completed || d.status === 'COMPLETED').length;
    const pending = total - completed;
    const highPriority = duties.filter(
      (d) => d.priority === 'HIGH' && !d.is_completed && d.status !== 'COMPLETED'
    ).length;

    return { total, completed, pending, highPriority };
  }, [duties]);

  return {
    duties,
    loading,
    metrics,
    toggleDutyComplete,
    updateDutyStatus,
    createDuty,
    deleteDuty,
    refreshDuties: loadDuties,
  };
}

export default useInstitutionalDuties;
