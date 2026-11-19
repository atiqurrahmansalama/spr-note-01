import React from 'react';
import DataTable, { Column } from '../../../../../components/ui/DataTable';
import ActionMenu, { ActionMenuItem } from '../../../../../components/ui/ActionMenu';
import {
  QrCodeIcon,
  CopyIcon,
  BanIcon,
  TrashIcon,
} from '../../../../../components/ui/Icons';
import { RoleInviteRecord } from '../../types';
import { useUserTranslation } from '../../hooks/useUserTranslation';

export interface RoleInviteTableProps {
  invites: RoleInviteRecord[];
  loading?: boolean;
  onViewQR: (invite: RoleInviteRecord) => void;
  onCopyLink: (token: string) => void;
  onRevoke: (id: string) => void;
  onDelete: (invite: RoleInviteRecord) => void;
  onResetFilters?: () => void;
  onOpenCreateDrawer?: () => void;
}

export const RoleInviteTable: React.FC<RoleInviteTableProps> = ({
  invites,
  loading = false,
  onViewQR,
  onCopyLink,
  onRevoke,
  onDelete,
  onResetFilters,
  onOpenCreateDrawer,
}) => {
  const { t, formatNumber, formatDate } = useUserTranslation();

  const getActionMenuItems = (invite: RoleInviteRecord): ActionMenuItem[] => {
    const isExpired = Boolean(invite.expires_at && new Date(invite.expires_at) < new Date());
    const isRevoked = !invite.is_active;

    const items: ActionMenuItem[] = [
      {
        label: t('invites.viewQR', 'View & Print QR'),
        icon: QrCodeIcon,
        onClick: () => onViewQR(invite),
      },
      {
        label: t('invites.copyLink', 'Copy Direct Link'),
        icon: CopyIcon,
        onClick: () => onCopyLink(invite.token),
      },
    ];

    if (!isRevoked && !isExpired) {
      items.push({
        label: t('invites.revokeInvite', 'Revoke Token'),
        icon: BanIcon,
        danger: true,
        onClick: () => onRevoke(invite.id),
      });
    }

    items.push({ divider: true });
    items.push({
      label: t('invites.deleteInvite', 'Delete Invite'),
      icon: TrashIcon,
      danger: true,
      onClick: () => onDelete(invite),
    });

    return items;
  };

  const columns: Column<RoleInviteRecord>[] = [
    {
      key: 'title',
      header: t('invites.batchTitle', 'Title / Batch Label'),
      headerClassName: 'min-w-[240px]',
      render: (invite) => (
        <div className="space-y-0.5 text-left">
          <button
            type="button"
            onClick={() => onViewQR(invite)}
            className="font-bold theme-text-primary text-sm hover:theme-accent transition-colors block text-left cursor-pointer"
          >
            {invite.title}
          </button>
          <span className="font-mono text-[10px] theme-text-secondary opacity-80 block truncate max-w-xs">
            {invite.token?.slice(0, 20)}...
          </span>
        </div>
      ),
    },
    {
      key: 'target_role',
      header: t('invites.targetRole', 'Target Role'),
      headerClassName: 'min-w-[160px]',
      render: (invite) => (
        <div className="text-left space-y-0.5">
          <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold theme-bg-sub theme-text-primary border theme-border">
            {invite.target_role_name}
          </span>
          <span className="font-mono text-[10px] theme-text-secondary block">
            {invite.target_role_code}
          </span>
        </div>
      ),
    },
    {
      key: 'usages',
      header: t('invites.usages', 'Usages'),
      headerClassName: 'min-w-[120px] text-center',
      render: (invite) => {
        const used = formatNumber(invite.used_count || 0);
        const max = invite.max_uses === 0 ? '∞' : formatNumber(invite.max_uses);

        return (
          <div className="text-center font-mono text-xs font-semibold theme-text-primary">
            {used} / {max}
          </div>
        );
      },
    },
    {
      key: 'expires_at',
      header: t('invites.expires', 'Expires'),
      headerClassName: 'min-w-[140px]',
      render: (invite) => {
        if (!invite.expires_at) {
          return <span className="text-xs theme-text-secondary">{t('invites.never', 'Never')}</span>;
        }

        const isPast = new Date(invite.expires_at) < new Date();
        return (
          <span className={`text-xs font-mono ${isPast ? 'text-rose-500 font-semibold' : 'theme-text-primary'}`}>
            {formatDate(invite.expires_at)}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: t('invites.status', 'Status'),
      headerClassName: 'min-w-[130px] text-center',
      render: (invite) => {
        const isExpired = Boolean(invite.expires_at && new Date(invite.expires_at) < new Date());
        const isRevoked = !invite.is_active;
        const isActive = invite.is_active && !isExpired;

        if (isActive) {
          return (
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{t('invites.active', 'Active')}</span>
              </span>
            </div>
          );
        }

        if (isRevoked) {
          return (
            <div className="text-center">
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20">
                {t('invites.revoked', 'Revoked')}
              </span>
            </div>
          );
        }

        return (
          <div className="text-center">
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20">
              {t('invites.expired', 'Expired')}
            </span>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: t('invites.actions', 'Actions'),
      headerClassName: 'w-[80px] text-right',
      render: (invite) => (
        <div className="flex justify-end">
          <ActionMenu items={getActionMenuItems(invite)} align="right" />
        </div>
      ),
    },
  ];

  return (
    <DataTable
      data={invites}
      columns={columns}
      isLoading={loading}
      loadingMessage="Loading role invites..."
      emptyIcon={QrCodeIcon}
      emptyTitle={t('invites.emptyTitle', 'No Invites Found')}
      emptySubMessage={t(
        'invites.emptyDefault',
        'Generate your first role invite token or QR code to onboard users seamlessly.'
      )}
    />
  );
};

export default RoleInviteTable;
