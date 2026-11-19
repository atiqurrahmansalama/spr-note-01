import React, { useState } from 'react';
import { useTranslation } from '../../../../i18n';
import type { FinancialVoucher, VoucherType } from '../../types';
import { ScaleIcon, ChevronIcon } from '../../../../components/ui/Icons';

interface VoucherManagementDeskProps {
  vouchers: FinancialVoucher[];
  loading?: boolean;
}

export const VoucherManagementDesk: React.FC<VoucherManagementDeskProps> = ({
  vouchers,
  loading = false,
}) => {
  const { t, formatNumber } = useTranslation('finance');

  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedVoucherId, setExpandedVoucherId] = useState<string | null>(null);

  const filteredVouchers = vouchers.filter((v) => {
    const matchesType = typeFilter === 'ALL' || v.voucher_type === typeFilter;
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      v.voucher_number.toLowerCase().includes(q) ||
      (v.narration || '').toLowerCase().includes(q) ||
      (v.reference_no || '').toLowerCase().includes(q);
    return matchesType && matchesSearch;
  });

  const getVoucherTypeBadge = (vType: VoucherType) => {
    switch (vType) {
      case 'PV':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">PV (Payment)</span>;
      case 'RV':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">RV (Receipt)</span>;
      case 'CV':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">CV (Contra)</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">JV (Journal)</span>;
    }
  };

  return (
    <div className="rounded-2xl border theme-border bg-surface shadow-sm overflow-hidden">
      {/* Controls */}
      <div className="p-4 border-b theme-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface-sub">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by voucher #, memo, or ref..."
            className="px-3.5 py-1.5 rounded-xl border theme-border bg-surface text-primary text-xs focus:outline-none focus:border-purple-500 w-full sm:w-64"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'JV', 'PV', 'RV', 'CV'] as const).map((vt) => (
            <button
              key={vt}
              type="button"
              onClick={() => setTypeFilter(vt)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                typeFilter === vt
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'border theme-border bg-surface text-secondary hover:text-primary hover:bg-elevated'
              }`}
            >
              {vt}
            </button>
          ))}
        </div>
      </div>

      {/* Vouchers Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b theme-border bg-surface-sub/50 text-secondary uppercase font-semibold text-[10px] tracking-wider">
            <tr>
              <th className="px-4 py-3">Voucher #</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Narration / Memo</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Entries</th>
            </tr>
          </thead>
          <tbody className="divide-y theme-border text-primary">
            {loading ? (
              [1, 2, 3, 4].map((i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={7} className="px-4 py-3">
                    <div className="h-5 bg-zinc-800/40 rounded" />
                  </td>
                </tr>
              ))
            ) : filteredVouchers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-xs text-secondary">
                  No financial vouchers posted yet.
                </td>
              </tr>
            ) : (
              filteredVouchers.map((vch) => (
                <React.Fragment key={vch.id}>
                  <tr
                    onClick={() => setExpandedVoucherId(expandedVoucherId === vch.id ? null : vch.id)}
                    className="hover:bg-surface-sub/60 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 font-mono font-medium text-purple-400">
                      {vch.voucher_number}
                    </td>
                    <td className="px-4 py-3">
                      {getVoucherTypeBadge(vch.voucher_type)}
                    </td>
                    <td className="px-4 py-3 text-secondary">
                      {vch.date}
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate">
                      {vch.narration}
                    </td>
                    <td className="px-4 py-3 text-right font-bold">
                      ৳ {formatNumber(Number(vch.total_amount))}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {vch.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        className="p-1 rounded text-secondary hover:text-primary"
                      >
                        <ChevronIcon isOpen={expandedVoucherId === vch.id} className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>

                  {/* Expanded Double-Entry Breakdown */}
                  {expandedVoucherId === vch.id && (
                    <tr className="bg-surface-sub/90">
                      <td colSpan={7} className="p-4 border-y theme-border">
                        <div className="space-y-2">
                          <span className="text-[11px] font-bold text-secondary uppercase tracking-wider block">
                            Double-Entry Ledger Lines
                          </span>
                          <div className="space-y-1">
                            {vch.entries.map((entry, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-xs p-2 rounded-lg bg-surface border theme-border"
                              >
                                <div className="flex items-center gap-2">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    entry.entry_type === 'DEBIT' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-indigo-500/10 text-indigo-400'
                                  }`}>
                                    {entry.entry_type === 'DEBIT' ? 'Dr' : 'Cr'}
                                  </span>
                                  <span className="font-semibold text-primary">{entry.account_name}</span>
                                  <span className="text-[10px] text-secondary font-mono">({entry.account_code})</span>
                                </div>
                                <span className="font-bold text-primary font-mono">
                                  ৳ {formatNumber(Number(entry.amount))}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
