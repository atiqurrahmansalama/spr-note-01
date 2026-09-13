import React from 'react';
import { useTranslation } from '../../../../i18n';
import type { ActivityItem } from '../../types';
import { 
  BellIcon, 
  StudentIcon, 
  AttendanceIcon, 
  AcademicCapIcon, 
  ShieldCheckIcon,
} from '../../../../components/ui/Icons';

export interface RecentActivityFeedWidgetProps {
  activities: ActivityItem[];
  title?: string;
  onViewAll?: () => void;
  className?: string;
}

const CATEGORY_ICONS: Record<string, { icon: React.ComponentType<{ className?: string }>; style: string }> = {
  ATTENDANCE: { icon: AttendanceIcon, style: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  ACADEMIC: { icon: AcademicCapIcon, style: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
  NOTIFICATION: { icon: BellIcon, style: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  ADMISSION: { icon: StudentIcon, style: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' },
  SECURITY: { icon: ShieldCheckIcon, style: 'theme-bg-accent-soft text-[var(--accent-main)] border-[var(--accent-main)]/20' },
};

export default function RecentActivityFeedWidget({
  activities,
  title,
  onViewAll,
  className = '',
}: RecentActivityFeedWidgetProps) {
  const { t } = useTranslation('dashboard');

  return (
    <div className={`p-5 rounded-2xl theme-bg-surface border theme-border shadow-xs space-y-3.5 select-none ${className}`}>
      <div className="flex items-center justify-between pb-2 border-b theme-border">
        <div className="flex items-center gap-2">
          <BellIcon className="w-4 h-4 text-[var(--accent-main)]" />
          <h3 className="text-sm font-bold theme-text-primary">
            {title || t('recentActivity', 'Live Activity Stream')}
          </h3>
        </div>

        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-semibold text-[var(--accent-main)] hover:underline cursor-pointer flex items-center gap-1"
          >
            <span>{t('viewAllLogs', 'View Logs')}</span>
            <span className="text-[10px]">→</span>
          </button>
        )}
      </div>

      {!activities || activities.length === 0 ? (
        <div className="py-6 text-center text-xs theme-text-secondary">
          {t('noData', 'No recent activities recorded')}
        </div>
      ) : (
        <div className="space-y-2.5">
          {activities.map((act) => {
            const cat = CATEGORY_ICONS[act.category] || CATEGORY_ICONS.SECURITY;
            const Icon = act.icon || cat.icon;

            return (
              <div
                key={act.id}
                className="p-3 rounded-xl theme-bg-sub/60 border theme-border flex items-start gap-3 text-left rtl:text-right"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${cat.style} shadow-xs mt-0.5`}>
                  <Icon className="w-4 h-4" />
                </div>

                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold theme-text-primary truncate">{act.title}</span>
                    <span className="text-[10px] font-mono theme-text-muted shrink-0">{act.timestamp}</span>
                  </div>
                  <p className="text-[11px] theme-text-secondary leading-tight truncate">
                    {act.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
