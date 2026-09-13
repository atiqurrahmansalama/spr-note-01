import React from 'react';
import { useTranslation } from '../../../../i18n';
import type { ScheduleItem } from '../../types';
import { TimerIcon, BookOpenIcon } from '../../../../components/ui/Icons';

export interface TimetableScheduleWidgetProps {
  items: ScheduleItem[];
  title?: string;
  onViewAll?: () => void;
  className?: string;
}

export default function TimetableScheduleWidget({
  items,
  title,
  onViewAll,
  className = '',
}: TimetableScheduleWidgetProps) {
  const { t } = useTranslation('dashboard');

  return (
    <div className={`p-5 rounded-2xl theme-bg-surface border theme-border shadow-xs space-y-3.5 select-none ${className}`}>
      <div className="flex items-center justify-between pb-2 border-b theme-border">
        <div className="flex items-center gap-2">
          <TimerIcon className="w-4 h-4 text-[var(--accent-main)]" />
          <h3 className="text-sm font-bold theme-text-primary">
            {title || t('todaysTimetable', "Today's Class Schedule")}
          </h3>
        </div>

        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-semibold text-[var(--accent-main)] hover:underline cursor-pointer flex items-center gap-1"
          >
            <span>{t('mySchedule', 'View Schedule')}</span>
            <span className="text-[10px]">→</span>
          </button>
        )}
      </div>

      {!items || items.length === 0 ? (
        <div className="py-8 text-center text-xs theme-text-secondary">
          {t('noClassesToday', 'No classes scheduled for today')}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((slot) => {
            const isCurrent = slot.status === 'IN_PROGRESS';
            const isCompleted = slot.status === 'COMPLETED';

            return (
              <div
                key={slot.id}
                className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 text-left rtl:text-right ${
                  isCurrent
                    ? 'theme-bg-accent-soft border-[var(--accent-main)]/30 ring-1 ring-[var(--accent-main)]/20 shadow-xs'
                    : 'theme-bg-sub/60 theme-border'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isCurrent
                      ? 'theme-bg-accent theme-accent-text font-bold'
                      : isCompleted
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'theme-bg-surface theme-text-secondary border theme-border'
                  }`}>
                    <BookOpenIcon className="w-4 h-4" />
                  </div>

                  <div className="space-y-0.5 min-w-0">
                    <div className="text-xs font-bold theme-text-primary truncate">
                      {slot.subject} — <span className="text-[11px] font-medium theme-text-secondary">{slot.className} {slot.sectionName ? `(${slot.sectionName})` : ''}</span>
                    </div>
                    <div className="text-[10px] theme-text-secondary flex items-center gap-2">
                      <span className="font-mono">{slot.timeSlot}</span>
                      {slot.room && <span>• {t('room', 'Room')}: {slot.room}</span>}
                      {slot.teacherName && <span>• {slot.teacherName}</span>}
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                    isCurrent
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 animate-pulse'
                      : isCompleted
                      ? 'theme-bg-surface theme-text-muted border theme-border'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  }`}>
                    {isCurrent ? t('inProgress', 'In Progress') : isCompleted ? t('completed', 'Completed') : t('upcoming', 'Upcoming')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
