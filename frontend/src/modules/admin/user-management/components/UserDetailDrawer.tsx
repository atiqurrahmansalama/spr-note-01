import React, { useState } from 'react';
import { useUserTranslation } from '../hooks/useUserTranslation';
import { useToast } from '../../../../context/ToastContext';
import {
  UserIcon,
  ShieldCheckIcon,
  MailIcon,
  PhoneIcon,
  KeyIcon,
  EditIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  CloseIcon,
  LogOutIcon,
} from '../../../../components/ui/Icons';
import { DrawerContainer } from '../../../../components/layout';
import { UserRecord, UserRole } from '../types';
import { isUserOnline } from '../utils/presence';


export interface UserDetailDrawerProps {
  user: UserRecord | null;
  roles: UserRole[];
  onEdit: (user: UserRecord) => void;
  onResetPassword: (user: UserRecord) => void;
  onViewSessions: (user: UserRecord) => void;
  onRevokeSessions: (user: UserRecord) => void;
  onClose: () => void;
}

export const UserDetailDrawer: React.FC<UserDetailDrawerProps> = ({
  user,
  roles,
  onEdit,
  onResetPassword,
  onViewSessions,
  onRevokeSessions,
  onClose,
}) => {
  const { t, formatDate } = useUserTranslation();
  const { showToast } = useToast();
  const [copied, setCopied] = useState<boolean>(false);

  if (!user) return null;

  const roleObj = user.role || roles.find((r) => r.code === user.user_type);
  const roleName = roleObj?.name || user.user_type || 'User';
  const displayName =
    `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.name || user.email || 'User';
  const initial = (user.first_name?.[0] || user.name?.[0] || user.email?.[0] || 'U').toUpperCase();
  const isOnline = isUserOnline(user);
  const isDeactivated = user.is_active === false || Boolean(user.is_deactivated);

  const handleCopyId = () => {
    navigator.clipboard.writeText(String(user.id));
    setCopied(true);
    showToast('User ID copied to clipboard.', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const perms = roleObj?.action_permissions || {};

  return (
    <DrawerContainer padding="none" spacing="normal">
      <div className="space-y-6 pt-2 text-left">
        {/* Profile Identity Hero Card */}
        <div className="p-4 rounded-2xl theme-bg-sub border theme-border flex items-start gap-4">
          <div className="relative shrink-0">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={displayName}
                className="w-14 h-14 rounded-2xl object-cover border theme-border"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl theme-bg-accent-soft border theme-border theme-accent font-bold text-lg flex items-center justify-center">
                {initial}
              </div>
            )}
            {isOnline && (
              <span
                className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[var(--bg-surface)] bg-emerald-500"
                title={t('onlineNow', 'Online Now')}
              />
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold theme-text-primary truncate">{displayName}</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold theme-bg-accent-soft theme-accent border theme-border">
                {roleName}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs theme-text-secondary font-mono">
              <span>ID: #{user.id}</span>
              <button
                type="button"
                onClick={handleCopyId}
                className="hover:theme-accent text-[11px] underline cursor-pointer"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <div className="pt-1 flex items-center gap-2.5 flex-wrap">
              {/* Account Status */}
              {isDeactivated ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-rose-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>{t('statusInactive', 'Inactive Account')}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>{t('statusActive', 'Active Account')}</span>
                </span>
              )}

              {/* Real-time App Presence */}
              {isOnline && (
                <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>{t('onlineNow', 'Online Now')}</span>
                </span>
              )}
            </div>
          </div>
        </div>


        {/* Quick Drawer Action Bar */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => onEdit(user)}
            className="p-2.5 rounded-xl theme-bg-sub border theme-border hover:theme-bg-elevated font-semibold theme-text-primary transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <EditIcon className="w-4 h-4 theme-accent" />
            <span>{t('editProfile', 'Edit Profile')}</span>
          </button>

          <button
            type="button"
            onClick={() => onResetPassword(user)}
            className="p-2.5 rounded-xl theme-bg-sub border theme-border hover:theme-bg-elevated font-semibold theme-text-primary transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <KeyIcon className="w-4 h-4 theme-accent" />
            <span>{t('resetPassword', 'Reset Password')}</span>
          </button>

          <button
            type="button"
            onClick={() => onViewSessions(user)}
            className="p-2.5 rounded-xl theme-bg-sub border theme-border hover:theme-bg-elevated font-semibold theme-text-secondary hover:theme-text-primary transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShieldCheckIcon className="w-4 h-4" />
            <span>{t('viewSessions', 'Active Sessions')}</span>
          </button>

          <button
            type="button"
            onClick={() => onRevokeSessions(user)}
            className="p-2.5 rounded-xl theme-bg-sub border theme-border hover:theme-bg-elevated font-semibold theme-text-secondary hover:theme-text-primary transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOutIcon className="w-4 h-4" />
            <span>{t('revokeSessions', 'Revoke Sessions')}</span>
          </button>
        </div>

        {/* Section 1: Contact & Identity */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b theme-border">
            <UserIcon className="w-4 h-4 theme-accent" />
            <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
              {t('drawers.personalInfoSection', 'Personal & Contact')}
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl theme-bg-sub/50 border theme-border">
              <span className="text-[10px] uppercase font-mono theme-text-secondary block">
                {t('fields.email', 'Email Address')}
              </span>
              <span className="font-mono theme-text-primary mt-1 block truncate">
                {user.email || '—'}
              </span>
            </div>

            <div className="p-3 rounded-xl theme-bg-sub/50 border theme-border">
              <span className="text-[10px] uppercase font-mono theme-text-secondary block">
                {t('fields.phoneNumber', 'Phone Number')}
              </span>
              <span className="font-mono theme-accent mt-1 block truncate">
                {user.phone_number || '—'}
              </span>
            </div>

            <div className="p-3 rounded-xl theme-bg-sub/50 border theme-border">
              <span className="text-[10px] uppercase font-mono theme-text-secondary block">
                {t('authProvider', 'Auth Provider')}
              </span>
              <span className="theme-text-primary mt-1 block">
                {user.auth_provider === 'google' ? t('providerGoogle', 'Google') : t('providerEmail', 'Email & Password')}
              </span>
            </div>

            <div className="p-3 rounded-xl theme-bg-sub/50 border theme-border">
              <span className="text-[10px] uppercase font-mono theme-text-secondary block">
                {t('joinedDate', 'Joined Date')}
              </span>
              <span className="font-mono theme-text-secondary mt-1 block">
                {user.date_joined ? formatDate(user.date_joined) : user.formatted_created_at || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Role & Authority */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b theme-border">
            <ShieldCheckIcon className="w-4 h-4 theme-accent" />
            <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
              {t('drawers.roleSection', 'Role & Authority')}
            </h4>
          </div>

          <div className="p-3.5 rounded-2xl theme-bg-sub/50 border theme-border space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="theme-text-secondary">Role Name:</span>
              <span className="font-bold theme-text-primary">{roleName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="theme-text-secondary">Role Code:</span>
              <span className="font-mono theme-accent">{roleObj?.code || user.user_type || '—'}</span>
            </div>
            {roleObj?.hierarchy_level !== undefined && (
              <div className="flex items-center justify-between">
                <span className="theme-text-secondary">Hierarchy Level:</span>
                <span className="font-mono theme-text-primary">{roleObj.hierarchy_level}</span>
              </div>
            )}
            {roleObj?.description && (
              <p className="text-[11px] theme-text-secondary pt-1 border-t theme-border leading-relaxed">
                {roleObj.description}
              </p>
            )}
          </div>
        </div>

        {/* Section 3: Action Permissions Checklist */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b theme-border">
            <KeyIcon className="w-4 h-4 theme-accent" />
            <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
              Assigned Permissions
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {[
              { key: 'can_manage_users', label: 'Manage Users & Roles' },
              { key: 'can_create_student', label: 'Create Students' },
              { key: 'can_edit_student', label: 'Edit Students' },
              { key: 'can_export_reports', label: 'Export Reports' },
              { key: 'can_delete_report', label: 'Delete Reports' },
            ].map((p) => {
              const hasPerm = Boolean(perms[p.key]);
              return (
                <div
                  key={p.key}
                  className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                    hasPerm
                      ? 'theme-bg-accent-soft/30 border theme-border theme-text-primary font-medium'
                      : 'theme-bg-sub/30 border-transparent theme-text-secondary opacity-60'
                  }`}
                >
                  <CheckCircleIcon
                    className={`w-4 h-4 shrink-0 ${hasPerm ? 'theme-accent' : 'opacity-40'}`}
                  />
                  <span className="text-[11px] truncate">{p.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Close Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl theme-bg-sub border theme-border hover:theme-bg-elevated text-xs font-bold theme-text-primary transition cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </div>
    </DrawerContainer>
  );
};

export default UserDetailDrawer;
