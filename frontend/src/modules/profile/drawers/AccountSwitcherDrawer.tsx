import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../../context/ToastContext';
import { multiAccount, auth as authStore } from '../../../utils/localStore';
import { CheckIcon, TrashIcon, PlusIcon, UserCheckIcon } from '../../../components/ui/Icons';
import { DrawerContainer, DrawerFooter, DrawerSection } from '../../../components/layout';
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

  return (
    <DrawerContainer padding="none" spacing="normal">
      <div className="@container space-y-4 pt-2 pb-6 px-1">
        <DrawerSection
          title={t('savedAccounts', 'Saved Accounts')}
          icon={UserCheckIcon}
          headerRight={
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full theme-bg-sub theme-text-secondary border theme-border">
              {accounts.length} {accounts.length === 1 ? t('account', 'Account') : t('accounts', 'Accounts')}
            </span>
          }
          className="pt-0 first:pt-0"
        >
          {/* Saved Accounts List */}
          <div className="border theme-border rounded-xl overflow-hidden theme-bg-surface divide-y divide-[var(--border-color)]">
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
                  className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer transition-colors border-b theme-border last:border-b-0 ${
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
                      <span className="text-sm font-semibold theme-text-primary truncate block">{name}</span>
                      <p className="text-xs theme-text-secondary truncate mt-0.5">
                        {accUser.email || accUser.phone_number || rawRole}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
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
      </div>

      <DrawerFooter onCancel={onClose} cancelLabel={t('close', 'Close')} />
    </DrawerContainer>
  );
};

export default AccountSwitcherDrawer;
