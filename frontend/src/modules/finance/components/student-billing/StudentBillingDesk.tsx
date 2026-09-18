import React, { useState } from 'react';
import { useTranslation } from '../../../../i18n';
import type { StudentInvoice, InvoiceStatus } from '../../types';
import { 
  InvoiceIcon, 
  BanknotesIcon, 
  PrinterIcon 
} from '../../../../components/ui/Icons';

interface StudentBillingDeskProps {
  invoices: StudentInvoice[];
  loading?: boolean;
  onOpenLedger: (studentId: string, studentName: string) => void;
  onOpenCollect: (invoice: StudentInvoice) => void;
}

export const StudentBillingDesk: React.FC<StudentBillingDeskProps> = ({
  invoices,
  loading = false,
  onOpenLedger,
  onOpenCollect,
}) => {
  const { t, formatNumber } = useTranslation('finance');

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredInvoices = invoices.filter((inv) => {
    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    const q = searchTerm.toLowerCase();
    const matchesSearch = 
      (inv.student_name || '').toLowerCase().includes(q) ||
      (inv.student_uniq_id || '').toLowerCase().includes(q) ||
      (inv.invoice_number || '').toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case 'PAID':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Paid</span>;
      case 'PARTIAL':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">Partial</span>;
      case 'OVERDUE':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">Overdue</span>;
      case 'WAIVED':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">100% Waived</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">Unpaid</span>;
    }
  };

  return (
    <div className="rounded-2xl border theme-border bg-surface shadow-sm overflow-hidden">
      {/* Table Header & Controls */}
      <div className="p-4 border-b theme-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface-sub">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter by student, ID, or invoice..."
            className="px-3.5 py-1.5 rounded-xl border theme-border bg-surface text-primary text-xs focus:outline-none focus:border-indigo-500 w-full sm:w-64"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'UNPAID', 'PARTIAL', 'OVERDUE', 'PAID'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'border theme-border bg-surface text-secondary hover:text-primary hover:bg-elevated'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b theme-border bg-surface-sub/50 text-secondary uppercase font-semibold text-[10px] tracking-wider">
            <tr>
              <th className="px-4 py-3">Invoice #</th>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Month</th>
              <th className="px-4 py-3 text-right">Payable</th>
              <th className="px-4 py-3 text-right">Paid</th>
              <th className="px-4 py-3 text-right">Due</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y theme-border text-primary">
            {loading ? (
              [1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={8} className="px-4 py-3">
                    <div className="h-5 bg-zinc-800/40 rounded" />
                  </td>
                </tr>
              ))
            ) : filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-xs text-secondary">
                  No billing invoices found matching your filters.
                </td>
              </tr>
            ) : (
              filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-surface-sub/60 transition-colors">
                  <td className="px-4 py-3 font-mono font-medium text-indigo-400">
                    {inv.invoice_number}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{inv.student_name}</div>
                    <div className="text-[11px] text-secondary font-mono">
                      {inv.student_uniq_id} • Class: {inv.class_name || 'N/A'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-secondary">
                    {inv.billing_month}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    ৳ {formatNumber(Number(inv.total_payable))}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-emerald-400">
                    ৳ {formatNumber(Number(inv.paid_amount))}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-amber-400">
                    ৳ {formatNumber(Number(inv.due_amount))}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {getStatusBadge(inv.status)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {Number(inv.due_amount) > 0 && (
                        <button
                          type="button"
                          onClick={() => onOpenCollect(inv)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium transition-colors flex items-center gap-1 shadow-xs"
                        >
                          <BanknotesIcon className="w-3 h-3" />
                          <span>Collect</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenLedger(inv.student, inv.student_name || inv.student_uniq_id || 'Student')}
                        className="px-2.5 py-1 rounded-lg border theme-border bg-surface-sub hover:bg-elevated text-secondary hover:text-primary text-[11px] font-medium transition-colors"
                      >
                        Ledger
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
