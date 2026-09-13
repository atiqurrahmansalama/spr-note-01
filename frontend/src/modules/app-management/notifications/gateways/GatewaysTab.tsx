import React, { useState } from 'react';
import CustomButton from '@/components/ui/CustomButton';
import ActionMenu from '@/components/ui/ActionMenu';
import {
  SignalIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  SendIcon,
  SparklesIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
} from '@/components/ui/Icons';
import { getGatewayBalance } from '@/api/notifications';
import { useToast } from '@/context/ToastContext';
import type { NotificationGateway } from '@/types/notifications';

export interface GatewaysTabProps {
  gateways: NotificationGateway[];
  loading?: boolean;
  onOpenGatewayDrawer: (gateway?: NotificationGateway | null) => void;
  onOpenPingModal: (gateway: NotificationGateway) => void;
  onDeleteGateway: (gateway: NotificationGateway) => void;
  onRefreshData?: () => void;
}

export default function GatewaysTab({
  gateways,
  loading = false,
  onOpenGatewayDrawer,
  onOpenPingModal,
  onDeleteGateway,
  onRefreshData,
}: GatewaysTabProps) {
  const { showToast } = useToast();
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const handleRefreshBalance = async (gw: NotificationGateway) => {
    setRefreshingId(gw.id);
    try {
      const res = await getGatewayBalance(gw.id);
      showToast(`Balance updated: ${res.balance} ${res.currency || ''}`, 'success');
      onRefreshData?.();
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch gateway balance', 'error');
    } finally {
      setRefreshingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Top Banner Guide */}
      <div className="p-4 sm:p-5 rounded-2xl border theme-border theme-bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <SignalIcon className="w-5 h-5 theme-accent" />
            <h3 className="text-sm sm:text-base font-bold theme-text-primary">
              Multi-Channel Messaging Gateways
            </h3>
          </div>
          <p className="text-xs theme-text-secondary leading-relaxed max-w-2xl">
            Configure enterprise SMS gateways (SSL Wireless, Greenweb, Twilio), WhatsApp Cloud API, and SMTP email servers to enable automated notifications.
          </p>
        </div>

        <CustomButton
          type="button"
          variant="primary"
          size="sm"
          icon={PlusIcon}
          onClick={() => onOpenGatewayDrawer(null)}
        >
          Add Gateway Provider
        </CustomButton>
      </div>

      {/* Gateways Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs theme-text-secondary">
          Loading notification gateways...
        </div>
      ) : gateways.length === 0 ? (
        <div className="py-16 px-4 rounded-2xl border border-dashed theme-border text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl theme-bg-sub border theme-border flex items-center justify-center mx-auto theme-accent">
            <SignalIcon className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold theme-text-primary">No Gateways Configured</h4>
          <p className="text-xs theme-text-secondary max-w-md mx-auto">
            In-app bell notifications work out of the box. Add SMS or WhatsApp credentials to send instant phone alerts.
          </p>
          <CustomButton
            type="button"
            variant="primary"
            size="sm"
            icon={PlusIcon}
            onClick={() => onOpenGatewayDrawer(null)}
          >
            Configure First Gateway
          </CustomButton>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {gateways.map((gw) => {
            const actionItems = [
              {
                label: 'Test Ping',
                icon: SendIcon,
                onClick: () => onOpenPingModal(gw),
              },
              {
                label: 'Edit Configuration',
                icon: EditIcon,
                onClick: () => onOpenGatewayDrawer(gw),
              },
              {
                label: 'Remove Gateway',
                icon: TrashIcon,
                isDanger: true,
                onClick: () => onDeleteGateway(gw),
              },
            ];

            return (
              <div
                key={gw.id}
                className="p-4 rounded-2xl border theme-border theme-bg-surface hover:theme-bg-sub/20 transition-all shadow-xs flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Top Bar: Provider Name & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl theme-bg-sub flex items-center justify-center font-bold text-sm theme-accent">
                        <SignalIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold theme-text-primary leading-tight">
                          {gw.provider_name.replace(/_/g, ' ')}
                        </h4>
                        <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
                          {gw.gateway_type}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          gw.is_active
                            ? 'theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20'
                            : 'theme-bg-sub theme-text-secondary border theme-border'
                        }`}
                      >
                        {gw.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <ActionMenu items={actionItems} />
                    </div>
                  </div>

                  {/* Metadata Chips */}
                  <div className="p-2.5 rounded-xl theme-bg-sub/70 border theme-border space-y-1.5 text-xs">
                    {gw.sender_id_or_phone && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="theme-text-secondary">Sender ID / Mask:</span>
                        <span className="font-mono font-bold theme-text-primary">{gw.sender_id_or_phone}</span>
                      </div>
                    )}
                    {gw.balance_cache !== undefined && gw.balance_cache !== null && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="theme-text-secondary">Balance / Credits:</span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-bold theme-text-primary">{gw.balance_cache}</span>
                          <button
                            type="button"
                            onClick={() => handleRefreshBalance(gw)}
                            disabled={refreshingId === gw.id}
                            className="text-[10px] theme-accent hover:underline cursor-pointer bg-transparent border-0"
                            title="Refresh Balance"
                          >
                            {refreshingId === gw.id ? '...' : '↻'}
                          </button>
                        </div>
                      </div>
                    )}
                    {gw.last_ping_status && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="theme-text-secondary">Last Ping:</span>
                        <span
                          className={`font-semibold ${
                            gw.last_ping_status === 'SUCCESS' || gw.last_ping_status === 'SIMULATED'
                              ? 'text-emerald-500'
                              : gw.last_ping_status === 'FAILED'
                              ? 'text-rose-500'
                              : 'theme-text-secondary'
                          }`}
                        >
                          {gw.last_ping_status}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Quick Actions */}
                <div className="pt-2 border-t theme-border flex items-center justify-between gap-2">
                  <CustomButton
                    type="button"
                    variant="sub"
                    size="xs"
                    icon={SendIcon}
                    onClick={() => onOpenPingModal(gw)}
                  >
                    Test Ping
                  </CustomButton>

                  <CustomButton
                    type="button"
                    variant="sub"
                    size="xs"
                    icon={EditIcon}
                    onClick={() => onOpenGatewayDrawer(gw)}
                  >
                    Configure
                  </CustomButton>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
