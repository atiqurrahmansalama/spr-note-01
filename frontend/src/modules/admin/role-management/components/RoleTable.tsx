import React from 'react';
import DataTable, { Column } from '../../../../components/ui/DataTable';
import ActionMenu, { ActionMenuItem } from '../../../../components/ui/ActionMenu';
import {
  KeyIcon,
  EditIcon,
  TrashIcon,
  CopyIcon,
  EyeIcon,
  ShieldCheckIcon,
} from '../../../../components/ui/Icons';
import { useRoleTranslation } from '../hooks/useRoleTranslation';
import { RoleRecord } from '../types';

export interface RoleTableProps {
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

export const RoleTable: React.FC<RoleTableProps> = ({
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

  const columns: Column<RoleRecord>[] = [
    {
      key: 'name',
      header: t('roleName', 'Role Name'),
      headerClassName: 'min-w-[240px]',
      render: (role) => {
        return (
          <div className="space-y-0.5 text-left">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onViewDetails(role)}
                className="font-bold theme-text-primary text-sm hover:theme-accent transition-colors block text-left cursor-pointer"
              >
                {role.name}
              </button>
              {role.is_google_default && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-sky-500/10 text-sky-500 dark:text-sky-400 border border-sky-500/20">
                  {t('googleDefault', 'Google Default')}
                </span>
              )}
            </div>
            {role.description ? (
              <p className="text-xs theme-text-secondary truncate max-w-md font-sans">
                {role.description}
              </p>
            ) : (
              <p className="text-xs theme-text-secondary/60 italic font-sans">—</p>
            )}
          </div>
        );
      },
    },
    {
      key: 'code',
      header: t('roleCode', 'Role Code'),
      headerClassName: 'min-w-[150px]',
      render: (role) => (
        <span className="theme-bg-sub border theme-border font-mono text-xs px-2.5 py-1 rounded-lg inline-block theme-text-secondary">
          {role.code}
        </span>
      ),
    },
    {
      key: 'hierarchy_level',
      header: t('hierarchyRank', 'Authority Level'),
      headerClassName: 'min-w-[140px] text-center',
      render: (role) => (
        <div className="text-center">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold theme-bg-accent-soft theme-accent border theme-border">
            {t('levelBadge', 'Level {{level}}', { level: formatNumber(role.hierarchy_level) })}
          </span>
        </div>
      ),
    },
    {
      key: 'user_count',
      header: t('assignedUsers', 'Users'),
      headerClassName: 'min-w-[100px] text-center',
      render: (role) => (
        <div className="text-center font-mono text-xs font-semibold theme-text-primary">
          {formatNumber(role.user_count || 0)}
        </div>
      ),
    },
    {
      key: 'status',
      header: t('protection', 'Status'),
      headerClassName: 'min-w-[130px] text-center',
      render: (role) => {
        const isProtected = role.code === 'SUPER_ADMIN';

        return (
          <div className="text-center">
            {isProtected ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{t('protected', 'Protected')}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-lg theme-bg-sub theme-text-secondary border theme-border">
                {t('configurable', 'Configurable')}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: t('actions', 'Actions'),
      headerClassName: 'w-[80px] text-right',
      render: (role) => (
        <div className="flex items-center justify-end">
          <ActionMenu items={getActionMenuItems(role)} align="right" />
        </div>
      ),
    },
  ];

  return (
    <DataTable
      data={roles}
      columns={columns}
      isLoading={loading}
      loadingMessage="Loading roles list..."
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

export default RoleTable;
