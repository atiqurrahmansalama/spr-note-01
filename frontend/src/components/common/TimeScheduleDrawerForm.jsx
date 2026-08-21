import React, { useState, useMemo, useEffect, useRef } from "react";
import CustomSelect from "../ui/CustomSelect";
import TimezoneSelect from "./TimezoneSelect";
import ReusableCalendar from "./ReusableCalendar";
import {
  SaveIcon,
  CloseIcon,
  ChevronIcon,
} from "../ui/Icons";
import { calendarEventTypesStore } from "../../utils/localStore";
import { useTenant } from "../../context/TenantContext";

const CATEGORY_OPTIONS = [
  { value: "WORKING_HOURS", label: "Working Hours (Shifts / Timings)" },
  { value: "ACADEMIC_EVENT", label: "Academic Event (Programs, Holidays, Exams)" },
];

const AUDIENCE_OPTIONS = [
  { value: "ALL", label: "All (Public, Guardians, Staff & Students)" },
  { value: "STAFF", label: "Staff & Teachers Only" },
  { value: "STUDENTS", label: "Students & Guardians Only" },
  { value: "INTERNAL", label: "Admin & Management Only" },
];

const FREQUENCY_OPTIONS = [
  { value: "WEEKLY", label: "Every Week" },
  { value: "BIWEEKLY", label: "Every 2 Weeks" },
  { value: "MONTHLY", label: "Every Month" },
  { value: "YEARLY", label: "Annually (Every Year)" },
];

const UNTIL_OPTIONS = [
  { value: "ONGOING", label: "Ongoing / Forever" },
  { value: "DATE", label: "Specific date..." },
];

const WEEKDAY_INITIALS = [
  { day: 0, label: "S", name: "Sunday" },
  { day: 1, label: "M", name: "Monday" },
  { day: 2, label: "T", name: "Tuesday" },
  { day: 3, label: "W", name: "Wednesday" },
  { day: 4, label: "T", name: "Thursday" },
  { day: 5, label: "F", name: "Friday" },
  { day: 6, label: "S", name: "Saturday" },
];

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

export function InlineTimePicker({ value, onChange, label, placeholder = "Choose Time" }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const parsed = useMemo(() => {
    if (!value) return { hour: 9, minute: 0, period: "am" };
    const [hStr, mStr] = String(value).split(":");
    let h = parseInt(hStr, 10) || 0;
    const m = parseInt(mStr, 10) || 0;
    const period = h >= 12 ? "pm" : "am";
    let hour = h % 12;
    if (hour === 0) hour = 12;
    return { hour, minute: m, period };
  }, [value]);

  const [selHour, setSelHour] = useState(parsed.hour);
  const [selMinute, setSelMinute] = useState(parsed.minute);
  const [selPeriod, setSelPeriod] = useState(parsed.period);

  useEffect(() => {
    setSelHour(parsed.hour);
    setSelMinute(parsed.minute);
    setSelPeriod(parsed.period);
  }, [parsed]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const commitTime = (h, m, p) => {
    let hour24 = h % 12;
    if (p === "pm") hour24 += 12;
    const hh = String(hour24).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    onChange(`${hh}:${mm}`);
  };

  const hoursList = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const minutesList = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <div ref={containerRef} className="relative flex-1">
      {label && <label className="block text-xs font-semibold theme-text-secondary mb-1.5">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 text-sm rounded-xl border theme-border theme-bg-sub hover:theme-bg-elevated transition focus:outline-none focus:ring-1 focus:ring-[var(--accent-main)] cursor-pointer"
      >
        <span className={value ? "font-medium font-mono theme-text-primary" : "theme-text-secondary"}>
          {value ? formatTime12(value) : placeholder}
        </span>
        <ChevronIcon className={`w-3.5 h-3.5 theme-text-secondary transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-50 p-2 rounded-xl theme-bg-surface border theme-border shadow-xl animate-fade-in flex gap-1.5 w-48">
          {/* Hours Column */}
          <div className="flex-1 max-h-40 overflow-y-auto scrollbar-none space-y-0.5">
            {hoursList.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => {
                  setSelHour(h);
                  commitTime(h, selMinute, selPeriod);
                }}
                className={`w-full py-1 text-xs rounded-md font-mono transition text-center cursor-pointer ${
                  selHour === h
                    ? "theme-bg-accent text-white font-bold"
                    : "hover:theme-bg-elevated theme-text-primary"
                }`}
              >
                {String(h).padStart(2, "0")}
              </button>
            ))}
          </div>

          {/* Minutes Column (5 min step) */}
          <div className="flex-1 max-h-40 overflow-y-auto scrollbar-none px-1 space-y-0.5 border-l theme-border">
            {minutesList.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setSelMinute(m);
                  commitTime(selHour, m, selPeriod);
                }}
                className={`w-full py-1 text-xs rounded-md font-mono transition text-center cursor-pointer ${
                  selMinute === m
                    ? "theme-bg-accent text-white font-bold"
                    : "hover:theme-bg-elevated theme-text-primary"
                }`}
              >
                {String(m).padStart(2, "0")}
              </button>
            ))}
          </div>

          {/* AM/PM Column */}
          <div className="w-11 max-h-40 overflow-y-auto scrollbar-none pl-1 space-y-1 border-l theme-border flex flex-col justify-center">
            {["am", "pm"].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setSelPeriod(p);
                  commitTime(selHour, selMinute, p);
                  setIsOpen(false);
                }}
                className={`w-full py-1.5 text-xs rounded-md font-bold uppercase transition text-center cursor-pointer ${
                  selPeriod === p
                    ? "theme-bg-accent text-white"
                    : "hover:theme-bg-elevated theme-text-primary"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TimeScheduleDrawerForm({
  event,
  initialDate,
  defaultCategory = "WORKING_HOURS",
  onSave,
  onCancel,
}) {
  const { activeTenantId } = useTenant();
  const [eventTypes, setEventTypes] = useState([]);

  useEffect(() => {
    const loadTypes = () => {
      const types = calendarEventTypesStore.getEventTypes(activeTenantId);
      setEventTypes(types || []);
    };
    loadTypes();
    window.addEventListener("spr_calendar_event_types_updated", loadTypes);
    return () => window.removeEventListener("spr_calendar_event_types_updated", loadTypes);
  }, [activeTenantId]);

  const [formData, setFormData] = useState(() => {
    if (event) {
      return {
        title: event.title || "",
        category: event.category || defaultCategory,
        audience: event.audience || "ALL",
        startDate: event.startDate || new Date().toISOString().split("T")[0],
        endDate: event.endDate || "",
        startTime: event.startTime || "09:00",
        endTime: event.endTime || "17:00",
        timezone: event.timezone || "Asia/Dhaka",
        repeats: Boolean(event.repeats),
        repeatDays: event.repeatDays || [0, 1, 2, 3, 4],
        frequency: event.frequency || "WEEKLY",
        until: event.until || "ONGOING",
        untilDate: event.untilDate || "",
        isFullDay: Boolean(event.isFullDay),
        description: event.description || "",
      };
    }
    return {
      title: defaultCategory === "WORKING_HOURS" ? "Morning Working Session" : "Mid-Term Examination",
      category: defaultCategory,
      audience: "ALL",
      startDate: initialDate || new Date().toISOString().split("T")[0],
      endDate: "",
      startTime: "09:00",
      endTime: "12:30",
      timezone: "Asia/Dhaka",
      repeats: defaultCategory === "WORKING_HOURS",
      repeatDays: [0, 1, 2, 3, 4],
      frequency: "WEEKLY",
      until: "ONGOING",
      untilDate: "",
      isFullDay: false,
      description: "",
    };
  });

  const eventTitleOptions = useMemo(() => {
    const active = eventTypes.filter((et) => et.is_active !== false);
    const opts = active.map((et) => ({ value: et.name, label: et.name }));
    if (formData.title && !opts.some((o) => o.value === formData.title)) {
      opts.unshift({ value: formData.title, label: formData.title });
    }
    return opts;
  }, [eventTypes, formData.title]);

  const toggleRepeatDay = (dayIndex) => {
    setFormData((prev) => {
      const days = prev.repeatDays || [];
      if (days.includes(dayIndex)) {
        return { ...prev, repeatDays: days.filter((d) => d !== dayIndex) };
      } else {
        return { ...prev, repeatDays: [...days, dayIndex].sort() };
      }
    });
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (onSave) {
      onSave({
        ...formData,
        id: event ? event.id : undefined,
      });
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-1 flex-1 flex flex-col justify-between min-h-[calc(100vh-140px)]">
      <form onSubmit={handleSubmit} className="flex flex-col justify-between flex-1 space-y-6">
        
        {/* Upper Form Body */}
        <div className="space-y-4">
          {/* Category & Audience */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold theme-text-secondary mb-1.5">Entry Purpose</label>
              <CustomSelect
                value={formData.category}
                onChange={(val) => setFormData({ ...formData, category: val })}
                options={CATEGORY_OPTIONS}
                placeholder="Select Category"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold theme-text-secondary mb-1.5">Target Audience</label>
              <CustomSelect
                value={formData.audience}
                onChange={(val) => setFormData({ ...formData, audience: val })}
                options={AUDIENCE_OPTIONS}
                placeholder="Select Audience"
              />
            </div>
          </div>

          {/* Schedule / Event Dropdown (Configured from Developer Tools) */}
          <div>
            <label className="block text-xs font-semibold theme-text-secondary mb-1.5">Schedule / Event</label>
            <CustomSelect
              value={formData.title}
              onChange={(val) => setFormData({ ...formData, title: val })}
              options={eventTitleOptions}
              placeholder="Select Schedule / Event..."
              searchable
            />
          </div>

          {/* Date Picker using ReusableCalendar */}
          <div>
            <ReusableCalendar
              label="Date"
              selectedDate={formData.startDate}
              onSelectDate={(newDate) => setFormData({ ...formData, startDate: newDate })}
            />
          </div>

          {/* From & To Time Pickers */}
          <div className="grid grid-cols-2 gap-3">
            <InlineTimePicker
              label="From:"
              value={formData.startTime}
              onChange={(val) => setFormData({ ...formData, startTime: val })}
            />
            <InlineTimePicker
              label="To:"
              value={formData.endTime}
              onChange={(val) => setFormData({ ...formData, endTime: val })}
            />
          </div>

          {/* Reusable TimezoneSelect */}
          <div>
            <TimezoneSelect
              value={formData.timezone}
              onChange={(val) => setFormData({ ...formData, timezone: val })}
            />
          </div>

          {/* Repeats vs Does Not Repeat Radio */}
          <div className="pt-2.5 border-t theme-border">
            <div className="flex flex-wrap items-center gap-6">
              <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer theme-text-primary select-none">
                <input
                  type="radio"
                  name="repeats"
                  checked={formData.repeats}
                  onChange={() => setFormData({ ...formData, repeats: true })}
                  className="w-4 h-4 accent-[var(--accent-main)] cursor-pointer"
                />
                <span>Repeats</span>
              </label>

              <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer theme-text-primary select-none">
                <input
                  type="radio"
                  name="repeats"
                  checked={!formData.repeats}
                  onChange={() => setFormData({ ...formData, repeats: false })}
                  className="w-4 h-4 accent-[var(--accent-main)] cursor-pointer"
                />
                <span>Does not repeat</span>
              </label>
            </div>
          </div>

          {/* Recurrence Options */}
          {formData.repeats && (
            <div className="space-y-3.5 pt-2 animate-fade-in">
              {/* What days? Circular day selector */}
              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1.5">What days?</label>
                <div className="flex items-center justify-between gap-1.5">
                  {WEEKDAY_INITIALS.map((item) => {
                    const isSelected = formData.repeatDays.includes(item.day);
                    return (
                      <button
                        key={item.day}
                        type="button"
                        onClick={() => toggleRepeatDay(item.day)}
                        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full text-xs font-bold flex items-center justify-center transition cursor-pointer select-none ${
                          isSelected
                            ? "theme-bg-accent text-white shadow-sm"
                            : "theme-bg-sub border theme-border theme-text-secondary hover:theme-text-primary"
                        }`}
                        title={item.name}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* How often & Until when */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold theme-text-secondary mb-1.5">How often?</label>
                  <CustomSelect
                    value={formData.frequency}
                    onChange={(val) => setFormData({ ...formData, frequency: val })}
                    options={FREQUENCY_OPTIONS}
                    placeholder="Select Frequency"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold theme-text-secondary mb-1.5">Until when?</label>
                  <CustomSelect
                    value={formData.until}
                    onChange={(val) => setFormData({ ...formData, until: val })}
                    options={UNTIL_OPTIONS}
                    placeholder="Select Recurrence Limit"
                  />
                </div>
              </div>

              {formData.until === "DATE" && (
                <div>
                  <ReusableCalendar
                    label="End Date"
                    selectedDate={formData.untilDate}
                    onSelectDate={(newDate) => setFormData({ ...formData, untilDate: newDate })}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pinned Bottom Action Footer */}
        <div className="pt-6 pb-2 border-t theme-border flex items-center justify-end gap-2.5 mt-auto">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl border theme-border hover:theme-bg-elevated theme-text-secondary text-sm font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="flex-1 py-2.5 rounded-xl theme-bg-accent text-white font-bold text-sm uppercase tracking-wider shadow-md hover:opacity-90 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <SaveIcon className="w-4 h-4" />
            <span>SAVE</span>
          </button>
        </div>
      </form>
    </div>
  );
}
