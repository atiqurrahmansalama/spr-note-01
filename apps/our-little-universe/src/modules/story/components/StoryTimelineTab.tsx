import React, { useMemo, useState } from 'react';
import { ActionMenu, ConfirmModal, CustomButton, IconButton } from '@repo/ui';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  EditIcon,
  GiftIcon,
  HeartIcon,
  LocationIcon,
  LockClosedIcon,
  MusicNoteIcon,
  PlusIcon,
  TrashIcon,
} from '../../../components/icons/UniverseIcons';
import { resolveStoryColorStyle, resolveStoryIcon } from '../constants/storyStyles';
import { useStoryTranslation } from '../locales';
import type { StoryChapter, StoryMilestone } from '../types';

export interface StoryTimelineTabProps {
  items: StoryMilestone[];
  chapters: StoryChapter[];
  canEdit: boolean;
  onAdd: () => void;
  onEdit: (item: StoryMilestone) => void;
  onOpenDetail: (item: StoryMilestone) => void;
  onToggleFavorite: (item: StoryMilestone) => Promise<unknown>;
  onUnlockSurprise?: (item: StoryMilestone) => Promise<unknown>;
  onReorder?: (item: StoryMilestone, direction: 'up' | 'down') => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
}

interface TimelineCardProps {
  item: StoryMilestone;
  index: number;
  totalCount: number;
  canEdit: boolean;
  onEdit: (item: StoryMilestone) => void;
  onOpenDetail: (item: StoryMilestone) => void;
  onToggleFavorite: (item: StoryMilestone) => Promise<unknown>;
  onUnlockSurprise?: (item: StoryMilestone) => Promise<unknown>;
  onReorder?: (item: StoryMilestone, direction: 'up' | 'down') => Promise<unknown>;
  onRequestDelete: (item: StoryMilestone) => void;
}

const TimelineMilestoneCard: React.FC<TimelineCardProps> = ({
  item,
  index,
  totalCount,
  canEdit,
  onEdit,
  onOpenDetail,
  onToggleFavorite,
  onUnlockSurprise,
  onReorder,
  onRequestDelete,
}) => {
  const { t, formatDate } = useStoryTranslation();
  const colorDef = resolveStoryColorStyle(item.color_token);
  const isLockedView = item.is_locked && !canEdit;
  const hasHiddenNote =
    Boolean(item.surprise_note) || (item.is_locked && item.surprise_revealed);

  return (
    <article className="rounded-3xl theme-bg-app p-4 @[520px]:p-5 shadow-xs space-y-3 border-0 hover:shadow-md transition-all">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold theme-text-secondary font-mono">
            {formatDate(item.event_date)}
          </span>
          {item.badge && (
            <span
              className="px-2.5 py-0.5 rounded-full text-[10px] font-bold"
              style={{ backgroundColor: colorDef.softBg, color: colorDef.textColor }}
            >
              {item.badge}
            </span>
          )}
          {!item.is_published && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold theme-bg-surface theme-text-secondary">
              {t('timeline.draftLabel', 'Draft')}
            </span>
          )}
          {item.is_locked && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold theme-bg-surface theme-accent">
              <LockClosedIcon className="w-3 h-3" />
              {t('beginning.lockedBadge', 'Sealed')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <IconButton
            icon={HeartIcon}
            size="xs"
            variant={item.is_favorite ? 'accent-soft' : 'ghost'}
            onClick={() => onToggleFavorite(item)}
            title={
              item.is_favorite
                ? t('timeline.unfavoriteAction', 'Unfavorite')
                : t('timeline.favoriteAction', 'Favorite Memory')
            }
            aria-label={
              item.is_favorite
                ? t('timeline.unfavoriteAction', 'Unfavorite')
                : t('timeline.favoriteAction', 'Favorite Memory')
            }
          />
          {canEdit && (
            <ActionMenu
              align="right"
              items={[
                {
                  label: t('timeline.editAction', 'Edit in Drawer'),
                  icon: EditIcon,
                  onClick: () => onEdit(item),
                },
                ...(onReorder && index > 0
                  ? [
                      {
                        label: t('timeline.moveUp', 'Move Earlier Order'),
                        icon: ArrowUpIcon,
                        onClick: () => onReorder(item, 'up'),
                      },
                    ]
                  : []),
                ...(onReorder && index < totalCount - 1
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
                  onClick: () => onRequestDelete(item),
                },
              ]}
            />
          )}
        </div>
      </div>

      <h4
        onClick={() => !isLockedView && onOpenDetail(item)}
        className={`text-sm @[520px]:text-base font-bold theme-text-primary leading-snug ${
          isLockedView ? '' : 'cursor-pointer hover:theme-accent transition-colors'
        }`}
      >
        {item.title}
      </h4>

      {item.location && !isLockedView && (
        <div className="inline-flex items-center gap-1 text-[11px] theme-text-secondary">
          <LocationIcon className="w-3 h-3 theme-accent" />
          <span>{item.location}</span>
        </div>
      )}

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
            <p className="text-xs @[520px]:text-sm theme-text-secondary leading-relaxed line-clamp-4">
              {item.description}
            </p>
          )}
          {item.photo_url && (
            <div
              onClick={() => onOpenDetail(item)}
              className="rounded-2xl overflow-hidden theme-bg-surface shadow-xs cursor-pointer"
            >
              <img
                src={item.photo_url}
                alt={item.title}
                className="w-full h-44 @[520px]:h-52 object-cover hover:scale-105 transition-transform duration-500"
              />
            </div>
          )}
          {item.audio_url && (
            <div className="rounded-2xl theme-bg-surface p-2.5 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold theme-accent">
                <MusicNoteIcon className="w-3.5 h-3.5" />
                <span>{t('timeline.audioLabel', 'Voice Note / Soundtrack')}</span>
              </div>
              <audio controls src={item.audio_url} className="w-full h-8" preload="none" />
            </div>
          )}
          <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
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
            <CustomButton size="sm" variant="ghost" onClick={() => onOpenDetail(item)}>
              {t('timeline.readMoreAction', 'Read Full Memory')}
            </CustomButton>
          </div>
        </>
      )}
    </article>
  );
};

/**
 * OS-02 / OS-03 Editorial Relationship Timeline with responsive alternating layout (@[760px]).
 */
export const StoryTimelineTab: React.FC<StoryTimelineTabProps> = ({
  items,
  chapters,
  canEdit,
  onAdd,
  onEdit,
  onOpenDetail,
  onToggleFavorite,
  onUnlockSurprise,
  onReorder,
  onDelete,
}) => {
  const { t } = useStoryTranslation();
  const [selectedChapterId, setSelectedChapterId] = useState<string>('all');
  const [deletingItem, setDeletingItem] = useState<StoryMilestone | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredItems = useMemo(() => {
    if (selectedChapterId === 'all') return items;
    return items.filter((m) => m.chapter_id === selectedChapterId);
  }, [items, selectedChapterId]);

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
      <div className="rounded-3xl theme-bg-surface border-0 p-5 @[520px]:p-6 shadow-xs space-y-4">
        <div className="flex flex-col @[520px]:flex-row items-start @[520px]:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold theme-text-primary tracking-tight">
              {t('timeline.title', 'Chronological Relationship Timeline')}
            </h3>
            <p className="text-xs theme-text-secondary mt-0.5">
              {t(
                'timeline.subtitle',
                'First hello, late walks, promises, and cherished moments woven along our shared line.'
              )}
            </p>
          </div>

          {canEdit && (
            <CustomButton
              type="button"
              variant="primary"
              size="sm"
              icon={PlusIcon}
              onClick={onAdd}
              className="shrink-0"
            >
              {t('timeline.addChapter', 'Add Timeline Event')}
            </CustomButton>
          )}
        </div>

        {chapters.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedChapterId('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer border-0 transition-colors ${
                selectedChapterId === 'all'
                  ? 'theme-bg-accent theme-accent-text shadow-xs'
                  : 'theme-bg-app theme-text-secondary hover:theme-text-primary'
              }`}
            >
              {t('timeline.filterAllChapters', 'All Chapters')}
            </button>
            {chapters.map((ch) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => setSelectedChapterId(ch.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer border-0 transition-colors ${
                  selectedChapterId === ch.id
                    ? 'theme-bg-accent theme-accent-text shadow-xs'
                    : 'theme-bg-app theme-text-secondary hover:theme-text-primary'
                }`}
              >
                {ch.title}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-3xl theme-bg-surface border-0 p-5 @[520px]:p-8 shadow-xs">
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center space-y-2.5">
            <div className="w-11 h-11 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center mx-auto">
              <HeartIcon className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold theme-text-primary">
              {t('timeline.emptyTitle', 'No Timeline Memories Yet')}
            </h4>
            <p className="text-xs theme-text-secondary max-w-md mx-auto">
              {t(
                'timeline.emptySubtitle',
                'Start building your story timeline directly from the Right Drawer.'
              )}
            </p>
            {canEdit && (
              <div className="pt-2">
                <CustomButton type="button" variant="soft" size="sm" icon={PlusIcon} onClick={onAdd}>
                  {t('timeline.addChapter', 'Add Timeline Event')}
                </CustomButton>
              </div>
            )}
          </div>
        ) : (
          <div className="relative space-y-6 @[760px]:space-y-8">
            <div
              aria-hidden="true"
              className="hidden @[760px]:block absolute left-1/2 top-4 bottom-4 w-[2px] -translate-x-1/2 theme-bg-app"
            />

            {filteredItems.map((item, idx) => {
              const ItemIcon = resolveStoryIcon(item.icon_name);
              const colorDef = resolveStoryColorStyle(item.color_token);
              const isLockedView = item.is_locked && !canEdit;
              const isLeftColumn = idx % 2 === 0;

              return (
                <div
                  key={item.id}
                  className="relative grid grid-cols-[auto_1fr] @[760px]:grid-cols-[1fr_auto_1fr] gap-4 @[760px]:gap-6 items-start group"
                >
                  <div className="flex flex-col items-center shrink-0 @[760px]:order-2 pt-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center shadow-xs shrink-0 z-10 transition-transform duration-150 group-hover:scale-105"
                      style={{
                        backgroundColor: colorDef.solidBg,
                        color: colorDef.solidText,
                      }}
                    >
                      {isLockedView ? (
                        <LockClosedIcon className="w-4 h-4" />
                      ) : (
                        <ItemIcon className="w-4 h-4" />
                      )}
                    </div>
                  </div>

                  <div className={`min-w-0 ${isLeftColumn ? '@[760px]:order-1' : '@[760px]:order-3'}`}>
                    <TimelineMilestoneCard
                      item={item}
                      index={idx}
                      totalCount={filteredItems.length}
                      canEdit={canEdit}
                      onEdit={onEdit}
                      onOpenDetail={onOpenDetail}
                      onToggleFavorite={onToggleFavorite}
                      onUnlockSurprise={onUnlockSurprise}
                      onReorder={onReorder}
                      onRequestDelete={setDeletingItem}
                    />
                  </div>

                  <div
                    aria-hidden="true"
                    className={`hidden @[760px]:block ${isLeftColumn ? 'order-3' : 'order-1'}`}
                  />
                </div>
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

export default StoryTimelineTab;
