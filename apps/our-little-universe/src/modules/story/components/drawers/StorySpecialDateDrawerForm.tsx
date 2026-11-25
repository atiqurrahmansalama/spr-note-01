import React, { useState } from 'react';
import {
  CustomCheckbox,
  CustomInput,
  CustomSelect,
  DrawerContainer,
  DrawerFooter,
  DrawerSection,
  TemplateTextarea,
  useToast,
} from '@repo/ui';
import { CalendarIcon, SparklesIcon } from '../../../../components/icons/UniverseIcons';
import { useStoryTranslation } from '../../locales';
import type {
  SpecialDateCategory,
  StorySpecialDate,
  StorySpecialDateFormPayload,
} from '../../types';

export interface StorySpecialDateDrawerFormProps {
  initialData?: StorySpecialDate | null;
  onSave: (payload: StorySpecialDateFormPayload) => Promise<unknown>;
  onClose: () => void;
}

export const StorySpecialDateDrawerForm: React.FC<StorySpecialDateDrawerFormProps> = ({
  initialData,
  onSave,
  onClose,
}) => {
  const { t } = useStoryTranslation();
  const { showToast } = useToast();

  const [title, setTitle] = useState(initialData?.title || '');
  const [eventDate, setEventDate] = useState(
    initialData?.event_date || new Date().toISOString().split('T')[0]
  );
  const [category, setCategory] = useState<SpecialDateCategory>(
    initialData?.category || 'anniversary'
  );
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [repeatsYearly, setRepeatsYearly] = useState<boolean>(
    initialData ? initialData.repeats_yearly : true
  );
  const [isPublished, setIsPublished] = useState<boolean>(
    initialData ? initialData.is_published : true
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !eventDate) {
      showToast(t('drawers.requiredTitle', 'Heading is required.'), 'error');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        event_date: eventDate,
        category,
        notes: notes.trim(),
        repeats_yearly: repeatsYearly,
        is_published: isPublished,
      });
      showToast(t('timeline.savedToast', 'Story entry saved!'), 'success');
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Unable to save special date.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <DrawerContainer padding="none" spacing="normal">
        <DrawerSection title={t('dates.title', 'Special Dates & Milestones')} icon={CalendarIcon}>
          <CustomInput
            label={t('drawers.fieldTitle', 'Title / Heading')}
            required
            variant="card"
            value={title}
            onChange={(val: string) => setTitle(val)}
          />

          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3.5">
            <CustomInput
              type="date"
              label={t('drawers.fieldDate', 'Event Date')}
              required
              variant="card"
              value={eventDate}
              onChange={(val: string) => setEventDate(val)}
            />
            <CustomSelect
              label={t('drawers.fieldCategory', 'Category')}
              value={category}
              onChange={(val: string) => setCategory(val as SpecialDateCategory)}
              options={[
                { value: 'anniversary', label: 'Anniversary' },
                { value: 'first', label: 'Our First' },
                { value: 'celebration', label: 'Celebration' },
                { value: 'milestone', label: 'Milestone' },
              ]}
            />
          </div>

          <TemplateTextarea
            label={t('drawers.fieldNotes', 'Notes')}
            value={notes}
            onChange={(val: string) => setNotes(val)}
            rows={3}
          />
        </DrawerSection>

        <DrawerSection title={t('drawers.sectionVisibility', 'Visibility & Hidden Surprise')} icon={SparklesIcon}>
          <CustomCheckbox
            checked={repeatsYearly}
            onChange={(checked: boolean) => setRepeatsYearly(checked)}
            label={t('drawers.repeatsToggle', 'Repeats Annually')}
          />
          <CustomCheckbox
            checked={isPublished}
            onChange={(checked: boolean) => setIsPublished(checked)}
            label={t('drawers.publishedToggle', 'Published (visible to Recipient)')}
          />
        </DrawerSection>

        <DrawerFooter
          onCancel={onClose}
          cancelLabel={t('drawers.cancel', 'Cancel')}
          saveLabel={t('drawers.saveDate', 'Save Special Date')}
          saveIcon={CalendarIcon}
          isSubmitting={saving}
        />
      </DrawerContainer>
    </form>
  );
};

export default StorySpecialDateDrawerForm;
