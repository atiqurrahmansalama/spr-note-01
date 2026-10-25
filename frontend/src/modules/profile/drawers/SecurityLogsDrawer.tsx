import React, { useState, useEffect, useCallback } from 'react';
import { fetchWithAuth } from '../../../utils/authService';
import { ShieldCheckIcon, AlertCircleIcon } from '../../../components/ui/Icons';
import EmptyState from '../../../components/ui/EmptyState';
import { DrawerContainer, DrawerFooter, DrawerSection } from '../../../components/layout';
import { useTranslation } from '../../../i18n';
import type { SecurityAuditLog } from '../types';

interface SecurityLogsDrawerProps {
  onClose: () => void;
}

export const SecurityLogsDrawer: React.FC<SecurityLogsDrawerProps> = ({ onClose }) => {
  const { t, formatNumber } = useTranslation('profile');
  const [logs, setLogs] = useState<SecurityAuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
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
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <DrawerContainer padding="none" spacing="normal">
      <div className="@container space-y-4 pt-2 pb-6 px-1">
        <DrawerSection
          title={t('drawerLogsTitle', 'Security & Authentication Logs')}
          subtitle={t(
            'drawerLogsSubtitle',
            'Detailed historical audit records of sign-ins, IP locations, and security events.'
          )}
          icon={ShieldCheckIcon}
          headerRight={
            logs.length > 0 && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full theme-bg-sub theme-text-secondary border theme-border">
                {formatNumber(logs.length)} {logs.length === 1 ? t('event', 'Event') : t('events', 'Events')}
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
                icon={ShieldCheckIcon}
                iconVariant="accent"
                title={t('loadingSecurityLogs', 'Loading security logs...')}
                description={t('fetchingAuditRecords', 'Retrieving authentication history and audit trails...')}
                animate
              />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-4">
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
            <div className="divide-y divide-theme-border border theme-border rounded-xl overflow-hidden theme-bg-surface">
              {logs.map((log) => {
                const isSuccess = log.status?.toLowerCase() === 'success' || log.status?.toLowerCase() === 'active';
                return (
                  <div
                    key={log.id}
                    className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:theme-bg-sub/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${
                          isSuccess
                            ? 'theme-bg-accent-soft theme-accent border theme-border'
                            : 'theme-bg-danger-soft theme-danger border theme-border-danger'
                        }`}
                      >
                        {isSuccess ? (
                          <ShieldCheckIcon className="w-4 h-4" />
                        ) : (
                          <AlertCircleIcon className="w-4 h-4" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold theme-text-primary truncate">
                            {log.event_type}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${
                              isSuccess
                                ? 'theme-bg-accent-soft theme-accent border theme-border'
                                : 'theme-bg-danger-soft theme-danger border theme-border-danger'
                            }`}
                          >
                            {log.status}
                          </span>
                        </div>
                        <div className="text-xs theme-text-secondary flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="font-mono text-[11px]">{log.ip_address}</span>
                          {log.location && (
                            <>
                              <span>•</span>
                              <span>{log.location}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <span className="text-xs theme-text-secondary shrink-0 font-mono text-right">
                      {log.timestamp}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </DrawerSection>
      </div>

      <DrawerFooter onCancel={onClose} cancelLabel={t('close', 'Close')} />
    </DrawerContainer>
  );
};

export default SecurityLogsDrawer;
