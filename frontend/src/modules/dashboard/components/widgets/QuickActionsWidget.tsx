import React from 'react';
import { useTranslation } from '../../../../i18n';
import type { DashboardQuickAction } from '../../types';
import { SparklesIcon } from '../../../../components/ui/Icons';

export interface QuickActionsWidgetProps {
  actions: DashboardQuickAction[];
  title?: string;
  className?: string;
}

const ACTION_COLOR_STYLES: Record<string, { bg: string; text: string; ring: string }> = {
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
};

export default function QuickActionsWidget({
  actions,
  title,
  className = '',
}: QuickActionsWidgetProps) {
  const { t } = useTranslation('dashboard');

  if (!actions || actions.length === 0) return null;

  return (
    <div className={`p-5 rounded-2xl theme-bg-surface border theme-border shadow-xs space-y-3.5 select-none ${className}`}>
      <div className="flex items-center gap-2 pb-2 border-b theme-border">
        <SparklesIcon className="w-4 h-4 theme-accent" />
        <h3 className="text-sm font-bold theme-text-primary">
          {title || t('quickActions', 'Quick Actions')}
        </h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {actions.map((act) => {
          const Icon = act.icon;
          const style = ACTION_COLOR_STYLES[act.color || 'accent'] || ACTION_COLOR_STYLES.accent;

          return (
            <button
              key={act.id}
              type="button"
              onClick={act.onClick}
              className="p-3 rounded-xl theme-bg-sub/60 hover:theme-bg-sub border theme-border hover:border-[var(--accent-main)]/30 transition-all cursor-pointer flex flex-col justify-between items-start text-left rtl:text-right gap-2 group min-w-0"
            >
              <div className="flex items-center justify-between w-full">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${style.bg} ${style.ring} shadow-xs group-hover:scale-105 transition-transform`}>
                  <Icon className="w-4 h-4" />
                </div>

                {act.badge && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md theme-bg-surface border theme-border theme-text-secondary font-bold">
                    {act.badge}
                  </span>
                )}
              </div>

              <div className="space-y-0.5 min-w-0 w-full">
                <div className="text-xs font-bold theme-text-primary truncate group-hover:theme-accent transition-colors">
                  {act.title}
                </div>
                {act.description && (
                  <div className="text-[10px] theme-text-secondary truncate">
                    {act.description}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
