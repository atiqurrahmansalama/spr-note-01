import React from 'react';
import { useTranslation } from '../../../../i18n';
import type { CalendarEventItem } from '../../types';
import { CalendarIcon } from '../../../../components/ui/Icons';

export interface UpcomingEventsWidgetProps {
  events: CalendarEventItem[];
  title?: string;
  onViewCalendar?: () => void;
  className?: string;
}

const EVENT_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  HOLIDAY: { bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', label: 'Holiday' },
  EXAM: { bg: 'bg-rose-500/10 border-rose-500/20', text: 'text-rose-600 dark:text-rose-400', label: 'Exam' },
  MEETING: { bg: 'bg-purple-500/10 border-purple-500/20', text: 'text-purple-600 dark:text-purple-400', label: 'Meeting' },
  EVENT: { bg: 'bg-sky-500/10 border-sky-500/20', text: 'text-sky-600 dark:text-sky-400', label: 'Event' },
};

export default function UpcomingEventsWidget({
  events,
  title,
  onViewCalendar,
  className = '',
}: UpcomingEventsWidgetProps) {
  const { t, formatDate, formatNumber } = useTranslation('dashboard');

  return (
    <div className={`p-5 rounded-2xl theme-bg-surface border theme-border shadow-xs space-y-3.5 select-none ${className}`}>
      <div className="flex items-center justify-between pb-2 border-b theme-border">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-[var(--accent-main)]" />
          <h3 className="text-sm font-bold theme-text-primary">
            {title || t('upcomingEvents', 'Upcoming Events & Calendar')}
          </h3>
        </div>

        {onViewCalendar && (
          <button
            type="button"
            onClick={onViewCalendar}
            className="text-xs font-semibold text-[var(--accent-main)] hover:underline cursor-pointer flex items-center gap-1"
          >
            <span>{t('upcomingEvents', 'View All')}</span>
            <span className="text-[10px]">→</span>
          </button>
        )}
      </div>

      {!events || events.length === 0 ? (
        <div className="py-6 text-center text-xs theme-text-secondary">
          {t('noUpcomingEvents', 'No upcoming events found')}
        </div>
      ) : (
        <div className="space-y-2.5">
          {events.map((evt) => {
            const badge = EVENT_BADGES[evt.type] || EVENT_BADGES.EVENT;

            return (
              <div
                key={evt.id}
                className="p-3 rounded-xl theme-bg-sub/60 border theme-border flex items-center justify-between gap-3 text-left rtl:text-right"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="text-xs font-bold theme-text-primary truncate">
                    {evt.title}
                  </div>
                  <div className="text-[10px] theme-text-secondary flex items-center gap-2">
                    <span className="font-mono">{formatDate(evt.date, { dateStyle: 'medium' })}</span>
                    {evt.impact && <span>• {evt.impact}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${badge.bg} ${badge.text}`}>
                    {t(badge.label.toLowerCase(), badge.label)}
                  </span>

                  {typeof evt.daysRemaining === 'number' && (
                    <span className="text-[10px] font-mono theme-text-muted hidden sm:inline">
                      {t('daysLeft', '{days}d left', { days: formatNumber(evt.daysRemaining) })}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
