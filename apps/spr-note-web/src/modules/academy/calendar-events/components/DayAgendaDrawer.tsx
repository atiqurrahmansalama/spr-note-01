import React, { useState, useMemo } from 'react';
import {
  CalendarIcon,
  PlusIcon,
  AlertTriangleIcon,
  ArrowLeftIcon,
  ChevronRightIcon,
} from '../../../../components/ui/Icons';
import CustomButton from '../../../../components/ui/CustomButton';
import { getEventColors, getEventDisplayType } from './MasterTimeCalendar';
import TimeScheduleDetailDrawer from './TimeScheduleDetailDrawer';
import { DrawerContainer, DrawerBanner } from '../../../../components/layout';
import { masterCalendarStore, attendanceEventRestrictionsStore } from '../../../../utils/localStore';
import { useCalendarTranslation } from '../locales';
import type { CalendarEvent } from '../types';

function formatTime12(timeStr?: string): string {
  if (!timeStr) return '';
  const parts = String(timeStr).split(':');
  let h = parseInt(parts[0], 10);
  const m = String(parts[1] || '00').padStart(2, '0');
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m}${ampm}`;
}

function formatFullDate(dateStr?: string): { weekday: string; formatted: string; short: string } {
  if (!dateStr) return { weekday: '', formatted: '', short: '' };
  const parts = dateStr.split('-');
  if (parts.length < 3) return { weekday: '', formatted: dateStr, short: dateStr };
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const dObj = new Date(y, m, d);

  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return {
    weekday: weekdays[dObj.getDay()] || '',
    formatted: `${d} ${months[m] || ''} ${y}`,
    short: `${d} ${months[m] || ''}`,
  };
}

export interface DayAgendaDrawerProps {
  dateStr?: string;
  activeTenantId?: string | null;
  calendarEvent?: CalendarEvent | null;
  events?: CalendarEvent[];
  isHoliday?: boolean;
  holidayTitle?: string;
  isClassOff?: boolean;
  classOffReason?: string;
  onClose?: (() => void) | null;
  onEditEvent?: ((evt: CalendarEvent) => void) | null;
  onOpenEventForm?: ((evt: CalendarEvent | null) => void) | null;
  onDeleteEvent?: ((deleteInfo: any) => void) | null;
  onAddEvent?: ((dateStr: string) => void) | null;
  readOnly?: boolean;
}

export const DayAgendaDrawer: React.FC<DayAgendaDrawerProps> = ({
  dateStr = '',
  activeTenantId = undefined,
  calendarEvent = null,
  events = [],
  isHoliday = false,
  holidayTitle = '',
  isClassOff = false,
  classOffReason = '',
  onClose = null,
  onEditEvent = null,
  onOpenEventForm = null,
  onDeleteEvent = null,
  onAddEvent = null,
  readOnly = false,
}) => {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const { t } = useCalendarTranslation();

  const dateDetails = useMemo(() => formatFullDate(dateStr), [dateStr]);

  // Query and resolve all calendar events on this date
  const resolvedEvents = useMemo<CalendarEvent[]>(() => {
    if (events && events.length > 0) return events;
    if (calendarEvent && !activeTenantId) return [calendarEvent];

    if (activeTenantId && dateStr) {
      const stored = masterCalendarStore.getEvents(activeTenantId) || [];
      const dObj = new Date(dateStr);
      const weekdayNum = isNaN(dObj.getDay()) ? 0 : dObj.getDay();

      const matched = stored.filter((evt: any) => {
        if (Array.isArray(evt.exceptions) && evt.exceptions.includes(dateStr)) return false;
        if (evt.startDate === dateStr && (!evt.endDate || evt.endDate === dateStr)) return true;
        if (evt.startDate && evt.endDate && dateStr >= evt.startDate && dateStr <= evt.endDate) return true;
        if (evt.repeats && Array.isArray(evt.repeatDays) && evt.repeatDays.includes(weekdayNum)) {
          if (!evt.startDate || dateStr >= evt.startDate) {
            if (evt.until === 'DATE' && evt.untilDate && dateStr > evt.untilDate) return false;
            return true;
          }
        }
        return false;
      });

      if (matched.length > 0) return matched;
    }

    if (calendarEvent) return [calendarEvent];
    return [];
  }, [events, calendarEvent, activeTenantId, dateStr]);

  const sortedEvents = useMemo(() => {
    return [...resolvedEvents].sort((a: any, b: any) => {
      const rankA = a.priorityRank !== undefined && a.priorityRank !== null ? Number(a.priorityRank) : (a.rank !== undefined ? Number(a.rank) : 999);
      const rankB = b.priorityRank !== undefined && b.priorityRank !== null ? Number(b.priorityRank) : (b.rank !== undefined ? Number(b.rank) : 999);
      return rankA - rankB;
    });
  }, [resolvedEvents]);

  // Check if class attendance is off on this date
  const isOffDay = Boolean(
    isClassOff ||
    isHoliday ||
    sortedEvents.some((e: any) => {
      if (e.category === 'HOLIDAY' || e.is_holiday) return true;
      if (activeTenantId && attendanceEventRestrictionsStore.isAttendanceDisabledForEvent(activeTenantId, e)) return true;
      const impacts = Array.isArray(e.impacts) ? e.impacts : (typeof e.impacts === 'string' ? e.impacts.split(',') : []);
      return impacts.some((imp: any) => {
        const s = String(imp).trim().toUpperCase();
        return s === 'ALL' || s === 'ATTENDANCE' || s === 'CLASS_ATTENDANCE';
      });
    })
  );

  const offReason =
    classOffReason ||
    holidayTitle ||
    sortedEvents.find((e: any) => e.category === 'HOLIDAY' || e.is_holiday)?.title ||
    sortedEvents[0]?.title ||
    'Scheduled Holiday / Institutional Recess';

  const selectedEvent = useMemo(() => {
    return sortedEvents.find((e) => e.id === selectedEventId) || null;
  }, [sortedEvents, selectedEventId]);

  const handleEdit = (evt: CalendarEvent) => {
    if (onOpenEventForm) {
      onOpenEventForm(evt);
    } else if (onEditEvent) {
      onEditEvent(evt);
    }
  };

  // If a single event was clicked or chosen for details, show its full drawer
  if (selectedEvent) {
    return (
      <div className="space-y-4 text-start animate-fade-in">
        {!readOnly && (
          <CustomButton
            type="button"
            variant="ghost"
            size="xs"
            icon={ArrowLeftIcon}
            onClick={() => setSelectedEventId(null)}
            className="theme-accent"
          >
            {t('backToAllTasks', 'Back to all day tasks')} ({sortedEvents.length})
          </CustomButton>
        )}
        <TimeScheduleDetailDrawer
          event={selectedEvent}
          currentDate={dateStr}
          onEdit={readOnly ? undefined : () => handleEdit(selectedEvent)}
          onDelete={readOnly ? undefined : (deleteInfo: any) => onDeleteEvent && onDeleteEvent(deleteInfo || selectedEvent.id)}
          onClose={onClose || undefined}
          readOnly={readOnly}
        />
      </div>
    );
  }

  // Multi-event or zero-event day list
  return (
    <DrawerContainer padding="none" spacing="normal">
      <div className="space-y-6 pt-2 pb-6 @container">
        {/* Top Date Header Banner */}
        <DrawerBanner
          icon={CalendarIcon}
          title={dateDetails.weekday || t('dayAgenda', 'Day Agenda')}
          badge={dateDetails.formatted || dateStr}
          subtitle={
            sortedEvents.length > 0
              ? `${sortedEvents.length} ${t('scheduledItems', 'Scheduled Items').toLowerCase()}`
              : t('noActiveShifts', 'No active shifts or events scheduled')
          }
          actions={
            !readOnly && (onAddEvent || onOpenEventForm) && (
              <CustomButton
                type="button"
                variant="primary"
                size="sm"
                icon={PlusIcon}
                onClick={() => {
                  if (onOpenEventForm) onOpenEventForm(null);
                  else if (onAddEvent) onAddEvent(dateStr);
                }}
                className="w-full @[440px]:w-auto"
              >
                {t('addEvent', 'Add Event')}
              </CustomButton>
            )
          }
        />

        {/* Prominent Class Off / Holiday Notification Banner */}
        {isOffDay && (
          <div className="p-4 rounded-3xl border-0 bg-rose-500/15 dark:bg-rose-950/40 flex items-start gap-3 shadow-xs animate-fade-in text-start">
            <div className="p-2 rounded-2xl bg-rose-500/20 text-rose-600 dark:text-rose-400 shrink-0">
              <AlertTriangleIcon className="w-5 h-5" />
            </div>
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-bold text-rose-600 dark:text-rose-400">
                  {t('classAttendanceClosed', 'Class Attendance is Closed / Off')}
                </h4>
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-600 dark:text-rose-300 border-0">
                  {t('classOff', 'Class Off')}
                </span>
              </div>
              <p className="text-xs text-rose-600/90 dark:text-rose-300/90 leading-relaxed font-medium">
                <strong>{offReason}</strong> — {t('classOffReasonNotice', 'Attendance marking for all class periods is disabled on this date.')}
              </p>
            </div>
          </div>
        )}

        {/* Events Worklist & Centered Empty State */}
        {sortedEvents.length === 0 ? (
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center rounded-3xl theme-bg-surface border-0 shadow-xs space-y-4 my-2 w-full">
            <div className="w-14 h-14 rounded-2xl theme-bg-accent-soft theme-accent border-0 flex items-center justify-center shrink-0 shadow-xs">
              <CalendarIcon className="w-7 h-7" />
            </div>
            <div className="max-w-xs sm:max-w-sm mx-auto space-y-1.5 text-center flex flex-col items-center">
              <h4 className="text-sm font-bold theme-text-primary">
                {t('noSchedulesTitle', 'No Schedules or Events')}
              </h4>
              <p className="text-xs theme-text-secondary leading-relaxed">
                {t('noSchedulesSubtitle', 'No shifts or institutional events are registered for this date.')}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider theme-text-secondary block px-1">
              {t('scheduledItems', 'Scheduled Items')} ({sortedEvents.length})
            </span>

            <div className="space-y-2.5">
              {sortedEvents.map((evt) => {
                const style = getEventColors(evt, activeTenantId);
                const isAllDay = evt.isFullDay || !evt.startTime || !evt.endTime;
                const rankVal = evt.priorityRank || (evt as any).rank || 1;

                return (
                  <button
                    key={evt.id}
                    type="button"
                    onClick={() => setSelectedEventId(evt.id)}
                    className={`w-full text-start p-3.5 sm:p-4 rounded-2xl border-0 ring-0 transition-all cursor-pointer shadow-xs hover:brightness-95 ${style.bg}`}
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="space-y-2 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: style.hex }}
                          />
                          <h4 className="text-xs sm:text-sm font-bold theme-text-primary truncate">
                            {evt.title}
                          </h4>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg theme-bg-accent-soft theme-accent border-0">
                            #{rankVal}
                          </span>

                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-lg theme-bg-surface border-0 theme-text-primary">
                            {isAllDay
                              ? t('fullDay', 'Full Day')
                              : `${formatTime12(evt.startTime)} – ${formatTime12(evt.endTime)}`}
                          </span>

                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg theme-bg-surface border-0 theme-text-secondary">
                            {getEventDisplayType(evt, activeTenantId)}
                          </span>

                          {evt.audience && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg theme-bg-surface border-0 theme-text-secondary">
                              {t('audience', 'Audience')}: {evt.audience}
                            </span>
                          )}
                        </div>

                        {evt.description && (
                          <p className="text-[11px] theme-text-secondary line-clamp-2 leading-relaxed font-normal">
                            {evt.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-xs font-semibold theme-accent shrink-0 pt-0.5">
                        <span>{t('details', 'Details')}</span>
                        <ChevronRightIcon className="w-3.5 h-3.5 rtl:rotate-180" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer Close */}
        {onClose && (
          <div className="pt-2 border-0 flex justify-end">
            <CustomButton
              type="button"
              variant="surface"
              size="md"
              onClick={onClose}
            >
              {t('close', 'Close')}
            </CustomButton>
          </div>
        )}
      </div>
    </DrawerContainer>
  );
};

export default DayAgendaDrawer;

