import React from 'react';
import { useRoleTranslation } from '../hooks/useRoleTranslation';
import {
  KeyIcon,
  ShieldCheckIcon,
  UsersIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  EditIcon,
  CopyIcon,
  SparklesIcon,
} from '../../../../components/ui/Icons';
import { DrawerContainer } from '../../../../components/layout';
import { RoleRecord, ActionPermissions } from '../types';

export interface RoleDetailDrawerProps {
  role: RoleRecord;
  onEdit?: (role: RoleRecord) => void;
  onClone?: (role: RoleRecord) => void;
  onClose?: () => void;
}

export const RoleDetailDrawer: React.FC<RoleDetailDrawerProps> = ({
  role,
  onEdit,
  onClone,
  onClose,
}) => {
  const { t, formatNumber } = useRoleTranslation();

  const isProtected = role.code === 'SUPER_ADMIN';

  const permissionsConfig = [
    {
      key: 'can_create_student' as const,
      label: t('permissions.can_create_student', 'Create Students'),
      desc: t('permissions.can_create_student_desc', 'Allow creating new student records'),
    },
    {
      key: 'can_edit_student' as const,
      label: t('permissions.can_edit_student', 'Edit Students'),
      desc: t('permissions.can_edit_student_desc', 'Allow editing student details'),
    },
    {
      key: 'can_delete_report' as const,
      label: t('permissions.can_delete_report', 'Delete Reports'),
      desc: t('permissions.can_delete_report_desc', 'Allow deleting daily evaluation notes'),
    },
    {
      key: 'can_export_reports' as const,
      label: t('permissions.can_export_reports', 'Export Data'),
      desc: t('permissions.can_export_reports_desc', 'Allow exporting reports to PDF/Excel'),
    },
    {
      key: 'can_manage_users' as const,
      label: t('permissions.can_manage_users', 'Manage Users'),
      desc: t('permissions.can_manage_users_desc', 'Allow creating and provisioning users'),
    },
  ];

  const perms = role.action_permissions || {};

  return (
    <div className="flex flex-col h-full">
      <DrawerContainer padding="none" spacing="normal">
        <div className="space-y-6 pt-2 text-left">
          {/* Hero Role Card */}
          <div className="p-4 rounded-2xl theme-bg-sub border theme-border space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold theme-text-primary truncate">
                    {role.name}
                  </h3>
                  {role.is_google_default && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-sky-500/10 text-sky-500 dark:text-sky-400 border border-sky-500/20">
                      {t('googleDefault', 'Google Default')}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs theme-text-secondary theme-bg-surface border theme-border px-2 py-0.5 rounded-md">
                    {role.code}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold theme-bg-accent-soft theme-accent border theme-border">
                    {t('levelBadge', 'Level {{level}}', { level: formatNumber(role.hierarchy_level) })}
                  </span>
                </div>
              </div>

              <div>
                {isProtected ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{t('protected', 'Protected')}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center text-[11px] font-mono px-2.5 py-1 rounded-lg theme-bg-surface theme-text-secondary border theme-border">
                    {t('configurable', 'Configurable')}
                  </span>
                )}
              </div>
            </div>

            {role.description ? (
              <p className="text-xs theme-text-secondary leading-relaxed pt-1">
                {role.description}
              </p>
            ) : null}
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl theme-bg-sub/60 border theme-border space-y-1">
              <div className="flex items-center gap-1.5 text-xs theme-text-secondary">
                <UsersIcon className="w-3.5 h-3.5" />
                <span>{t('assignedUsers', 'Assigned Users')}</span>
              </div>
              <div className="text-lg font-mono font-bold theme-text-primary">
                {formatNumber(role.user_count || 0)}
              </div>
            </div>

            <div className="p-3.5 rounded-xl theme-bg-sub/60 border theme-border space-y-1">
              <div className="flex items-center gap-1.5 text-xs theme-text-secondary">
                <ShieldCheckIcon className="w-3.5 h-3.5" />
                <span>{t('hierarchyRank', 'Authority Level')}</span>
              </div>
              <div className="text-lg font-mono font-bold theme-accent">
                {formatNumber(role.hierarchy_level)} / {formatNumber(10)}
              </div>
            </div>
          </div>

          {/* Section: Action Permissions Matrix Breakdown */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b theme-border">
              <SparklesIcon className="w-4 h-4 theme-accent" />
              <h4 className="text-xs font-bold uppercase tracking-wider font-mono theme-text-secondary">
                {t('drawers.permissionsSection', 'Action Permissions Matrix')}
              </h4>
            </div>

            <div className="space-y-2">
              {permissionsConfig.map((item) => {
                const isEnabled = Boolean(perms[item.key]);
                return (
                  <div
                    key={item.key}
                    className={`p-3 rounded-xl border flex items-start gap-3 transition-colors ${
                      isEnabled
                        ? 'theme-bg-surface border-emerald-500/20'
                        : 'theme-bg-sub/40 theme-border opacity-70'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isEnabled ? (
                        <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 flex items-center justify-center">
                          <CheckCircleIcon className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full theme-bg-sub theme-text-secondary flex items-center justify-center text-[10px] font-mono">
                          ×
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold theme-text-primary flex items-center gap-2">
                        <span>{item.label}</span>
                        {isEnabled ? (
                          <span className="text-[10px] font-mono font-medium text-emerald-500 dark:text-emerald-400">
                            Granted
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-zinc-400">
                            Restricted
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] theme-text-secondary mt-0.5">
                        {item.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DrawerContainer>

      {/* Drawer Action Bar */}
      <div className="p-4 border-t theme-border flex items-center justify-between gap-3 theme-bg-surface">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl text-xs font-medium theme-text-secondary hover:theme-text-primary theme-bg-sub hover:theme-bg-elevated border theme-border transition-colors cursor-pointer"
        >
          Close
        </button>

        <div className="flex items-center gap-2">
          {onClone && (
            <button
              type="button"
              onClick={() => onClone(role)}
              className="px-4 py-2 rounded-xl text-xs font-semibold theme-text-primary theme-bg-sub hover:theme-bg-elevated border theme-border transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <CopyIcon className="w-3.5 h-3.5" />
              <span>{t('cloneRole', 'Clone')}</span>
            </button>
          )}

          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(role)}
              className="px-4 py-2 rounded-xl text-xs font-semibold theme-bg-accent theme-accent-text hover:opacity-90 shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <EditIcon className="w-3.5 h-3.5" />
              <span>{t('editRole', 'Edit')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoleDetailDrawer;
