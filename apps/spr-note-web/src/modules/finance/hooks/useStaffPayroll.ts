import { useState, useEffect, useCallback } from 'react';
import { financeApi } from '../../../api/financeApi';
import type {
  StaffPayrollRun,
  StaffPayslip,
  StaffSalaryAdvance,
  StaffPayHead,
} from '../types';

export function useStaffPayroll() {
  const [payrollRuns, setPayrollRuns] = useState<StaffPayrollRun[]>([]);
  const [payslips, setPayslips] = useState<StaffPayslip[]>([]);
  const [advances, setAdvances] = useState<StaffSalaryAdvance[]>([]);
  const [payHeads, setPayHeads] = useState<StaffPayHead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayrollData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [runsData, slipsData, advData, headData] = await Promise.all([
        financeApi.getPayrollRuns(),
        financeApi.getPayslips(),
        financeApi.getSalaryAdvances(),
        financeApi.getPayHeads(),
      ]);
      setPayrollRuns(runsData);
      setPayslips(slipsData);
      setAdvances(advData);
      setPayHeads(headData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch payroll data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayrollData();
  }, [fetchPayrollData]);

  const processPayrollMonth = async (month: string) => {
    const res = await financeApi.processPayrollMonth(month);
    await fetchPayrollData();
    return res;
  };

  const requestAdvance = async (payload: Partial<StaffSalaryAdvance>) => {
    const res = await financeApi.createSalaryAdvance(payload);
    await fetchPayrollData();
    return res;
  };

  return {
    payrollRuns,
    payslips,
    advances,
    payHeads,
    loading,
    error,
    refreshPayroll: fetchPayrollData,
    processPayrollMonth,
    requestAdvance,
  };
}
