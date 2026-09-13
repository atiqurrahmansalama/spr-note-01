import React from 'react';
import { useTranslation } from '../../../../i18n';
import { AcademicCapIcon } from '../../../../components/ui/Icons';

export interface ProgressItem {
  id: string;
  label: string;
  percentage: number;
  subLabel?: string;
  color?: 'emerald' | 'amber' | 'purple' | 'accent' | 'sky';
}

export interface AcademicProgressWidgetProps {
  items: ProgressItem[];
  title?: string;
  className?: string;
}

const BAR_COLORS: Record<string, { bar: string; text: string; bg: string }> = {
  emerald: { bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
  amber: { bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
  purple: { bar: 'bg-purple-500', text: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10' },
  accent: { bar: 'bg-[var(--accent-main)]', text: 'text-[var(--accent-main)]', bg: 'theme-bg-accent-soft' },
  sky: { bar: 'bg-sky-500', text: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-500/10' },
};

export default function AcademicProgressWidget({
  items,
  title,
  className = '',
}: AcademicProgressWidgetProps) {
  const { t, formatNumber } = useTranslation('dashboard');

  return (
    <div className={`p-5 rounded-2xl theme-bg-surface border theme-border shadow-xs space-y-4 select-none ${className}`}>
      <div className="flex items-center gap-2 pb-2 border-b theme-border">
        <AcademicCapIcon className="w-4 h-4 text-[var(--accent-main)]" />
        <h3 className="text-sm font-bold theme-text-primary">
          {title || t('academicVelocity', 'Academic & Hifz Progress')}
        </h3>
      </div>

      <div className="space-y-3.5">
        {items.map((item) => {
          const colors = BAR_COLORS[item.color || 'emerald'] || BAR_COLORS.emerald;
          const cappedPct = Math.min(100, Math.max(0, item.percentage));

          return (
            <div key={item.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold theme-text-primary">{item.label}</span>
                <span className={`font-mono font-bold ${colors.text}`}>{formatNumber(cappedPct)}%</span>
              </div>

              <div className="h-2 rounded-full overflow-hidden bg-zinc-800/20 border theme-border">
                <div
                  style={{ width: `${cappedPct}%` }}
                  className={`h-full ${colors.bar} rounded-full transition-all duration-500`}
                />
              </div>

              {item.subLabel && (
                <div className="text-[10px] theme-text-secondary truncate">
                  {item.subLabel}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
