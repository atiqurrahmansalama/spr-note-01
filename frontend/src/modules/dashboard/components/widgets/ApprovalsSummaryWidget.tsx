import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChecklistIcon,
  ClockIcon,
  ChevronRightIcon,
  TeacherIcon,
  AcademicCapIcon,
  BanknotesIcon,
  ArrowRightIcon,
  SparklesIcon,
} from '@/components/ui/Icons';
import { useRightSidebar } from '@/context/RightSidebarContext';
import { getApprovalSummary, getApprovals } from '@/api/approvals';
import { useTranslation } from '@/i18n';
import type { ApprovalSummaryCounts, ApprovalRequestItem } from '@/modules/approvals/types';

export interface ApprovalsSummaryWidgetProps {
  title?: string;
  className?: string;
}

export default function ApprovalsSummaryWidget({
  title,
  className = '',
}: ApprovalsSummaryWidgetProps) {
  const { t, formatNumber } = useTranslation('dashboard');
  const navigate = useNavigate();
  const { openDrawer } = useRightSidebar();

  const [summary, setSummary] = useState<ApprovalSummaryCounts | null>(null);
  const [recentPending, setRecentPending] = useState<ApprovalRequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [sumRes, listRes] = await Promise.all([
        getApprovalSummary().catch(() => null),
        getApprovals({ status: 'PENDING' }).catch(() => null),
      ]);

      if (sumRes) {
        setSummary(sumRes);
      }
      if (listRes) {
        const items = Array.isArray(listRes) ? listRes : listRes?.results || [];
        setRecentPending(items.slice(0, 4));
      }
    } catch {
      // Non-blocking for dashboard
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalPending = summary?.total_pending ?? 0;
  const staffPending = summary?.by_domain?.STAFF_ONBOARDING ?? 0;
  const studentPending = summary?.by_domain?.STUDENT_ADMISSION ?? 0;
  const financePending = summary?.by_domain?.FINANCE_REQUEST ?? 0;

  const handleReviewItem = (item: ApprovalRequestItem) => {
    openDrawer('approval-review', {
      id: String(item.id),
      trackingCode: item.tracking_code,
    });
  };

  const getDomainIcon = (domain: string) => {
    if (domain === 'STAFF_ONBOARDING') return TeacherIcon;
    if (domain === 'STUDENT_ADMISSION') return AcademicCapIcon;
    if (domain === 'FINANCE_REQUEST') return BanknotesIcon;
    return SparklesIcon;
  };

  return (
    <div
      className={`p-5 rounded-3xl theme-bg-surface shadow-xs h-full flex flex-col justify-between space-y-4 select-none border-0 @container ${className}`}
    >
      {/* 1. Header */}
      <div className="flex items-center justify-between pb-1 border-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-2xl bg-[var(--accent-main)]/15 theme-accent flex items-center justify-center shrink-0">
            <ChecklistIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold theme-text-primary leading-tight truncate">
              {title || t('approvalsCenterTitle', 'Approvals Center')}
            </h3>
            <p className="text-[11px] theme-text-secondary mt-0.5 truncate">
              {t('pendingQueueSub', 'Institutional Review & Decision Queue')}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/approvals')}
          className="px-3 py-1.5 rounded-xl theme-bg-app hover:theme-bg-elevated text-xs font-semibold theme-accent transition-all cursor-pointer flex items-center gap-1.5 border-0"
        >
          <span>{t('viewAll', 'View All')}</span>
          <ArrowRightIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. Top Metric Tiles */}
      <div className="grid grid-cols-2 @[400px]:grid-cols-4 gap-2 border-0">
        {/* Total Pending */}
        <div
          onClick={() => navigate('/approvals?status=PENDING')}
          className="p-3 rounded-2xl theme-bg-app hover:theme-bg-elevated/40 transition-all cursor-pointer border-0"
        >
          <span className="text-[10px] uppercase font-bold theme-text-secondary block">
            {t('totalPending', 'Pending')}
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-mono font-black theme-accent">
              {formatNumber(totalPending)}
            </span>
          </div>
        </div>

        {/* Staff Onboarding */}
        <div
          onClick={() => navigate('/staff/onboarding?tab=approvals')}
          className="p-3 rounded-2xl theme-bg-app hover:theme-bg-elevated/40 transition-all cursor-pointer border-0"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold theme-text-secondary block">
              {t('staffDomain', 'Staff')}
            </span>
            <TeacherIcon className="w-3.5 h-3.5 theme-text-secondary opacity-70" />
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-mono font-black theme-text-primary">
              {formatNumber(staffPending)}
            </span>
          </div>
        </div>

        {/* Student Admission */}
        <div
          onClick={() => navigate('/admission?tab=approvals')}
          className="p-3 rounded-2xl theme-bg-app hover:theme-bg-elevated/40 transition-all cursor-pointer border-0"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold theme-text-secondary block">
              {t('studentDomain', 'Students')}
            </span>
            <AcademicCapIcon className="w-3.5 h-3.5 theme-text-secondary opacity-70" />
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-mono font-black theme-text-primary">
              {formatNumber(studentPending)}
            </span>
          </div>
        </div>

        {/* Finance Requests */}
        <div
          onClick={() => navigate('/approvals?domain=FINANCE_REQUEST')}
          className="p-3 rounded-2xl theme-bg-app hover:theme-bg-elevated/40 transition-all cursor-pointer border-0"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold theme-text-secondary block">
              {t('financeDomain', 'Finance')}
            </span>
            <BanknotesIcon className="w-3.5 h-3.5 theme-text-secondary opacity-70" />
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-mono font-black theme-text-primary">
              {formatNumber(financePending)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Recent Pending Items List */}
      <div className="flex-1 min-h-0 space-y-2 border-0">
        <span className="text-[11px] uppercase tracking-wider font-bold theme-text-secondary block px-0.5">
          {t('urgentReview', 'Needs Review')}
        </span>

        {loading ? (
          <div className="py-6 text-center text-xs theme-text-secondary">
            {t('loadingQueue', 'Checking pending approvals...')}
          </div>
        ) : recentPending.length === 0 ? (
          <div className="py-6 px-4 rounded-2xl theme-bg-app text-center border-0">
            <p className="text-xs font-semibold theme-text-primary">
              {t('allCaughtUp', 'All caught up!')}
            </p>
            <p className="text-[11px] theme-text-secondary mt-0.5">
              {t('noPendingNotice', 'No applications or requests currently awaiting review.')}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5 border-0">
            {recentPending.map((item) => {
              const DomainIcon = getDomainIcon(item.domain);
              return (
                <div
                  key={item.id}
                  onClick={() => handleReviewItem(item)}
                  className="p-2.5 rounded-2xl theme-bg-app hover:theme-bg-elevated/60 transition-all cursor-pointer flex items-center justify-between gap-3 border-0 group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-xl theme-bg-surface flex items-center justify-center shrink-0 theme-accent shadow-xs">
                      <DomainIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold theme-text-primary truncate">
                          {item.applicant_name || 'Applicant'}
                        </span>
                        <span className="text-[10px] font-mono theme-text-secondary shrink-0">
                          {item.tracking_code}
                        </span>
                      </div>
                      <span className="text-[11px] theme-text-secondary truncate block mt-0.5">
                        {item.summary_meta?.designation ||
                          item.summary_meta?.target_class ||
                          item.domain.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                      Pending
                    </span>
                    <ChevronRightIcon className="w-3.5 h-3.5 theme-text-secondary group-hover:theme-accent transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

