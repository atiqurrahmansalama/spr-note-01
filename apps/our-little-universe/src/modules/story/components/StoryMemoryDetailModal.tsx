import React from 'react';
import { CustomButton, Modal } from '@repo/ui';
import {
  CalendarIcon,
  EditIcon,
  GiftIcon,
  HeartIcon,
  LocationIcon,
  MusicNoteIcon,
  SparklesIcon,
} from '../../../components/icons/UniverseIcons';
import { resolveStoryColorStyle, resolveStoryIcon } from '../constants/storyStyles';
import { useStoryTranslation } from '../locales';
import type { StoryMilestone } from '../types';

export interface StoryMemoryDetailModalProps {
  milestone: StoryMilestone | null;
  isOpen: boolean;
  canEdit: boolean;
  onClose: () => void;
  onEdit?: (item: StoryMilestone) => void;
  onToggleFavorite?: (item: StoryMilestone) => Promise<unknown>;
  onUnlockSurprise?: (item: StoryMilestone) => Promise<unknown>;
}

/**
 * OS-07: Full Memory Details Modal using @repo/ui Modal & borderless soft-surface design.
 */
export const StoryMemoryDetailModal: React.FC<StoryMemoryDetailModalProps> = ({
  milestone,
  isOpen,
  canEdit,
  onClose,
  onEdit,
  onToggleFavorite,
  onUnlockSurprise,
}) => {
  const { t, formatDate } = useStoryTranslation();

  if (!milestone) return null;

  const IconComp = resolveStoryIcon(milestone.icon_name);
  const colorDef = resolveStoryColorStyle(milestone.color_token);
  const hasHiddenNote =
    Boolean(milestone.surprise_note) || (milestone.is_locked && milestone.surprise_revealed);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      icon={IconComp}
      title={milestone.title}
      subtitle={milestone.subtitle || undefined}
      badge={
        milestone.badge ? (
          <span
            className="px-2.5 py-0.5 rounded-full text-[11px] font-bold"
            style={{ backgroundColor: colorDef.softBg, color: colorDef.textColor }}
          >
            {milestone.badge}
          </span>
        ) : undefined
      }
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2 w-full">
          <div className="flex items-center gap-2">
            {onToggleFavorite && (
              <CustomButton
                variant={milestone.is_favorite ? 'primary' : 'soft'}
                size="sm"
                icon={HeartIcon}
                onClick={() => onToggleFavorite(milestone)}
              >
                {milestone.is_favorite
                  ? t('timeline.unfavoriteAction', 'Unfavorite')
                  : t('timeline.favoriteAction', 'Favorite Memory')}
              </CustomButton>
            )}
            {hasHiddenNote && !milestone.surprise_revealed && onUnlockSurprise && (
              <CustomButton
                variant="soft"
                size="sm"
                icon={GiftIcon}
                onClick={() => onUnlockSurprise(milestone)}
              >
                {t('timeline.unlockSurpriseAction', 'Reveal Hidden Note')}
              </CustomButton>
            )}
          </div>
          <div className="flex items-center gap-2">
            {canEdit && onEdit && (
              <CustomButton
                variant="soft"
                size="sm"
                icon={EditIcon}
                onClick={() => {
                  onClose();
                  onEdit(milestone);
                }}
              >
                {t('timeline.editAction', 'Edit in Drawer')}
              </CustomButton>
            )}
            <CustomButton variant="ghost" size="sm" onClick={onClose}>
              {t('drawers.cancel', 'Cancel')}
            </CustomButton>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3 text-xs theme-text-secondary">
          <span className="inline-flex items-center gap-1.5 font-mono font-semibold">
            <CalendarIcon className="w-3.5 h-3.5 theme-accent" />
            {formatDate(milestone.event_date)}
          </span>
          {milestone.location && (
            <span className="inline-flex items-center gap-1.5">
              <LocationIcon className="w-3.5 h-3.5 theme-accent" />
              {milestone.location}
            </span>
          )}
        </div>

        {milestone.photo_url && (
          <div className="rounded-2xl overflow-hidden theme-bg-app shadow-xs">
            <img
              src={milestone.photo_url}
              alt={milestone.title}
              className="w-full max-h-[380px] object-cover"
            />
          </div>
        )}

        {milestone.description && (
          <div className="rounded-2xl theme-bg-app p-4 sm:p-5">
            <p className="text-sm theme-text-primary leading-relaxed whitespace-pre-line">
              {milestone.description}
            </p>
          </div>
        )}

        {milestone.audio_url && (
          <div className="rounded-2xl theme-bg-app p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold theme-text-primary">
              <MusicNoteIcon className="w-4 h-4 theme-accent" />
              <span>{t('timeline.audioLabel', 'Voice Note / Soundtrack')}</span>
            </div>
            <audio controls src={milestone.audio_url} className="w-full h-9" preload="none" />
          </div>
        )}

        {milestone.surprise_note && (milestone.surprise_revealed || canEdit) && (
          <div className="rounded-2xl p-4 bg-[var(--accent-main)]/15 dark:bg-[var(--accent-main)]/25 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold theme-accent">
              <SparklesIcon className="w-4 h-4" />
              <span>{t('beginning.surpriseUnlockedTitle', 'Chapter Surprise Revealed')}</span>
            </div>
            <p className="text-xs sm:text-sm theme-text-primary leading-relaxed whitespace-pre-line">
              {milestone.surprise_note}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default StoryMemoryDetailModal;
