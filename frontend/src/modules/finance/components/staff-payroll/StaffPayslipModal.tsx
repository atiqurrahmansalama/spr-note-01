import React from 'react';
import { useTranslation } from '../../../../i18n';
import type { StaffPayslip } from '../../types';
import { PrinterIcon, CalculatorIcon, QrCodeIcon } from '../../../../components/ui/Icons';
import QrCodeBadge from '../../../../components/common/QrCodeBadge';

interface StaffPayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  payslip: StaffPayslip | null;
}

export const StaffPayslipModal: React.FC<StaffPayslipModalProps> = ({
  isOpen,
  onClose,
  payslip,
}) => {
  const { t, formatNumber } = useTranslation('finance');

  if (!isOpen || !payslip) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-surface border theme-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b theme-border bg-surface-sub flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <CalculatorIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-primary">Monthly Pay Slip - {payslip.payslip_number}</h3>
              <p className="text-[11px] text-secondary">Verified Institutional Salary Statement</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface text-secondary hover:text-primary transition-colors text-xs font-semibold"
          >
            ✕
          </button>
        </div>

        {/* Printable Payslip Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-surface">
          {/* Employee Meta */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border theme-border bg-surface-sub text-xs">
            <div>
              <span className="text-[11px] text-secondary block">Employee Name</span>
              <span className="font-bold text-primary">{payslip.staff_name || 'Staff Member'}</span>
              <span className="text-[11px] text-secondary font-mono block mt-1">ID: {payslip.staff_employee_id}</span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-secondary block">Designation / Dept</span>
              <span className="font-semibold text-primary">{payslip.designation || 'Faculty'}</span>
              <span className="text-[11px] text-secondary block mt-1">{payslip.department_name || 'Academic'}</span>
            </div>
          </div>

          {/* Salary Breakdown Matrix */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            {/* Earnings */}
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-2">
              <span className="font-bold text-emerald-400 uppercase tracking-wider text-[11px] block border-b border-emerald-500/20 pb-1.5">
                Earnings & Allowances
              </span>
              <div className="flex justify-between">
                <span className="text-secondary">Basic Salary</span>
                <span className="font-semibold text-primary">৳ {formatNumber(Number(payslip.base_salary))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Other Allowances</span>
                <span className="font-semibold text-primary">৳ {formatNumber(Number(payslip.total_allowances))}</span>
              </div>
            </div>

            {/* Deductions */}
            <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-2">
              <span className="font-bold text-rose-400 uppercase tracking-wider text-[11px] block border-b border-rose-500/20 pb-1.5">
                Deductions & Advances
              </span>
              <div className="flex justify-between">
                <span className="text-secondary">Advance Deduction</span>
                <span className="font-semibold text-rose-400">- ৳ {formatNumber(Number(payslip.advance_deduction))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Other Deductions</span>
                <span className="font-semibold text-rose-400">- ৳ {formatNumber(Number(payslip.total_deductions) - Number(payslip.advance_deduction))}</span>
              </div>
            </div>
          </div>

          {/* Net Payable Highlight */}
          <div className="p-4 rounded-xl border border-sky-500/30 bg-sky-500/10 flex items-center justify-between">
            <span className="text-sm font-bold text-primary">Net Salary Payable</span>
            <span className="text-xl font-extrabold text-sky-400 font-mono">
              ৳ {formatNumber(Number(payslip.net_payable))}
            </span>
          </div>

          {/* QR Verification Seal */}
          <div className="p-4 rounded-xl border theme-border bg-surface-sub flex items-center justify-between gap-4">
            <div className="text-xs space-y-1">
              <span className="font-bold text-primary block">Tamper-Proof Verification Token</span>
              <span className="font-mono text-[10px] text-secondary break-all block">{payslip.security_hash || payslip.qr_verification_token}</span>
              <span className="text-[11px] text-emerald-400 font-medium">Digital Audit Authenticity Certified</span>
            </div>
            <div className="shrink-0">
              <QrCodeBadge value={payslip.qr_verification_token || payslip.payslip_number} size={64} />
            </div>
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
            <span>Print Payslip</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
