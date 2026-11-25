import React, { useRef, useState } from 'react';
import {
  CustomButton,
  CustomCheckbox,
  CustomInput,
  CustomSelect,
  DrawerContainer,
  DrawerFooter,
  DrawerSection,
  SegmentedSwitch,
  TemplateTextarea,
  useToast,
} from '@repo/ui';
import {
  BookOpenIcon,
  CheckIcon,
  GiftIcon,
  ImageVaultIcon,
  SparklesIcon,
  UploadIcon,
} from '../../../../components/icons/UniverseIcons';
import type { UniverseMediaAsset } from '../../../../types';
import { STORY_COLOR_TOKENS, STORY_ICON_OPTIONS } from '../../constants/storyStyles';
import { useStoryTranslation } from '../../locales';
import type {
  StoryChapter,
  StoryEntryType,
  StoryMilestone,
  StoryMilestoneFormPayload,
} from '../../types';

export interface StoryMilestoneDrawerFormProps {
  initialData?: StoryMilestone | null;
  defaultEntryType?: StoryEntryType;
  defaultPhotoAssetId?: string | null;
  chapters?: StoryChapter[];
  galleryAssets: UniverseMediaAsset[];
  audioAssets?: UniverseMediaAsset[];
  onSave: (payload: StoryMilestoneFormPayload) => Promise<unknown>;
  onUploadPhoto: (file: File, title?: string) => Promise<UniverseMediaAsset>;
  onUploadAudio?: (file: File, title?: string) => Promise<UniverseMediaAsset>;
  onClose: () => void;
}

export const StoryMilestoneDrawerForm: React.FC<StoryMilestoneDrawerFormProps> = ({
  initialData,
  defaultEntryType = 'timeline',
  defaultPhotoAssetId = null,
  chapters = [],
  galleryAssets,
  audioAssets = [],
  onSave,
  onUploadPhoto,
  onUploadAudio,
  onClose,
}) => {
  const { t } = useStoryTranslation();
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLInputElement | null>(null);

  const [entryType, setEntryType] = useState<StoryEntryType>(
    initialData?.entry_type || defaultEntryType
  );
  const [chapterId, setChapterId] = useState<string>(initialData?.chapter_id || '');
  const [eventDate, setEventDate] = useState<string>(
    initialData?.event_date || new Date().toISOString().split('T')[0]
  );
  const [badge, setBadge] = useState<string>(initialData?.badge || '');
  const [title, setTitle] = useState<string>(initialData?.title || '');
  const [subtitle, setSubtitle] = useState<string>(initialData?.subtitle || '');
  const [location, setLocation] = useState<string>(initialData?.location || '');
  const [description, setDescription] = useState<string>(initialData?.description || '');
  const [iconName, setIconName] = useState<string>(initialData?.icon_name || 'heart');
  const [colorToken, setColorToken] = useState<string>(initialData?.color_token || 'accent');
  const [photoAssetId, setPhotoAssetId] = useState<string>(
    initialData?.photo_asset_id || defaultPhotoAssetId || ''
  );
  const [audioAssetId, setAudioAssetId] = useState<string>(initialData?.audio_asset_id || '');
  const [isFavorite, setIsFavorite] = useState<boolean>(Boolean(initialData?.is_favorite));
  const [isPublished, setIsPublished] = useState<boolean>(
    initialData ? initialData.is_published : true
  );
  const [isLocked, setIsLocked] = useState<boolean>(Boolean(initialData?.is_locked));
  const [surpriseNote, setSurpriseNote] = useState<string>(initialData?.surprise_note || '');
  const [surpriseStars, setSurpriseStars] = useState<string>(
    String(initialData?.surprise_stars ?? 1)
  );
  const [errors, setErrors] = useState<{ title?: string; date?: string }>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);

  const chapterOptions = [
    { value: '', label: t('drawers.noChapter', 'No specific chapter') },
    ...chapters.map((c) => ({ value: c.id, label: `${c.chapter_number}. ${c.title}` })),
  ];

  const photoOptions = [
    { value: '', label: t('drawers.noPhoto', 'No photo attached') },
    ...galleryAssets.map((a) => ({ value: a.id, label: a.title })),
  ];

  const audioOptions = [
    { value: '', label: t('drawers.noAudio', 'No audio attached') },
    ...audioAssets.map((a) => ({ value: a.id, label: a.title })),
  ];

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const asset = await onUploadPhoto(file, title || file.name);
      setPhotoAssetId(asset.id);
      showToast(t('photos.uploadedToast', 'Private photo added to your story!'), 'success');
    } catch (err: any) {
      showToast(err?.message || 'Upload failed.', 'error');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadAudio) return;
    setUploadingAudio(true);
    try {
      const asset = await onUploadAudio(file, title ? `${title} Audio` : file.name);
      setAudioAssetId(asset.id);
      showToast(t('timeline.savedToast', 'Story entry saved!'), 'success');
    } catch (err: any) {
      showToast(err?.message || 'Audio upload failed.', 'error');
    } finally {
      setUploadingAudio(false);
      if (audioRef.current) audioRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: { title?: string; date?: string } = {};
    if (!title.trim()) nextErrors.title = t('drawers.requiredTitle', 'Heading is required.');
    if (!eventDate) nextErrors.date = t('drawers.requiredDate', 'Date is required.');
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSaving(true);
    try {
      await onSave({
        chapter_id: chapterId || null,
        entry_type: entryType,
        event_date: eventDate,
        badge: badge.trim(),
        title: title.trim(),
        subtitle: subtitle.trim(),
        location: location.trim(),
        description: description.trim(),
        icon_name: iconName,
        color_token: colorToken,
        photo_asset_id: photoAssetId || null,
        audio_asset_id: audioAssetId || null,
        is_favorite: isFavorite,
        is_published: isPublished,
        is_locked: isLocked,
        surprise_note: surpriseNote.trim(),
        surprise_stars: Math.max(0, Number.parseInt(surpriseStars, 10) || 0),
      });
      showToast(
        initialData
          ? t('timeline.savedToast', 'Story entry saved!')
          : t('timeline.addedToast', 'New chapter added to your story!'),
        'success'
      );
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Unable to save milestone.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <DrawerContainer padding="none" spacing="normal">
        <DrawerSection title={t('drawers.sectionDetails', 'Chapter Narrative')} icon={BookOpenIcon}>
          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3.5 items-end">
            <div className="space-y-2">
              <span className="block text-xs font-bold uppercase tracking-wider theme-text-secondary">
                {t('drawers.fieldEntryType', 'Entry Type')}
              </span>
              <SegmentedSwitch
                size="sm"
                value={entryType}
                onChange={(val: string) => setEntryType(val as StoryEntryType)}
                options={[
                  { value: 'timeline', label: t('drawers.typeTimeline', 'Timeline Event') },
                  { value: 'first', label: t('drawers.typeFirst', 'Our First') },
                ]}
              />
            </div>

            {chapters.length > 0 && (
              <CustomSelect
                label={t('drawers.fieldChapterLink', 'Assign Story Chapter')}
                value={chapterId}
                onChange={(val: string) => setChapterId(val)}
                options={chapterOptions}
              />
            )}
          </div>

          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3.5">
            <CustomInput
              type="date"
              label={t('drawers.fieldDate', 'Event Date')}
              required
              variant="card"
              value={eventDate}
              error={errors.date}
              onChange={(val: string) => {
                setEventDate(val);
                if (errors.date) setErrors((prev) => ({ ...prev, date: undefined }));
              }}
            />
            <CustomInput
              label={t('drawers.fieldBadge', 'Short Badge')}
              variant="card"
              value={badge}
              onChange={(val: string) => setBadge(val)}
            />
          </div>

          <CustomInput
            label={t('drawers.fieldTitle', 'Chapter Heading')}
            required
            variant="card"
            value={title}
            error={errors.title}
            onChange={(val: string) => {
              setTitle(val);
              if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
            }}
          />

          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3.5">
            <CustomInput
              label={t('drawers.fieldSubtitle', 'Optional Subtitle')}
              variant="card"
              value={subtitle}
              onChange={(val: string) => setSubtitle(val)}
            />
            <CustomInput
              label={t('drawers.fieldLocation', 'Place / Location')}
              variant="card"
              value={location}
              onChange={(val: string) => setLocation(val)}
            />
          </div>

          <TemplateTextarea
            label={t('drawers.fieldDescription', 'Memory Narrative')}
            value={description}
            onChange={(val: string) => setDescription(val)}
            rows={4}
          />
        </DrawerSection>

        <DrawerSection title={t('drawers.sectionVisuals', 'Icon, Tone & Memory Photo')} icon={SparklesIcon}>
          {/* Borderless Icon Grid */}
          <div className="space-y-2">
            <span className="block text-xs font-bold uppercase tracking-wider theme-text-secondary">
              {t('drawers.fieldIcon', 'Chapter Icon')}
            </span>
            <div className="grid grid-cols-5 gap-2">
              {STORY_ICON_OPTIONS.map((opt) => {
                const IconComp = opt.icon;
                const isSelected = opt.key === iconName;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setIconName(opt.key)}
                    title={opt.label}
                    className={`p-2.5 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border-0 ring-0 ${
                      isSelected
                        ? 'bg-[var(--accent-main)]/15 dark:bg-[var(--accent-main)]/25 theme-accent font-bold'
                        : 'theme-bg-app theme-text-secondary hover:theme-bg-elevated/40'
                    }`}
                  >
                    <IconComp className="w-4 h-4" />
                    <span className="text-[10px] truncate max-w-full">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Borderless Semantic Color Swatches */}
          <div className="space-y-2">
            <span className="block text-xs font-bold uppercase tracking-wider theme-text-secondary">
              {t('drawers.fieldColor', 'Accent Tone')}
            </span>
            <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-2">
              {Object.values(STORY_COLOR_TOKENS).map((tone) => {
                const isSelected = tone.id === colorToken;
                return (
                  <button
                    key={tone.id}
                    type="button"
                    onClick={() => setColorToken(tone.id)}
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

          {/* Optional Private Photo */}
          <div className="grid grid-cols-1 @[480px]:grid-cols-[1fr_auto] gap-3 items-end pt-1">
            <CustomSelect
              label={t('drawers.fieldPhoto', 'Attached Private Photo')}
              value={photoAssetId}
              onChange={(val: string) => setPhotoAssetId(val)}
              options={photoOptions}
            />
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
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

          {/* Optional Voice / Audio Clip */}
          {onUploadAudio && (
            <div className="grid grid-cols-1 @[480px]:grid-cols-[1fr_auto] gap-3 items-end">
              <CustomSelect
                label={t('drawers.fieldAudio', 'Attached Voice / Audio Note')}
                value={audioAssetId}
                onChange={(val: string) => setAudioAssetId(val)}
                options={audioOptions}
              />
              <div>
                <input
                  ref={audioRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={handleAudioUpload}
                />
                <CustomButton
                  type="button"
                  variant="soft"
                  size="md"
                  icon={UploadIcon}
                  loading={uploadingAudio}
                  onClick={() => audioRef.current?.click()}
                >
                  {t('drawers.uploadNewAudio', 'Upload Audio')}
                </CustomButton>
              </div>
            </div>
          )}

          <CustomCheckbox
            checked={isFavorite}
            onChange={(checked: boolean) => setIsFavorite(checked)}
            label={t('drawers.favoriteToggle', 'Highlight as Favorite Memory')}
          />
        </DrawerSection>

        <DrawerSection title={t('drawers.sectionVisibility', 'Visibility & Hidden Surprise')} icon={GiftIcon}>
          <div className="space-y-2">
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

          <div className="grid grid-cols-1 @[480px]:grid-cols-[1fr_140px] gap-3.5 items-start">
            <TemplateTextarea
              label={t('drawers.fieldSurpriseNote', 'Optional Hidden Surprise Note')}
              value={surpriseNote}
              onChange={(val: string) => setSurpriseNote(val)}
              rows={2}
            />
            <CustomInput
              type="number"
              label={t('drawers.fieldSurpriseStars', 'Bonus Constellation Stars')}
              variant="card"
              value={surpriseStars}
              onChange={(val: string) => setSurpriseStars(val)}
            />
          </div>
        </DrawerSection>

        <DrawerFooter
          onCancel={onClose}
          cancelLabel={t('drawers.cancel', 'Cancel')}
          saveLabel={t('drawers.saveMilestone', 'Save Event')}
          saveIcon={ImageVaultIcon}
          isSubmitting={saving}
        />
      </DrawerContainer>
    </form>
  );
};

export default StoryMilestoneDrawerForm;
