import React from 'react';
import DataCardGrid from '../../../../../components/ui/DataCardGrid';
import ActionMenu, { ActionMenuItem } from '../../../../../components/ui/ActionMenu';
import {
  QrCodeIcon,
  CopyIcon,
  BanIcon,
  TrashIcon,
  ClockIcon,
} from '../../../../../components/ui/Icons';
import { RoleInviteRecord } from '../../types';
import { useUserTranslation } from '../../hooks/useUserTranslation';

export interface RoleInviteCardGridProps {
  invites: RoleInviteRecord[];
  loading?: boolean;
  onViewQR: (invite: RoleInviteRecord) => void;
  onCopyLink: (token: string) => void;
  onRevoke: (id: string) => void;
  onDelete: (invite: RoleInviteRecord) => void;
  onResetFilters?: () => void;
  onOpenCreateDrawer?: () => void;
}

export const RoleInviteCardGrid: React.FC<RoleInviteCardGridProps> = ({
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

  const renderCard = (invite: RoleInviteRecord) => {
    const isExpired = Boolean(invite.expires_at && new Date(invite.expires_at) < new Date());
    const isRevoked = !invite.is_active;
    const isActive = invite.is_active && !isExpired;

    return (
      <div className="theme-bg-surface border theme-border rounded-2xl p-4 sm:p-5 shadow-xs transition-all space-y-4 hover:shadow-md text-left">
        {/* Top: Title & Action Menu */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <button
              type="button"
              onClick={() => onViewQR(invite)}
              className="font-bold theme-text-primary text-base truncate hover:theme-accent transition-colors block text-left cursor-pointer"
            >
              {invite.title}
            </button>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold theme-bg-sub theme-text-secondary border theme-border">
                {invite.target_role_name}
              </span>
              <span className="font-mono text-[10px] theme-text-secondary">
                {invite.target_role_code}
              </span>
            </div>
          </div>

          <div className="shrink-0">
            <ActionMenu items={getActionMenuItems(invite)} align="right" />
          </div>
        </div>

        {/* Middle Stats */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t theme-border text-xs font-mono">
          <div className="theme-bg-sub p-2.5 rounded-xl border theme-border space-y-0.5">
            <span className="text-[10px] theme-text-secondary block">
              {t('invites.usages', 'Usages')}
            </span>
            <span className="font-bold theme-text-primary block">
              {formatNumber(invite.used_count || 0)} / {invite.max_uses === 0 ? '∞' : formatNumber(invite.max_uses)}
            </span>
          </div>

          <div className="theme-bg-sub p-2.5 rounded-xl border theme-border space-y-0.5">
            <span className="text-[10px] theme-text-secondary block">
              {t('invites.expires', 'Expires')}
            </span>
            <span className="font-semibold theme-text-primary block truncate">
              {invite.expires_at ? formatDate(invite.expires_at) : t('invites.never', 'Never')}
            </span>
          </div>
        </div>

        {/* Bottom Actions & Status */}
        <div className="flex items-center justify-between pt-3 border-t theme-border text-xs">
          <div>
            {isActive ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{t('invites.active', 'Active')}</span>
              </span>
            ) : isRevoked ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20">
                {t('invites.revoked', 'Revoked')}
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20">
                {t('invites.expired', 'Expired')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onCopyLink(invite.token)}
              className="p-1.5 rounded-lg theme-bg-sub hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary border theme-border transition-colors cursor-pointer"
              title={t('invites.copyLink', 'Copy Direct Link')}
            >
              <CopyIcon className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onViewQR(invite)}
              className="px-2.5 py-1 rounded-lg theme-bg-accent-soft theme-accent border theme-border font-medium text-xs flex items-center gap-1 cursor-pointer hover:opacity-90"
            >
              <QrCodeIcon className="w-3.5 h-3.5" />
              <span>{t('invites.viewQR', 'QR')}</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <DataCardGrid
      data={invites}
      renderCard={renderCard}
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

export default RoleInviteCardGrid;
