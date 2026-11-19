import { auth as authStore } from "../utils/localStore";
import { API_BASE_URL } from "../config/api";
import type {
  FinanceKpis,
  ChartOfAccount,
  FinancialVoucher,
  FeeHead,
  FeeStructure,
  StudentFeeWaiver,
  StudentInvoice,
  MoneyReceipt,
  StaffPayHead,
  StaffSalaryAdvance,
  StaffPayrollRun,
  StaffPayslip,
  DepartmentBudget,
  InstitutionalFund,
  TrialBalanceReportData,
  DuesAgingReportData,
} from "../modules/finance/types";

const fetchFinanceApi = async (path: string, options: RequestInit = {}) => {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const token = (typeof authStore.getAccessToken === "function" ? authStore.getAccessToken() : typeof authStore.getToken === "function" ? authStore.getToken() : "") || "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const targetUrl = API_BASE_URL ? `${API_BASE_URL}${cleanPath}` : cleanPath;
  const res = await fetch(targetUrl, { ...options, headers });
  
  if (!res.ok) {
    let errorDetail = "API error";
    try {
      const errJson = await res.json();
      errorDetail = errJson.error || errJson.detail || JSON.stringify(errJson);
    } catch {
      errorDetail = res.statusText;
    }
    throw new Error(errorDetail);
  }

  return res.json();
};

export const financeApi = {
  // 1. Dashboard & KPIs
  getDashboardKpis: async (): Promise<FinanceKpis> => {
    return fetchFinanceApi("/api/v1/finance/dashboard/kpis/");
  },

  // 2. Chart of Accounts & General Ledger
  getAccounts: async (params: Record<string, any> = {}): Promise<ChartOfAccount[]> => {
    const query = new URLSearchParams(params).toString();
    const data = await fetchFinanceApi(`/api/v1/finance/accounts/${query ? `?${query}` : ''}`);
    return Array.isArray(data) ? data : data.results || [];
  },

  getAccountTree: async (): Promise<ChartOfAccount[]> => {
    return fetchFinanceApi("/api/v1/finance/accounts/tree-structure/");
  },

  createAccount: async (payload: Partial<ChartOfAccount>): Promise<ChartOfAccount> => {
    return fetchFinanceApi("/api/v1/finance/accounts/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // 3. Vouchers
  getVouchers: async (params: Record<string, any> = {}): Promise<FinancialVoucher[]> => {
    const query = new URLSearchParams(params).toString();
    const data = await fetchFinanceApi(`/api/v1/finance/vouchers/${query ? `?${query}` : ''}`);
    return Array.isArray(data) ? data : data.results || [];
  },

  createVoucher: async (payload: any): Promise<FinancialVoucher> => {
    return fetchFinanceApi("/api/v1/finance/vouchers/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // 4. Funds
  getFunds: async (): Promise<InstitutionalFund[]> => {
    const data = await fetchFinanceApi("/api/v1/finance/funds/");
    return Array.isArray(data) ? data : data.results || [];
  },

  // 5. Fee Heads & Structures
  getFeeHeads: async (): Promise<FeeHead[]> => {
    const data = await fetchFinanceApi("/api/v1/finance/fee-heads/");
    return Array.isArray(data) ? data : data.results || [];
  },

  createFeeHead: async (payload: Partial<FeeHead>): Promise<FeeHead> => {
    return fetchFinanceApi("/api/v1/finance/fee-heads/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getFeeStructures: async (): Promise<FeeStructure[]> => {
    const data = await fetchFinanceApi("/api/v1/finance/fee-structures/");
    return Array.isArray(data) ? data : data.results || [];
  },

  createFeeStructure: async (payload: Partial<FeeStructure>): Promise<FeeStructure> => {
    return fetchFinanceApi("/api/v1/finance/fee-structures/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // 6. Student Invoices & Batch Billing
  getInvoices: async (params: Record<string, any> = {}): Promise<StudentInvoice[]> => {
    const query = new URLSearchParams(params).toString();
    const data = await fetchFinanceApi(`/api/v1/finance/invoices/${query ? `?${query}` : ''}`);
    return Array.isArray(data) ? data : data.results || [];
  },

  generateBatchInvoices: async (payload: {
    billing_month: string;
    due_date: string;
    class_id?: string;
    group_id?: string;
    branch_id?: string;
  }): Promise<{ message: string; created_count: number; skipped_count: number }> => {
    return fetchFinanceApi("/api/v1/finance/invoices/batch-generate/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // 7. Waivers
  getWaivers: async (): Promise<StudentFeeWaiver[]> => {
    const data = await fetchFinanceApi("/api/v1/finance/waivers/");
    return Array.isArray(data) ? data : data.results || [];
  },

  grantWaiver: async (payload: Partial<StudentFeeWaiver>): Promise<StudentFeeWaiver> => {
    return fetchFinanceApi("/api/v1/finance/waivers/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // 8. Money Receipts & POS Cash Counter
  getReceipts: async (params: Record<string, any> = {}): Promise<MoneyReceipt[]> => {
    const query = new URLSearchParams(params).toString();
    const data = await fetchFinanceApi(`/api/v1/finance/receipts/${query ? `?${query}` : ''}`);
    return Array.isArray(data) ? data : data.results || [];
  },

  collectPosPayment: async (payload: {
    student_id: string;
    amount_paid: number | string;
    payment_method: string;
    invoice_id?: string;
    transaction_ref?: string;
    cashier_shift?: string;
    remarks?: string;
  }): Promise<MoneyReceipt> => {
    return fetchFinanceApi("/api/v1/finance/receipts/collect-pos-payment/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  recordReceiptPrint: async (receiptId: string): Promise<any> => {
    return fetchFinanceApi(`/api/v1/finance/receipts/${receiptId}/record-print/`, {
      method: "POST",
    });
  },

  // 9. Staff Payroll & Advances
  getPayHeads: async (): Promise<StaffPayHead[]> => {
    const data = await fetchFinanceApi("/api/v1/finance/pay-heads/");
    return Array.isArray(data) ? data : data.results || [];
  },

  getSalaryAdvances: async (): Promise<StaffSalaryAdvance[]> => {
    const data = await fetchFinanceApi("/api/v1/finance/salary-advances/");
    return Array.isArray(data) ? data : data.results || [];
  },

  createSalaryAdvance: async (payload: Partial<StaffSalaryAdvance>): Promise<StaffSalaryAdvance> => {
    return fetchFinanceApi("/api/v1/finance/salary-advances/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getPayrollRuns: async (): Promise<StaffPayrollRun[]> => {
    const data = await fetchFinanceApi("/api/v1/finance/payroll-runs/");
    return Array.isArray(data) ? data : data.results || [];
  },

  processPayrollMonth: async (payrollMonth: string): Promise<StaffPayrollRun> => {
    return fetchFinanceApi("/api/v1/finance/payroll-runs/process-month/", {
      method: "POST",
      body: JSON.stringify({ payroll_month: payrollMonth }),
    });
  },

  getPayslips: async (params: Record<string, any> = {}): Promise<StaffPayslip[]> => {
    const query = new URLSearchParams(params).toString();
    const data = await fetchFinanceApi(`/api/v1/finance/payslips/${query ? `?${query}` : ''}`);
    return Array.isArray(data) ? data : data.results || [];
  },

  // 10. Financial Statements
  getTrialBalance: async (): Promise<TrialBalanceReportData> => {
    return fetchFinanceApi("/api/v1/finance/statements/trial-balance/");
  },

  getDuesAgingReport: async (): Promise<DuesAgingReportData> => {
    return fetchFinanceApi("/api/v1/finance/statements/dues-aging/");
  },

  // 11. Public Receipt Verification (Unauthenticated)
  verifyReceiptPublic: async (receiptNumber: string, token?: string): Promise<any> => {
    const url = `/api/v1/public/finance/verify-receipt/${encodeURIComponent(receiptNumber)}/${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    return fetchFinanceApi(url);
  },
};
