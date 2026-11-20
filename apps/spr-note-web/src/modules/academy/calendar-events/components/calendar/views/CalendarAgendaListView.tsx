import React from 'react';
import type { CalendarEvent } from '../../../types';
import { formatTime12, getEventColors, getEventDisplayType } from '../utils/calendarUtils';
import { getHijriDateString } from '../../../../../../utils/hijriUtils';

interface CalendarAgendaListViewProps {
  filteredEvents: CalendarEvent[];
  isHijriEnabled?: boolean;
  embeddedSurface?: boolean;
  activeTenantId?: string;
  selectedCategory?: string;
  onOpenEventDetail: (evt: CalendarEvent) => void;
}

export const CalendarAgendaListView: React.FC<CalendarAgendaListViewProps> = ({
  filteredEvents,
  isHijriEnabled = false,
  embeddedSurface = false,
  activeTenantId,
  selectedCategory,
  onOpenEventDetail,
}) => {
  return (
    <div className={`${embeddedSurface ? 'p-0 pb-4' : 'p-3 @sm:p-4 pb-5 @sm:pb-6'} space-y-2.5 @sm:space-y-3`}>
      {filteredEvents.length === 0 ? (
        <div className="p-10 @sm:p-12 text-center text-xs theme-text-secondary border-0 rounded-2xl theme-bg-tile shadow-2xs">
          {selectedCategory === 'WORKING_HOURS'
            ? 'No working hours or shifts found.'
            : selectedCategory === 'ACADEMIC_EVENT'
            ? 'No academic events or milestones found.'
            : 'No events or working hours matching the filter criteria.'}
        </div>
      ) : (
        filteredEvents.map((evt) => {
          const style = getEventColors(evt, activeTenantId);
          const isAllDay = evt.isFullDay || !evt.startTime || !evt.endTime;

          return (
            <div
              key={evt.id}
              onClick={() => onOpenEventDetail(evt)}
              className="p-3.5 @sm:p-4 rounded-2xl border-0 theme-bg-tile hover:theme-bg-elevated/75 transition cursor-pointer flex flex-col @sm:flex-row items-start @sm:items-center justify-between gap-2.5 @sm:gap-4 shadow-2xs"
            >
              <div className="flex items-start @sm:items-center gap-3 min-w-0 flex-1">
                <div className={`w-2.5 h-2.5 @sm:w-3 @sm:h-3 rounded-full shrink-0 mt-1 @sm:mt-0 ${style.dot}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs @sm:text-sm font-bold theme-text-primary truncate">{evt.title}</h4>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border-0 ${style.bg} ${style.text}`}>
                      {getEventDisplayType(evt, activeTenantId)}
                    </span>
                  </div>
                  <p className="text-[11px] @sm:text-xs theme-text-secondary mt-0.5 truncate">
                    Audience: <strong className="theme-text-primary font-medium">{evt.audience || 'ALL'}</strong>
                    {evt.description && <span className="ml-1 opacity-80">({evt.description})</span>}
                  </p>
                </div>
              </div>

              <div className="text-left @sm:text-right shrink-0 flex @sm:flex-col items-center @sm:items-end justify-between w-full @sm:w-auto pt-1 @sm:pt-0 border-0">
                {!isAllDay ? (
                  <div className={`font-mono font-bold text-xs ${style.text}`}>
                    {formatTime12(evt.startTime)} – {formatTime12(evt.endTime)}
                  </div>
                ) : (
                  <div className="text-xs font-semibold theme-text-secondary">Full Day</div>
                )}
                <div className="text-[10px] @sm:text-[11px] theme-text-secondary mt-0.5 font-mono flex items-center gap-1.5 flex-wrap">
                  <span>{evt.repeats ? 'Repeats weekly' : evt.startDate}</span>
                  {isHijriEnabled && evt.startDate && !evt.repeats && (
                    <span className="theme-accent font-semibold">• {getHijriDateString(evt.startDate)}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default React.memo(CalendarAgendaListView);
