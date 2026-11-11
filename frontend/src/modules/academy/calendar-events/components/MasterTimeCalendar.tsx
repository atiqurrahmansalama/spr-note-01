import React, { useState, useMemo, useRef, useEffect } from "react";
import ActionMenu from "../../../../components/ui/ActionMenu";
import CustomInput from "../../../../components/ui/CustomInput";
import CustomButton from "../../../../components/ui/CustomButton";
import IconButton from "../../../../components/ui/IconButton";
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  GridIcon,
  TimelineIcon,
} from "../../../../components/ui/Icons";
import DateHeaderCell from "../../../../components/common/DateHeaderCell";
import { useRightSidebar } from "../../../../context/RightSidebarContext";
import { calendarEventTypesStore, calendarEventKindsStore, calendarSettings } from "../../../../utils/localStore";
import { useTenant } from "../../../../context/TenantContext";
import { getHijriDateString, getHijriDetails } from "../../../../utils/hijriUtils";
import type { CalendarEvent, CalendarCategory, CalendarDisplayMode, DeleteEventOptions } from "../types";

export interface EventColorStyle {
  bg: string;
  solidBg: string;
  solidText: string;
  border: string;
  text: string;
  dot: string;
  hex: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAY_NAMES_SHORT = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const WEEKDAY_NAMES_FULL = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
];

export const EVENT_COLOR_MAP: Record<string, EventColorStyle> = {
  emerald: { bg: "bg-emerald-500/15 dark:bg-emerald-500/20", solidBg: "bg-emerald-500", solidText: "text-white", border: "border-0", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500", hex: "#10b981" },
  indigo: { bg: "bg-indigo-500/15 dark:bg-indigo-500/20", solidBg: "bg-indigo-500", solidText: "text-white", border: "border-0", text: "text-indigo-700 dark:text-indigo-300", dot: "bg-indigo-500", hex: "#6366f1" },
  blue: { bg: "bg-blue-500/15 dark:bg-blue-500/20", solidBg: "bg-blue-500", solidText: "text-white", border: "border-0", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-500", hex: "#3b82f6" },
  sky: { bg: "bg-sky-500/15 dark:bg-sky-500/20", solidBg: "bg-sky-500", solidText: "text-white", border: "border-0", text: "text-sky-700 dark:text-sky-300", dot: "bg-sky-500", hex: "#0ea5e9" },
  cyan: { bg: "bg-cyan-500/15 dark:bg-cyan-500/20", solidBg: "bg-cyan-500", solidText: "text-white", border: "border-0", text: "text-cyan-700 dark:text-cyan-300", dot: "bg-cyan-500", hex: "#06b6d4" },
  teal: { bg: "bg-teal-500/15 dark:bg-teal-500/20", solidBg: "bg-teal-500", solidText: "text-white", border: "border-0", text: "text-teal-700 dark:text-teal-300", dot: "bg-teal-500", hex: "#14b8a6" },
  violet: { bg: "bg-violet-500/15 dark:bg-violet-500/20", solidBg: "bg-violet-500", solidText: "text-white", border: "border-0", text: "text-violet-700 dark:text-violet-300", dot: "bg-violet-500", hex: "#8b5cf6" },
  purple: { bg: "bg-purple-500/15 dark:bg-purple-500/20", solidBg: "bg-purple-500", solidText: "text-white", border: "border-0", text: "text-purple-700 dark:text-purple-300", dot: "bg-purple-500", hex: "#a855f7" },
  fuchsia: { bg: "bg-fuchsia-500/15 dark:bg-fuchsia-500/20", solidBg: "bg-fuchsia-500", solidText: "text-white", border: "border-0", text: "text-fuchsia-700 dark:text-fuchsia-300", dot: "bg-fuchsia-500", hex: "#d946ef" },
  rose: { bg: "bg-rose-500/15 dark:bg-rose-500/20", solidBg: "bg-rose-500", solidText: "text-white", border: "border-0", text: "text-rose-700 dark:text-rose-300", dot: "bg-rose-500", hex: "#f43f5e" },
  red: { bg: "bg-red-500/15 dark:bg-red-500/20", solidBg: "bg-red-500", solidText: "text-white", border: "border-0", text: "text-red-700 dark:text-red-300", dot: "bg-red-500", hex: "#ef4444" },
  orange: { bg: "bg-orange-500/15 dark:bg-orange-500/20", solidBg: "bg-orange-500", solidText: "text-white", border: "border-0", text: "text-orange-700 dark:text-orange-300", dot: "bg-orange-500", hex: "#f97316" },
  amber: { bg: "bg-amber-500/15 dark:bg-amber-500/20", solidBg: "bg-amber-500", solidText: "text-slate-950", border: "border-0", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500", hex: "#f59e0b" },
  lime: { bg: "bg-lime-500/15 dark:bg-lime-500/20", solidBg: "bg-lime-500", solidText: "text-slate-950", border: "border-0", text: "text-lime-700 dark:text-lime-300", dot: "bg-lime-500", hex: "#84cc16" },
  slate: { bg: "bg-slate-500/15 dark:bg-slate-500/20", solidBg: "bg-slate-600", solidText: "text-white", border: "border-0", text: "text-slate-700 dark:text-slate-300", dot: "bg-slate-500", hex: "#64748b" },
  // Soft & Light Pastel Colors
  mint: { bg: "bg-emerald-400/15 dark:bg-emerald-400/20", solidBg: "bg-emerald-300", solidText: "text-emerald-950", border: "border-0", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-400", hex: "#6ee7b7" },
  lavender: { bg: "bg-violet-400/15 dark:bg-violet-400/20", solidBg: "bg-violet-300", solidText: "text-violet-950", border: "border-0", text: "text-violet-700 dark:text-violet-300", dot: "bg-violet-400", hex: "#c4b5fd" },
  peach: { bg: "bg-orange-400/15 dark:bg-orange-400/20", solidBg: "bg-orange-300", solidText: "text-orange-950", border: "border-0", text: "text-orange-700 dark:text-orange-300", dot: "bg-orange-400", hex: "#fdba74" },
  coral: { bg: "bg-rose-400/15 dark:bg-rose-400/20", solidBg: "bg-rose-300", solidText: "text-rose-950", border: "border-0", text: "text-rose-700 dark:text-rose-300", dot: "bg-rose-400", hex: "#fca5a5" },
  sage: { bg: "bg-green-400/15 dark:bg-green-400/20", solidBg: "bg-green-300", solidText: "text-green-950", border: "border-0", text: "text-green-700 dark:text-green-300", dot: "bg-green-400", hex: "#86efac" },
  ice: { bg: "bg-sky-400/15 dark:bg-sky-400/20", solidBg: "bg-sky-300", solidText: "text-sky-950", border: "border-0", text: "text-sky-700 dark:text-sky-300", dot: "bg-sky-400", hex: "#7dd3fc" },
  sand: { bg: "bg-slate-400/15 dark:bg-slate-400/20", solidBg: "bg-slate-300", solidText: "text-slate-900", border: "border-0", text: "text-slate-700 dark:text-slate-300", dot: "bg-slate-400", hex: "#cbd5e1" },
  pink: { bg: "bg-pink-400/15 dark:bg-pink-400/20", solidBg: "bg-pink-400", solidText: "text-white", border: "border-0", text: "text-pink-700 dark:text-pink-300", dot: "bg-pink-400", hex: "#f472b6" },
  cream: { bg: "bg-amber-300/20 dark:bg-amber-300/20", solidBg: "bg-amber-200", solidText: "text-amber-950", border: "border-0", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-400", hex: "#fde68a" },
};

/**
 * Resolves the precise display label for any calendar event or schedule.
 * Looks up custom types configured in Developer Tools as well as built-in categories.
 */
export function getEventDisplayType(evt?: CalendarEvent | null, tenantId?: string): string {
  if (!evt) return "Event";
  if (evt.category === "WORKING_HOURS" || evt.type === "WORKING_HOURS") {
    return "Working Hours";
  }

  // 1. Direct explicit type / kind
  const explicitType = evt.type || evt.event_type || evt.kind;

  // 2. Lookup in configured Event Types from Developer Tools store
  let matchedEventType: any = null;
  if (typeof window !== "undefined") {
    try {
      const types = calendarEventTypesStore.getEventTypes(tenantId);
      matchedEventType = types.find(
        (t: any) => t.id === evt.eventTypeId || t.name === evt.title || t.code === evt.code
      );
    } catch {}
  }

  const rawType = explicitType || matchedEventType?.type || (evt.category !== "ACADEMIC_EVENT" ? evt.category : null);

  const kindsMap: Record<string, string> = {
    HOLIDAY: "Holiday",
    EXAM: "Exam",
    WORKING_HOURS: "Working Hours",
    ACADEMIC: "Academic",
    MEETING: "Meeting",
    ACTIVITY: "Sports & Cultural",
    GENERAL: "General",
  };

  if (rawType && kindsMap[String(rawType).toUpperCase()]) {
    return kindsMap[String(rawType).toUpperCase()];
  }

  if (matchedEventType?.name && matchedEventType.type && kindsMap[String(matchedEventType.type).toUpperCase()]) {
    return kindsMap[String(matchedEventType.type).toUpperCase()];
  }

  if (evt.category && evt.category !== "ACADEMIC_EVENT" && kindsMap[String(evt.category).toUpperCase()]) {
    return kindsMap[String(evt.category).toUpperCase()];
  }

  return "Academic Event";
}

const eventColorsCache = new Map<string, EventColorStyle>();

export function getEventColors(evt?: CalendarEvent | null, tenantId?: string): EventColorStyle {
  if (!evt) {
    return EVENT_COLOR_MAP.emerald;
  }
  const cacheKey = `${tenantId || "def"}_${evt.id || evt.title || ""}_${evt.color || ""}_${evt.category || ""}_${evt.type || ""}`;
  if (eventColorsCache.has(cacheKey)) {
    return eventColorsCache.get(cacheKey)!;
  }

  const isWorkingHours = evt?.category === "WORKING_HOURS" || evt?.type === "WORKING_HOURS";

  // 1. Direct explicit color on event
  if (evt?.color && EVENT_COLOR_MAP[evt.color]) {
    const base = EVENT_COLOR_MAP[evt.color];
    const res: EventColorStyle = isWorkingHours ? { ...base, text: "theme-text-primary" } : base;
    eventColorsCache.set(cacheKey, res);
    return res;
  }

  // 2. Dynamic lookup from Developer Tools Event Types & Kinds
  if (typeof window !== "undefined") {
    try {
      const types = calendarEventTypesStore.getEventTypes(tenantId);
      const matchedType = types.find(
        (t: any) => t.id === evt?.eventTypeId || t.name === evt?.title || t.code === evt?.code
      );
      const rawType = matchedType?.type || evt?.type || evt?.event_type || evt?.kind || evt?.category;
      if (rawType) {
        const kinds = calendarEventKindsStore.getKinds(tenantId);
        const matchedKind = kinds.find(
          (k: any) => k.value === rawType || k.id === rawType || String(k.value).toUpperCase() === String(rawType).toUpperCase()
        );
        if (matchedKind?.color && EVENT_COLOR_MAP[matchedKind.color]) {
          const base = EVENT_COLOR_MAP[matchedKind.color];
          const res: EventColorStyle = isWorkingHours ? { ...base, text: "theme-text-primary" } : base;
          eventColorsCache.set(cacheKey, res);
          return res;
        }
      }
    } catch {}
  }

  if (isWorkingHours) {
    const res: EventColorStyle = {
      bg: "theme-bg-accent-soft",
      solidBg: "theme-bg-accent",
      solidText: "theme-accent-text",
      border: "border-[var(--accent-main)]/20",
      text: "theme-text-primary",
      dot: "theme-bg-accent",
      hex: "#6366f1",
    };
    eventColorsCache.set(cacheKey, res);
    return res;
  }

  // 3. Fallback based on display type
  const displayType = getEventDisplayType(evt, tenantId);
  let fallback = EVENT_COLOR_MAP.emerald;
  if (displayType === "Holiday") fallback = EVENT_COLOR_MAP.rose;
  else if (displayType === "Exam") fallback = EVENT_COLOR_MAP.amber;
  else if (displayType === "Meeting") fallback = EVENT_COLOR_MAP.blue;
  else if (displayType === "Sports & Cultural") fallback = EVENT_COLOR_MAP.purple;
  else if (displayType === "Academic") fallback = EVENT_COLOR_MAP.emerald;

  eventColorsCache.set(cacheKey, fallback);
  return fallback;
}

function formatTime12(timeStr?: string): string {
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

export interface MasterTimeCalendarProps {
  events?: CalendarEvent[];
  onSaveEvent?: (eventData: any) => void;
  onDeleteEvent?: (eventOrId: any, options?: DeleteEventOptions) => void;
  readOnly?: boolean;
  selectedCategory?: CalendarCategory | string;
  viewMode?: "month" | "list";
  displayMode?: CalendarDisplayMode;
  initialDisplayMode?: CalendarDisplayMode;
  hideCategorySelector?: boolean;
  hideSearch?: boolean;
  hideViewModeToggle?: boolean;
  actionMenuItems?: Array<{
    label: string;
    icon?: React.ComponentType<any>;
    onClick: () => void;
  }>;
  onDateSelect?: (dateStr: string) => void;
  onDisplayModeChange?: (mode: CalendarDisplayMode | string) => void;
  className?: string;
  isHijriEnabled?: boolean;
  embeddedSurface?: boolean;
}

interface MonthGridCell {
  dateStr: string;
  dayNum: number;
  isCurrentMonth: boolean;
  weekday: number;
}

interface WeekEventItem {
  event: CalendarEvent;
  startCol: number; // 1 to 7
  endCol: number;   // 1 to 7
  span: number;     // 1 to 7
  isStart: boolean;
  isEnd: boolean;
  row: number;
}

interface TimelineStripDay {
  dateObj: Date;
  dateStr: string;
  dayNum: number;
  monthIdx: number;
  yearNum: number;
  weekday: number;
  isCurrentMonth: boolean;
  isPrevMonth?: boolean;
  isNextMonth?: boolean;
}

export default function MasterTimeCalendar({
  events = [],
  readOnly = false,
  selectedCategory = "WORKING_HOURS",
  viewMode: propViewMode,
  actionMenuItems = [],
  onDateSelect,
  onDisplayModeChange,
  className = "",
  isHijriEnabled: propIsHijriEnabled = undefined,
  displayMode: propDisplayMode,
  initialDisplayMode,
  hideCategorySelector = false,
  hideSearch = false,
  hideViewModeToggle = false,
  embeddedSurface = false,
}: MasterTimeCalendarProps) {
  const { openDrawer } = useRightSidebar();
  const { activeTenantId } = useTenant();

  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [selectedDay, setSelectedDay] = useState<number>(() => new Date().getDate());
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [internalDisplayMode, setInternalDisplayMode] = useState<CalendarDisplayMode>(() => {
    if (initialDisplayMode) return initialDisplayMode;
    try {
      return (localStorage.getItem("spr_calendar_display_mode") as CalendarDisplayMode) || "grid";
    } catch {
      return "grid";
    }
  });

  const displayMode = propDisplayMode !== undefined ? propDisplayMode : internalDisplayMode;

  const handleSetDisplayMode = (mode: CalendarDisplayMode) => {
    setInternalDisplayMode(mode);
    try {
      localStorage.setItem("spr_calendar_display_mode", mode);
    } catch {}
    if (onDisplayModeChange) onDisplayModeChange(mode);
  };
  const [internalHijriEnabled, setInternalHijriEnabled] = useState<boolean>(() => calendarSettings.getHijriEnabled());
  const isHijriEnabled = propIsHijriEnabled !== undefined ? Boolean(propIsHijriEnabled) : internalHijriEnabled;
  const [, setTaxonomyVersion] = useState<number>(0);

  useEffect(() => {
    const handleSettingsUpdate = (e: any) => {
      if (e?.detail?.enableHijri !== undefined) {
        setInternalHijriEnabled(Boolean(e.detail.enableHijri));
      } else {
        setInternalHijriEnabled(calendarSettings.getHijriEnabled());
      }
    };
    const handleStorageUpdate = (e: StorageEvent) => {
      if (!e.key || e.key === "spr_enable_hijri") {
        setInternalHijriEnabled(calendarSettings.getHijriEnabled());
      }
    };
    const handleTaxonomyUpdate = () => {
      setTaxonomyVersion((v) => v + 1);
    };

    window.addEventListener("spr_calendar_settings_updated", handleSettingsUpdate);
    window.addEventListener("storage", handleStorageUpdate);
    window.addEventListener("spr_calendar_event_kinds_updated", handleTaxonomyUpdate);
    window.addEventListener("spr_calendar_event_types_updated", handleTaxonomyUpdate);
    window.addEventListener("spr_calendar_events_updated", handleTaxonomyUpdate);
    window.addEventListener("spr_tenant_changed", handleTaxonomyUpdate);
    return () => {
      window.removeEventListener("spr_calendar_settings_updated", handleSettingsUpdate);
      window.removeEventListener("storage", handleStorageUpdate);
      window.removeEventListener("spr_calendar_event_kinds_updated", handleTaxonomyUpdate);
      window.removeEventListener("spr_calendar_event_types_updated", handleTaxonomyUpdate);
      window.removeEventListener("spr_calendar_events_updated", handleTaxonomyUpdate);
      window.removeEventListener("spr_tenant_changed", handleTaxonomyUpdate);
    };
  }, []);

  const dayStripRef = useRef<HTMLDivElement | null>(null);

  const viewMode = propViewMode || (selectedCategory === "AGENDA" ? "list" : "month");
  const viewYear = currentDate.getFullYear();
  const viewMonth = currentDate.getMonth();

  // Check if calendar is currently focused on today
  const isViewingToday = useMemo(() => {
    const now = new Date();
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth();
    const todayDay = now.getDate();

    if (viewYear !== todayYear || viewMonth !== todayMonth) {
      return false;
    }
    if (displayMode === "timeline") {
      return selectedDay === todayDay;
    }
    return true;
  }, [viewYear, viewMonth, displayMode, selectedDay]);

  const hijriMonthHeader = useMemo(() => {
    if (!isHijriEnabled) return "";
    try {
      const firstDayStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
      const lastDayStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      const firstDetails = getHijriDetails(new Date(firstDayStr));
      const lastDetails = getHijriDetails(new Date(lastDayStr));
      if (firstDetails.monthName === lastDetails.monthName) {
        return `${firstDetails.monthName} ${firstDetails.year}h`;
      }
      return `${firstDetails.monthName} – ${lastDetails.monthName} ${lastDetails.year}h`;
    } catch {
      return "";
    }
  }, [viewYear, viewMonth, isHijriEnabled]);


  useEffect(() => {
    if (onDisplayModeChange) {
      onDisplayModeChange(displayMode);
    }
  }, [displayMode, onDisplayModeChange]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(viewYear, viewMonth - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentDate(new Date(viewYear, viewMonth + 1, 1));
  };
  const handleJumpToday = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDay(now.getDate());
    setTimeout(() => {
      if (dayStripRef.current) {
        const activeEl =
          dayStripRef.current.querySelector('[data-active="true"]') ||
          dayStripRef.current.querySelector('[data-today="true"]');
        if (activeEl) {
          activeEl.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        }
      }
    }, 50);
  };

  // Open Right Sidebar for viewing event / working hours details
  const handleOpenEventDetail = (evt: CalendarEvent, dateStr = "") => {
    openDrawer("schedule", {
      mode: "detail",
      eventId: evt.id,
      category: evt.category,
      date: dateStr || selectedDateStr,
    });
  };

  // Open Right Sidebar for adding new entry
  const handleOpenAddDrawer = (initialDate = "") => {
    openDrawer("schedule", {
      mode: "add",
      date: initialDate || selectedDateStr,
      category: (selectedCategory === "ALL" || selectedCategory === "AGENDA") ? "WORKING_HOURS" : selectedCategory,
    });
  };

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (selectedCategory && selectedCategory !== "ALL" && selectedCategory !== "AGENDA") {
        if (selectedCategory === "WORKING_HOURS") {
          if (e.category !== "WORKING_HOURS") return false;
        } else if (selectedCategory === "ACADEMIC_EVENT") {
          if (e.category === "WORKING_HOURS") return false;
        } else if (e.category !== selectedCategory) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (e.title || "").toLowerCase().includes(q);
        const matchDesc = (e.description || "").toLowerCase().includes(q);
        if (!matchTitle && !matchDesc) return false;
      }
      return true;
    });
  }, [events, selectedCategory, searchQuery]);

  const monthGridDays: MonthGridCell[] = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells: MonthGridCell[] = [];

    // Prev month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevMonthDate = new Date(viewYear, viewMonth - 1, dayNum);
      const y = prevMonthDate.getFullYear();
      const m = String(prevMonthDate.getMonth() + 1).padStart(2, "0");
      const d = String(dayNum).padStart(2, "0");
      cells.push({
        dateStr: `${y}-${m}-${d}`,
        dayNum,
        isCurrentMonth: false,
        weekday: prevMonthDate.getDay(),
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(viewYear, viewMonth, d);
      const y = viewYear;
      const m = String(viewMonth + 1).padStart(2, "0");
      const dStr = String(d).padStart(2, "0");
      cells.push({
        dateStr: `${y}-${m}-${dStr}`,
        dayNum: d,
        isCurrentMonth: true,
        weekday: dateObj.getDay(),
      });
    }

    // Next month padding
    const totalCells = Math.ceil(cells.length / 7) * 7;
    const remaining = totalCells - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const nextMonthDate = new Date(viewYear, viewMonth + 1, d);
      const y = nextMonthDate.getFullYear();
      const m = String(nextMonthDate.getMonth() + 1).padStart(2, "0");
      const dStr = String(d).padStart(2, "0");
      cells.push({
        dateStr: `${y}-${m}-${dStr}`,
        dayNum: d,
        isCurrentMonth: false,
        weekday: nextMonthDate.getDay(),
      });
    }

    return cells;
  }, [viewYear, viewMonth]);

  // Group month grid cells into 7-day calendar weeks
  const weeks = useMemo<MonthGridCell[][]>(() => {
    const result: MonthGridCell[][] = [];
    for (let i = 0; i < monthGridDays.length; i += 7) {
      result.push(monthGridDays.slice(i, i + 7));
    }
    return result;
  }, [monthGridDays]);

  // Pack multi-day and single-day events for a 7-day week into non-colliding continuous rows
  const getWeekEvents = (weekDays: MonthGridCell[]): { items: WeekEventItem[]; maxTracks: number } => {
    if (weekDays.length !== 7) return { items: [], maxTracks: 0 };

    const rawItems: Omit<WeekEventItem, "row">[] = [];

    filteredEvents.forEach((evt) => {
      // Find all active columns (1 to 7) for this event within this 7-day week
      const activeCols: number[] = [];

      weekDays.forEach((cell, idx) => {
        const col = idx + 1; // 1-based (1 = Sun, 7 = Sat)
        const dateStr = cell.dateStr;
        const weekday = cell.weekday;

        // Skip exceptions
        if (Array.isArray(evt.exceptions) && evt.exceptions.includes(dateStr)) {
          return;
        }

        let isActive = false;

        if (evt.repeats && Array.isArray(evt.repeatDays)) {
          if (evt.repeatDays.includes(weekday)) {
            if (!evt.startDate || dateStr >= evt.startDate) {
              if (evt.until !== "DATE" || !evt.untilDate || dateStr <= evt.untilDate) {
                isActive = true;
              }
            }
          }
        } else {
          const evtStart = evt.startDate || "";
          const evtEnd = evt.endDate || evt.untilDate || evt.startDate || "";
          if (evtStart && dateStr >= evtStart && dateStr <= evtEnd) {
            isActive = true;
          }
        }

        if (isActive) {
          activeCols.push(col);
        }
      });

      if (activeCols.length === 0) return;

      // Group consecutive active columns into contiguous multi-day spans
      activeCols.sort((a, b) => a - b);
      const spans: { startCol: number; endCol: number }[] = [];
      let currentSpan: { startCol: number; endCol: number } | null = null;

      activeCols.forEach((col) => {
        if (!currentSpan) {
          currentSpan = { startCol: col, endCol: col };
        } else if (col === currentSpan.endCol + 1) {
          currentSpan.endCol = col;
        } else {
          spans.push(currentSpan);
          currentSpan = { startCol: col, endCol: col };
        }
      });
      if (currentSpan) {
        spans.push(currentSpan);
      }

      // Determine isStart and isEnd for each span
      spans.forEach((sp) => {
        const spanLength = sp.endCol - sp.startCol + 1;
        const startDayStr = weekDays[sp.startCol - 1].dateStr;
        const endDayStr = weekDays[sp.endCol - 1].dateStr;

        let isStart = true;
        let isEnd = true;

        if (!evt.repeats) {
          const evtStart = evt.startDate || "";
          const evtEnd = evt.endDate || evt.untilDate || evt.startDate || "";
          if (evtStart) isStart = startDayStr === evtStart;
          if (evtEnd) isEnd = endDayStr === evtEnd;
        } else {
          if (sp.startCol === 1 && evt.repeatDays?.includes(6)) {
            isStart = false;
          }
          if (sp.endCol === 7 && evt.repeatDays?.includes(0)) {
            isEnd = false;
          }
        }

        rawItems.push({
          event: evt,
          startCol: sp.startCol,
          endCol: sp.endCol,
          span: spanLength,
          isStart,
          isEnd,
        });
      });
    });

    // Spanning multi-day items first so they occupy top rows continuously across days
    rawItems.sort((a, b) => {
      if (a.span !== b.span) return b.span - a.span;
      if (a.startCol !== b.startCol) return a.startCol - b.startCol;
      const rankA = a.event.priorityRank !== undefined && a.event.priorityRank !== null ? Number(a.event.priorityRank) : (a.event.rank !== undefined ? Number(a.event.rank) : 999);
      const rankB = b.event.priorityRank !== undefined && b.event.priorityRank !== null ? Number(b.event.priorityRank) : (b.event.rank !== undefined ? Number(b.event.rank) : 999);
      if (rankA !== rankB) return rankA - rankB;
      return (a.event.title || "").localeCompare(b.event.title || "");
    });

    // Greedy non-overlapping track allocation
    const tracks: boolean[][] = [];
    const items: WeekEventItem[] = [];

    rawItems.forEach((item) => {
      let assignedRow = 0;
      while (true) {
        if (!tracks[assignedRow]) {
          tracks[assignedRow] = new Array(7).fill(false);
        }
        let fits = true;
        for (let c = item.startCol - 1; c < item.endCol; c++) {
          if (tracks[assignedRow][c]) {
            fits = false;
            break;
          }
        }
        if (fits) {
          for (let c = item.startCol - 1; c < item.endCol; c++) {
            tracks[assignedRow][c] = true;
          }
          items.push({
            ...item,
            row: assignedRow + 1,
          });
          break;
        }
        assignedRow++;
      }
    });

    return { items, maxTracks: tracks.length };
  };

  // Consistently sort events so multi-day events occupy identical vertical slot across rows
  const getEventsForDate = (dateStr: string, weekday: number): CalendarEvent[] => {
    return filteredEvents
      .filter((e) => {
        if (Array.isArray(e.exceptions) && e.exceptions.includes(dateStr)) {
          return false;
        }
        if (e.startDate === dateStr) return true;
        if (e.startDate && e.endDate && dateStr >= e.startDate && dateStr <= e.endDate) {
          return true;
        }
        if (e.repeats && Array.isArray(e.repeatDays) && e.repeatDays.includes(weekday)) {
          if (!e.startDate || dateStr >= e.startDate) {
            if (e.until === "DATE" && e.untilDate && dateStr > e.untilDate) {
              return false;
            }
            return true;
          }
        }
        return false;
      })
      .sort((a, b) => {
        // 1. Multi-day events first so they form an unbroken horizontal bar across consecutive days
        const isMultiA = a.startDate && a.endDate && a.startDate !== a.endDate ? 1 : 0;
        const isMultiB = b.startDate && b.endDate && b.startDate !== b.endDate ? 1 : 0;
        if (isMultiA !== isMultiB) return isMultiB - isMultiA;

        // 2. Rank priority
        const rankA = a.priorityRank !== undefined && a.priorityRank !== null ? Number(a.priorityRank) : (a.rank !== undefined ? Number(a.rank) : 999);
        const rankB = b.priorityRank !== undefined && b.priorityRank !== null ? Number(b.priorityRank) : (b.rank !== undefined ? Number(b.rank) : 999);
        if (rankA !== rankB) return rankA - rankB;

        // 3. Start date or time
        if (a.startDate !== b.startDate) return (a.startDate || "").localeCompare(b.startDate || "");
        if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
        return (a.title || "").localeCompare(b.title || "");
      });
  };

  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const daysInCurrentViewMonth = useMemo(() => {
    return new Date(viewYear, viewMonth + 1, 0).getDate();
  }, [viewYear, viewMonth]);

  const safeSelectedDay = Math.min(Math.max(1, selectedDay), daysInCurrentViewMonth);
  const selectedDateObj = useMemo(() => {
    return new Date(viewYear, viewMonth, safeSelectedDay);
  }, [viewYear, viewMonth, safeSelectedDay]);

  const selectedDateStr = useMemo(() => {
    const y = selectedDateObj.getFullYear();
    const m = String(selectedDateObj.getMonth() + 1).padStart(2, "0");
    const d = String(selectedDateObj.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [selectedDateObj]);

  useEffect(() => {
    if (onDateSelect) {
      onDateSelect(selectedDateStr);
    }
  }, [selectedDateStr, onDateSelect]);

  const selectedWeekday = selectedDateObj.getDay();
  const selectedDayEvents = useMemo(() => {
    return getEventsForDate(selectedDateStr, selectedWeekday);
  }, [selectedDateStr, selectedWeekday, filteredEvents]);

  // Continuous Day Strip for Timeline
  const timelineStripDays: TimelineStripDay[] = useMemo(() => {
    const list: TimelineStripDay[] = [];
    const prevMonthLastDate = new Date(viewYear, viewMonth, 0).getDate();

    const prevDaysCount = 10;
    for (let d = prevMonthLastDate - prevDaysCount + 1; d <= prevMonthLastDate; d++) {
      const dObj = new Date(viewYear, viewMonth - 1, d);
      const dStr = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      list.push({
        dateObj: dObj,
        dateStr: dStr,
        dayNum: d,
        monthIdx: dObj.getMonth(),
        yearNum: dObj.getFullYear(),
        weekday: dObj.getDay(),
        isCurrentMonth: false,
        isPrevMonth: true,
      });
    }

    for (let d = 1; d <= daysInCurrentViewMonth; d++) {
      const dObj = new Date(viewYear, viewMonth, d);
      const dStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      list.push({
        dateObj: dObj,
        dateStr: dStr,
        dayNum: d,
        monthIdx: viewMonth,
        yearNum: viewYear,
        weekday: dObj.getDay(),
        isCurrentMonth: true,
      });
    }

    const nextDaysCount = 14;
    for (let d = 1; d <= nextDaysCount; d++) {
      const dObj = new Date(viewYear, viewMonth + 1, d);
      const dStr = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      list.push({
        dateObj: dObj,
        dateStr: dStr,
        dayNum: d,
        monthIdx: dObj.getMonth(),
        yearNum: dObj.getFullYear(),
        weekday: dObj.getDay(),
        isCurrentMonth: false,
        isNextMonth: true,
      });
    }

    return list;
  }, [viewYear, viewMonth, daysInCurrentViewMonth]);

  const setupHorizontalScroll = (el: HTMLElement | null) => {
    if (!el) return () => {};

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    const handleWheel = (e: WheelEvent) => {
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (delta !== 0) {
        e.preventDefault();
        e.stopPropagation();
        el.scrollLeft += delta;
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      isDown = true;
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
    };

    const handleMouseLeave = () => {
      isDown = false;
    };

    const handleMouseUp = () => {
      isDown = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      const walk = (x - startX) * 1.5;
      el.scrollLeft = scrollLeft - walk;
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    el.addEventListener("mousedown", handleMouseDown);
    el.addEventListener("mouseleave", handleMouseLeave);
    el.addEventListener("mouseup", handleMouseUp);
    el.addEventListener("mousemove", handleMouseMove);

    return () => {
      el.removeEventListener("wheel", handleWheel);
      el.removeEventListener("mousedown", handleMouseDown);
      el.removeEventListener("mouseleave", handleMouseLeave);
      el.removeEventListener("mouseup", handleMouseUp);
      el.removeEventListener("mousemove", handleMouseMove);
    };
  };

  useEffect(() => {
    const cleanupDay = setupHorizontalScroll(dayStripRef.current);
    return () => {
      cleanupDay();
    };
  }, [displayMode, viewMonth, viewYear]);

  useEffect(() => {
    if (dayStripRef.current && displayMode === "timeline") {
      const activeEl = dayStripRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }
  }, [selectedDay, viewMonth, viewYear, displayMode]);

  const navControlVariant = embeddedSurface ? "card" : "app";

  return (
    <div className={`flex flex-col w-full min-w-0 @container ${className}`}>
      
      {/* ─── Single Unified Calendar Control Bar Card ──────────────────── */}
      <div
        className={`${
          embeddedSurface
            ? "p-2 sm:p-2.5 rounded-2xl border-0 theme-bg-app mb-3"
            : "p-3 sm:p-4 rounded-3xl border-0 theme-bg-surface shadow-xs mb-4"
        } flex flex-col @[720px]:flex-row items-stretch @[720px]:items-center justify-between gap-2.5 sm:gap-3 w-full min-w-0`}
      >
        
        {/* Left Side: Month Navigator with [< Month Year >] & Hijri Date */}
        {viewMode === "month" ? (
          <div className="flex items-center justify-start gap-2 flex-wrap min-w-0">
            <div className="flex flex-col items-start min-w-0">
              {/* Row 1: Arrows strictly bracket ONLY Month Year */}
              <div className="flex items-center gap-1.5 flex-nowrap">
                <IconButton
                  icon={ChevronLeftIcon}
                  variant="ghost"
                  size="xs"
                  onClick={handlePrevMonth}
                  title="Previous Month"
                  ariaLabel="Previous Month"
                />

                <h3 className="text-sm sm:text-base font-bold theme-text-primary tracking-tight leading-tight whitespace-nowrap">
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </h3>

                <IconButton
                  icon={ChevronRightIcon}
                  variant="ghost"
                  size="xs"
                  onClick={handleNextMonth}
                  title="Next Month"
                  ariaLabel="Next Month"
                />
              </div>

              {/* Row 2: Hijri subtitle neatly beneath without expanding arrows */}
              {isHijriEnabled && hijriMonthHeader && (
                <span className="text-[10px] sm:text-xs font-mono theme-accent font-semibold leading-none pt-1 pl-0.5 truncate max-w-[200px] sm:max-w-[260px]">
                  {hijriMonthHeader}
                </span>
              )}
            </div>

            {/* Today Button: Automatically hidden when calendar is currently viewing today */}
            {!isViewingToday && (
              <CustomButton
                type="button"
                variant={navControlVariant}
                size="sm"
                icon={CalendarIcon}
                onClick={handleJumpToday}
                title="Jump to Today"
                className="shrink-0"
              >
                <span>Today</span>
              </CustomButton>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2.5 shrink-0">
            <h3 className="text-sm sm:text-base font-bold theme-text-primary tracking-tight">
              Upcoming Agenda & Schedules
            </h3>
            <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full theme-bg-accent-soft theme-accent border-0 shadow-2xs">
              {filteredEvents.length} items
            </span>
          </div>
        )}

        {/* Right Side Tools: Single Toggle View Switcher, Custom Search & ActionMenu */}
        {(!hideViewModeToggle || !hideSearch || (actionMenuItems && actionMenuItems.length > 0)) && (
          <div className="flex items-center gap-2 justify-start @[720px]:justify-end flex-1 @[720px]:flex-none min-w-0">
            
            {/* Single View Mode Toggle Button */}
            {viewMode === "month" && !hideViewModeToggle && (
              <CustomButton
                type="button"
                variant={navControlVariant}
                size="sm"
                icon={displayMode === "grid" ? TimelineIcon : GridIcon}
                onClick={() => handleSetDisplayMode(displayMode === "grid" ? "timeline" : "grid")}
                title={displayMode === "grid" ? "Switch to Timeline View" : "Switch to Grid View"}
                className="shrink-0 select-none"
              >
                <span className="hidden @[440px]:inline">{displayMode === "grid" ? "Timeline" : "Grid"}</span>
              </CustomButton>
            )}

            {/* Reusable Search Box with CustomInput */}
            {!hideSearch && (
              <div className="flex-1 @[480px]:w-48 @[860px]:w-60 min-w-0">
                <CustomInput
                  type="search"
                  size="sm"
                  variant={navControlVariant}
                  value={searchQuery}
                  onChange={(val: string) => setSearchQuery(val)}
                  placeholder="Search..."
                  clearable={true}
                />
              </div>
            )}

            {/* Three-dots Action Menu */}
            {actionMenuItems && actionMenuItems.length > 0 && (
              <ActionMenu
                items={actionMenuItems}
                variant={navControlVariant}
                buttonClassName="rounded-xl"
              />
            )}
          </div>
        )}
      </div>

      {/* ─── Calendar Main Content Area ─── */}
      <div
        className={`overflow-hidden border-0 w-full min-w-0 ${
          embeddedSurface
            ? "rounded-2xl bg-transparent"
            : "rounded-3xl theme-bg-surface shadow-xs"
        }`}
      >
        
        {/* ─── 1. Traditional 7-Column Month Grid View ─── */}
        {viewMode === "month" && displayMode === "grid" && (
          <div className={`flex flex-col w-full min-w-0 ${embeddedSurface ? "p-0" : "p-2 sm:p-3"}`}>
            {/* Weekday Header Columns (SUN to SAT) */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center select-none shrink-0 mb-1.5">
              {WEEKDAY_NAMES_SHORT.map((wd) => (
                <div key={wd} className="py-1.5 rounded-xl theme-bg-app text-[9px] @sm:text-[10px] @lg:text-xs font-bold tracking-wider uppercase border-0 theme-text-secondary">
                  {wd}
                </div>
              ))}
            </div>

            {/* Month Grid Weeks Rows with Spanning Multi-Day Banners */}
            <div className="flex flex-col w-full gap-1 sm:gap-1.5">
              {weeks.map((weekDays, weekIdx) => {
                const { items: weekEvents, maxTracks } = getWeekEvents(weekDays);
                const weekRowMinHeight = Math.max(88, 36 + maxTracks * 26);

                return (
                  <div
                    key={`week-${weekIdx}-${weekDays[0].dateStr}`}
                    className="relative w-full border-0"
                  >
                    {/* Background 7-Day Columns Grid */}
                    <div
                      className="grid grid-cols-7 gap-1 sm:gap-1.5 w-full min-h-0"
                      style={{ "--week-min-h": `${weekRowMinHeight}px` } as React.CSSProperties}
                    >
                      {weekDays.map((cell) => {
                        const dayEvents = getEventsForDate(cell.dateStr, cell.weekday);
                        const isToday = cell.dateStr === todayStr;
                        const topEvent = dayEvents.length > 0 ? dayEvents[0] : null;
                        const topStyle = topEvent ? getEventColors(topEvent, activeTenantId) : null;

                        return (
                          <div
                            key={cell.dateStr}
                            onClick={() => {
                              setSelectedDay(cell.dayNum);
                              if (!cell.isCurrentMonth) {
                                const targetDate = new Date(cell.dateStr);
                                setCurrentDate(new Date(targetDate.getFullYear(), targetDate.getMonth(), cell.dayNum));
                              }
                              if (dayEvents.length > 0) {
                                handleSetDisplayMode("timeline");
                              } else if (!readOnly) {
                                handleOpenAddDrawer(cell.dateStr);
                              }
                            }}
                            className={`border-0 aspect-square @md:aspect-auto min-h-0 @md:min-h-[var(--week-min-h,88px)] w-full p-1 @sm:p-1.5 @xl:p-2 flex flex-col justify-between transition-colors cursor-pointer group select-none rounded-xl sm:rounded-2xl ${
                              isToday
                                ? "bg-[var(--accent-main)]/15 dark:bg-[var(--accent-main)]/22 hover:bg-[var(--accent-main)]/20"
                                : cell.isCurrentMonth
                                ? "theme-bg-app hover:theme-bg-elevated/60"
                                : "theme-bg-app/50 opacity-45 hover:opacity-75"
                            }`}
                            title={dayEvents.length > 0 ? `${dayEvents.length} item(s) on ${cell.dateStr}. Click to view details.` : cell.dateStr}
                          >
                            {/* Top: Day Number (Top Left) & Hijri Day Number (Top Right) */}
                            <div className="flex items-center justify-between relative w-full mb-0.5 shrink-0 pointer-events-auto">
                              <span
                                className={`text-[10px] @sm:text-[11px] @xl:text-xs font-bold inline-flex items-center justify-center w-5 h-5 @sm:w-5.5 @sm:h-5.5 @xl:w-6 @xl:h-6 rounded-full transition ${
                                  isToday
                                    ? "theme-bg-accent text-white shadow-xs"
                                    : "theme-text-primary group-hover:theme-accent font-mono"
                                }`}
                              >
                                {cell.dayNum}
                              </span>

                              {isHijriEnabled && (
                                <span
                                  className="text-[9px] @sm:text-[10px] font-mono theme-accent font-semibold leading-none select-none opacity-85"
                                  title={`Hijri: ${getHijriDateString(cell.dateStr)}`}
                                >
                                  {getHijriDateString(cell.dateStr).split(" ")[0]}
                                </span>
                              )}

                              {!readOnly && (
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenAddDrawer(cell.dateStr);
                                  }}
                                  className="hidden @2xl:inline-block absolute right-0 top-0 opacity-0 group-hover:opacity-100 text-[10px] theme-accent font-bold px-1 rounded transition hover:theme-bg-surface cursor-pointer"
                                  title="Add schedule"
                                >
                                  +
                                </span>
                              )}
                            </div>

                            {/* Small Screen: Strictly ONE single dot indicator (একটি ডট থাকবে, এর বেশি না) */}
                            {dayEvents.length > 0 && topStyle && (
                              <div className="flex @md:hidden items-center justify-center mt-auto pb-0.5 shrink-0">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${topStyle.dot} shadow-2xs`}
                                  title={`${dayEvents.length} item(s)`}
                                />
                              </div>
                            )}

                            {/* Desktop/Tablet vertical spacer so cell holds proper height */}
                            <div className="hidden @md:block flex-1 min-h-[44px] pointer-events-none" />
                          </div>
                        );
                      })}
                    </div>

                    {/* Medium & Large Screens: Continuous Spanning Events Grid Layer across the Week */}
                    <div className="hidden @md:grid grid-cols-7 gap-x-1 sm:gap-x-1.5 gap-y-1 absolute inset-x-0 top-[30px] @sm:top-[32px] @xl:top-[34px] bottom-1 pointer-events-none z-10 auto-rows-max">
                      {weekEvents.map((item) => {
                        const { event: evt, startCol, span, isStart, isEnd, row } = item;
                        const style = getEventColors(evt, activeTenantId);
                        const isAllDay = evt.isFullDay || !evt.startTime || !evt.endTime;
                        const isMultiDay = span > 1 || !isStart || !isEnd;

                        const edgeClasses = isStart && isEnd
                          ? "mx-1 rounded-md"
                          : isStart && !isEnd
                          ? "ml-1 mr-0 rounded-l-md rounded-r-none"
                          : !isStart && isEnd
                          ? "ml-0 mr-1 rounded-r-md rounded-l-none"
                          : "mx-0 rounded-none";

                        return (
                          <div
                            key={`${evt.id}-${startCol}-${row}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEventDetail(evt, weekDays[startCol - 1]?.dateStr || evt.startDate);
                            }}
                            style={{
                              gridColumn: `${startCol} / span ${span}`,
                              gridRow: row,
                            }}
                            className={`h-[22px] px-2 py-0.5 text-[10px] font-semibold truncate transition-all cursor-pointer select-none pointer-events-auto flex items-center shadow-2xs ${style.solidBg} ${style.solidText} hover:brightness-105 ${edgeClasses}`}
                            title={`${evt.title}${!isAllDay ? ` (${formatTime12(evt.startTime)} - ${formatTime12(evt.endTime)})` : " (Full Day)"}${isMultiDay ? " (Multi-day Event)" : ""}`}
                          >
                            {/* Title rendered ONCE across the entire spanned width */}
                            <span className="truncate block font-medium leading-none">
                              {!isStart && <span className="opacity-70 mr-1 text-[9px] font-mono">...</span>}
                              {evt.title}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── 2. Horizon Timeline / Day Strip View (Modern Interactive Timeline) ─── */}
        {viewMode === "month" && displayMode === "timeline" && (
          <div className="flex flex-col w-full min-w-0">
            
            {/* Continuous Day-Number Strip - Borderless soft-tinted tiles */}
            <div
              ref={dayStripRef}
              onWheel={(e) => {
                const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
                if (delta !== 0) {
                  e.currentTarget.scrollLeft += delta;
                }
              }}
              className={`flex items-stretch overflow-x-auto scrollbar-none select-none min-w-0 cursor-grab active:cursor-grabbing border-0 gap-1.5 ${
                embeddedSurface ? "pb-2" : "p-2 sm:p-3 theme-bg-surface"
              }`}
            >
              {timelineStripDays.map((item) => {
                const isSelected = item.isCurrentMonth && item.dayNum === safeSelectedDay;
                const dEvents = getEventsForDate(item.dateStr, item.weekday);
                const isToday = item.dateStr === todayStr;
                const topEvent = dEvents.length > 0 ? dEvents[0] : null;
                const topColor = topEvent ? getEventColors(topEvent, activeTenantId) : null;

                return (
                  <DateHeaderCell
                    key={`${item.yearNum}-${item.monthIdx}-${item.dayNum}`}
                    as="button"
                    type="button"
                    dateStr={item.dateStr}
                    dayNum={item.dayNum}
                    weekday={item.weekday}
                    isHijriEnabled={isHijriEnabled}
                    hasEvent={Boolean(topEvent)}
                    eventColors={topColor}
                    eventTitle={topEvent ? topEvent.title : ""}
                    isSelected={isSelected}
                    isToday={isToday}
                    isCurrentMonth={item.isCurrentMonth}
                    keepNormalBgOnOtherMonths={true}
                    borderless={true}
                    onClick={() => {
                      if (item.isCurrentMonth) {
                        setSelectedDay(item.dayNum);
                      } else {
                        setCurrentDate(new Date(item.yearNum, item.monthIdx, item.dayNum));
                        setSelectedDay(item.dayNum);
                      }
                    }}
                    className="w-[36px] min-w-[36px] max-w-[36px] @sm:w-[42px] @sm:min-w-[42px] @sm:max-w-[42px] shrink-0"
                  />
                );
              })}
            </div>

            {/* Selected Day Main View: Vertical Timeline */}
            <div className={`${embeddedSurface ? "pt-2" : "p-2 @sm:p-3 @md:p-4"} space-y-2.5 @sm:space-y-3.5 min-w-0`}>
              
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
                  {selectedDayEvents.length} {selectedDayEvents.length === 1 ? "entry" : "entries"}
                </span>
              </div>

              {/* Timeline Cards Container */}
              {selectedDayEvents.length === 0 ? (
                <div className="p-6 @sm:p-10 text-center border-0 rounded-2xl theme-bg-app shadow-2xs my-1 flex flex-col items-center justify-center gap-2">
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
                      onClick={() => handleOpenAddDrawer(selectedDateStr)}
                      className="mt-1 px-3 py-1.5 rounded-xl text-xs font-bold border-0 theme-bg-surface hover:theme-bg-elevated theme-text-primary transition-all cursor-pointer shadow-xs"
                    >
                      + Add Schedule / Event
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2 @sm:space-y-3 pt-0.5 min-w-0">
                  {selectedDayEvents.map((evt, idx) => {
                    const style = getEventColors(evt, activeTenantId);
                    const isAllDay = evt.isFullDay || !evt.startTime || !evt.endTime;
                    const timeText = isAllDay ? "All Day" : formatTime12(evt.startTime);

                    return (
                      <div key={evt.id} className="flex items-start gap-1 @sm:gap-2 @md:gap-3 group min-w-0">
                        
                        {/* Left Time Column (Compact & pushed left on small screens) */}
                        <div className="flex flex-col items-end w-8 @sm:w-11 @md:w-16 shrink-0 pt-1.5 @sm:pt-2">
                          <span className={`text-[9px] @sm:text-xs font-mono font-bold ${style.text} text-right leading-tight`}>
                            {timeText}
                          </span>
                          {!isAllDay && evt.endTime && (
                            <span className="text-[8px] @sm:text-[10px] font-mono theme-text-secondary opacity-70 mt-0.5 text-right leading-tight">
                              {formatTime12(evt.endTime)}
                            </span>
                          )}
                        </div>

                        {/* Timeline Spine Line & Dot Indicator */}
                        <div className="flex flex-col items-center self-stretch shrink-0 relative pt-2 @sm:pt-2.5">
                          <div className={`w-1.5 h-1.5 @sm:w-2 @sm:h-2 rounded-full ${style.dot} group-hover:scale-125 transition-transform z-10`} />
                          {idx < selectedDayEvents.length - 1 && (
                            <div className="w-0.5 flex-1 bg-current opacity-15 mt-1" />
                          )}
                        </div>

                        {/* Event Card (Distinct soft surface inside parent container) */}
                        <div
                          onClick={() => handleOpenEventDetail(evt, selectedDateStr)}
                          className="flex-1 min-w-0 p-2 @sm:p-3 @md:p-3.5 rounded-2xl border-0 theme-bg-app hover:theme-bg-elevated/60 transition-all duration-200 cursor-pointer shadow-2xs relative overflow-hidden flex items-center justify-between gap-1.5 @sm:gap-2.5"
                        >
                          {/* Left Accent Bar */}
                          <div className={`absolute left-0 top-0 bottom-0 w-1 @sm:w-1.5 ${style.dot}`} />

                          <div className="min-w-0 flex-1 pl-1 space-y-0.5 @sm:space-y-1">
                            {/* Type Line */}
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="text-[8px] @sm:text-[10px] uppercase font-mono tracking-wider theme-text-secondary">Type:</span>
                              <span className={`text-[9px] @sm:text-[10px] font-bold px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                                {getEventDisplayType(evt, activeTenantId)}
                              </span>
                            </div>

                            {/* Subject / Title */}
                            <div className="flex items-start gap-1 min-w-0">
                              <span className="text-[8px] @sm:text-[10px] uppercase font-mono tracking-wider theme-text-secondary shrink-0 mt-0.5">Subject:</span>
                              <h4 className="text-xs @sm:text-sm font-bold theme-text-primary truncate flex-1">
                                {evt.title}
                              </h4>
                            </div>

                            {/* Meta details */}
                            <div className="text-[9px] @sm:text-[11px] theme-text-secondary mt-0.5 flex items-center gap-1.5 @sm:gap-3 flex-wrap">
                              <span>Audience: <strong className="theme-text-primary font-medium">{evt.audience || "ALL"}</strong></span>
                              {evt.repeats && <span className="font-mono opacity-80">(Weekly)</span>}
                              {evt.description && <span className="truncate opacity-80 max-w-xs">{evt.description}</span>}
                            </div>
                          </div>

                          {/* Right Chevron */}
                          <div className="flex items-center shrink-0">
                            <ChevronRightIcon className="w-3 h-3 @sm:w-4 @sm:h-4 theme-text-secondary group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── 3. Full Agenda / List View ─── */}
        {viewMode === "list" && (
          <div className={`${embeddedSurface ? "p-0" : "p-3 @sm:p-4"} space-y-2.5 @sm:space-y-3`}>
            {filteredEvents.length === 0 ? (
              <div className="p-10 @sm:p-12 text-center text-xs theme-text-secondary border-0 rounded-2xl theme-bg-app shadow-2xs">
                No events or working hours matching the filter criteria.
              </div>
            ) : (
              filteredEvents.map((evt) => {
                const style = getEventColors(evt, activeTenantId);
                const isAllDay = evt.isFullDay || !evt.startTime || !evt.endTime;

                return (
                  <div
                    key={evt.id}
                    onClick={() => handleOpenEventDetail(evt)}
                    className="p-3.5 @sm:p-4 rounded-2xl border-0 theme-bg-app hover:theme-bg-elevated/60 transition cursor-pointer flex flex-col @sm:flex-row items-start @sm:items-center justify-between gap-2.5 @sm:gap-4 shadow-2xs"
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
                          Audience: <strong className="theme-text-primary font-medium">{evt.audience || "ALL"}</strong>
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
                        <span>{evt.repeats ? "Repeats weekly" : evt.startDate}</span>
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
        )}
      </div>
    </div>
  );
}

