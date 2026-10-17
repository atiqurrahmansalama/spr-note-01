import React from 'react';
import DataCardGrid from '../../../../components/ui/DataCardGrid';
import ActionMenu, { ActionMenuItem } from '../../../../components/ui/ActionMenu';
import {
  ClockIcon,
  EyeIcon,
  SessionsIcon,
} from '../../../../components/ui/Icons';
import { UserActivityRecord } from '../types';
import { useActivityTranslation } from '../hooks/useActivityTranslation';

export interface ActivityAnalyticsCardGridProps {
  records: UserActivityRecord[];
  loading?: boolean;
  onInspectUser: (record: UserActivityRecord) => void;
  maxMinutes?: number;
}

export const ActivityAnalyticsCardGrid: React.FC<ActivityAnalyticsCardGridProps> = ({
  records,
  loading = false,
  onInspectUser,
  maxMinutes = 1,
}) => {
  const { t, formatNumber, formatDate } = useActivityTranslation();

  const getActionMenuItems = (record: UserActivityRecord): ActionMenuItem[] => [
    {
      label: t('table.inspect', 'Inspect Activity & Logs'),
      icon: EyeIcon,
      onClick: () => onInspectUser(record),
    },
  ];

  const renderCard = (record: UserActivityRecord) => {
    const hasLiveSession = (record.time_windows || []).some((w) => w.is_active);
    const duration = record.total_active_duration_minutes || 0;
    const percent = Math.min(100, Math.round((duration / Math.max(1, maxMinutes)) * 100));

    return (
      <div
        key={record.user_id}
        className="p-4 rounded-2xl theme-bg-surface border theme-border shadow-xs hover:shadow-md transition-all space-y-3"
      >
        {/* Top Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 text-left min-w-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onInspectUser(record)}
                className="font-bold theme-text-primary text-sm hover:theme-accent transition-colors block text-left cursor-pointer truncate"
              >
                {record.name}
              </button>
              {hasLiveSession && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {t('table.live', 'Live')}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-mono theme-text-secondary">
              <span>{record.phone_number}</span>
              <span>•</span>
              <span className="px-1.5 py-0.5 rounded-md theme-bg-sub theme-text-primary border theme-border text-[10px]">
                {record.user_type}
              </span>
            </div>
          </div>

          <ActionMenu items={getActionMenuItems(record)} align="right" />
        </div>

        {/* Visual Duration Progress Bar */}
        <div className="space-y-1.5 pt-1 text-left">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="font-bold theme-accent">
              {record.formatted_active_duration || `${formatNumber(duration)}m`}
            </span>
            <span className="text-[10px] theme-text-secondary">{percent}%</span>
          </div>
          <div className="w-full h-2 rounded-full theme-bg-sub overflow-hidden border theme-border">
            <div
              className="h-full theme-bg-accent rounded-full transition-all duration-500"
              style={{ width: `${Math.max(4, percent)}%` }}
            />
          </div>
        </div>

        {/* Bottom Details */}
        <div className="flex items-center justify-between text-xs font-mono pt-2 border-t theme-border">
          <div className="flex items-center gap-1 theme-text-secondary">
            <SessionsIcon className="w-3.5 h-3.5" />
            <span>
              {formatNumber(record.sessions_count || (record.time_windows || []).length)} sessions
            </span>
          </div>

          <div className="text-[11px] theme-text-secondary">
            {record.last_active ? formatDate(record.last_active) : '—'}
          </div>
        </div>
      </div>
    );
  };

  return (
    <DataCardGrid
      data={records}
      renderCard={renderCard}
      isLoading={loading}
      loadingMessage="Loading activity cards..."
      emptyIcon={ClockIcon}
      emptyTitle={t('empty.title', 'No Activity Records Found')}
      emptySubMessage={t(
        'empty.default',
        'No user session activity has been recorded in the system yet.'
      )}
    />
  );
};

export default ActivityAnalyticsCardGrid;
