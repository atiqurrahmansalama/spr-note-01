import React, { useState } from 'react';
import { useTranslation } from '../../../../i18n';
import type { StaffPayrollRun, StaffPayslip } from '../../types';
import { CalculatorIcon, PrinterIcon, ShieldCheckIcon } from '../../../../components/ui/Icons';

interface StaffPayrollRosterProps {
  payrollRuns: StaffPayrollRun[];
  payslips: StaffPayslip[];
  loading?: boolean;
  onOpenPayslip: (slip: StaffPayslip) => void;
  onOpenRunPayroll: () => void;
  onOpenAdvance: () => void;
}

export const StaffPayrollRoster: React.FC<StaffPayrollRosterProps> = ({
  payrollRuns,
  payslips,
  loading = false,
  onOpenPayslip,
  onOpenRunPayroll,
  onOpenAdvance,
}) => {
  const { t, formatNumber } = useTranslation('finance');

  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredPayslips = payslips.filter((slip) => {
    const q = searchTerm.toLowerCase();
    return (
      (slip.staff_name || '').toLowerCase().includes(q) ||
      (slip.staff_employee_id || '').toLowerCase().includes(q) ||
      (slip.payslip_number || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Top Banner & Batch Runs */}
      <div className="p-4 rounded-2xl border theme-border bg-surface shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <CalculatorIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-primary">{t('tabStaffPayroll', 'Staff Payroll & Compensation')}</h3>
            <p className="text-xs text-secondary">Automated monthly salary disbursement, allowances, advances, and payslips</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenAdvance}
            className="px-3.5 py-2 rounded-xl border theme-border bg-surface-sub hover:bg-elevated text-secondary hover:text-primary text-xs font-medium transition-colors"
          >
            Salary Advance
          </button>
          <button
            type="button"
            onClick={onOpenRunPayroll}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            + Run Monthly Payroll
          </button>
        </div>
      </div>

      {/* Payslips Table */}
      <div className="rounded-2xl border theme-border bg-surface shadow-sm overflow-hidden">
        <div className="p-4 border-b theme-border flex items-center justify-between gap-3 bg-surface-sub">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search employee, ID, or payslip #..."
            className="px-3.5 py-1.5 rounded-xl border theme-border bg-surface text-primary text-xs focus:outline-none focus:border-sky-500 w-full sm:w-64"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b theme-border bg-surface-sub/50 text-secondary uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3">Payslip #</th>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Designation</th>
                <th className="px-4 py-3 text-right">Base</th>
                <th className="px-4 py-3 text-right">Allowances</th>
                <th className="px-4 py-3 text-right">Deductions</th>
                <th className="px-4 py-3 text-right">Net Pay</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y theme-border text-primary">
              {loading ? (
                [1, 2, 3, 4].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={9} className="px-4 py-3">
                      <div className="h-5 bg-zinc-800/40 rounded" />
                    </td>
                  </tr>
                ))
              ) : filteredPayslips.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-xs text-secondary">
                    No staff payslips generated yet. Click "Run Monthly Payroll" to disburse.
                  </td>
                </tr>
              ) : (
                filteredPayslips.map((slip) => (
                  <tr key={slip.id} className="hover:bg-surface-sub/60 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-sky-400">
                      {slip.payslip_number}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{slip.staff_name || 'Staff Member'}</div>
                      <div className="text-[11px] text-secondary font-mono">{slip.staff_employee_id}</div>
                    </td>
                    <td className="px-4 py-3 text-secondary">
                      {slip.designation || 'Faculty'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      ৳ {formatNumber(Number(slip.base_salary))}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-400">
                      + ৳ {formatNumber(Number(slip.total_allowances))}
                    </td>
                    <td className="px-4 py-3 text-right text-rose-400">
                      - ৳ {formatNumber(Number(slip.total_deductions))}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-sky-400">
                      ৳ {formatNumber(Number(slip.net_payable))}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {slip.payment_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onOpenPayslip(slip)}
                        className="px-2.5 py-1 rounded-lg border theme-border bg-surface-sub hover:bg-elevated text-secondary hover:text-primary text-[11px] font-medium transition-colors flex items-center gap-1 inline-flex"
                      >
                        <PrinterIcon className="w-3 h-3" />
                        <span>Payslip</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
