import React, { useEffect, useState, useCallback } from 'react';
import Modal from '../../../../components/ui/Modal';
import {
  ShieldCheckIcon,
  LogOutIcon,
  RefreshIcon,
  CheckCircleIcon,
} from '../../../../components/ui/Icons';
import { useUserTranslation } from '../hooks/useUserTranslation';
import { UserRecord, UserSessionRecord } from '../types';

export interface UserSessionsModalProps {
  user: UserRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onRevokeSessions: (userId: number | string) => Promise<boolean>;
  fetchSessions: (userId: number | string) => Promise<UserSessionRecord[]>;
}

export const UserSessionsModal: React.FC<UserSessionsModalProps> = ({
  user,
  isOpen,
  onClose,
  onRevokeSessions,
  fetchSessions,
}) => {
  const { t, formatDate } = useUserTranslation();
  const [sessions, setSessions] = useState<UserSessionRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [revoking, setRevoking] = useState<boolean>(false);

  const loadSessions = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await fetchSessions(user.id);
      setSessions(data);
    } finally {
      setLoading(false);
    }
  }, [user, fetchSessions]);

  useEffect(() => {
    if (isOpen && user?.id) {
      loadSessions();
    }
  }, [isOpen, user, loadSessions]);

  const handleRevoke = async () => {
    if (!user?.id) return;
    setRevoking(true);
    try {
      const success = await onRevokeSessions(user.id);
      if (success) {
        await loadSessions();
      }
    } finally {
      setRevoking(false);
    }
  };

  const displayName =
    `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.name || user?.email || 'User';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('sessionsModal.title', 'Active Security Sessions')}
      subtitle={`Connected devices and login sessions for ${displayName}`}
      icon={ShieldCheckIcon}
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={loadSessions}
            disabled={loading || revoking}
            className="px-3 py-1.5 rounded-xl theme-bg-sub border theme-border hover:theme-bg-elevated text-xs font-semibold theme-text-secondary transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshIcon className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl theme-bg-sub border theme-border hover:theme-bg-elevated text-xs font-bold theme-text-secondary hover:theme-text-primary transition cursor-pointer"
            >
              {t('deactivateModal.cancel', 'Close')}
            </button>
            <button
              type="button"
              onClick={handleRevoke}
              disabled={revoking || sessions.length === 0}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <LogOutIcon className="w-3.5 h-3.5" />
              <span>{revoking ? 'Revoking...' : t('sessionsModal.revokeAll', 'Revoke All Sessions')}</span>
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-left">
        {loading ? (
          <div className="py-12 text-center text-xs theme-text-secondary animate-pulse">
            Loading active sessions...
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <ShieldCheckIcon className="w-8 h-8 theme-accent mx-auto opacity-40" />
            <p className="text-xs theme-text-secondary font-medium">
              {t('sessionsModal.noActiveSessions', 'No active sessions recorded for this user.')}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {sessions.map((sess) => (
              <div
                key={sess.id}
                className="p-3.5 rounded-2xl theme-bg-sub border theme-border flex items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold theme-text-primary">
                      {sess.device_type || 'Desktop Session'}
                    </span>
                    {sess.is_current && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold theme-bg-accent-soft theme-accent border theme-border">
                        {t('sessionsModal.currentBadge', 'Current Session')}
                      </span>
                    )}
                  </div>

                  <div className="font-mono text-[11px] theme-text-secondary flex items-center gap-2">
                    <span>IP: {sess.ip_address || '—'}</span>
                    <span>•</span>
                    <span className="truncate max-w-xs">{sess.device_info || sess.user_agent || 'Browser'}</span>
                  </div>

                  <div className="text-[10px] theme-text-secondary">
                    {t('sessionsModal.lastActive', 'Last Active')}:{' '}
                    <span className="font-mono">
                      {sess.last_activity ? formatDate(sess.last_activity) : 'Active now'}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1.5 text-emerald-400 font-medium text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Online</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default UserSessionsModal;
