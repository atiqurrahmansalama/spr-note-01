import React from 'react';
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
}

export const RoleInviteMetricsGrid: React.FC<RoleInviteMetricsGridProps> = ({ metrics }) => {
  const { t, formatNumber } = useUserTranslation();

  const cards = [
    {
      id: 'total',
      label: t('invites.metrics.total', 'Total Invites'),
      value: formatNumber(metrics.totalInvites),
      icon: QrCodeIcon,
      color: 'theme-accent',
      bgColor: 'theme-bg-accent-soft',
    },
    {
      id: 'active',
      label: t('invites.metrics.active', 'Active & Valid'),
      value: formatNumber(metrics.activeInvites),
      icon: CheckCircleIcon,
      color: 'text-emerald-500 dark:text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      id: 'expired',
      label: t('invites.metrics.expired', 'Expired / Revoked'),
      value: formatNumber(metrics.expiredInvites + metrics.revokedInvites),
      icon: ClockIcon,
      color: 'text-amber-500 dark:text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
    {
      id: 'onboarded',
      label: t('invites.metrics.totalUses', 'Claimed Onboardings'),
      value: formatNumber(metrics.totalUses),
      icon: UsersIcon,
      color: 'text-sky-500 dark:text-sky-400',
      bgColor: 'bg-sky-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((card) => {
        const IconComponent = card.icon;
        return (
          <div
            key={card.id}
            className="theme-bg-surface border theme-border rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between text-left transition-all hover:shadow-sm"
          >
            <div className="space-y-1 min-w-0">
              <p className="text-xs font-medium theme-text-secondary truncate">
                {card.label}
              </p>
              <h3 className="text-xl sm:text-2xl font-bold font-mono tracking-tight theme-text-primary">
                {card.value}
              </h3>
            </div>
            <div
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl ${card.bgColor} ${card.color} flex items-center justify-center shrink-0 border theme-border`}
            >
              <IconComponent className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RoleInviteMetricsGrid;
