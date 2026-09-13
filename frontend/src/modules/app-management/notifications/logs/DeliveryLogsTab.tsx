import React, { useState, useMemo } from 'react';
import UniversalManagementView from '@/components/common/UniversalManagementView';
import CustomSelect from '@/components/ui/CustomSelect';
import CustomButton from '@/components/ui/CustomButton';
import ActionMenu from '@/components/ui/ActionMenu';
import {
  MessageSquareIcon,
  SendIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
} from '@/components/ui/Icons';
import LogAnalyticsCards from './LogAnalyticsCards';
import type {
  NotificationDispatchLog,
  DeliveryLogAnalytics,
  DeliveryLogFilterParams,
} from '@/types/notifications';

export interface DeliveryLogsTabProps {
  logs: NotificationDispatchLog[];
  analytics: DeliveryLogAnalytics;
  loading?: boolean;
  onFilterChange: (params: DeliveryLogFilterParams) => void;
  onOpenLogDetails: (log: NotificationDispatchLog) => void;
  onRetryLog: (log: NotificationDispatchLog) => void;
}

const CHANNEL_OPTIONS = [
  { value: 'ALL', label: 'All Channels' },
  { value: 'IN_APP', label: 'In-App Bell' },
  { value: 'SMS', label: 'SMS' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'TELEGRAM', label: 'Telegram' },
];

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'SENT', label: 'Sent' },
  { value: 'SIMULATED', label: 'Simulated (Dev)' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'QUEUED', label: 'Queued' },
];

export default function DeliveryLogsTab({
  logs,
  analytics,
  loading = false,
  onFilterChange,
  onOpenLogDetails,
  onRetryLog,
}: DeliveryLogsTabProps) {
  const [search, setSearch] = useState<string>('');
  const [channel, setChannel] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const handleSearchChange = (val: string) => {
    setSearch(val);
    onFilterChange({ search: val, channel, status: statusFilter });
  };

  const handleChannelChange = (val: string) => {
    setChannel(val);
    onFilterChange({ search, channel: val, status: statusFilter });
  };

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    onFilterChange({ search, channel, status: val });
  };

  const handleReset = () => {
    setSearch('');
    setChannel('ALL');
    setStatusFilter('ALL');
    onFilterChange({ search: '', channel: 'ALL', status: 'ALL' });
  };

  // ─── Table Columns ─────────────────────────────────────────────────────────
  const columns = useMemo(
    () => [
      {
        key: 'recipient',
        header: 'Recipient',
        sortable: true,
        render: (row: NotificationDispatchLog) => (
          <div
            onClick={() => onOpenLogDetails(row)}
            className="cursor-pointer group space-y-0.5"
          >
            <span className="font-bold text-xs theme-text-primary group-hover:theme-accent block">
              {row.recipient_name || row.recipient_identifier}
            </span>
            {row.recipient_name && (
              <span className="text-[10px] font-mono theme-text-secondary block">
                {row.recipient_identifier}
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'channel',
        header: 'Channel',
        render: (row: NotificationDispatchLog) => (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider theme-bg-sub theme-text-secondary border theme-border font-mono">
            {row.channel}
          </span>
        ),
      },
      {
        key: 'message',
        header: 'Message Payload',
        render: (row: NotificationDispatchLog) => (
          <div
            onClick={() => onOpenLogDetails(row)}
            className="cursor-pointer max-w-xs sm:max-w-md truncate text-xs font-mono theme-text-primary hover:theme-accent"
          >
            {row.message_title ? `[${row.message_title}] ` : ''}
            {row.message_body}
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (row: NotificationDispatchLog) => {
          let badge = 'theme-bg-sub theme-text-secondary border theme-border';
          if (row.status === 'DELIVERED' || row.status === 'SENT') {
            badge = 'theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20';
          } else if (row.status === 'FAILED') {
            badge = 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
          } else if (row.status === 'SIMULATED') {
            badge = 'theme-bg-sub theme-text-primary border theme-border';
          }
          return (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${badge}`}>
              {row.status}
            </span>
          );
        },
      },
      {
        key: 'time',
        header: 'Dispatched At',
        render: (row: NotificationDispatchLog) => (
          <span className="text-[11px] theme-text-secondary font-mono whitespace-nowrap">
            {new Date(row.dispatched_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        ),
      },
      {
        key: 'actions',
        header: '',
        render: (row: NotificationDispatchLog) => {
          const items = [
            {
              label: 'View Audit Details',
              icon: MessageSquareIcon,
              onClick: () => onOpenLogDetails(row),
            },
            {
              label: 'Retry Dispatch',
              icon: SendIcon,
              onClick: () => onRetryLog(row),
            },
          ];
          return <ActionMenu items={items} />;
        },
      },
    ],
    [onOpenLogDetails, onRetryLog]
  );

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Analytics Summary */}
      <LogAnalyticsCards analytics={analytics} />

      {/* Main Delivery Table */}
      <UniversalManagementView
        title="Delivery Audit Logs"
        subtitle="Live audit trail of dispatched notifications"
        icon={MessageSquareIcon}
        hideHeader={true}
        isEmbedded={true}
        storageKey="spr_notification_logs_view"
        defaultViewMode="table"
        searchLabel="Search Logs"
        searchQuery={search}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Recipient phone, email, keywords..."
        filters={
          <>
            <div className="w-40 shrink-0">
              <CustomSelect
                label="Channel"
                options={CHANNEL_OPTIONS}
                value={channel}
                onChange={handleChannelChange}
                size="md"
              />
            </div>

            <div className="w-40 shrink-0">
              <CustomSelect
                label="Status"
                options={STATUS_OPTIONS}
                value={statusFilter}
                onChange={handleStatusChange}
                size="md"
              />
            </div>
          </>
        }
        hasActiveFilters={search.trim() !== '' || channel !== 'ALL' || statusFilter !== 'ALL'}
        activeFilterCount={[search.trim() !== '', channel !== 'ALL', statusFilter !== 'ALL'].filter(Boolean).length}
        onResetFilters={handleReset}
        loading={loading}
        data={logs}
        totalCount={logs.length}
        itemLabel="Logs"
        columns={columns}
        emptyIcon={MessageSquareIcon}
        emptyTitle="No Delivery Logs Found"
        emptySubMessage="Dispatched notifications, SMS probes, and broadcasts will appear in this audit trail."
      />
    </div>
  );
}
