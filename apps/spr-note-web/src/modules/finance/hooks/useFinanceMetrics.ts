import { useState, useEffect, useCallback } from 'react';
import { financeApi } from '../../../api/financeApi';
import type { FinanceKpis, InstitutionalFund } from '../types';

export function useFinanceMetrics() {
  const [kpis, setKpis] = useState<FinanceKpis>({
    today_collection: 0,
    month_collection: 0,
    total_outstanding_dues: 0,
    month_expenses: 0,
    cash_bank_balance: 0,
    net_surplus: 0,
  });
  const [funds, setFunds] = useState<InstitutionalFund[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [kpiData, fundData] = await Promise.all([
        financeApi.getDashboardKpis(),
        financeApi.getFunds(),
      ]);
      setKpis(kpiData);
      setFunds(fundData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch financial metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return {
    kpis,
    funds,
    loading,
    error,
    refreshMetrics: fetchMetrics,
  };
}
