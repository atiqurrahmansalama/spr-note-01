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
  BookOpenIcon,
  CheckIcon,
  GiftIcon,
  SparklesIcon,
  UploadIcon,
} from '../../../../components/icons/UniverseIcons';
import type { UniverseMediaAsset } from '../../../../types';
import { STORY_COLOR_TOKENS } from '../../constants/storyStyles';
import { useStoryTranslation } from '../../locales';
import type { StoryChapter, StoryChapterFormPayload } from '../../types';

export interface StoryChapterDrawerFormProps {
  initialData?: StoryChapter | null;
  defaultChapterNumber?: number;
  galleryAssets: UniverseMediaAsset[];
  onSave: (payload: StoryChapterFormPayload) => Promise<unknown>;
  onUploadPhoto: (file: File, title?: string) => Promise<UniverseMediaAsset>;
  onClose: () => void;
}

export const StoryChapterDrawerForm: React.FC<StoryChapterDrawerFormProps> = ({
  initialData,
  defaultChapterNumber = 1,
  galleryAssets,
  onSave,
  onUploadPhoto,
  onClose,
}) => {
  const { t } = useStoryTranslation();
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [chapterNumber, setChapterNumber] = useState<string>(
    String(initialData?.chapter_number ?? defaultChapterNumber)
  );
  const [title, setTitle] = useState(initialData?.title || '');
  const [subtitle, setSubtitle] = useState(initialData?.subtitle || '');
  const [summary, setSummary] = useState(initialData?.summary || '');
  const [accentToken, setAccentToken] = useState(initialData?.accent_token || 'accent');
  const [coverAssetId, setCoverAssetId] = useState(initialData?.cover_asset_id || '');
  const [isPublished, setIsPublished] = useState<boolean>(
    initialData ? initialData.is_published : true
  );
  const [isLocked, setIsLocked] = useState<boolean>(Boolean(initialData?.is_locked));
  const [surpriseTitle, setSurpriseTitle] = useState(initialData?.surprise_title || '');
  const [surpriseMessage, setSurpriseMessage] = useState(initialData?.surprise_message || '');
  const [surpriseStars, setSurpriseStars] = useState<string>(
    String(initialData?.surprise_stars ?? 3)
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const photoOptions = [
    { value: '', label: t('drawers.noPhoto', 'No photo attached') },
    ...galleryAssets.map((a) => ({ value: a.id, label: a.title })),
  ];

  const handleUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const asset = await onUploadPhoto(file, title || `Chapter Cover - ${file.name}`);
      setCoverAssetId(asset.id);
      showToast(t('photos.uploadedToast', 'Private photo added to your story!'), 'success');
    } catch (err: any) {
      showToast(err?.message || 'Upload failed.', 'error');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
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
        chapter_number: Math.max(1, Number.parseInt(chapterNumber, 10) || 1),
        title: title.trim(),
        subtitle: subtitle.trim(),
        summary: summary.trim(),
        accent_token: accentToken,
        cover_asset_id: coverAssetId || null,
        is_published: isPublished,
        is_locked: isLocked,
        surprise_title: surpriseTitle.trim(),
        surprise_message: surpriseMessage.trim(),
        surprise_stars: Math.max(0, Number.parseInt(surpriseStars, 10) || 0),
      });
      showToast(t('timeline.savedToast', 'Story entry saved!'), 'success');
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Unable to save chapter.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <DrawerContainer padding="none" spacing="normal">
        <DrawerSection title={t('drawers.sectionDetails', 'Narrative & Chapter Link')} icon={BookOpenIcon}>
          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3.5">
            <CustomInput
              type="number"
              label={t('drawers.fieldChapterNumber', 'Chapter Number')}
              variant="card"
              value={chapterNumber}
              onChange={(val: string) => setChapterNumber(val)}
            />
            <CustomInput
              label={t('drawers.fieldSubtitle', 'Optional Subtitle')}
              variant="card"
              value={subtitle}
              onChange={(val: string) => setSubtitle(val)}
            />
          </div>

          <CustomInput
            label={t('drawers.fieldTitle', 'Title / Heading')}
            required
            variant="card"
            value={title}
            onChange={(val: string) => setTitle(val)}
          />

          <TemplateTextarea
            label={t('drawers.fieldSummary', 'Chapter Summary')}
            value={summary}
            onChange={(val: string) => setSummary(val)}
            rows={4}
          />
        </DrawerSection>

        <DrawerSection title={t('drawers.sectionVisuals', 'Icon, Tone, Photo & Audio')} icon={SparklesIcon}>
          <div className="space-y-2">
            <span className="block text-xs font-bold uppercase tracking-wider theme-text-secondary">
              {t('drawers.fieldColor', 'Accent Tone')}
            </span>
            <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-2">
              {Object.values(STORY_COLOR_TOKENS).map((tone) => {
                const isSelected = tone.id === accentToken;
                return (
                  <button
                    key={tone.id}
                    type="button"
                    onClick={() => setAccentToken(tone.id)}
                    className={`p-2.5 rounded-2xl flex items-center justify-between gap-2 cursor-pointer border-0 ring-0 transition-all ${
                      isSelected
                        ? 'bg-[var(--accent-main)]/15 dark:bg-[var(--accent-main)]/25'
                        : 'theme-bg-app hover:theme-bg-elevated/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-5 h-5 rounded-full shrink-0 border-0 shadow-xs"
                        style={{ backgroundColor: tone.solidBg }}
                      />
                      <span className="text-xs font-semibold theme-text-primary">{tone.label}</span>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full theme-bg-accent theme-accent-text flex items-center justify-center shadow-xs shrink-0">
                        <CheckIcon className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 @[480px]:grid-cols-[1fr_auto] gap-3 items-end pt-1">
            <CustomSelect
              label={t('drawers.fieldPhoto', 'Attached Private Photo')}
              value={coverAssetId}
              onChange={(val: string) => setCoverAssetId(val)}
              options={photoOptions}
            />
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUploadCover}
              />
              <CustomButton
                type="button"
                variant="soft"
                size="md"
                icon={UploadIcon}
                loading={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {t('drawers.uploadNewPhoto', 'Upload Photo')}
              </CustomButton>
            </div>
          </div>
        </DrawerSection>

        <DrawerSection title={t('drawers.sectionVisibility', 'Visibility & Hidden Surprise')} icon={GiftIcon}>
          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3.5">
            <CustomInput
              label={t('drawers.fieldSurpriseTitle', 'Chapter Completion Surprise Title')}
              variant="card"
              value={surpriseTitle}
              onChange={(val: string) => setSurpriseTitle(val)}
            />
            <CustomInput
              type="number"
              label={t('drawers.fieldSurpriseStars', 'Bonus Constellation Stars')}
              variant="card"
              value={surpriseStars}
              onChange={(val: string) => setSurpriseStars(val)}
            />
          </div>

          <TemplateTextarea
            label={t('drawers.fieldSurpriseMessage', 'Chapter Completion Surprise Message')}
            value={surpriseMessage}
            onChange={(val: string) => setSurpriseMessage(val)}
            rows={2}
          />

          <div className="space-y-2 pt-1">
            <CustomCheckbox
              checked={isPublished}
              onChange={(checked: boolean) => setIsPublished(checked)}
              label={t('drawers.publishedToggle', 'Published (visible to Recipient)')}
            />
            <CustomCheckbox
              checked={isLocked}
              onChange={(checked: boolean) => setIsLocked(checked)}
              label={t('drawers.lockedToggle', 'Locked / Sealed (requires Owner unlock)')}
            />
          </div>
        </DrawerSection>

        <DrawerFooter
          onCancel={onClose}
          cancelLabel={t('drawers.cancel', 'Cancel')}
          saveLabel={t('drawers.saveChapter', 'Save Chapter')}
          saveIcon={BookOpenIcon}
          isSubmitting={saving}
        />
      </DrawerContainer>
    </form>
  );
};

export default StoryChapterDrawerForm;
