import { useCallback, useEffect, useState } from 'react';
import { universeRequest } from '../../../core/api/client';
import { useAuth } from '../../../core/auth/AuthContext';
import type { DashboardPayload } from '../types';

export function useUniverseDashboard() {
  const { refreshSession } = useAuth();
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  const loadDashboard = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const payload = await universeRequest<DashboardPayload>('/api/v1/universe/dashboard/');
      setData(payload);
      return payload;
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const claimSurprise = useCallback(async () => {
    setClaiming(true);
    try {
      await universeRequest('/api/v1/universe/dashboard/claim-surprise/', {
        method: 'POST',
      });
      await Promise.all([loadDashboard(true), refreshSession()]);
    } finally {
      setClaiming(false);
    }
  }, [loadDashboard, refreshSession]);

  return {
    data,
    loading,
    claiming,
    refreshDashboard: loadDashboard,
    claimSurprise,
  };
}
