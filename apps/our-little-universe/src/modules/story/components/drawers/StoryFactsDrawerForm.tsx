import React, { useState } from 'react';
import {
  CustomButton,
  CustomInput,
  DrawerContainer,
  DrawerFooter,
  DrawerSection,
  IconButton,
  useToast,
} from '@repo/ui';
import { PlusIcon, SparklesIcon, TrashIcon } from '../../../../components/icons/UniverseIcons';
import { STORY_ICON_OPTIONS } from '../../constants/storyStyles';
import { useStoryTranslation } from '../../locales';
import type { StoryFactItem, StoryProfile } from '../../types';

export interface StoryFactsDrawerFormProps {
  initialFacts: StoryFactItem[];
  onSave: (patch: Partial<StoryProfile>) => Promise<unknown>;
  onClose: () => void;
}

export const StoryFactsDrawerForm: React.FC<StoryFactsDrawerFormProps> = ({
  initialFacts,
  onSave,
  onClose,
}) => {
  const { t } = useStoryTranslation();
  const { showToast } = useToast();
  const [facts, setFacts] = useState<StoryFactItem[]>(() =>
    initialFacts.map((f) => ({ ...f }))
  );
  const [saving, setSaving] = useState(false);

  const handleAddFact = () => {
    setFacts((prev) => [
      ...prev,
      {
        id: `fact-${Date.now()}`,
        label: '',
        category: 'Story',
        value: '',
        icon_name: 'heart',
      },
    ]);
  };

  const handleChangeFact = (id: string, patch: Partial<StoryFactItem>) => {
    setFacts((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const handleRemoveFact = (id: string) => {
    setFacts((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ profile_facts: facts });
      showToast(t('timeline.savedToast', 'Story entry saved!'), 'success');
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Unable to save story facts.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <DrawerContainer padding="none" spacing="normal">
        <DrawerSection
          title={t('dossier.factsTitle', 'Shared Rituals & Story Facts')}
          icon={SparklesIcon}
          headerRight={
            <CustomButton
              type="button"
              size="xs"
              variant="soft"
              icon={PlusIcon}
              onClick={handleAddFact}
            >
              {t('drawers.addFactBtn', 'Add New Fact')}
            </CustomButton>
          }
        >
          <div className="space-y-4">
            {facts.map((fact) => (
              <div
                key={fact.id}
                className="p-4 rounded-2xl theme-bg-app space-y-3 border-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {STORY_ICON_OPTIONS.slice(0, 6).map((opt) => {
                      const IconComp = opt.icon;
                      const active = fact.icon_name === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => handleChangeFact(fact.id, { icon_name: opt.key })}
                          title={opt.label}
                          className={`p-1.5 rounded-xl cursor-pointer border-0 transition-colors ${
                            active
                              ? 'theme-bg-accent-soft theme-accent'
                              : 'theme-bg-surface theme-text-secondary hover:theme-text-primary'
                          }`}
                        >
                          <IconComp className="w-3.5 h-3.5" />
                        </button>
                      );
                    })}
                  </div>

                  <IconButton
                    icon={TrashIcon}
                    size="xs"
                    variant="danger"
                    onClick={() => handleRemoveFact(fact.id)}
                    title={t('timeline.deleteAction', 'Remove Entry')}
                    aria-label={t('timeline.deleteAction', 'Remove Entry')}
                  />
                </div>

                <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
                  <CustomInput
                    size="sm"
                    variant="card"
                    label={t('drawers.factLabel', 'Fact Title')}
                    value={fact.label}
                    onChange={(val: string) => handleChangeFact(fact.id, { label: val })}
                  />
                  <CustomInput
                    size="sm"
                    variant="card"
                    label={t('drawers.factCategory', 'Category')}
                    value={fact.category}
                    onChange={(val: string) => handleChangeFact(fact.id, { category: val })}
                  />
                </div>

                <CustomInput
                  size="sm"
                  variant="card"
                  label={t('drawers.factValue', 'Details')}
                  value={fact.value}
                  onChange={(val: string) => handleChangeFact(fact.id, { value: val })}
                />
              </div>
            ))}
          </div>
        </DrawerSection>

        <DrawerFooter
          onCancel={onClose}
          cancelLabel={t('drawers.cancel', 'Cancel')}
          saveLabel={t('drawers.saveFacts', 'Save Story Facts')}
          isSubmitting={saving}
        />
      </DrawerContainer>
    </form>
  );
};

export default StoryFactsDrawerForm;
