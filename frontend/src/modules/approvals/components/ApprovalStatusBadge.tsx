import React from 'react';
import { useApprovalsTranslation } from '../locales';
import type { ApprovalStatus } from '../types';

interface ApprovalStatusBadgeProps {
  status: ApprovalStatus | string;
  className?: string;
}

export const ApprovalStatusBadge: React.FC<ApprovalStatusBadgeProps> = ({
  status,
  className = '',
}) => {
  const { t } = useApprovalsTranslation();

  const getStatusConfig = (st: string) => {
    switch (st) {
      case 'PENDING':
        return {
          label: t('statusPending', 'Pending Review'),
          bgClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
        };
      case 'IN_REVIEW':
        return {
          label: t('statusInReview', 'Under Review'),
          bgClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
        };
      case 'APPROVED':
        return {
          label: t('statusApproved', 'Approved'),
          bgClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
        };
      case 'REJECTED':
        return {
          label: t('statusRejected', 'Rejected'),
          bgClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
        };
      case 'CHANGES_REQUESTED':
        return {
          label: t('statusChangesRequested', 'Changes Requested'),
          bgClass: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
        };
      case 'SCHEDULED':
        return {
          label: t('statusScheduled', 'Scheduled'),
          bgClass: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
        };
      case 'REVOKED':
        return {
          label: t('statusRevoked', 'Revoked'),
          bgClass: 'theme-bg-tile theme-text-secondary',
        };
      default:
        return {
          label: st,
          bgClass: 'theme-bg-tile theme-text-secondary',
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border-0 whitespace-nowrap ${config.bgClass} ${className}`}
    >
      {config.label}
    </span>
  );
};

export default ApprovalStatusBadge;

