import React from 'react';
import CustomButton from '@/components/ui/CustomButton';
import {
  MessageSquareIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  SendIcon,
} from '@/components/ui/Icons';
import { DrawerContainer, DrawerSection } from '@/components/layout';
import type { NotificationDispatchLog } from '@/types/notifications';

export interface LogDetailDrawerProps {
  log?: NotificationDispatchLog | null;
  onRetry?: (log: NotificationDispatchLog) => void;
  onClose?: () => void;
}

export default function LogDetailDrawer({
  log,
  onRetry,
}: LogDetailDrawerProps) {
  if (!log) return null;

  return (
    <DrawerContainer padding="none" spacing="normal">
      <div className="space-y-6 text-left">
        {/* Header Status Banner */}
        <div className="p-4 rounded-2xl border theme-border theme-bg-sub/60 space-y-2 shadow-2xs">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    log.status === 'DELIVERED' || log.status === 'SENT'
                      ? 'theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20'
                      : log.status === 'SIMULATED'
                      ? 'theme-bg-sub theme-text-primary border theme-border'
                      : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                  }`}
                >
                  {log.status}
                </span>
                <span className="text-xs font-bold font-mono theme-text-primary uppercase">
                  {log.channel}
                </span>
              </div>
              <h3 className="text-sm font-bold theme-text-primary mt-1.5">
                {log.message_title || log.event_type || 'Notification Dispatch'}
              </h3>
            </div>

            {onRetry && (
              <CustomButton
                type="button"
                variant="sub"
                size="xs"
                icon={SendIcon}
                onClick={() => onRetry(log)}
              >
                Retry Dispatch
              </CustomButton>
            )}
          </div>

          <div className="text-[11px] theme-text-secondary pt-1 border-t theme-border flex items-center justify-between">
            <span>Dispatched at: {new Date(log.dispatched_at).toLocaleString()}</span>
            <span>Target: {log.recipient_identifier}</span>
          </div>
        </div>

        {/* Message Content */}
        <DrawerSection title="Message Payload" icon={MessageSquareIcon}>
          <div className="p-3.5 rounded-xl theme-bg-surface border theme-border font-mono text-xs theme-text-primary whitespace-pre-wrap leading-relaxed shadow-2xs">
            {log.message_body}
          </div>
        </DrawerSection>

        {/* Failure Reason if Failed */}
        {log.error_reason && (
          <DrawerSection title="Error Diagnostics" icon={AlertTriangleIcon}>
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-mono">
              {log.error_reason}
            </div>
          </DrawerSection>
        )}

        {/* Raw Provider Response */}
        {log.provider_response && Object.keys(log.provider_response).length > 0 && (
          <DrawerSection title="Provider Raw Response" icon={CheckCircle2Icon}>
            <pre className="p-3.5 rounded-xl theme-bg-sub border theme-border text-[11px] font-mono theme-text-primary overflow-x-auto max-h-60">
              {JSON.stringify(log.provider_response, null, 2)}
            </pre>
          </DrawerSection>
        )}
      </div>
    </DrawerContainer>
  );
}
