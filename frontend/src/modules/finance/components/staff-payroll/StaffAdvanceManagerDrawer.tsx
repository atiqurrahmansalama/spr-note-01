import React, { useState } from 'react';
import { useTranslation } from '../../../../i18n';
import type { StaffSalaryAdvance } from '../../types';
import { WalletIcon } from '../../../../components/ui/Icons';
import { useToast } from '../../../../context/ToastContext';

interface StaffAdvanceManagerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestAdvance: (payload: Partial<StaffSalaryAdvance>) => Promise<any>;
}

export const StaffAdvanceManagerDrawer: React.FC<StaffAdvanceManagerDrawerProps> = ({
  isOpen,
  onClose,
  onRequestAdvance,
}) => {
  const { t } = useTranslation('finance');
  const { showToast } = useToast();

  const [staffId, setStaffId] = useState<string>('');
  const [amount, setAmount] = useState<string>('5000');
  const [installment, setInstallment] = useState<string>('2500');
  const [purpose, setPurpose] = useState<string>('Personal / Emergency');
  const [submitting, setSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffId.trim()) {
      showToast('Please enter Staff UUID', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await onRequestAdvance({
        staff: staffId,
        principal_amount: parseFloat(amount) || 0,
        monthly_installment: parseFloat(installment) || 0,
        remaining_balance: parseFloat(amount) || 0,
        purpose: purpose,
        status: 'APPROVED',
      });
      showToast('Salary advance application approved', 'success');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit advance', 'error');
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
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <WalletIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-primary">{t('salaryAdvance', 'Staff Salary Advance & Loans')}</h3>
                <p className="text-xs text-secondary">Disburse advance funds with auto monthly payroll installment deduction</p>
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
                <span>Advance Parameters</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary mb-1">
                  Target Staff UUID *
                </label>
                <input
                  type="text"
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  placeholder="Enter staff profile UUID..."
                  required
                  className="w-full px-3 py-2 rounded-xl border theme-border bg-surface-sub text-primary text-xs focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">
                    Principal Advance Amount (৳) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border theme-border bg-surface-sub text-primary text-xs font-bold focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">
                    Monthly Deductible Installment (৳) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={installment}
                    onChange={(e) => setInstallment(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border theme-border bg-surface-sub text-primary text-xs font-bold focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary mb-1">
                  Loan / Advance Purpose *
                </label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Festival Advance, Medical Expense"
                  required
                  className="w-full px-3 py-2 rounded-xl border theme-border bg-surface-sub text-primary text-xs focus:outline-none focus:border-rose-500"
                />
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
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-md transition-colors disabled:opacity-50"
          >
            {submitting ? 'Disbursing...' : 'Disburse Advance'}
          </button>
        </div>
      </div>
    </div>
  );
};
