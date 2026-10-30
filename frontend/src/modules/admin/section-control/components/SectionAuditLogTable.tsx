import React, { useMemo, useState, useEffect } from 'react';
import DataTable, { Column } from '../../../../components/ui/DataTable';
import Pagination from '../../../../components/ui/Pagination';
import {
  TimerIcon,
  UserIcon,
} from '../../../../components/ui/Icons';
import { useSectionTranslation } from '../hooks/useSectionTranslation';
import { AuditLogEntry } from '../types';

export interface SectionAuditLogTableProps {
  logs: AuditLogEntry[];
  loading: boolean;
}

/**
 * SectionAuditLogTable
 * Enterprise Audit Trail component reusing standard project DataTable.
 * Renders pure DataTable with localized numeral/date rendering,
 * and 100% theme design-tokens without duplicate wrapper boxes.
 */
export const SectionAuditLogTable: React.FC<SectionAuditLogTableProps> = ({
  logs,
  loading,
}) => {
  const { t } = useSectionTranslation();

  // DataTable column definitions
  const columns: Column<AuditLogEntry>[] = useMemo(
    () => [
      {
        key: 'timestamp',
        header: t('audit.timestamp', 'TIMESTAMP'),
        sortable: true,
        headerClassName: 'min-w-[170px]',
        render: (log) => (
          <span className="font-mono text-[11px] theme-text-secondary whitespace-nowrap">
            {log.timestamp}
          </span>
        ),
      },
      {
        key: 'changed_by',
        header: t('audit.changedBy', 'CHANGED BY'),
        sortable: true,
        headerClassName: 'min-w-[150px]',
        render: (log) => (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg theme-bg-sub border theme-border flex items-center justify-center shrink-0">
              <UserIcon className="w-3.5 h-3.5 theme-text-secondary" />
            </div>
            <span className="font-semibold text-xs theme-text-primary whitespace-nowrap">
              {log.changed_by || t('audit.systemUser', 'System')}
            </span>
          </div>
        ),
      },
      {
        key: 'scope_type',
        header: t('audit.scope', 'SCOPE'),
        sortable: true,
        headerClassName: 'min-w-[110px]',
        render: (log) => {
          const scope = (log.scope_type || '').toUpperCase();
          let badgeClass = 'theme-neutral-badge';
          if (scope === 'GLOBAL') badgeClass = 'theme-info-badge';
          else if (scope === 'ROLE') badgeClass = 'theme-purple-badge';
          else if (scope === 'USER') badgeClass = 'theme-accent theme-bg-sub border theme-border';

          return (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}
            >
              {log.scope_type}
            </span>
          );
        },
      },
      {
        key: 'target_identifier',
        header: t('audit.target', 'TARGET'),
        sortable: true,
        headerClassName: 'min-w-[130px]',
        render: (log) => {
          const hasTarget = Boolean(
            log.target_identifier &&
              log.target_identifier !== 'None' &&
              log.target_identifier !== '-'
          );
          return (
            <span className="font-mono text-xs theme-text-primary">
              {hasTarget ? (
                log.target_identifier
              ) : (
                <span className="theme-text-secondary opacity-60 italic text-[11px]">
                  {t('audit.globalBaseline', 'Global Baseline')}
                </span>
              )}
            </span>
          );
        },
      },
      {
        key: 'section_key',
        header: t('audit.featureSection', 'FEATURE / MODULE'),
        sortable: true,
        headerClassName: 'min-w-[180px]',
        render: (log) => (
          <span className="font-mono text-xs font-semibold theme-text-primary">
            {log.section_key}
          </span>
        ),
      },
      {
        key: 'change',
        header: t('audit.change', 'CHANGE'),
        headerClassName: 'min-w-[170px]',
        render: (log) => {
          const isPrevActive = Boolean(
            log.previous_state === true ||
              log.previous_state === 'true' ||
              log.previous_state === 'True' ||
              log.previous_state === 1 ||
              log.previous_state === '1'
          );
          const isNewActive = Boolean(
            log.new_state === true ||
              log.new_state === 'true' ||
              log.new_state === 'True' ||
              log.new_state === 1 ||
              log.new_state === '1'
          );
          const isUnset = log.previous_state === null || log.previous_state === undefined;

          return (
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <span
                className={
                  isUnset
                    ? 'theme-text-secondary opacity-60'
                    : isPrevActive
                    ? 'theme-success'
                    : 'theme-danger'
                }
              >
                {isUnset
                  ? t('audit.stateUnset', 'Default')
                  : isPrevActive
                  ? t('audit.stateEnabled', 'Enabled')
                  : t('audit.stateDisabled', 'Disabled')}
              </span>
              <span className="theme-text-secondary opacity-50">&rarr;</span>
              <span className={isNewActive ? 'theme-success' : 'theme-danger'}>
                {isNewActive
                  ? t('audit.stateEnabled', 'Enabled')
                  : t('audit.stateDisabled', 'Disabled')}
              </span>
            </div>
          );
        },
      },
    ],
    [t]
  );

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [sortConfig, setSortConfig] = useState<{
    key: string | null;
    direction: 'asc' | 'desc' | null;
  }>({
    key: 'timestamp',
    direction: 'desc',
  });

  // Reset to first page when the total count of logs changes (e.g. from filter or search)
  useEffect(() => {
    setCurrentPage(1);
  }, [logs.length]);

  // Sort entire logs dataset before slicing for pagination
  const sortedLogs = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return logs;
    const { key, direction } = sortConfig;
    const isAsc = direction === 'asc';

    return [...logs].sort((a: any, b: any) => {
      const valA = a[key];
      const valB = b[key];
      if (valA === valB) return 0;
      if (valA === null || valA === undefined || valA === '') return 1;
      if (valB === null || valB === undefined || valB === '') return -1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return isAsc ? valA - valB : valB - valA;
      }
      return isAsc
        ? String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' })
        : String(valB).localeCompare(String(valA), undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [logs, sortConfig]);

  const totalItems = sortedLogs.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedLogs = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return sortedLogs.slice(start, start + pageSize);
  }, [sortedLogs, safeCurrentPage, pageSize]);

  return (
    <div className="space-y-4">
      <DataTable
        data={paginatedLogs}
        columns={columns}
        isLoading={loading}
        loadingMessage={t('audit.loading', 'Loading audit log records...')}
        emptyIcon={TimerIcon}
        emptyTitle={t('audit.emptyTitle', 'No Audit Records Found')}
        emptySubMessage={t('audit.empty', 'No audit log changes recorded yet.')}
        showSerial={true}
        serialHeader="#"
        startIndex={(safeCurrentPage - 1) * pageSize + 1}
        sortable={true}
        sortConfig={sortConfig}
        onSortChange={(key: any, direction: any) => setSortConfig({ key, direction })}
        compact={false}
      />

      {!loading && totalItems > 0 && (
        <Pagination
          currentPage={safeCurrentPage}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={[10, 25, 50, 100]}
          itemLabel={t('audit.paginationItemLabel', 'records')}
        />
      )}
    </div>
  );
};

export default SectionAuditLogTable;
