import { useState, useEffect } from "react";
import { useToast } from "../../../context/ToastContext";
import { multiAccount, auth as authStore } from "../../../utils/localStore";
import { CloseIcon, LockIcon } from "../../../components/ui/Icons";

export default function AccountSwitcherModal({ isOpen, onClose }) {
  const { showToast } = useToast();
  const [accounts, setAccounts] = useState([]);
  const [activeUser, setActiveUser] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadAccounts();
    }
  }, [isOpen]);

  const loadAccounts = () => {
    const current = authStore.getUser();
    setActiveUser(current);

    let saved = multiAccount.getAccounts() || [];

    // Ensure current active user is in saved accounts list
    if (current) {
      const activeId = current.phone_number || current.email || current.id;
      const exists = saved.some((a) => {
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
  };

  const handleSwitch = (account) => {
    const targetId = account.user?.phone_number || account.user?.email || account.user?.id;
    const activeId = activeUser?.phone_number || activeUser?.email || activeUser?.id;

    if (targetId === activeId) {
      onClose();
      return;
    }

    const success = multiAccount.switchAccount(targetId);
    if (success) {
      showToast(`Switched account to ${account.user?.name || targetId}`, "success");
      window.dispatchEvent(new CustomEvent("spr_auth_updated"));
      onClose();
      window.location.reload();
    } else {
      showToast("Session expired for this account. Please log in again.", "warning");
    }
  };

  const handleRemove = (e, account) => {
    e.stopPropagation();
    const targetId = account.user?.phone_number || account.user?.email || account.user?.id;
    const updated = multiAccount.removeAccount(targetId);
    setAccounts(updated);
    showToast("Removed account from switcher list.", "info");
  };

  const handleAddAccount = () => {
    onClose();
    window.location.href = "/login?mode=add_account";
  };

  if (!isOpen) return null;

  const currentId = activeUser?.phone_number || activeUser?.email || activeUser?.id;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="theme-bg-surface border theme-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 theme-text-primary relative max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b theme-border pb-3.5">
          <div>
            <h2 className="text-base font-bold theme-text-primary tracking-tight">Multi-Account Switcher</h2>
            <p className="text-xs theme-text-secondary mt-0.5">Switch between saved user sessions seamlessly</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition-colors cursor-pointer"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Account List */}
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {accounts.length === 0 ? (
            <div className="p-8 text-center text-xs theme-text-secondary font-mono">
              No saved accounts found.
            </div>
          ) : (
            accounts.map((acc, index) => {
              const u = acc.user || {};
              const id = u.phone_number || u.email || u.id;
              const isActive = id === currentId;
              const displayName = u.name || `${u.first_name || ""} ${u.last_name || ""}`.trim() || id || "Saved Account";
              const subtext = u.email || u.phone_number || "Verified Session";

              return (
                <div
                  key={id || index}
                  onClick={() => handleSwitch(acc)}
                  className={`p-3.5 border rounded-2xl flex items-center justify-between gap-3 transition-all cursor-pointer shadow-sm ${
                    isActive
                      ? "theme-bg-elevated border-[var(--accent-main)]/60 ring-1 ring-[var(--accent-main)]/30"
                      : "theme-bg-sub theme-border hover:theme-bg-elevated"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full border theme-border theme-bg-elevated overflow-hidden flex items-center justify-center theme-text-primary font-bold text-sm shrink-0">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span>{displayName.charAt(0).toUpperCase()}</span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold theme-text-primary truncate">
                          {displayName}
                        </h4>
                        {isActive && (
                          <span className="theme-bg-accent-soft theme-accent border theme-border text-[10px] px-2 py-0.2 rounded-full font-mono font-semibold shrink-0">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] theme-text-secondary font-mono truncate mt-0.5">
                        {subtext}
                      </p>
                    </div>
                  </div>

                  {!isActive && (
                    <button
                      type="button"
                      onClick={(e) => handleRemove(e, acc)}
                      className="text-xs text-zinc-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                      title="Remove Account"
                    >
                      Remove
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Action */}
        <div className="pt-3 border-t theme-border">
          <button
            type="button"
            onClick={handleAddAccount}
            className="w-full py-2.5 rounded-xl theme-bg-sub hover:theme-bg-elevated border theme-border text-xs font-semibold theme-text-primary transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98"
          >
            <span>+ Add Another Account</span>
          </button>
        </div>
      </div>
    </div>
  );
}
