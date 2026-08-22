import React, { useState, useMemo, useEffect, useRef } from "react";
import CustomSelect from "../ui/CustomSelect";
import TimezoneSelect from "./TimezoneSelect";
import ReusableCalendar from "./ReusableCalendar";
import {
  SaveIcon,
  CloseIcon,
  ChevronIcon,
  CalendarIcon,
} from "../ui/Icons";
import {
  calendarEventTypesStore,
  calendarEventKindsStore,
  calendarImpactScopesStore,
} from "../../utils/localStore";
import { useTenant } from "../../context/TenantContext";
import { fetchWithAuth } from "../../utils/authService";

const CATEGORY_OPTIONS = [
  { value: "WORKING_HOURS", label: "Working Hours (Shifts / Timings)" },
  { value: "ACADEMIC_EVENT", label: "Academic Event (Programs, Holidays, Exams)" },
];

const FREQUENCY_OPTIONS = [
  { value: "WEEKLY", label: "Every Week" },
  { value: "BIWEEKLY", label: "Every 2 Weeks" },
  { value: "MONTHLY", label: "Every Month" },
  { value: "YEARLY", label: "Annually (Every Year)" },
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

// 15 Curated Vibrant & Popular Event Colors
export const EVENT_COLORS = [
  { id: "emerald", label: "Emerald", hex: "#10b981" },
  { id: "indigo", label: "Indigo", hex: "#6366f1" },
  { id: "blue", label: "Blue", hex: "#3b82f6" },
  { id: "sky", label: "Sky", hex: "#0ea5e9" },
  { id: "cyan", label: "Cyan", hex: "#06b6d4" },
  { id: "teal", label: "Teal", hex: "#14b8a6" },
  { id: "violet", label: "Violet", hex: "#8b5cf6" },
  { id: "purple", label: "Purple", hex: "#a855f7" },
  { id: "fuchsia", label: "Fuchsia", hex: "#d946ef" },
  { id: "rose", label: "Rose", hex: "#f43f5e" },
  { id: "red", label: "Red", hex: "#ef4444" },
  { id: "orange", label: "Orange", hex: "#f97316" },
  { id: "amber", label: "Amber", hex: "#f59e0b" },
  { id: "lime", label: "Lime", hex: "#84cc16" },
  { id: "slate", label: "Slate", hex: "#64748b" },
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

export function UntilWhenPicker({
  until,
  untilDate,
  startDate,
  onChangeUntil,
  onChangeUntilDate,
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsMenuOpen(false);
        setIsCalendarOpen(false);
      }
    };
    if (isMenuOpen || isCalendarOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen, isCalendarOpen]);

  const handleSelectOngoing = () => {
    onChangeUntil("ONGOING");
    onChangeUntilDate("");
    setIsMenuOpen(false);
    setIsCalendarOpen(false);
  };

  const handleSelectSpecificDate = () => {
    onChangeUntil("DATE");
    if (!untilDate) {
      onChangeUntilDate(startDate || new Date().toISOString().split("T")[0]);
    }
    setIsMenuOpen(false);
    setIsCalendarOpen(true);
  };

  const handleToggle = () => {
    if (until === "DATE") {
      setIsCalendarOpen((prev) => !prev);
      setIsMenuOpen(false);
    } else {
      setIsMenuOpen((prev) => !prev);
      setIsCalendarOpen(false);
    }
  };

  const formatDateDisplay = (dStr) => {
    if (!dStr) return "";
    const [y, m, d] = String(dStr).split("-");
    return `${d}/${m}/${y ? y.slice(2) : ""}`;
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs font-semibold theme-text-secondary">Until</label>
        {until === "DATE" && (
          <button
            type="button"
            onClick={handleSelectOngoing}
            className="text-[10px] theme-accent hover:underline font-semibold cursor-pointer"
            title="Reset to Ongoing / Forever"
          >
            Reset to Ongoing
          </button>
        )}
      </div>

      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        className="w-full min-h-[42px] flex items-center justify-between px-3.5 py-2.5 rounded-xl theme-bg-sub border theme-border theme-text-primary text-sm font-semibold hover:theme-bg-elevated/60 focus:outline-none focus:border-[var(--accent-main)] focus:ring-1 focus:ring-[var(--accent-main)] transition-all duration-200 cursor-pointer select-none shadow-xs"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {until === "DATE" ? (
            <>
              <CalendarIcon className="w-4 h-4 theme-accent shrink-0" />
              <span className="truncate font-medium">
                {untilDate ? formatDateDisplay(untilDate) : "Select End Date"}
              </span>
            </>
          ) : (
            <span className="truncate font-medium">Ongoing</span>
          )}
        </div>
        <ChevronIcon isOpen={isMenuOpen || isCalendarOpen} className="w-3.5 h-3.5 theme-text-secondary shrink-0 ml-1" />
      </button>

      {/* Menu Dropdown when choosing between Ongoing and Specific Date */}
      {isMenuOpen && (
        <div className="absolute z-50 right-0 left-0 mt-1.5 p-1.5 theme-bg-surface border theme-border rounded-2xl shadow-2xl space-y-1 animate-fade-in select-none">
          <button
            type="button"
            onClick={handleSelectOngoing}
            className={`w-full text-left px-3 py-2 text-xs rounded-xl transition flex items-center justify-between cursor-pointer ${
              until === "ONGOING"
                ? "theme-bg-accent-soft theme-accent font-bold"
                : "hover:theme-bg-elevated theme-text-primary"
            }`}
          >
            <span>Ongoing</span>
            {until === "ONGOING" && <span className="text-xs font-bold">✓</span>}
          </button>

          <button
            type="button"
            onClick={handleSelectSpecificDate}
            className={`w-full text-left px-3 py-2 text-xs rounded-xl transition flex items-center justify-between cursor-pointer ${
              until === "DATE"
                ? "theme-bg-accent-soft theme-accent font-bold"
                : "hover:theme-bg-elevated theme-text-primary"
            }`}
          >
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-3.5 h-3.5 theme-accent" />
              <span>Specify date</span>
            </div>
          </button>
        </div>
      )}

      {/* Calendar Picker Popup (Directly below Until when?) */}
      {isCalendarOpen && (
        <div className="absolute z-50 right-0 mt-1.5 w-72 p-4 theme-bg-surface border theme-border rounded-2xl shadow-2xl space-y-3 animate-fade-in select-none">
          <ReusableCalendar
            isInline={true}
            selectedDate={untilDate || startDate || new Date().toISOString().split("T")[0]}
            minDate={startDate}
            onSelectDate={(newDate) => {
              onChangeUntil("DATE");
              onChangeUntilDate(newDate);
              setIsCalendarOpen(false);
            }}
          />
          <div className="pt-2 border-t theme-border flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={handleSelectOngoing}
              className="text-xs font-semibold theme-text-secondary hover:theme-text-primary cursor-pointer"
            >
              Reset to Ongoing
            </button>
            <button
              type="button"
              onClick={() => setIsCalendarOpen(false)}
              className="px-2.5 py-1 rounded-lg theme-bg-accent text-white text-xs font-bold cursor-pointer"
            >
              Done
            </button>
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
  formId = "time-schedule-drawer-form",
  onSave,
  onCancel,
}) {
  const { activeTenantId } = useTenant();
  const [eventTypes, setEventTypes] = useState([]);
  const [eventKinds, setEventKinds] = useState([]);
  const [impactScopes, setImpactScopes] = useState(() => calendarImpactScopesStore.getScopes(activeTenantId));
  const [availableRoles, setAvailableRoles] = useState(() => {
    try {
      const saved = localStorage.getItem("spr_local_roles_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return [
      { code: "TEACHER", name: "Teachers & Faculty" },
      { code: "STUDENT", name: "Students" },
      { code: "GUARDIAN", name: "Guardians & Parents" },
      { code: "STAFF", name: "General Staff" },
      { code: "ADMIN", name: "Administration" },
    ];
  });
  const colorScrollRef = useRef(null);

  // Enable mouse wheel horizontal scrolling on the event colors container
  useEffect(() => {
    const el = colorScrollRef.current;
    if (!el) return;
    const handleWheel = (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  // Fetch dynamic types, kinds, impact scopes, and user roles from backend API / active institution
  useEffect(() => {
    let isMounted = true;
    const loadTypes = () => {
      const types = calendarEventTypesStore.getEventTypes(activeTenantId);
      const kinds = calendarEventKindsStore.getKinds(activeTenantId);
      const scopes = calendarImpactScopesStore.getScopes(activeTenantId);
      if (isMounted) {
        setEventTypes(types || []);
        setEventKinds(kinds || []);
        setImpactScopes(scopes || []);
      }
    };
    loadTypes();

    const fetchRoles = async () => {
      try {
        let res = await fetchWithAuth("/api/v1/roles/");
        if (!res.ok) res = await fetchWithAuth("/api/roles/");
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.results || [];
          if (isMounted && list.length > 0) {
            setAvailableRoles(list);
            localStorage.setItem("spr_local_roles_v1", JSON.stringify(list));
            return;
          }
        }
      } catch {
        // Fallback to local store or defaults
      }
    };
    fetchRoles();

    window.addEventListener("spr_calendar_event_types_updated", loadTypes);
    window.addEventListener("spr_calendar_event_kinds_updated", loadTypes);
    window.addEventListener("spr_calendar_impact_scopes_updated", loadTypes);
    return () => {
      isMounted = false;
      window.removeEventListener("spr_calendar_event_types_updated", loadTypes);
      window.removeEventListener("spr_calendar_event_kinds_updated", loadTypes);
      window.removeEventListener("spr_calendar_impact_scopes_updated", loadTypes);
    };
  }, [activeTenantId]);

  const activeScopes = useMemo(() => {
    return (impactScopes || []).filter((s) => s.is_active !== false);
  }, [impactScopes]);

  // Dynamic Audience Options based on actual user roles in the institution
  const audienceOptions = useMemo(() => {
    const opts = [
      { value: "ALL", label: "All Roles (Public & Everyone)", badge: "ALL" },
    ];
    availableRoles.forEach((r) => {
      const code = r.code || r.name;
      const name = r.name || r.code;
      if (code && !opts.some((o) => o.value === code)) {
        opts.push({
          value: code,
          label: `${name} (${code})`,
          badge: code,
        });
      }
    });
    return opts;
  }, [availableRoles]);

  // Dynamic Impact Options based on Developer Tools System Impact Scopes
  const impactOptions = useMemo(() => {
    const opts = [
      { value: "ALL", label: "All Integrations (Entire System)", badge: "ALL" },
    ];
    const active = (impactScopes || []).filter((s) => s.is_active !== false);
    active.forEach((s) => {
      const code = s.id || s.code;
      const label = s.name || s.label || s.code;
      const badge = s.badge || s.code || s.name;
      if (code && !opts.some((o) => o.value === code)) {
        opts.push({
          value: code,
          label: label,
          badge: badge,
          description: s.description || "",
        });
      }
    });
    return opts;
  }, [impactScopes]);

  const normalizeImpacts = (rawList, scopes = []) => {
    if (!Array.isArray(rawList)) return ["ALL"];
    if (rawList.length === 0) return ["ALL"];
    if (rawList.includes("ALL")) return ["ALL"];
    return rawList.map((val) => {
      const str = String(val).toLowerCase();
      const matched = (scopes || []).find((s) => s.id === val || s.code === val || (s.code && s.code.toLowerCase() === str) || (s.id && s.id.toLowerCase() === str));
      return matched ? (matched.id || matched.code) : val;
    });
  };

  const [formData, setFormData] = useState(() => {
    if (event) {
      let initialAudience = ["ALL"];
      if (Array.isArray(event.audience)) {
        initialAudience = event.audience;
      } else if (typeof event.audience === "string" && event.audience.trim()) {
        initialAudience = event.audience.split(",").map((s) => s.trim()).filter(Boolean);
      }

      let rawImpacts = ["ALL"];
      if (event.impacts) {
        if (Array.isArray(event.impacts)) {
          rawImpacts = event.impacts;
        } else if (typeof event.impacts === "string" && event.impacts.trim()) {
          rawImpacts = event.impacts.split(",").map((s) => s.trim()).filter(Boolean);
        }
      }

      const initialImpacts = normalizeImpacts(rawImpacts, impactScopes);

      return {
        title: event.title || "",
        category: event.category || defaultCategory,
        audience: initialAudience.length > 0 ? initialAudience : ["ALL"],
        impacts: initialImpacts.length > 0 ? initialImpacts : ["ALL"],
        startDate: event.startDate || new Date().toISOString().split("T")[0],
        endDate: event.endDate || "",
        startTime: event.startTime || "09:00",
        endTime: event.endTime || "17:00",
        timezone: event.timezone || "Asia/Dhaka",
        repeats: Boolean(event.repeats),
        repeatDays: event.repeatDays || [0, 1, 2, 3, 4],
        frequency: event.frequency || "WEEKLY",
        until: event.until || (event.endDate ? "DATE" : "ONGOING"),
        untilDate: event.untilDate || event.endDate || "",
        isFullDay: Boolean(event.isFullDay || (!event.startTime && !event.endTime)),
        description: event.description || "",
        color: event.color || (defaultCategory === "WORKING_HOURS" ? "indigo" : "emerald"),
      };
    }
    return {
      title: defaultCategory === "WORKING_HOURS" ? "Morning Working Session" : "Mid-Term Examination",
      category: defaultCategory,
      audience: ["ALL"],
      impacts: ["ALL"],
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
      color: defaultCategory === "WORKING_HOURS" ? "indigo" : "emerald",
    };
  });

  const prevEventIdRef = useRef(event?.id);
  const prevInitialDateRef = useRef(initialDate);

  // Re-sync form state ONLY when event ID or target initial date actually changes
  useEffect(() => {
    if (event && (prevEventIdRef.current !== event.id || prevInitialDateRef.current !== initialDate)) {
      prevEventIdRef.current = event.id;
      prevInitialDateRef.current = initialDate;

      let initialAudience = ["ALL"];
      if (Array.isArray(event.audience)) {
        initialAudience = event.audience;
      } else if (typeof event.audience === "string" && event.audience.trim()) {
        initialAudience = event.audience.split(",").map((s) => s.trim()).filter(Boolean);
      }

      let rawImpacts = ["ALL"];
      if (event.impacts) {
        if (Array.isArray(event.impacts)) {
          rawImpacts = event.impacts;
        } else if (typeof event.impacts === "string" && event.impacts.trim()) {
          rawImpacts = event.impacts.split(",").map((s) => s.trim()).filter(Boolean);
        }
      }

      const initialImpacts = normalizeImpacts(rawImpacts, impactScopes);

      setFormData({
        title: event.title || "",
        category: event.category || defaultCategory,
        audience: initialAudience.length > 0 ? initialAudience : ["ALL"],
        impacts: initialImpacts.length > 0 ? initialImpacts : ["ALL"],
        startDate: event.startDate || new Date().toISOString().split("T")[0],
        endDate: event.endDate || "",
        startTime: event.startTime || "09:00",
        endTime: event.endTime || "17:00",
        timezone: event.timezone || "Asia/Dhaka",
        repeats: Boolean(event.repeats),
        repeatDays: event.repeatDays || [0, 1, 2, 3, 4],
        frequency: event.frequency || "WEEKLY",
        until: event.until || (event.endDate ? "DATE" : "ONGOING"),
        untilDate: event.untilDate || event.endDate || "",
        isFullDay: Boolean(event.isFullDay || (!event.startTime && !event.endTime)),
        description: event.description || "",
        color: event.color || (defaultCategory === "WORKING_HOURS" ? "indigo" : "emerald"),
      });
    }
  }, [event, initialDate, defaultCategory, impactScopes]);

  const eventTitleOptions = useMemo(() => {
    const kindsMap = {
      WORKING_HOURS: "Working Hours",
      ACADEMIC: "Academic",
      HOLIDAY: "Holiday",
      EXAM: "Exam",
      MEETING: "Meeting",
      ACTIVITY: "Sports & Cultural",
      GENERAL: "General",
    };
    (eventKinds || []).forEach((k) => {
      if (k.value || k.id) {
        kindsMap[k.value || k.id] = k.label || k.name || k.value;
      }
    });

    const active = (eventTypes || []).filter((et) => et.is_active !== false);
    const isWorkingHoursCategory = formData.category === "WORKING_HOURS";

    const filteredTypes = active.filter((et) => {
      const isWH = et.type === "WORKING_HOURS" || et.category === "WORKING_HOURS" || et.code?.includes("WORKING_SESSION");
      return isWorkingHoursCategory ? isWH : !isWH;
    });

    const baseList = filteredTypes.length > 0 ? filteredTypes : (
      isWorkingHoursCategory
        ? [
            { name: "Morning Working Session", type: "WORKING_HOURS" },
            { name: "Evening Support Session", type: "WORKING_HOURS" },
          ]
        : [
            { name: "Mid-Term Examination", type: "EXAM" },
            { name: "Final Term Examination", type: "EXAM" },
            { name: "Weekly Holiday", type: "HOLIDAY" },
            { name: "Eid Vacation", type: "HOLIDAY" },
            { name: "Annual Sports & Cultural Day", type: "ACTIVITY" },
            { name: "Parent-Teacher Conference", type: "MEETING" },
          ]
    );

    const opts = baseList.map((et) => {
      const typeLabel = kindsMap[et.type] || kindsMap[et.category] || (et.type ? et.type.replace(/_/g, " ") : (isWorkingHoursCategory ? "Working Hours" : "Academic Event"));
      return {
        value: et.name,
        label: et.name,
        typeLabel: typeLabel,
        category: et.type || (isWorkingHoursCategory ? "WORKING_HOURS" : "ACADEMIC_EVENT"),
      };
    });

    if (formData.title && !opts.some((o) => o.value === formData.title)) {
      opts.unshift({
        value: formData.title,
        label: formData.title,
        typeLabel: isWorkingHoursCategory ? "Working Hours" : "Academic Event",
        category: isWorkingHoursCategory ? "WORKING_HOURS" : "ACADEMIC_EVENT",
      });
    }
    return opts;
  }, [eventTypes, eventKinds, formData.title, formData.category]);

  const isRecurringOrMultiDay = Boolean(
    event && (event.repeats || (event.endDate && event.endDate !== event.startDate))
  );
  const effectiveTargetDate = initialDate || (event ? event.startDate : formData.startDate) || new Date().toISOString().split("T")[0];
  const [editScope, setEditScope] = useState("ALL_EVENTS"); // "ALL_EVENTS" | "THIS_EVENT" | "THIS_AND_FOLLOWING"

  const editScopeOptions = useMemo(() => {
    return [
      {
        value: "THIS_EVENT",
        label: `This day only (${effectiveTargetDate})`,
        description: "Applies only to this specific occurrence. Other days remain untouched.",
      },
      {
        value: "THIS_AND_FOLLOWING",
        label: "This and following days",
        description: `Applies from ${effectiveTargetDate} onwards. Preserves past attendance and history.`,
      },
      {
        value: "ALL_EVENTS",
        label: "All days in series",
        description: "Updates all occurrences across past, present, and future dates.",
      },
    ];
  }, [effectiveTargetDate]);

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
    const audienceString = Array.isArray(formData.audience)
      ? (formData.audience.length === 0 ? "ALL" : formData.audience.join(", "))
      : (formData.audience || "ALL");

    if (onSave) {
      onSave({
        ...formData,
        audience: audienceString,
        impacts: Array.isArray(formData.impacts) ? formData.impacts : (formData.impacts ? [formData.impacts] : ["ALL"]),
        id: event ? event.id : undefined,
        editScope: isRecurringOrMultiDay ? editScope : "ALL_EVENTS",
        targetDate: effectiveTargetDate,
        endDate: formData.until === "DATE" ? (formData.untilDate || formData.endDate) : "",
        startTime: formData.isFullDay ? "" : formData.startTime,
        endTime: formData.isFullDay ? "" : formData.endTime,
      });
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-1 flex-1 flex flex-col justify-between @container">
      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
          {/* Category & Dynamic Multi-Select Audience */}
          <div className="grid grid-cols-1 @[420px]:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold theme-text-secondary mb-1.5">Entry Purpose</label>
              <CustomSelect
                value={formData.category}
                onChange={(val) => {
                  const isWH = val === "WORKING_HOURS";
                  setFormData((prev) => ({ 
                    ...prev, 
                    category: val,
                    title: isWH ? "Morning Working Session" : "Mid-Term Examination",
                    color: isWH ? "indigo" : "emerald",
                    repeats: isWH ? true : prev.repeats,
                  }));
                }}
                options={CATEGORY_OPTIONS}
                placeholder="Select Category"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold theme-text-secondary mb-1.5">Target Audience (Roles)</label>
              <CustomSelect
                multiple={true}
                value={formData.audience}
                onChange={(val) => setFormData({ ...formData, audience: val })}
                options={audienceOptions}
                placeholder="Select Target Roles..."
              />
            </div>
          </div>

          {/* System Impact & Integration Multi-Select Dropdown */}
          <div>
            <label className="block text-xs font-semibold theme-text-secondary mb-1.5">System Impact & Integration</label>
            <CustomSelect
              multiple={true}
              value={formData.impacts}
              onChange={(val) => setFormData({ ...formData, impacts: val })}
              options={impactOptions}
              placeholder="Select Impacted Modules..."
              showDescription={true}
            />
          </div>

          {/* Schedule / Event Dropdown (Configured from Developer Tools) */}
          <div>
            <label className="block text-xs font-semibold theme-text-secondary mb-1.5">Schedule</label>
            <CustomSelect
              value={formData.title}
              onChange={(val) => {
                const matched = eventTitleOptions.find((o) => o.value === val);
                const isWH = matched?.category === "WORKING_HOURS" || formData.category === "WORKING_HOURS";
                setFormData((prev) => ({
                  ...prev,
                  title: val,
                  category: isWH ? "WORKING_HOURS" : "ACADEMIC_EVENT",
                  color: isWH ? "indigo" : (matched?.category === "HOLIDAY" ? "rose" : prev.color),
                }));
              }}
              options={eventTitleOptions}
              placeholder="Select Schedule / Event..."
            />
          </div>

          {/* Description / Notes (Placed above Date) */}
          <div>
            <label className="block text-xs font-semibold theme-text-secondary mb-1.5">
              Description
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add schedule details, agenda, instructions or remarks..."
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border theme-border theme-bg-sub theme-text-primary placeholder:theme-text-secondary focus:outline-none focus:ring-1 focus:ring-[var(--accent-main)] resize-none"
            />
          </div>

          {/* Date & Until when? Section (Clean inline 2 columns, calendar directly below Until when?) */}
          <div className="grid grid-cols-1 @[380px]:grid-cols-2 gap-3">
            <div>
              <ReusableCalendar
                label="Date"
                selectedDate={formData.startDate}
                onSelectDate={(newDate) => setFormData({ ...formData, startDate: newDate })}
              />
            </div>

            <div>
              <UntilWhenPicker
                until={formData.until}
                untilDate={formData.untilDate || formData.endDate}
                startDate={formData.startDate}
                onChangeUntil={(val) => setFormData((prev) => ({ ...prev, until: val }))}
                onChangeUntilDate={(val) => setFormData((prev) => ({ ...prev, untilDate: val, endDate: val }))}
              />
            </div>
          </div>

          {/* All Day Toggle Switch */}
          <div className="flex items-center justify-between p-3 rounded-xl border theme-border theme-bg-sub/50">
            <div>
              <div className="text-xs font-bold theme-text-primary">All day</div>
            </div>
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, isFullDay: !prev.isFullDay }))}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                formData.isFullDay ? "theme-bg-accent" : "bg-gray-300 dark:bg-gray-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  formData.isFullDay ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* From & To Time Pickers (Visible when NOT All Day) */}
          {!formData.isFullDay && (
            <div className="grid grid-cols-2 gap-3 animate-fade-in">
              <InlineTimePicker
                label="From"
                value={formData.startTime}
                onChange={(val) => setFormData({ ...formData, startTime: val })}
              />
              <InlineTimePicker
                label="To"
                value={formData.endTime}
                onChange={(val) => setFormData({ ...formData, endTime: val })}
              />
            </div>
          )}

          {/* 15 Curated Event Color Swatches (Single line with mouse-wheel horizontal scroll & no card background) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold theme-text-secondary">
                Event Color
              </label>
              <span className="text-[10px] font-mono theme-text-secondary capitalize">
                {formData.color || "Default"}
              </span>
            </div>
            <div 
              ref={colorScrollRef}
              className="flex items-center gap-3 py-1.5 px-0.5 overflow-x-auto scrollbar-none select-none cursor-grab active:cursor-grabbing"
            >
              {EVENT_COLORS.map((col) => {
                const isSelected = formData.color === col.id;
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: col.id })}
                    style={{ backgroundColor: col.hex }}
                    className={`w-7 h-7 shrink-0 rounded-full transition-all cursor-pointer flex items-center justify-center relative ${
                      isSelected
                        ? "ring-2 ring-offset-2 ring-offset-[var(--bg-surface)] ring-[var(--accent-main)] scale-110 shadow-sm"
                        : "hover:scale-105 opacity-80 hover:opacity-100"
                    }`}
                    title={col.label}
                  >
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-white shadow-xs" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Repeats Toggle Switch (Matches All Day Toggle Design) */}
          <div className="flex items-center justify-between p-3 rounded-xl border theme-border theme-bg-sub/50">
            <div>
              <div className="text-xs font-bold theme-text-primary">Repeats</div>
            </div>
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, repeats: !prev.repeats }))}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                formData.repeats ? "theme-bg-accent" : "bg-gray-300 dark:bg-gray-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  formData.repeats ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Recurrence Options */}
          {formData.repeats && (
            <div className="space-y-3.5 pt-1 animate-fade-in">
              {/* What days? Circular day selector */}
              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1.5">Days</label>
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

              {/* How often */}
              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1.5">Repeat</label>
                <CustomSelect
                  value={formData.frequency}
                  onChange={(val) => setFormData({ ...formData, frequency: val })}
                  options={FREQUENCY_OPTIONS}
                  placeholder="Select How Often"
                />
              </div>
            </div>
          )}

          {/* Apply Changes To Dropdown (Standard Reusable CustomSelect) */}
          {isRecurringOrMultiDay && (
            <div className="pt-2 animate-fade-in">
              <label className="block text-xs font-semibold theme-text-secondary mb-1.5">
                Apply Changes To
              </label>
              <CustomSelect
                value={editScope}
                onChange={(val) => setEditScope(val)}
                options={editScopeOptions}
                placeholder="Select update scope..."
                showDescription={true}
                direction="auto"
              />
            </div>
          )}

        {/* Bottom Action Buttons (Normal scrolling with content, not sticky) */}
        <div className="pt-4 border-t theme-border flex items-center justify-end gap-2.5">
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
