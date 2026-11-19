import React, { useState } from 'react';
import {
  ClockIcon,
  ShieldCheckIcon,
  GlobeIcon,
  SessionsIcon,
} from '../../../../components/ui/Icons';
import { DrawerContainer, DrawerSection, DrawerFooter } from '../../../../components/layout';
import { UserActivityRecord } from '../types';
import { useActivityTranslation } from '../hooks/useActivityTranslation';

export interface ActivityUserDetailDrawerProps {
  user: UserActivityRecord | null;
  onClose: () => void;
}

export const ActivityUserDetailDrawer: React.FC<ActivityUserDetailDrawerProps> = ({
  user,
  onClose,
}) => {
  const { t, formatNumber, formatDate } = useActivityTranslation();
  const [activeSubTab, setActiveSubTab] = useState<'sessions' | 'logs'>('sessions');

  if (!user) return null;

  const sessionWindows = user.time_windows || [];
  const auditLogs = user.activity_logs || [];

  return (
    <DrawerContainer padding="none">
      <div className="p-4 sm:p-6 space-y-6">
        {/* User Profile Header Card */}
        <div className="p-4 rounded-2xl theme-bg-sub border theme-border space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <h3 className="font-bold text-base theme-text-primary">{user.name}</h3>
              <p className="font-mono text-xs theme-text-secondary">{user.phone_number}</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold theme-bg-accent-soft theme-accent border theme-border font-mono">
              {user.user_type}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t theme-border text-xs font-mono">
            <div>
              <span className="theme-text-secondary block text-[10px] uppercase tracking-wider">
                {t('table.duration', 'Total Duration')}
              </span>
              <span className="font-bold theme-text-primary text-sm">
                {user.formatted_active_duration || `${formatNumber(user.total_active_duration_minutes)}m`}
              </span>
            </div>
            <div>
              <span className="theme-text-secondary block text-[10px] uppercase tracking-wider">
                {t('table.sessions', 'Sessions')}
              </span>
              <span className="font-bold theme-text-primary text-sm">
                {formatNumber(user.sessions_count || sessionWindows.length)}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Controls for Timeline vs Audit Logs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl theme-bg-sub border theme-border">
          <button
            type="button"
            onClick={() => setActiveSubTab('sessions')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
              activeSubTab === 'sessions'
                ? 'theme-bg-surface theme-text-primary shadow-xs'
                : 'theme-text-secondary hover:theme-text-primary'
            }`}
          >
            {t('drawer.tabSessions', `Sessions (${sessionWindows.length})`, {
              count: formatNumber(sessionWindows.length),
            })}
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('logs')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
              activeSubTab === 'logs'
                ? 'theme-bg-surface theme-text-primary shadow-xs'
                : 'theme-text-secondary hover:theme-text-primary'
            }`}
          >
            {t('drawer.tabLogs', `Audit Logs (${auditLogs.length})`, {
              count: formatNumber(auditLogs.length),
            })}
          </button>
        </div>

        {/* Sub-Tab 1: Sessions Timeline */}
        {activeSubTab === 'sessions' && (
          <DrawerSection
            title={t('drawer.tabSessions', 'Session Windows')}
            icon={SessionsIcon}
          >
            {sessionWindows.length === 0 ? (
              <div className="p-6 text-center text-xs theme-text-secondary">
                {t('drawer.noSessions', 'No session windows recorded.')}
              </div>
            ) : (
              <div className="space-y-3">
                {sessionWindows.map((win, idx) => (
                  <div
                    key={win.session_id || idx}
                    className="p-3.5 rounded-xl theme-bg-sub border theme-border space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-semibold theme-text-primary">
                        <SessionsIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
                        <span className="truncate">{win.device_info || win.device_type}</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                          win.is_active
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : 'theme-bg-surface theme-text-secondary border theme-border'
                        }`}
                      >
                        {win.is_active
                          ? t('drawer.statusActive', 'Active Now')
                          : t('drawer.statusClosed', 'Ended')}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1 text-left">
                      <div>
                        <span className="theme-text-secondary block text-[10px]">
                          {t('drawer.ip', 'IP Address')}
                        </span>
                        <span className="theme-text-primary">{win.ip_address || '—'}</span>
                      </div>
                      <div>
                        <span className="theme-text-secondary block text-[10px]">
                          {t('drawer.duration', 'Duration')}
                        </span>
                        <span className="theme-accent font-bold">
                          {formatNumber(win.duration_minutes)} mins
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="theme-text-secondary block text-[10px]">
                          {t('drawer.loginTime', 'Login Time')}
                        </span>
                        <span className="theme-text-primary">
                          {win.from_time ? formatDate(win.from_time) : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DrawerSection>
        )}

        {/* Sub-Tab 2: Audit Action Logs */}
        {activeSubTab === 'logs' && (
          <DrawerSection
            title={t('drawer.tabLogs', 'Audit Action Logs')}
            icon={ShieldCheckIcon}
          >
            {auditLogs.length === 0 ? (
              <div className="p-6 text-center text-xs theme-text-secondary">
                {t('drawer.noLogs', 'No audit action logs recorded for this user.')}
              </div>
            ) : (
              <div className="space-y-2.5">
                {auditLogs.map((log, idx) => (
                  <div
                    key={log.id || idx}
                    className="p-3 rounded-xl theme-bg-sub border theme-border space-y-1.5 text-xs text-left"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold theme-text-primary text-xs truncate">
                        {log.action_name}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold theme-bg-surface theme-text-primary border theme-border uppercase">
                        {log.http_method}
                      </span>
                    </div>

                    <div className="font-mono text-[11px] theme-text-secondary truncate flex items-center gap-1.5">
                      <GlobeIcon className="w-3 h-3 theme-accent shrink-0" />
                      <span className="truncate">{log.endpoint}</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono theme-text-secondary pt-1 border-t theme-border">
                      <span>IP: {log.ip_address || '—'}</span>
                      <span className="flex items-center gap-1">
                        <ClockIcon className="w-2.5 h-2.5" />
                        {log.timestamp ? formatDate(log.timestamp) : '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DrawerSection>
        )}
      </div>

      <DrawerFooter>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 px-4 rounded-xl text-xs font-bold theme-bg-sub border theme-border hover:theme-bg-elevated theme-text-primary transition cursor-pointer"
        >
          {t('drawer.close', 'Close')}
        </button>
      </DrawerFooter>
    </DrawerContainer>
  );
};

export default ActivityUserDetailDrawer;
