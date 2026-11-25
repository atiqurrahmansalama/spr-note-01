import React from 'react';
import { DataTable, EmptyState, type Column } from '@repo/ui';
import type { AdminProgressRecord } from '../hooks/useAdminFoundation';
import type { UniverseAuditLogItem } from '../../../types';
import { useAdminTranslation } from '../locales';
import { ClockIcon, ShieldCheckIcon, SparklesIcon } from '../../../components/icons/UniverseIcons';

interface OverviewTabProps {
  progressRecords: AdminProgressRecord[];
  auditLogs: UniverseAuditLogItem[];
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ progressRecords, auditLogs }) => {
  const { t, formatDate, formatNumber } = useAdminTranslation();

  const columns: Column<UniverseAuditLogItem>[] = [
    {
      key: 'event_type',
      header: 'Event',
      render: (row) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full theme-bg-accent-soft theme-accent text-[11px] font-bold">
          <ShieldCheckIcon className="w-3 h-3" />
          <span>{row.event_type}</span>
        </span>
      ),
    },
    {
      key: 'actor_name',
      header: 'Actor',
      render: (row) => <span className="text-xs font-semibold theme-text-primary">{row.actor_name}</span>,
    },
    {
      key: 'ip_address',
      header: 'IP',
      render: (row) => (
        <span className="text-xs font-mono theme-text-secondary">{row.ip_address || '—'}</span>
      ),
    },
    {
      key: 'created_at',
      header: 'Timestamp',
      render: (row) => (
        <span className="text-xs theme-text-secondary">{formatDate(row.created_at)}</span>
      ),
    },
  ];

  return (
    <div className="@container space-y-6">
      {/* Database-Persisted Progress Cards */}
      <div className="rounded-3xl theme-bg-surface p-6 space-y-4 shadow-xs border-0">
        <div className="flex items-center gap-2">
          <SparklesIcon className="w-4 h-4 theme-accent" />
          <h3 className="text-base font-bold theme-text-primary">
            {t('overview.progressTitle', 'Database-Persisted Progress')}
          </h3>
        </div>

        <div className="grid grid-cols-1 @[640px]:grid-cols-2 gap-4">
          {progressRecords.map((rec) => (
            <div
              key={rec.user_id}
              className="p-4 rounded-2xl theme-bg-app space-y-2 border-0"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-bold theme-text-primary truncate">
                    {rec.name || rec.email}
                  </div>
                  <div className="text-[11px] theme-text-secondary truncate">{rec.email}</div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                    rec.data.entry_unlocked
                      ? 'theme-bg-success-soft theme-success'
                      : 'theme-bg-warning-soft theme-warning'
                  }`}
                >
                  {rec.data.entry_unlocked
                    ? t('metrics.unlocked', 'Unlocked')
                    : t('metrics.waiting', 'Locked')}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                <div className="p-2 rounded-xl theme-bg-surface">
                  <div className="text-sm font-extrabold theme-accent">
                    {formatNumber(rec.data.collected_stars)}
                  </div>
                  <div className="text-[10px] theme-text-secondary">Stars</div>
                </div>
                <div className="p-2 rounded-xl theme-bg-surface">
                  <div className="text-sm font-extrabold theme-text-primary">
                    {formatNumber(rec.data.unlocked_modules?.length || 0)}
                  </div>
                  <div className="text-[10px] theme-text-secondary">Modules</div>
                </div>
                <div className="p-2 rounded-xl theme-bg-surface">
                  <div className="text-xs font-bold theme-text-primary truncate">
                    {rec.data.last_visited_route || '/welcome'}
                  </div>
                  <div className="text-[10px] theme-text-secondary">Last Route</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security & Access Audit Trail */}
      <div className="rounded-3xl theme-bg-surface p-6 space-y-4 shadow-xs border-0">
        <div className="flex items-center gap-2">
          <ClockIcon className="w-4 h-4 theme-accent" />
          <h3 className="text-base font-bold theme-text-primary">
            {t('overview.auditTitle', 'Security & Access Audit Trail')}
          </h3>
        </div>

        {auditLogs.length === 0 ? (
          <EmptyState
            icon={ShieldCheckIcon}
            title={t('overview.emptyAudit', 'No access events recorded yet.')}
          />
        ) : (
          <DataTable
            columns={columns}
            data={auditLogs}
            keyExtractor={(row) => row.id}
            compact
            transparent
          />
        )}
      </div>
    </div>
  );
};
