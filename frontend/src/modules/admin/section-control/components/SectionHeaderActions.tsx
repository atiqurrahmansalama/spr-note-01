import React from 'react';
import { CheckIcon, RefreshIcon } from '../../../../components/ui/Icons';
import { useSectionTranslation } from '../hooks/useSectionTranslation';
import { ScopeType } from '../types';

export interface SectionHeaderActionsProps {
  activeScope: ScopeType;
  modifiedCount: number;
  saving: boolean;
  resetting: boolean;
  onSaveBatch: () => void;
  onClearOverridesGlobally: () => void;
  onResetOverrides: () => void;
}

export const SectionHeaderActions: React.FC<SectionHeaderActionsProps> = ({
  activeScope,
  modifiedCount,
  saving,
  resetting,
  onSaveBatch,
  onClearOverridesGlobally,
  onResetOverrides,
}) => {
  const { t, formatNumber } = useSectionTranslation();

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* 1. Global Scope: Force Apply Button */}
      {activeScope === 'global' && modifiedCount > 0 && (
        <button
          type="button"
          disabled={saving}
          onClick={onClearOverridesGlobally}
          title={t(
            'actions.forceApplyTitle',
            'Save global defaults and override all role, group, and user customizations immediately.'
          )}
          className="px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold theme-bg-sub border theme-border hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-2xs"
        >
          <RefreshIcon className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} />
          <span>{saving ? t('actions.applying', 'Saving & Overriding All...') : t('actions.forceApply', 'Save & Override All')}</span>
        </button>
      )}

      {/* 2. Subordinate Scopes: Reset Overrides Button */}
      {activeScope !== 'global' && activeScope !== 'audit' && (
        <button
          type="button"
          disabled={resetting}
          onClick={onResetOverrides}
          className="px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold theme-bg-sub border theme-border hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-2xs"
        >
          <RefreshIcon className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
          <span>{resetting ? t('actions.resetting', 'Resetting...') : t('actions.resetOverrides', 'Reset Scope Overrides')}</span>
        </button>
      )}

      {/* 3. Standard Save Batch Button */}
      {activeScope !== 'audit' && (
        <button
          type="button"
          disabled={saving || modifiedCount === 0}
          onClick={onSaveBatch}
          className="theme-bg-accent hover:opacity-90 theme-accent-text font-bold px-3.5 py-1.5 sm:py-2 rounded-xl text-xs shadow-xs transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
        >
          <CheckIcon className={`w-3.5 h-3.5 ${saving ? 'animate-pulse' : ''}`} />
          <span>
            {saving
              ? t('actions.saving', 'Saving...')
              : modifiedCount > 0
              ? `${t('actions.saveChanges', 'Save Changes')} (${formatNumber(modifiedCount)})`
              : t('actions.saveChanges', 'Save Changes')}
          </span>
        </button>
      )}
    </div>
  );
};

export default SectionHeaderActions;
