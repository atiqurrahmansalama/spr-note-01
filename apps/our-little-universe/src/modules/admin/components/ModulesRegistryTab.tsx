import React, { useState } from 'react';
import { CustomButton, CustomCheckbox, CustomInput, CustomSelect, useToast } from '@repo/ui';
import type { UnlockRuleType, UniverseModuleItem } from '../../../types';
import { useAdminTranslation } from '../locales';
import { CheckIcon, SettingsIcon } from '../../../components/icons/UniverseIcons';

interface ModulesRegistryTabProps {
  modules: UniverseModuleItem[];
  onUpdateModule: (moduleId: string, payload: Partial<UniverseModuleItem>) => Promise<unknown>;
}

const UNLOCK_RULES: { value: UnlockRuleType; label: string }[] = [
  { value: 'manual', label: 'Manual (Owner Controlled)' },
  { value: 'pin', label: 'Secret PIN' },
  { value: 'date', label: 'Special Date' },
  { value: 'progress', label: 'Progress Milestone' },
  { value: 'code', label: 'Mystery Code' },
];

export const ModulesRegistryTab: React.FC<ModulesRegistryTabProps> = ({
  modules,
  onUpdateModule,
}) => {
  const { t } = useAdminTranslation();
  const { showToast } = useToast();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Partial<UniverseModuleItem>>>({});

  const getValue = <K extends keyof UniverseModuleItem>(
    mod: UniverseModuleItem,
    field: K
  ): UniverseModuleItem[K] => {
    const draft = drafts[mod.id];
    if (draft && field in draft) {
      return draft[field] as UniverseModuleItem[K];
    }
    return mod[field];
  };

  const updateDraft = (id: string, patch: Partial<UniverseModuleItem>) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), ...patch },
    }));
  };

  const handleSave = async (mod: UniverseModuleItem) => {
    const draft = drafts[mod.id] || {};
    setSavingId(mod.id);
    try {
      await onUpdateModule(mod.id, draft);
      showToast(t('modules.updated', 'Module updated.'), 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to update module.', 'error');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="@container rounded-3xl theme-bg-surface p-6 space-y-5 shadow-xs border-0">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <SettingsIcon className="w-4 h-4 theme-accent" />
          <h3 className="text-base font-bold theme-text-primary">
            {t('modules.title', 'Dynamic Module Registry')}
          </h3>
        </div>
        <p className="text-xs theme-text-secondary">
          {t('modules.subtitle', 'Enable, lock, or customize unlock rules for every phase without deploying code.')}
        </p>
      </div>

      <div className="space-y-3">
        {modules.map((mod) => {
          const isEnabled = Boolean(getValue(mod, 'is_enabled'));
          const isLocked = Boolean(getValue(mod, 'is_locked'));
          const badgeText = String(getValue(mod, 'badge_text') || '');
          const ruleType = getValue(mod, 'unlock_rule_type');

          return (
            <div
              key={mod.id}
              className="p-4 rounded-2xl theme-bg-app space-y-3 border-0"
            >
              <div className="flex flex-col @[640px]:flex-row @[640px]:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold theme-text-primary">{mod.title}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full theme-bg-surface theme-text-secondary">
                      {mod.route_path}
                    </span>
                  </div>
                  <p className="text-xs theme-text-secondary mt-0.5">{mod.subtitle}</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <CustomCheckbox
                    size="sm"
                    checked={isEnabled}
                    onChange={(checked: boolean) => updateDraft(mod.id, { is_enabled: checked })}
                    label={t('modules.enabled', 'Enabled')}
                  />
                  <CustomCheckbox
                    size="sm"
                    checked={isLocked}
                    onChange={(checked: boolean) => updateDraft(mod.id, { is_locked: checked })}
                    label={t('modules.locked', 'Locked')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 @[520px]:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                <CustomInput
                  size="sm"
                  variant="card"
                  label={t('modules.badgeLabel', 'Badge')}
                  value={badgeText}
                  onChange={(val: string) => updateDraft(mod.id, { badge_text: val })}
                />
                <CustomSelect
                  size="sm"
                  label={t('modules.ruleLabel', 'Unlock Rule')}
                  value={ruleType}
                  onChange={(val: UnlockRuleType) => updateDraft(mod.id, { unlock_rule_type: val })}
                  options={UNLOCK_RULES}
                />
                <CustomButton
                  size="sm"
                  variant="primary"
                  loading={savingId === mod.id}
                  icon={CheckIcon}
                  onClick={() => handleSave(mod)}
                >
                  {t('modules.saveModule', 'Save')}
                </CustomButton>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
