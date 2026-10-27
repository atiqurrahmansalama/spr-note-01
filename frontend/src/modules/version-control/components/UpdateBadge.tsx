import React from 'react';
import { useTranslation } from '../../../i18n';
import { SparklesIcon, RefreshIcon } from '../../../components/ui/Icons';

export interface UpdateBadgeProps {
  currentVersion: string;
  hasUpdate: boolean;
  isChecking?: boolean;
  onClick?: () => void;
  className?: string;
}

export const UpdateBadge: React.FC<UpdateBadgeProps> = ({
  currentVersion,
  hasUpdate,
  isChecking = false,
  onClick,
  className = '',
}) => {
  const { t } = useTranslation('version_control');

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isChecking}
      title={
        hasUpdate
          ? t('update_available', 'Update Available')
          : t('up_to_date', 'System is up to date')
      }
      className={`group relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-medium border theme-border theme-bg-elevated hover:theme-bg-sub transition cursor-pointer select-none ${className}`}
    >
      {isChecking ? (
        <RefreshIcon className="w-3.5 h-3.5 animate-spin theme-text-secondary" />
      ) : hasUpdate ? (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
        </span>
      ) : (
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      )}

      <span className="theme-text-primary text-[11px]">v{currentVersion}</span>

      {hasUpdate && (
        <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-sans font-semibold text-amber-600 dark:text-amber-400">
          <SparklesIcon className="w-3 h-3" />
          <span>{t('update_available', 'Update Available')}</span>
        </span>
      )}
    </button>
  );
};

export default UpdateBadge;
