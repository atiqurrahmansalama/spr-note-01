import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../../context/ToastContext';
import { multiAccount, auth as authStore } from '../../../utils/localStore';
import { CheckIcon, TrashIcon } from '../../../components/ui/Icons';
import { DrawerContainer, DrawerFooter } from '../../../components/layout';
import { useTranslation } from '../../../i18n';
import type { UserProfile } from '../types';

interface AccountSwitcherDrawerProps {
  onClose: () => void;
}

export const AccountSwitcherDrawer: React.FC<AccountSwitcherDrawerProps> = ({ onClose }) => {
  const { showToast } = useToast();
  const { t } = useTranslation('profile');

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

  return (
    <DrawerContainer padding="none" spacing="normal">
      <div className="@container space-y-4 pt-2 pb-6 px-1">
        <div className="p-3.5 rounded-xl theme-bg-sub/50 border theme-border text-xs theme-text-secondary leading-relaxed">
          {t(
            'drawerAccountsSubtitle',
            'Select any previously saved profile to instantly switch workspaces.'
          )}
        </div>

        <div className="divide-y divide-theme-border border theme-border rounded-xl overflow-hidden theme-bg-surface">
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
                className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                  isCurrent ? 'theme-bg-sub/60 font-semibold' : 'hover:theme-bg-sub/40'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full border theme-border theme-bg-sub flex items-center justify-center shrink-0 overflow-hidden">
                    {accUser.avatar_url ? (
                      <img src={accUser.avatar_url} alt={name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold theme-text-primary">
                        {name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold theme-text-primary truncate">{name}</span>
                      {isCurrent && (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full theme-bg-accent-soft theme-accent border theme-border shrink-0">
                          {t('activeNow', 'Active')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs theme-text-secondary truncate mt-0.5">
                      {accUser.email || accUser.phone_number || rawRole}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isCurrent ? (
                    <div className="w-6 h-6 rounded-full theme-bg-accent flex items-center justify-center theme-accent-text">
                      <CheckIcon className="w-3.5 h-3.5" />
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
      </div>

      <DrawerFooter onCancel={onClose} cancelLabel={t('close', 'Close')} />
    </DrawerContainer>
  );
};

export default AccountSwitcherDrawer;
