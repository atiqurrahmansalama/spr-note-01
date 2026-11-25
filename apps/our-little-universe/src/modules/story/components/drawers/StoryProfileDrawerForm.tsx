import React, { useRef, useState } from 'react';
import {
  CustomButton,
  CustomInput,
  CustomSelect,
  DrawerContainer,
  DrawerFooter,
  DrawerSection,
  TemplateTextarea,
  useToast,
} from '@repo/ui';
import {
  HeartIcon,
  ImageVaultIcon,
  MusicNoteIcon,
  UploadIcon,
} from '../../../../components/icons/UniverseIcons';
import type { UniverseMediaAsset } from '../../../../types';
import { useStoryTranslation } from '../../locales';
import type { StoryProfile } from '../../types';

export interface StoryProfileDrawerFormProps {
  profile: StoryProfile;
  galleryAssets: UniverseMediaAsset[];
  onSave: (patch: Partial<StoryProfile>) => Promise<unknown>;
  onUploadPhoto: (file: File, title?: string) => Promise<UniverseMediaAsset>;
  onClose: () => void;
}

export const StoryProfileDrawerForm: React.FC<StoryProfileDrawerFormProps> = ({
  profile,
  galleryAssets,
  onSave,
  onUploadPhoto,
  onClose,
}) => {
  const { t } = useStoryTranslation();
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const introFileRef = useRef<HTMLInputElement | null>(null);

  const [heroTitle, setHeroTitle] = useState(profile.hero_title || '');
  const [heroBadge, setHeroBadge] = useState(profile.hero_badge || '');
  const [heroSubtitle, setHeroSubtitle] = useState(profile.hero_subtitle || '');
  const [beginningEyebrow, setBeginningEyebrow] = useState(profile.beginning_eyebrow || '');
  const [beginningStory, setBeginningStory] = useState(profile.beginning_story || '');
  const [beginningAssetId, setBeginningAssetId] = useState<string>(
    profile.beginning_asset_id || ''
  );
  const [coupleNames, setCoupleNames] = useState(profile.couple_names || '');
  const [startDate, setStartDate] = useState(profile.relationship_start_date || '');
  const [meetingPlace, setMeetingPlace] = useState(profile.meeting_place || '');
  const [ourSongTitle, setOurSongTitle] = useState(profile.our_song_title || '');
  const [signatureQuote, setSignatureQuote] = useState(profile.signature_quote || '');
  const [coverAssetId, setCoverAssetId] = useState<string>(profile.cover_asset_id || '');
  const [saving, setSaving] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState<'cover' | 'intro' | null>(null);

  const photoOptions = [
    { value: '', label: t('drawers.noPhoto', 'No photo attached') },
    ...galleryAssets.map((a) => ({ value: a.id, label: a.title })),
  ];

  const handleUploadPhoto = async (
    slot: 'cover' | 'intro',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSlot(slot);
    try {
      const prefix = slot === 'cover' ? 'Story Cover' : 'Our Beginning';
      const asset = await onUploadPhoto(file, `${prefix} - ${file.name}`);
      if (slot === 'cover') setCoverAssetId(asset.id);
      else setBeginningAssetId(asset.id);
      showToast(t('photos.uploadedToast', 'Private photo added to your story!'), 'success');
    } catch (err: any) {
      showToast(err?.message || 'Upload failed.', 'error');
    } finally {
      setUploadingSlot(null);
      if (fileRef.current) fileRef.current.value = '';
      if (introFileRef.current) introFileRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        hero_title: heroTitle.trim() || 'Our Story Together',
        hero_badge: heroBadge.trim(),
        hero_subtitle: heroSubtitle.trim(),
        beginning_eyebrow: beginningEyebrow.trim(),
        beginning_story: beginningStory.trim(),
        beginning_asset_id: beginningAssetId || null,
        couple_names: coupleNames.trim(),
        relationship_start_date: startDate || null,
        meeting_place: meetingPlace.trim(),
        our_song_title: ourSongTitle.trim(),
        signature_quote: signatureQuote.trim(),
        cover_asset_id: coverAssetId || null,
      });
      showToast(t('timeline.savedToast', 'Story entry saved!'), 'success');
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Failed to save story profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <DrawerContainer padding="none" spacing="normal">
        <DrawerSection title={t('drawers.sectionIdentity', 'Hero & Our Beginning')} icon={HeartIcon}>
          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3.5">
            <CustomInput
              label={t('drawers.fieldHeroTitle', 'Story Hub Title')}
              required
              variant="card"
              value={heroTitle}
              onChange={(val: string) => setHeroTitle(val)}
            />
            <CustomInput
              label={t('drawers.fieldHeroBadge', 'Top Badge')}
              variant="card"
              value={heroBadge}
              onChange={(val: string) => setHeroBadge(val)}
            />
          </div>

          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3.5">
            <CustomInput
              label={t('drawers.fieldHeroSubtitle', 'Story Subtitle')}
              variant="card"
              value={heroSubtitle}
              onChange={(val: string) => setHeroSubtitle(val)}
            />
            <CustomInput
              label={t('drawers.fieldBeginningEyebrow', 'Beginning Eyebrow')}
              variant="card"
              value={beginningEyebrow}
              onChange={(val: string) => setBeginningEyebrow(val)}
            />
          </div>

          <TemplateTextarea
            label={t('drawers.fieldBeginningStory', 'Our Beginning Narrative')}
            value={beginningStory}
            onChange={(val: string) => setBeginningStory(val)}
            rows={4}
          />

          <TemplateTextarea
            label={t('drawers.fieldQuote', 'Signature Quote')}
            value={signatureQuote}
            onChange={(val: string) => setSignatureQuote(val)}
            rows={2}
          />
        </DrawerSection>

        <DrawerSection title={t('drawers.sectionOrigin', 'Origin & Soundtrack')} icon={MusicNoteIcon}>
          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3.5">
            <CustomInput
              label={t('drawers.fieldCoupleNames', 'Couple Display Names')}
              variant="card"
              value={coupleNames}
              onChange={(val: string) => setCoupleNames(val)}
            />
            <CustomInput
              type="date"
              label={t('drawers.fieldStartDate', 'Relationship Start Date')}
              variant="card"
              value={startDate}
              onChange={(val: string) => setStartDate(val)}
            />
          </div>

          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3.5">
            <CustomInput
              label={t('drawers.fieldMeetingPlace', 'Where We Met')}
              variant="card"
              value={meetingPlace}
              onChange={(val: string) => setMeetingPlace(val)}
            />
            <CustomInput
              label={t('drawers.fieldOurSong', 'Our Song Title')}
              variant="card"
              value={ourSongTitle}
              onChange={(val: string) => setOurSongTitle(val)}
            />
          </div>
        </DrawerSection>

        <DrawerSection title={t('drawers.sectionCover', 'Private Cover & Intro Photo')} icon={ImageVaultIcon}>
          <div className="grid grid-cols-1 @[480px]:grid-cols-[1fr_auto] gap-3 items-end">
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
                onChange={(e) => handleUploadPhoto('cover', e)}
              />
              <CustomButton
                type="button"
                variant="soft"
                size="md"
                icon={UploadIcon}
                loading={uploadingSlot === 'cover'}
                onClick={() => fileRef.current?.click()}
              >
                {t('drawers.uploadNewPhoto', 'Upload Photo')}
              </CustomButton>
            </div>
          </div>

          <div className="grid grid-cols-1 @[480px]:grid-cols-[1fr_auto] gap-3 items-end">
            <CustomSelect
              label={t('drawers.fieldBeginningPhoto', 'Intro Memory Photo')}
              value={beginningAssetId}
              onChange={(val: string) => setBeginningAssetId(val)}
              options={photoOptions}
            />
            <div>
              <input
                ref={introFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleUploadPhoto('intro', e)}
              />
              <CustomButton
                type="button"
                variant="soft"
                size="md"
                icon={UploadIcon}
                loading={uploadingSlot === 'intro'}
                onClick={() => introFileRef.current?.click()}
              >
                {t('drawers.uploadNewPhoto', 'Upload Photo')}
              </CustomButton>
            </div>
          </div>
        </DrawerSection>

        <DrawerFooter
          onCancel={onClose}
          cancelLabel={t('drawers.cancel', 'Cancel')}
          saveLabel={t('drawers.saveProfile', 'Save Profile')}
          isSubmitting={saving}
        />
      </DrawerContainer>
    </form>
  );
};

export default StoryProfileDrawerForm;
