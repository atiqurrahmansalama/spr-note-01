import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import { useToast } from '../../../context/ToastContext';
import { fetchWithAuth } from '../../../utils/authService';
import {
  PasskeyIcon,
  PlusIcon,
  TrashIcon,
  ChevronIcon,
  CheckCircleIcon,
  SmartphoneIcon,
  LaptopIcon,
  DesktopIcon,
  TabletIcon,
  EyeIcon,
  CopyIcon,
  KeyIcon,
  CloseIcon,
} from '../../../components/ui/Icons';
import ActionMenu from '../../../components/ui/ActionMenu';
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
  const [viewingPasskey, setViewingPasskey] = useState<PasskeyItem | null>(null);

  // Intelligent local platform detection
  const currentDeviceKeyword = useMemo(() => {
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const platform = typeof navigator !== 'undefined' ? (navigator as any).userAgentData?.platform || navigator.platform || '' : '';
    if (/Win/i.test(platform) || /Windows/i.test(userAgent)) return 'Windows';
    if (/Mac/i.test(platform) || /Macintosh/i.test(userAgent)) return 'Mac';
    if (/iPhone|iPad|iPod/i.test(userAgent)) return 'iPhone';
    if (/Android/i.test(userAgent)) return 'Android';
    if (/Linux/i.test(platform)) return 'Linux';
    return 'PC';
  }, []);

  const isCurrentDeviceRegistered = useMemo(() => {
    return passkeys.some((p) => {
      const str = `${p.device_name || ''} ${p.name || ''}`.toLowerCase();
      return str.includes(currentDeviceKeyword.toLowerCase());
    });
  }, [passkeys, currentDeviceKeyword]);

  // Dynamic device icon detection based on registered device characteristics
  const getDeviceIcon = useCallback((pk: PasskeyItem) => {
    const str = `${pk.device_name || ''} ${pk.name || ''}`.toLowerCase();
    if (/phone|iphone|android|mobile/i.test(str)) return SmartphoneIcon;
    if (/ipad|tablet/i.test(str)) return TabletIcon;
    if (/macbook|laptop|notebook/i.test(str)) return LaptopIcon;
    if (/win|pc|desktop|computer|linux|workstation/i.test(str)) return DesktopIcon;
    return PasskeyIcon;
  }, []);

  // Localized date and time formatting (culturally and timezone accurate)
  const formatDateTime = (isoDate?: string, fallbackDisplay?: string) => {
    if (!isoDate) return fallbackDisplay || 'Active';
    try {
      const d = new Date(isoDate);
      if (isNaN(d.getTime())) return fallbackDisplay || isoDate;
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return fallbackDisplay || isoDate;
    }
  };

  // Localized date only formatting for compact display on small containers
  const formatDateOnly = (isoDate?: string, fallbackDisplay?: string) => {
    if (!isoDate) return fallbackDisplay || 'Active';
    try {
      const d = new Date(isoDate);
      if (isNaN(d.getTime())) return fallbackDisplay || isoDate;
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return fallbackDisplay || isoDate;
    }
  };

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
      const clientHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      const cleanHost = (clientHost === '127.0.0.1' || clientHost === 'localhost' || clientHost === '::1')
        ? 'localhost'
        : clientHost;

      const optionsRes = await fetchWithAuth(`/api/v1/auth/passkeys/register-options/?rp_id=${encodeURIComponent(cleanHost)}`);
      if (!optionsRes.ok) {
        throw new Error(t('passkeyOptionsFailed', 'Could not fetch passkey options.'));
      }
      const options = await optionsRes.json();

      // WebAuthn W3C specification strictly requires rp.id to match the current browser origin hostname
      if (options && options.rp) {
        options.rp.id = cleanHost;
      }

      let credential: any = null;
      try {
        credential = await startRegistration({ optionsJSON: options });
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

      // Detect intelligent OS and browser name
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
      const platform = typeof navigator !== 'undefined' ? (navigator as any).userAgentData?.platform || navigator.platform || '' : '';
      const isWin = /Win/i.test(platform) || /Windows/i.test(userAgent);
      const isMac = /Mac/i.test(platform) || /Macintosh/i.test(userAgent);
      const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
      const isAndroid = /Android/i.test(userAgent);
      const isLinux = /Linux/i.test(platform) && !isAndroid;

      let detectedDevice = isWin ? 'Windows PC' : isMac ? 'MacBook' : isIOS ? 'iPhone' : isAndroid ? 'Android Device' : isLinux ? 'Linux' : 'Personal Computer';
      if (/Edg/i.test(userAgent)) detectedDevice += ' (Edge)';
      else if (/Chrome/i.test(userAgent)) detectedDevice += ' (Chrome)';
      else if (/Safari/i.test(userAgent)) detectedDevice += ' (Safari)';
      else if (/Firefox/i.test(userAgent)) detectedDevice += ' (Firefox)';

      const verifyRes = await fetchWithAuth('/api/v1/auth/passkeys/register-verify/', {
        method: 'POST',
        body: JSON.stringify({
          credential,
          name: `${detectedDevice} Biometrics`,
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
    <DrawerContainer
      padding="none"
      spacing="normal"
      footer={<DrawerFooter onCancel={onClose} cancelLabel={t('close', 'Close')} />}
    >
      <div className="@container space-y-4 pt-2 pb-6 px-1">
        <DrawerSection
          title={t('drawerPasskeysTitle', 'Manage Passkeys & Biometrics')}
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
              {/* Context Explanation: Clean without side margins */}
              <div className="text-xs space-y-1">
                <p className="font-semibold theme-text-primary">
                  {t('passkeyHelpTitle', 'One Passkey Per Device')}
                </p>
                <p className="theme-text-secondary leading-relaxed">
                  {t(
                    'passkeyHelpDesc',
                    'Each device (your phone, laptop, or work PC) holds its own hardware security key. Once registered on this device, you can sign in with a single touch without typing a password.'
                  )}
                </p>
              </div>

              {/* Current Device Status & Action Handling */}
              {isCurrentDeviceRegistered ? (
                <div className="p-3 sm:p-3.5 rounded-xl theme-bg-sub/60 border theme-border flex items-center justify-between gap-2.5 shadow-2xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircleIcon className="w-4 h-4 theme-accent shrink-0" />
                    <span className="text-xs font-semibold theme-text-primary truncate">
                      {t('deviceAlreadySecured', 'This Device is Secured')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRegisterPasskey}
                    disabled={registering}
                    className="text-xs font-semibold theme-accent hover:underline shrink-0 cursor-pointer transition-colors whitespace-nowrap text-right"
                  >
                    {t('reRegisterDevice', 'Re-register Device')}
                  </button>
                </div>
              ) : (
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
              )}

              {/* Enriched Passkeys List */}
              <div className="space-y-2.5">
                {passkeys.map((pk) => {
                  const displayName = pk.device_name || pk.name || t('securityKey', 'Security Passkey');
                  const isThisDevice = `${pk.device_name || ''} ${pk.name || ''}`
                    .toLowerCase()
                    .includes(currentDeviceKeyword.toLowerCase());
                  const formattedDateTime = formatDateTime(pk.created_at, pk.created_at_display);
                  const formattedDateOnly = formatDateOnly(pk.created_at, pk.created_at_display);
                  const DeviceIcon = getDeviceIcon(pk);

                  const menuActions = [
                    {
                      label: t('viewCredentialId', 'View Credential Hash'),
                      icon: EyeIcon,
                      onClick: () => setViewingPasskey(viewingPasskey?.id === pk.id ? null : pk),
                    },
                    {
                      label: t('copyCredentialId', 'Copy Credential Hash'),
                      icon: CopyIcon,
                      onClick: () => {
                        const keyText = pk.full_credential_id || pk.credential_id || '';
                        navigator.clipboard.writeText(keyText);
                        showToast(t('credentialCopied', 'Credential ID copied to clipboard'), 'info');
                      },
                    },
                    {
                      label: t('deletePasskey', 'Delete Passkey'),
                      icon: TrashIcon,
                      variant: 'danger' as const,
                      disabled: deletingId === pk.id,
                      onClick: () => handleDeletePasskey(pk.id),
                    },
                  ];

                  return (
                    <div
                      key={pk.id}
                      className="p-3 sm:p-3.5 rounded-xl border theme-border theme-bg-surface flex items-center justify-between gap-3 shadow-2xs hover:border-[var(--accent-main)]/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-lg theme-bg-sub flex items-center justify-center shrink-0">
                          <DeviceIcon className="w-4 h-4 theme-text-secondary" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs sm:text-sm font-semibold theme-text-primary truncate max-w-[150px] @[360px]:max-w-[200px] @[440px]:max-w-none">
                              {displayName}
                            </span>
                            {isThisDevice && (
                              <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20 shrink-0">
                                {t('currentDeviceBadge', 'This Device')}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10.5px] sm:text-[11px] theme-text-secondary flex-wrap @[420px]:flex-nowrap min-w-0">
                            <span className="shrink-0 hidden @[420px]:inline">{formattedDateTime}</span>
                            <span className="shrink-0 @[420px]:hidden">{formattedDateOnly}</span>
                            <span className="opacity-50 shrink-0">&bull;</span>
                            <span className="font-medium text-emerald-600 dark:text-emerald-400 shrink-0 whitespace-nowrap">
                              {t('biometricProtected', 'Biometric Hardware Key')}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center">
                        <ActionMenu
                          actions={menuActions}
                          size="sm"
                          align="right"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Inline Credential Hash Inspector (Opened directly below inside the drawer instead of in a modal) */}
              {viewingPasskey && (
                <div className="p-4 rounded-xl border theme-border theme-bg-surface shadow-xs space-y-3 animate-fade-in mt-3">
                  <div className="flex items-center justify-between pb-2 border-b theme-border">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0">
                        <KeyIcon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold theme-text-primary truncate">
                          {viewingPasskey.device_name || viewingPasskey.name || t('securityKey', 'Security Passkey')}
                        </h4>
                        <span className="text-[10px] theme-text-secondary block">
                          {t('credentialHash', 'Credential ID Hash')}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setViewingPasskey(null)}
                      className="p-1 rounded-md theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition-colors cursor-pointer"
                      title={t('close', 'Close')}
                    >
                      <CloseIcon className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs theme-text-secondary leading-relaxed">
                    {t(
                      'credentialHashDesc',
                      'Cryptographic hardware credential identifier registered for this device token.'
                    )}
                  </p>

                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      const keyText = viewingPasskey.full_credential_id || viewingPasskey.credential_id || '';
                      navigator.clipboard.writeText(keyText);
                      showToast(t('credentialCopied', 'Credential ID copied to clipboard'), 'info');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        const keyText = viewingPasskey.full_credential_id || viewingPasskey.credential_id || '';
                        navigator.clipboard.writeText(keyText);
                        showToast(t('credentialCopied', 'Credential ID copied to clipboard'), 'info');
                      }
                    }}
                    title={t('clickToCopy', 'Click to copy credential hash')}
                    className="group relative cursor-pointer theme-text-primary break-all select-all font-mono text-xs theme-bg-sub/70 hover:theme-bg-sub p-3 pr-9 rounded-xl border theme-border hover:border-[var(--accent-main)]/50 transition-colors leading-relaxed shadow-2xs"
                  >
                    <span>{viewingPasskey.full_credential_id || viewingPasskey.credential_id}</span>
                    <span className="absolute top-2.5 right-2.5 p-1 rounded-md theme-bg-surface/80 opacity-60 group-hover:opacity-100 transition-opacity">
                      <CopyIcon className="w-3.5 h-3.5 theme-accent" />
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </DrawerSection>
      </div>
    </DrawerContainer>
  );
};

export default PasskeysDrawer;
