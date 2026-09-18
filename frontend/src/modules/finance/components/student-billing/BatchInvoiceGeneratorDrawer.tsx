import React, { useState } from 'react';
import { useTranslation } from '../../../../i18n';
import { InvoiceIcon } from '../../../../components/ui/Icons';
import { useToast } from '../../../../context/ToastContext';

interface BatchInvoiceGeneratorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onRunBatch: (payload: {
    billing_month: string;
    due_date: string;
    class_id?: string;
    group_id?: string;
    branch_id?: string;
  }) => Promise<{ message: string; created_count: number; skipped_count: number }>;
}

export const BatchInvoiceGeneratorDrawer: React.FC<BatchInvoiceGeneratorDrawerProps> = ({
  isOpen,
  onClose,
  onRunBatch,
}) => {
  const { t } = useTranslation('finance');
  const { showToast } = useToast();

  const [billingMonth, setBillingMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(15);
    return d.toISOString().split('T')[0];
  });
  const [classScope, setClassScope] = useState<string>('ALL');
  const [submitting, setSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billingMonth || !dueDate) {
      showToast('Please select billing month and due date', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await onRunBatch({
        billing_month: billingMonth,
        due_date: dueDate,
      });
      showToast(res.message || 'Batch invoices created successfully', 'success');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to generate batch invoices', 'error');
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
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <InvoiceIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-primary">{t('batchInvoicing', '1-Click Batch Invoicing')}</h3>
                <p className="text-xs text-secondary">Generate automated fee bills for entire campus or classes</p>
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
            {/* Section 1: Cycle Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b theme-border text-xs font-semibold text-primary">
                <span>Billing Period & Due Date</span>
              </div>

              <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">
                    Billing Month (YYYY-MM) *
                  </label>
                  <input
                    type="month"
                    value={billingMonth}
                    onChange={(e) => setBillingMonth(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border theme-border bg-surface-sub text-primary text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">
                    Payment Due Date *
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border theme-border bg-surface-sub text-primary text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Target Scope */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b theme-border text-xs font-semibold text-primary">
                <span>Target Institutional Scope</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary mb-1">
                  Target Student Scope
                </label>
                <select
                  value={classScope}
                  onChange={(e) => setClassScope(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border theme-border bg-surface-sub text-primary text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">Entire Institution (All Active Students)</option>
                </select>
                <p className="text-[11px] text-secondary mt-1.5">
                  The system will automatically apply individual scholarships, sibling discounts, and fee structures during generation.
                </p>
              </div>
            </div>
          </form>
        </div>

        {/* Footer Actions */}
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
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition-colors disabled:opacity-50"
          >
            {submitting ? 'Generating Invoices...' : 'Generate Invoices'}
          </button>
        </div>
      </div>
    </div>
  );
};
