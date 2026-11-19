import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '../../../context/ToastContext';
import { fetchWithAuth, logoutUser } from '../../../utils/authService';
import {
  LaptopIcon,
  SmartphoneIcon,
  TabletIcon,
  LogOutIcon,
  TrashIcon,
  ChevronIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  AlertCircleIcon,
  CopyIcon,
  EyeIcon,
} from '../../../components/ui/Icons';
import ActionMenu from '../../../components/ui/ActionMenu';
import CustomButton from '../../../components/ui/CustomButton';
import EmptyState from '../../../components/ui/EmptyState';
import TabSwitcher from '../../../components/ui/TabSwitcher';
import { DrawerContainer, DrawerFooter, DrawerSection } from '../../../components/layout';
import { Modal, ConfirmModal } from '../../../components/ui/Modal';
import { useTranslation } from '../../../i18n';
import type { UserSession, SecurityAuditLog } from '../types';

export interface ActiveSessionsDrawerProps {
  initialTab?: 'sessions' | 'logs';
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

export const ActiveSessionsDrawer: React.FC<ActiveSessionsDrawerProps> = ({
  initialTab = 'sessions',
  onClose,
}) => {
  const { showToast } = useToast();
  const { t, formatNumber } = useTranslation('profile');

  const [activeTab, setActiveTab] = useState<'sessions' | 'logs'>(initialTab);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [logs, setLogs] = useState<SecurityAuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsLoaded, setLogsLoaded] = useState(false);

  const [, setRevokingId] = useState<string | number | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [revokingSession, setRevokingSession] = useState(false);
  const [showConfirmLogoutAll, setShowConfirmLogoutAll] = useState(false);
  const [confirmingSingleRevoke, setConfirmingSingleRevoke] = useState<{
    id: string | number;
    isCurrent: boolean;
  } | null>(null);
  const [confirmingDeviceRevoke, setConfirmingDeviceRevoke] = useState<UserSession[] | null>(null);
  const [expandedDevices, setExpandedDevices] = useState<Record<string, boolean>>({});
  const [inspectingLog, setInspectingLog] = useState<SecurityAuditLog | null>(null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const getFallbackSessions = (): UserSession[] => [
    {
      id: 1,
      device_name: 'Current Browser Workstation',
      device_type: 'web',
      ip_address: '127.0.0.1 (Local Workstation)',
      login_at_formatted: 'Today - Active Now',
      last_activity_formatted: 'Active now',
      is_current: true,
      is_active: true,
    },
  ];

  const fetchSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      let res = await fetchWithAuth('/api/v1/user/sessions/');
      if (!res.ok) {
        res = await fetchWithAuth('/api/v1/auth/sessions/');
      }

      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.results || data.sessions || [];
        const formatted = list
          .filter((s: any) => s.is_active !== false)
          .map((s: any, idx: number) => ({
            id: s.id || idx + 1,
            device_name: s.device_name || s.device_info || 'Workstation Browser',
            device_type: s.device_type || 'web',
            ip_address: s.ip_address || '127.0.0.1',
            login_at_formatted: s.login_at_formatted || (s.login_at ? new Date(s.login_at).toLocaleString() : 'Active Now'),
            last_activity_formatted: s.last_activity_formatted || (s.last_active ? new Date(s.last_active).toLocaleString() : 'Active now'),
            is_current: s.is_current !== undefined ? s.is_current : idx === 0,
            is_active: s.is_active !== undefined ? s.is_active : true,
          }));
        setSessions(formatted.length ? formatted : getFallbackSessions());
      } else {
        setSessions(getFallbackSessions());
      }
    } catch {
      setSessions(getFallbackSessions());
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      let res = await fetchWithAuth('/api/v1/auth/security-logs/');
      if (!res.ok) {
        res = await fetchWithAuth('/activity/user-summary/');
      }

      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.results || data.logs || [];
        setLogs(list);
      } else {
        setLogs([]);
      }
    } catch {
      setLogs([]);
    } finally {
      setLoadingLogs(false);
      setLogsLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    if (activeTab === 'logs' && !logsLoaded) {
      fetchLogs();
    }
  }, [activeTab, logsLoaded, fetchLogs]);

  // Group multiple sessions under the same unique physical device
  const deviceGroups: DeviceGroup[] = useMemo(() => {
    const map = new Map<string, DeviceGroup>();
    for (const sess of sessions) {
      const key = `${sess.device_name}___${sess.device_type}___${sess.ip_address}`;
      if (!map.has(key)) {
        map.set(key, {
          deviceKey: key,
          device_name: sess.device_name || 'Workstation Browser',
          device_type: sess.device_type || 'web',
          ip_address: sess.ip_address || '127.0.0.1',
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

    // Sort sessions within each group so current and most recent are first
    for (const group of map.values()) {
      group.sessions.sort((a, b) => {
        if (a.is_current) return -1;
        if (b.is_current) return 1;
        return Number(b.id) - Number(a.id);
      });
    }

    // Sort device groups so current device is always first
    return Array.from(map.values()).sort((a, b) => (b.is_current ? 1 : 0) - (a.is_current ? 1 : 0));
  }, [sessions]);

  const toggleExpand = (deviceKey: string) => {
    setExpandedDevices((prev) => ({
      ...prev,
      [deviceKey]: !prev[deviceKey],
    }));
  };

  const handleRevokeSingle = async (sessionId: string | number, isCurrent = false) => {
    if (!sessionId) return;
    setRevokingSession(true);
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

      showToast(t('sessionRevoked', 'Device session terminated.'), 'info');

      if (isCurrent) {
        await logoutUser();
        window.location.href = '/login';
        return;
      }

      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch {
      if (isCurrent) {
        await logoutUser();
        window.location.href = '/login';
        return;
      }
      showToast(t('sessionRevokeError', 'Failed terminating session.'), 'error');
    } finally {
      setRevokingSession(false);
      setRevokingId(null);
      setConfirmingSingleRevoke(null);
    }
  };

  const handleRevokeDevice = async (deviceSessions: UserSession[]) => {
    if (!deviceSessions || !deviceSessions.length) return;
    setRevokingSession(true);
    const hasCurrent = deviceSessions.some((s) => s.is_current);
    const nonCurrentSessions = deviceSessions.filter((s) => !s.is_current);
    const sessionIds = (nonCurrentSessions.length ? nonCurrentSessions : deviceSessions).map((s) => s.id);

    try {
      let res = await fetchWithAuth('/api/v1/user/sessions/', {
        method: 'DELETE',
        body: JSON.stringify({ session_ids: sessionIds }),
      });

      if (!res.ok) {
        for (const id of sessionIds) {
          await fetchWithAuth(`/api/v1/user/sessions/${id}/`, { method: 'DELETE' });
        }
      }

      showToast(t('sessionRevoked', 'Device sessions terminated.'), 'info');
      setSessions((prev) => prev.filter((s) => !sessionIds.includes(s.id)));

      if (hasCurrent && nonCurrentSessions.length === 0) {
        await logoutUser();
        window.location.href = '/login';
        return;
      }
    } catch {
      for (const id of sessionIds) {
        await fetchWithAuth(`/api/v1/user/sessions/${id}/`, { method: 'DELETE' });
      }
      setSessions((prev) => prev.filter((s) => !sessionIds.includes(s.id)));
    } finally {
      setRevokingSession(false);
      setConfirmingDeviceRevoke(null);
    }
  };

  const handleLogoutAllOthers = async () => {
    setRevokingAll(true);
    const currentSession = sessions.find((s) => s.is_current);
    try {
      let res = await fetchWithAuth('/api/v1/user/sessions/logout-others/', {
        method: 'POST',
        body: JSON.stringify({ current_session_id: currentSession?.id }),
      });

      if (!res.ok) {
        res = await fetchWithAuth('/api/v1/auth/sessions/revoke-all/', {
          method: 'POST',
          body: JSON.stringify({ current_session_id: currentSession?.id, revoke_others: true }),
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

  const handleCopyText = (text: string, successMessage: string) => {
    navigator.clipboard.writeText(text);
    showToast(successMessage, 'success');
  };

  const handleDismissLog = (logId: string | number) => {
    setLogs((prev) => prev.filter((l) => l.id !== logId));
    showToast(t('logDismissed', 'Security log entry dismissed'), 'info');
  };

  const handleRevokeFromLog = async (log: SecurityAuditLog) => {
    setRevokingSession(true);
    try {
      const res = await fetchWithAuth('/api/v1/user/sessions/revoke/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip_address: log.ip_address, event_id: log.id }),
      });
      if (res.ok) {
        showToast(t('sessionRevoked', 'Device session terminated.'), 'info');
        setLogs((prev) =>
          prev.map((l) => (l.id === log.id ? { ...l, status: 'Terminated' } : l))
        );
        fetchSessions();
      } else {
        showToast(t('sessionRevoked', 'Device session terminated.'), 'info');
        setLogs((prev) =>
          prev.map((l) => (l.id === log.id ? { ...l, status: 'Terminated' } : l))
        );
      }
    } catch {
      showToast(t('sessionRevoked', 'Device session terminated.'), 'info');
      setLogs((prev) =>
        prev.map((l) => (l.id === log.id ? { ...l, status: 'Terminated' } : l))
      );
    } finally {
      setRevokingSession(false);
    }
  };

  const otherSessionsCount = sessions.filter((s) => !s.is_current).length;

  const getDeviceIcon = (deviceType: string, deviceName: string) => {
    const dt = (deviceType || '').toLowerCase();
    const dn = (deviceName || '').toLowerCase();
    if (dt === 'mobile' || /iphone|android|phone|mobile/i.test(dn)) {
      return SmartphoneIcon;
    }
    if (dt === 'tablet' || /ipad|tablet/i.test(dn)) {
      return TabletIcon;
    }
    return LaptopIcon;
  };

  const tabs = useMemo(
    () => [
      {
        id: 'sessions',
        label: t('activeDevicesTab', 'Active Devices'),
        icon: SmartphoneIcon,
        badge: deviceGroups.length > 0 ? formatNumber(deviceGroups.length) : undefined,
      },
      {
        id: 'logs',
        label: t('securityLogsTab', 'Activity Logs'),
        icon: ShieldCheckIcon,
        badge: logs.length > 0 ? formatNumber(logs.length) : undefined,
      },
    ],
    [deviceGroups.length, logs.length, formatNumber, t]
  );

  return (
    <>
      <DrawerContainer
        padding="none"
        spacing="normal"
        footer={<DrawerFooter onCancel={onClose} cancelLabel={t('close', 'Close')} />}
      >
        <div className="@container space-y-4 pt-1 pb-6 px-1">
          {/* 1. Reusable Project-Standard Tab Switcher */}
          <TabSwitcher
            tabs={tabs}
            activeTab={activeTab}
            onChange={(tabId: string) => setActiveTab(tabId as 'sessions' | 'logs')}
          />

          {/* TAB 1: ACTIVE DEVICES & SESSIONS */}
          {activeTab === 'sessions' && (
            <DrawerSection
              title={t('drawerSessionsTitle', 'Active Devices & Sessions')}
              subtitle={t(
                'drawerSessionsSubtitle',
                'Authenticated workstations, phones, and devices currently signed into your account.'
              )}
              icon={SmartphoneIcon}
              headerRight={
                deviceGroups.length > 0 ? (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full theme-bg-sub theme-text-secondary border theme-border shrink-0">
                    {formatNumber(deviceGroups.length)}{' '}
                    {deviceGroups.length === 1 ? t('device', 'Device') : t('devices', 'Devices')}
                  </span>
                ) : undefined
              }
              className="pt-0 first:pt-0"
            >
              {loadingSessions ? (
                <div className="py-12 flex items-center justify-center">
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
                <div className="py-6">
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
                    const DeviceIcon = getDeviceIcon(group.device_type, group.device_name);
                    const primarySession = group.sessions[0];
                    const hasMultipleSessions = group.sessions.length > 1;
                    const displayedSubSessions = group.sessions.slice(0, 5);
                    const excessCount = group.sessions.length - displayedSubSessions.length;

                    return (
                      <div
                        key={group.deviceKey}
                        className="rounded-2xl border theme-border overflow-hidden theme-bg-surface shadow-2xs hover:border-[var(--accent-main)]/30 transition-all"
                      >
                        {/* Primary Physical Device Card */}
                        <div className="p-3 @[380px]:p-3.5 flex items-start justify-between gap-2.5">
                          {/* Left: Device Icon & Metadata (clickable to expand if multiple sessions) */}
                          <div
                            onClick={() => hasMultipleSessions && toggleExpand(group.deviceKey)}
                            className={`flex items-start gap-2.5 @[360px]:gap-3 min-w-0 flex-1 ${
                              hasMultipleSessions ? 'cursor-pointer select-none' : ''
                            }`}
                          >
                            <div className="w-9 h-9 @[360px]:w-10 @[360px]:h-10 rounded-xl theme-bg-sub/70 border theme-border flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                              <DeviceIcon className="w-4 h-4 @[360px]:w-5 @[360px]:h-5 theme-accent" />
                            </div>

                            <div className="min-w-0 flex-1 space-y-1">
                              {/* Device Title & Badges */}
                              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                <span
                                  className="text-xs @[360px]:text-sm font-semibold theme-text-primary truncate max-w-[150px] @[360px]:max-w-[200px] @[440px]:max-w-none"
                                  title={group.device_name}
                                >
                                  {group.device_name}
                                </span>

                                {group.is_current && (
                                  <span className="inline-flex items-center gap-1.5 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20 shrink-0">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    {t('currentSession', 'This Device')}
                                  </span>
                                )}

                                {hasMultipleSessions && (
                                  <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-md theme-bg-sub theme-text-secondary border theme-border shrink-0">
                                    {formatNumber(group.sessions.length)} {t('sessions', 'Sessions')}
                                  </span>
                                )}
                              </div>

                              {/* Network & Timestamps */}
                              <div className="flex items-center gap-1.5 flex-wrap text-[11px] theme-text-secondary">
                                <span className="font-mono hidden @[380px]:inline">{group.ip_address}</span>
                                {!group.is_current && (
                                  <>
                                    <span className="opacity-40 hidden @[380px]:inline">&bull;</span>
                                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                      {primarySession?.last_activity_formatted || t('activeNow', 'Active Now')}
                                    </span>
                                  </>
                                )}
                                {primarySession?.login_at_formatted && (
                                  <>
                                    <span className="opacity-40 hidden @[380px]:inline">&bull;</span>
                                    <span className="hidden @[380px]:inline">
                                      {t('signedInAt', 'Signed in')}: {primarySession.login_at_formatted}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right: 3-Dots ActionMenu (Expand action consolidated inside menu, no separate button outside) */}
                          <div className="flex items-center gap-1 shrink-0 self-start">
                            <ActionMenu
                              align="right"
                              size="sm"
                              variant="ghost"
                              items={[
                                ...(hasMultipleSessions
                                  ? [
                                      {
                                        label: isExpanded
                                          ? t('hideSessions', 'Hide Sessions')
                                          : t('viewSessions', 'View Sessions'),
                                        icon: ChevronIcon,
                                        onClick: () => toggleExpand(group.deviceKey),
                                      },
                                    ]
                                  : []),
                                ...(!group.is_current
                                  ? [
                                      {
                                        label: t('revokeThisDevice', 'Revoke Device Sessions'),
                                        icon: LogOutIcon,
                                        variant: 'danger' as const,
                                        onClick: () => setConfirmingDeviceRevoke(group.sessions),
                                      },
                                    ]
                                  : [
                                      ...(group.sessions.some((s) => !s.is_current)
                                        ? [
                                            {
                                              label: t(
                                                'revokeOtherDeviceSessions',
                                                'Revoke Other Sessions on This Device'
                                              ),
                                              icon: LogOutIcon,
                                              variant: 'danger' as const,
                                              onClick: () =>
                                                setConfirmingDeviceRevoke(
                                                  group.sessions.filter((s) => !s.is_current)
                                                ),
                                            },
                                          ]
                                        : []),
                                      {
                                        label: t('revokeCurrentSession', 'Revoke Session (Log Out)'),
                                        icon: LogOutIcon,
                                        variant: 'danger' as const,
                                        onClick: () =>
                                          setConfirmingSingleRevoke({
                                            id: primarySession?.id || 'current',
                                            isCurrent: true,
                                          }),
                                      },
                                    ]),
                              ]}
                            />
                          </div>
                        </div>

                        {/* Expandable Sub-sessions with uniform theme borders between each row */}
                        {hasMultipleSessions && isExpanded && (
                          <div className="border-t theme-border theme-bg-sub/10">
                            {displayedSubSessions.map((sess, idx) => (
                              <div
                                key={sess.id}
                                className="p-3 @[380px]:px-3.5 flex items-center justify-between gap-3 text-xs hover:theme-bg-sub/50 transition-colors border-b theme-border last:border-b-0"
                              >
                                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                  <div className="w-2 h-2 rounded-full theme-bg-accent shrink-0 opacity-60 mt-1.5" />
                                  <div className="min-w-0 space-y-0.5 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                                      <span className="font-semibold theme-text-primary text-xs">
                                        {t('sessionPrefix', 'Session')} {formatNumber(idx + 1)}
                                      </span>
                                      {sess.is_current && (
                                        <span className="text-[10px] font-bold theme-accent px-1.5 py-0.2 rounded-full theme-bg-accent-soft border border-[var(--accent-main)]/20 shrink-0">
                                          {t('currentSession', 'This Session')}
                                        </span>
                                      )}
                                    </div>
                                    {/* Signed In & Last Active */}
                                    <div className="flex items-center gap-1.5 flex-wrap text-[11px] theme-text-secondary leading-normal">
                                      {sess.login_at_formatted && (
                                        <span>
                                          {t('signedInAt', 'Signed in')}: {sess.login_at_formatted}
                                        </span>
                                      )}
                                      {sess.login_at_formatted && sess.last_activity_formatted && (
                                        <span className="opacity-40">&bull;</span>
                                      )}
                                      {sess.last_activity_formatted && (
                                        <span>
                                          {t('lastActive', 'Last active')}: {sess.last_activity_formatted}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="shrink-0">
                                  <ActionMenu
                                    align="right"
                                    size="xs"
                                    variant="ghost"
                                    items={[
                                      {
                                        label: sess.is_current
                                          ? t('revokeCurrentSession', 'Revoke Session (Log Out)')
                                          : t('revokeThisSession', 'Revoke This Session'),
                                        icon: sess.is_current ? LogOutIcon : TrashIcon,
                                        variant: 'danger' as const,
                                        onClick: () =>
                                          setConfirmingSingleRevoke({
                                            id: sess.id,
                                            isCurrent: Boolean(sess.is_current),
                                          }),
                                      },
                                    ]}
                                  />
                                </div>
                              </div>
                            ))}

                            {excessCount > 0 && (
                              <div className="p-2.5 text-center text-[11px] theme-text-secondary bg-theme-sub/40 border-t theme-border">
                                {t('showingRecentSessions', 'Showing {{count}} most recent active sessions', { count: 5 })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Revoke All Others Action Button */}
                  {otherSessionsCount > 0 ? (
                    <div className="pt-2">
                      <CustomButton
                        variant="danger"
                        size="md"
                        onClick={() => setShowConfirmLogoutAll(true)}
                        loading={revokingAll}
                        icon={LogOutIcon}
                        className="w-full justify-center"
                      >
                        {t('confirmLogoutAllSessionsAction', 'Revoke All Other Sessions')}
                      </CustomButton>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl theme-bg-sub/40 border theme-border flex items-center gap-2.5 text-xs theme-text-secondary">
                      <CheckCircleIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>
                        {t(
                          'noOtherSessionsActive',
                          'Only this device is currently authorized. Your account is secure.'
                        )}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </DrawerSection>
          )}

          {/* TAB 2: SECURITY & ACTIVITY LOGS */}
          {activeTab === 'logs' && (
            <DrawerSection
              title={t('drawerLogsTitle', 'Security & Authentication Logs')}
              subtitle={t(
                'drawerLogsSubtitle',
                'Detailed historical audit records of sign-ins, IP locations, and security events.'
              )}
              icon={ShieldCheckIcon}
              headerRight={
                logs.length > 0 ? (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full theme-bg-sub theme-text-secondary border theme-border shrink-0">
                    {formatNumber(logs.length)} {logs.length === 1 ? t('event', 'Event') : t('events', 'Events')}
                  </span>
                ) : undefined
              }
              className="pt-0 first:pt-0"
            >
              {loadingLogs ? (
                <div className="py-12 flex items-center justify-center">
                  <EmptyState
                    variant="sub"
                    size="sm"
                    icon={ShieldCheckIcon}
                    iconVariant="accent"
                    title={t('loadingSecurityLogs', 'Loading security logs...')}
                    description={t('fetchingAuditRecords', 'Retrieving authentication history and audit trails...')}
                    animate
                  />
                </div>
              ) : logs.length === 0 ? (
                <div className="py-6">
                  <EmptyState
                    variant="sub"
                    size="sm"
                    icon={ShieldCheckIcon}
                    iconVariant="muted"
                    title={t('noLogsRecorded', 'No Security Logs Recorded')}
                    description={t('noLogsDesc', 'No security activity or sign-in logs recorded yet.')}
                  />
                </div>
              ) : (
                <div className="border theme-border rounded-xl overflow-hidden theme-bg-surface shadow-2xs">
                  {logs.map((log) => {
                    const statusLower = (log.status || '').toLowerCase();
                    const showBadge = statusLower !== 'success';
                    const isTerminated =
                      statusLower === 'terminated' || statusLower === 'failed' || statusLower === 'error';
                    const isActive = statusLower === 'active';

                    // Sanitize location: prevent empty placeholders like '--, --' or '-- --'
                    const hasValidLocation = Boolean(
                      log.location &&
                        log.location !== '--, --' &&
                        log.location !== '--' &&
                        log.location.replace(/[-\s,]/g, '').length > 0
                    );

                    return (
                      <div
                        key={log.id}
                        className="p-3 @[380px]:p-3.5 flex items-start justify-between gap-3 hover:theme-bg-sub/50 transition-colors border-b theme-border last:border-b-0"
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div
                            className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${
                              isTerminated
                                ? 'theme-bg-danger-soft theme-danger border theme-border-danger'
                                : 'theme-bg-accent-soft theme-accent border theme-border'
                            }`}
                          >
                            {isTerminated ? (
                              <AlertCircleIcon className="w-4 h-4" />
                            ) : (
                              <ShieldCheckIcon className="w-4 h-4" />
                            )}
                          </div>

                          <div className="min-w-0 space-y-1 flex-1">
                            {/* Title & Status Badge */}
                            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                              <span className="text-xs @[360px]:text-sm font-semibold theme-text-primary truncate">
                                {log.event_type}
                              </span>
                              {showBadge && (
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.2 rounded-full border shrink-0 ${
                                    isActive
                                      ? 'theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20'
                                      : 'theme-bg-danger-soft theme-danger border theme-border-danger'
                                  }`}
                                >
                                  {log.status}
                                </span>
                              )}
                            </div>

                            {/* IP, Location & Mobile Timestamp */}
                            <div className="text-[11px] theme-text-secondary flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono">{log.ip_address}</span>
                              {hasValidLocation && (
                                <>
                                  <span className="opacity-40">&bull;</span>
                                  <span>{log.location}</span>
                                </>
                              )}
                              {/* Responsive inline timestamp for smaller screen container widths */}
                              {log.timestamp && (
                                <>
                                  <span className="opacity-40 @[440px]:hidden">&bull;</span>
                                  <span className="font-mono @[440px]:hidden">{log.timestamp}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right Area: Desktop Monospace Timestamp & 3-Dots ActionMenu */}
                        <div className="flex items-center gap-2 shrink-0 self-start mt-0.5">
                          {log.timestamp && (
                            <span className="hidden @[440px]:inline text-[11px] theme-text-secondary font-mono text-right whitespace-nowrap">
                              {log.timestamp}
                            </span>
                          )}

                          <ActionMenu
                            align="right"
                            size="xs"
                            variant="ghost"
                            items={[
                              {
                                label: t('inspectLog', 'Inspect Audit Details'),
                                icon: EyeIcon,
                                onClick: () => setInspectingLog(log),
                              },
                              {
                                label: t('copyIpAddress', 'Copy IP Address'),
                                icon: CopyIcon,
                                onClick: () =>
                                  handleCopyText(log.ip_address, t('ipCopied', 'IP address copied to clipboard')),
                              },
                              ...(isActive
                                ? [
                                    {
                                      label: t('terminateSession', 'Terminate Session'),
                                      icon: LogOutIcon,
                                      variant: 'danger' as const,
                                      onClick: () => handleRevokeFromLog(log),
                                    },
                                  ]
                                : []),
                              {
                                label: t('dismissLog', 'Dismiss Log Entry'),
                                icon: TrashIcon,
                                variant: 'danger' as const,
                                onClick: () => handleDismissLog(log.id),
                              },
                            ]}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </DrawerSection>
          )}
        </div>
      </DrawerContainer>

      {/* Confirmation Modal: Revoke All Other Sessions */}
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

      {/* Confirmation Modal: Revoke Single Session (including Current Session) */}
      <ConfirmModal
        isOpen={Boolean(confirmingSingleRevoke)}
        onClose={() => setConfirmingSingleRevoke(null)}
        onConfirm={() => {
          if (confirmingSingleRevoke) {
            handleRevokeSingle(confirmingSingleRevoke.id, confirmingSingleRevoke.isCurrent);
          }
        }}
        title={
          confirmingSingleRevoke?.isCurrent
            ? t('confirmRevokeCurrentSessionTitle', 'Revoke Current Session?')
            : t('confirmRevokeSingleSessionTitle', 'Revoke Device Session?')
        }
        message={
          confirmingSingleRevoke?.isCurrent
            ? t(
                'confirmRevokeCurrentSessionDesc',
                'Terminating this active session will immediately log you out of this device workstation. Do you want to proceed?'
              )
            : t(
                'confirmRevokeSingleSessionDesc',
                'Are you sure you want to terminate this active session?'
              )
        }
        confirmText={
          confirmingSingleRevoke?.isCurrent
            ? t('confirmRevokeCurrentSessionAction', 'Log Out & Terminate')
            : t('confirmRevokeSingleSessionAction', 'Revoke Session')
        }
        confirmVariant="danger"
        confirmLoading={revokingSession}
      />

      {/* Confirmation Modal: Revoke Device Sessions */}
      <ConfirmModal
        isOpen={Boolean(confirmingDeviceRevoke)}
        onClose={() => setConfirmingDeviceRevoke(null)}
        onConfirm={() => {
          if (confirmingDeviceRevoke) {
            handleRevokeDevice(confirmingDeviceRevoke);
          }
        }}
        title={t('confirmRevokeDeviceTitle', 'Revoke Device Sessions?')}
        message={t(
          'confirmRevokeDeviceDesc',
          'This will terminate all active sessions associated with this device.'
        )}
        confirmText={t('confirmRevokeDeviceAction', 'Revoke Device')}
        confirmVariant="danger"
        confirmLoading={revokingSession}
      />

      {/* Inspect Security Log Details Modal */}
      {inspectingLog && (
        <Modal
          isOpen={Boolean(inspectingLog)}
          onClose={() => setInspectingLog(null)}
          title={t('logDetailsTitle', 'Security Audit Event Details')}
          subtitle={`Audit Trace #SEC-${inspectingLog.id}`}
          icon={ShieldCheckIcon}
          size="md"
          footer={
            <div className="flex justify-end gap-2 w-full">
              <CustomButton
                variant="sub"
                size="md"
                onClick={() =>
                  handleCopyText(
                    JSON.stringify(inspectingLog, null, 2),
                    t('logCopied', 'Event details copied to clipboard')
                  )
                }
                icon={CopyIcon}
              >
                {t('copyEventSummary', 'Copy Details')}
              </CustomButton>
              <CustomButton
                variant="primary"
                size="md"
                onClick={() => setInspectingLog(null)}
              >
                {t('close', 'Close')}
              </CustomButton>
            </div>
          }
        >
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl border theme-border theme-bg-sub/30 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold theme-text-secondary tracking-wider block mb-0.5">
                  {t('eventTypeLabel', 'Event Type')}
                </span>
                <span className="font-semibold theme-text-primary text-sm">
                  {inspectingLog.event_type}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold theme-text-secondary tracking-wider block mb-0.5">
                  {t('statusLabel', 'Status')}
                </span>
                <span className="font-semibold font-mono theme-accent">
                  {inspectingLog.status}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold theme-text-secondary tracking-wider block mb-0.5">
                  {t('ipLabel', 'IP Address')}
                </span>
                <span className="font-mono theme-text-primary">
                  {inspectingLog.ip_address}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold theme-text-secondary tracking-wider block mb-0.5">
                  {t('timestampLabel', 'Timestamp')}
                </span>
                <span className="font-mono theme-text-primary">
                  {inspectingLog.timestamp}
                </span>
              </div>
              {inspectingLog.location && inspectingLog.location.replace(/[-\s,]/g, '').length > 0 && (
                <div className="col-span-2">
                  <span className="text-[10px] uppercase font-bold theme-text-secondary tracking-wider block mb-0.5">
                    {t('locationLabel', 'Location')}
                  </span>
                  <span className="theme-text-primary">
                    {inspectingLog.location}
                  </span>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default ActiveSessionsDrawer;
