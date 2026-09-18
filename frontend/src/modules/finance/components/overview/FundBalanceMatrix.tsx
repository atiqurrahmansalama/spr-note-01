import React from 'react';
import { useTranslation } from '../../../../i18n';
import type { InstitutionalFund } from '../../types';
import { BuildingLibraryIcon } from '../../../../components/ui/Icons';

interface FundBalanceMatrixProps {
  funds: InstitutionalFund[];
  loading?: boolean;
}

export const FundBalanceMatrix: React.FC<FundBalanceMatrixProps> = ({ funds, loading = false }) => {
  const { t, formatNumber } = useTranslation('finance');

  return (
    <div className="p-4 rounded-2xl border theme-border bg-surface shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b theme-border">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <BuildingLibraryIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-primary">Institutional Funds & Capital</h3>
            <p className="text-xs text-secondary">Multi-fund segregated capital accounts</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {loading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-zinc-800/40 animate-pulse rounded-xl" />
          ))
        ) : funds.length === 0 ? (
          <div className="col-span-full py-6 text-center text-xs text-secondary">
            No segregated funds registered.
          </div>
        ) : (
          funds.map((fund) => (
            <div
              key={fund.id}
              className="p-3.5 rounded-xl border theme-border bg-surface-sub hover:border-zinc-700 transition-colors flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-medium text-primary line-clamp-1">{fund.name}</span>
                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-800 text-secondary border border-zinc-700/60 shrink-0">
                  {fund.fund_code}
                </span>
              </div>
              <div className="mt-3">
                <span className="text-base font-bold text-primary">
                  ৳ {formatNumber(Number(fund.current_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }))}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
