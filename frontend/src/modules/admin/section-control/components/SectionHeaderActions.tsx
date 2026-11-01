import React from 'react';
import CustomButton from '../../../../components/ui/CustomButton';
import { CheckIcon, RefreshIcon } from '../../../../components/ui/Icons';
import { useSectionTranslation } from '../hooks/useSectionTranslation';
import { ScopeType } from '../types';

export interface SectionHeaderActionsProps {
  activeScope: ScopeType;
  modifiedCount: number;
  saving: boolean;
  resetting?: boolean;
  onSaveBatch: () => void;
  onClearOverridesGlobally: () => void;
  onResetOverrides?: () => void;
}

export const SectionHeaderActions: React.FC<SectionHeaderActionsProps> = ({
  activeScope,
  modifiedCount,
  saving,
  onSaveBatch,
  onClearOverridesGlobally,
}) => {
  const { t, formatNumber } = useSectionTranslation();

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* 1. Global Scope: Force Apply Button */}
      {activeScope === 'global' && modifiedCount > 0 && (
        <CustomButton
          size="sm"
          variant="sub"
          loading={saving}
          loadingText={t('actions.applying', 'Saving & Overriding All...')}
          icon={RefreshIcon}
          onClick={onClearOverridesGlobally}
          title={t(
            'actions.forceApplyTitle',
            'Save global defaults and override all role, group, and user customizations immediately.'
          )}
        >
          {t('actions.forceApply', 'Save & Override All')}
        </CustomButton>
      )}

      {/* 2. Standard Save Batch Button */}
      {activeScope !== 'audit' && (
        <CustomButton
          size="sm"
          variant="primary"
          loading={saving}
          loadingText={t('actions.saving', 'Saving...')}
          disabled={saving || modifiedCount === 0}
          icon={CheckIcon}
          onClick={onSaveBatch}
        >
          {modifiedCount > 0
            ? `${t('actions.saveChanges', 'Save Changes')} (${formatNumber(modifiedCount)})`
            : t('actions.saveChanges', 'Save Changes')}
        </CustomButton>
      )}
    </div>
  );
};

export default SectionHeaderActions;
