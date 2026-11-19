import React, { useState } from 'react';
import { useTranslation } from '../../../../i18n';
import { CalculatorIcon } from '../../../../components/ui/Icons';
import { useToast } from '../../../../context/ToastContext';

interface PayrollBatchRunnerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onProcessMonth: (month: string) => Promise<any>;
}

export const PayrollBatchRunnerDrawer: React.FC<PayrollBatchRunnerDrawerProps> = ({
  isOpen,
  onClose,
  onProcessMonth,
}) => {
  const { t } = useTranslation('finance');
  const { showToast } = useToast();

  const [payrollMonth, setPayrollMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [submitting, setSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payrollMonth) {
      showToast('Please select payroll month', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await onProcessMonth(payrollMonth);
      showToast(t('payrollSuccess', 'Payroll processed successfully'), 'success');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to process payroll', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-lg bg-surface border-l theme-border h-full flex flex-col justify-between shadow-2xl p-6 @container">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b theme-border mb-6">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <CalculatorIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-primary">{t('processPayroll', '1-Click Payroll Batch Runner')}</h3>
                <p className="text-xs text-secondary">Calculate base salaries, allowances, loans, and post GL vouchers</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-surface-sub text-secondary hover:text-primary transition-colors text-sm font-semibold"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b theme-border text-xs font-semibold text-primary">
                <span>Payroll Batch Period</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary mb-1">
                  Target Payroll Month (YYYY-MM) *
                </label>
                <input
                  type="month"
                  value={payrollMonth}
                  onChange={(e) => setPayrollMonth(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border theme-border bg-surface-sub text-primary text-sm focus:outline-none focus:border-sky-500 font-semibold"
                />
              </div>

              <div className="p-3.5 rounded-xl border border-sky-500/20 bg-sky-500/5 text-xs text-secondary space-y-1.5">
                <div className="font-semibold text-sky-400">Automated Rules During Batch:</div>
                <ul className="list-disc list-inside space-y-1 text-[11px]">
                  <li>Aggregates active staff profiles with base salary & payheads.</li>
                  <li>Auto-deducts active salary advance installments.</li>
                  <li>Posts automatic Payment Voucher (PV) into General Ledger.</li>
                  <li>Generates individual QR-verified digital payslips.</li>
                </ul>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t theme-border flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border theme-border bg-surface-sub text-secondary hover:text-primary text-xs font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-md transition-colors disabled:opacity-50"
          >
            {submitting ? 'Processing Batch...' : 'Disburse & Run Payroll'}
          </button>
        </div>
      </div>
    </div>
  );
};
