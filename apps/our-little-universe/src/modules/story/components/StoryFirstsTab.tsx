import React, { useState } from 'react';
import { ActionMenu, ConfirmModal, CustomButton } from '@repo/ui';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CalendarIcon,
  EditIcon,
  GiftIcon,
  HeartIcon,
  LocationIcon,
  LockClosedIcon,
  MusicNoteIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
} from '../../../components/icons/UniverseIcons';
import { resolveStoryColorStyle, resolveStoryIcon } from '../constants/storyStyles';
import { useStoryTranslation } from '../locales';
import type { StoryMilestone } from '../types';

export interface StoryFirstsTabProps {
  items: StoryMilestone[];
  canEdit: boolean;
  onAdd: () => void;
  onEdit: (item: StoryMilestone) => void;
  onToggleFavorite: (item: StoryMilestone) => Promise<unknown>;
  onOpenDetail: (item: StoryMilestone) => void;
  onUnlockSurprise?: (item: StoryMilestone) => Promise<unknown>;
  onReorder?: (item: StoryMilestone, direction: 'up' | 'down') => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
}

/**
 * OS-04: Our Firsts arched scrapbook visual cards grid.
 */
export const StoryFirstsTab: React.FC<StoryFirstsTabProps> = ({
  items,
  canEdit,
  onAdd,
  onEdit,
  onToggleFavorite,
  onOpenDetail,
  onUnlockSurprise,
  onReorder,
  onDelete,
}) => {
  const { t, formatDate } = useStoryTranslation();
  const [deletingItem, setDeletingItem] = useState<StoryMilestone | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    try {
      await onDelete(deletingItem.id);
      setDeletingItem(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="@container space-y-5">
      <div className="rounded-3xl theme-bg-surface border-0 p-5 @[640px]:p-6 shadow-xs space-y-5">
        <div className="flex flex-col @[560px]:flex-row @[560px]:items-center justify-between gap-3">
          <div>
            <h3 className="text-base @[560px]:text-lg font-bold theme-text-primary flex items-center gap-2">
              <SparklesIcon className="w-5 h-5 theme-accent" />
              {t('timeline.firstsTitle', 'Our Firsts Scrapbook')}
            </h3>
            <p className="text-xs theme-text-secondary mt-0.5">
              {t(
                'timeline.firstsSubtitle',
                'First conversation, first meeting, first gift, first journey, and unforgettable traditions.'
              )}
            </p>
          </div>
          {canEdit && (
            <CustomButton variant="soft" size="sm" icon={PlusIcon} onClick={onAdd}>
              {t('timeline.addFirst', 'Add First Moment')}
            </CustomButton>
          )}
        </div>

        {items.length === 0 ? (
          <div className="py-14 px-6 rounded-2xl theme-bg-app text-center space-y-3">
            <div className="w-12 h-12 rounded-full theme-bg-accent-soft theme-accent flex items-center justify-center mx-auto">
              <SparklesIcon className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold theme-text-primary">
                {t('timeline.emptyFirstsTitle', 'No First Moments Yet')}
              </h4>
              <p className="text-xs theme-text-secondary max-w-md mx-auto">
                {t(
                  'timeline.emptyFirstsSubtitle',
                  'Capture your very first coffee date, song, trip, or message.'
                )}
              </p>
            </div>
            {canEdit && (
              <CustomButton variant="primary" size="sm" icon={PlusIcon} onClick={onAdd}>
                {t('timeline.addFirst', 'Add First Moment')}
              </CustomButton>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 @[580px]:grid-cols-2 @[920px]:grid-cols-3 gap-5">
            {items.map((item, idx) => {
              const IconComp = resolveStoryIcon(item.icon_name);
              const colorDef = resolveStoryColorStyle(item.color_token);
              const isLockedView = item.is_locked && !canEdit;
              const hasHiddenNote =
                Boolean(item.surprise_note) || (item.is_locked && item.surprise_revealed);

              return (
                <article
                  key={item.id}
                  className="group relative rounded-3xl theme-bg-app p-3.5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3 border-0"
                >
                  {/* Arched Scrapbook Visual Frame */}
                  <div
                    onClick={() => !isLockedView && onOpenDetail(item)}
                    className={`relative h-56 rounded-t-full rounded-b-2xl overflow-hidden theme-bg-surface ${
                      isLockedView ? '' : 'cursor-pointer'
                    }`}
                  >
                    {item.photo_url && !isLockedView ? (
                      <img
                        src={item.photo_url}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex flex-col items-center justify-center gap-2.5"
                        style={{ backgroundColor: colorDef.softBg, color: colorDef.textColor }}
                      >
                        {isLockedView ? (
                          <LockClosedIcon className="w-8 h-8" />
                        ) : (
                          <IconComp className="w-9 h-9" />
                        )}
                      </div>
                    )}

                    {/* Floating Top Status Pills */}
                    <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2 pointer-events-none">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {!item.is_published && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold theme-bg-surface theme-text-secondary shadow-xs">
                            {t('timeline.draftLabel', 'Draft')}
                          </span>
                        )}
                        {item.is_locked && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold theme-bg-surface theme-accent shadow-xs inline-flex items-center gap-1">
                            <LockClosedIcon className="w-3 h-3" />
                            {t('beginning.lockedBadge', 'Sealed')}
                          </span>
                        )}
                      </div>

                      <div className="pointer-events-auto flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(item);
                          }}
                          title={
                            item.is_favorite
                              ? t('timeline.unfavoriteAction', 'Unfavorite')
                              : t('timeline.favoriteAction', 'Favorite Memory')
                          }
                          className={`p-1.5 rounded-full theme-bg-surface/90 backdrop-blur-xs shadow-xs cursor-pointer transition-transform hover:scale-110 border-0 ${
                            item.is_favorite ? 'text-rose-500' : 'theme-text-secondary'
                          }`}
                        >
                          <HeartIcon className={`w-3.5 h-3.5 ${item.is_favorite ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {/* Floating Scrapbook Date & Badge Banner */}
                    {item.badge && !isLockedView && (
                      <div className="absolute bottom-3 inset-x-3 flex justify-center pointer-events-none">
                        <span
                          className="px-3 py-1 rounded-full text-[11px] font-bold shadow-xs backdrop-blur-xs"
                          style={{
                            backgroundColor: 'var(--bg-surface)',
                            color: colorDef.textColor,
                          }}
                        >
                          {item.badge}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Inset Editorial Text Body */}
                  <div className="px-2 pt-1 pb-2 space-y-2 flex-1 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold theme-text-secondary font-mono">
                          <CalendarIcon className="w-3 h-3 theme-accent" />
                          {formatDate(item.event_date)}
                        </span>

                        {canEdit && (
                          <ActionMenu
                            align="right"
                            ariaLabel={t('hero.actionsLabel', 'Story Actions')}
                            items={[
                              {
                                label: t('timeline.editAction', 'Edit in Drawer'),
                                icon: EditIcon,
                                onClick: () => onEdit(item),
                              },
                              ...(onReorder && idx > 0
                                ? [
                                    {
                                      label: t('timeline.moveUp', 'Move Earlier Order'),
                                      icon: ArrowUpIcon,
                                      onClick: () => onReorder(item, 'up'),
                                    },
                                  ]
                                : []),
                              ...(onReorder && idx < items.length - 1
                                ? [
                                    {
                                      label: t('timeline.moveDown', 'Move Later Order'),
                                      icon: ArrowDownIcon,
                                      onClick: () => onReorder(item, 'down'),
                                    },
                                  ]
                                : []),
                              { divider: true },
                              {
                                label: t('timeline.deleteAction', 'Remove Entry'),
                                icon: TrashIcon,
                                variant: 'danger',
                                onClick: () => setDeletingItem(item),
                              },
                            ]}
                          />
                        )}
                      </div>

                      <h4
                        onClick={() => !isLockedView && onOpenDetail(item)}
                        className={`text-sm font-bold theme-text-primary leading-snug ${
                          isLockedView ? '' : 'cursor-pointer hover:theme-accent transition-colors'
                        }`}
                      >
                        {item.title}
                      </h4>

                      {isLockedView ? (
                        <p className="text-xs italic theme-text-secondary">
                          {t('timeline.lockedLabel', 'This memory is sealed for now.')}
                        </p>
                      ) : (
                        <>
                          {item.subtitle && (
                            <p className="text-xs font-semibold" style={{ color: colorDef.textColor }}>
                              {item.subtitle}
                            </p>
                          )}
                          {item.description && (
                            <p className="text-xs theme-text-secondary line-clamp-2 leading-relaxed">
                              {item.description}
                            </p>
                          )}
                        </>
                      )}
                    </div>

                    {!isLockedView && (
                      <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-[11px] theme-text-secondary min-w-0">
                          {item.location && (
                            <span className="inline-flex items-center gap-1 truncate max-w-[140px]">
                              <LocationIcon className="w-3 h-3 shrink-0" />
                              <span className="truncate">{item.location}</span>
                            </span>
                          )}
                          {item.audio_url && (
                            <span className="inline-flex items-center gap-1 theme-accent font-semibold">
                              <MusicNoteIcon className="w-3 h-3 shrink-0" />
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {hasHiddenNote && !item.surprise_revealed && onUnlockSurprise && (
                            <CustomButton
                              size="sm"
                              variant="soft"
                              icon={GiftIcon}
                              onClick={() => onUnlockSurprise(item)}
                            >
                              {t('timeline.unlockSurpriseAction', 'Reveal Hidden Note')}
                            </CustomButton>
                          )}
                          <CustomButton
                            size="sm"
                            variant="ghost"
                            onClick={() => onOpenDetail(item)}
                          >
                            {t('timeline.readMoreAction', 'Read Full Memory')}
                          </CustomButton>
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={Boolean(deletingItem)}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleConfirmDelete}
        confirmLoading={isDeleting}
        title={t('timeline.deleteTitle', 'Remove Story Entry')}
        subtitle={deletingItem ? deletingItem.title : undefined}
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

export default StoryFirstsTab;
