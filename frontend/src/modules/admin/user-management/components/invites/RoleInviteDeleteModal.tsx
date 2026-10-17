import React from 'react';
import Modal from '../../../../../components/ui/Modal';
import { AlertTriangleIcon, TrashIcon } from '../../../../../components/ui/Icons';
import { useUserTranslation } from '../../hooks/useUserTranslation';
import { RoleInviteRecord } from '../../types';

export interface RoleInviteDeleteModalProps {
  invite: RoleInviteRecord | null;
  isOpen: boolean;
  submitting?: boolean;
  onConfirm: (invite: RoleInviteRecord) => void;
  onClose: () => void;
}

export const RoleInviteDeleteModal: React.FC<RoleInviteDeleteModalProps> = ({
  invite,
  isOpen,
  submitting = false,
  onConfirm,
  onClose,
}) => {
  const { t, formatNumber } = useUserTranslation();

  if (!invite) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('invites.deleteWarningTitle', 'Delete Invite Token')}
      size="sm"
    >
      <div className="space-y-4 text-left p-1">
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-rose-500/20 text-rose-500 shrink-0">
            <AlertTriangleIcon className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-rose-500">
              {t('invites.deleteWarningTitle', 'Delete Invite Token')}
            </h4>
            <p className="text-xs text-rose-400 leading-relaxed">
              {t(
                'invites.deleteWarningMessage',
                'Are you sure you want to delete invite "{{title}}"? This cannot be undone.',
                { title: invite.title }
              )}
            </p>
          </div>
        </div>

        {/* Invite Identity Details */}
        <div className="p-3 rounded-xl theme-bg-sub border theme-border space-y-1.5 text-xs font-mono">
          <div className="flex justify-between">
            <span className="theme-text-secondary">Title:</span>
            <span className="font-bold theme-text-primary">{invite.title}</span>
          </div>
          <div className="flex justify-between">
            <span className="theme-text-secondary">Target Role:</span>
            <span className="theme-accent font-semibold">{invite.target_role_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="theme-text-secondary">Claimed Usages:</span>
            <span className="theme-text-primary">
              {formatNumber(invite.used_count)} / {invite.max_uses === 0 ? '∞' : formatNumber(invite.max_uses)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t theme-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium theme-text-secondary hover:theme-text-primary theme-bg-sub hover:theme-bg-elevated border theme-border transition-colors cursor-pointer"
          >
            {t('cancel', 'Cancel')}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => onConfirm(invite)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <TrashIcon className="w-3.5 h-3.5" />
            <span>
              {submitting
                ? t('deleting', 'Deleting...')
                : t('confirmDelete', 'Confirm Delete')}
            </span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default RoleInviteDeleteModal;
