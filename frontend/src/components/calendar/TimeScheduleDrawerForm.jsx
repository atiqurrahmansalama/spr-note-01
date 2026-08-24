import React, { useState, useMemo, useEffect, useRef } from "react";
import CustomSelect from "../ui/CustomSelect";
import CustomInput from "../ui/CustomInput";
import TimezoneSelect from "../selectors/TimezoneSelect";
import ReusableCalendar from "../common/ReusableCalendar";
import {
  SaveIcon,
  CloseIcon,
  ChevronIcon,
  CalendarIcon,
  CheckIcon,
} from "../ui/Icons";
import {
  calendarEventTypesStore,
  calendarEventKindsStore,
  calendarImpactScopesStore,
  calendarWorkingSchedulesStore,
  masterCalendarStore,
  getDynamicPriorityRankOptions,
} from "../../utils/localStore";
import { useTenant } from "../../context/TenantContext";
import { fetchWithAuth } from "../../utils/authService";
import { DrawerContainer } from "../layout";

const CATEGORY_OPTIONS = [
  { value: "WORKING_HOURS", label: "Add a Working Schedule" },
  { value: "ACADEMIC_EVENT", label: "Add an Academic Event" },
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

// Curated Vibrant & Soft Pastel Event Colors
export const EVENT_COLORS = [
  // Soft & Light Pastel Colors
  { id: "mint", label: "Soft Mint", hex: "#6ee7b7", group: "Pastel" },
  { id: "lavender", label: "Soft Lavender", hex: "#c4b5fd", group: "Pastel" },
  { id: "peach", label: "Soft Peach", hex: "#fdba74", group: "Pastel" },
  { id: "coral", label: "Soft Coral", hex: "#fca5a5", group: "Pastel" },
  { id: "sage", label: "Soft Sage", hex: "#86efac", group: "Pastel" },
  { id: "ice", label: "Ice Blue", hex: "#7dd3fc", group: "Pastel" },
  { id: "sand", label: "Warm Sand", hex: "#cbd5e1", group: "Pastel" },
  { id: "pink", label: "Soft Pink", hex: "#f472b6", group: "Pastel" },
  { id: "cream", label: "Amber Cream", hex: "#fde68a", group: "Pastel" },

  // Standard Vibrant Colors
  { id: "indigo", label: "Indigo", hex: "#6366f1", group: "Vibrant" },
  { id: "emerald", label: "Emerald", hex: "#10b981", group: "Vibrant" },
  { id: "blue", label: "Sky Blue", hex: "#3b82f6", group: "Vibrant" },
  { id: "teal", label: "Teal", hex: "#14b8a6", group: "Vibrant" },
  { id: "cyan", label: "Cyan", hex: "#06b6d4", group: "Vibrant" },
  { id: "purple", label: "Purple", hex: "#a855f7", group: "Vibrant" },
  { id: "violet", label: "Violet", hex: "#8b5cf6", group: "Vibrant" },
  { id: "fuchsia", label: "Fuchsia", hex: "#d946ef", group: "Vibrant" },
  { id: "rose", label: "Rose", hex: "#f43f5e", group: "Vibrant" },
  { id: "red", label: "Red", hex: "#ef4444", group: "Vibrant" },
  { id: "orange", label: "Orange", hex: "#f97316", group: "Vibrant" },
  { id: "amber", label: "Amber", hex: "#f59e0b", group: "Vibrant" },
  { id: "lime", label: "Lime", hex: "#84cc16", group: "Vibrant" },
  { id: "slate", label: "Slate Gray", hex: "#64748b", group: "Vibrant" },
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
      {label && (
        <label className="block text-xs font-bold uppercase tracking-wider theme-text-secondary mb-2">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-2xl border theme-border theme-bg-sub hover:theme-bg-elevated transition focus:outline-none focus:border-[var(--accent-main)] focus:ring-1 focus:ring-[var(--accent-main)] cursor-pointer"
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
      <div className="flex items-center justify-between mb-2">
        <label className="block text-xs font-bold uppercase tracking-wider theme-text-secondary">Until</label>
        {until === "DATE" && (
          <button
            type="button"
            onClick={handleSelectOngoing}
            className="text-[10px] theme-accent hover:underline font-semibold cursor-pointer uppercase tracking-wider"
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
        className="w-full min-h-[46px] flex items-center justify-between px-3.5 py-2.5 rounded-2xl theme-bg-sub border theme-border theme-text-primary text-xs sm:text-sm font-semibold hover:theme-bg-elevated focus:outline-none focus:border-[var(--accent-main)] focus:ring-1 focus:ring-[var(--accent-main)] transition-all duration-200 cursor-pointer select-none shadow-2xs"
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

export function EventColorPickerDropdown({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedColor = useMemo(() => {
    return EVENT_COLORS.find((c) => c.id === value) || EVENT_COLORS[0];
  }, [value]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-xs font-bold uppercase tracking-wider theme-text-secondary">
          Event Color
        </label>
        <span className="text-[10px] font-mono theme-text-secondary font-semibold">
          {selectedColor.label}
        </span>
      </div>

      {/* Default Single Visible Color Card */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl border transition cursor-pointer text-left focus:outline-none ${
          isOpen
            ? "theme-border border-[var(--accent-main)] theme-bg-sub shadow-xs"
            : "theme-border theme-bg-sub hover:border-[var(--accent-main)]/50"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="w-4 h-4 rounded-full shrink-0 shadow-xs border border-white/20"
            style={{ backgroundColor: selectedColor.hex }}
          />
          <span className="text-xs font-semibold theme-text-primary truncate">
            {selectedColor.label}
          </span>
          <span className="text-[10px] font-mono theme-text-secondary">
            ({selectedColor.hex})
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md theme-bg-surface border theme-border theme-text-secondary">
            {isOpen ? "Close" : "Change"}
          </span>
          <ChevronIcon isOpen={isOpen} className="w-3.5 h-3.5 theme-text-secondary" />
        </div>
      </button>

      {/* Expanded Color Palette with Color Names */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1.5 p-3 rounded-2xl theme-bg-surface border theme-border shadow-2xl space-y-3 animate-fade-in max-h-72 overflow-y-auto">
          {/* Soft & Light Pastel Colors */}
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider theme-text-secondary block mb-1.5 px-0.5">
              Soft & Light Pastel
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {EVENT_COLORS.filter((c) => c.group === "Pastel").map((col) => {
                const isSelected = selectedColor.id === col.id;
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => {
                      onChange(col.id);
                      setIsOpen(false);
                    }}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-left transition cursor-pointer ${
                      isSelected
                        ? "theme-bg-accent-soft theme-accent border-[var(--accent-main)]/60 font-bold shadow-xs"
                        : "theme-bg-sub/40 hover:theme-bg-sub border-transparent hover:border theme-border theme-text-primary"
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs border border-white/20"
                      style={{ backgroundColor: col.hex }}
                    />
                    <span className="text-[11px] font-medium truncate flex-1">{col.label}</span>
                    {isSelected && <CheckIcon className="w-3 h-3 theme-accent shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Standard Vibrant Colors */}
          <div className="pt-2 border-t theme-border">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider theme-text-secondary block mb-1.5 px-0.5">
              Standard Vibrant
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {EVENT_COLORS.filter((c) => c.group === "Vibrant").map((col) => {
                const isSelected = selectedColor.id === col.id;
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => {
                      onChange(col.id);
                      setIsOpen(false);
                    }}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-left transition cursor-pointer ${
                      isSelected
                        ? "theme-bg-accent-soft theme-accent border-[var(--accent-main)]/60 font-bold shadow-xs"
                        : "theme-bg-sub/40 hover:theme-bg-sub border-transparent hover:border theme-border theme-text-primary"
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs border border-white/20"
                      style={{ backgroundColor: col.hex }}
                    />
                    <span className="text-[11px] font-medium truncate flex-1">{col.label}</span>
                    {isSelected && <CheckIcon className="w-3 h-3 theme-accent shrink-0" />}
                  </button>
                );
              })}
            </div>
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
  const [eventTypes, setEventTypes] = useState(() => calendarEventTypesStore.getEventTypes(activeTenantId));
  const [eventKinds, setEventKinds] = useState(() => calendarEventKindsStore.getKinds(activeTenantId));
  const [workingSchedules, setWorkingSchedules] = useState(() => calendarWorkingSchedulesStore.getSchedules(activeTenantId));
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

  // Fetch dynamic types, kinds, working schedules, impact scopes, and user roles from backend API / active institution
  useEffect(() => {
    let isMounted = true;
    const loadTypes = () => {
      const types = calendarEventTypesStore.getEventTypes(activeTenantId);
      const kinds = calendarEventKindsStore.getKinds(activeTenantId);
      const scopes = calendarImpactScopesStore.getScopes(activeTenantId);
      const schedules = calendarWorkingSchedulesStore.getSchedules(activeTenantId);
      if (isMounted) {
        setEventTypes(types || []);
        setEventKinds(kinds || []);
        setImpactScopes(scopes || []);
        setWorkingSchedules(schedules || []);
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
    window.addEventListener("spr_calendar_working_schedules_updated", loadTypes);
    window.addEventListener("spr_calendar_impact_scopes_updated", loadTypes);
    return () => {
      isMounted = false;
      window.removeEventListener("spr_calendar_event_types_updated", loadTypes);
      window.removeEventListener("spr_calendar_event_kinds_updated", loadTypes);
      window.removeEventListener("spr_calendar_working_schedules_updated", loadTypes);
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

  const calendarEvents = useMemo(() => {
    return masterCalendarStore.getEvents(activeTenantId) || [];
  }, [activeTenantId]);

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
        priorityRank: event.priorityRank !== undefined && event.priorityRank !== null
          ? Number(event.priorityRank)
          : (event.rank !== undefined ? Number(event.rank) : 1),
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
    const initialEventsList = masterCalendarStore.getEvents(activeTenantId) || [];
    return {
      title: defaultCategory === "WORKING_HOURS" ? "Morning Working Session" : "Mid-Term Examination",
      category: defaultCategory,
      audience: ["ALL"],
      impacts: ["ALL"],
      priorityRank: initialEventsList.length + 1,
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

  const priorityRankOptions = useMemo(() => {
    return getDynamicPriorityRankOptions(calendarEvents, event?.id, formData.priorityRank);
  }, [calendarEvents, event?.id, formData.priorityRank]);

  const prevEventIdRef = useRef(event?.id);
  const prevInitialDateRef = useRef(initialDate);

  // Re-sync form state when event or target initial date changes
  useEffect(() => {
    if (event) {
      if (prevEventIdRef.current !== event.id || prevInitialDateRef.current !== initialDate) {
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
          priorityRank: event.priorityRank !== undefined && event.priorityRank !== null
            ? Number(event.priorityRank)
            : (event.rank !== undefined ? Number(event.rank) : 1),
          startDate: event.startDate || initialDate || new Date().toISOString().split("T")[0],
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
    } else {
      // Add mode: sync initialDate if it changes
      if (initialDate && prevInitialDateRef.current !== initialDate) {
        prevInitialDateRef.current = initialDate;
        setFormData((prev) => ({
          ...prev,
          startDate: initialDate,
        }));
      }
    }
  }, [event, initialDate, defaultCategory, impactScopes]);

  const eventTitleOptions = useMemo(() => {
    const isWorkingHoursCategory = formData.category === "WORKING_HOURS";

    if (isWorkingHoursCategory) {
      const activeSchedules = (workingSchedules || []).filter((ws) => ws.is_active !== false);
      const baseList = activeSchedules.length > 0 ? activeSchedules : [
        { name: "Morning Working Session", description: "Standard morning operational shifts and faculty hours" },
        { name: "Afternoon Working Session", description: "Staff & faculty afternoon working hours" },
        { name: "Evening Support Session", description: "Evening tutorial, revision, and support hours" },
      ];

      const opts = baseList.map((ws) => ({
        id: ws.id,
        value: ws.name,
        label: ws.name,
        typeLabel: "Working Hours",
        category: "WORKING_HOURS",
        type: "WORKING_HOURS",
        color: "indigo",
        repeats: true,
        description: ws.description || "",
      }));

      if (formData.title && !opts.some((o) => o.value === formData.title)) {
        opts.unshift({
          value: formData.title,
          label: formData.title,
          typeLabel: "Working Hours",
          category: "WORKING_HOURS",
          type: "WORKING_HOURS",
          color: "indigo",
          repeats: true,
        });
      }
      return opts;
    }

    // Dynamic Academic Event Categories from Developer Tools
    const kindsMap = {
      ACADEMIC: "Academic",
      HOLIDAY: "Holiday",
      EXAM: "Exam",
      MEETING: "Meeting",
      ACTIVITY: "Sports & Cultural",
      GENERAL: "General",
    };
    const kindsColorMap = {
      ACADEMIC: "emerald",
      HOLIDAY: "rose",
      EXAM: "amber",
      MEETING: "blue",
      ACTIVITY: "purple",
      GENERAL: "slate",
    };

    (eventKinds || []).forEach((k) => {
      const key = k.value || k.id;
      if (key) {
        kindsMap[key] = k.label || k.name || key;
        if (k.color) kindsColorMap[key] = k.color;
      }
    });

    const activeEvents = (eventTypes || []).filter((et) => et.is_active !== false);
    const baseList = activeEvents.length > 0 ? activeEvents : [
      { name: "Mid-Term Examination", type: "EXAM", description: "Formal mid-term evaluation & exam schedule" },
      { name: "Final Term Examination", type: "EXAM", description: "Annual and final institutional examinations" },
      { name: "Weekly Holiday", type: "HOLIDAY", description: "Standard weekend institutional recess" },
      { name: "Eid Vacation", type: "HOLIDAY", description: "Special holiday closure for holy Eid celebration" },
      { name: "Annual Sports & Cultural Day", type: "ACTIVITY", description: "Annual athletic competitions and campus gathering" },
      { name: "Parent-Teacher Conference", type: "MEETING", description: "Quarterly progress review meetings with guardians" },
      { name: "Special Academic Event", type: "ACADEMIC", description: "Institutional conferences, orientation, and symposiums" },
    ];

    const opts = baseList.map((et) => {
      const rawType = et.type || et.category || "ACADEMIC";
      const typeLabel = kindsMap[rawType] || (rawType ? rawType.replace(/_/g, " ") : "Academic Event");
      const dynamicColor = kindsColorMap[rawType] || "emerald";

      return {
        id: et.id,
        value: et.name,
        label: et.name,
        typeLabel,
        category: "ACADEMIC_EVENT",
        type: rawType,
        color: dynamicColor,
        description: et.description || "",
      };
    });

    if (formData.title && !opts.some((o) => o.value === formData.title)) {
      opts.unshift({
        value: formData.title,
        label: formData.title,
        typeLabel: "Academic Event",
        category: "ACADEMIC_EVENT",
        type: "ACADEMIC",
        color: "emerald",
      });
    }
    return opts;
  }, [workingSchedules, eventTypes, eventKinds, formData.title, formData.category]);

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
        label: `This and all following days (from ${effectiveTargetDate})`,
        description: "Preserves earlier historical records and applies modifications to future dates.",
      },
      {
        value: "ALL_EVENTS",
        label: "Entire recurring schedule series",
        description: "Applies changes to all past, present, and future recurring dates in this schedule.",
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

    if (!formData.title.trim()) {
      alert("Please enter or select a schedule/event title");
      return;
    }
    if (!formData.startDate) {
      alert("Please specify a start date");
      return;
    }

    const audienceString = Array.isArray(formData.audience)
      ? (formData.audience.length === 0 ? "ALL" : formData.audience.join(", "))
      : (formData.audience || "ALL");

    if (onSave) {
      onSave({
        ...formData,
        priorityRank: Number(formData.priorityRank) || 1,
        audience: audienceString,
        impacts: Array.isArray(formData.impacts) ? formData.impacts : (formData.impacts ? [formData.impacts] : ["ALL"]),
        id: event ? event.id : undefined,
        targetDate: effectiveTargetDate,
        editScope: isRecurringOrMultiDay ? editScope : "ALL_EVENTS",
        endDate: formData.until === "DATE" ? (formData.untilDate || formData.endDate) : "",
        startTime: formData.isFullDay ? "" : formData.startTime,
        endTime: formData.isFullDay ? "" : formData.endTime,
      });
    }
  };

  return (
    <DrawerContainer padding="normal" spacing="normal">
      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
          {/* Category & Dynamic Multi-Select Audience */}
          <div className="grid grid-cols-1 @[420px]:grid-cols-2 gap-3">
            <div>
              <CustomSelect
                label="Entry Purpose"
                value={formData.category}
                onChange={(val) => {
                  const isWH = val === "WORKING_HOURS";
                  const defaultTitle = isWH
                    ? (workingSchedules?.[0]?.name || "Morning Working Session")
                    : (eventTypes?.[0]?.name || "Mid-Term Examination");
                  setFormData((prev) => ({ 
                    ...prev, 
                    category: val,
                    title: defaultTitle,
                    color: isWH ? "indigo" : "emerald",
                    repeats: isWH ? true : prev.repeats,
                  }));
                }}
                options={CATEGORY_OPTIONS}
                placeholder="Select Category"
              />
            </div>

            <div>
              <CustomSelect
                label="Target Audience (Roles)"
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
            <CustomSelect
              label="System Impact & Integration"
              multiple={true}
              value={formData.impacts}
              onChange={(val) => setFormData({ ...formData, impacts: val })}
              options={impactOptions}
              placeholder="Select Impacted Modules..."
              showDescription={true}
            />
          </div>

          {/* Priority & Precedence Rank (Dynamic selection based on existing calendar items) */}
          <div>
            <CustomSelect
              label="Priority Rank"
              value={formData.priorityRank || 1}
              onChange={(val) => setFormData({ ...formData, priorityRank: Number(val) })}
              options={priorityRankOptions}
              placeholder="Select Priority Rank..."
              showDescription={true}
              direction="auto"
            />
          </div>

          {/* Schedule / Event Dropdown (Configured from Developer Tools) */}
          <div>
            <CustomSelect
              label="Schedule / Event"
              value={formData.title}
              onChange={(val) => {
                const matched = eventTitleOptions.find((o) => o.value === val);
                if (matched) {
                  setFormData((prev) => ({
                    ...prev,
                    title: matched.value,
                    type: matched.type,
                    category: matched.category,
                    color: matched.color || prev.color,
                    repeats: matched.repeats !== undefined ? matched.repeats : prev.repeats,
                  }));
                } else {
                  setFormData((prev) => ({ ...prev, title: val }));
                }
              }}
              options={eventTitleOptions}
              placeholder="Select Schedule / Event..."
              searchable={true}
              showDescription={true}
            />
          </div>

          {/* Description / Notes (Placed above Date) */}
          <div>
            <CustomInput
              type="textarea"
              label="Description"
              optional
              rows={2}
              value={formData.description}
              onChange={(val) => setFormData({ ...formData, description: val })}
              placeholder="Add schedule details, agenda, instructions or remarks..."
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

          {/* Event Color Picker Dropdown with Single Visible Default & Expandable Palette */}
          <EventColorPickerDropdown
            value={formData.color}
            onChange={(val) => setFormData({ ...formData, color: val })}
          />

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
                <label className="block text-xs font-bold uppercase tracking-wider theme-text-secondary mb-2">Days</label>
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
                <CustomSelect
                  label="Repeat"
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
              <CustomSelect
                label="Apply Changes To"
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
    </DrawerContainer>
  );
}
