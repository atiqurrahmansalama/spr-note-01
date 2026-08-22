import React, { useState } from "react";
import {
  CalendarIcon,
  TimerIcon,
  PlusIcon,
  EditIcon,
  ChevronIcon,
} from "../ui/Icons";
import { getEventColors } from "./MasterTimeCalendar";
import TimeScheduleDetailDrawer from "./TimeScheduleDetailDrawer";

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

export default function DayAgendaDrawer({
  dateStr,
  events = [],
  onClose,
  onEditEvent,
  onDeleteEvent,
  onAddEvent,
}) {
  const [selectedEventId, setSelectedEventId] = useState(() => {
    if (events.length === 1) return events[0].id;
    return null;
  });

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  // If a single event was clicked or chosen for details, show its full drawer
  if (selectedEvent) {
    return (
      <div className="space-y-4">
        {events.length > 1 && (
          <button
            type="button"
            onClick={() => setSelectedEventId(null)}
            className="flex items-center gap-1.5 text-xs font-semibold theme-accent hover:underline cursor-pointer pb-1"
          >
            <span>&larr; Back to all day tasks ({events.length})</span>
          </button>
        )}
        <TimeScheduleDetailDrawer
          event={selectedEvent}
          currentDate={dateStr}
          onEdit={() => onEditEvent && onEditEvent(selectedEvent)}
          onDelete={(deleteInfo) => onDeleteEvent && onDeleteEvent(deleteInfo || selectedEvent.id)}
          onClose={onClose}
        />
      </div>
    );
  }

  // Multi-event or zero-event day list
  return (
    <div className="space-y-4 text-left animate-fade-in">
      {/* Top Date Header Banner */}
      <div className="p-4 rounded-2xl theme-bg-surface border theme-border shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold theme-text-primary">
              Day Agenda & Worklist
            </h3>
            <p className="text-xs font-mono font-medium theme-text-secondary mt-0.5">
              {dateStr}
            </p>
          </div>
        </div>

        {onAddEvent && (
          <button
            type="button"
            onClick={() => onAddEvent(dateStr)}
            className="px-3 py-1.5 rounded-xl theme-bg-accent text-white text-xs font-bold hover:opacity-90 active:scale-98 transition flex items-center gap-1 cursor-pointer"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Add Task</span>
          </button>
        )}
      </div>

      {/* Events Worklist */}
      {events.length === 0 ? (
        <div className="p-10 text-center rounded-2xl theme-bg-sub/40 border theme-border space-y-3">
          <div className="w-10 h-10 rounded-2xl theme-bg-sub border theme-border flex items-center justify-center mx-auto opacity-60">
            <CalendarIcon className="w-5 h-5 theme-text-secondary" />
          </div>
          <div>
            <h4 className="text-xs font-bold theme-text-primary">
              No tasks or events scheduled
            </h4>
            <p className="text-[11px] theme-text-secondary mt-1">
              There are no calendar activities or special shifts planned for this date.
            </p>
          </div>
          {onAddEvent && (
            <button
              type="button"
              onClick={() => onAddEvent(dateStr)}
              className="px-4 py-2 rounded-xl theme-bg-accent text-white text-xs font-bold hover:opacity-90 active:scale-98 transition inline-flex items-center gap-1.5 cursor-pointer"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>Create Event / Schedule</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider theme-text-secondary block px-1">
            Scheduled Items ({events.length})
          </span>

          <div className="space-y-2">
            {events.map((evt) => {
              const style = getEventColors(evt);
              const isWorkingHours = evt.category === "WORKING_HOURS";
              const isAllDay = evt.isFullDay || !evt.startTime || !evt.endTime;

              return (
                <div
                  key={evt.id}
                  onClick={() => setSelectedEventId(evt.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer hover:shadow-xs ${style.bg} ${style.border}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
                        <h4 className="text-xs font-bold theme-text-primary truncate">
                          {evt.title}
                        </h4>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md theme-bg-surface border theme-border theme-text-primary">
                          {isAllDay ? "Full Day" : `${formatTime12(evt.startTime)} – ${formatTime12(evt.endTime)}`}
                        </span>

                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md theme-bg-sub border theme-border theme-text-secondary">
                          {isWorkingHours ? "Working Hours" : "Academic Event"}
                        </span>

                        {evt.audience && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md theme-bg-sub border theme-border theme-text-secondary">
                            Audience: {evt.audience}
                          </span>
                        )}
                      </div>

                      {evt.description && (
                        <p className="text-[11px] theme-text-secondary line-clamp-2 pt-1">
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
      <div className="pt-4 border-t theme-border flex items-center justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl border theme-border hover:theme-bg-elevated theme-text-secondary font-semibold text-xs transition cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  );
}
