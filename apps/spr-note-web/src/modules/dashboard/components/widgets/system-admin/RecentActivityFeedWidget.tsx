import React from 'react';
import { useTranslation } from '../../../../../i18n';
import type { ActivityItem } from '../../../types';
import { 
  BellIcon, 
  StudentIcon, 
  AttendanceIcon, 
  AcademicCapIcon, 
  ShieldCheckIcon,
} from '../../../../../components/ui/Icons';

export interface RecentActivityFeedWidgetProps {
  activities: ActivityItem[];
  title?: string;
  onViewAll?: () => void;
  className?: string;
}

const CATEGORY_ICONS: Record<string, { icon: React.ComponentType<{ className?: string }>; style: string }> = {
  ATTENDANCE: { icon: AttendanceIcon, style: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  ACADEMIC: { icon: AcademicCapIcon, style: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
  NOTIFICATION: { icon: BellIcon, style: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  ADMISSION: { icon: StudentIcon, style: 'bg-sky-500/10 text-sky-600 dark:text-sky-400' },
  SECURITY: { icon: ShieldCheckIcon, style: 'theme-bg-accent-soft text-[var(--accent-main)]' },
};

export default function RecentActivityFeedWidget({
  activities,
  title,
  onViewAll,
  className = '',
}: RecentActivityFeedWidgetProps) {
  const { t } = useTranslation('dashboard');

  return (
    <div className={`p-5 rounded-2xl theme-bg-surface shadow-xs hover:shadow-md h-full flex flex-col justify-start space-y-3.5 select-none ${className}`}>
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2 min-w-0">
          <BellIcon className="w-4 h-4 text-[var(--accent-main)] shrink-0" />
          <h3 className="text-sm font-bold theme-text-primary truncate">
            {title || t('recentActivity', 'Live Activity Stream')}
          </h3>
        </div>

        <div className="flex items-center gap-2 shrink-0">
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
                className="p-3 rounded-xl theme-bg-sub/60 hover:theme-bg-sub transition-all flex items-start gap-3 text-left rtl:text-right"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cat.style} shadow-xs mt-0.5`}>
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
