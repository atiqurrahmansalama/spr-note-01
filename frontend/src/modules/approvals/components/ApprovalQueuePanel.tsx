import React, { useMemo, useState } from 'react';
import CustomSelect from '@/components/ui/CustomSelect';
import DataViewToolbar from '@/components/ui/DataViewToolbar';
import DataTable, { type Column } from '@/components/ui/DataTable';
import ActionMenu from '@/components/ui/ActionMenu';
import {
  CheckIcon,
  CloseIcon,
  EditIcon,
  SparklesIcon,
  TeacherIcon,
  ClockIcon,
} from '@/components/ui/Icons';
import { useRightSidebar, useDrawerRegistration } from '@/context/RightSidebarContext';
import { useApprovalQueue } from '../hooks';
import { ApprovalStatusBadge } from './ApprovalStatusBadge';
import { ApprovalReviewDrawer } from './ApprovalReviewDrawer';
import { useApprovalsTranslation } from '../locales';
import type { ApprovalDomain, ApprovalRequestItem } from '../types';

export interface ApprovalQueuePanelProps {
  domain?: ApprovalDomain;
  title?: string;
  subtitle?: string;
}

export const ApprovalQueuePanel: React.FC<ApprovalQueuePanelProps> = ({
  domain = 'ALL',
  title,
  subtitle,
}) => {
  const { t, formatDate, formatNumber } = useApprovalsTranslation();
  const { openDrawer, closeDrawer } = useRightSidebar();

  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [activeDomainFilter, setActiveDomainFilter] = useState<string>(domain);

  const {
    requests,
    summary,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    loading,
    actingId,
    loadQueue,
    handleApprove,
    handleReject,
  } = useApprovalQueue({
    domain: activeDomainFilter as ApprovalDomain,
    initialStatus: 'PENDING',
  });

  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequestItem | null>(null);

  // Register Right Sidebar Drawer for Reviewing & Decision
  useDrawerRegistration(
    'approval_review_drawer',
    (params) => {
      const reqId = params.get('id');
      const targetReq = reqId ? requests.find((r) => String(r.id) === String(reqId)) : selectedRequest;
      if (!targetReq) return null;

      return {
        title: `${t('reviewAction', 'Review & Adjust')} — ${targetReq.tracking_code}`,
        category: t('queueTitle', 'Pending Approvals'),
        size: 'md' as const,
        content: (
          <ApprovalReviewDrawer
            key={`review-req-${targetReq.id}`}
            request={targetReq}
            onApprove={handleApprove}
            onReject={handleReject}
            onClose={closeDrawer}
          />
        ),
      };
    },
    [requests, selectedRequest, handleApprove, handleReject, closeDrawer, t]
  );

  const handleOpenReviewDrawer = (item: ApprovalRequestItem) => {
    setSelectedRequest(item);
    openDrawer('approval_review_drawer', { id: String(item.id) });
  };

  const statusOptions = useMemo(
    () => [
      { value: 'PENDING', label: t('statusPending', 'Pending Review') },
      { value: 'IN_REVIEW', label: t('statusInReview', 'Under Review') },
      { value: 'APPROVED', label: t('statusApproved', 'Approved') },
      { value: 'REJECTED', label: t('statusRejected', 'Rejected') },
      { value: 'SCHEDULED', label: t('statusScheduled', 'Scheduled') },
      { value: 'ALL', label: t('allStatuses', 'All Statuses') },
    ],
    [t]
  );

  const domainFilterOptions = useMemo(
    () => [
      { value: 'ALL', label: 'All Domains' },
      { value: 'STAFF_ONBOARDING', label: t('domainStaffOnboarding', 'Staff Onboarding') },
      { value: 'STUDENT_ADMISSION', label: t('domainStudentAdmission', 'Student Admission') },
      { value: 'STAFF_LEAVE', label: t('domainStaffLeave', 'Staff Leave') },
      { value: 'FINANCE_REQUEST', label: t('domainFinanceRequest', 'Finance Request') },
    ],
    [t]
  );

  const buildActionItems = (item: ApprovalRequestItem) => {
    const isPending = item.status === 'PENDING' || item.status === 'IN_REVIEW';
    return [
      {
        label: t('reviewAction', 'Review & Adjust'),
        icon: EditIcon,
        onClick: () => handleOpenReviewDrawer(item),
      },
      ...(isPending
        ? [
            {
              label: t('approveAction', 'Approve Now'),
              icon: CheckIcon,
              onClick: () => handleApprove(item.id),
            },
            {
              label: t('rejectAction', 'Reject'),
              icon: CloseIcon,
              variant: 'danger' as const,
              divider: true,
              onClick: () => handleOpenReviewDrawer(item),
            },
          ]
        : []),
    ];
  };

  const tableColumns: Column<ApprovalRequestItem>[] = useMemo(
    () => [
      {
        key: 'serial',
        label: 'SL',
        width: 56,
        minWidth: 56,
        align: 'center',
        render: (_item, idx) => (
          <span className="text-xs font-mono font-semibold theme-text-secondary">
            {formatNumber((idx ?? 0) + 1)}
          </span>
        ),
      },
      {
        key: 'applicant_name',
        label: t('colTracking', 'TRACKING & APPLICANT'),
        minWidth: 220,
        sortable: true,
        render: (item) => (
          <div className="min-w-0 space-y-0.5">
            <span className="text-[10px] font-mono font-bold theme-text-secondary tracking-wider block">
              {item.tracking_code}
            </span>
            <div className="text-xs sm:text-sm font-bold theme-text-primary truncate">
              {item.applicant_name || 'Applicant'}
            </div>
            <div className="text-[11px] theme-text-secondary truncate">
              {item.phone_number || item.email || ''}
            </div>
          </div>
        ),
      },
      ...(domain === 'ALL'
        ? [
            {
              key: 'domain' as const,
              label: t('colDomain', 'DOMAIN'),
              minWidth: 150,
              render: (item: ApprovalRequestItem) => (
                <span className="text-xs font-semibold theme-text-secondary">
                  {item.domain.replace('_', ' ')}
                </span>
              ),
            },
          ]
        : []),
      {
        key: 'summary_meta',
        label: t('colDetails', 'DETAILS'),
        minWidth: 180,
        render: (item) => {
          const desig = item.summary_meta?.designation || item.payload?.designation || '—';
          const type = item.summary_meta?.staff_type || item.payload?.staff_type || '';
          return (
            <div className="min-w-0 space-y-0.5 text-start">
              <span className="text-xs font-semibold theme-text-primary truncate block">
                {desig}
              </span>
              {type && (
                <span className="text-[10px] font-mono theme-text-secondary uppercase">
                  {type}
                </span>
              )}
            </div>
          );
        },
      },
      {
        key: 'created_at',
        label: t('colSubmitted', 'SUBMITTED'),
        minWidth: 120,
        sortable: true,
        render: (item) => (
          <span className="text-xs font-mono theme-text-secondary whitespace-nowrap">
            {formatDate(item.created_at)}
          </span>
        ),
      },
      {
        key: 'status',
        label: t('colStatus', 'STATUS'),
        minWidth: 120,
        align: 'center',
        render: (item) => <ApprovalStatusBadge status={item.status} />,
      },
      {
        key: 'actions',
        label: t('colActions', 'ACTIONS'),
        width: 80,
        minWidth: 80,
        align: 'right',
        render: (item) => (
          <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
            <ActionMenu
              align="right"
              size="md"
              variant="ghost"
              items={buildActionItems(item)}
            />
          </div>
        ),
      },
    ],
    [domain, formatDate, formatNumber, t]
  );

  return (
    <div className="space-y-4 @container animate-fade-in text-start">
      {/* Optional Custom Header Banner if provided */}
      {title && (
        <div className="p-4 rounded-3xl theme-bg-surface shadow-xs flex items-center justify-between gap-4 border-0">
          <div>
            <h3 className="text-base font-bold theme-text-primary">{title}</h3>
            {subtitle && <p className="text-xs theme-text-secondary mt-0.5">{subtitle}</p>}
          </div>
          <span className="text-xs font-mono font-bold px-3 py-1 rounded-xl theme-bg-tile theme-text-secondary">
            {formatNumber(requests.length)} {t('requestsCount', 'Requests')}
          </span>
        </div>
      )}

      {/* Toolbar: Search, Status Dropdown, and Card/Table View Mode */}
      <DataViewToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t('searchPlaceholder', 'Search applicant, tracking code, phone, email...')}
        searchVariant="app"
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        tableLabel={t('tableView', 'Table View')}
        cardsLabel={t('cardGrid', 'Card Grid')}
        filterElement={
          <div className="flex flex-wrap items-center gap-2 w-full @[600px]:w-auto">
            {domain === 'ALL' && (
              <div className="w-full @[400px]:w-44">
                <CustomSelect
                  value={activeDomainFilter}
                  onChange={(val: string) => setActiveDomainFilter(val || 'ALL')}
                  options={domainFilterOptions}
                />
              </div>
            )}
            <div className="w-full @[400px]:w-44">
              <CustomSelect
                value={statusFilter}
                onChange={(val: string) => setStatusFilter(val || 'PENDING')}
                options={statusOptions}
              />
            </div>
          </div>
        }
      />

      {/* Empty State */}
      {loading ? (
        <div className="p-12 text-center text-xs theme-text-secondary">
          {t('loadingQueue', 'Loading approval queue...')}
        </div>
      ) : requests.length === 0 ? (
        <div className="p-10 rounded-3xl theme-bg-surface text-center text-xs theme-text-secondary shadow-xs border-0">
          {t('noRequestsFound', 'No approval requests match your criteria')}
        </div>
      ) : viewMode === 'table' ? (
        <DataTable
          columns={tableColumns}
          data={requests}
          keyExtractor={(item) => item.id}
          onRowClick={(item) => handleOpenReviewDrawer(item)}
        />
      ) : (
        /* Card Grid View */
        <div className="grid grid-cols-1 @[540px]:grid-cols-2 @[900px]:grid-cols-3 gap-4 border-0">
          {requests.map((item) => (
            <div
              key={item.id}
              onClick={() => handleOpenReviewDrawer(item)}
              className="p-4 @[420px]:p-5 rounded-3xl theme-bg-surface shadow-xs space-y-4 hover:shadow-md transition-all border-0 flex flex-col justify-between cursor-pointer"
            >
              <div className="space-y-3 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono font-bold theme-text-secondary">
                    {item.tracking_code}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <ApprovalStatusBadge status={item.status} />
                    <ActionMenu
                      align="right"
                      size="md"
                      variant="ghost"
                      items={buildActionItems(item)}
                    />
                  </div>
                </div>

                <div className="space-y-0.5 min-w-0">
                  <h4 className="text-sm font-bold theme-text-primary truncate">
                    {item.applicant_name || 'Applicant'}
                  </h4>
                  <p className="text-xs theme-text-secondary truncate">
                    {item.summary_meta?.designation || item.payload?.designation || item.domain}
                  </p>
                  <p className="text-[11px] font-mono theme-text-secondary truncate">
                    {item.phone_number || item.email || ''}
                  </p>
                </div>
              </div>

              <div className="p-2.5 rounded-2xl theme-bg-app border-0 flex items-center justify-between text-xs">
                <span className="text-[10px] uppercase font-bold theme-text-secondary">
                  {formatDate(item.created_at)}
                </span>
                <span className="text-[11px] font-semibold theme-accent">
                  {t('reviewAction', 'Review & Adjust')} →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ApprovalQueuePanel;

