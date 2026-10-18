import React from 'react';
import DataTable, { Column } from '../../../../components/ui/DataTable';
import ActionMenu, { ActionMenuItem } from '../../../../components/ui/ActionMenu';
import {
  ClockIcon,
  EyeIcon,
  SessionsIcon,
} from '../../../../components/ui/Icons';
import { UserActivityRecord } from '../types';
import { useActivityTranslation } from '../hooks/useActivityTranslation';

export interface ActivityAnalyticsTableProps {
  records: UserActivityRecord[];
  loading?: boolean;
  onInspectUser: (record: UserActivityRecord) => void;
  maxMinutes?: number;
}

export const ActivityAnalyticsTable: React.FC<ActivityAnalyticsTableProps> = ({
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

  const columns: Column<UserActivityRecord>[] = [
    {
      key: 'name',
      header: t('table.user', 'User & Identity'),
      headerClassName: 'min-w-[220px]',
      render: (record) => {
        const hasLiveSession = (record.time_windows || []).some((w) => w.is_active);

        return (
          <div className="space-y-1 text-left">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onInspectUser(record)}
                className="font-bold theme-text-primary text-sm hover:theme-accent transition-colors block text-left cursor-pointer"
              >
                {record.name}
              </button>
              {hasLiveSession && (
                <span
                  className="relative flex h-2 w-2 shrink-0"
                  title={t('table.live', 'Online Now')}
                >
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono theme-text-secondary">
              <span>{record.phone_number}</span>
              <span>•</span>
              <span className="px-1.5 py-0.5 rounded-md theme-bg-sub theme-text-primary border theme-border text-[10px]">
                {record.user_type}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'sessions_count',
      header: t('table.sessions', 'Sessions'),
      headerClassName: 'min-w-[100px] text-center',
      render: (record) => (
        <div className="text-center font-mono text-xs font-bold theme-text-primary flex items-center justify-center gap-1">
          <SessionsIcon className="w-3.5 h-3.5 theme-text-secondary" />
          <span>{formatNumber(record.sessions_count || (record.time_windows || []).length)}</span>
        </div>
      ),
    },
    {
      key: 'total_active_duration_minutes',
      header: t('table.duration', 'Active Duration'),
      headerClassName: 'min-w-[200px]',
      render: (record) => {
        const duration = record.total_active_duration_minutes || 0;
        const percent = Math.min(100, Math.round((duration / Math.max(1, maxMinutes)) * 100));

        return (
          <div className="space-y-1.5 text-left">
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
        );
      },
    },
    {
      key: 'last_active',
      header: t('table.lastActive', 'Last Active'),
      headerClassName: 'min-w-[140px]',
      render: (record) => (
        <div className="text-left font-mono text-xs theme-text-secondary">
          {record.last_active
            ? formatDate(record.last_active, { dateStyle: 'medium', timeStyle: 'short' })
            : '—'}
        </div>
      ),
    },
    {
      key: 'actions',
      header: t('table.actions', 'Actions'),
      align: 'right',
      headerClassName: 'text-right min-w-[80px]',
      render: (record) => (
        <div className="flex justify-end">
          <ActionMenu items={getActionMenuItems(record)} align="right" />
        </div>
      ),
    },
  ];

  return (
    <DataTable
      data={records}
      columns={columns}
      isLoading={loading}
      loadingMessage="Loading activity records..."
      emptyIcon={ClockIcon}
      emptyTitle={t('empty.title', 'No Activity Records Found')}
      emptySubMessage={t(
        'empty.default',
        'No user session activity has been recorded in the system yet.'
      )}
    />
  );
};

export default ActivityAnalyticsTable;
