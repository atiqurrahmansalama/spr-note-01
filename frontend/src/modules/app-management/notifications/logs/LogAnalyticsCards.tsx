import React from 'react';
import {
  RadioTowerIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  MessageSquareIcon,
  BellIcon,
  WhatsappIcon,
  MailIcon,
} from '@/components/ui/Icons';
import type { DeliveryLogAnalytics } from '@/types/notifications';

export interface LogAnalyticsCardsProps {
  analytics: DeliveryLogAnalytics;
}

export default function LogAnalyticsCards({ analytics }: LogAnalyticsCardsProps) {
  const deliveryRate =
    analytics.total_dispatched > 0
      ? Math.round((analytics.delivered / analytics.total_dispatched) * 100)
      : 100;

  const STATS = [
    {
      label: 'Total Dispatches',
      value: analytics.total_dispatched,
      icon: RadioTowerIcon,
      variant: 'primary',
    },
    {
      label: 'Delivered Messages',
      value: analytics.delivered,
      icon: CheckCircle2Icon,
      variant: 'success',
      sub: `${deliveryRate}% Success Rate`,
    },
    {
      label: 'Dev Simulated',
      value: analytics.simulated,
      icon: MessageSquareIcon,
      variant: 'neutral',
      sub: 'Simulated in dev mode',
    },
    {
      label: 'Failed Dispatches',
      value: analytics.failed,
      icon: AlertTriangleIcon,
      variant: analytics.failed > 0 ? 'warning' : 'neutral',
      sub: analytics.failed > 0 ? 'Action required' : 'All delivered',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {STATS.map((s, idx) => {
        const Icon = s.icon;
        return (
          <div
            key={idx}
            className="p-4 rounded-2xl border theme-border theme-bg-surface flex items-center gap-3.5 shadow-xs"
          >
            <div className="w-10 h-10 rounded-xl theme-bg-sub flex items-center justify-center shrink-0 theme-accent">
              <Icon className="w-5 h-5" />
            </div>

            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-bold uppercase tracking-wider theme-text-secondary block truncate">
                {s.label}
              </span>
              <span className="text-lg font-black theme-text-primary block leading-tight">
                {s.value}
              </span>
              {typeof s?.sub === 'string' && s.sub.trim() && (
                <span className="text-[10px] theme-text-secondary block mt-0.5 truncate">
                  {s.sub}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
