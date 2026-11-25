import React, { useEffect, useMemo, useState } from 'react';
import { ActionMenu, ConfirmModal, CustomButton, Modal } from '@repo/ui';
import {
  BookOpenIcon,
  CalendarIcon,
  CheckCircleIcon,
  EditIcon,
  GiftIcon,
  HeartIcon,
  LockClosedIcon,
  PlusIcon,
  SparklesIcon,
  StarsIcon,
  TrashIcon,
} from '../../../components/icons/UniverseIcons';
import { computeJourneyBreakdown, resolveStoryColorStyle } from '../constants/storyStyles';
import { useStoryTranslation } from '../locales';
import type { StoryChapter, StoryMilestone, StoryProfile } from '../types';

export interface StoryBeginningTabProps {
  profile: StoryProfile;
  chapters: StoryChapter[];
  milestones: StoryMilestone[];
  completedChapterIds: string[];
  canEdit: boolean;
  onEditProfile: () => void;
  onAddChapter: () => void;
  onEditChapter: (chapter: StoryChapter) => void;
  onDeleteChapter: (id: string) => Promise<void>;
  onCompleteChapter: (id: string) => Promise<{
    completed_chapter_ids: string[];
    stars_awarded: number;
    surprise_title?: string;
    surprise_message?: string;
  }>;
  onOpenMilestoneDetail: (milestone: StoryMilestone) => void;
}

/**
 * OS-01 Our Beginning + OS-10 Live Journey Counter + OS-06 Interactive Story Chapters.
 */
export const StoryBeginningTab: React.FC<StoryBeginningTabProps> = ({
  profile,
  chapters,
  milestones,
  completedChapterIds,
  canEdit,
  onEditProfile,
  onAddChapter,
  onEditChapter,
  onDeleteChapter,
  onCompleteChapter,
  onOpenMilestoneDetail,
}) => {
  const { t, formatDate, formatNumber } = useStoryTranslation();
  const [now, setNow] = useState<Date>(() => new Date());
  const [activeChapter, setActiveChapter] = useState<StoryChapter | null>(null);
  const [completing, setCompleting] = useState(false);
  const [revealedReward, setRevealedReward] = useState<{
    chapterId: string;
    title: string;
    message: string;
    stars: number;
  } | null>(null);
  const [deletingChapter, setDeletingChapter] = useState<StoryChapter | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const journey = useMemo(
    () => computeJourneyBreakdown(profile.relationship_start_date, now),
    [profile.relationship_start_date, now]
  );

  const chapterEvents = useMemo(() => {
    if (!activeChapter) return [];
    return milestones.filter((m) => m.chapter_id === activeChapter.id);
  }, [activeChapter, milestones]);

  const handleCompleteChapterClick = async (chapter: StoryChapter) => {
    setCompleting(true);
    try {
      const res = await onCompleteChapter(chapter.id);
      setRevealedReward({
        chapterId: chapter.id,
        title: res.surprise_title || chapter.surprise_title || t('beginning.surpriseUnlockedTitle', 'Chapter Surprise Revealed'),
        message: res.surprise_message || chapter.surprise_message || '',
        stars: res.stars_awarded || 0,
      });
    } finally {
      setCompleting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingChapter) return;
    setIsDeleting(true);
    try {
      await onDeleteChapter(deletingChapter.id);
      setDeletingChapter(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const isReaderCompleted = activeChapter
    ? completedChapterIds.includes(activeChapter.id) || activeChapter.surprise_revealed
    : false;

  return (
    <div className="@container space-y-6">
      {/* OS-01: Our Beginning Intro Showcase */}
      <div className="rounded-3xl theme-bg-surface border-0 p-5 @[640px]:p-8 shadow-xs">
        <div className="grid grid-cols-1 @[760px]:grid-cols-[1.2fr_1fr] gap-6 items-center">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full theme-bg-accent-soft theme-accent text-[11px] font-bold uppercase tracking-wider">
              <HeartIcon className="w-3.5 h-3.5" />
              <span>{profile.beginning_eyebrow || 'How Everything Started'}</span>
            </div>

            <blockquote className="text-xl @[640px]:text-2xl font-bold theme-text-primary leading-snug tracking-tight">
              &ldquo;{t('beginning.introQuote', 'Every beautiful story has a beginning. This is ours.')}&rdquo;
            </blockquote>

            {profile.beginning_story && (
              <p className="text-sm theme-text-secondary leading-relaxed whitespace-pre-line">
                {profile.beginning_story}
              </p>
            )}

            {canEdit && (
              <div className="pt-1">
                <CustomButton variant="soft" size="sm" icon={EditIcon} onClick={onEditProfile}>
                  {t('hero.editProfileBtn', 'Edit Story Profile')}
                </CustomButton>
              </div>
            )}
          </div>

          <div className="rounded-3xl overflow-hidden theme-bg-app aspect-[4/3] flex items-center justify-center shadow-xs">
            {profile.beginning_url || profile.cover_url ? (
              <img
                src={profile.beginning_url || profile.cover_url || ''}
                alt={profile.hero_title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="p-8 text-center space-y-2">
                <SparklesIcon className="w-10 h-10 theme-accent mx-auto" />
                <p className="text-xs font-semibold theme-text-secondary">
                  {profile.couple_names || profile.hero_title}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* OS-10: Live Our Journey Counter */}
      {journey && (
        <div className="rounded-3xl theme-bg-surface border-0 p-5 @[640px]:p-6 shadow-xs space-y-4">
          <div className="flex flex-col @[520px]:flex-row @[520px]:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold theme-text-primary flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 theme-accent" />
                {t('beginning.counterTitle', 'Our Journey Counter')}
              </h3>
              <p className="text-xs theme-text-secondary mt-0.5">
                {t('beginning.counterSub', 'Counting every shared heartbeat since day one')}
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full theme-bg-accent-soft theme-accent text-xs font-bold font-mono self-start">
              <HeartIcon className="w-3.5 h-3.5" />
              <span>
                {formatNumber(journey.totalDays)} {t('hero.daysTogether', 'Days Together')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 @[520px]:grid-cols-3 @[780px]:grid-cols-6 gap-3">
            {[
              { value: journey.years, label: t('beginning.years', 'Years') },
              { value: journey.months, label: t('beginning.months', 'Months') },
              { value: journey.days, label: t('beginning.days', 'Days') },
              { value: journey.hours, label: t('beginning.hours', 'Hours') },
              { value: journey.minutes, label: t('beginning.minutes', 'Minutes') },
              { value: journey.seconds, label: t('beginning.seconds', 'Seconds') },
            ].map((unit) => (
              <div
                key={unit.label}
                className="rounded-2xl theme-bg-app p-3.5 text-center space-y-1 border-0"
              >
                <div className="text-xl @[640px]:text-2xl font-black theme-accent font-mono tabular-nums">
                  {formatNumber(unit.value).padStart(2, '0')}
                </div>
                <div className="text-[11px] font-semibold uppercase tracking-wider theme-text-secondary">
                  {unit.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* OS-06: Interactive Story Chapters */}
      <div className="rounded-3xl theme-bg-surface border-0 p-5 @[640px]:p-6 shadow-xs space-y-5">
        <div className="flex flex-col @[560px]:flex-row @[560px]:items-center justify-between gap-3">
          <div>
            <h3 className="text-base @[560px]:text-lg font-bold theme-text-primary flex items-center gap-2">
              <BookOpenIcon className="w-5 h-5 theme-accent" />
              {t('beginning.chaptersTitle', 'Interactive Story Chapters')}
            </h3>
            <p className="text-xs theme-text-secondary mt-0.5">
              {t(
                'beginning.chaptersSubtitle',
                'Open each chapter to read memories in context and reveal hidden surprises.'
              )}
            </p>
          </div>
          {canEdit && (
            <CustomButton variant="soft" size="sm" icon={PlusIcon} onClick={onAddChapter}>
              {t('hero.addChapterBtn', 'Add Chapter')}
            </CustomButton>
          )}
        </div>

        {chapters.length === 0 ? (
          <div className="py-12 px-6 rounded-2xl theme-bg-app text-center space-y-3">
            <BookOpenIcon className="w-8 h-8 theme-accent mx-auto" />
            <p className="text-xs font-semibold theme-text-secondary">
              {t('beginning.emptyChapters', 'No story chapters created yet.')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 @[580px]:grid-cols-2 @[920px]:grid-cols-3 gap-4">
            {chapters.map((chapter) => {
              const colorDef = resolveStoryColorStyle(chapter.accent_token);
              const isCompleted =
                completedChapterIds.includes(chapter.id) || Boolean(chapter.surprise_revealed);
              const isSealed = chapter.is_locked && !canEdit;
              const linkedCount = milestones.filter((m) => m.chapter_id === chapter.id).length;

              return (
                <div
                  key={chapter.id}
                  className="rounded-3xl theme-bg-app p-4 flex flex-col justify-between gap-4 border-0 shadow-xs hover:shadow-md transition-all"
                >
                  <div className="space-y-3">
                    {chapter.cover_url && !isSealed && (
                      <div className="h-36 rounded-2xl overflow-hidden theme-bg-surface">
                        <img
                          src={chapter.cover_url}
                          alt={chapter.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                        style={{ backgroundColor: colorDef.softBg, color: colorDef.textColor }}
                      >
                        {t('beginning.chapterLabel', 'Chapter')} {formatNumber(chapter.chapter_number)}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {isCompleted && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold theme-bg-accent-soft theme-accent">
                            <CheckCircleIcon className="w-3 h-3" />
                            {t('beginning.completedBadge', 'Completed')}
                          </span>
                        )}
                        {!chapter.is_published && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold theme-bg-surface theme-text-secondary">
                            {t('beginning.draftBadge', 'Draft')}
                          </span>
                        )}
                        {chapter.is_locked && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold theme-bg-surface theme-accent">
                            <LockClosedIcon className="w-3 h-3" />
                            {t('beginning.lockedBadge', 'Sealed')}
                          </span>
                        )}
                        {canEdit && (
                          <ActionMenu
                            align="right"
                            ariaLabel={t('hero.actionsLabel', 'Story Actions')}
                            items={[
                              {
                                label: t('timeline.editAction', 'Edit in Drawer'),
                                icon: EditIcon,
                                onClick: () => onEditChapter(chapter),
                              },
                              { divider: true },
                              {
                                label: t('timeline.deleteAction', 'Remove Entry'),
                                icon: TrashIcon,
                                variant: 'danger',
                                onClick: () => setDeletingChapter(chapter),
                              },
                            ]}
                          />
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-base font-bold theme-text-primary leading-snug">
                        {chapter.title}
                      </h4>
                      {chapter.subtitle && (
                        <p className="text-xs font-semibold" style={{ color: colorDef.textColor }}>
                          {chapter.subtitle}
                        </p>
                      )}
                      {chapter.summary && (
                        <p className="text-xs theme-text-secondary line-clamp-3 leading-relaxed">
                          {chapter.summary}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold theme-text-secondary font-mono">
                      {formatNumber(linkedCount)} {t('hero.chaptersCount', 'Events')}
                    </span>
                    <CustomButton
                      size="sm"
                      variant="primary"
                      icon={isSealed ? LockClosedIcon : BookOpenIcon}
                      disabled={isSealed}
                      onClick={() => setActiveChapter(chapter)}
                    >
                      {t('beginning.openChapter', 'Read Chapter')}
                    </CustomButton>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Interactive Chapter Reader Modal */}
      <Modal
        isOpen={Boolean(activeChapter)}
        onClose={() => setActiveChapter(null)}
        size="3xl"
        icon={BookOpenIcon}
        title={
          activeChapter
            ? `${t('beginning.chapterLabel', 'Chapter')} ${formatNumber(activeChapter.chapter_number)} — ${activeChapter.title}`
            : ''
        }
        subtitle={activeChapter?.subtitle || undefined}
        footer={
          activeChapter ? (
            <div className="flex flex-wrap items-center justify-between gap-2 w-full">
              <div>
                {!activeChapter.is_locked && (
                  <CustomButton
                    variant={isReaderCompleted ? 'soft' : 'primary'}
                    size="sm"
                    icon={GiftIcon}
                    loading={completing}
                    onClick={() => handleCompleteChapterClick(activeChapter)}
                  >
                    {isReaderCompleted
                      ? t('beginning.surpriseUnlockedTitle', 'Chapter Surprise Revealed')
                      : t('beginning.completeAction', 'Complete Chapter & Reveal Surprise')}
                  </CustomButton>
                )}
              </div>
              <CustomButton variant="ghost" size="sm" onClick={() => setActiveChapter(null)}>
                {t('beginning.closeChapter', 'Close Reader')}
              </CustomButton>
            </div>
          ) : undefined
        }
      >
        {activeChapter && (
          <div className="space-y-5">
            {activeChapter.cover_url && (
              <div className="rounded-2xl overflow-hidden theme-bg-app shadow-xs">
                <img
                  src={activeChapter.cover_url}
                  alt={activeChapter.title}
                  className="w-full max-h-64 object-cover"
                />
              </div>
            )}

            {activeChapter.summary && (
              <div className="rounded-2xl theme-bg-app p-4 sm:p-5">
                <p className="text-sm theme-text-primary leading-relaxed whitespace-pre-line">
                  {activeChapter.summary}
                </p>
              </div>
            )}

            {(isReaderCompleted || revealedReward?.chapterId === activeChapter.id) &&
              (activeChapter.surprise_message || activeChapter.surprise_title) && (
                <div className="rounded-2xl p-4 sm:p-5 bg-[var(--accent-main)]/15 dark:bg-[var(--accent-main)]/25 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold theme-accent">
                      <GiftIcon className="w-4 h-4" />
                      <span>
                        {activeChapter.surprise_title ||
                          t('beginning.surpriseUnlockedTitle', 'Chapter Surprise Revealed')}
                      </span>
                    </div>
                    {activeChapter.surprise_stars > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold theme-accent font-mono">
                        <StarsIcon className="w-3.5 h-3.5" />+{formatNumber(activeChapter.surprise_stars)}
                      </span>
                    )}
                  </div>
                  {activeChapter.surprise_message && (
                    <p className="text-xs sm:text-sm theme-text-primary leading-relaxed whitespace-pre-line">
                      {activeChapter.surprise_message}
                    </p>
                  )}
                </div>
              )}

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
                {t('beginning.chapterEventsTitle', 'Memories Inside This Chapter')}
              </h4>
              {chapterEvents.length === 0 ? (
                <p className="text-xs theme-text-secondary py-4 text-center rounded-2xl theme-bg-app">
                  {t('beginning.noChapterEvents', 'No memories linked to this chapter yet.')}
                </p>
              ) : (
                <div className="space-y-2.5">
                  {chapterEvents.map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => {
                        setActiveChapter(null);
                        onOpenMilestoneDetail(ev);
                      }}
                      className="w-full text-start rounded-2xl theme-bg-app hover:theme-bg-elevated/50 p-3.5 flex items-center justify-between gap-3 cursor-pointer border-0 transition-colors"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="text-xs font-mono theme-accent font-semibold">
                          {formatDate(ev.event_date)}
                        </div>
                        <div className="text-sm font-bold theme-text-primary truncate">
                          {ev.title}
                        </div>
                      </div>
                      <SparklesIcon className="w-4 h-4 theme-accent shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        isOpen={Boolean(deletingChapter)}
        onClose={() => setDeletingChapter(null)}
        onConfirm={handleConfirmDelete}
        confirmLoading={isDeleting}
        title={t('timeline.deleteTitle', 'Remove Story Entry')}
        subtitle={deletingChapter ? deletingChapter.title : undefined}
        message={t(
          'timeline.deleteMessage',
          'This memory will be removed permanently from your story timeline.'
        )}
        confirmText={t('timeline.deleteConfirm', 'Remove Entry')}
        cancelText={t('drawers.cancel', 'Cancel')}
        variant="danger"
        confirmIcon={TrashIcon}
      />
    </div>
  );
};

export default StoryBeginningTab;
