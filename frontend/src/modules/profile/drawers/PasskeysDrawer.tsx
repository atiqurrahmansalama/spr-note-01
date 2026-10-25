import React, { useState, useEffect, useCallback } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import { useToast } from '../../../context/ToastContext';
import { fetchWithAuth } from '../../../utils/authService';
import { PasskeyIcon, PlusIcon, TrashIcon } from '../../../components/ui/Icons';
import CustomButton from '../../../components/ui/CustomButton';
import EmptyState from '../../../components/ui/EmptyState';
import { DrawerContainer, DrawerFooter, DrawerSection } from '../../../components/layout';
import { useTranslation } from '../../../i18n';
import type { PasskeyItem } from '../types';

interface PasskeysDrawerProps {
  onPasskeysUpdated?: (count: number) => void;
  onClose: () => void;
}

export const PasskeysDrawer: React.FC<PasskeysDrawerProps> = ({
  onPasskeysUpdated,
  onClose,
}) => {
  const { showToast } = useToast();
  const { t, formatDate } = useTranslation('profile');

  const [passkeys, setPasskeys] = useState<PasskeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [deletingId, setDeletingId] = useState<number | string | null>(null);

  const fetchPasskeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/v1/auth/passkeys/');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setPasskeys(list);
        if (onPasskeysUpdated) onPasskeysUpdated(list.length);
      } else {
        setPasskeys([]);
      }
    } catch {
      setPasskeys([]);
    } finally {
      setLoading(false);
    }
  }, [onPasskeysUpdated]);

  useEffect(() => {
    fetchPasskeys();
  }, [fetchPasskeys]);

  const handleRegisterPasskey = async () => {
    setRegistering(true);
    try {
      const optionsRes = await fetchWithAuth('/api/v1/auth/passkeys/register-options/');
      if (!optionsRes.ok) {
        throw new Error(t('passkeyOptionsFailed', 'Could not fetch passkey options.'));
      }
      const options = await optionsRes.json();

      // WebAuthn W3C specification strictly requires rp.id to match the origin hostname and forbids raw IP addresses
      if (options && options.rp) {
        const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        options.rp.id = (currentHost === '127.0.0.1' || currentHost === 'localhost' || !options.rp.id)
          ? 'localhost'
          : options.rp.id;
      }

      let credential: any = null;
      try {
        credential = await startRegistration(options);
      } catch (err: any) {
        if (err?.name === 'NotAllowedError') {
          showToast(t('passkeyCancelled', 'Passkey creation was cancelled.'), 'info');
        } else {
          showToast(err?.message || t('passkeyFailed', 'Passkey registration cancelled or failed.'), 'error');
        }
        return;
      }

      if (!credential || !credential.id) {
        showToast(t('passkeyFailed', 'No passkey credential received.'), 'error');
        return;
      }

      const verifyRes = await fetchWithAuth('/api/v1/auth/passkeys/register-verify/', {
        method: 'POST',
        body: JSON.stringify({
          credential,
          name: `${navigator.platform || 'Workstation'} Passkey`,
        }),
      });

      if (verifyRes.ok) {
        showToast(t('passkeyCreatedSuccess', 'Passkey registered successfully!'), 'success');
        fetchPasskeys();
      } else {
        const data = await verifyRes.json().catch(() => ({}));
        showToast(data.error || t('passkeyVerifyFailed', 'Failed validating passkey signature.'), 'error');
      }
    } catch (err: any) {
      showToast(err?.message || t('passkeyFailed', 'Passkey registration cancelled or failed.'), 'error');
    } finally {
      setRegistering(false);
    }
  };

  const handleDeletePasskey = async (id: number | string) => {
    setDeletingId(id);
    try {
      const res = await fetchWithAuth(`/api/v1/auth/passkeys/${id}/`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast(t('passkeyDeleted', 'Passkey removed.'), 'info');
        const updated = passkeys.filter((p) => p.id !== id);
        setPasskeys(updated);
        if (onPasskeysUpdated) onPasskeysUpdated(updated.length);
      } else {
        showToast(t('passkeyDeleteFailed', 'Cannot delete passkey.'), 'error');
      }
    } catch {
      showToast(t('passkeyDeleteFailed', 'Failed deleting passkey.'), 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <DrawerContainer padding="none" spacing="normal">
      <div className="@container space-y-4 pt-2 pb-6 px-1">
        <DrawerSection
          title={t('drawerPasskeysTitle', 'Manage Passkeys & Biometrics')}
          subtitle={t(
            'drawerPasskeysSubtitle',
            'Hardware-bound credentials using Touch ID, Face ID, or Windows Hello for instant, passwordless sign-in.'
          )}
          icon={PasskeyIcon}
          headerRight={
            passkeys.length > 0 && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full theme-bg-sub theme-text-secondary border theme-border">
                {passkeys.length} {passkeys.length === 1 ? t('passkey', 'Passkey') : t('passkeys', 'Passkeys')}
              </span>
            )
          }
          className="pt-0 first:pt-0"
        >
          {loading ? (
            <div className="py-8 flex items-center justify-center">
              <EmptyState
                variant="sub"
                size="sm"
                icon={PasskeyIcon}
                iconVariant="accent"
                title={t('loadingPasskeys', 'Loading passkeys...')}
                description={t(
                  'verifyingHardwareTokens',
                  'Discovering registered biometric credentials...'
                )}
                animate
              />
            </div>
          ) : passkeys.length === 0 ? (
            <div className="py-2">
              <EmptyState
                variant="sub"
                size="sm"
                icon={PasskeyIcon}
                iconVariant="accent"
                title={t('noPasskeysFound', 'No Passkeys Registered')}
                description={t(
                  'noPasskeysDesc',
                  'Register this device biometric scanner to sign in instantly with a single touch.'
                )}
                action={{
                  label: t('createPasskey', 'Add New Passkey'),
                  onClick: handleRegisterPasskey,
                  icon: PlusIcon,
                  variant: 'primary',
                  size: 'sm',
                  disabled: registering,
                }}
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Add Passkey Action Button */}
              <CustomButton
                variant="primary"
                size="sm"
                onClick={handleRegisterPasskey}
                loading={registering}
                icon={PlusIcon}
                className="w-full justify-center"
              >
                {t('createPasskey', 'Add New Passkey')}
              </CustomButton>

              {/* Passkeys List */}
              <div className="divide-y divide-[var(--border-color)] border theme-border rounded-xl overflow-hidden theme-bg-surface">
                {passkeys.map((pk) => (
                  <div
                    key={pk.id}
                    className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:theme-bg-sub/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg theme-bg-accent-soft theme-accent border theme-border flex items-center justify-center shrink-0">
                        <PasskeyIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-semibold theme-text-primary truncate block">
                          {pk.name || t('securityKey', 'Security Passkey')}
                        </span>
                        <span className="text-xs theme-text-secondary font-mono">
                          {t('registeredOn', 'Added')}: {pk.created_at ? formatDate(pk.created_at) : 'Active'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeletePasskey(pk.id)}
                      disabled={deletingId === pk.id}
                      className="p-1.5 rounded-lg theme-text-secondary hover:theme-danger hover:theme-bg-danger-soft transition-colors shrink-0 cursor-pointer"
                      title={t('deletePasskey', 'Delete passkey')}
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DrawerSection>
      </div>

      <DrawerFooter onCancel={onClose} cancelLabel={t('close', 'Close')} />
    </DrawerContainer>
  );
};

export default PasskeysDrawer;
