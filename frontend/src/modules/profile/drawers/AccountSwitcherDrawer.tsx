import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../../context/ToastContext';
import { multiAccount, auth as authStore } from '../../../utils/localStore';
import { fetchWithAuth } from '../../../utils/authService';
import {
  CheckIcon,
  TrashIcon,
  PlusIcon,
  UserCheckIcon,
  GoogleIcon,
  ShieldCheckIcon,
} from '../../../components/ui/Icons';
import { DrawerContainer, DrawerFooter, DrawerSection } from '../../../components/layout';
import { ConfirmModal } from '../../../components/ui/Modal';
import ActionMenu from '../../../components/ui/ActionMenu';
import { useTranslation } from '../../../i18n';
import type { UserProfile } from '../types';

interface AccountSwitcherDrawerProps {
  onClose: () => void;
}

export const AccountSwitcherDrawer: React.FC<AccountSwitcherDrawerProps> = ({ onClose }) => {
  const { showToast } = useToast();
  const { t } = useTranslation('profile');
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState<any[]>([]);
  const [activeUser, setActiveUser] = useState<UserProfile | null>(null);

  const loadAccounts = useCallback(() => {
    const current = authStore.getUser();
    setActiveUser(current);

    let saved = multiAccount.getAccounts() || [];

    if (current) {
      const activeId = current.phone_number || current.email || current.id;
      const exists = saved.some((a: any) => {
        const id = a.user?.phone_number || a.user?.email || a.user?.id;
        return id === activeId;
      });

      if (!exists) {
        const currentToken = authStore.getAccessToken();
        const currentRefresh = authStore.getRefreshToken();
        saved = multiAccount.saveAccount({
          user: current,
          access: currentToken,
          refresh: currentRefresh,
        });
      }
    }

    setAccounts(saved);
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleSwitch = (account: any) => {
    const targetId = account.user?.phone_number || account.user?.email || account.user?.id;
    const activeId = activeUser?.phone_number || activeUser?.email || activeUser?.id;

    if (targetId === activeId) {
      onClose();
      return;
    }

    const success = multiAccount.switchAccount(targetId);
    if (success) {
      showToast(t('accountSwitchedSuccess', `Switched account to ${account.user?.name || targetId}`), 'success');
      window.dispatchEvent(new CustomEvent('spr_auth_updated'));
      onClose();
      window.location.reload();
    } else {
      showToast(t('accountSwitchFailed', 'Failed switching account.'), 'error');
    }
  };

  const handleRemove = (e: React.MouseEvent, account: any) => {
    e.stopPropagation();
    const targetId = account.user?.phone_number || account.user?.email || account.user?.id;
    const updated = multiAccount.removeAccount(targetId);
    setAccounts(updated);
    showToast(t('accountRemoved', 'Account removed from saved list.'), 'info');
  };

  const handleAddAccount = () => {
    onClose();
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
    navigate(`/login?action=add_account&returnTo=${encodeURIComponent(currentPath)}`);
  };

  const [linkingGoogle, setLinkingGoogle] = useState(false);
  const [unlinkingGoogle, setUnlinkingGoogle] = useState(false);
  const [showUnlinkGoogleConfirm, setShowUnlinkGoogleConfirm] = useState(false);

  const isGoogleLinked = Boolean(
    activeUser?.has_google_linked || activeUser?.google_sub_id || activeUser?.auth_provider === 'google'
  );

  const handleLinkGoogle = async () => {
    setLinkingGoogle(true);
    try {
      const res = await fetchWithAuth('/api/v1/auth/google/link/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          google_sub_id: activeUser?.email || `google_${activeUser?.id || 'linked'}`,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(t('googleAccountLinkedSuccess', 'Google account linked successfully!'), 'success');
        if (activeUser) {
          const updatedUser: UserProfile = {
            ...activeUser,
            has_google_linked: true,
            google_sub_id: data.google_sub_id || 'linked',
          };
          setActiveUser(updatedUser);
          authStore.saveUser(updatedUser);
        }
        window.dispatchEvent(new CustomEvent('spr_auth_updated'));
      } else {
        showToast(data.error || 'Failed to link Google account.', 'error');
      }
    } catch {
      showToast(t('serverOffline', 'Server connection error.'), 'error');
    } finally {
      setLinkingGoogle(false);
    }
  };

  const [unlinkPassword, setUnlinkPassword] = useState('');

  const handleUnlinkGoogle = async () => {
    if (!unlinkPassword.trim()) {
      showToast(t('passwordRequiredToDisconnect', 'Password is required to disconnect Google account.'), 'warning');
      return;
    }
    setUnlinkingGoogle(true);
    try {
      const res = await fetchWithAuth('/api/v1/auth/google/unlink/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: unlinkPassword.trim() }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(t('googleAccountUnlinkedSuccess', 'Google account disconnected successfully!'), 'info');
        if (activeUser) {
          const updatedUser: UserProfile = {
            ...activeUser,
            has_google_linked: false,
            google_sub_id: undefined,
          };
          setActiveUser(updatedUser);
          authStore.saveUser(updatedUser);
        }
        window.dispatchEvent(new CustomEvent('spr_auth_updated'));
        setShowUnlinkGoogleConfirm(false);
        setUnlinkPassword('');
      } else {
        showToast(data.error || 'Cannot disconnect Google account.', 'error');
      }
    } catch {
      showToast(t('serverOffline', 'Server connection error.'), 'error');
    } finally {
      setUnlinkingGoogle(false);
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
          title={t('savedAccounts', 'Saved Accounts')}
          subtitle={t('drawerAccountsSubtitle', 'Switch between multiple saved institutional profiles.')}
          icon={UserCheckIcon}
          className="pt-0 first:pt-0"
        >
          {/* Saved Accounts List */}
          <div className="border theme-border rounded-xl overflow-hidden theme-bg-surface">
            {accounts.map((acc, idx) => {
              const accUser = acc.user || {};
              const activeId = activeUser?.phone_number || activeUser?.email || activeUser?.id;
              const targetId = accUser.phone_number || accUser.email || accUser.id;
              const isCurrent = activeId === targetId;

              const name =
                accUser.name ||
                (accUser.first_name ? `${accUser.first_name} ${accUser.last_name || ''}`.trim() : null) ||
                accUser.phone_number ||
                accUser.username ||
                'User Account';

              const rawRole = accUser.role?.name || accUser.role || 'Teacher';

              return (
                <div
                  key={idx}
                  onClick={() => handleSwitch(acc)}
                  className={`p-3.5 sm:p-4 flex items-start justify-between gap-3 cursor-pointer transition-colors border-b theme-border last:border-b-0 ${
                    isCurrent ? 'theme-bg-sub/60 font-semibold' : 'hover:theme-bg-sub/40'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-full border theme-border theme-bg-sub flex items-center justify-center shrink-0 overflow-hidden mt-0.5">
                      {accUser.avatar_url ? (
                        <img src={accUser.avatar_url} alt={name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold theme-text-primary">
                          {name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-semibold theme-text-primary block leading-snug break-words">{name}</span>
                      <p className="text-xs theme-text-secondary mt-0.5 leading-relaxed break-words">
                        {accUser.email || accUser.phone_number || rawRole}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start pt-1 shrink-0">
                    {isCurrent ? (
                      <div className="w-4.5 h-4.5 rounded-full theme-bg-accent flex items-center justify-center theme-accent-text shrink-0">
                        <CheckIcon className="w-2.5 h-2.5" />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => handleRemove(e, acc)}
                        className="p-1.5 rounded-lg theme-text-secondary hover:theme-danger hover:theme-bg-danger-soft transition-colors cursor-pointer"
                        title={t('removeSavedAccount', 'Remove Account')}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Another Account Action Box */}
          <button
            type="button"
            onClick={handleAddAccount}
            className="w-full p-3.5 rounded-xl border border-dashed theme-border hover:border-primary/50 theme-bg-sub/30 hover:theme-bg-sub/60 transition-all flex items-center justify-center gap-2.5 text-xs font-semibold theme-text-primary hover:theme-accent cursor-pointer group active:scale-[0.99] select-none"
          >
            <div className="w-7 h-7 rounded-lg theme-bg-accent-soft theme-accent flex items-center justify-center transition-transform group-hover:scale-110">
              <PlusIcon className="w-4 h-4" />
            </div>
            <span>{t('addAnotherAccount', 'Add Another Account')}</span>
          </button>
        </DrawerSection>

        {/* Section 2: Connected Social & Single Sign-On (SSO) */}
        <DrawerSection
          title={t('socialAccountsSection', 'Connected Social & Single Sign-On (SSO)')}
          subtitle={t(
            'socialAccountsDesc',
            'Manage third-party identities and single sign-on providers linked to this account.'
          )}
          icon={ShieldCheckIcon}
        >
          <div className="space-y-3">
            {/* Google Workspace Account Card */}
            <div className="p-3.5 sm:p-4 rounded-xl border theme-border theme-bg-surface shadow-2xs flex items-start justify-between gap-3 transition-colors hover:border-[var(--accent-main)]/30">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl border theme-border theme-bg-sub flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                  <GoogleIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold theme-text-primary leading-snug break-words">
                      {t('googleAccountTitle', 'Google Workspace / Gmail')}
                    </span>
                    {isGoogleLinked && (
                      <span
                        className="w-4 h-4 rounded-full theme-bg-accent text-white inline-flex items-center justify-center shadow-xs shrink-0"
                        title={t('badgeConnected', 'Connected')}
                        aria-label={t('badgeConnected', 'Connected')}
                      >
                        <CheckIcon className="w-2.5 h-2.5 stroke-[2.5]" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs theme-text-secondary mt-0.5 leading-relaxed break-words">
                    {isGoogleLinked
                      ? activeUser?.email ||
                        t(
                          'googleConnectedDesc',
                          'Linked for one-click SSO sign-in with your Google account.'
                        )
                      : t(
                          'googleDisconnectedDesc',
                          'Connect your Google account for seamless one-click authentication.'
                        )}
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex items-start pt-0.5">
                {isGoogleLinked ? (
                  <ActionMenu
                    items={[
                      {
                        label: t('disconnectGoogle', 'Disconnect Google Account'),
                        icon: TrashIcon,
                        variant: 'danger',
                        onClick: () => setShowUnlinkGoogleConfirm(true),
                      },
                    ]}
                    size="sm"
                    align="right"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={handleLinkGoogle}
                    disabled={linkingGoogle}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold theme-bg-elevated border theme-border theme-text-primary hover:theme-accent hover:border-[var(--accent-main)]/30 transition-colors cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    {linkingGoogle ? t('loading', 'Loading...') : t('connectGoogle', 'Connect Google')}
                  </button>
                )}
              </div>
            </div>

            {/* Institutional SSO / SAML Provider Card */}
            <div className="p-3.5 sm:p-4 rounded-xl border theme-border theme-bg-sub/30 shadow-2xs flex items-start gap-3 transition-colors">
              <div className="w-10 h-10 rounded-xl border theme-border theme-bg-surface flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                <ShieldCheckIcon className="w-5 h-5 theme-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold theme-text-primary leading-snug break-words">
                    {t('institutionalSsoTitle', 'Institutional Identity Provider (SAML / OIDC)')}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20 shrink-0 whitespace-nowrap shadow-2xs">
                    {t('badgeReady', 'Enterprise Ready')}
                  </span>
                </div>
                <p className="text-xs theme-text-secondary mt-0.5 leading-relaxed break-words">
                  {t(
                    'institutionalSsoDesc',
                    'Campus domain SSO is enabled for enterprise single sign-on.'
                  )}
                </p>
              </div>
            </div>
          </div>
        </DrawerSection>
      </div>

      <ConfirmModal
        isOpen={showUnlinkGoogleConfirm}
        onClose={() => {
          setShowUnlinkGoogleConfirm(false);
          setUnlinkPassword('');
        }}
        onConfirm={handleUnlinkGoogle}
        title={t('confirmDisconnectGoogleTitle', 'Disconnect Google Account?')}
        message={t(
          'confirmDisconnectGoogleDesc',
          'Are you sure you want to disconnect this Google account? Enter your account password to confirm.'
        )}
        confirmText={t('disconnectGoogle', 'Disconnect')}
        confirmVariant="danger"
        confirmLoading={unlinkingGoogle}
        confirmDisabled={!unlinkPassword.trim() || unlinkingGoogle}
      >
        <div className="mt-4 pt-3 border-t theme-border space-y-2 text-left">
          <label className="block text-xs font-semibold theme-text-secondary">
            {t('accountPasswordLabel', 'Account Password')} <span className="theme-danger">*</span>
          </label>
          <input
            type="password"
            value={unlinkPassword}
            onChange={(e) => setUnlinkPassword(e.target.value)}
            placeholder={t('enterPasswordToConfirm', 'Enter your account password to confirm')}
            className="w-full px-3 py-2 rounded-xl border theme-border theme-bg-sub/50 theme-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent-main)]"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && unlinkPassword.trim()) {
                e.preventDefault();
                handleUnlinkGoogle();
              }
            }}
          />
        </div>
      </ConfirmModal>
    </DrawerContainer>
  );
};

export default AccountSwitcherDrawer;
