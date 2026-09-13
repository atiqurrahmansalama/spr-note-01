import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import CustomInput from '@/components/ui/CustomInput';
import CustomButton from '@/components/ui/CustomButton';
import { SignalIcon, SendIcon, CheckCircle2Icon, AlertTriangleIcon } from '@/components/ui/Icons';
import { testPingGateway } from '@/api/notifications';
import { useToast } from '@/context/ToastContext';
import type { NotificationGateway } from '@/types/notifications';

export interface GatewayPingModalProps {
  isOpen: boolean;
  onClose: () => void;
  gateway: NotificationGateway | null;
  onSuccess?: () => void;
}

export default function GatewayPingModal({
  isOpen,
  onClose,
  gateway,
  onSuccess,
}: GatewayPingModalProps) {
  const { showToast } = useToast();
  const [target, setTarget] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);

  if (!isOpen || !gateway) return null;

  const handlePing = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await testPingGateway(gateway.id, target);
      setResult(res);
      showToast(res.message || 'Ping test executed successfully', 'success');
      onSuccess?.();
    } catch (err: any) {
      setResult({ status: 'FAILED', error: err.message });
      showToast(err.message || 'Ping test failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const isEmail = gateway.gateway_type === 'SMTP_EMAIL';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Test Gateway: ${gateway.provider_name.replace(/_/g, ' ')}`}
      subtitle={`Send a test probe to verify ${gateway.gateway_type} gateway connectivity.`}
      size="md"
      icon={SignalIcon}
      badge={gateway.gateway_type}
      footer={null}
    >
      <form onSubmit={handlePing} className="p-5 sm:p-6 space-y-4 text-left">
        <div className="p-3 rounded-xl theme-bg-sub border theme-border flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary block">
              Gateway Provider
            </span>
            <span className="text-xs font-bold theme-text-primary">
              {gateway.provider_name.replace(/_/g, ' ')} ({gateway.gateway_type})
            </span>
          </div>
          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
              gateway.is_active
                ? 'theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20'
                : 'theme-bg-sub theme-text-secondary border theme-border'
            }`}
          >
            {gateway.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>

        <div>
          <CustomInput
            label={isEmail ? 'Target Recipient Email' : 'Target Recipient Phone Number'}
            placeholder={isEmail ? 'e.g. admin@school.edu.bd' : 'e.g. 01712345678, +8801812345678'}
            value={target}
            onChange={(val: string) => setTarget(val)}
            required
            icon={SignalIcon}
          />
        </div>

        {/* Result Inspector */}
        {result && (
          <div
            className={`p-3.5 rounded-xl border text-xs space-y-1.5 animate-fade-in ${
              result.status === 'SUCCESS' || result.status === 'SIMULATED'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
            }`}
          >
            <div className="flex items-center gap-2 font-bold">
              {result.status === 'SUCCESS' || result.status === 'SIMULATED' ? (
                <CheckCircle2Icon className="w-4 h-4" />
              ) : (
                <AlertTriangleIcon className="w-4 h-4" />
              )}
              <span>
                Status: {result.status} {result.status === 'SIMULATED' ? '(Development Simulation)' : ''}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed opacity-90">
              {result.message || result.error || 'Test ping response captured.'}
            </p>
            {result.response && (
              <pre className="mt-2 p-2 rounded-lg theme-bg-surface/80 text-[10px] font-mono overflow-x-auto max-h-32">
                {JSON.stringify(result.response, null, 2)}
              </pre>
            )}
          </div>
        )}

        <div className="pt-3 border-t theme-border flex items-center justify-end gap-2.5">
          <CustomButton type="button" variant="sub" size="md" onClick={onClose}>
            Close
          </CustomButton>
          <CustomButton
            type="submit"
            variant="primary"
            size="md"
            icon={SendIcon}
            loading={loading}
          >
            Send Test Ping
          </CustomButton>
        </div>
      </form>
    </Modal>
  );
}
