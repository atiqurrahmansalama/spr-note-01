import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../../../i18n';
import { financeApi } from '../../../../api/financeApi';
import type { DuesAgingReportData } from '../../types';
import { InvoiceIcon, PrinterIcon } from '../../../../components/ui/Icons';

export const DuesAgingAnalysisReport: React.FC = () => {
  const { t, formatNumber } = useTranslation('finance');

  const [agingData, setAgingData] = useState<DuesAgingReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await financeApi.getDuesAgingReport();
        setAgingData(data);
      } catch (e) {
        console.error('Failed to load aging report:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const buckets = [
    { id: '0_30', label: '0 - 30 Days (Current)', data: agingData?.days_0_30, colorClass: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400' },
    { id: '31_60', label: '31 - 60 Days (Moderate)', data: agingData?.days_31_60, colorClass: 'border-sky-500/20 bg-sky-500/5 text-sky-400' },
    { id: '61_90', label: '61 - 90 Days (Urgent)', data: agingData?.days_61_90, colorClass: 'border-amber-500/20 bg-amber-500/5 text-amber-400' },
    { id: '90_plus', label: '90+ Days (Critical Overdue)', data: agingData?.days_90_plus, colorClass: 'border-rose-500/20 bg-rose-500/5 text-rose-400' },
  ];

  return (
    <div className="rounded-2xl border theme-border bg-surface shadow-sm overflow-hidden p-5 space-y-5">
      <div className="flex items-center justify-between pb-3 border-b theme-border">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <InvoiceIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-primary">{t('duesAging', 'Outstanding Dues Aging Analysis')}</h3>
            <p className="text-xs text-secondary">Categorized aging schedule of unpaid student fee invoices</p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] text-secondary block">Total Outstanding Dues</span>
          <span className="text-base font-bold text-amber-400 font-mono">
            ৳ {formatNumber(agingData?.total_due || 0)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {buckets.map((b) => (
          <div
            key={b.id}
            className={`p-4 rounded-xl border flex flex-col justify-between ${b.colorClass}`}
          >
            <div>
              <span className="text-xs font-semibold block">{b.label}</span>
              <span className="text-[11px] text-secondary mt-0.5 block">
                {b.data?.count || 0} Invoices Pending
              </span>
            </div>
            <div className="mt-4">
              <span className="text-lg font-bold font-mono">
                ৳ {formatNumber(b.data?.amount || 0)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
