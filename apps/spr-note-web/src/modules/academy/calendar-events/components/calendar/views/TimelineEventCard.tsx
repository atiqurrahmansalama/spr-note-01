import React from 'react';
import { ChevronRightIcon } from '../../../../../../components/ui/Icons';
import type { CalendarEvent } from '../../../types';
import { formatTime12, getEventDisplayType, getEventColors } from '../utils/calendarUtils';

interface TimelineEventCardProps {
  event: CalendarEvent;
  idx: number;
  totalEvents: number;
  selectedDateStr: string;
  activeTenantId?: string;
  onOpenEventDetail: (evt: CalendarEvent, dateStr?: string) => void;
}

export const TimelineEventCard: React.FC<TimelineEventCardProps> = ({
  event: evt,
  idx,
  totalEvents,
  selectedDateStr,
  activeTenantId,
  onOpenEventDetail,
}) => {
  const style = getEventColors(evt, activeTenantId);
  const isAllDay = evt.isFullDay || !evt.startTime || !evt.endTime;
  const timeText = isAllDay ? 'All Day' : formatTime12(evt.startTime);

  return (
    <div className="flex items-start gap-1 @sm:gap-2 @md:gap-3 group min-w-0">
      {/* Left Time Column (Compact & pushed left on small screens) */}
      <div className="flex flex-col items-end w-8 @sm:w-11 @md:w-16 shrink-0 pt-1.5 @sm:pt-2">
        <span className={`text-[9px] @sm:text-xs font-mono font-bold ${style.text} text-right leading-tight`}>
          {timeText}
        </span>
        {!isAllDay && evt.endTime && (
          <span className="text-[8px] @sm:text-[10px] font-mono theme-text-secondary opacity-70 mt-0.5 text-right leading-tight">
            {formatTime12(evt.endTime)}
          </span>
        )}
      </div>

      {/* Timeline Spine Line & Dot Indicator */}
      <div className="flex flex-col items-center self-stretch shrink-0 relative pt-2 @sm:pt-2.5">
        <div className={`w-1.5 h-1.5 @sm:w-2 @sm:h-2 rounded-full ${style.dot} group-hover:scale-125 transition-transform z-10`} />
        {idx < totalEvents - 1 && (
          <div className="w-0.5 flex-1 bg-current opacity-15 mt-1" />
        )}
      </div>

      {/* Event Card (Distinct soft surface inside parent container) */}
      <div
        onClick={() => onOpenEventDetail(evt, selectedDateStr)}
        className="flex-1 min-w-0 p-2 @sm:p-3 @md:p-3.5 rounded-2xl border-0 theme-bg-tile hover:theme-bg-elevated/75 transition-all duration-200 cursor-pointer shadow-2xs relative overflow-hidden flex items-center justify-between gap-1.5 @sm:gap-2.5"
      >
        {/* Left Accent Bar */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 @sm:w-1.5 ${style.dot}`} />

        <div className="min-w-0 flex-1 pl-1 space-y-0.5 @sm:space-y-1">
          {/* Type Line */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[8px] @sm:text-[10px] uppercase font-mono tracking-wider theme-text-secondary">Type:</span>
            <span className={`text-[9px] @sm:text-[10px] font-bold px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
              {getEventDisplayType(evt, activeTenantId)}
            </span>
          </div>

          {/* Subject / Title */}
          <div className="flex items-start gap-1 min-w-0">
            <span className="text-[8px] @sm:text-[10px] uppercase font-mono tracking-wider theme-text-secondary shrink-0 mt-0.5">Subject:</span>
            <h4 className="text-xs @sm:text-sm font-bold theme-text-primary truncate flex-1">
              {evt.title}
            </h4>
          </div>

          {/* Meta details */}
          <div className="text-[9px] @sm:text-[11px] theme-text-secondary mt-0.5 flex items-center gap-1.5 @sm:gap-3 flex-wrap">
            <span>Audience: <strong className="theme-text-primary font-medium">{evt.audience || 'ALL'}</strong></span>
            {evt.repeats && <span className="font-mono opacity-80">(Weekly)</span>}
            {evt.description && <span className="truncate opacity-80 max-w-xs">{evt.description}</span>}
          </div>
        </div>

        {/* Right Chevron */}
        <div className="flex items-center shrink-0">
          <ChevronRightIcon className="w-3 h-3 @sm:w-4 @sm:h-4 theme-text-secondary group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </div>
  );
};

export default React.memo(TimelineEventCard);
