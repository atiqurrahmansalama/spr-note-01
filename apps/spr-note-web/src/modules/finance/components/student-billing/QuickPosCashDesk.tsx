import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../../../i18n';
import type { StudentInvoice, MoneyReceipt, PaymentMethod } from '../../types';
import { 
  BanknotesIcon, 
  InvoiceIcon, 
  PrinterIcon,
  ShieldCheckIcon,
  QrCodeIcon
} from '../../../../components/ui/Icons';
import { useToast } from '../../../../context/ToastContext';

interface QuickPosCashDeskProps {
  invoices: StudentInvoice[];
  onCollectPayment: (payload: {
    student_id: string;
    amount_paid: number | string;
    payment_method: string;
    invoice_id?: string;
    transaction_ref?: string;
    cashier_shift?: string;
    remarks?: string;
  }) => Promise<MoneyReceipt>;
  onOpenReceiptPrint: (receipt: MoneyReceipt) => void;
}

export const QuickPosCashDesk: React.FC<QuickPosCashDeskProps> = ({
  invoices,
  onCollectPayment,
  onOpenReceiptPrint,
}) => {
  const { t, formatNumber } = useTranslation('finance');
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<StudentInvoice | null>(null);
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [cashierShift, setCashierShift] = useState<string>('Morning');
  const [remarks, setRemarks] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [lastReceipt, setLastReceipt] = useState<MoneyReceipt | null>(null);

  // Filter invoices with dues based on search query
  const matchingInvoices = invoices.filter((inv) => {
    if (!searchQuery.trim()) return false;
    const q = searchQuery.toLowerCase();
    const nameMatch = (inv.student_name || '').toLowerCase().includes(q);
    const idMatch = (inv.student_uniq_id || '').toLowerCase().includes(q);
    const invMatch = (inv.invoice_number || '').toLowerCase().includes(q);
    const rollMatch = String(inv.student_roll || '').includes(q);
    return (nameMatch || idMatch || invMatch || rollMatch) && Number(inv.due_amount) > 0;
  });

  const handleSelectInvoice = (inv: StudentInvoice) => {
    setSelectedInvoice(inv);
    setAmountPaid(String(inv.due_amount));
    setSearchQuery('');
  };

  const handleProcessCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) {
      showToast('Please search and select a student with outstanding dues.', 'error');
      return;
    }
    const numAmount = parseFloat(amountPaid);
    if (isNaN(numAmount) || numAmount <= 0) {
      showToast('Please enter a valid payment amount.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const receipt = await onCollectPayment({
        student_id: selectedInvoice.student,
        amount_paid: numAmount,
        payment_method: paymentMethod,
        invoice_id: selectedInvoice.id,
        transaction_ref: transactionRef,
        cashier_shift: cashierShift,
        remarks: remarks,
      });

      setLastReceipt(receipt);
      showToast(t('collectionSuccess', 'Payment collected and receipt generated'), 'success');
      
      // Auto open receipt preview
      onOpenReceiptPrint(receipt);

      // Reset form
      setSelectedInvoice(null);
      setAmountPaid('');
      setTransactionRef('');
      setRemarks('');
    } catch (err: any) {
      showToast(err.message || 'Collection failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-5 rounded-2xl border theme-border bg-surface shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-5 pb-4 border-b theme-border">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <BanknotesIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-primary">{t('quickPosCashier', 'Quick POS Cash Desk')}</h3>
            <p className="text-xs text-secondary">High-speed counter collection with instant tamper-proof receipt print</p>
          </div>
        </div>

        {lastReceipt && (
          <button
            type="button"
            onClick={() => onOpenReceiptPrint(lastReceipt)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border theme-border bg-surface-sub hover:bg-elevated text-xs font-medium text-primary transition-colors"
          >
            <PrinterIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>Reprint Last Slip ({lastReceipt.receipt_number})</span>
          </button>
        )}
      </div>

      <form onSubmit={handleProcessCollection} className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <label className="block text-xs font-semibold text-secondary mb-1.5">
            Search Student by Name, Roll, or ID Card Number
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. STU-1002, Abdullah, Roll 12..."
              className="w-full px-4 py-2.5 rounded-xl border theme-border bg-surface-sub text-primary placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 text-sm"
            />
          </div>

          {/* Search Dropdown Results */}
          {matchingInvoices.length > 0 && (
            <div className="absolute z-20 top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-xl border theme-border bg-surface shadow-xl p-1">
              {matchingInvoices.map((inv) => (
                <button
                  key={inv.id}
                  type="button"
                  onClick={() => handleSelectInvoice(inv)}
                  className="w-full p-2.5 rounded-lg text-left hover:bg-surface-sub transition-colors flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="font-semibold text-primary">{inv.student_name} ({inv.student_uniq_id})</div>
                    <div className="text-[11px] text-secondary">Class: {inv.class_name || 'N/A'} • Invoice: {inv.invoice_number}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-amber-400">Due: ৳ {formatNumber(Number(inv.due_amount))}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Student Banner */}
        {selectedInvoice && (
          <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-primary">{selectedInvoice.student_name}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono">
                  {selectedInvoice.student_uniq_id}
                </span>
              </div>
              <div className="text-xs text-secondary mt-1">
                Class: {selectedInvoice.class_name || 'N/A'} • Billing Month: {selectedInvoice.billing_month} • Total Payable: ৳ {formatNumber(Number(selectedInvoice.total_payable))}
              </div>
            </div>

            <div className="text-left sm:text-right shrink-0">
              <span className="text-[11px] text-secondary block">Current Outstanding Due</span>
              <span className="text-lg font-bold text-amber-400">
                ৳ {formatNumber(Number(selectedInvoice.due_amount))}
              </span>
            </div>
          </div>
        )}

        {/* Payment Amount & Method Matrix */}
        <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1.5">
              Payment Amount (৳) *
            </label>
            <input
              type="number"
              step="0.01"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              placeholder="0.00"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border theme-border bg-surface-sub text-primary text-sm font-bold placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-secondary mb-1.5">
              Payment Method *
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full px-3.5 py-2.5 rounded-xl border theme-border bg-surface-sub text-primary text-sm focus:outline-none focus:border-emerald-500/50"
            >
              <option value="CASH">Cash in Hand (Counter)</option>
              <option value="BANK">Bank Deposit / Transfer</option>
              <option value="BKASH">bKash Mobile Money</option>
              <option value="NAGAD">Nagad Mobile Money</option>
              <option value="ROCKET">Rocket (DBBL)</option>
              <option value="CHEQUE">Bank Cheque</option>
              <option value="CARD">Debit / Credit Card</option>
            </select>
          </div>
        </div>

        {paymentMethod !== 'CASH' && (
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1.5">
              Transaction ID / Cheque / Scroll Number
            </label>
            <input
              type="text"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              placeholder="e.g. TRX9928131 or Cheque #019283"
              className="w-full px-3.5 py-2.5 rounded-xl border theme-border bg-surface-sub text-primary text-sm placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-secondary mb-1.5">
            Internal Note / Remarks (Optional)
          </label>
          <input
            type="text"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g. Paid by Guardian / Received at morning counter"
            className="w-full px-3.5 py-2 rounded-xl border theme-border bg-surface-sub text-primary text-sm placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={submitting || !selectedInvoice || !amountPaid}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-md transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <ShieldCheckIcon className="w-4 h-4" />
            <span>{submitting ? 'Processing...' : 'Collect & Generate Secure Receipt'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
