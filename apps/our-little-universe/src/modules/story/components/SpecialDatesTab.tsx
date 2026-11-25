import React, { useState } from 'react';
import { ActionMenu, ConfirmModal, CustomButton } from '@repo/ui';
import {
  CalendarIcon,
  EditIcon,
  HeartIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
} from '../../../components/icons/UniverseIcons';
import { computeDaysToSpecialDate } from '../constants/storyStyles';
import { useStoryTranslation } from '../locales';
import type { StorySpecialDate } from '../types';

export interface SpecialDatesTabProps {
  items: StorySpecialDate[];
  canEdit: boolean;
  onAdd: () => void;
  onEdit: (item: StorySpecialDate) => void;
  onDelete: (id: string) => Promise<void>;
}

/**
 * OS-09: Special Dates & recurring yearly anniversary countdown cards.
 */
export const SpecialDatesTab: React.FC<SpecialDatesTabProps> = ({
  items,
  canEdit,
  onAdd,
  onEdit,
  onDelete,
}) => {
  const { t, formatDate, formatNumber } = useStoryTranslation();
  const [deletingItem, setDeletingItem] = useState<StorySpecialDate | null>(null);
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
              <CalendarIcon className="w-5 h-5 theme-accent" />
              {t('dates.title', 'Special Dates & Milestones')}
            </h3>
            <p className="text-xs theme-text-secondary mt-0.5">
              {t(
                'dates.subtitle',
                'Anniversaries, first meetings, celebrations, and counting down to the next milestone.'
              )}
            </p>
          </div>
          {canEdit && (
            <CustomButton variant="soft" size="sm" icon={PlusIcon} onClick={onAdd}>
              {t('dates.addDate', 'Add Special Date')}
            </CustomButton>
          )}
        </div>

        {items.length === 0 ? (
          <div className="py-14 px-6 rounded-2xl theme-bg-app text-center space-y-3">
            <div className="w-12 h-12 rounded-full theme-bg-accent-soft theme-accent flex items-center justify-center mx-auto">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold theme-text-primary">
                {t('dates.emptyTitle', 'No Special Dates Yet')}
              </h4>
              <p className="text-xs theme-text-secondary max-w-md mx-auto">
                {t(
                  'dates.emptySubtitle',
                  'Save anniversaries and meaningful dates to track countdowns automatically.'
                )}
              </p>
            </div>
            {canEdit && (
              <CustomButton variant="primary" size="sm" icon={PlusIcon} onClick={onAdd}>
                {t('dates.addDate', 'Add Special Date')}
              </CustomButton>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 @[580px]:grid-cols-2 gap-4">
            {items.map((item) => {
              const countdown = computeDaysToSpecialDate(item.event_date, item.repeats_yearly);
              return (
                <div
                  key={item.id}
                  className={`rounded-2xl p-4 @[520px]:p-5 flex items-start justify-between gap-4 border-0 shadow-xs transition-colors ${
                    countdown.isToday
                      ? 'bg-[var(--accent-main)]/15 dark:bg-[var(--accent-main)]/25'
                      : 'theme-bg-app'
                  }`}
                >
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full theme-bg-surface theme-accent">
                        {item.category}
                      </span>
                      <span className="text-[11px] font-semibold theme-text-secondary">
                        {item.repeats_yearly
                          ? t('dates.repeatsYearly', 'Repeats Yearly')
                          : t('dates.oneTime', 'Single Milestone')}
                      </span>
                      {!item.is_published && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full theme-bg-surface theme-text-secondary">
                          {t('timeline.draftLabel', 'Draft')}
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm @[520px]:text-base font-bold theme-text-primary">
                      {item.title}
                    </h4>

                    <div className="flex items-center gap-1.5 text-xs theme-text-secondary font-mono">
                      <CalendarIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
                      <span>{formatDate(item.event_date)}</span>
                    </div>

                    {item.notes && (
                      <p className="text-xs theme-text-secondary leading-relaxed">{item.notes}</p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
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

                    <div className="px-3.5 py-2.5 rounded-2xl theme-bg-surface text-center min-w-[92px]">
                      {countdown.isToday ? (
                        <div className="flex flex-col items-center gap-1 theme-accent">
                          <SparklesIcon className="w-4 h-4" />
                          <span className="text-[11px] font-bold leading-tight">
                            {t('dates.todayBanner', 'Celebrated Today!')}
                          </span>
                        </div>
                      ) : countdown.daysAway !== null ? (
                        <>
                          <div className="text-lg font-black theme-accent font-mono leading-none">
                            {formatNumber(countdown.daysAway)}
                          </div>
                          <div className="text-[10px] font-semibold theme-text-secondary mt-1 leading-tight">
                            {t('dates.daysAway', 'days until next celebration')}
                          </div>
                        </>
                      ) : countdown.daysSince !== null ? (
                        <>
                          <div className="text-lg font-black theme-text-primary font-mono leading-none">
                            {formatNumber(countdown.daysSince)}
                          </div>
                          <div className="text-[10px] font-semibold theme-text-secondary mt-1 leading-tight">
                            {t('dates.daysSince', 'days ago')}
                          </div>
                        </>
                      ) : (
                        <HeartIcon className="w-4 h-4 theme-accent mx-auto" />
                      )}
                    </div>
                  </div>
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

export default SpecialDatesTab;
