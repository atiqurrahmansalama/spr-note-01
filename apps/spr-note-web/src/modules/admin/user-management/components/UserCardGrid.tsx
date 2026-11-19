import React from 'react';
import DataCardGrid from '../../../../components/ui/DataCardGrid';
import ActionMenu, { ActionMenuItem } from '../../../../components/ui/ActionMenu';
import CustomCheckbox from '../../../../components/ui/CustomCheckbox';
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


export interface UserCardGridProps {
  users: UserRecord[];
  roles: UserRole[];
  loading: boolean;
  selectedIds: (number | string)[];
  onSelectRow: (id: number | string) => void;
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

export const UserCardGrid: React.FC<UserCardGridProps> = ({
  users,
  roles,
  loading,
  selectedIds,
  onSelectRow,
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

  const renderCard = (u: UserRecord) => {
    const roleObj = u.role || roles.find((r) => r.code === u.user_type);
    const roleName = roleObj?.name || u.user_type || 'User';
    const isSelected = selectedIds.includes(u.id);
    const displayName =
      `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.name || u.email || 'User';
    const initial = (u.first_name?.[0] || u.name?.[0] || u.email?.[0] || 'U').toUpperCase();
    const isOnline = isUserOnline(u);

    return (
      <div
        className={`theme-bg-surface border theme-border rounded-2xl p-4 sm:p-5 shadow-xs transition-all space-y-4 hover:shadow-md text-left ${
          isSelected ? 'theme-bg-accent-soft/40 ring-1 ring-[var(--accent-main)]' : ''
        }`}
      >
        {/* Card Top: Avatar, Name, Role & Action Menu */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              {u.avatar_url ? (
                <img
                  src={u.avatar_url}
                  alt={displayName}
                  className="w-11 h-11 rounded-full object-cover border theme-border"
                />
              ) : (
                <div className="w-11 h-11 rounded-full theme-bg-elevated border theme-border theme-accent font-bold text-sm flex items-center justify-center">
                  {initial}
                </div>
              )}
              {isOnline && (
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[var(--bg-surface)] bg-emerald-500"
                  title={t('onlineNow', 'Online Now')}
                />
              )}
            </div>


            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => onViewDetails(u)}
                className="font-bold theme-text-primary text-sm truncate hover:theme-accent transition-colors block text-left cursor-pointer"
              >
                {displayName}
              </button>
              <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md text-[11px] font-mono theme-bg-accent-soft theme-accent border theme-border">
                {roleName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <CustomCheckbox checked={isSelected} onChange={() => onSelectRow(u.id)} />
            <ActionMenu items={getUserActionMenuItems(u)} align="right" />
          </div>
        </div>

        {/* Card Middle Details Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t theme-border">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider theme-text-secondary block">
              {t('fields.email', 'Email')}
            </span>
            <span className="font-mono theme-text-primary text-[11px] truncate block mt-0.5">
              {u.email || '—'}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider theme-text-secondary block">
              {t('fields.phoneNumber', 'Phone')}
            </span>
            <span className="font-mono theme-accent text-[11px] truncate block mt-0.5">
              {u.phone_number || '—'}
            </span>
          </div>

          <div className="col-span-2 mt-1 flex items-center justify-between text-[11px]">
            <span className="theme-text-secondary">
              {u.auth_provider === 'google' ? t('providerGoogle', 'Google') : t('providerEmail', 'Email & Password')}
            </span>
            <span className="font-mono theme-text-secondary">
              {u.date_joined ? formatDate(u.date_joined) : u.formatted_created_at || '—'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <DataCardGrid
      data={users}
      renderCard={renderCard}
      isLoading={loading}
      loadingMessage="Loading users cards..."
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

export default UserCardGrid;
