import React from 'react';
import DataTable, { Column } from '../../../../components/ui/DataTable';
import ActionMenu, { ActionMenuItem } from '../../../../components/ui/ActionMenu';
import {
  UsersIcon,
  ShieldCheckIcon,
  MailIcon,
  PhoneIcon,
  EditIcon,
  KeyIcon,
  LogOutIcon,
  TrashIcon,
  EyeIcon,
  CheckCircleIcon,
} from '../../../../components/ui/Icons';
import { useUserTranslation } from '../hooks/useUserTranslation';
import { UserRecord, UserRole } from '../types';
import { isUserOnline } from '../utils/presence';


export interface UserTableProps {
  users: UserRecord[];
  roles: UserRole[];
  loading: boolean;
  selectedIds: (number | string)[];
  onSelectRow: (id: number | string) => void;
  onSelectAll: (selectedList: (number | string)[] | boolean) => void;
  onViewDetails: (user: UserRecord) => void;
  onEditUser: (user: UserRecord) => void;
  onResetPassword: (user: UserRecord) => void;
  onViewSessions: (user: UserRecord) => void;
  onRevokeSessions: (user: UserRecord) => void;
  onConfirmDeactivate: (user: UserRecord) => void;
  onToggleStatus: (user: UserRecord) => void;
  searchQuery?: string;
  hasActiveFilters?: boolean;
}

export const UserTable: React.FC<UserTableProps> = ({
  users,
  roles,
  loading,
  selectedIds,
  onSelectRow,
  onSelectAll,
  onViewDetails,
  onEditUser,
  onResetPassword,
  onViewSessions,
  onRevokeSessions,
  onConfirmDeactivate,
  onToggleStatus,
  searchQuery = '',
  hasActiveFilters = false,
}) => {
  const { t, formatDate } = useUserTranslation();

  const getUserActionMenuItems = (u: UserRecord): ActionMenuItem[] => [
    {
      label: t('viewDetails', 'View Details'),
      icon: EyeIcon,
      onClick: () => onViewDetails(u),
    },
    {
      label: t('editProfile', 'Edit Profile'),
      icon: EditIcon,
      onClick: () => onEditUser(u),
    },
    {
      label: t('resetPassword', 'Reset Password'),
      icon: KeyIcon,
      onClick: () => onResetPassword(u),
    },
    {
      label: t('viewSessions', 'Active Sessions'),
      icon: ShieldCheckIcon,
      onClick: () => onViewSessions(u),
    },
    {
      label: t('revokeSessions', 'Revoke All Sessions'),
      icon: LogOutIcon,
      onClick: () => onRevokeSessions(u),
    },
    { divider: true },
    u.is_active !== false && !u.is_deactivated
      ? {
          label: t('deactivateAccount', 'Deactivate Account'),
          icon: TrashIcon,
          danger: true,
          onClick: () => onConfirmDeactivate(u),
        }
      : {
          label: t('activateAccount', 'Activate Account'),
          icon: CheckCircleIcon,
          onClick: () => onToggleStatus(u),
        },
  ];

  const columns: Column<UserRecord>[] = [
    {
      key: 'name',
      header: t('userAndContact', 'User & Contact'),
      headerClassName: 'min-w-[260px]',
      render: (u) => {
        const displayName =
          `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.name || u.email || u.phone_number || 'User';
        const initial = (u.first_name?.[0] || u.name?.[0] || u.email?.[0] || 'U').toUpperCase();
        const isOnline = isUserOnline(u);

        return (
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              {u.avatar_url ? (
                <img
                  src={u.avatar_url}
                  alt={displayName}
                  className="w-10 h-10 rounded-full object-cover border theme-border shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full theme-bg-elevated border theme-border theme-accent font-bold text-xs flex items-center justify-center shrink-0">
                  {initial}
                </div>
              )}
              {isOnline && (
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--bg-surface)] bg-emerald-500"
                  title={t('onlineNow', 'Online Now')}
                />
              )}
            </div>


            <div className="min-w-0 space-y-0.5 text-left">
              <button
                type="button"
                onClick={() => onViewDetails(u)}
                className="font-semibold theme-text-primary text-sm truncate hover:theme-accent transition-colors block text-left cursor-pointer"
              >
                {displayName}
              </button>
              <div className="font-mono text-xs theme-text-secondary truncate flex items-center gap-1">
                <MailIcon className="w-3 h-3 shrink-0 opacity-70" />
                <span>{u.email || '—'}</span>
              </div>
              <div className="font-mono text-xs theme-accent truncate flex items-center gap-1">
                <PhoneIcon className="w-3 h-3 shrink-0 opacity-70" />
                <span>{u.phone_number || '—'}</span>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'user_type',
      header: t('role', 'Role'),
      render: (u) => {
        const roleObj = u.role || roles.find((r) => r.code === u.user_type);
        const roleName = roleObj?.name || u.user_type || 'User';
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium font-mono theme-bg-accent-soft theme-accent border theme-border">
            {roleName}
          </span>
        );
      },
    },
    {
      key: 'auth_provider',
      header: t('authProvider', 'Auth Provider'),
      render: (u) =>
        u.auth_provider === 'google' ? (
          <span className="inline-flex items-center gap-1.5 theme-bg-sub theme-text-primary border theme-border text-xs px-2.5 py-1 rounded-lg font-medium">
            <ShieldCheckIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
            <span>{t('providerGoogle', 'Google')}</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 theme-bg-sub theme-text-secondary border theme-border text-xs px-2.5 py-1 rounded-lg font-medium">
            <MailIcon className="w-3.5 h-3.5 shrink-0" />
            <span>{t('providerEmail', 'Email')}</span>
          </span>
        ),
    },
    {
      key: 'is_active',
      header: t('status', 'Status'),
      render: (u) => {
        const isActive = u.is_active !== false && !u.is_deactivated;
        return (
          <button
            type="button"
            onClick={() => onToggleStatus(u)}
            className="cursor-pointer group flex items-center gap-1.5 transition-opacity hover:opacity-80"
            title={isActive ? t('deactivateAccount', 'Click to Deactivate') : t('activateAccount', 'Click to Activate')}
          >
            {isActive ? (
              <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{t('statusActive', 'Active')}</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 text-xs theme-text-secondary font-medium">
                <span className="w-2 h-2 rounded-full theme-bg-elevated" />
                <span>{t('statusInactive', 'Inactive')}</span>
              </div>
            )}
          </button>
        );
      },
    },
    {
      key: 'date_joined',
      header: t('joinedDate', 'Joined Date'),
      render: (u) => (
        <span className="theme-text-secondary font-mono text-xs">
          {u.date_joined ? formatDate(u.date_joined) : u.formatted_created_at || '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: t('actions', 'Actions'),
      align: 'right',
      headerClassName: 'text-right',
      render: (u) => (
        <div className="flex justify-end">
          <ActionMenu items={getUserActionMenuItems(u)} align="right" />
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={users}
      selectable={true}
      selectedIds={selectedIds}
      onSelectRow={onSelectRow}
      onSelectAll={onSelectAll}
      idField="id"
      isLoading={loading}
      loadingMessage="Loading users table..."
      emptyIcon={UsersIcon}
      emptyTitle={t('empty.title', 'No Users Found')}
      emptySubMessage={
        hasActiveFilters || searchQuery
          ? t('empty.filteredMessage', 'No user records matched your criteria. Try adjusting your search query or filters.')
          : t('empty.defaultMessage', 'Create your first user account to get started.')
      }
    />
  );
};

export default UserTable;
