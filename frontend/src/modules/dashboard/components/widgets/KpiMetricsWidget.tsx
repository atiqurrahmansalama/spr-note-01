import React from 'react';
import { useTranslation } from '../../../../i18n';
import type { DashboardMetric } from '../../types';

export interface KpiMetricsWidgetProps {
  metrics: DashboardMetric[];
  cols?: number;
  className?: string;
}

const COLOR_THEMES: Record<string, { bg: string; text: string; ring: string }> = {
  accent: {
    bg: 'theme-bg-accent-soft text-[var(--accent-main)]',
    text: 'text-[var(--accent-main)]',
    ring: 'border-[var(--accent-main)]/20',
  },
  emerald: {
    bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    text: 'text-emerald-600 dark:text-emerald-400',
    ring: 'border-emerald-500/20',
  },
  purple: {
    bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    text: 'text-purple-600 dark:text-purple-400',
    ring: 'border-purple-500/20',
  },
  amber: {
    bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    text: 'text-amber-600 dark:text-amber-400',
    ring: 'border-amber-500/20',
  },
  rose: {
    bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    text: 'text-rose-600 dark:text-rose-400',
    ring: 'border-rose-500/20',
  },
  sky: {
    bg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    text: 'text-sky-600 dark:text-sky-400',
    ring: 'border-sky-500/20',
  },
  indigo: {
    bg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    text: 'text-indigo-600 dark:text-indigo-400',
    ring: 'border-indigo-500/20',
  },
};

export default function KpiMetricsWidget({
  metrics,
  cols,
  className = '',
}: KpiMetricsWidgetProps) {
  const { formatNumber } = useTranslation();

  if (!metrics || metrics.length === 0) return null;

  let gridCols = 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 @sm:grid-cols-2 @2xl:grid-cols-4';
  if (cols === 2) gridCols = 'grid-cols-1 sm:grid-cols-2 @sm:grid-cols-2';
  else if (cols === 3) gridCols = 'grid-cols-1 sm:grid-cols-3 @sm:grid-cols-3';
  else if (cols === 4) gridCols = 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 @sm:grid-cols-2 @2xl:grid-cols-4';
  else if (metrics.length === 3) gridCols = 'grid-cols-1 sm:grid-cols-3 @sm:grid-cols-3';
  else if (metrics.length === 2) gridCols = 'grid-cols-1 sm:grid-cols-2 @sm:grid-cols-2';

  return (
    <div className={`grid ${gridCols} gap-3 sm:gap-4 w-full select-none ${className}`}>
      {metrics.map((item) => {
        const Icon = item.icon;
        const theme = COLOR_THEMES[item.color || 'accent'] || COLOR_THEMES.accent;
        const displayVal = typeof item.value === 'number' ? formatNumber(item.value) : item.value;

        return (
          <div
            key={item.id}
            onClick={item.onClick}
            className={`p-4 rounded-2xl theme-bg-surface border theme-border shadow-xs flex flex-col justify-between transition-all min-w-0 relative overflow-hidden group ${
              item.onClick ? 'cursor-pointer hover:border-[var(--accent-main)]/40 hover:shadow-md' : ''
            }`}
          >
            {/* Top Row: Icon & Trend */}
            <div className="flex items-center justify-between gap-2">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${theme.bg} ${theme.ring} shadow-xs`}>
                <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </div>

              {item.trend && (
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  item.trend.isPositive !== false
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                }`}>
                  <span>{item.trend.isPositive !== false ? '↑' : '↓'}</span>
                  <span>{item.trend.value}</span>
                </span>
              )}
            </div>

            {/* Bottom Row: Value & Label */}
            <div className="mt-3 space-y-0.5">
              <div className={`text-xl sm:text-2xl font-black tracking-tight leading-none ${theme.text}`}>
                {displayVal}
              </div>
              <div className="text-xs font-semibold theme-text-secondary truncate mt-1">
                {item.label}
              </div>
              {item.subLabel && (
                <div className="text-[10px] theme-text-muted truncate">
                  {item.subLabel}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
