import React from 'react';
import { useTranslation } from '../../../../i18n';
import { 
  CloudIcon, 
  TelegramIcon, 
  WhatsappIcon, 
  BellIcon,
  SparklesIcon,
} from '../../../../components/ui/Icons';

export interface SystemGatewaysWidgetProps {
  onConfigureGateways?: () => void;
  className?: string;
}

export default function SystemGatewaysWidget({
  onConfigureGateways,
  className = '',
}: SystemGatewaysWidgetProps) {
  const { t } = useTranslation('dashboard');

  const GATEWAYS = [
    { id: 'telegram', name: 'Telegram Bot API', status: 'ONLINE', icon: TelegramIcon, color: 'sky', latency: '42ms' },
    { id: 'whatsapp', name: 'Meta WhatsApp Cloud', status: 'ONLINE', icon: WhatsappIcon, color: 'emerald', latency: '120ms' },
    { id: 'sms', name: 'National SMS Gateway', status: 'ONLINE', icon: BellIcon, color: 'amber', latency: '95ms' },
    { id: 'cloud_sync', name: 'Cloud Multi-Tenant Sync', status: 'SYNCED', icon: CloudIcon, color: 'accent', latency: 'Active' },
  ];

  return (
    <div className={`p-5 rounded-2xl theme-bg-surface border theme-border shadow-xs space-y-3.5 select-none ${className}`}>
      <div className="flex items-center justify-between pb-2 border-b theme-border">
        <div className="flex items-center gap-2">
          <SparklesIcon className="w-4 h-4 text-[var(--accent-main)]" />
          <h3 className="text-sm font-bold theme-text-primary">
            {t('systemHealth', 'Notification Gateways & Infrastructure')}
          </h3>
        </div>

        {onConfigureGateways && (
          <button
            type="button"
            onClick={onConfigureGateways}
            className="text-xs font-semibold text-[var(--accent-main)] hover:underline cursor-pointer flex items-center gap-1"
          >
            <span>{t('gatewayStatus', 'Configure')}</span>
            <span className="text-[10px]">→</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {GATEWAYS.map((gw) => {
          const Icon = gw.icon;

          return (
            <div
              key={gw.id}
              className="p-3 rounded-xl theme-bg-sub/60 border theme-border flex items-center justify-between gap-3 text-left rtl:text-right"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg theme-bg-surface border theme-border flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <div className="text-xs font-bold theme-text-primary truncate">{gw.name}</div>
                  <div className="text-[10px] font-mono theme-text-muted">Ping: {gw.latency}</div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {gw.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
