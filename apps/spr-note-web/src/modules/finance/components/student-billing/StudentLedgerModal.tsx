import React from 'react';
import { useTranslation } from '../../../../i18n';
import type { StudentInvoice, MoneyReceipt } from '../../types';
import { PrinterIcon, InvoiceIcon, BanknotesIcon } from '../../../../components/ui/Icons';

interface StudentLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  invoices: StudentInvoice[];
  receipts: MoneyReceipt[];
}

export const StudentLedgerModal: React.FC<StudentLedgerModalProps> = ({
  isOpen,
  onClose,
  studentId,
  studentName,
  invoices,
  receipts,
}) => {
  const { t, formatNumber } = useTranslation('finance');

  if (!isOpen) return null;

  const studentInvoices = invoices.filter((i) => i.student === studentId);
  const studentReceipts = receipts.filter((r) => r.student === studentId);

  const totalBilled = studentInvoices.reduce((sum, i) => sum + Number(i.total_payable || 0), 0);
  const totalPaid = studentReceipts.reduce((sum, r) => sum + Number(r.amount_paid || 0), 0);
  const totalDue = Math.max(0, totalBilled - totalPaid);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-surface border theme-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b theme-border bg-surface-sub flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <InvoiceIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-primary">{studentName} - Account Statement Ledger</h3>
              <p className="text-xs text-secondary">Complete billing history, payments, and running balance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface text-secondary hover:text-primary transition-colors text-sm font-semibold"
          >
            ✕
          </button>
        </div>

        {/* Balance KPI Ribbon */}
        <div className="grid grid-cols-3 divide-x theme-border border-b theme-border bg-surface p-4 text-center">
          <div>
            <span className="text-[11px] text-secondary font-medium block">Total Invoiced</span>
            <span className="text-base font-bold text-primary">৳ {formatNumber(totalBilled)}</span>
          </div>
          <div>
            <span className="text-[11px] text-secondary font-medium block">Total Paid</span>
            <span className="text-base font-bold text-emerald-400">৳ {formatNumber(totalPaid)}</span>
          </div>
          <div>
            <span className="text-[11px] text-secondary font-medium block">Outstanding Balance</span>
            <span className="text-base font-bold text-amber-400">৳ {formatNumber(totalDue)}</span>
          </div>
        </div>

        {/* Ledger Entries List */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">Invoices & Charges</h4>
          <div className="space-y-2">
            {studentInvoices.length === 0 ? (
              <p className="text-xs text-secondary py-2">No invoices generated yet.</p>
            ) : (
              studentInvoices.map((inv) => (
                <div key={inv.id} className="p-3 rounded-xl border theme-border bg-surface-sub flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-primary">{inv.invoice_number} ({inv.billing_month})</span>
                    <div className="text-[11px] text-secondary mt-0.5">Due Date: {inv.due_date} • Status: {inv.status}</div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-primary">৳ {formatNumber(Number(inv.total_payable))}</span>
                    <div className="text-[11px] text-emerald-400">Paid: ৳ {formatNumber(Number(inv.paid_amount))}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <h4 className="text-xs font-semibold text-primary uppercase tracking-wider pt-3">Payments & Money Receipts</h4>
          <div className="space-y-2">
            {studentReceipts.length === 0 ? (
              <p className="text-xs text-secondary py-2">No payment receipts on record.</p>
            ) : (
              studentReceipts.map((rec) => (
                <div key={rec.id} className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-emerald-400">{rec.receipt_number}</span>
                    <div className="text-[11px] text-secondary mt-0.5">Date: {rec.payment_date} • Method: {rec.payment_method}</div>
                  </div>
                  <div className="text-right font-bold text-emerald-400 text-sm">
                    ৳ {formatNumber(Number(rec.amount_paid))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t theme-border bg-surface-sub flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 rounded-xl border theme-border bg-surface text-secondary hover:text-primary text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <PrinterIcon className="w-3.5 h-3.5" />
            <span>Print Statement</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
