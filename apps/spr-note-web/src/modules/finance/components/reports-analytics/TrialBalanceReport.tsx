import React, { useEffect } from 'react';
import { useTranslation } from '../../../../i18n';
import type { TrialBalanceReportData } from '../../types';
import { ScaleIcon, PrinterIcon } from '../../../../components/ui/Icons';

interface TrialBalanceReportProps {
  data: TrialBalanceReportData | null;
  loading?: boolean;
  onFetch: () => void;
}

export const TrialBalanceReport: React.FC<TrialBalanceReportProps> = ({
  data,
  loading = false,
  onFetch,
}) => {
  const { t, formatNumber } = useTranslation('finance');

  useEffect(() => {
    onFetch();
  }, [onFetch]);

  return (
    <div className="rounded-2xl border theme-border bg-surface shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b theme-border bg-surface-sub flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <ScaleIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-primary">{t('trialBalance', 'Trial Balance (রেওয়ামিল)')}</h3>
            <p className="text-xs text-secondary">Debit and Credit balancing ledger verification statement</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="px-3 py-1.5 rounded-lg border theme-border bg-surface hover:bg-elevated text-secondary hover:text-primary text-xs font-medium transition-colors flex items-center gap-1.5"
        >
          <PrinterIcon className="w-3.5 h-3.5" />
          <span>Print Report</span>
        </button>
      </div>

      {/* Report Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b theme-border bg-surface-sub/50 text-secondary uppercase font-semibold text-[10px] tracking-wider">
            <tr>
              <th className="px-4 py-3">Account Code</th>
              <th className="px-4 py-3">Account Head</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3 text-right">Debit (Dr) ৳</th>
              <th className="px-4 py-3 text-right">Credit (Cr) ৳</th>
            </tr>
          </thead>
          <tbody className="divide-y theme-border text-primary">
            {loading || !data ? (
              [1, 2, 3, 4].map((i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={5} className="px-4 py-3">
                    <div className="h-5 bg-zinc-800/40 rounded" />
                  </td>
                </tr>
              ))
            ) : data.accounts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-xs text-secondary">
                  No active accounts found in Trial Balance.
                </td>
              </tr>
            ) : (
              data.accounts.map((acc) => (
                <tr key={acc.id} className="hover:bg-surface-sub/60 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-purple-400 font-medium">
                    {acc.code}
                  </td>
                  <td className="px-4 py-2.5 font-semibold">
                    {acc.name}
                  </td>
                  <td className="px-4 py-2.5 text-secondary text-[11px]">
                    {acc.category}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-medium">
                    {acc.debit > 0 ? `৳ ${formatNumber(acc.debit)}` : '-'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-medium">
                    {acc.credit > 0 ? `৳ ${formatNumber(acc.credit)}` : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {data && (
            <tfoot className="border-t-2 theme-border bg-surface-sub font-bold text-xs">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-primary uppercase">
                  Grand Total
                </td>
                <td className="px-4 py-3 text-right text-emerald-400 font-mono text-sm">
                  ৳ {formatNumber(data.total_debit)}
                </td>
                <td className="px-4 py-3 text-right text-emerald-400 font-mono text-sm">
                  ৳ {formatNumber(data.total_credit)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};
