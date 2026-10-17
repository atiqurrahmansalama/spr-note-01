import React from 'react';
import MetricsGrid, { MetricItem } from '../../../../components/ui/MetricsGrid';
import {
  KeyIcon,
  ShieldCheckIcon,
  UsersIcon,
  SparklesIcon,
} from '../../../../components/ui/Icons';
import { useRoleTranslation } from '../hooks/useRoleTranslation';
import { RoleMetrics } from '../types';

export interface RoleMetricsGridProps {
  metrics: RoleMetrics;
  className?: string;
}

export const RoleMetricsGrid: React.FC<RoleMetricsGridProps> = ({ metrics, className = '' }) => {
  const { t, formatNumber } = useRoleTranslation();

  const items: MetricItem[] = [
    {
      label: t('metrics.totalRoles', 'Total Roles'),
      value: formatNumber(metrics.totalRoles),
      icon: KeyIcon,
      color: 'default',
    },
    {
      label: t('metrics.systemRoles', 'System Roles'),
      value: formatNumber(metrics.systemRoles),
      icon: ShieldCheckIcon,
      color: 'accent',
    },
    {
      label: t('metrics.customRoles', 'Custom Roles'),
      value: formatNumber(metrics.customRoles),
      icon: SparklesIcon,
      color: 'accent',
    },
    {
      label: t('metrics.assignedUsers', 'Assigned Users'),
      value: formatNumber(metrics.totalUsersAssigned),
      icon: UsersIcon,
      color: 'default',
    },
  ];

  return <MetricsGrid items={items} className={className} />;
};

export default RoleMetricsGrid;
