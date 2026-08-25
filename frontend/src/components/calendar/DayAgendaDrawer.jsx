import React, { useState, useMemo } from "react";
import {
  CalendarIcon,
  TimerIcon,
  PlusIcon,
  EditIcon,
  ChevronIcon,
  AlertTriangleIcon,
} from "../ui/Icons";
import { getEventColors, getEventDisplayType } from "./MasterTimeCalendar";
import TimeScheduleDetailDrawer from "./TimeScheduleDetailDrawer";
import { DrawerContainer, DrawerBanner, DrawerFooter } from "../layout";
import { masterCalendarStore, attendanceEventRestrictionsStore } from "../../utils/localStore";

function formatTime12(timeStr) {
  if (!timeStr) return "";
  const parts = String(timeStr).split(":");
  let h = parseInt(parts[0], 10);
  const m = String(parts[1] || "00").padStart(2, "0");
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m}${ampm}`;
}

function formatFullDate(dateStr) {
  if (!dateStr) return { weekday: "", formatted: "", short: "" };
  const parts = dateStr.split("-");
  if (parts.length < 3) return { weekday: "", formatted: dateStr, short: dateStr };
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const dObj = new Date(y, m, d);

  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return {
    weekday: weekdays[dObj.getDay()],
    formatted: `${d} ${months[m]} ${y}`,
    short: `${d} ${months[m]}`,
  };
}

export default function DayAgendaDrawer({
  dateStr,
  activeTenantId,
  calendarEvent,
  events = [],
  isHoliday = false,
  holidayTitle = "",
  isClassOff = false,
  classOffReason = "",
  onClose,
  onEditEvent,
  onOpenEventForm,
  onDeleteEvent,
  onAddEvent,
  readOnly = false,
}) {
  const [selectedEventId, setSelectedEventId] = useState(null);

  const dateDetails = useMemo(() => formatFullDate(dateStr), [dateStr]);

  // Query and resolve all calendar events on this date
  const resolvedEvents = useMemo(() => {
    if (events && events.length > 0) return events;
    if (calendarEvent && !activeTenantId) return [calendarEvent];

    if (activeTenantId && dateStr) {
      const stored = masterCalendarStore.getEvents(activeTenantId) || [];
      const dObj = new Date(dateStr);
      const weekdayNum = isNaN(dObj.getDay()) ? 0 : dObj.getDay();

      const matched = stored.filter((evt) => {
        if (Array.isArray(evt.exceptions) && evt.exceptions.includes(dateStr)) return false;
        if (evt.startDate === dateStr && (!evt.endDate || evt.endDate === dateStr)) return true;
        if (evt.startDate && evt.endDate && dateStr >= evt.startDate && dateStr <= evt.endDate) return true;
        if (evt.repeats && Array.isArray(evt.repeatDays) && evt.repeatDays.includes(weekdayNum)) {
          if (!evt.startDate || dateStr >= evt.startDate) {
            if (evt.until === "DATE" && evt.untilDate && dateStr > evt.untilDate) return false;
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
    return [...resolvedEvents].sort((a, b) => {
      const rankA = a.priorityRank !== undefined && a.priorityRank !== null ? Number(a.priorityRank) : (a.rank !== undefined ? Number(a.rank) : 999);
      const rankB = b.priorityRank !== undefined && b.priorityRank !== null ? Number(b.priorityRank) : (b.rank !== undefined ? Number(b.rank) : 999);
      return rankA - rankB;
    });
  }, [resolvedEvents]);

  // Check if class attendance is off on this date
  const isOffDay = Boolean(
    isClassOff ||
    isHoliday ||
    sortedEvents.some((e) => {
      if (e.category === "HOLIDAY" || e.is_holiday) return true;
      if (activeTenantId && attendanceEventRestrictionsStore.isAttendanceDisabledForEvent(activeTenantId, e)) return true;
      const impacts = Array.isArray(e.impacts) ? e.impacts : (typeof e.impacts === "string" ? e.impacts.split(",") : []);
      return impacts.some((imp) => {
        const s = String(imp).trim().toUpperCase();
        return s === "ALL" || s === "ATTENDANCE" || s === "CLASS_ATTENDANCE";
      });
    })
  );

  const offReason =
    classOffReason ||
    holidayTitle ||
    sortedEvents.find((e) => e.category === "HOLIDAY" || e.is_holiday)?.title ||
    sortedEvents[0]?.title ||
    "Scheduled Holiday / Institutional Recess";

  const selectedEvent = useMemo(() => {
    return sortedEvents.find((e) => e.id === selectedEventId) || null;
  }, [sortedEvents, selectedEventId]);

  const handleEdit = (evt) => {
    if (onOpenEventForm) {
      onOpenEventForm(evt);
    } else if (onEditEvent) {
      onEditEvent(evt);
    }
  };

  // If a single event was clicked or chosen for details, show its full drawer
  if (selectedEvent) {
    return (
      <div className="space-y-4 text-left animate-fade-in">
        {!readOnly && (
          <button
            type="button"
            onClick={() => setSelectedEventId(null)}
            className="flex items-center gap-1.5 text-xs font-semibold theme-accent hover:underline cursor-pointer pb-1"
          >
            <span>&larr; Back to all day tasks ({sortedEvents.length})</span>
          </button>
        )}
        <TimeScheduleDetailDrawer
          event={selectedEvent}
          currentDate={dateStr}
          onEdit={readOnly ? undefined : () => handleEdit(selectedEvent)}
          onDelete={readOnly ? undefined : (deleteInfo) => onDeleteEvent && onDeleteEvent(deleteInfo || selectedEvent.id)}
          onClose={onClose}
          readOnly={readOnly}
        />
      </div>
    );
  }

  // Multi-event or zero-event day list
  return (
    <DrawerContainer padding="normal" spacing="normal">
      {/* Top Date Header Banner */}
      <DrawerBanner
        icon={CalendarIcon}
        title={dateDetails.weekday || "Day Agenda"}
        badge={dateDetails.formatted || dateStr}
        subtitle={
          sortedEvents.length > 0
            ? `${sortedEvents.length} scheduled item${sortedEvents.length > 1 ? "s" : ""} on this date`
            : "No active shifts or events scheduled"
        }
        actions={
          !readOnly && (onAddEvent || onOpenEventForm) && (
            <button
              type="button"
              onClick={() => {
                if (onOpenEventForm) onOpenEventForm(null);
                else if (onAddEvent) onAddEvent(dateStr);
              }}
              className="px-3.5 py-2 rounded-xl theme-bg-accent text-white text-xs font-bold hover:opacity-90 active:scale-98 transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-xs w-full sm:w-auto"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>Add Event</span>
            </button>
          )
        }
      />

      {/* Prominent Class Off / Holiday Notification Banner */}
      {isOffDay && (
        <div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 dark:bg-rose-950/30 flex items-start gap-3 shadow-xs animate-fade-in text-left">
          <div className="p-2 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 shrink-0">
            <AlertTriangleIcon className="w-5 h-5" />
          </div>
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-bold text-rose-600 dark:text-rose-400">
                Class Attendance is Closed / Off
              </h4>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30">
                Class Off
              </span>
            </div>
            <p className="text-xs text-rose-600/90 dark:text-rose-300/90 leading-relaxed font-medium">
              Reason: <strong>{offReason}</strong>. Attendance marking for all class periods is disabled on this date.
            </p>
          </div>
        </div>
      )}

      {/* Events Worklist & Perfectly Centered Empty State */}
      {sortedEvents.length === 0 ? (
        <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center rounded-3xl theme-bg-surface border theme-border shadow-xs space-y-4 my-2 w-full">
          <div className="w-14 h-14 rounded-2xl theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20 flex items-center justify-center shrink-0 shadow-xs">
            <CalendarIcon className="w-7 h-7" />
          </div>
          <div className="max-w-xs sm:max-w-sm mx-auto space-y-1.5 text-center flex flex-col items-center">
            <h4 className="text-sm font-bold theme-text-primary">
              No Schedules or Events
            </h4>
            <p className="text-xs theme-text-secondary leading-relaxed">
              No shifts or institutional events are registered for this date.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider theme-text-secondary block px-1">
            Scheduled Items ({sortedEvents.length})
          </span>

          <div className="space-y-2.5">
            {sortedEvents.map((evt) => {
              const style = getEventColors(evt);
              const isAllDay = evt.isFullDay || !evt.startTime || !evt.endTime;
              const rankVal = evt.priorityRank || evt.rank || 1;

              return (
                <div
                  key={evt.id}
                  onClick={() => setSelectedEventId(evt.id)}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-sm ${style.bg} ${style.border}`}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
                        <h4 className="text-xs sm:text-sm font-bold theme-text-primary truncate">
                          {evt.title}
                        </h4>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20">
                          Rank {rankVal}
                        </span>

                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md theme-bg-surface border theme-border theme-text-primary">
                          {isAllDay ? "Full Day" : `${formatTime12(evt.startTime)} – ${formatTime12(evt.endTime)}`}
                        </span>

                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md theme-bg-sub border theme-border theme-text-secondary">
                          {getEventDisplayType(evt)}
                        </span>

                        {evt.audience && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md theme-bg-sub border theme-border theme-text-secondary">
                            Audience: {evt.audience}
                          </span>
                        )}
                      </div>

                      {evt.description && (
                        <p className="text-[11px] theme-text-secondary line-clamp-2 pt-0.5 leading-relaxed font-normal">
                          {evt.description}
                        </p>
                      )}
                    </div>

                    <span className="text-xs font-semibold theme-accent shrink-0 pt-0.5 hover:underline">
                      Details &rarr;
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer Close */}
      <DrawerFooter onCancel={onClose} cancelLabel="Close" />
    </DrawerContainer>
  );
}
