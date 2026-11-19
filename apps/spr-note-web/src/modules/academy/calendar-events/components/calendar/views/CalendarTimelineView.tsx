import React from 'react';
import DateHeaderCell from '../../../../../../components/common/DateHeaderCell';
import { CalendarIcon } from '../../../../../../components/ui/Icons';
import type { CalendarEvent, UserPersonalTask } from '../../../types';
import type { TimelineStripDay } from '../types';
import { WEEKDAY_NAMES_FULL, MONTH_NAMES, getEventColors } from '../utils/calendarUtils';
import { getHijriDateString } from '../../../../../../utils/hijriUtils';
import TimelineEventCard from './TimelineEventCard';
import DayTasksListSection from './DayTasksListSection';

interface CalendarTimelineViewProps {
  dayStripRef: React.RefObject<HTMLDivElement | null>;
  timelineStripDays: TimelineStripDay[];
  selectedDateStr: string;
  selectedDay: number;
  selectedWeekday: number;
  viewYear: number;
  viewMonth: number;
  todayStr: string;
  isHijriEnabled?: boolean;
  embeddedSurface?: boolean;
  readOnly?: boolean;
  showPersonalTasks?: boolean;
  activeTenantId?: string;
  selectedDayEvents: CalendarEvent[];
  selectedDayTasks: UserPersonalTask[];
  getEventsForDate: (dateStr: string, weekday: number) => CalendarEvent[];
  onSelectDay: (dayNum: number) => void;
  onSetCurrentDate: (date: Date) => void;
  onOpenAddDrawer: (dateStr: string) => void;
  onOpenEventDetail: (evt: CalendarEvent, dateStr?: string) => void;
  onToggleTaskStatus: (taskId: string) => void;
  onOpenTaskDrawer: (params: { task?: UserPersonalTask | null; date: string }) => void;
}

export const CalendarTimelineView: React.FC<CalendarTimelineViewProps> = ({
  dayStripRef,
  timelineStripDays,
  selectedDateStr,
  selectedDay,
  selectedWeekday,
  viewYear,
  viewMonth,
  todayStr,
  isHijriEnabled = false,
  embeddedSurface = false,
  readOnly = false,
  showPersonalTasks = true,
  activeTenantId,
  selectedDayEvents,
  selectedDayTasks,
  getEventsForDate,
  onSelectDay,
  onSetCurrentDate,
  onOpenAddDrawer,
  onOpenEventDetail,
  onToggleTaskStatus,
  onOpenTaskDrawer,
}) => {
  return (
    <div className="flex flex-col w-full min-w-0">
      {/* Continuous Day-Number Strip - Borderless soft-tinted tiles with Event Delegation */}
      <div
        ref={dayStripRef}
        onWheel={(e) => {
          const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
          if (delta !== 0) {
            e.currentTarget.scrollLeft += delta;
          }
        }}
        onClick={(e) => {
          const target = (e.target as HTMLElement).closest('[data-datestr]') as HTMLElement | null;
          if (!target) return;
          const d = Number(target.getAttribute('data-daynum'));
          const m = Number(target.getAttribute('data-month'));
          const y = Number(target.getAttribute('data-year'));
          if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
            onSelectDay(d);
            onSetCurrentDate(new Date(y, m, d));
          }
        }}
        className={`flex items-stretch overflow-x-auto scrollbar-none select-none min-w-0 cursor-grab active:cursor-grabbing border-0 gap-1.5 ${
          embeddedSurface ? 'pb-2' : 'p-2 sm:p-3 theme-bg-surface'
        }`}
      >
        {timelineStripDays.map((item) => {
          const isSelected = item.dateStr === selectedDateStr;
          const dEvents = getEventsForDate(item.dateStr, item.weekday);
          const isToday = item.dateStr === todayStr;
          const topEvent = dEvents.length > 0 ? dEvents[0] : null;
          const topColor = topEvent ? getEventColors(topEvent, activeTenantId) : null;
          const isCurrentMonth = item.yearNum === viewYear && item.monthIdx === viewMonth;

          return (
            <DateHeaderCell
              key={item.dateStr}
              as="button"
              type="button"
              dateStr={item.dateStr}
              dayNum={item.dayNum}
              weekday={item.weekday}
              isHijriEnabled={isHijriEnabled}
              hasEvent={Boolean(topEvent)}
              eventColors={topColor}
              eventTitle={topEvent ? topEvent.title : ''}
              isSelected={isSelected}
              isToday={isToday}
              isCurrentMonth={isCurrentMonth}
              keepNormalBgOnOtherMonths={true}
              borderless={true}
              data-year={item.yearNum}
              data-month={item.monthIdx}
              data-daynum={item.dayNum}
              data-datestr={item.dateStr}
              className="w-[36px] min-w-[36px] max-w-[36px] @sm:w-[42px] @sm:min-w-[42px] @sm:max-w-[42px] shrink-0"
            />
          );
        })}
      </div>

      {/* Selected Day Main View: Vertical Timeline Spine */}
      <div className={`${embeddedSurface ? 'pt-2 pb-4' : 'p-2 @sm:p-3 @md:p-4 pb-5 @sm:pb-6'} space-y-2.5 @sm:space-y-3.5 min-w-0`}>
        {/* Top Selected Day Date Header with Hijri Date */}
        <div className="flex items-center justify-between gap-2 px-1 pb-1 border-0 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs @sm:text-sm font-bold theme-text-primary">
              {WEEKDAY_NAMES_FULL[selectedWeekday]}, {selectedDay} {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            {isHijriEnabled && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] @sm:text-[11px] font-mono font-bold theme-bg-accent-soft theme-accent border-0 shadow-2xs">
                {getHijriDateString(selectedDateStr)}
              </span>
            )}
          </div>
          <span className="text-[11px] font-mono theme-text-secondary">
            {selectedDayEvents.length} {selectedDayEvents.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>

        {/* Timeline Cards Container */}
        {selectedDayEvents.length === 0 ? (
          <div className="p-6 @sm:p-10 text-center border-0 rounded-2xl theme-bg-tile shadow-2xs my-1 flex flex-col items-center justify-center gap-2">
            <div className="p-2.5 rounded-xl theme-bg-surface border-0 theme-text-secondary opacity-60 shadow-xs">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs @sm:text-sm font-bold theme-text-primary">No schedules or events for this date</h4>
              <p className="text-[10px] @sm:text-[11px] theme-text-secondary mt-0.5">Click below or use the top Add button to create working hours or an academic event.</p>
            </div>
            {!readOnly && (
              <button
                type="button"
                onClick={() => onOpenAddDrawer(selectedDateStr)}
                className="mt-1 px-3 py-1.5 rounded-xl text-xs font-bold border-0 theme-bg-surface hover:theme-bg-elevated theme-text-primary transition-all cursor-pointer shadow-xs"
              >
                + Add Schedule / Event
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2 @sm:space-y-3 pt-0.5 min-w-0">
            {selectedDayEvents.map((evt, idx) => (
              <TimelineEventCard
                key={evt.id}
                event={evt}
                idx={idx}
                totalEvents={selectedDayEvents.length}
                selectedDateStr={selectedDateStr}
                activeTenantId={activeTenantId}
                onOpenEventDetail={onOpenEventDetail}
              />
            ))}
          </div>
        )}

        {/* Daily Personal Tasks & Checklist for Selected Date */}
        {showPersonalTasks && (
          <DayTasksListSection
            tasks={selectedDayTasks}
            selectedDateStr={selectedDateStr}
            onToggleTaskStatus={onToggleTaskStatus}
            onOpenTaskDrawer={onOpenTaskDrawer}
          />
        )}
      </div>
    </div>
  );
};

export default React.memo(CalendarTimelineView);
