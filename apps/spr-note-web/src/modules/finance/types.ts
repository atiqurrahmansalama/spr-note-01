export type AccountCategory = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
export type FundType = 'GENERAL' | 'ZAKAT_SADAQAH' | 'WAQF_BUILDING' | 'STUDENT_WELFARE' | 'EXAMINATION' | 'ORPHAN_SUPPORT' | 'CUSTOM';
export type VoucherType = 'JV' | 'PV' | 'RV' | 'CV';
export type VoucherStatus = 'DRAFT' | 'POSTED' | 'CANCELLED' | 'REVERSED';
export type EntryType = 'DEBIT' | 'CREDIT';
export type PaymentMethod = 'CASH' | 'BANK' | 'CHEQUE' | 'BKASH' | 'NAGAD' | 'ROCKET' | 'UPAY' | 'CARD' | 'ONLINE';
export type FeeFrequency = 'ONCE' | 'MONTHLY' | 'TERMLY' | 'ANNUAL' | 'AD_HOC';
export type WaiverType = 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FULL_SCHOLARSHIP';
export type InvoiceStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'WAIVED' | 'CANCELLED';
export type ReceiptStatus = 'VALID' | 'CANCELLED' | 'REFUNDED';
export type PayHeadType = 'EARNING' | 'DEDUCTION';
export type CalculationType = 'FIXED' | 'PERCENTAGE_OF_BASIC';
export type AdvanceStatus = 'PENDING' | 'APPROVED' | 'DISBURSED' | 'REPAID' | 'REJECTED';
export type PayrollStatus = 'DRAFT' | 'APPROVED' | 'DISBURSED' | 'CANCELLED';

export interface InstitutionalFund {
  id: string;
  institution: string;
  fund_code: string;
  name: string;
  fund_type: FundType;
  description: string;
  current_balance: number | string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface FiscalYear {
  id: string;
  institution: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_closed: boolean;
  closed_at?: string;
}

export interface ChartOfAccount {
  id: string;
  institution: string;
  code: string;
  name_en: string;
  name_bn: string;
  category: AccountCategory;
  parent_account?: string | null;
  parent_account_name?: string;
  fund?: string | null;
  fund_name?: string;
  is_group: boolean;
  is_system_default: boolean;
  is_reconcilable: boolean;
  is_active: boolean;
  current_balance: number | string;
  sub_accounts_count?: number;
  created_at?: string;
}

export interface VoucherEntry {
  id?: string;
  voucher?: string;
  account: string;
  account_code?: string;
  account_name?: string;
  entry_type: EntryType;
  amount: number | string;
  fund?: string | null;
  fund_name?: string;
  description?: string;
  subledger_type?: string;
  subledger_id?: string;
}

export interface FinancialVoucher {
  id: string;
  institution: string;
  branch?: string | null;
  branch_name?: string;
  fiscal_year?: string | null;
  voucher_number: string;
  voucher_type: VoucherType;
  date: string;
  reference_no?: string;
  narration: string;
  total_amount: number | string;
  status: VoucherStatus;
  created_by?: string;
  created_by_name?: string;
  entries: VoucherEntry[];
  created_at?: string;
}

export interface FeeHead {
  id: string;
  institution: string;
  code: string;
  name: string;
  name_bn?: string;
  frequency: FeeFrequency;
  gl_account?: string | null;
  gl_account_name?: string;
  default_amount: number | string;
  is_optional: boolean;
  is_active: boolean;
}

export interface FeeStructure {
  id: string;
  institution: string;
  academic_session?: string | null;
  branch?: string | null;
  branch_name?: string;
  department?: string | null;
  department_name?: string;
  student_class?: string | null;
  class_name?: string;
  student_group?: string | null;
  group_name?: string;
  fee_head: string;
  fee_head_name?: string;
  amount: number | string;
  is_active: boolean;
}

export interface StudentFeeWaiver {
  id: string;
  student: string;
  student_name?: string;
  student_uniq_id?: string;
  fee_head?: string | null;
  fee_head_name?: string;
  waiver_type: WaiverType;
  discount_value: number | string;
  reason: string;
  approved_by?: string;
  approved_by_name?: string;
  valid_from: string;
  valid_until?: string | null;
  is_active: boolean;
}

export interface StudentInvoiceItem {
  id?: string;
  invoice?: string;
  fee_head: string;
  fee_head_name?: string;
  fee_head_code?: string;
  gross_amount: number | string;
  waiver_amount: number | string;
  net_amount: number | string;
  paid_amount: number | string;
}

export interface StudentInvoice {
  id: string;
  institution: string;
  invoice_number: string;
  student: string;
  student_name?: string;
  student_uniq_id?: string;
  student_roll?: number;
  class_name?: string;
  group_name?: string;
  branch_name?: string;
  academic_session?: string | null;
  billing_month: string;
  issue_date: string;
  due_date: string;
  subtotal_amount: number | string;
  waiver_amount: number | string;
  late_fine_amount: number | string;
  total_payable: number | string;
  paid_amount: number | string;
  due_amount: number | string;
  status: InvoiceStatus;
  remarks?: string;
  items: StudentInvoiceItem[];
  created_at?: string;
}

export interface ReceiptItemAllocation {
  id?: string;
  receipt?: string;
  invoice_item: string;
  fee_head_name?: string;
  allocated_amount: number | string;
}

export interface MoneyReceipt {
  id: string;
  institution: string;
  branch?: string | null;
  branch_name?: string;
  receipt_number: string;
  invoice?: string | null;
  invoice_number?: string;
  student: string;
  student_name?: string;
  student_uniq_id?: string;
  student_roll?: number;
  class_name?: string;
  group_name?: string;
  voucher?: string | null;
  payment_date: string;
  amount_paid: number | string;
  payment_method: PaymentMethod;
  transaction_ref?: string;
  collected_by?: string;
  collected_by_name?: string;
  cashier_shift?: string;
  security_hash: string;
  qr_verification_token: string;
  verification_url: string;
  status: ReceiptStatus;
  print_count: number;
  remarks?: string;
  allocations: ReceiptItemAllocation[];
  created_at?: string;
}

export interface StaffPayHead {
  id: string;
  institution: string;
  code: string;
  name: string;
  name_bn?: string;
  head_type: PayHeadType;
  gl_account?: string | null;
  gl_account_name?: string;
  is_taxable: boolean;
  is_active: boolean;
}

export interface StaffSalaryStructureItem {
  id: string;
  staff: string;
  pay_head: string;
  pay_head_name?: string;
  pay_head_type?: PayHeadType;
  calculation_type: CalculationType;
  amount_or_percent: number | string;
  is_active: boolean;
}

export interface StaffSalaryAdvance {
  id: string;
  institution: string;
  staff: string;
  staff_name?: string;
  staff_employee_id?: string;
  designation?: string;
  request_date: string;
  principal_amount: number | string;
  monthly_installment: number | string;
  total_repaid: number | string;
  remaining_balance: number | string;
  purpose?: string;
  status: AdvanceStatus;
  approved_by?: string;
  approved_by_name?: string;
  created_at?: string;
}

export interface StaffPayslip {
  id: string;
  payroll_run: string;
  staff: string;
  staff_name?: string;
  staff_employee_id?: string;
  designation?: string;
  department_name?: string;
  payslip_number: string;
  base_salary: number | string;
  total_allowances: number | string;
  total_deductions: number | string;
  attendance_penalty: number | string;
  advance_deduction: number | string;
  net_payable: number | string;
  payment_status: string;
  payment_method: PaymentMethod;
  bank_account_no?: string;
  bank_name?: string;
  security_hash: string;
  qr_verification_token: string;
  created_at?: string;
}

export interface StaffPayrollRun {
  id: string;
  institution: string;
  payroll_month: string;
  processed_date: string;
  total_gross: number | string;
  total_deductions: number | string;
  total_net_disbursed: number | string;
  total_staff_count: number;
  status: PayrollStatus;
  voucher?: string | null;
  voucher_number?: string;
  processed_by?: string;
  processed_by_name?: string;
  payslips: StaffPayslip[];
  created_at?: string;
}

export interface DepartmentBudget {
  id: string;
  institution: string;
  branch?: string | null;
  branch_name?: string;
  department: string;
  department_name?: string;
  fiscal_year: string;
  fiscal_year_name?: string;
  allocated_amount: number | string;
  spent_amount: number | string;
  remaining_budget?: number;
  alert_threshold_percent: number;
  is_active: boolean;
}

export interface FinanceKpis {
  today_collection: number;
  month_collection: number;
  total_outstanding_dues: number;
  month_expenses: number;
  cash_bank_balance: number;
  net_surplus: number;
}

export interface TrialBalanceItem {
  id: string;
  code: string;
  name: string;
  category: AccountCategory;
  debit: number;
  credit: number;
}

export interface TrialBalanceReportData {
  accounts: TrialBalanceItem[];
  total_debit: number;
  total_credit: number;
  is_balanced: boolean;
}

export interface DuesAgingReportData {
  days_0_30: { count: number; amount: number };
  days_31_60: { count: number; amount: number };
  days_61_90: { count: number; amount: number };
  days_90_plus: { count: number; amount: number };
  total_due: number;
}
