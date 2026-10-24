import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../../context/ToastContext';
import { fetchWithAuth } from '../../../utils/authService';
import { LaptopIcon, SmartphoneIcon, LogOutIcon, TrashIcon } from '../../../components/ui/Icons';
import CustomButton from '../../../components/ui/CustomButton';
import { DrawerContainer, DrawerFooter } from '../../../components/layout';
import { ConfirmModal } from '../../../components/ui/Modal';
import { useTranslation } from '../../../i18n';
import type { UserSession } from '../types';

interface ActiveSessionsDrawerProps {
  onClose: () => void;
}

export const ActiveSessionsDrawer: React.FC<ActiveSessionsDrawerProps> = ({ onClose }) => {
  const { showToast } = useToast();
  const { t } = useTranslation('profile');

  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | number | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [showConfirmLogoutAll, setShowConfirmLogoutAll] = useState(false);

  const getFallbackSessions = (): UserSession[] => [
    {
      id: 1,
      device_name: 'Current Browser Workstation',
      device_type: 'web',
      ip_address: '127.0.0.1 (Local Workstation)',
      login_at_formatted: 'Today - Active Now',
      last_activity_formatted: 'Active now',
      is_current: true,
    },
  ];

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      let res = await fetchWithAuth('/api/v1/auth/sessions/');
      if (!res.ok) {
        res = await fetchWithAuth('/api/v1/user/sessions/');
      }

      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.results || data.sessions || [];
        setSessions(list.length ? list : getFallbackSessions());
      } else {
        setSessions(getFallbackSessions());
      }
    } catch {
      setSessions(getFallbackSessions());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleRevokeSingle = async (sessionId: string | number) => {
    if (!sessionId) return;
    setRevokingId(sessionId);
    try {
      let res = await fetchWithAuth('/api/v1/auth/sessions/revoke/', {
        method: 'POST',
        body: JSON.stringify({ session_id: sessionId }),
      });

      if (!res.ok) {
        res = await fetchWithAuth(`/api/v1/user/sessions/${sessionId}/`, {
          method: 'DELETE',
        });
      }

      if (res.ok) {
        showToast(t('sessionRevoked', 'Device session terminated.'), 'info');
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      } else {
        showToast(t('sessionRevokeError', 'Could not terminate session.'), 'error');
      }
    } catch {
      showToast(t('sessionRevokeError', 'Failed terminating session.'), 'error');
    } finally {
      setRevokingId(null);
    }
  };

  const handleLogoutAllOthers = async () => {
    setRevokingAll(true);
    try {
      let res = await fetchWithAuth('/api/v1/user/sessions/logout-others/', {
        method: 'POST',
      });

      if (!res.ok) {
        res = await fetchWithAuth('/api/v1/auth/sessions/revoke-all/', {
          method: 'POST',
        });
      }

      if (res.ok) {
        showToast(t('allOtherSessionsTerminated', 'Terminated all other device sessions!'), 'success');
        setSessions((prev) => prev.filter((s) => s.is_current));
      } else {
        showToast(t('logoutOthersError', 'Failed terminating other sessions.'), 'error');
      }
    } catch {
      showToast(t('logoutOthersError', 'Error revoking sessions.'), 'error');
    } finally {
      setRevokingAll(false);
      setShowConfirmLogoutAll(false);
    }
  };

  const otherSessionsCount = sessions.filter((s) => !s.is_current).length;

  return (
    <>
      <DrawerContainer padding="none" spacing="normal">
        <div className="@container space-y-4 pt-2 pb-6 px-1">
          {/* Header Info Banner */}
          <div className="p-3.5 rounded-xl theme-bg-sub/50 border theme-border text-xs theme-text-secondary leading-relaxed">
            {t(
              'drawerSessionsSubtitle',
              'These are the web browsers and mobile devices currently logged into your account.'
            )}
          </div>

          {loading ? (
            <div className="space-y-2 py-2">
              <div className="h-16 theme-bg-sub/50 rounded-xl animate-pulse" />
              <div className="h-16 theme-bg-sub/50 rounded-xl animate-pulse" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm theme-text-secondary text-center py-6">
              {t('noSessionsFound', 'No active sessions found.')}
            </p>
          ) : (
            <div className="divide-y divide-theme-border border theme-border rounded-xl overflow-hidden theme-bg-surface">
              {sessions.map((sess) => (
                <div
                  key={sess.id}
                  className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:theme-bg-sub/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg theme-bg-sub/60 border theme-border flex items-center justify-center shrink-0">
                      {sess.device_type === 'mobile' ? (
                        <SmartphoneIcon className="w-4 h-4 theme-accent" />
                      ) : (
                        <LaptopIcon className="w-4 h-4 theme-accent" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold theme-text-primary truncate">
                          {sess.device_name || sess.device_info || 'Workstation Browser'}
                        </span>
                        {sess.is_current && (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full theme-bg-accent-soft theme-accent border theme-border shrink-0">
                            {t('currentSession', 'This Device')}
                          </span>
                        )}
                      </div>
                      <div className="text-xs theme-text-secondary flex items-center gap-2 mt-0.5 flex-wrap">
                        <span>{sess.ip_address || '127.0.0.1'}</span>
                        <span>•</span>
                        <span>{sess.last_activity_formatted || sess.login_at_formatted || 'Active'}</span>
                      </div>
                    </div>
                  </div>

                  {!sess.is_current && (
                    <button
                      type="button"
                      onClick={() => handleRevokeSingle(sess.id)}
                      disabled={revokingId === sess.id}
                      className="p-2 rounded-lg theme-text-secondary hover:theme-danger hover:theme-bg-danger-soft transition-colors shrink-0 cursor-pointer"
                      title={t('revokeSession', 'Revoke Device')}
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Revoke All Others Action */}
          {otherSessionsCount > 0 && (
            <div className="pt-2">
              <CustomButton
                variant="danger"
                size="sm"
                onClick={() => setShowConfirmLogoutAll(true)}
                loading={revokingAll}
                icon={LogOutIcon}
                className="w-full justify-center"
              >
                {t('confirmLogoutAllSessionsAction', 'Revoke All Other Sessions')}
              </CustomButton>
            </div>
          )}
        </div>

        <DrawerFooter onCancel={onClose} cancelLabel={t('close', 'Close')} />
      </DrawerContainer>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={showConfirmLogoutAll}
        onClose={() => setShowConfirmLogoutAll(false)}
        onConfirm={handleLogoutAllOthers}
        title={t('confirmLogoutAllSessionsTitle', 'Revoke All Other Sessions?')}
        message={t(
          'confirmLogoutAllSessionsDesc',
          'This will immediately terminate all active sessions on other browsers and devices. You will remain logged in on this workstation.'
        )}
        confirmText={t('confirmLogoutAllSessionsAction', 'Revoke All Others')}
        confirmVariant="danger"
        confirmLoading={revokingAll}
      />
    </>
  );
};

export default ActiveSessionsDrawer;
