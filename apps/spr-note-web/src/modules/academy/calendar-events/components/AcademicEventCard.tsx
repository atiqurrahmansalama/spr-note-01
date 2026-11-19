import React from 'react';
import { CalendarIcon, UsersIcon } from '../../../../components/ui/Icons';
import type { ResolvedAcademicEventItem } from '../calendarDataResolver';
import { getHijriDateString } from '../../../../utils/hijriUtils';

export interface AcademicEventCardProps {
  event: ResolvedAcademicEventItem;
  showHijri?: boolean;
  onClick?: () => void;
  className?: string;
}

export const AcademicEventCard: React.FC<AcademicEventCardProps> = ({
  event,
  showHijri = false,
  onClick,
  className = '',
}) => {
  const hijriStr = React.useMemo(() => {
    if (!showHijri || !event.startDate) return '';
    try {
      return getHijriDateString(new Date(event.startDate));
    } catch {
      return '';
    }
  }, [showHijri, event.startDate]);

  const countdownBadge = React.useMemo(() => {
    if (event.isToday) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold theme-bg-accent theme-accent-text shrink-0 shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          Today
        </span>
      );
    }
    if (event.isTomorrow) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
          Tomorrow
        </span>
      );
    }
    if (event.daysRemaining > 1) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium theme-bg-elevated theme-text-secondary shrink-0">
          In {event.daysRemaining} days
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium theme-bg-sub/60 theme-text-secondary opacity-60 shrink-0">
        Completed
      </span>
    );
  }, [event.isToday, event.isTomorrow, event.daysRemaining]);

  const dateDisplay = React.useMemo(() => {
    if (!event.startDate) return '';
    if (event.endDate && event.endDate !== event.startDate) {
      return `${event.startDate} – ${event.endDate}`;
    }
    return event.startDate;
  }, [event.startDate, event.endDate]);

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`group relative flex flex-col justify-between p-4 rounded-2xl theme-bg-app hover:theme-bg-elevated/40 transition-all duration-200 border-0 ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold ${
                event.colorStyle?.bg || 'theme-bg-elevated'
              } ${event.colorStyle?.text || 'theme-text-primary'}`}
            >
              {event.displayType || event.type || 'Event'}
            </span>
            {countdownBadge}
          </div>

          <h4 className="text-sm font-semibold theme-text-primary group-hover:theme-accent-text transition-colors truncate">
            {event.title}
          </h4>

          {event.description && (
            <p className="text-xs theme-text-secondary line-clamp-1 mt-1 opacity-80">
              {event.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2.5 mt-2.5 border-0 text-xs theme-text-secondary">
        <div className="flex items-center gap-1.5 truncate">
          <CalendarIcon className="w-3.5 h-3.5 opacity-70 shrink-0" />
          <span className="truncate">{dateDisplay}</span>
          {hijriStr && (
            <span className="text-[11px] opacity-60 font-mono truncate">({hijriStr})</span>
          )}
        </div>

        {event.audience && event.audience !== 'ALL' && (
          <div className="flex items-center gap-1 text-[11px] opacity-80 shrink-0 ml-2">
            <UsersIcon className="w-3 h-3 opacity-60" />
            <span className="truncate max-w-[100px]">{event.audience}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AcademicEventCard;

