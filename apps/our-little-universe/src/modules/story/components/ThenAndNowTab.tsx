import React, { useState } from 'react';
import { ActionMenu, ConfirmModal, CustomButton } from '@repo/ui';
import {
  CalendarIcon,
  EditIcon,
  ImageVaultIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
} from '../../../components/icons/UniverseIcons';
import { useStoryTranslation } from '../locales';
import type { StoryComparison } from '../types';

export interface ThenAndNowTabProps {
  items: StoryComparison[];
  canEdit: boolean;
  onAdd: () => void;
  onEdit: (item: StoryComparison) => void;
  onDelete: (id: string) => Promise<void>;
}

interface ComparisonSliderCardProps {
  item: StoryComparison;
  canEdit: boolean;
  onEdit: () => void;
  onRequestDelete: () => void;
}

const ComparisonSliderCard: React.FC<ComparisonSliderCardProps> = ({
  item,
  canEdit,
  onEdit,
  onRequestDelete,
}) => {
  const { t } = useStoryTranslation();
  const [sliderPos, setSliderPos] = useState<number>(50);

  return (
    <div className="rounded-3xl theme-bg-app p-4 @[640px]:p-5 shadow-xs space-y-4 border-0">
      {/* Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm @[520px]:text-base font-bold theme-text-primary">
              {item.title}
            </h4>
            {!item.is_published && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold theme-bg-surface theme-text-secondary">
                {t('timeline.draftLabel', 'Draft')}
              </span>
            )}
          </div>
          {item.caption && (
            <p className="text-xs @[520px]:text-sm theme-text-secondary leading-relaxed">
              {item.caption}
            </p>
          )}
        </div>

        {canEdit && (
          <ActionMenu
            align="right"
            ariaLabel={t('hero.actionsLabel', 'Story Actions')}
            items={[
              {
                label: t('timeline.editAction', 'Edit in Drawer'),
                icon: EditIcon,
                onClick: onEdit,
              },
              { divider: true },
              {
                label: t('timeline.deleteAction', 'Remove Entry'),
                icon: TrashIcon,
                variant: 'danger',
                onClick: onRequestDelete,
              },
            ]}
          />
        )}
      </div>

      {/* Interactive Split Comparison Viewport */}
      <div className="relative w-full aspect-[16/10] @[680px]:aspect-[16/9] rounded-2xl overflow-hidden theme-bg-surface select-none">
        {/* NOW Layer (Full Underlay) */}
        {item.now_url ? (
          <img
            src={item.now_url}
            alt={item.now_label}
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 theme-bg-accent-soft theme-accent">
            <ImageVaultIcon className="w-8 h-8" />
            <span className="text-xs font-semibold">
              {item.now_label || t('thenNow.nowFallback', 'Present Moment')}
            </span>
          </div>
        )}

        {/* THEN Layer (Clipped Overlay) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
        >
          {item.then_url ? (
            <img
              src={item.then_url}
              alt={item.then_label}
              draggable={false}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 theme-bg-surface theme-text-secondary">
              <CalendarIcon className="w-8 h-8 theme-accent" />
              <span className="text-xs font-semibold">
                {item.then_label || t('thenNow.pastFallback', 'Earlier Memory')}
              </span>
            </div>
          )}
        </div>

        {/* Left & Right Era Badges */}
        <div className="absolute bottom-3 left-3 pointer-events-none z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold theme-bg-surface/90 backdrop-blur-xs theme-text-primary shadow-xs">
            <span>{item.then_label || t('thenNow.pastFallback', 'Earlier Memory')}</span>
            {item.then_date && (
              <span className="theme-text-secondary font-mono">{item.then_date}</span>
            )}
          </span>
        </div>
        <div className="absolute bottom-3 right-3 pointer-events-none z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold theme-bg-accent theme-accent-text shadow-xs">
            <span>{item.now_label || t('thenNow.nowFallback', 'Present Moment')}</span>
            {item.now_date && <span className="opacity-85 font-mono">{item.now_date}</span>}
          </span>
        </div>

        {/* Divider Line & Center Knob */}
        <div
          className="absolute top-0 bottom-0 w-0.5 theme-bg-accent pointer-events-none z-10 shadow-sm"
          style={{ left: `${sliderPos}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full theme-bg-surface theme-accent shadow-md flex items-center justify-center font-bold text-xs">
            <SparklesIcon className="w-4 h-4" />
          </div>
        </div>

        {/* Native Range Input overlay for accessible pointer & keyboard dragging */}
        <input
          type="range"
          min={5}
          max={95}
          value={sliderPos}
          aria-label={t('thenNow.sliderLabel', 'Time Comparison Slider')}
          onChange={(e) => setSliderPos(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
        />
      </div>
    </div>
  );
};

/**
 * OS-08: Then & Now comparison gallery with interactive split slider.
 */
export const ThenAndNowTab: React.FC<ThenAndNowTabProps> = ({
  items,
  canEdit,
  onAdd,
  onEdit,
  onDelete,
}) => {
  const { t } = useStoryTranslation();
  const [deletingItem, setDeletingItem] = useState<StoryComparison | null>(null);
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
              <ImageVaultIcon className="w-5 h-5 theme-accent" />
              {t('thenNow.title', 'Then & Now Comparison')}
            </h3>
            <p className="text-xs theme-text-secondary mt-0.5">
              {t(
                'thenNow.subtitle',
                'Drag the interactive slider across time to compare how far our story has grown.'
              )}
            </p>
          </div>
          {canEdit && (
            <CustomButton variant="soft" size="sm" icon={PlusIcon} onClick={onAdd}>
              {t('thenNow.addComparison', 'Add Comparison')}
            </CustomButton>
          )}
        </div>

        {items.length === 0 ? (
          <div className="py-14 px-6 rounded-2xl theme-bg-app text-center space-y-3">
            <div className="w-12 h-12 rounded-full theme-bg-accent-soft theme-accent flex items-center justify-center mx-auto">
              <ImageVaultIcon className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold theme-text-primary">
                {t('thenNow.emptyTitle', 'No Then & Now Comparisons Yet')}
              </h4>
              <p className="text-xs theme-text-secondary max-w-md mx-auto">
                {t(
                  'thenNow.emptySubtitle',
                  'Add an earlier and recent photo in the Right Drawer to compare side by side.'
                )}
              </p>
            </div>
            {canEdit && (
              <CustomButton variant="primary" size="sm" icon={PlusIcon} onClick={onAdd}>
                {t('thenNow.addComparison', 'Add Comparison')}
              </CustomButton>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 @[920px]:grid-cols-2 gap-5">
            {items.map((item) => (
              <ComparisonSliderCard
                key={item.id}
                item={item}
                canEdit={canEdit}
                onEdit={() => onEdit(item)}
                onRequestDelete={() => setDeletingItem(item)}
              />
            ))}
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

export default ThenAndNowTab;
