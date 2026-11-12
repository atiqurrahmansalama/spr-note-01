import React, { useState, useMemo, useEffect, useRef } from "react";
import CustomSelect from "../../../../components/ui/CustomSelect";
import CustomInput from "../../../../components/ui/CustomInput";
import CustomButton from "../../../../components/ui/CustomButton";
import {
  SaveIcon,
  ChevronIcon,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  ShapesIcon,
  UsersIcon,
} from "../../../../components/ui/Icons";
import ReusableCalendar from "../../../../components/common/ReusableCalendar";
import {
  calendarEventTypesStore,
  calendarEventKindsStore,
  calendarImpactScopesStore,
  calendarWorkingSchedulesStore,
  masterCalendarStore,
  calendarSettings,
  getDynamicPriorityRankOptions,
} from "../../../../utils/localStore";
import { useTenant } from "../../../../context/TenantContext";
import { useToast } from "../../../../context/ToastContext";
import { fetchWithAuth } from "../../../../utils/authService";
import { DrawerContainer } from "../../../../components/layout";
import { EVENT_COLORS, EVENT_COLOR_CATEGORIES, resolveCanonicalEventColor } from "../constants/eventColors";
import { useCalendarTranslation } from "../locales";

export { EVENT_COLORS };

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
        className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-2xl border-0 theme-bg-surface hover:theme-bg-elevated/50 transition focus:outline-none cursor-pointer shadow-xs"
      >
        <span className={value ? "font-medium font-mono theme-text-primary" : "theme-text-secondary"}>
          {value ? formatTime12(value) : placeholder}
        </span>
        <ChevronIcon className={`w-3.5 h-3.5 theme-text-secondary transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-50 p-2 rounded-2xl theme-bg-surface border-0 shadow-xl animate-fade-in flex gap-1.5 w-48">
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
                className={`w-full py-1 text-xs rounded-md font-mono transition text-center cursor-pointer border-0 ${
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
          <div className="flex-1 max-h-40 overflow-y-auto scrollbar-none px-1 space-y-0.5 border-0">
            {minutesList.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setSelMinute(m);
                  commitTime(selHour, m, selPeriod);
                }}
                className={`w-full py-1 text-xs rounded-md font-mono transition text-center cursor-pointer border-0 ${
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
          <div className="w-11 max-h-40 overflow-y-auto scrollbar-none pl-1 space-y-1 border-0 flex flex-col justify-center">
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

  const { t } = useCalendarTranslation();

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-xs font-bold uppercase tracking-wider theme-text-secondary">
          {t("untilWhen", "Until when?")}
        </label>
        {until === "DATE" && (
          <button
            type="button"
            onClick={handleSelectOngoing}
            className="text-[10px] theme-accent hover:underline font-semibold cursor-pointer uppercase tracking-wider"
            title={t("resetToOngoing", "Reset to Ongoing")}
          >
            {t("resetToOngoing", "Reset to Ongoing")}
          </button>
        )}
      </div>

      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        className="w-full min-h-[46px] flex items-center justify-between px-3.5 py-2.5 rounded-2xl theme-bg-surface border-0 theme-text-primary text-xs sm:text-sm font-semibold hover:theme-bg-elevated/40 focus:outline-none transition-all duration-200 cursor-pointer select-none shadow-xs"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {until === "DATE" ? (
            <>
              <CalendarIcon className="w-4 h-4 theme-accent shrink-0" />
              <span className="truncate font-medium">
                {untilDate ? formatDateDisplay(untilDate) : t("specifyDate", "Specify date")}
              </span>
            </>
          ) : (
            <span className="truncate font-medium">{t("ongoing", "Ongoing")}</span>
          )}
        </div>
        <ChevronIcon isOpen={isMenuOpen || isCalendarOpen} className="w-3.5 h-3.5 theme-text-secondary shrink-0 ml-1" />
      </button>

      {/* Menu Dropdown when choosing between Ongoing and Specific Date */}
      {isMenuOpen && (
        <div className="absolute z-50 right-0 left-0 mt-1.5 p-1.5 theme-bg-surface border-0 rounded-2xl shadow-xl space-y-1 animate-fade-in select-none">
          <button
            type="button"
            onClick={handleSelectOngoing}
            className={`w-full text-left px-3 py-2 text-xs rounded-xl transition flex items-center justify-between cursor-pointer border-0 ${
              until === "ONGOING"
                ? "bg-[var(--accent-main)]/15 dark:bg-[var(--accent-main)]/25 theme-accent font-bold"
                : "theme-bg-app hover:theme-bg-elevated/40 theme-text-primary"
            }`}
          >
            <span>{t("ongoing", "Ongoing")}</span>
            {until === "ONGOING" && (
              <span className="w-4 h-4 rounded-full theme-bg-accent theme-accent-text flex items-center justify-center shadow-xs shrink-0">
                <CheckIcon className="w-2.5 h-2.5" />
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={handleSelectSpecificDate}
            className={`w-full text-left px-3 py-2 text-xs rounded-xl transition flex items-center justify-between cursor-pointer border-0 ${
              until === "DATE"
                ? "bg-[var(--accent-main)]/15 dark:bg-[var(--accent-main)]/25 theme-accent font-bold"
                : "theme-bg-app hover:theme-bg-elevated/40 theme-text-primary"
            }`}
          >
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-3.5 h-3.5 theme-accent" />
              <span>{t("specifyDate", "Specify date")}</span>
            </div>
            {until === "DATE" && (
              <span className="w-4 h-4 rounded-full theme-bg-accent theme-accent-text flex items-center justify-center shadow-xs shrink-0">
                <CheckIcon className="w-2.5 h-2.5" />
              </span>
            )}
          </button>
        </div>
      )}

      {/* Calendar Picker Popup (Directly below Until when?) */}
      {isCalendarOpen && (
        <div className="absolute z-50 right-0 mt-1.5 w-72 p-4 theme-bg-surface border-0 rounded-2xl shadow-xl space-y-3 animate-fade-in select-none">
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
          <div className="pt-2 border-0 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={handleSelectOngoing}
              className="text-xs font-semibold theme-text-secondary hover:theme-text-primary cursor-pointer"
            >
              {t("resetToOngoing", "Reset to Ongoing")}
            </button>
            <CustomButton
              type="button"
              variant="primary"
              size="xs"
              onClick={() => setIsCalendarOpen(false)}
            >
              {t("done", "Done")}
            </CustomButton>
          </div>
        </div>
      )}
    </div>
  );
}

export function EventColorPickerDropdown({ value, onChange }) {
  const { t } = useCalendarTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef(null);

  const canonicalId = resolveCanonicalEventColor(value, EVENT_COLORS[0].id);
  const selectedColor = useMemo(() => {
    return EVENT_COLORS.find((c) => c.id === canonicalId) || EVENT_COLORS[0];
  }, [canonicalId]);

  const filteredColors = useMemo(() => {
    let list = EVENT_COLORS;
    if (activeCategory !== "All") {
      list = list.filter((c) => c.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.label.toLowerCase().includes(q) ||
          c.hex.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeCategory, searchQuery]);

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
          {t("eventColor", "Event Color")}
        </label>
        <span className="text-[10px] font-mono theme-text-secondary font-semibold">
          {selectedColor.hex}
        </span>
      </div>

      {/* Selected Event Color Trigger Card */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl border-0 ring-0 transition cursor-pointer text-left focus:outline-none shadow-xs ${
          isOpen
            ? "bg-[var(--accent-main)]/15 dark:bg-[var(--accent-main)]/25"
            : "theme-bg-surface hover:theme-bg-elevated/40"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="w-5 h-5 rounded-full shrink-0 shadow-xs border-0"
            style={{ backgroundColor: selectedColor.hex }}
          />
          <span className="text-xs font-semibold theme-text-primary truncate">
            {selectedColor.label}
          </span>
          <span className="text-[10px] font-mono theme-text-secondary">
            {selectedColor.hex}
          </span>
          {selectedColor.category && (
            <span className="hidden @[440px]:inline-block text-[9px] px-2 py-0.5 rounded-full theme-bg-app border-0 theme-text-secondary truncate">
              {selectedColor.category}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-lg theme-bg-app border-0 theme-text-secondary">
            {isOpen ? t("close", "Close") : t("chooseColor", "Change")}
          </span>
          <ChevronIcon isOpen={isOpen} className="w-3.5 h-3.5 theme-text-secondary" />
        </div>
      </button>

      {/* Borderless Curated Enterprise Palette Dropdown */}
      {isOpen && (
        <div className="mt-2 p-3 rounded-3xl theme-bg-surface border-0 ring-0 shadow-lg animate-fade-in space-y-3 z-30">
          
          {/* Top Quick Search Bar */}
          <div className="w-full">
            <CustomInput
              type="search"
              size="sm"
              variant="app"
              placeholder={t("searchColors", "Search color or HEX...")}
              value={searchQuery}
              onChange={(val) => setSearchQuery(val)}
              clearable={true}
            />
          </div>

          {/* Color Family Category Pills */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5 -mx-1 px-1">
            {EVENT_COLOR_CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-bold whitespace-nowrap transition cursor-pointer border-0 ring-0 shrink-0 select-none ${
                    isActive
                      ? "theme-bg-accent text-white shadow-xs"
                      : "theme-bg-app hover:theme-bg-elevated/60 theme-text-secondary hover:theme-text-primary"
                  }`}
                >
                  {cat === "All" ? t("allColors", "All") : cat}
                </button>
              );
            })}
          </div>

          {/* Color Swatch Grid */}
          <div className="grid grid-cols-1 @[420px]:grid-cols-2 @[560px]:grid-cols-3 gap-1.5 max-h-64 overflow-y-auto scrollbar-none pr-0.5">
            {filteredColors.map((col) => {
              const isSelected = selectedColor.id === col.id;
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => {
                    onChange(col.id);
                    setIsOpen(false);
                  }}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-2xl border-0 ring-0 text-left transition cursor-pointer ${
                    isSelected
                      ? "bg-[var(--accent-main)]/15 dark:bg-[var(--accent-main)]/25 theme-accent font-bold"
                      : "theme-bg-app hover:theme-bg-elevated/60 theme-text-primary"
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full shrink-0 shadow-xs border-0"
                    style={{ backgroundColor: col.hex }}
                  />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[11px] font-medium truncate leading-tight">
                      {col.label}
                    </span>
                    <span className="text-[9px] font-mono theme-text-secondary leading-tight opacity-75">
                      {col.hex}
                    </span>
                  </div>
                  {isSelected && (
                    <span className="w-4 h-4 rounded-full theme-bg-accent theme-accent-text flex items-center justify-center shadow-xs shrink-0">
                      <CheckIcon className="w-2.5 h-2.5" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {filteredColors.length === 0 && (
            <div className="py-6 text-center text-xs theme-text-secondary">
              No matching colors found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function resolveEventFormColor(evt, targetCategory, kinds = [], types = []) {
  if (evt?.color) {
    return resolveCanonicalEventColor(evt.color);
  }
  const matchedType = (types || []).find(
    (t) => t.id === evt?.eventTypeId || t.name === evt?.title || t.code === evt?.code
  );
  const rawType = matchedType?.type || evt?.type || evt?.event_type || evt?.kind || evt?.category || targetCategory;
  if (rawType) {
    const matchedKind = (kinds || []).find(
      (k) => k.value === rawType || k.id === rawType || String(k.value).toUpperCase() === String(rawType).toUpperCase()
    );
    if (matchedKind?.color) {
      return resolveCanonicalEventColor(matchedKind.color);
    }
  }
  if (rawType === "WORKING_HOURS" || targetCategory === "WORKING_HOURS") return "blueberry";
  if (rawType === "HOLIDAY") return "radicchio";
  if (rawType === "EXAM") return "flamingo";
  if (rawType === "MEETING") return "peacock";
  if (rawType === "ACTIVITY") return "amethyst";
  if (rawType === "GENERAL") return "cocoa";
  return "eucalyptus";
}

export interface TimeScheduleFormData {
  title: string;
  category: string;
  type?: string;
  eventTypeId?: string;
  audience: string[];
  impacts: string[];
  priorityRank: number;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  timezone: string;
  repeats: boolean;
  repeatDays: number[];
  frequency: string;
  until: string;
  untilDate: string;
  isFullDay: boolean;
  description: string;
  color: string;
  [key: string]: any;
}

export interface EventTitleOption {
  id?: string;
  value: string;
  label: string;
  typeLabel?: string;
  category: string;
  type?: string;
  color?: string;
  repeats?: boolean;
  description?: string;
}

export default function TimeScheduleDrawerForm({
  event = null,
  initialDate = '',
  defaultCategory = "WORKING_HOURS",
  formId = "time-schedule-drawer-form",
  onSave = null,
  onSaveSuccess = null,
  onCancel = null,
}) {
  const { activeTenantId } = useTenant();
  const { showToast } = useToast() as any;
  const { t } = useCalendarTranslation();
  const [validationErrors, setValidationErrors] = useState<{ title?: string; startDate?: string }>({});
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
    const opts: Array<{ value: string; label: string; badge: string; description?: string }> = [
      { value: "ALL", label: "All Integrations (Entire System)", badge: "ALL", description: "" },
    ];
    const active = (impactScopes || []).filter((s: any) => s.is_active !== false);
    active.forEach((s: any) => {
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

  const [formData, setFormData] = useState<TimeScheduleFormData>(() => {
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
      const initialColor = resolveEventFormColor(event, event.category || defaultCategory, eventKinds, eventTypes);

      return {
        title: event.title || "",
        category: event.category || defaultCategory,
        type: event.type || (event.category === "WORKING_HOURS" ? "WORKING_HOURS" : "ACADEMIC"),
        audience: initialAudience.length > 0 ? initialAudience : ["ALL"],
        impacts: initialImpacts.length > 0 ? initialImpacts : ["ALL"],
        priorityRank: event.priorityRank !== undefined && event.priorityRank !== null
          ? Number(event.priorityRank)
          : (event.rank !== undefined ? Number(event.rank) : 1),
        startDate: event.startDate || new Date().toISOString().split("T")[0],
        endDate: event.endDate || "",
        startTime: event.startTime || "09:00",
        endTime: event.endTime || "17:00",
        timezone: event.timezone || (calendarSettings.getTimezone ? calendarSettings.getTimezone() : "UTC"),
        repeats: Boolean(event.repeats),
        repeatDays: event.repeatDays || [0, 1, 2, 3, 4],
        frequency: event.frequency || "WEEKLY",
        until: event.until || (event.endDate ? "DATE" : "ONGOING"),
        untilDate: event.untilDate || event.endDate || "",
        isFullDay: Boolean(event.isFullDay || (!event.startTime && !event.endTime)),
        description: event.description || "",
        color: initialColor,
      };
    }
    const initialEventsList = masterCalendarStore.getEvents(activeTenantId) || [];
    const initialTitle = defaultCategory === "WORKING_HOURS" 
      ? (workingSchedules?.[0]?.name || "Morning Working Session") 
      : (eventTypes?.[0]?.name || "Mid-Term Examination");
    const initialColor = resolveEventFormColor({ title: initialTitle }, defaultCategory, eventKinds, eventTypes);

    return {
      title: initialTitle,
      category: defaultCategory,
      type: defaultCategory === "WORKING_HOURS" ? "WORKING_HOURS" : "ACADEMIC",
      audience: ["ALL"],
      impacts: ["ALL"],
      priorityRank: initialEventsList.length + 1,
      startDate: initialDate || new Date().toISOString().split("T")[0],
      endDate: "",
      startTime: "09:00",
      endTime: "12:30",
      timezone: calendarSettings.getTimezone ? calendarSettings.getTimezone() : "UTC",
      repeats: defaultCategory === "WORKING_HOURS",
      repeatDays: [0, 1, 2, 3, 4],
      frequency: "WEEKLY",
      until: "ONGOING",
      untilDate: "",
      isFullDay: false,
      description: "",
      color: initialColor,
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
        const initialColor = resolveEventFormColor(event, event.category || defaultCategory, eventKinds, eventTypes);

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
          timezone: event.timezone || (calendarSettings.getTimezone ? calendarSettings.getTimezone() : "UTC"),
          repeats: Boolean(event.repeats),
          repeatDays: event.repeatDays || [0, 1, 2, 3, 4],
          frequency: event.frequency || "WEEKLY",
          until: event.until || (event.endDate ? "DATE" : "ONGOING"),
          untilDate: event.untilDate || event.endDate || "",
          isFullDay: Boolean(event.isFullDay || (!event.startTime && !event.endTime)),
          description: event.description || "",
          color: initialColor,
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
  }, [event, initialDate, defaultCategory, impactScopes, eventKinds, eventTypes]);

  const eventTitleOptions = useMemo<EventTitleOption[]>(() => {
    const isWorkingHoursCategory = formData.category === "WORKING_HOURS";

    if (isWorkingHoursCategory) {
      const activeSchedules = (workingSchedules || []).filter((ws: any) => ws.is_active !== false);
      const baseList = activeSchedules.length > 0 ? activeSchedules : [
        { id: "ws-morning", name: "Morning Working Session", description: "Standard morning operational shifts and faculty hours" },
        { id: "ws-afternoon", name: "Afternoon Working Session", description: "Staff & faculty afternoon working hours" },
        { id: "ws-evening", name: "Evening Support Session", description: "Evening tutorial, revision, and support hours" },
      ];

      const opts: EventTitleOption[] = baseList.map((ws: any) => ({
        id: ws.id,
        value: ws.name,
        label: ws.name,
        typeLabel: "Working Hours",
        category: "WORKING_HOURS",
        type: "WORKING_HOURS",
        color: resolveCanonicalEventColor(ws.color, "blueberry"),
        repeats: true,
        description: ws.description || "",
      }));

      if (formData.title && !opts.some((o) => o.value === formData.title)) {
        opts.unshift({
          id: formData.title,
          value: formData.title,
          label: formData.title,
          typeLabel: "Working Hours",
          category: "WORKING_HOURS",
          type: "WORKING_HOURS",
          color: resolveCanonicalEventColor(formData.color, "blueberry"),
          repeats: true,
          description: "",
        });
      }
      return opts;
    }

    // Dynamic Academic Event Categories from Developer Tools
    const kindsMap: Record<string, string> = {
      ACADEMIC: "Academic",
      HOLIDAY: "Holiday",
      EXAM: "Exam",
      MEETING: "Meeting",
      ACTIVITY: "Sports & Cultural",
      GENERAL: "General",
    };
    const kindsColorMap: Record<string, string> = {
      ACADEMIC: "eucalyptus",
      HOLIDAY: "radicchio",
      EXAM: "flamingo",
      MEETING: "peacock",
      ACTIVITY: "amethyst",
      GENERAL: "cocoa",
    };

    (eventKinds || []).forEach((k: any) => {
      const key = k.value || k.id;
      if (key) {
        kindsMap[key] = k.label || k.name || key;
        if (k.color) kindsColorMap[key] = resolveCanonicalEventColor(k.color);
      }
    });

    const activeEvents = (eventTypes || []).filter((et: any) => et.is_active !== false);
    const baseList = activeEvents.length > 0 ? activeEvents : [
      { id: "et-midterm", name: "Mid-Term Examination", type: "EXAM", description: "Formal mid-term evaluation & exam schedule" },
      { id: "et-final", name: "Final Term Examination", type: "EXAM", description: "Annual and final institutional examinations" },
      { id: "et-weekly", name: "Weekly Holiday", type: "HOLIDAY", description: "Standard weekend institutional recess" },
      { id: "et-eid", name: "Eid Vacation", type: "HOLIDAY", description: "Special holiday closure for holy Eid celebration" },
      { id: "et-sports", name: "Annual Sports & Cultural Day", type: "ACTIVITY", description: "Annual athletic competitions and campus gathering" },
      { id: "et-ptm", name: "Parent-Teacher Conference", type: "MEETING", description: "Quarterly progress review meetings with guardians" },
      { id: "et-special", name: "Special Academic Event", type: "ACADEMIC", description: "Institutional conferences, orientation, and symposiums" },
    ];

    const opts: EventTitleOption[] = baseList.map((et: any) => {
      const rawType = et.type || et.category || "ACADEMIC";
      const typeLabel = kindsMap[rawType] || (rawType ? rawType.replace(/_/g, " ") : "Academic Event");
      const dynamicColor = resolveCanonicalEventColor(kindsColorMap[rawType], "eucalyptus");

      return {
        id: et.id,
        value: et.name,
        label: et.name,
        typeLabel,
        category: "ACADEMIC_EVENT",
        type: rawType,
        color: dynamicColor,
        repeats: false,
        description: et.description || "",
      };
    });

    if (formData.title && !opts.some((o) => o.value === formData.title)) {
      const currentKind = (eventKinds || []).find(
        (k: any) => k.value === formData.type || k.id === formData.type || k.value === formData.category || k.id === formData.category
      );
      opts.unshift({
        id: formData.title,
        value: formData.title,
        label: formData.title,
        typeLabel: currentKind?.label || (formData.category === "WORKING_HOURS" ? "Working Hours" : "Academic Event"),
        category: formData.category,
        type: formData.type || (formData.category === "WORKING_HOURS" ? "WORKING_HOURS" : "ACADEMIC"),
        color: resolveCanonicalEventColor(formData.color || currentKind?.color, "eucalyptus"),
        repeats: false,
        description: "",
      });
    }
    return opts;
  }, [workingSchedules, eventTypes, eventKinds, formData.title, formData.category, formData.type, formData.color]);

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

  const localizedCategoryOptions = useMemo(
    () => [
      { value: "WORKING_HOURS", label: t("workingScheduleOption", CATEGORY_OPTIONS[0].label) },
      { value: "ACADEMIC_EVENT", label: t("academicEventOption", CATEGORY_OPTIONS[1].label) },
    ],
    [t]
  );

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const nextErrors: { title?: string; startDate?: string } = {};
    if (!formData.title.trim()) {
      nextErrors.title = t("titleRequiredError", "Please enter or select a schedule or event title.");
    }
    if (!formData.startDate) {
      nextErrors.startDate = t("startDateRequiredError", "Please specify a start date.");
    }

    if (Object.keys(nextErrors).length > 0) {
      setValidationErrors(nextErrors);
      showToast(nextErrors.title || nextErrors.startDate, "warning");
      return;
    }

    setValidationErrors({});

    const audienceString = Array.isArray(formData.audience)
      ? (formData.audience.length === 0 ? "ALL" : formData.audience.join(", "))
      : (formData.audience || "ALL");

    const resolvedColor = resolveCanonicalEventColor(
      formData.color || resolveEventFormColor(formData, formData.category, eventKinds, eventTypes)
    );

    const payload = {
      ...formData,
      color: resolvedColor,
      priorityRank: Number(formData.priorityRank) || 1,
      audience: audienceString,
      impacts: Array.isArray(formData.impacts) ? formData.impacts : (formData.impacts ? [formData.impacts] : ["ALL"]),
      id: event ? event.id : undefined,
      targetDate: effectiveTargetDate,
      editScope: isRecurringOrMultiDay ? editScope : "ALL_EVENTS",
      endDate: formData.until === "DATE" ? (formData.untilDate || formData.endDate) : "",
      startTime: formData.isFullDay ? "" : formData.startTime,
      endTime: formData.isFullDay ? "" : formData.endTime,
    };

    if (onSave) {
      onSave(payload);
    } else if (onSaveSuccess) {
      onSaveSuccess(payload);
    }
  };

  return (
    <DrawerContainer padding="none" spacing="normal">
      <form id={formId} onSubmit={handleSubmit} className="space-y-6 pt-2 pb-6 @container">
        {/* ─── 1. Schedule Information Section ─── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-1">
            <UsersIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
            <h4 className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
              {t("scheduleInformation", "Schedule Information")}
            </h4>
          </div>

          {/* Category & Schedule/Event Dropdown */}
          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
            <div>
              <CustomSelect
                label={t("entryPurpose", "Entry Purpose")}
                value={formData.category}
                onChange={(val) => {
                  const isWH = val === "WORKING_HOURS";
                  const defaultTitle = isWH
                    ? (workingSchedules?.[0]?.name || "Morning Working Session")
                    : (eventTypes?.[0]?.name || "Mid-Term Examination");
                  const newColor = isWH
                    ? resolveCanonicalEventColor(workingSchedules?.[0]?.color, "blueberry")
                    : resolveEventFormColor({ title: defaultTitle }, "ACADEMIC_EVENT", eventKinds, eventTypes);
                  setValidationErrors((prev) => ({ ...prev, title: undefined }));
                  setFormData((prev) => ({
                    ...prev,
                    category: val,
                    title: defaultTitle,
                    color: newColor,
                    repeats: isWH,
                  }));
                }}
                options={localizedCategoryOptions}
                placeholder={t("entryPurpose", "Select Category")}
              />
            </div>

            <div>
              <CustomSelect
                label={t("scheduleOrEvent", "Schedule / Event")}
                value={formData.title}
                onChange={(val) => {
                  const matched = eventTitleOptions.find((o) => o.value === val);
                  setValidationErrors((prev) => ({ ...prev, title: undefined }));
                  if (matched) {
                    setFormData((prev) => ({
                      ...prev,
                      title: matched.value,
                      type: matched.type,
                      category: matched.category,
                      color: matched.color ? resolveCanonicalEventColor(matched.color, prev.color) : prev.color,
                      repeats: matched.repeats !== undefined ? matched.repeats : prev.repeats,
                    }));
                  } else {
                    setFormData((prev) => ({ ...prev, title: val }));
                  }
                }}
                options={eventTitleOptions}
                placeholder={t("scheduleOrEvent", "Select Schedule / Event...")}
                searchable={true}
                showDescription={true}
                error={validationErrors.title}
              />
            </div>
          </div>

          {/* Target Audience & System Impact Multi-Select */}
          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
            <div>
              <CustomSelect
                label={t("targetAudience", "Target Audience (Roles)")}
                multiple={true}
                value={formData.audience}
                onChange={(val) => setFormData({ ...formData, audience: val })}
                options={audienceOptions}
                placeholder={t("targetAudience", "Select Target Roles...")}
              />
            </div>

            <div>
              <CustomSelect
                label={t("impacts", "System Impacts")}
                multiple={true}
                value={formData.impacts}
                onChange={(val) => setFormData({ ...formData, impacts: val })}
                options={impactOptions}
                placeholder={t("impacts", "Select Impacted Modules...")}
                showDescription={true}
              />
            </div>
          </div>

          {/* Priority & Precedence Rank */}
          <div>
            <CustomSelect
              label={t("priority", "Priority")}
              value={formData.priorityRank || 1}
              onChange={(val) => setFormData({ ...formData, priorityRank: Number(val) })}
              options={priorityRankOptions}
              placeholder={t("priority", "Select Priority Rank...")}
              showDescription={true}
              direction="auto"
            />
          </div>

          {/* Description / Notes */}
          <div>
            <CustomInput
              type="textarea"
              label={t("descriptionNotes", "Description")}
              optional
              rows={2}
              value={formData.description}
              onChange={(val) => setFormData({ ...formData, description: val })}
              placeholder={t("descriptionPlaceholder", "Add schedule details, agenda, instructions or remarks...")}
            />
          </div>
        </div>

        {/* ─── 2. Timing & Recurrence Section ─── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-1 pt-2">
            <ClockIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
            <h4 className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
              {t("dateAndTiming", "Date & Timing")}
            </h4>
          </div>

          {/* Date & Until when? Section */}
          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
            <div>
              <ReusableCalendar
                label={t("dateLabel", "Date")}
                selectedDate={formData.startDate}
                onSelectDate={(newDate) => {
                  setValidationErrors((prev) => ({ ...prev, startDate: undefined }));
                  setFormData({ ...formData, startDate: newDate });
                }}
              />
              {validationErrors.startDate && (
                <p className="text-[11px] font-medium theme-danger mt-1">{validationErrors.startDate}</p>
              )}
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

          {/* All Day Toggle Switch (Project soft surface + theme tokens, zero borders) */}
          <div className="flex items-center justify-between px-4 py-3 rounded-2xl border-0 theme-bg-surface shadow-xs">
            <span className="text-xs font-bold theme-text-primary">{t("allDay", "All day")}</span>
            <button
              type="button"
              role="switch"
              aria-checked={Boolean(formData.isFullDay)}
              onClick={() => setFormData((prev) => ({ ...prev, isFullDay: !prev.isFullDay }))}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center px-0.5 cursor-pointer rounded-full border-0 transition-colors duration-200 ease-in-out focus:outline-none ${
                formData.isFullDay ? "theme-bg-accent" : "bg-black/15 dark:bg-white/15"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  formData.isFullDay ? "translate-x-5 rtl:-translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* From & To Time Pickers (Visible when NOT All Day) */}
          {!formData.isFullDay && (
            <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3 animate-fade-in">
              <InlineTimePicker
                label={t("fromTime", "From")}
                value={formData.startTime}
                onChange={(val) => setFormData({ ...formData, startTime: val })}
              />
              <InlineTimePicker
                label={t("toTime", "To")}
                value={formData.endTime}
                onChange={(val) => setFormData({ ...formData, endTime: val })}
              />
            </div>
          )}

          {/* Repeats Toggle Switch (Borderless project tokens) */}
          <div className="flex items-center justify-between px-4 py-3 rounded-2xl border-0 theme-bg-surface shadow-xs">
            <span className="text-xs font-bold theme-text-primary">{t("repeats", "Repeats")}</span>
            <button
              type="button"
              role="switch"
              aria-checked={Boolean(formData.repeats)}
              onClick={() => setFormData((prev) => ({ ...prev, repeats: !prev.repeats }))}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center px-0.5 cursor-pointer rounded-full border-0 transition-colors duration-200 ease-in-out focus:outline-none ${
                formData.repeats ? "theme-bg-accent" : "bg-black/15 dark:bg-white/15"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  formData.repeats ? "translate-x-5 rtl:-translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Recurrence Options */}
          {formData.repeats && (
            <div className="space-y-3.5 pt-1 animate-fade-in">
              {/* What days? Circular day selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider theme-text-secondary mb-2">
                  {t("recurrenceDays", "Days")}
                </label>
                <div className="grid grid-cols-7 gap-1.5">
                  {WEEKDAY_INITIALS.map((item) => {
                    const isSelected = formData.repeatDays.includes(item.day);
                    return (
                      <button
                        key={item.day}
                        type="button"
                        onClick={() => toggleRepeatDay(item.day)}
                        className={`h-9 rounded-2xl text-xs font-bold flex items-center justify-center transition cursor-pointer select-none border-0 ring-0 ${
                          isSelected
                            ? "theme-bg-accent theme-accent-text shadow-xs"
                            : "theme-bg-surface theme-text-secondary hover:theme-bg-elevated/40 hover:theme-text-primary shadow-xs"
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
                  label={t("repeatFrequency", "Repeat")}
                  value={formData.frequency}
                  onChange={(val) => setFormData({ ...formData, frequency: val })}
                  options={FREQUENCY_OPTIONS}
                  placeholder={t("repeatFrequency", "Select How Often")}
                />
              </div>
            </div>
          )}
        </div>

        {/* ─── 3. Visual Styling Section ─── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-1 pt-2">
            <ShapesIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
            <h4 className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
              {t("visualAppearance", "Visual Appearance")}
            </h4>
          </div>

          <EventColorPickerDropdown
            value={formData.color}
            onChange={(val) => setFormData({ ...formData, color: resolveCanonicalEventColor(val) })}
          />
        </div>

        {/* Apply Changes To Dropdown */}
        {isRecurringOrMultiDay && (
          <div className="pt-2 animate-fade-in">
            <CustomSelect
              label={t("applyChangesTo", "Apply Changes To")}
              value={editScope}
              onChange={(val) => setEditScope(val)}
              options={editScopeOptions}
              placeholder={t("applyChangesTo", "Select update scope...")}
              showDescription={true}
              direction="auto"
            />
          </div>
        )}

        {/* Bottom Action Buttons */}
        <div className="pt-4 border-0 flex items-center justify-end gap-2.5">
          {onCancel && (
            <CustomButton
              type="button"
              variant="surface"
              size="md"
              onClick={onCancel}
            >
              {t("cancel", "Cancel")}
            </CustomButton>
          )}
          <CustomButton
            type="submit"
            variant="primary"
            size="md"
            icon={SaveIcon}
            className="flex-1"
          >
            {t("save", "Save Schedule")}
          </CustomButton>
        </div>
      </form>
    </DrawerContainer>
  );
}
