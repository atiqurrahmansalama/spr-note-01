import React, { useState } from 'react';
import { useTenant } from '../../../context/TenantContext';
import { useToast } from '../../../context/ToastContext';
import { useTranslation } from '../../../i18n';
import { DrawerContainer } from '../../../components/layout';
import { ConfirmModal } from '../../../components/ui/Modal';
import {
  BuildingOfficeIcon,
  CheckIcon,
  CheckCircleIcon,
} from '../../../components/ui/Icons';

interface SwitchAcademyDrawerProps {
  onClose: () => void;
}

export const SwitchAcademyDrawer: React.FC<SwitchAcademyDrawerProps> = ({ onClose }) => {
  const { t } = useTranslation('profile');
  const { showToast } = useToast();
  const {
    availableInstitutions,
    activeTenantId,
    switchInstitution,
    isMultiTenantAdmin,
  } = useTenant();

  const [pendingTarget, setPendingTarget] = useState<any | null>(null);

  const handleSelect = (inst: any) => {
    const targetId = String(inst.id);
    if (targetId === String(activeTenantId)) {
      onClose();
      return;
    }
    setPendingTarget(inst);
  };

  const handleSelectGlobal = () => {
    if (activeTenantId === 'ALL') {
      onClose();
      return;
    }
    setPendingTarget({
      id: 'ALL',
      name: t('allInstitutionsScope', 'All Academies (Global Scope)'),
      isGlobal: true,
    });
  };

  const executeSwitch = () => {
    if (!pendingTarget) return;

    const targetId = String(pendingTarget.id);
    const targetName = pendingTarget.name || 'Academic Workspace';

    switchInstitution(targetId);
    showToast(
      t('academySwitchedToast', `Switched academic workspace to ${targetName}`, { name: targetName }),
      'success'
    );
    setPendingTarget(null);
    onClose();
  };

  return (
    <DrawerContainer
      padding="none"
      spacing="normal"
      className="@container select-none"
      footer={
        <div className="w-full pt-4 border-t theme-border pb-10 sm:pb-14">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl theme-bg-elevated hover:theme-bg-sub font-semibold text-xs theme-text-primary transition border-0 cursor-pointer shadow-2xs active:scale-[0.99]"
          >
            {t('close', 'Close')}
          </button>
        </div>
      }
    >
      <div className="space-y-6 pt-2 pb-8 px-1">
        {/* Global Multi-Tenant Scope Option (For Super Admins) */}
        {isMultiTenantAdmin && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 pb-1.5 border-b theme-border text-xs font-bold uppercase tracking-wider theme-text-secondary">
              <BuildingOfficeIcon className="w-3.5 h-3.5 theme-accent" />
              <span>{t('allInstitutionsScope', 'All Academies (Global Scope)')}</span>
            </div>
            <button
              type="button"
              onClick={handleSelectGlobal}
              className={`w-full p-4 rounded-2xl text-left transition flex items-center justify-between border-0 ring-0 cursor-pointer shadow-2xs ${
                activeTenantId === 'ALL'
                  ? 'bg-[var(--accent-main)]/15 dark:bg-[var(--accent-main)]/25'
                  : 'theme-bg-surface hover:theme-bg-elevated/70'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm theme-accent shrink-0 ${
                  activeTenantId === 'ALL' ? 'theme-bg-surface' : 'theme-bg-elevated'
                }`}>
                  <BuildingOfficeIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm theme-text-primary truncate">
                    {t('allInstitutionsScope', 'All Academies (Global Scope)')}
                  </div>
                  <div className="text-xs theme-text-secondary truncate mt-0.5">
                    Cross-institutional aggregate management
                  </div>
                </div>
              </div>
              {activeTenantId === 'ALL' && (
                <div className="w-5 h-5 rounded-full theme-bg-accent theme-accent-text flex items-center justify-center shadow-xs shrink-0 ml-2">
                  <CheckIcon className="w-3 h-3" />
                </div>
              )}
            </button>
          </div>
        )}

        {/* Affiliated Academies Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1.5 border-b theme-border">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider theme-text-secondary">
              <BuildingOfficeIcon className="w-3.5 h-3.5 theme-accent" />
              <span>{t('affiliatedAcademiesLabel', 'Affiliated Academies & Workspaces')}</span>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full theme-bg-surface theme-text-secondary shadow-2xs">
              {availableInstitutions.length}
            </span>
          </div>

          {availableInstitutions.length === 0 ? (
            <div className="py-8 text-center theme-text-secondary text-sm">
              {t('noAcademiesFound', 'No matching institutions found')}
            </div>
          ) : (
            <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
              {availableInstitutions.map((inst: any) => {
                const isActive = String(inst.id) === String(activeTenantId);
                const displayName = inst.name || 'Academic Institution';
                const address = [inst.address, inst.district].filter(Boolean).join(', ') || inst.address || inst.district || '';
                const initial = displayName.charAt(0).toUpperCase();

                return (
                  <button
                    type="button"
                    key={inst.id}
                    onClick={() => handleSelect(inst)}
                    className={`p-4 rounded-2xl text-left transition flex items-start justify-between gap-3 border-0 ring-0 cursor-pointer relative group shadow-2xs ${
                      isActive
                        ? 'bg-[var(--accent-main)]/15 dark:bg-[var(--accent-main)]/25'
                        : 'theme-bg-surface hover:theme-bg-elevated/70'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Logo or Initial Avatar */}
                      <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm theme-text-primary shrink-0 overflow-hidden shadow-2xs ${
                        isActive ? 'theme-bg-surface' : 'theme-bg-elevated'
                      }`}>
                        {inst.logo_url ? (
                          <img
                            src={inst.logo_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          initial
                        )}
                        {inst.is_verified && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full theme-bg-surface flex items-center justify-center shadow-xs">
                            <CheckCircleIcon className="w-3 h-3 theme-accent" />
                          </div>
                        )}
                      </div>

                      {/* Institution Details: ONLY English Name and Address */}
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-sm theme-text-primary truncate group-hover:theme-accent transition-colors">
                          {displayName}
                        </div>
                        {address && (
                          <div className="text-xs theme-text-secondary truncate mt-1">
                            {address}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Active check icon badge (Rule 14) */}
                    {isActive && (
                      <div className="w-5 h-5 rounded-full theme-bg-accent theme-accent-text flex items-center justify-center shadow-xs shrink-0 mt-0.5">
                        <CheckIcon className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Academy Workspace Switch Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(pendingTarget)}
        onClose={() => setPendingTarget(null)}
        onConfirm={executeSwitch}
        title={t('confirmSwitchAcademyTitle', 'Switch Academic Workspace?')}
        confirmText={t('switchWorkspaceAction', 'Switch Workspace')}
        cancelText={t('cancel', 'Cancel')}
        confirmVariant="primary"
        icon={BuildingOfficeIcon}
      >
        {pendingTarget && (
          <div className="space-y-3 pt-1 text-left">
            <p className="text-xs sm:text-sm theme-text-secondary leading-relaxed">
              {pendingTarget.isGlobal
                ? t(
                    'confirmSwitchAllDesc',
                    'Are you sure you want to switch to the global multi-academy view? You will see consolidated records across all affiliated institutions.'
                  )
                : t(
                    'confirmSwitchAcademyDesc',
                    `Are you sure you want to switch your active workspace to ${pendingTarget.name}? Your dashboard, student rosters, and records will immediately reflect this academy.`,
                    { name: pendingTarget.name }
                  )}
            </p>

            {/* Target Workspace Preview Card */}
            <div className="p-3.5 rounded-2xl theme-bg-app border-0 shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl theme-bg-surface flex items-center justify-center font-bold text-sm theme-accent shrink-0 shadow-2xs overflow-hidden">
                {pendingTarget.logo_url ? (
                  <img src={pendingTarget.logo_url} alt="" className="w-full h-full object-cover" />
                ) : pendingTarget.isGlobal ? (
                  <BuildingOfficeIcon className="w-5 h-5" />
                ) : (
                  (pendingTarget.name || 'A').charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm theme-text-primary truncate">
                  {pendingTarget.name}
                </div>
                {!pendingTarget.isGlobal && (pendingTarget.address || pendingTarget.district) && (
                  <div className="text-xs theme-text-secondary truncate mt-0.5">
                    {[pendingTarget.address, pendingTarget.district].filter(Boolean).join(', ')}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </ConfirmModal>
    </DrawerContainer>
  );
};

export default SwitchAcademyDrawer;
