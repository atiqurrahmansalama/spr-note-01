import React from 'react';
import MetricsGrid, { MetricItem } from '../../../../../components/ui/MetricsGrid';
import { useUserTranslation } from '../../hooks/useUserTranslation';
import {
  QrCodeIcon,
  CheckCircleIcon,
  ClockIcon,
  UsersIcon,
} from '../../../../../components/ui/Icons';
import { RoleInviteMetrics } from '../../types';

export interface RoleInviteMetricsGridProps {
  metrics: RoleInviteMetrics;
  className?: string;
}

export const RoleInviteMetricsGrid: React.FC<RoleInviteMetricsGridProps> = ({ metrics, className = '' }) => {
  const { t, formatNumber } = useUserTranslation();

  const items: MetricItem[] = [
    {
      id: 'total',
      label: t('invites.metrics.total', 'Total Invites'),
      value: formatNumber(metrics.totalInvites),
      icon: QrCodeIcon,
      color: 'accent',
    },
    {
      id: 'active',
      label: t('invites.metrics.active', 'Active & Valid'),
      value: formatNumber(metrics.activeInvites),
      icon: CheckCircleIcon,
      color: 'emerald',
    },
    {
      id: 'expired',
      label: t('invites.metrics.expired', 'Expired / Revoked'),
      value: formatNumber(metrics.expiredInvites + metrics.revokedInvites),
      icon: ClockIcon,
      color: 'amber',
    },
    {
      id: 'onboarded',
      label: t('invites.metrics.totalUses', 'Claimed Onboardings'),
      value: formatNumber(metrics.totalUses),
      icon: UsersIcon,
      color: 'sky',
    },
  ];

  return <MetricsGrid items={items} className={className} />;
};

export default RoleInviteMetricsGrid;
