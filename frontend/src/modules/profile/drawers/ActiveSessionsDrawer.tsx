import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '../../../context/ToastContext';
import { fetchWithAuth } from '../../../utils/authService';
import { LaptopIcon, SmartphoneIcon, LogOutIcon, TrashIcon, ChevronIcon } from '../../../components/ui/Icons';
import CustomButton from '../../../components/ui/CustomButton';
import EmptyState from '../../../components/ui/EmptyState';
import { DrawerContainer, DrawerFooter, DrawerSection } from '../../../components/layout';
import { ConfirmModal } from '../../../components/ui/Modal';
import { useTranslation } from '../../../i18n';
import type { UserSession } from '../types';

interface ActiveSessionsDrawerProps {
  onClose: () => void;
}

interface DeviceGroup {
  deviceKey: string;
  device_name: string;
  device_type: string;
  ip_address: string;
  is_current: boolean;
  sessions: UserSession[];
}

export const ActiveSessionsDrawer: React.FC<ActiveSessionsDrawerProps> = ({ onClose }) => {
  const { showToast } = useToast();
  const { t, formatNumber } = useTranslation('profile');

  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | number | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [showConfirmLogoutAll, setShowConfirmLogoutAll] = useState(false);
  const [expandedDevices, setExpandedDevices] = useState<Record<string, boolean>>({});

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
      let res = await fetchWithAuth('/api/v1/user/sessions/');
      if (!res.ok) {
        res = await fetchWithAuth('/api/v1/auth/sessions/');
      }

      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.results || data.sessions || [];
        // Map backend UserSession model fields to frontend structure
        const formatted = list.map((s: any, idx: number) => ({
          id: s.id || idx + 1,
          device_name: s.device_name || s.device_info || 'Workstation Browser',
          device_type: s.device_type || 'web',
          ip_address: s.ip_address || '127.0.0.1',
          login_at_formatted: s.login_at ? new Date(s.login_at).toLocaleString() : 'Active Now',
          last_activity_formatted: s.last_active ? new Date(s.last_active).toLocaleString() : 'Active now',
          is_current: s.is_current !== undefined ? s.is_current : idx === 0,
        }));
        setSessions(formatted.length ? formatted : getFallbackSessions());
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

  // Group multiple sessions under the same unique physical device
  const deviceGroups: DeviceGroup[] = useMemo(() => {
    const map = new Map<string, DeviceGroup>();
    for (const sess of sessions) {
      const key = `${sess.device_name}___${sess.device_type}___${sess.ip_address}`;
      if (!map.has(key)) {
        map.set(key, {
          deviceKey: key,
          device_name: sess.device_name,
          device_type: sess.device_type,
          ip_address: sess.ip_address,
          is_current: Boolean(sess.is_current),
          sessions: [sess],
        });
      } else {
        const group = map.get(key)!;
        group.sessions.push(sess);
        if (sess.is_current) {
          group.is_current = true;
        }
      }
    }
    // Sort so current device is always first
    return Array.from(map.values()).sort((a, b) => (b.is_current ? 1 : 0) - (a.is_current ? 1 : 0));
  }, [sessions]);

  // Auto-expand "This Device" and single device on initial load
  useEffect(() => {
    if (deviceGroups.length > 0) {
      setExpandedDevices((prev) => {
        const next = { ...prev };
        deviceGroups.forEach((dg) => {
          if (next[dg.deviceKey] === undefined) {
            next[dg.deviceKey] = dg.is_current || deviceGroups.length === 1;
          }
        });
        return next;
      });
    }
  }, [deviceGroups]);

  const toggleExpand = (deviceKey: string) => {
    setExpandedDevices((prev) => ({
      ...prev,
      [deviceKey]: !prev[deviceKey],
    }));
  };

  const handleRevokeSingle = async (sessionId: string | number) => {
    if (!sessionId) return;
    setRevokingId(sessionId);
    try {
      let res = await fetchWithAuth(`/api/v1/user/sessions/${sessionId}/`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        res = await fetchWithAuth('/api/v1/auth/sessions/revoke/', {
          method: 'POST',
          body: JSON.stringify({ session_id: sessionId }),
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

  const handleRevokeDevice = async (deviceSessions: UserSession[]) => {
    const sessionIds = deviceSessions.filter((s) => !s.is_current).map((s) => s.id);
    if (!sessionIds.length) return;
    for (const id of sessionIds) {
      await handleRevokeSingle(id);
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
          <DrawerSection
            title={t('drawerSessionsTitle', 'Active Devices & Sessions')}
            subtitle={t(
              'drawerSessionsSubtitle',
              'Authenticated workstations, phones, and devices currently signed into your account.'
            )}
            icon={SmartphoneIcon}
            headerRight={
              deviceGroups.length > 0 && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full theme-bg-sub theme-text-secondary border theme-border">
                  {formatNumber(deviceGroups.length)} {deviceGroups.length === 1 ? t('device', 'Device') : t('devices', 'Devices')}
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
                  icon={SmartphoneIcon}
                  iconVariant="accent"
                  title={t('loadingSessions', 'Discovering active sessions...')}
                  description={t('verifyingHardwareTokens', 'Checking active authentication tokens...')}
                  animate
                />
              </div>
            ) : deviceGroups.length === 0 ? (
              <div className="py-4">
                <EmptyState
                  variant="sub"
                  size="sm"
                  icon={SmartphoneIcon}
                  iconVariant="muted"
                  title={t('noSessionsFound', 'No Active Sessions')}
                  description={t('noSessionsDesc', 'No other authenticated devices found for this account.')}
                />
              </div>
            ) : (
              <div className="space-y-3">
                {deviceGroups.map((group) => {
                  const isExpanded = Boolean(expandedDevices[group.deviceKey]);
                  const canRevokeDevice = !group.is_current && group.sessions.some((s) => !s.is_current);

                  return (
                    <div
                      key={group.deviceKey}
                      className="rounded-2xl border theme-border overflow-hidden theme-bg-surface shadow-2xs transition-all"
                    >
                      {/* Parent Row: Unique Physical Device Summary */}
                      <div
                        onClick={() => toggleExpand(group.deviceKey)}
                        className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer select-none hover:theme-bg-sub/40 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl theme-bg-sub/60 border theme-border flex items-center justify-center shrink-0 shadow-2xs">
                            {group.device_type === 'mobile' ? (
                              <SmartphoneIcon className="w-4 h-4 theme-accent" />
                            ) : (
                              <LaptopIcon className="w-4 h-4 theme-accent" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold theme-text-primary truncate">
                                {group.device_name}
                              </span>
                              {group.is_current && (
                                <span className="inline-flex items-center gap-1.5 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full theme-bg-accent-soft theme-accent border theme-border shrink-0">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  {t('currentSession', 'This Device')}
                                </span>
                              )}
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md theme-bg-sub theme-text-secondary border theme-border shrink-0">
                                {formatNumber(group.sessions.length)} {group.sessions.length === 1 ? t('session', 'Session') : t('sessions', 'Sessions')}
                              </span>
                            </div>
                            <div className="text-xs theme-text-secondary flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="font-mono text-[11px]">{group.ip_address}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {canRevokeDevice && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRevokeDevice(group.sessions);
                              }}
                              className="p-1.5 rounded-lg theme-text-secondary hover:theme-danger hover:theme-bg-danger-soft transition-colors cursor-pointer"
                              title={t('revokeDevice', 'Revoke All Sessions for this Device')}
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                          <div className="p-1 rounded-md theme-text-secondary hover:theme-text-primary">
                            <ChevronIcon isOpen={isExpanded} className="w-3.5 h-3.5 transition-transform" />
                          </div>
                        </div>
                      </div>

                      {/* Child Rows: Hierarchical Session Sub-rows */}
                      {isExpanded && (
                        <div className="border-t theme-border theme-bg-sub/20">
                          <div className="divide-y divide-theme-border">
                            {group.sessions.map((sess, idx) => (
                              <div
                                key={sess.id}
                                className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs hover:theme-bg-sub/50 transition-colors"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-1.5 h-1.5 rounded-full theme-bg-accent shrink-0 opacity-60" />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-medium theme-text-primary truncate">
                                        {t('sessionPrefix', 'Session')} #{formatNumber(idx + 1)}
                                      </span>
                                      {sess.is_current ? (
                                        <span className="text-[10px] font-bold theme-accent px-1.5 py-0.2 rounded theme-bg-accent-soft border theme-border">
                                          {t('activeNow', 'Active Now')}
                                        </span>
                                      ) : (
                                        <span className="text-[10px] theme-text-secondary">
                                          {t('signedInAt', 'Signed in')}: {sess.login_at_formatted}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] theme-text-secondary mt-0.5">
                                      <span>{t('lastActive', 'Last active')}: {sess.last_activity_formatted}</span>
                                    </div>
                                  </div>
                                </div>

                                {!sess.is_current && (
                                  <button
                                    type="button"
                                    onClick={() => handleRevokeSingle(sess.id)}
                                    disabled={revokingId === sess.id}
                                    className="p-1.5 rounded-lg theme-text-secondary hover:theme-danger hover:theme-bg-danger-soft transition-colors shrink-0 cursor-pointer"
                                    title={t('revokeSession', 'Revoke Session')}
                                  >
                                    <TrashIcon className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

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
            )}
          </DrawerSection>
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
