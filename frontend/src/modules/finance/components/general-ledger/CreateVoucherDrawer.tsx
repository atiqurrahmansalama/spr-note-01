import React, { useState } from 'react';
import { useTranslation } from '../../../../i18n';
import type { ChartOfAccount, InstitutionalFund, VoucherType, EntryType } from '../../types';
import { ScaleIcon } from '../../../../components/ui/Icons';
import { useToast } from '../../../../context/ToastContext';

interface CreateVoucherDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: ChartOfAccount[];
  funds: InstitutionalFund[];
  onCreateVoucher: (payload: any) => Promise<any>;
}

interface VoucherLineInput {
  id: string;
  account_id: string;
  entry_type: EntryType;
  amount: string;
  description: string;
  fund_id: string;
}

export const CreateVoucherDrawer: React.FC<CreateVoucherDrawerProps> = ({
  isOpen,
  onClose,
  accounts,
  funds,
  onCreateVoucher,
}) => {
  const { t, formatNumber } = useTranslation('finance');
  const { showToast } = useToast();

  const [voucherType, setVoucherType] = useState<VoucherType>('JV');
  const [dateVal, setDateVal] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [narration, setNarration] = useState<string>('');
  const [lines, setLines] = useState<VoucherLineInput[]>([
    { id: '1', account_id: '', entry_type: 'DEBIT', amount: '', description: '', fund_id: '' },
    { id: '2', account_id: '', entry_type: 'CREDIT', amount: '', description: '', fund_id: '' },
  ]);
  const [submitting, setSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        account_id: '',
        entry_type: 'DEBIT',
        amount: '',
        description: '',
        fund_id: '',
      },
    ]);
  };

  const handleRemoveLine = (id: string) => {
    if (lines.length <= 2) {
      showToast('A double-entry voucher requires at least two lines.', 'warning');
      return;
    }
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const handleUpdateLine = (id: string, field: keyof VoucherLineInput, val: any) => {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: val } : l))
    );
  };

  const totalDebit = lines
    .filter((l) => l.entry_type === 'DEBIT')
    .reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);

  const totalCredit = lines
    .filter((l) => l.entry_type === 'CREDIT')
    .reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);

  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.001 && totalDebit > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!narration.trim()) {
      showToast('Please enter a narration/memo for this transaction.', 'error');
      return;
    }
    if (!isBalanced) {
      showToast(`Voucher out of balance! Debit (৳ ${totalDebit}) must equal Credit (৳ ${totalCredit}).`, 'error');
      return;
    }

    setSubmitting(true);
    try {
      await onCreateVoucher({
        voucher_type: voucherType,
        date: dateVal,
        narration: narration,
        reference_no: referenceNo,
        entries: lines.map((l) => ({
          account_id: l.account_id,
          entry_type: l.entry_type,
          amount: parseFloat(l.amount) || 0,
          description: l.description,
          fund_id: l.fund_id || null,
        })),
      });

      showToast('Financial voucher posted successfully', 'success');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to post voucher', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-2xl bg-surface border-l theme-border h-full flex flex-col justify-between shadow-2xl p-6 @container overflow-y-auto">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b theme-border mb-6">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <ScaleIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-primary">{t('newVoucher', 'Create Double-Entry Voucher')}</h3>
                <p className="text-xs text-secondary">Journal, Payment, Receipt, or Contra entry posting</p>
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
            {/* Header Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b theme-border text-xs font-semibold text-primary">
                <span>Voucher Parameters</span>
              </div>

              <div className="grid grid-cols-1 @[480px]:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">
                    Voucher Type *
                  </label>
                  <select
                    value={voucherType}
                    onChange={(e) => setVoucherType(e.target.value as VoucherType)}
                    className="w-full px-3 py-2 rounded-xl border theme-border bg-surface-sub text-primary text-xs focus:outline-none focus:border-purple-500 font-semibold"
                  >
                    <option value="JV">Journal Voucher (JV)</option>
                    <option value="PV">Payment Voucher (PV)</option>
                    <option value="RV">Receipt Voucher (RV)</option>
                    <option value="CV">Contra Voucher (CV)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">
                    Posting Date *
                  </label>
                  <input
                    type="date"
                    value={dateVal}
                    onChange={(e) => setDateVal(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border theme-border bg-surface-sub text-primary text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">
                    Ref / Cheque #
                  </label>
                  <input
                    type="text"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    placeholder="e.g. Bill #889"
                    className="w-full px-3 py-2 rounded-xl border theme-border bg-surface-sub text-primary text-xs placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary mb-1">
                  Narration / Transaction Memo *
                </label>
                <textarea
                  rows={2}
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                  placeholder="Detailed description of the financial transaction..."
                  required
                  className="w-full px-3 py-2 rounded-xl border theme-border bg-surface-sub text-primary text-xs placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Debit & Credit Ledger Entries */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b theme-border">
                <span className="text-xs font-semibold text-primary">Debit & Credit Entry Lines</span>
                <button
                  type="button"
                  onClick={handleAddLine}
                  className="px-2.5 py-1 rounded-lg bg-purple-600/10 text-purple-400 hover:bg-purple-600/20 text-[11px] font-medium transition-colors border border-purple-500/20"
                >
                  + Add Line
                </button>
              </div>

              <div className="space-y-2.5">
                {lines.map((line, idx) => (
                  <div
                    key={line.id}
                    className="p-3 rounded-xl border theme-border bg-surface-sub space-y-2"
                  >
                    <div className="grid grid-cols-1 @[480px]:grid-cols-12 gap-2 items-center">
                      <div className="@[480px]:col-span-6">
                        <select
                          value={line.account_id}
                          onChange={(e) => handleUpdateLine(line.id, 'account_id', e.target.value)}
                          required
                          className="w-full px-2.5 py-1.5 rounded-lg border theme-border bg-surface text-primary text-xs focus:outline-none focus:border-purple-500"
                        >
                          <option value="">Select COA Account *</option>
                          {accounts.filter(a => !a.is_group).map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.code} - {acc.name_en} ({acc.category})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="@[480px]:col-span-3">
                        <select
                          value={line.entry_type}
                          onChange={(e) => handleUpdateLine(line.id, 'entry_type', e.target.value as EntryType)}
                          className={`w-full px-2 py-1.5 rounded-lg border text-xs font-bold focus:outline-none ${
                            line.entry_type === 'DEBIT'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                          }`}
                        >
                          <option value="DEBIT">Debit (Dr)</option>
                          <option value="CREDIT">Credit (Cr)</option>
                        </select>
                      </div>

                      <div className="@[480px]:col-span-3 flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Amount ৳"
                          value={line.amount}
                          onChange={(e) => handleUpdateLine(line.id, 'amount', e.target.value)}
                          required
                          className="w-full px-2 py-1.5 rounded-lg border theme-border bg-surface text-primary text-xs font-bold focus:outline-none focus:border-purple-500"
                        />
                        {lines.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(line.id)}
                            className="p-1 rounded text-rose-400 hover:bg-rose-500/10"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Double-Entry Balancing Card */}
              <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                isBalanced
                  ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400'
                  : 'border-rose-500/30 bg-rose-500/5 text-rose-400'
              }`}>
                <div>
                  <span className="font-semibold">Total Debit: ৳ {formatNumber(totalDebit)}</span>
                  <span className="mx-2">|</span>
                  <span className="font-semibold">Total Credit: ৳ {formatNumber(totalCredit)}</span>
                </div>
                <div className="font-bold">
                  {isBalanced ? 'Balanced' : `Difference: ৳ ${formatNumber(Math.abs(totalDebit - totalCredit))}`}
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t theme-border flex items-center justify-end gap-3 mt-6">
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
            disabled={submitting || !isBalanced}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md transition-colors disabled:opacity-50"
          >
            {submitting ? 'Posting...' : 'Post Voucher (Double-Entry)'}
          </button>
        </div>
      </div>
    </div>
  );
};
