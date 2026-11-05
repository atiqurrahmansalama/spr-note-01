import React from 'react';
import { useTranslation } from '../../../../i18n';
import type { FinanceOverviewData } from '../../types';
import { BanknotesIcon } from '../../../../components/ui/Icons';

export interface FinanceCollectionWidgetProps {
  data?: FinanceOverviewData;
  title?: string;
  onViewLedger?: () => void;
  className?: string;
}

export default function FinanceCollectionWidget({
  data,
  title,
  onViewLedger,
  className = '',
}: FinanceCollectionWidgetProps) {
  const { t, formatNumber } = useTranslation('dashboard');

  const finance: FinanceOverviewData = data || {
    todayCollection: 48500,
    monthlyTotal: 412000,
    pendingDues: 86500,
    collectionRate: 83,
    recentTransactions: [
      { id: 'tx-1', studentName: 'Zubair Ahmed', studentClass: 'Hifz Senior', amount: 4500, method: 'Bkash', time: '10:45 AM' },
      { id: 'tx-2', studentName: 'Omar Farooq', studentClass: 'Mizan Class', amount: 3000, method: 'Cash', time: '11:20 AM' },
      { id: 'tx-3', studentName: 'Anas Mahmud', studentClass: 'Noorani Foundation', amount: 5000, method: 'Bank', time: '01:15 PM' },
    ],
  };

  return (
    <div className={`p-5 rounded-2xl theme-bg-surface border theme-border shadow-xs space-y-4 select-none ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b theme-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <BanknotesIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold theme-text-primary leading-tight">
              {title || t('financeOverview', 'Finance & Fee Collection')}
            </h3>
            <p className="text-[11px] theme-text-secondary mt-0.5">
              Monthly Rate: <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatNumber(finance.collectionRate)}%</span>
            </p>
          </div>
        </div>

        {onViewLedger && (
          <button
            type="button"
            onClick={onViewLedger}
            className="px-3 py-1.5 rounded-xl theme-bg-sub hover:theme-bg-elevated border theme-border text-xs font-semibold theme-text-primary transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>{t('viewReport', 'Ledger')}</span>
            <span className="text-[10px]">→</span>
          </button>
        )}
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-3.5 rounded-xl theme-bg-sub border theme-border space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
            Today's Inflow
          </span>
          <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
            ৳ {formatNumber(finance.todayCollection)}
          </div>
        </div>

        <div className="p-3.5 rounded-xl theme-bg-sub border theme-border space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
            Unpaid Tuition
          </span>
          <div className="text-lg font-bold font-mono text-rose-600 dark:text-rose-400">
            ৳ {formatNumber(finance.pendingDues)}
          </div>
        </div>
      </div>

      {/* Mini Recent Transactions */}
      <div className="space-y-2 pt-1">
        <span className="text-[11px] font-bold uppercase tracking-wider theme-text-secondary block">
          Recent Receipts
        </span>
        <div className="space-y-1.5">
          {finance.recentTransactions.map((tx) => (
            <div
              key={tx.id}
              className="px-3 py-2 rounded-xl theme-bg-sub/50 border theme-border flex items-center justify-between text-xs"
            >
              <div className="truncate">
                <span className="font-semibold theme-text-primary block truncate">{tx.studentName}</span>
                <span className="text-[10px] theme-text-muted">{tx.studentClass} • {tx.method}</span>
              </div>
              <div className="text-right shrink-0 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                +৳{formatNumber(tx.amount)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
