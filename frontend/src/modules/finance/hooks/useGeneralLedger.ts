import { useState, useEffect, useCallback } from 'react';
import { financeApi } from '../../../api/financeApi';
import type {
  ChartOfAccount,
  FinancialVoucher,
  InstitutionalFund,
  TrialBalanceReportData,
} from '../types';

export function useGeneralLedger() {
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [vouchers, setVouchers] = useState<FinancialVoucher[]>([]);
  const [funds, setFunds] = useState<InstitutionalFund[]>([]);
  const [trialBalance, setTrialBalance] = useState<TrialBalanceReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLedgerData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [accData, vchData, fndData] = await Promise.all([
        financeApi.getAccounts(),
        financeApi.getVouchers(),
        financeApi.getFunds(),
      ]);
      setAccounts(accData);
      setVouchers(vchData);
      setFunds(fndData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch general ledger data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLedgerData();
  }, [fetchLedgerData]);

  const createVoucher = async (payload: any) => {
    const res = await financeApi.createVoucher(payload);
    await fetchLedgerData();
    return res;
  };

  const createAccount = async (payload: Partial<ChartOfAccount>) => {
    const res = await financeApi.createAccount(payload);
    await fetchLedgerData();
    return res;
  };

  const fetchTrialBalance = async () => {
    const data = await financeApi.getTrialBalance();
    setTrialBalance(data);
    return data;
  };

  return {
    accounts,
    vouchers,
    funds,
    trialBalance,
    loading,
    error,
    refreshLedger: fetchLedgerData,
    createVoucher,
    createAccount,
    fetchTrialBalance,
  };
}
