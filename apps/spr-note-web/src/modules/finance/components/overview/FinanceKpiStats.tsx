import React from 'react';
import { useTranslation } from '../../../../i18n';
import type { FinanceKpis } from '../../types';
import { 
  BanknotesIcon, 
  TrendingUpIcon, 
  TrendingDownIcon, 
  InvoiceIcon, 
  WalletIcon, 
  BuildingLibraryIcon 
} from '../../../../components/ui/Icons';

interface FinanceKpiStatsProps {
  kpis: FinanceKpis;
  loading?: boolean;
}

export const FinanceKpiStats: React.FC<FinanceKpiStatsProps> = ({ kpis, loading = false }) => {
  const { t, formatNumber } = useTranslation('finance');

  const stats = [
    {
      id: 'today_collection',
      label: t('todayCollection', "Today's Collection"),
      value: kpis.today_collection,
      prefix: '৳',
      Icon: BanknotesIcon,
      colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      trend: '+ Today Inflow',
      trendPositive: true,
    },
    {
      id: 'month_collection',
      label: t('monthCollection', "This Month's Inflow"),
      value: kpis.month_collection,
      prefix: '৳',
      Icon: TrendingUpIcon,
      colorClass: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      trend: 'Monthly Received',
      trendPositive: true,
    },
    {
      id: 'outstanding_dues',
      label: t('outstandingDues', 'Outstanding Dues'),
      value: kpis.total_outstanding_dues,
      prefix: '৳',
      Icon: InvoiceIcon,
      colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      trend: 'Receivable Dues',
      trendPositive: false,
    },
    {
      id: 'month_expenses',
      label: t('monthlyExpenses', 'Monthly Expenses'),
      value: kpis.month_expenses,
      prefix: '৳',
      Icon: TrendingDownIcon,
      colorClass: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
      trend: 'Operational Outflow',
      trendPositive: false,
    },
    {
      id: 'cash_bank_balance',
      label: t('treasuryBalance', 'Cash & Bank Balance'),
      value: kpis.cash_bank_balance,
      prefix: '৳',
      Icon: BuildingLibraryIcon,
      colorClass: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
      trend: 'Treasury Reserves',
      trendPositive: true,
    },
    {
      id: 'net_surplus',
      label: t('netSurplus', 'Net Surplus / Deficit'),
      value: kpis.net_surplus,
      prefix: '৳',
      Icon: WalletIcon,
      colorClass: kpis.net_surplus >= 0 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-rose-400 bg-rose-500/10 border-rose-500/20',
      trend: kpis.net_surplus >= 0 ? 'Surplus' : 'Deficit',
      trendPositive: kpis.net_surplus >= 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
      {stats.map((item) => {
        const IconComponent = item.Icon;
        return (
          <div
            key={item.id}
            className="p-4 rounded-xl border theme-border bg-surface hover:border-zinc-700 transition-all duration-200 flex flex-col justify-between shadow-sm relative overflow-hidden group"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-medium text-secondary truncate">{item.label}</span>
              <div className={`p-2 rounded-lg border shrink-0 ${item.colorClass}`}>
                <IconComponent className="w-4 h-4" />
              </div>
            </div>

            <div className="flex flex-col">
              {loading ? (
                <div className="h-7 w-28 bg-zinc-800 animate-pulse rounded my-1" />
              ) : (
                <span className="text-xl font-bold tracking-tight text-primary">
                  {item.prefix} {formatNumber(item.value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }))}
                </span>
              )}
              <span className={`text-[11px] font-medium mt-1 ${item.trendPositive ? 'text-emerald-400' : 'text-amber-400'}`}>
                {item.trend}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
