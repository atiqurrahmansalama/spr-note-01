import { useState, useEffect, useCallback } from 'react';
import { financeApi } from '../../../api/financeApi';
import type {
  StudentInvoice,
  MoneyReceipt,
  FeeHead,
  FeeStructure,
  StudentFeeWaiver,
} from '../types';

export function useStudentBilling() {
  const [invoices, setInvoices] = useState<StudentInvoice[]>([]);
  const [receipts, setReceipts] = useState<MoneyReceipt[]>([]);
  const [feeHeads, setFeeHeads] = useState<FeeHead[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [waivers, setWaivers] = useState<StudentFeeWaiver[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBillingData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [invData, recData, headData, structData, wavData] = await Promise.all([
        financeApi.getInvoices(),
        financeApi.getReceipts(),
        financeApi.getFeeHeads(),
        financeApi.getFeeStructures(),
        financeApi.getWaivers(),
      ]);
      setInvoices(invData);
      setReceipts(recData);
      setFeeHeads(headData);
      setFeeStructures(structData);
      setWaivers(wavData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch billing data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  const collectPayment = async (payload: {
    student_id: string;
    amount_paid: number | string;
    payment_method: string;
    invoice_id?: string;
    transaction_ref?: string;
    cashier_shift?: string;
    remarks?: string;
  }) => {
    const receipt = await financeApi.collectPosPayment(payload);
    await fetchBillingData();
    return receipt;
  };

  const runBatchBilling = async (payload: {
    billing_month: string;
    due_date: string;
    class_id?: string;
    group_id?: string;
    branch_id?: string;
  }) => {
    const res = await financeApi.generateBatchInvoices(payload);
    await fetchBillingData();
    return res;
  };

  const createWaiver = async (payload: Partial<StudentFeeWaiver>) => {
    const res = await financeApi.grantWaiver(payload);
    await fetchBillingData();
    return res;
  };

  return {
    invoices,
    receipts,
    feeHeads,
    feeStructures,
    waivers,
    loading,
    error,
    refreshBilling: fetchBillingData,
    collectPayment,
    runBatchBilling,
    createWaiver,
  };
}
