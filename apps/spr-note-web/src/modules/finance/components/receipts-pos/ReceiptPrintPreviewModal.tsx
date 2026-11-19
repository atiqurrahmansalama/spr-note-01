import React from 'react';
import { useTranslation } from '../../../../i18n';
import type { MoneyReceipt } from '../../types';
import { PrinterIcon, ShieldCheckIcon } from '../../../../components/ui/Icons';
import QrCodeBadge from '../../../../components/common/QrCodeBadge';

interface ReceiptPrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: MoneyReceipt | null;
  printFormat: 'A4' | 'POS_80MM';
  onFormatChange: (format: 'A4' | 'POS_80MM') => void;
  onPrint: () => void;
}

export const ReceiptPrintPreviewModal: React.FC<ReceiptPrintPreviewModalProps> = ({
  isOpen,
  onClose,
  receipt,
  printFormat,
  onFormatChange,
  onPrint,
}) => {
  const { t, formatNumber } = useTranslation('finance');

  if (!isOpen || !receipt) return null;

  const verificationUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/verify-receipt/${receipt.receipt_number}?token=${receipt.qr_verification_token}`;

  const renderReceiptSlip = (copyTitle: string) => (
    <div className="p-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-xs space-y-3 shadow-xs">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
        <div>
          <h4 className="font-bold text-sm tracking-tight">SPR Institutional Academy</h4>
          <p className="text-[10px] text-zinc-500">Official Money Receipt • {copyTitle}</p>
        </div>
        <div className="text-right font-mono text-[11px]">
          <span className="font-bold text-emerald-600 dark:text-emerald-400">{receipt.receipt_number}</span>
          <span className="text-[10px] text-zinc-500 block">{receipt.payment_date}</span>
        </div>
      </div>

      {/* Student Meta */}
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <span className="text-zinc-500 block">Student Name:</span>
          <span className="font-bold">{receipt.student_name}</span>
        </div>
        <div className="text-right">
          <span className="text-zinc-500 block">Student ID / Roll:</span>
          <span className="font-mono font-semibold">{receipt.student_uniq_id}</span>
        </div>
      </div>

      {/* Amount & Method */}
      <div className="p-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/60 flex items-center justify-between">
        <div>
          <span className="text-[10px] text-zinc-500 block">Payment Method:</span>
          <span className="font-semibold">{receipt.payment_method} {receipt.transaction_ref ? `(${receipt.transaction_ref})` : ''}</span>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-zinc-500 block">Amount Paid:</span>
          <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
            ৳ {formatNumber(Number(receipt.amount_paid))}
          </span>
        </div>
      </div>

      {/* QR & Verification Seal */}
      <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <div className="text-[9px] text-zinc-500 space-y-0.5">
          <span className="block font-mono">Hash: {receipt.security_hash?.slice(0, 16)}...</span>
          <span className="block text-emerald-600 dark:text-emerald-400 font-semibold">✓ Genuine Verified Receipt</span>
          <span className="block">Cashier: {receipt.collected_by_name || 'Accounts Desk'}</span>
        </div>
        <div className="shrink-0">
          <QrCodeBadge value={verificationUrl} size={48} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-surface border theme-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Controls Bar */}
        <div className="p-4 border-b theme-border bg-surface-sub flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <PrinterIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-primary">Print Money Receipt - {receipt.receipt_number}</h3>
              <p className="text-[11px] text-secondary">Multi-copy voucher slips & POS thermal support</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border theme-border bg-surface p-0.5 text-xs">
              <button
                type="button"
                onClick={() => onFormatChange('A4')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  printFormat === 'A4' ? 'bg-indigo-600 text-white font-semibold' : 'text-secondary hover:text-primary'
                }`}
              >
                A4 Multi-Copy (2-Up)
              </button>
              <button
                type="button"
                onClick={() => onFormatChange('POS_80MM')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  printFormat === 'POS_80MM' ? 'bg-indigo-600 text-white font-semibold' : 'text-secondary hover:text-primary'
                }`}
              >
                POS Thermal (80mm)
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-surface text-secondary hover:text-primary transition-colors text-xs font-semibold ml-2"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-surface-sub/30">
          {printFormat === 'A4' ? (
            <div className="space-y-4 max-w-xl mx-auto">
              {renderReceiptSlip('Student Copy')}
              <div className="border-t-2 border-dashed border-zinc-700/60 my-2 text-center text-[10px] text-zinc-500">
                ✂ Cut here
              </div>
              {renderReceiptSlip('Office Copy')}
            </div>
          ) : (
            <div className="max-w-xs mx-auto">
              {renderReceiptSlip('Original POS Slip')}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t theme-border bg-surface-sub flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-secondary">
            <ShieldCheckIcon className="w-4 h-4 text-emerald-400" />
            <span>Printed {receipt.print_count || 0} times • Tamper-proof QR enabled</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border theme-border bg-surface text-secondary hover:text-primary text-xs font-medium transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={onPrint}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-colors flex items-center gap-1.5"
            >
              <PrinterIcon className="w-4 h-4" />
              <span>Print Official Receipt</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
