import React, { useState } from 'react';
import { useUserTranslation } from '../hooks/useUserTranslation';
import {
  CheckCircleIcon,
  TrashIcon,
  UsersIcon,
  DownloadIcon,
  CloseIcon,
} from '../../../../components/ui/Icons';
import { UserRole } from '../types';

export interface UserBulkActionBarProps {
  selectedCount: number;
  roles: UserRole[];
  onClearSelection: () => void;
  onBulkActivate: () => void;
  onBulkDeactivate: () => void;
  onBulkAssignRole: (roleCode: string) => void;
  onExportSelected: () => void;
  isSubmitting?: boolean;
}

export const UserBulkActionBar: React.FC<UserBulkActionBarProps> = ({
  selectedCount,
  roles,
  onClearSelection,
  onBulkActivate,
  onBulkDeactivate,
  onBulkAssignRole,
  onExportSelected,
  isSubmitting = false,
}) => {
  const { t, formatNumber } = useUserTranslation();
  const [selectedRoleCode, setSelectedRoleCode] = useState<string>('');

  if (selectedCount === 0) return null;

  const countStr = formatNumber(selectedCount);
  const countLabel =
    selectedCount === 1
      ? t('bulkActions.selectedCount', `${countStr} user selected`, { count: countStr })
      : t('bulkActions.selectedCountPlural', `${countStr} users selected`, { count: countStr });

  return (
    <div className="p-3 sm:p-3.5 rounded-2xl theme-bg-accent-soft/30 border theme-border flex flex-wrap items-center justify-between gap-3 animate-fade-in text-left shadow-xs">
      {/* Left: Selected Count & Deselect All */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold theme-text-primary flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full theme-bg-accent" />
          {countLabel}
        </span>
        <button
          type="button"
          onClick={onClearSelection}
          disabled={isSubmitting}
          className="text-xs font-semibold theme-text-secondary hover:theme-text-primary px-2.5 py-1 rounded-lg theme-bg-sub border theme-border transition cursor-pointer flex items-center gap-1"
        >
          <CloseIcon className="w-3 h-3" />
          <span>{t('bulkActions.deselectAll', 'Deselect All')}</span>
        </button>
      </div>

      {/* Right: Bulk Action Triggers */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Bulk Activate */}
        <button
          type="button"
          onClick={onBulkActivate}
          disabled={isSubmitting}
          className="px-3 py-1.5 rounded-xl text-xs font-bold theme-bg-sub hover:theme-bg-elevated theme-text-primary border theme-border transition cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
        >
          <CheckCircleIcon className="w-3.5 h-3.5 theme-accent" />
          <span>{t('bulkActions.bulkActivate', 'Activate Selected')}</span>
        </button>

        {/* Bulk Deactivate */}
        <button
          type="button"
          onClick={onBulkDeactivate}
          disabled={isSubmitting}
          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
        >
          <TrashIcon className="w-3.5 h-3.5" />
          <span>{t('bulkActions.bulkDeactivate', 'Deactivate Selected')}</span>
        </button>

        {/* Bulk Assign Role Select */}
        <div className="flex items-center gap-1.5">
          <select
            value={selectedRoleCode}
            onChange={(e) => {
              const code = e.target.value;
              setSelectedRoleCode(code);
              if (code) {
                onBulkAssignRole(code);
                setSelectedRoleCode('');
              }
            }}
            disabled={isSubmitting}
            aria-label={t('bulkActions.bulkChangeRole', 'Assign Role')}
            className="text-xs px-2.5 py-1.5 rounded-xl theme-bg-sub border theme-border theme-text-primary font-medium focus:outline-none focus:ring-1 focus:ring-[var(--accent-main)] cursor-pointer"
          >
            <option value="">{t('bulkActions.bulkChangeRole', 'Assign Role...')}</option>
            {roles.map((r) => (
              <option key={r.code} value={r.code}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        {/* Export Selected */}
        <button
          type="button"
          onClick={onExportSelected}
          disabled={isSubmitting}
          className="px-3 py-1.5 rounded-xl text-xs font-bold theme-bg-sub hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary border theme-border transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
        >
          <DownloadIcon className="w-3.5 h-3.5" />
          <span>{t('bulkActions.exportSelected', 'Export Selected')}</span>
        </button>
      </div>
    </div>
  );
};

export default UserBulkActionBar;
