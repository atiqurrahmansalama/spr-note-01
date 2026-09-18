import React, { useState } from 'react';
import { useTranslation } from '../../i18n';
import {
  FinanceKpiStats,
  FundBalanceMatrix,
  QuickActionToolbar,
  QuickPosCashDesk,
  StudentBillingDesk,
  BatchInvoiceGeneratorDrawer,
  StudentLedgerModal,
  WaiverGrantDrawer,
  ChartOfAccountsTree,
  VoucherManagementDesk,
  CreateVoucherDrawer,
  StaffPayrollRoster,
  PayrollBatchRunnerDrawer,
  StaffAdvanceManagerDrawer,
  StaffPayslipModal,
  ReceiptPrintPreviewModal,
  TrialBalanceReport,
  DuesAgingAnalysisReport,
} from './components';
import {
  useFinanceMetrics,
  useStudentBilling,
  useStaffPayroll,
  useGeneralLedger,
  useReceiptPrinter,
} from './hooks';
import type { StudentInvoice, StaffPayslip } from './types';
import { 
  BanknotesIcon, 
  InvoiceIcon, 
  ScaleIcon, 
  CalculatorIcon, 
  ChartBarIcon 
} from '../../components/ui/Icons';

export type FinanceTab = 'overview' | 'student-billing' | 'staff-payroll' | 'general-ledger' | 'reports';

export const FinanceHubView: React.FC = () => {
  const { t } = useTranslation('finance');

  const [activeTab, setActiveTab] = useState<FinanceTab>('overview');

  // Drawers & Modals States
  const [isQuickPosOpen, setIsQuickPosOpen] = useState(false);
  const [isBatchBillingOpen, setIsBatchBillingOpen] = useState(false);
  const [isCreateVoucherOpen, setIsCreateVoucherOpen] = useState(false);
  const [isRunPayrollOpen, setIsRunPayrollOpen] = useState(false);
  const [isGrantWaiverOpen, setIsGrantWaiverOpen] = useState(false);
  const [isSalaryAdvanceOpen, setIsSalaryAdvanceOpen] = useState(false);
  const [activeLedgerStudent, setActiveLedgerStudent] = useState<{ id: string; name: string } | null>(null);
  const [activePayslip, setActivePayslip] = useState<StaffPayslip | null>(null);

  // Custom Hooks
  const { kpis, funds, loading: metricsLoading, refreshMetrics } = useFinanceMetrics();
  const {
    invoices,
    receipts,
    feeHeads,
    loading: billingLoading,
    collectPayment,
    runBatchBilling,
    createWaiver,
  } = useStudentBilling();
  const {
    payrollRuns,
    payslips,
    loading: payrollLoading,
    processPayrollMonth,
    requestAdvance,
  } = useStaffPayroll();
  const {
    accounts,
    vouchers,
    trialBalance,
    loading: ledgerLoading,
    createVoucher,
    fetchTrialBalance,
  } = useGeneralLedger();
  const {
    activeReceipt,
    printModalOpen,
    printFormat,
    setPrintFormat,
    openPrintModal,
    closePrintModal,
    triggerPrint,
  } = useReceiptPrinter();

  const handleOpenCollectForInvoice = (inv: StudentInvoice) => {
    setActiveTab('student-billing');
    setIsQuickPosOpen(true);
  };

  const handleOpenLedger = (studentId: string, studentName: string) => {
    setActiveLedgerStudent({ id: studentId, name: studentName });
  };

  const tabs: { id: FinanceTab; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', label: t('tabOverview', 'Overview'), Icon: BanknotesIcon },
    { id: 'student-billing', label: t('tabStudentBilling', 'Student Billing & Fees'), Icon: InvoiceIcon },
    { id: 'staff-payroll', label: t('tabStaffPayroll', 'Staff Payroll'), Icon: CalculatorIcon },
    { id: 'general-ledger', label: t('tabGeneralLedger', 'General Ledger & Vouchers'), Icon: ScaleIcon },
    { id: 'reports', label: t('tabReports', 'Reports & Statements'), Icon: ChartBarIcon },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b theme-border">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-primary">
            {t('title', 'Finance & Accounts')}
          </h1>
          <p className="text-xs sm:text-sm text-secondary mt-1">
            {t('subtitle', 'Institutional Double-Entry Bookkeeping, Student Fees, Staff Payroll, and Verified Receipts')}
          </p>
        </div>

        {/* Global Tab Navigation */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl border theme-border bg-surface-sub overflow-x-auto max-w-full">
          {tabs.map((tab) => {
            const TabIcon = tab.Icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-secondary hover:text-primary hover:bg-elevated'
                }`}
              >
                <TabIcon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <FinanceKpiStats kpis={kpis} loading={metricsLoading} />
          
          <div>
            <h3 className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">
              Quick Operations Desk
            </h3>
            <QuickActionToolbar
              onOpenQuickPos={() => {
                setActiveTab('student-billing');
                setIsQuickPosOpen(true);
              }}
              onOpenBatchBilling={() => setIsBatchBillingOpen(true)}
              onOpenCreateVoucher={() => setIsCreateVoucherOpen(true)}
              onOpenProcessPayroll={() => setIsRunPayrollOpen(true)}
              onOpenGrantWaiver={() => setIsGrantWaiverOpen(true)}
              onOpenSalaryAdvance={() => setIsSalaryAdvanceOpen(true)}
            />
          </div>

          <FundBalanceMatrix funds={funds} loading={metricsLoading} />
          <DuesAgingAnalysisReport />
        </div>
      )}

      {/* Tab 2: Student Billing & Fees */}
      {activeTab === 'student-billing' && (
        <div className="space-y-6">
          <QuickPosCashDesk
            invoices={invoices}
            onCollectPayment={collectPayment}
            onOpenReceiptPrint={(rec) => openPrintModal(rec, 'A4')}
          />

          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-primary">Student Billing Invoices</h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsGrantWaiverOpen(true)}
                className="px-3 py-1.5 rounded-xl border theme-border bg-surface-sub hover:bg-elevated text-secondary hover:text-primary text-xs font-medium transition-colors"
              >
                + Grant Waiver
              </button>
              <button
                type="button"
                onClick={() => setIsBatchBillingOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                + 1-Click Batch Invoicing
              </button>
            </div>
          </div>

          <StudentBillingDesk
            invoices={invoices}
            loading={billingLoading}
            onOpenLedger={handleOpenLedger}
            onOpenCollect={handleOpenCollectForInvoice}
          />
        </div>
      )}

      {/* Tab 3: Staff Payroll */}
      {activeTab === 'staff-payroll' && (
        <div className="space-y-6">
          <StaffPayrollRoster
            payrollRuns={payrollRuns}
            payslips={payslips}
            loading={payrollLoading}
            onOpenPayslip={(slip) => setActivePayslip(slip)}
            onOpenRunPayroll={() => setIsRunPayrollOpen(true)}
            onOpenAdvance={() => setIsSalaryAdvanceOpen(true)}
          />
        </div>
      )}

      {/* Tab 4: General Ledger & Vouchers */}
      {activeTab === 'general-ledger' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-primary">General Ledger & Double-Entry Vouchers</h3>
              <p className="text-xs text-secondary">Chart of Accounts hierarchy and verified financial vouchers</p>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateVoucherOpen(true)}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              + Create Voucher
            </button>
          </div>

          <ChartOfAccountsTree accounts={accounts} loading={ledgerLoading} />
          <VoucherManagementDesk vouchers={vouchers} loading={ledgerLoading} />
        </div>
      )}

      {/* Tab 5: Reports & Statements */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <TrialBalanceReport
            data={trialBalance}
            loading={ledgerLoading}
            onFetch={fetchTrialBalance}
          />
          <DuesAgingAnalysisReport />
        </div>
      )}

      {/* Drawers & Modals */}
      <BatchInvoiceGeneratorDrawer
        isOpen={isBatchBillingOpen}
        onClose={() => setIsBatchBillingOpen(false)}
        onRunBatch={runBatchBilling}
      />

      <CreateVoucherDrawer
        isOpen={isCreateVoucherOpen}
        onClose={() => setIsCreateVoucherOpen(false)}
        accounts={accounts}
        funds={funds}
        onCreateVoucher={createVoucher}
      />

      <WaiverGrantDrawer
        isOpen={isGrantWaiverOpen}
        onClose={() => setIsGrantWaiverOpen(false)}
        feeHeads={feeHeads}
        onGrantWaiver={createWaiver}
      />

      <PayrollBatchRunnerDrawer
        isOpen={isRunPayrollOpen}
        onClose={() => setIsRunPayrollOpen(false)}
        onProcessMonth={processPayrollMonth}
      />

      <StaffAdvanceManagerDrawer
        isOpen={isSalaryAdvanceOpen}
        onClose={() => setIsSalaryAdvanceOpen(false)}
        onRequestAdvance={requestAdvance}
      />

      <StudentLedgerModal
        isOpen={!!activeLedgerStudent}
        onClose={() => setActiveLedgerStudent(null)}
        studentId={activeLedgerStudent?.id || ''}
        studentName={activeLedgerStudent?.name || ''}
        invoices={invoices}
        receipts={receipts}
      />

      <StaffPayslipModal
        isOpen={!!activePayslip}
        onClose={() => setActivePayslip(null)}
        payslip={activePayslip}
      />

      <ReceiptPrintPreviewModal
        isOpen={printModalOpen}
        onClose={closePrintModal}
        receipt={activeReceipt}
        printFormat={printFormat}
        onFormatChange={setPrintFormat}
        onPrint={triggerPrint}
      />
    </div>
  );
};
export default FinanceHubView;
