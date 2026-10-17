import React from 'react';
import Modal from '../../../../components/ui/Modal';
import { AlertTriangleIcon, TrashIcon } from '../../../../components/ui/Icons';
import { useRoleTranslation } from '../hooks/useRoleTranslation';
import { RoleRecord } from '../types';

export interface RoleDeleteModalProps {
  role: RoleRecord | null;
  isOpen: boolean;
  submitting?: boolean;
  onConfirm: (role: RoleRecord) => void;
  onClose: () => void;
}

export const RoleDeleteModal: React.FC<RoleDeleteModalProps> = ({
  role,
  isOpen,
  submitting = false,
  onConfirm,
  onClose,
}) => {
  const { t, formatNumber } = useRoleTranslation();

  if (!role) return null;

  const isProtected = role.code === 'SUPER_ADMIN';
  const userCount = role.user_count || 0;
  const isBlocked = isProtected || userCount > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('deleteModal.title', 'Delete Role')}
      size="sm"
    >
      <div className="space-y-4 text-left p-1">
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-rose-500/20 text-rose-500 shrink-0">
            <AlertTriangleIcon className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-rose-500">
              {t('deleteModal.warningTitle', 'Warning: Role Deletion')}
            </h4>
            <p className="text-xs text-rose-400 leading-relaxed">
              {t(
                'deleteModal.warningMessage',
                'Are you sure you want to delete role "{{name}}"? This action cannot be undone.',
                { name: role.name }
              )}
            </p>
          </div>
        </div>

        {/* Role Identity Details */}
        <div className="p-3 rounded-xl theme-bg-sub border theme-border space-y-1.5 text-xs font-mono">
          <div className="flex justify-between">
            <span className="theme-text-secondary">Role Name:</span>
            <span className="font-bold theme-text-primary">{role.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="theme-text-secondary">Role Code:</span>
            <span className="theme-accent font-semibold">{role.code}</span>
          </div>
          <div className="flex justify-between">
            <span className="theme-text-secondary">Authority Level:</span>
            <span className="theme-text-primary">Level {formatNumber(role.hierarchy_level)}</span>
          </div>
          <div className="flex justify-between">
            <span className="theme-text-secondary">Assigned Users:</span>
            <span className={`font-bold ${userCount > 0 ? 'text-rose-400' : 'theme-text-primary'}`}>
              {formatNumber(userCount)}
            </span>
          </div>
        </div>

        {/* Blocking Warnings */}
        {isProtected && (
          <p className="text-xs text-amber-500 dark:text-amber-400 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
            {t('toasts.cannotDeleteSystem', 'Super Admin protected role cannot be deleted.')}
          </p>
        )}

        {!isProtected && userCount > 0 && (
          <p className="text-xs text-amber-500 dark:text-amber-400 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
            {t(
              'deleteModal.assignedWarning',
              'This role is currently assigned to {{count}} active user(s) and cannot be deleted.',
              { count: formatNumber(userCount) }
            )}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t theme-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium theme-text-secondary hover:theme-text-primary theme-bg-sub hover:theme-bg-elevated border theme-border transition-colors cursor-pointer"
          >
            {t('deleteModal.cancel', 'Cancel')}
          </button>
          <button
            type="button"
            disabled={isBlocked || submitting}
            onClick={() => onConfirm(role)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <TrashIcon className="w-3.5 h-3.5" />
            <span>
              {submitting
                ? t('deleteModal.deleting', 'Deleting...')
                : t('deleteModal.confirmButton', 'Confirm Delete')}
            </span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default RoleDeleteModal;
