import React, { useState, useMemo } from "react";
import {
  CalendarIcon,
  TimerIcon,
  EditIcon,
  TrashIcon,
} from "../ui/Icons";
import CustomSelect from "../ui/CustomSelect";
import { getEventColors, getEventDisplayType } from "./MasterTimeCalendar";
import { calendarImpactScopesStore } from "../../utils/localStore";

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

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function TimeScheduleDetailDrawer({
  event,
  currentDate,
  initialDate,
  onEdit,
  onDelete,
  onClose,
  readOnly = false,
}) {
  const effectiveDate = currentDate || initialDate || event?.startDate || new Date().toISOString().split("T")[0];

  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [deleteScope, setDeleteScope] = useState("THIS_EVENT");

  const deleteScopeOptions = useMemo(() => [
    {
      value: "THIS_EVENT",
      label: `This day only (${effectiveDate})`,
      description: "Delete only this specific day occurrence. Past and future schedules will remain intact.",
    },
    {
      value: "THIS_AND_FOLLOWING",
      label: "This and following days",
      description: `Delete from ${effectiveDate} onwards. Preserves all past attendance and logs.`,
    },
    {
      value: "ALL_EVENTS",
      label: "All days in series",
      description: "Delete the entire recurring schedule series completely.",
    },
  ], [effectiveDate]);

  const allScopes = useMemo(() => {
    return calendarImpactScopesStore.getScopes();
  }, []);

  if (!event) return null;

  const style = getEventColors(event);
  const isWorkingHours = event.category === "WORKING_HOURS";
  const isAllDay = event.isFullDay || !event.startTime || !event.endTime;
  const isRecurringOrMultiDay = Boolean(
    event.repeats || (event.endDate && event.endDate !== event.startDate)
  );

  return (
    <div className="space-y-5 text-left animate-fade-in">
      {/* Top Main Banner Card */}
      <div className="p-4 rounded-2xl theme-bg-surface border theme-border shadow-xs space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${style.bg} border ${style.border}`}>
              {isWorkingHours ? (
                <TimerIcon className="w-5 h-5 theme-text-primary" />
              ) : (
                <CalendarIcon className="w-5 h-5 theme-text-primary" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold theme-text-primary leading-snug">
                {event.title}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex px-2 py-0.5 text-[11px] font-semibold rounded-md ${style.bg} theme-text-primary border ${style.border}`}>
                  {getEventDisplayType(event)}
                </span>
                <span className="inline-flex px-2 py-0.5 text-[11px] font-medium rounded-md theme-bg-sub border theme-border theme-text-secondary">
                  Audience: {event.audience || "ALL"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {event.description && (
          <div className="p-3 rounded-xl theme-bg-sub/60 border theme-border text-xs theme-text-secondary leading-relaxed">
            {event.description}
          </div>
        )}
      </div>

      {/* Schedule Info Grid */}
      <div className="p-4 rounded-2xl theme-bg-surface border theme-border shadow-xs space-y-3.5 text-xs">
        <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider theme-text-secondary">
          Schedule & Timing Details
        </h4>

        {/* Time */}
        <div className="flex items-center justify-between py-2 border-b theme-border">
          <span className="theme-text-secondary font-medium">Session Timing:</span>
          <span className="font-mono font-bold theme-text-primary">
            {isAllDay ? "Full Day" : `${formatTime12(event.startTime)} – ${formatTime12(event.endTime)}`}
          </span>
        </div>

        {/* Date / Recurrence */}
        <div className="flex items-center justify-between py-2 border-b theme-border">
          <span className="theme-text-secondary font-medium">Recurrence Pattern:</span>
          <span className="font-semibold theme-text-primary">
            {event.repeats ? "Weekly Recurring" : "Single Date"}
          </span>
        </div>

        {/* Start Date */}
        {event.startDate && (
          <div className="flex items-center justify-between py-2 border-b theme-border">
            <span className="theme-text-secondary font-medium">Effective Date:</span>
            <span className="font-mono font-medium theme-text-primary">{event.startDate}</span>
          </div>
        )}

        {/* Repeat Days */}
        {event.repeats && Array.isArray(event.repeatDays) && event.repeatDays.length > 0 && (
          <div className="py-2 border-b theme-border space-y-1.5">
            <span className="theme-text-secondary font-medium block">Active Days:</span>
            <div className="flex flex-wrap gap-1.5">
              {event.repeatDays.map((d) => (
                <span
                  key={d}
                  className="px-2 py-0.5 rounded-lg text-[11px] font-semibold theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20"
                >
                  {WEEKDAY_NAMES[d] || `Day ${d}`}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Active System Impacts */}
        {Array.isArray(event.impacts) && event.impacts.length > 0 && (
          <div className="py-2 border-b theme-border space-y-1.5">
            <span className="theme-text-secondary font-medium block">Active System Impacts:</span>
            <div className="flex flex-wrap gap-1.5">
              {event.impacts.map((impactId) => {
                const matched = allScopes.find((i) => i.id === impactId || i.code === impactId);
                return (
                  <span
                    key={impactId}
                    className="px-2 py-0.5 rounded-lg text-[11px] font-semibold theme-bg-sub border theme-border theme-text-primary flex items-center gap-1 shadow-2xs"
                  >
                    <span className="w-1.5 h-1.5 rounded-full theme-bg-accent" />
                    <span>{matched?.name || matched?.badge || impactId}</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Priority Rank */}
        <div className="flex items-center justify-between py-2 border-b theme-border">
          <span className="theme-text-secondary font-medium">Precedence Priority:</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20">
            Rank {event.priorityRank || event.rank || 1}
          </span>
        </div>

        {/* Timezone */}
        {event.timezone && (
          <div className="flex items-center justify-between py-2 border-b theme-border">
            <span className="theme-text-secondary font-medium">Timezone:</span>
            <span className="font-mono text-xs theme-text-secondary">{event.timezone}</span>
          </div>
        )}
      </div>

      {/* Inline Delete Confirmation Block with CustomSelect Scope */}
      {!readOnly && isConfirmingDelete ? (
        <div className="p-4 rounded-2xl theme-bg-sub border border-[var(--danger-main)]/25 space-y-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <TrashIcon className="w-4 h-4 theme-danger" />
            <h4 className="text-xs font-bold theme-text-primary">
              Confirm Schedule Deletion
            </h4>
          </div>

          {isRecurringOrMultiDay && (
            <div className="space-y-1.5 pt-1">
              <label className="block text-xs font-semibold theme-text-secondary">
                Apply Deletion To
              </label>
              <CustomSelect
                value={deleteScope}
                onChange={(val) => setDeleteScope(val)}
                options={deleteScopeOptions}
                placeholder="Select delete scope..."
                showDescription={true}
                direction="up"
              />
            </div>
          )}

          {!isRecurringOrMultiDay && (
            <p className="text-[11px] theme-text-secondary">
              Are you sure you want to permanently delete "{event.title}"?
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t theme-border">
            <button
              type="button"
              onClick={() => setIsConfirmingDelete(false)}
              className="px-3.5 py-2 rounded-xl border theme-border hover:theme-bg-elevated theme-text-secondary text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (onDelete) {
                  onDelete({
                    id: event.id,
                    deleteScope: isRecurringOrMultiDay ? deleteScope : "ALL_EVENTS",
                    targetDate: effectiveDate,
                  });
                }
              }}
              className="px-4 py-2 rounded-xl bg-[var(--danger-main)] hover:opacity-90 text-white font-bold text-xs shadow-sm transition cursor-pointer flex items-center gap-1.5"
            >
              <TrashIcon className="w-3.5 h-3.5" />
              <span>Confirm Delete</span>
            </button>
          </div>
        </div>
      ) : (
        /* Action Buttons (Read-Only shows only Close button) */
        <div className={`pt-4 border-t theme-border flex items-center ${readOnly || (!onEdit && !onDelete) ? "justify-end" : "justify-between"} gap-2.5`}>
          {!readOnly && onDelete && (
            <button
              type="button"
              onClick={() => setIsConfirmingDelete(true)}
              className="px-3.5 py-2.5 rounded-xl border border-[var(--danger-main)]/30 theme-danger hover:theme-bg-danger-soft font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <TrashIcon className="w-4 h-4" />
              <span>Delete</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border theme-border hover:theme-bg-elevated theme-text-secondary font-semibold text-xs transition cursor-pointer"
              >
                Close
              </button>
            )}
            {!readOnly && onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="px-4 py-2.5 rounded-xl theme-bg-accent text-white font-bold text-xs shadow-md hover:opacity-90 active:scale-98 transition flex items-center gap-1.5 cursor-pointer"
              >
                <EditIcon className="w-4 h-4" />
                <span>Edit Schedule</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
