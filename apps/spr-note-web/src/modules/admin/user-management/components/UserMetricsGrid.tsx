import React from 'react';
import MetricsGrid, { MetricItem } from '../../../../components/ui/MetricsGrid';
import {
  UsersIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  KeyIcon,
  AlertTriangleIcon,
} from '../../../../components/ui/Icons';
import { useUserTranslation } from '../hooks/useUserTranslation';
import { UserMetrics } from '../types';

export interface UserMetricsGridProps {
  metrics: UserMetrics;
  className?: string;
}

export const UserMetricsGrid: React.FC<UserMetricsGridProps> = ({ metrics, className = '' }) => {
  const { t, formatNumber } = useUserTranslation();

  const items: MetricItem[] = [
    {
      label: t('metrics.totalRegistered', 'Total Registered'),
      value: formatNumber(metrics.totalUsers),
      icon: UsersIcon,
      color: 'default',
    },
    {
      label: t('metrics.activeUsers', 'Active Users'),
      value: formatNumber(metrics.activeUsers),
      icon: CheckCircleIcon,
      color: 'accent',
    },
    {
      label: t('metrics.inactiveUsers', 'Inactive Accounts'),
      value: formatNumber(metrics.inactiveUsers),
      icon: AlertTriangleIcon,
      color: 'rose',
    },
    {
      label: t('metrics.googleAuth', 'Google Auth'),
      value: formatNumber(metrics.googleUsers),
      icon: ShieldCheckIcon,
      color: 'default',
    },
    {
      label: t('metrics.systemRoles', 'System Roles'),
      value: formatNumber(metrics.systemRoles),
      icon: KeyIcon,
      color: 'accent',
    },
  ];

  return <MetricsGrid items={items} className={className} />;
};

export default UserMetricsGrid;
