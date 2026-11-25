import React, { useRef, useState } from 'react';
import {
  CustomButton,
  CustomCheckbox,
  CustomInput,
  CustomSelect,
  DrawerContainer,
  DrawerFooter,
  DrawerSection,
  TemplateTextarea,
  useToast,
} from '@repo/ui';
import {
  ImageVaultIcon,
  SparklesIcon,
  UploadIcon,
} from '../../../../components/icons/UniverseIcons';
import type { UniverseMediaAsset } from '../../../../types';
import { useStoryTranslation } from '../../locales';
import type { StoryComparison, StoryComparisonFormPayload } from '../../types';

export interface StoryComparisonDrawerFormProps {
  initialData?: StoryComparison | null;
  galleryAssets: UniverseMediaAsset[];
  onSave: (payload: StoryComparisonFormPayload) => Promise<unknown>;
  onUploadPhoto: (file: File, title?: string) => Promise<UniverseMediaAsset>;
  onClose: () => void;
}

export const StoryComparisonDrawerForm: React.FC<StoryComparisonDrawerFormProps> = ({
  initialData,
  galleryAssets,
  onSave,
  onUploadPhoto,
  onClose,
}) => {
  const { t } = useStoryTranslation();
  const { showToast } = useToast();
  const thenFileRef = useRef<HTMLInputElement | null>(null);
  const nowFileRef = useRef<HTMLInputElement | null>(null);

  const [title, setTitle] = useState(initialData?.title || '');
  const [caption, setCaption] = useState(initialData?.caption || '');
  const [thenLabel, setThenLabel] = useState(initialData?.then_label || 'Then');
  const [nowLabel, setNowLabel] = useState(initialData?.now_label || 'Now');
  const [thenDate, setThenDate] = useState(initialData?.then_date || '');
  const [nowDate, setNowDate] = useState(initialData?.now_date || '');
  const [thenAssetId, setThenAssetId] = useState(initialData?.then_asset_id || '');
  const [nowAssetId, setNowAssetId] = useState(initialData?.now_asset_id || '');
  const [isPublished, setIsPublished] = useState<boolean>(
    initialData ? initialData.is_published : true
  );
  const [saving, setSaving] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState<'then' | 'now' | null>(null);

  const photoOptions = [
    { value: '', label: t('drawers.noPhoto', 'No photo attached') },
    ...galleryAssets.map((a) => ({ value: a.id, label: a.title })),
  ];

  const handleUpload = async (slot: 'then' | 'now', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSlot(slot);
    try {
      const asset = await onUploadPhoto(file, `${title || 'Comparison'} (${slot}) - ${file.name}`);
      if (slot === 'then') setThenAssetId(asset.id);
      else setNowAssetId(asset.id);
      showToast(t('photos.uploadedToast', 'Private photo added to your story!'), 'success');
    } catch (err: any) {
      showToast(err?.message || 'Upload failed.', 'error');
    } finally {
      setUploadingSlot(null);
      if (thenFileRef.current) thenFileRef.current.value = '';
      if (nowFileRef.current) nowFileRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast(t('drawers.requiredTitle', 'Heading is required.'), 'error');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        caption: caption.trim(),
        then_label: thenLabel.trim() || 'Then',
        now_label: nowLabel.trim() || 'Now',
        then_date: thenDate.trim(),
        now_date: nowDate.trim(),
        then_asset_id: thenAssetId || null,
        now_asset_id: nowAssetId || null,
        is_published: isPublished,
      });
      showToast(t('timeline.savedToast', 'Story entry saved!'), 'success');
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Unable to save comparison.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <DrawerContainer padding="none" spacing="normal">
        <DrawerSection title={t('thenNow.title', 'Then & Now Comparison')} icon={SparklesIcon}>
          <CustomInput
            label={t('drawers.fieldTitle', 'Title / Heading')}
            required
            variant="card"
            value={title}
            onChange={(val: string) => setTitle(val)}
          />
          <TemplateTextarea
            label={t('drawers.fieldNotes', 'Notes')}
            value={caption}
            onChange={(val: string) => setCaption(val)}
            rows={2}
          />
          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3.5">
            <CustomInput
              label={t('drawers.fieldThenLabel', 'Past Label')}
              variant="card"
              value={thenLabel}
              onChange={(val: string) => setThenLabel(val)}
            />
            <CustomInput
              label={t('drawers.fieldNowLabel', 'Present Label')}
              variant="card"
              value={nowLabel}
              onChange={(val: string) => setNowLabel(val)}
            />
          </div>
          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3.5">
            <CustomInput
              label={t('drawers.fieldThenDate', 'Past Date Text')}
              variant="card"
              value={thenDate}
              onChange={(val: string) => setThenDate(val)}
            />
            <CustomInput
              label={t('drawers.fieldNowDate', 'Present Date Text')}
              variant="card"
              value={nowDate}
              onChange={(val: string) => setNowDate(val)}
            />
          </div>
        </DrawerSection>

        <DrawerSection title={t('drawers.sectionCover', 'Private Cover & Intro Photo')} icon={ImageVaultIcon}>
          <div className="grid grid-cols-1 @[480px]:grid-cols-[1fr_auto] gap-3 items-end">
            <CustomSelect
              label={t('drawers.fieldThenPhoto', 'Then (Past) Photo')}
              value={thenAssetId}
              onChange={(val: string) => setThenAssetId(val)}
              options={photoOptions}
            />
            <div>
              <input
                ref={thenFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleUpload('then', e)}
              />
              <CustomButton
                type="button"
                variant="soft"
                size="md"
                icon={UploadIcon}
                loading={uploadingSlot === 'then'}
                onClick={() => thenFileRef.current?.click()}
              >
                {t('drawers.uploadNewPhoto', 'Upload Photo')}
              </CustomButton>
            </div>
          </div>

          <div className="grid grid-cols-1 @[480px]:grid-cols-[1fr_auto] gap-3 items-end">
            <CustomSelect
              label={t('drawers.fieldNowPhoto', 'Now (Present) Photo')}
              value={nowAssetId}
              onChange={(val: string) => setNowAssetId(val)}
              options={photoOptions}
            />
            <div>
              <input
                ref={nowFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleUpload('now', e)}
              />
              <CustomButton
                type="button"
                variant="soft"
                size="md"
                icon={UploadIcon}
                loading={uploadingSlot === 'now'}
                onClick={() => nowFileRef.current?.click()}
              >
                {t('drawers.uploadNewPhoto', 'Upload Photo')}
              </CustomButton>
            </div>
          </div>

          <CustomCheckbox
            checked={isPublished}
            onChange={(checked: boolean) => setIsPublished(checked)}
            label={t('drawers.publishedToggle', 'Published (visible to Recipient)')}
          />
        </DrawerSection>

        <DrawerFooter
          onCancel={onClose}
          cancelLabel={t('drawers.cancel', 'Cancel')}
          saveLabel={t('drawers.saveComparison', 'Save Comparison')}
          saveIcon={ImageVaultIcon}
          isSubmitting={saving}
        />
      </DrawerContainer>
    </form>
  );
};

export default StoryComparisonDrawerForm;
