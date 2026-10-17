import React from 'react';
import DataCardGrid from '../../../../components/ui/DataCardGrid';
import ActionMenu, { ActionMenuItem } from '../../../../components/ui/ActionMenu';
import {
  KeyIcon,
  EditIcon,
  TrashIcon,
  CopyIcon,
  EyeIcon,
  ShieldCheckIcon,
  UsersIcon,
} from '../../../../components/ui/Icons';
import { useRoleTranslation } from '../hooks/useRoleTranslation';
import { RoleRecord } from '../types';

export interface RoleCardGridProps {
  roles: RoleRecord[];
  loading?: boolean;
  searchQuery?: string;
  hasActiveFilters?: boolean;
  onViewDetails: (role: RoleRecord) => void;
  onEditRole: (role: RoleRecord) => void;
  onCloneRole: (role: RoleRecord) => void;
  onDeleteRole: (role: RoleRecord) => void;
  onSetGoogleDefault: (role: RoleRecord) => void;
  onResetFilters?: () => void;
  onOpenCreateDrawer?: () => void;
}

export const RoleCardGrid: React.FC<RoleCardGridProps> = ({
  roles,
  loading = false,
  searchQuery = '',
  hasActiveFilters = false,
  onViewDetails,
  onEditRole,
  onCloneRole,
  onDeleteRole,
  onSetGoogleDefault,
  onResetFilters,
  onOpenCreateDrawer,
}) => {
  const { t, formatNumber } = useRoleTranslation();

  const getActionMenuItems = (role: RoleRecord): ActionMenuItem[] => {
    const isProtected = role.code === 'SUPER_ADMIN';

    const items: ActionMenuItem[] = [
      {
        label: t('viewDetails', 'View Permissions'),
        icon: EyeIcon,
        onClick: () => onViewDetails(role),
      },
      {
        label: t('editRole', 'Edit Role'),
        icon: EditIcon,
        onClick: () => onEditRole(role),
      },
      {
        label: t('cloneRole', 'Clone Role'),
        icon: CopyIcon,
        onClick: () => onCloneRole(role),
      },
    ];

    if (!role.is_google_default) {
      items.push({
        label: t('setGoogleDefault', 'Set as Google Default'),
        icon: ShieldCheckIcon,
        onClick: () => onSetGoogleDefault(role),
      });
    }

    if (!isProtected) {
      items.push({ divider: true });
      items.push({
        label: t('deleteRole', 'Delete Role'),
        icon: TrashIcon,
        danger: true,
        onClick: () => onDeleteRole(role),
      });
    }

    return items;
  };

  const renderCard = (role: RoleRecord) => {
    const isProtected = role.code === 'SUPER_ADMIN';

    // Count enabled permissions
    const perms = role.action_permissions || {};
    const enabledPermsCount = Object.values(perms).filter(Boolean).length;

    return (
      <div className="theme-bg-surface border theme-border rounded-2xl p-4 sm:p-5 shadow-xs transition-all space-y-4 hover:shadow-md text-left">
        {/* Card Top: Title, Hierarchy Level & Action Menu */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => onViewDetails(role)}
                className="font-bold theme-text-primary text-base truncate hover:theme-accent transition-colors block text-left cursor-pointer"
              >
                {role.name}
              </button>
              {role.is_google_default && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-sky-500/10 text-sky-500 dark:text-sky-400 border border-sky-500/20">
                  {t('googleDefault', 'Google Default')}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-xs theme-text-secondary theme-bg-sub border theme-border px-2 py-0.5 rounded-md">
                {role.code}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-semibold theme-bg-accent-soft theme-accent border theme-border">
                {t('levelBadge', 'Level {{level}}', { level: formatNumber(role.hierarchy_level) })}
              </span>
            </div>
          </div>

          <div className="shrink-0">
            <ActionMenu items={getActionMenuItems(role)} align="right" />
          </div>
        </div>

        {/* Card Middle: Description */}
        <p className="text-xs theme-text-secondary leading-relaxed line-clamp-2">
          {role.description || '—'}
        </p>

        {/* Card Footer: Users & Status */}
        <div className="pt-3 border-t theme-border flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-mono theme-text-secondary">
            <UsersIcon className="w-3.5 h-3.5 opacity-70" />
            <span>
              {formatNumber(role.user_count || 0)} {t('assignedUsers', 'Users')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono theme-text-secondary">
              {t('permissionsSummary', '{{count}} Permissions', {
                count: formatNumber(enabledPermsCount),
              })}
            </span>
            {isProtected ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{t('protected', 'Protected')}</span>
              </span>
            ) : (
              <span className="inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded-md theme-bg-sub theme-text-secondary border theme-border">
                {t('configurable', 'Configurable')}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <DataCardGrid
      data={roles}
      renderCard={renderCard}
      isLoading={loading}
      loadingMessage="Loading roles cards..."
      emptyIcon={KeyIcon}
      emptyTitle={t('empty.title', 'No Roles Found')}
      emptySubMessage={
        hasActiveFilters || searchQuery
          ? t('empty.filteredMessage', 'No roles match your search or filter criteria. Try adjusting your filters.')
          : t('empty.defaultMessage', 'No custom roles defined. Create custom authority roles to manage permissions across your academy.')
      }
    />
  );
};

export default RoleCardGrid;
