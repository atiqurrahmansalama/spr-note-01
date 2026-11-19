import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoleTranslation } from '../hooks/useRoleTranslation';
import {
  ShieldCheckIcon,
  UsersIcon,
  EditIcon,
  CopyIcon,
  ExternalLinkIcon,
} from '../../../../components/ui/Icons';
import { DrawerContainer } from '../../../../components/layout';
import { RoleRecord } from '../types';

export interface RoleDetailDrawerProps {
  role: RoleRecord;
  onEdit?: (role: RoleRecord) => void;
  onClone?: (role: RoleRecord) => void;
  onClose?: () => void;
}

export const RoleDetailDrawer: React.FC<RoleDetailDrawerProps> = ({
  role,
  onEdit,
  onClone,
  onClose,
}) => {
  const navigate = useNavigate();
  const { t, formatNumber } = useRoleTranslation();

  const isProtected = role.code === 'SUPER_ADMIN';

  const handleOpenFeatureControl = () => {
    onClose?.();
    navigate(`/section-control?tab=role&role=${encodeURIComponent(role.code || '')}`);
  };

  return (
    <div className="flex flex-col h-full">
      <DrawerContainer padding="none" spacing="normal">
        <div className="space-y-6 pt-2 text-left rtl:text-right">
          {/* Hero Role Card */}
          <div className="p-4 rounded-2xl theme-bg-app border-0 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold theme-text-primary truncate">
                    {role.name}
                  </h3>
                  {role.is_google_default && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-sky-500/10 text-sky-500 dark:text-sky-400">
                      {t('googleDefault', 'Google Default')}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs theme-text-secondary theme-bg-surface px-2 py-0.5 rounded-md">
                    {role.code}
                  </span>
                </div>
              </div>

              <div>
                {isProtected ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{t('protected', 'Protected')}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center text-[11px] font-mono px-2.5 py-1 rounded-lg theme-bg-surface theme-text-secondary">
                    {t('configurable', 'Configurable')}
                  </span>
                )}
              </div>
            </div>

            {role.description ? (
              <p className="text-xs theme-text-secondary leading-relaxed pt-1">
                {role.description}
              </p>
            ) : null}
          </div>

          {/* Assigned Users Metric Card */}
          <div className="p-3.5 rounded-2xl theme-bg-app border-0 space-y-1">
            <div className="flex items-center gap-1.5 text-xs theme-text-secondary">
              <UsersIcon className="w-3.5 h-3.5" />
              <span>{t('assignedUsers', 'Assigned Users')}</span>
            </div>
            <div className="text-lg font-mono font-bold theme-text-primary">
              {formatNumber(role.user_count || 0)}
            </div>
          </div>

          {/* Single Source of Truth: Feature & Module Control Link */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-1">
              <ShieldCheckIcon className="w-4 h-4 theme-accent" />
              <h4 className="text-xs font-bold uppercase tracking-wider font-mono theme-text-secondary">
                {t('drawers.featureControlSection', 'Feature & Module Control')}
              </h4>
            </div>

            <div className="p-4 rounded-2xl theme-bg-app border-0 space-y-3">
              <p className="text-xs theme-text-secondary leading-relaxed">
                {t(
                  'featureControlNotice',
                  'All module, page, and dashboard widget permissions for this role are governed centrally inside App Management -> Feature & Module Control.'
                )}
              </p>

              <button
                type="button"
                onClick={handleOpenFeatureControl}
                className="w-full px-4 py-2.5 rounded-xl text-xs font-semibold theme-bg-accent theme-accent-text hover:opacity-90 shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 border-0"
              >
                <ShieldCheckIcon className="w-4 h-4" />
                <span>{t('manageInFeatureControl', 'Manage Access in Feature Control')}</span>
                <ExternalLinkIcon className="w-3.5 h-3.5 opacity-80" />
              </button>
            </div>
          </div>
        </div>
      </DrawerContainer>

      {/* Drawer Action Bar */}
      <div className="p-4 border-0 flex items-center justify-between gap-3 theme-bg-surface">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl text-xs font-medium theme-text-secondary hover:theme-text-primary theme-bg-app hover:theme-bg-elevated border-0 transition-colors cursor-pointer"
        >
          Close
        </button>

        <div className="flex items-center gap-2">
          {onClone && (
            <button
              type="button"
              onClick={() => onClone(role)}
              className="px-4 py-2 rounded-xl text-xs font-semibold theme-text-primary theme-bg-app hover:theme-bg-elevated border-0 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <CopyIcon className="w-3.5 h-3.5" />
              <span>{t('cloneRole', 'Clone')}</span>
            </button>
          )}

          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(role)}
              className="px-4 py-2 rounded-xl text-xs font-semibold theme-bg-accent theme-accent-text hover:opacity-90 shadow-sm transition-all cursor-pointer flex items-center gap-1.5 border-0"
            >
              <EditIcon className="w-3.5 h-3.5" />
              <span>{t('editRole', 'Edit')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoleDetailDrawer;
