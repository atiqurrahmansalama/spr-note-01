import React from 'react';
import { ActionMenu, CustomButton, type ActionMenuItem } from '@repo/ui';
import {
  BookOpenIcon,
  CalendarIcon,
  EditIcon,
  HeartIcon,
  ImageVaultIcon,
  LocationIcon,
  MusicNoteIcon,
  PlusIcon,
  SparklesIcon,
} from '../../../components/icons/UniverseIcons';
import { computeDaysTogether } from '../constants/storyStyles';
import { useStoryTranslation } from '../locales';
import type { StoryProfile } from '../types';

export interface StoryHeroCardProps {
  profile: StoryProfile;
  totalMilestones: number;
  favoritesCount: number;
  canEdit: boolean;
  onEditProfile: () => void;
  onManageFacts: () => void;
  onAddMilestone: () => void;
  onAddFirst: () => void;
  onAddChapter?: () => void;
  onAddComparison?: () => void;
  onAddSpecialDate?: () => void;
}

/**
 * Couple Story Hero Card modeled after StudentProfileHero.tsx.
 * Borderless soft-surface header showing cover photo / monogram, dynamic stats,
 * origin metadata, signature quote, and Right Drawer triggers.
 */
export const StoryHeroCard: React.FC<StoryHeroCardProps> = ({
  profile,
  totalMilestones,
  favoritesCount,
  canEdit,
  onEditProfile,
  onManageFacts,
  onAddMilestone,
  onAddFirst,
  onAddChapter,
  onAddComparison,
  onAddSpecialDate,
}) => {
  const { t, formatDate, formatNumber } = useStoryTranslation();
  const daysTogether = computeDaysTogether(profile.relationship_start_date);

  const actionMenuItems: ActionMenuItem[] = canEdit
    ? [
        {
          label: t('hero.editProfileBtn', 'Edit Story Profile'),
          icon: EditIcon,
          onClick: onEditProfile,
        },
        {
          label: t('hero.manageFactsBtn', 'Manage Story Facts'),
          icon: SparklesIcon,
          onClick: onManageFacts,
        },
        { divider: true },
        ...(onAddChapter
          ? [
              {
                label: t('hero.addChapterBtn', 'Add Chapter'),
                icon: BookOpenIcon,
                onClick: onAddChapter,
              },
            ]
          : []),
        {
          label: t('hero.addMilestoneBtn', 'Add Event'),
          icon: PlusIcon,
          onClick: onAddMilestone,
        },
        {
          label: t('hero.addFirstBtn', 'Log Our First'),
          icon: HeartIcon,
          onClick: onAddFirst,
        },
        ...(onAddComparison
          ? [
              {
                label: t('hero.addComparisonBtn', 'Add Then & Now'),
                icon: ImageVaultIcon,
                onClick: onAddComparison,
              },
            ]
          : []),
        ...(onAddSpecialDate
          ? [
              {
                label: t('hero.addSpecialDateBtn', 'Add Special Date'),
                icon: CalendarIcon,
                onClick: onAddSpecialDate,
              },
            ]
          : []),
      ]
    : [];

  return (
    <div className="@container relative rounded-3xl theme-bg-surface border-0 p-5 @[640px]:p-7 shadow-xs transition-colors duration-150 space-y-5">
      <div className="flex flex-col @[680px]:flex-row items-center @[680px]:items-start justify-between gap-5 @[680px]:gap-6">
        {/* Left: Cover Emblem & Core Story Identity */}
        <div className="flex flex-col @[520px]:flex-row items-center @[520px]:items-start gap-4 @[520px]:gap-5 flex-1 min-w-0 text-center @[520px]:text-start">
          <div className="relative w-22 h-22 @[520px]:w-24 @[520px]:h-24 rounded-3xl overflow-hidden shrink-0 theme-bg-app shadow-xs border-0">
            {profile.cover_url ? (
              <img
                src={profile.cover_url}
                alt={profile.hero_title}
                className="w-full h-full object-cover rounded-3xl"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center theme-bg-accent-soft theme-accent">
                <HeartIcon className="w-9 h-9" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center justify-center @[520px]:justify-start gap-2">
              {profile.hero_badge && (
                <span className="text-[11px] font-bold px-3 py-0.5 rounded-full theme-bg-accent-soft theme-accent">
                  {profile.hero_badge}
                </span>
              )}
              {profile.couple_names && (
                <span className="text-xs font-semibold theme-text-secondary">
                  {profile.couple_names}
                </span>
              )}
            </div>

            <h1 className="text-xl @[560px]:text-2xl font-black tracking-tight theme-text-primary">
              {profile.hero_title}
            </h1>

            {profile.hero_subtitle && (
              <p className="text-xs @[560px]:text-sm theme-text-secondary leading-relaxed max-w-2xl">
                {profile.hero_subtitle}
              </p>
            )}

            {/* Inline Origin Pills */}
            <div className="flex flex-wrap items-center justify-center @[520px]:justify-start gap-2 pt-1 text-xs">
              {profile.relationship_start_date && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full theme-bg-app theme-text-secondary">
                  <CalendarIcon className="w-3.5 h-3.5 theme-accent" />
                  <span>
                    {t('hero.sinceLabel', 'Since')} {formatDate(profile.relationship_start_date)}
                  </span>
                </span>
              )}
              {profile.meeting_place && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full theme-bg-app theme-text-secondary">
                  <LocationIcon className="w-3.5 h-3.5 theme-accent" />
                  <span>{profile.meeting_place}</span>
                </span>
              )}
              {profile.our_song_title && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full theme-bg-app theme-text-secondary">
                  <MusicNoteIcon className="w-3.5 h-3.5 theme-accent" />
                  <span>{profile.our_song_title}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Dynamic KPI Pills + Drawer Edit Actions */}
        <div className="flex flex-col items-center @[680px]:items-end gap-3 shrink-0 w-full @[680px]:w-auto">
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {daysTogether !== null && (
              <div className="px-3.5 py-2 rounded-2xl theme-bg-app text-center min-w-[84px]">
                <div className="text-base font-black theme-accent font-mono">
                  {formatNumber(daysTogether)}
                </div>
                <div className="text-[10px] font-semibold theme-text-secondary uppercase tracking-wider">
                  {t('hero.daysTogether', 'Days Together')}
                </div>
              </div>
            )}
            <div className="px-3.5 py-2 rounded-2xl theme-bg-app text-center min-w-[76px]">
              <div className="text-base font-black theme-text-primary font-mono">
                {formatNumber(totalMilestones)}
              </div>
              <div className="text-[10px] font-semibold theme-text-secondary uppercase tracking-wider">
                {t('hero.chaptersCount', 'Chapters')}
              </div>
            </div>
            <div className="px-3.5 py-2 rounded-2xl theme-bg-app text-center min-w-[76px]">
              <div className="text-base font-black theme-accent font-mono">
                {formatNumber(favoritesCount)}
              </div>
              <div className="text-[10px] font-semibold theme-text-secondary uppercase tracking-wider">
                {t('hero.favoritesCount', 'Favorites')}
              </div>
            </div>
          </div>

          {canEdit && (
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <CustomButton
                variant="soft"
                size="sm"
                icon={EditIcon}
                onClick={onEditProfile}
              >
                {t('hero.editProfileBtn', 'Edit Story Profile')}
              </CustomButton>
              <CustomButton
                variant="primary"
                size="sm"
                icon={PlusIcon}
                onClick={onAddMilestone}
              >
                {t('hero.addMilestoneBtn', 'Add Chapter')}
              </CustomButton>
              <ActionMenu
                align="right"
                ariaLabel={t('hero.actionsLabel', 'Story Actions')}
                items={actionMenuItems}
              />
            </div>
          )}
        </div>
      </div>

      {/* Signature Quote Banner */}
      {profile.signature_quote && (
        <div className="px-4 py-3 rounded-2xl theme-bg-app flex items-center gap-3 border-0">
          <SparklesIcon className="w-4 h-4 theme-accent shrink-0" />
          <p className="text-xs @[520px]:text-sm italic theme-text-primary leading-relaxed">
            &ldquo;{profile.signature_quote}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
};

export default StoryHeroCard;
