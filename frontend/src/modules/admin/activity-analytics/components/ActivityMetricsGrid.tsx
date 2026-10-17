import React from 'react';
import { useActivityTranslation } from '../hooks/useActivityTranslation';
import {
  UsersIcon,
  ClockIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from '../../../../components/ui/Icons';
import { ActivityMetrics } from '../types';

export interface ActivityMetricsGridProps {
  metrics: ActivityMetrics;
}

export const ActivityMetricsGrid: React.FC<ActivityMetricsGridProps> = ({ metrics }) => {
  const { t, formatNumber } = useActivityTranslation();

  const totalHours = Math.floor(metrics.totalActiveMinutes / 60);
  const totalMins = metrics.totalActiveMinutes % 60;
  const formattedTotalTime = `${formatNumber(totalHours)}h ${formatNumber(totalMins)}m`;

  const cards = [
    {
      id: 'users',
      label: t('metrics.totalUsers', 'Tracked Users'),
      value: formatNumber(metrics.totalUsersTracked),
      icon: UsersIcon,
      color: 'theme-accent',
      bgColor: 'theme-bg-accent-soft',
    },
    {
      id: 'active_time',
      label: t('metrics.totalActiveTime', 'Total Active Time'),
      value: formattedTotalTime,
      icon: ClockIcon,
      color: 'text-emerald-500 dark:text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      id: 'avg_session',
      label: t('metrics.avgSession', 'Avg Session Duration'),
      value: `${formatNumber(metrics.avgSessionDuration)} mins`,
      icon: SparklesIcon,
      color: 'text-amber-500 dark:text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
    {
      id: 'live_sessions',
      label: t('metrics.activeSessions', 'Active Sessions Now'),
      value: formatNumber(metrics.activeSessionsCount),
      icon: ShieldCheckIcon,
      color: 'text-blue-500 dark:text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((card) => {
        const IconComponent = card.icon;
        return (
          <div
            key={card.id}
            className="p-3.5 sm:p-4 rounded-2xl theme-bg-surface border theme-border shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-semibold theme-text-secondary tracking-wide uppercase line-clamp-1">
                {card.label}
              </span>
              <div className={`p-2 rounded-xl ${card.bgColor} ${card.color} shrink-0`}>
                <IconComponent className="w-4 h-4" />
              </div>
            </div>

            <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight theme-text-primary">
              {card.value}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ActivityMetricsGrid;
