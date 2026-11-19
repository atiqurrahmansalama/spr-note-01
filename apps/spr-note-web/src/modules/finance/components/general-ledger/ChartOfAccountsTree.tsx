import React, { useState } from 'react';
import { useTranslation } from '../../../../i18n';
import type { ChartOfAccount, AccountCategory } from '../../types';
import { ScaleIcon, BuildingLibraryIcon, ChevronIcon } from '../../../../components/ui/Icons';

interface ChartOfAccountsTreeProps {
  accounts: ChartOfAccount[];
  loading?: boolean;
  onSelectAccount?: (account: ChartOfAccount) => void;
}

export const ChartOfAccountsTree: React.FC<ChartOfAccountsTreeProps> = ({
  accounts,
  loading = false,
  onSelectAccount,
}) => {
  const { t, formatNumber } = useTranslation('finance');
  const [selectedCategory, setSelectedCategory] = useState<AccountCategory | 'ALL'>('ALL');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    '1000': true,
    '2000': true,
    '3000': true,
    '4000': true,
    '5000': true,
    '1100': true,
    '2100': true,
  });

  const toggleNode = (code: string) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [code]: !prev[code],
    }));
  };

  const categories: { id: AccountCategory | 'ALL'; label: string; color: string }[] = [
    { id: 'ALL', label: 'All Categories', color: 'bg-zinc-800 text-secondary' },
    { id: 'ASSET', label: '1000 Assets', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    { id: 'LIABILITY', label: '2000 Liabilities', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    { id: 'EQUITY', label: '3000 Equity & Funds', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    { id: 'REVENUE', label: '4000 Revenue & Income', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
    { id: 'EXPENSE', label: '5000 Expenses', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  ];

  const filteredAccounts = accounts.filter(
    (acc) => selectedCategory === 'ALL' || acc.category === selectedCategory
  );

  return (
    <div className="rounded-2xl border theme-border bg-surface shadow-sm overflow-hidden">
      {/* Category Filter Bar */}
      <div className="p-4 border-b theme-border bg-surface-sub flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <ScaleIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-primary">{t('chartOfAccounts', 'Chart of Accounts (COA)')}</h3>
            <p className="text-xs text-secondary">5-Tier hierarchical institutional general ledger tree</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                selectedCategory === cat.id
                  ? 'bg-purple-600 text-white border-purple-500 shadow-xs'
                  : 'theme-border bg-surface text-secondary hover:text-primary hover:bg-elevated'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* COA Tree List */}
      <div className="p-4 divide-y theme-border max-h-[600px] overflow-y-auto">
        {loading ? (
          [1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="py-3 animate-pulse">
              <div className="h-6 bg-zinc-800/40 rounded w-3/4" />
            </div>
          ))
        ) : filteredAccounts.length === 0 ? (
          <div className="py-8 text-center text-xs text-secondary">
            No accounts found in this category.
          </div>
        ) : (
          filteredAccounts.map((acc) => {
            const isParent = acc.is_group || (acc.sub_accounts_count || 0) > 0;
            const isChild = !!acc.parent_account;

            return (
              <div
                key={acc.id}
                onClick={() => onSelectAccount && onSelectAccount(acc)}
                className={`py-3 px-3 rounded-xl hover:bg-surface-sub transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                  isChild ? 'ml-6 border-l-2 border-zinc-700/50 pl-4' : 'font-semibold'
                }`}
              >
                <div className="flex items-center gap-3">
                  {isParent && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleNode(acc.code);
                      }}
                      className="p-1 rounded hover:bg-zinc-700 text-secondary"
                    >
                      <ChevronIcon isOpen={!!expandedNodes[acc.code]} className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <span className="font-mono text-xs font-bold text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                    {acc.code}
                  </span>
                  <div>
                    <span className="text-xs text-primary">{acc.name_en}</span>
                    {acc.fund_name && (
                      <span className="text-[10px] text-secondary ml-2 font-normal">
                        ({acc.fund_name})
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-primary font-mono">
                    ৳ {formatNumber(Number(acc.current_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }))}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
