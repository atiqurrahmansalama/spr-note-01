import React, { useState } from 'react';
import { useTranslation } from '../../../../i18n';
import type { StudentFeeWaiver, FeeHead, WaiverType } from '../../types';
import { ReceiptPercentIcon } from '../../../../components/ui/Icons';
import { useToast } from '../../../../context/ToastContext';

interface WaiverGrantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  feeHeads: FeeHead[];
  onGrantWaiver: (payload: Partial<StudentFeeWaiver>) => Promise<StudentFeeWaiver>;
}

export const WaiverGrantDrawer: React.FC<WaiverGrantDrawerProps> = ({
  isOpen,
  onClose,
  feeHeads,
  onGrantWaiver,
}) => {
  const { t } = useTranslation('finance');
  const { showToast } = useToast();

  const [studentId, setStudentId] = useState('');
  const [feeHeadId, setFeeHeadId] = useState('');
  const [waiverType, setWaiverType] = useState<WaiverType>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState<string>('50');
  const [reason, setReason] = useState<string>('Merit Scholarship');
  const [submitting, setSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim()) {
      showToast('Please enter Student ID', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await onGrantWaiver({
        student: studentId,
        fee_head: feeHeadId || null,
        waiver_type: waiverType,
        discount_value: parseFloat(discountValue) || 0,
        reason: reason,
        valid_from: new Date().toISOString().split('T')[0],
      });
      showToast('Waiver / scholarship granted successfully', 'success');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to grant waiver', 'error');
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
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <ReceiptPercentIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-primary">{t('grantWaiver', 'Grant Scholarship / Waiver')}</h3>
                <p className="text-xs text-secondary">Configure student discount, sibling concession, or free-ship</p>
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
            {/* Target Student */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b theme-border text-xs font-semibold text-primary">
                <span>Student & Fee Head Target</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary mb-1">
                  Target Student ID / UUID *
                </label>
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="e.g. STU-1001 or student UUID"
                  required
                  className="w-full px-3 py-2 rounded-xl border theme-border bg-surface-sub text-primary text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary mb-1">
                  Applicable Fee Head
                </label>
                <select
                  value={feeHeadId}
                  onChange={(e) => setFeeHeadId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border theme-border bg-surface-sub text-primary text-sm focus:outline-none focus:border-amber-500"
                >
                  <option value="">All Fee Heads (Universal Waiver)</option>
                  {feeHeads.map((h) => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Discount Rules */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b theme-border text-xs font-semibold text-primary">
                <span>Discount Type & Value</span>
              </div>

              <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">
                    Waiver Type *
                  </label>
                  <select
                    value={waiverType}
                    onChange={(e) => setWaiverType(e.target.value as WaiverType)}
                    className="w-full px-3 py-2 rounded-xl border theme-border bg-surface-sub text-primary text-sm focus:outline-none focus:border-amber-500"
                  >
                    <option value="PERCENTAGE">Percentage (%) Discount</option>
                    <option value="FIXED_AMOUNT">Fixed Amount (৳) Discount</option>
                    <option value="FULL_SCHOLARSHIP">100% Free-ship (Full Waiver)</option>
                  </select>
                </div>

                {waiverType !== 'FULL_SCHOLARSHIP' && (
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">
                      {waiverType === 'PERCENTAGE' ? 'Discount Percentage (%)' : 'Discount Amount (৳)'} *
                    </label>
                    <input
                      type="number"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl border theme-border bg-surface-sub text-primary text-sm focus:outline-none focus:border-amber-500 font-bold"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary mb-1">
                  Concession Reason / Category *
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Orphan, Sibling, Hafiz Merit, Financial Need"
                  required
                  className="w-full px-3 py-2 rounded-xl border theme-border bg-surface-sub text-primary text-sm focus:outline-none focus:border-amber-500"
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
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-md transition-colors disabled:opacity-50"
          >
            {submitting ? 'Granting...' : 'Approve & Grant Waiver'}
          </button>
        </div>
      </div>
    </div>
  );
};
