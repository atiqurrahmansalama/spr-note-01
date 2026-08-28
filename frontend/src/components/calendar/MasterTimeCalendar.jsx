import React, { useState, useMemo, useRef, useEffect } from "react";
import ActionMenu from "../ui/ActionMenu";
import CustomInput from "../ui/CustomInput";
import {
  CalendarIcon,
  SearchIcon,
  CloseIcon,
  TrashIcon,
  EditIcon,
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  GridIcon,
  TimelineIcon,
} from "../ui/Icons";
import DateHeaderCell from "../common/DateHeaderCell";
import { useRightSidebar } from "../../context/RightSidebarContext";
import { EVENT_COLORS } from "./TimeScheduleDrawerForm";
import { calendarEventTypesStore, calendarEventKindsStore, calendarSettings } from "../../utils/localStore";
import { useTenant } from "../../context/TenantContext";
import { getHijriDateString, getHijriDetails } from "../../utils/hijriUtils";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const MONTH_NAMES_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const WEEKDAY_NAMES_SHORT = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const WEEKDAY_NAMES_FULL = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
];

export const EVENT_COLOR_MAP = {
  emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/25", text: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500", hex: "#10b981" },
  indigo: { bg: "bg-indigo-500/10", border: "border-indigo-500/25", text: "text-indigo-600 dark:text-indigo-400", dot: "bg-indigo-500", hex: "#6366f1" },
  blue: { bg: "bg-blue-500/10", border: "border-blue-500/25", text: "text-blue-600 dark:text-blue-400", dot: "bg-blue-500", hex: "#3b82f6" },
  sky: { bg: "bg-sky-500/10", border: "border-sky-500/25", text: "text-sky-600 dark:text-sky-400", dot: "bg-sky-500", hex: "#0ea5e9" },
  cyan: { bg: "bg-cyan-500/10", border: "border-cyan-500/25", text: "text-cyan-600 dark:text-cyan-400", dot: "bg-cyan-500", hex: "#06b6d4" },
  teal: { bg: "bg-teal-500/10", border: "border-teal-500/25", text: "text-teal-600 dark:text-teal-400", dot: "bg-teal-500", hex: "#14b8a6" },
  violet: { bg: "bg-violet-500/10", border: "border-violet-500/25", text: "text-violet-600 dark:text-violet-400", dot: "bg-violet-500", hex: "#8b5cf6" },
  purple: { bg: "bg-purple-500/10", border: "border-purple-500/25", text: "text-purple-600 dark:text-purple-400", dot: "bg-purple-500", hex: "#a855f7" },
  fuchsia: { bg: "bg-fuchsia-500/10", border: "border-fuchsia-500/25", text: "text-fuchsia-600 dark:text-fuchsia-400", dot: "bg-fuchsia-500", hex: "#d946ef" },
  rose: { bg: "bg-rose-500/10", border: "border-rose-500/25", text: "text-rose-600 dark:text-rose-400", dot: "bg-rose-500", hex: "#f43f5e" },
  red: { bg: "bg-red-500/10", border: "border-red-500/25", text: "text-red-600 dark:text-red-400", dot: "bg-red-500", hex: "#ef4444" },
  orange: { bg: "bg-orange-500/10", border: "border-orange-500/25", text: "text-orange-600 dark:text-orange-400", dot: "bg-orange-500", hex: "#f97316" },
  amber: { bg: "bg-amber-500/10", border: "border-amber-500/25", text: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500", hex: "#f59e0b" },
  lime: { bg: "bg-lime-500/10", border: "border-lime-500/25", text: "text-lime-600 dark:text-lime-400", dot: "bg-lime-500", hex: "#84cc16" },
  slate: { bg: "bg-slate-500/10", border: "border-slate-500/25", text: "text-slate-600 dark:text-slate-400", dot: "bg-slate-500", hex: "#64748b" },
  // Soft & Light Pastel Colors
  mint: { bg: "bg-emerald-400/10", border: "border-emerald-400/25", text: "text-emerald-600 dark:text-emerald-300", dot: "bg-emerald-300", hex: "#6ee7b7" },
  lavender: { bg: "bg-violet-400/10", border: "border-violet-400/25", text: "text-violet-600 dark:text-violet-300", dot: "bg-violet-300", hex: "#c4b5fd" },
  peach: { bg: "bg-orange-400/10", border: "border-orange-400/25", text: "text-orange-600 dark:text-orange-300", dot: "bg-orange-300", hex: "#fdba74" },
  coral: { bg: "bg-rose-400/10", border: "border-rose-400/25", text: "text-rose-600 dark:text-rose-300", dot: "bg-rose-300", hex: "#fca5a5" },
  sage: { bg: "bg-green-400/10", border: "border-green-400/25", text: "text-green-600 dark:text-green-300", dot: "bg-green-300", hex: "#86efac" },
  ice: { bg: "bg-sky-400/10", border: "border-sky-400/25", text: "text-sky-600 dark:text-sky-300", dot: "bg-sky-300", hex: "#7dd3fc" },
  sand: { bg: "bg-slate-400/10", border: "border-slate-400/25", text: "text-slate-600 dark:text-slate-300", dot: "bg-slate-300", hex: "#cbd5e1" },
  pink: { bg: "bg-pink-400/10", border: "border-pink-400/25", text: "text-pink-600 dark:text-pink-300", dot: "bg-pink-300", hex: "#f472b6" },
  cream: { bg: "bg-amber-300/10", border: "border-amber-300/25", text: "text-amber-600 dark:text-amber-300", dot: "bg-amber-300", hex: "#fde68a" },
};

/**
 * Resolves the precise display label for any calendar event or schedule.
 * Looks up custom types configured in Developer Tools as well as built-in categories.
 */
export function getEventDisplayType(evt, tenantId) {
  if (!evt) return "Event";
  if (evt.category === "WORKING_HOURS" || evt.type === "WORKING_HOURS") {
    return "Working Hours";
  }

  // 1. Direct explicit type / kind
  const explicitType = evt.type || evt.event_type || evt.kind;

  // 2. Lookup in configured Event Types from Developer Tools store
  let matchedEventType = null;
  if (typeof window !== "undefined") {
    try {
      const types = calendarEventTypesStore.getEventTypes(tenantId);
      matchedEventType = types.find(
        (t) => t.id === evt.eventTypeId || t.name === evt.title || t.code === evt.code
      );
    } catch {}
  }

  const rawType = explicitType || matchedEventType?.type || (evt.category !== "ACADEMIC_EVENT" ? evt.category : null);

  const kindsMap = {
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

export function getEventColors(evt, tenantId) {
  const isWorkingHours = evt?.category === "WORKING_HOURS" || evt?.type === "WORKING_HOURS";

  // 1. Direct explicit color on event
  if (evt?.color && EVENT_COLOR_MAP[evt.color]) {
    const base = EVENT_COLOR_MAP[evt.color];
    if (isWorkingHours) {
      return {
        ...base,
        text: "theme-text-primary",
      };
    }
    return base;
  }

  // 2. Dynamic lookup from Developer Tools Event Types & Kinds
  if (typeof window !== "undefined") {
    try {
      const types = calendarEventTypesStore.getEventTypes(tenantId);
      const matchedType = types.find(
        (t) => t.id === evt?.eventTypeId || t.name === evt?.title || t.code === evt?.code
      );
      const rawType = matchedType?.type || evt?.type || evt?.event_type || evt?.kind || evt?.category;
      if (rawType) {
        const kinds = calendarEventKindsStore.getKinds(tenantId);
        const matchedKind = kinds.find(
          (k) => k.value === rawType || k.id === rawType || String(k.value).toUpperCase() === String(rawType).toUpperCase()
        );
        if (matchedKind?.color && EVENT_COLOR_MAP[matchedKind.color]) {
          const base = EVENT_COLOR_MAP[matchedKind.color];
          return isWorkingHours ? { ...base, text: "theme-text-primary" } : base;
        }
      }
    } catch {}
  }

  if (isWorkingHours) {
    return {
      bg: "theme-bg-accent-soft",
      border: "border-[var(--accent-main)]/20",
      text: "theme-text-primary",
      dot: "theme-bg-accent",
      hex: "#6366f1",
    };
  }

  // 3. Fallback based on display type
  const displayType = getEventDisplayType(evt, tenantId);
  if (displayType === "Holiday") return EVENT_COLOR_MAP.rose;
  if (displayType === "Exam") return EVENT_COLOR_MAP.amber;
  if (displayType === "Meeting") return EVENT_COLOR_MAP.blue;
  if (displayType === "Sports & Cultural") return EVENT_COLOR_MAP.purple;
  if (displayType === "Academic") return EVENT_COLOR_MAP.emerald;

  return EVENT_COLOR_MAP.emerald;
}

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

function getOrdinalSuffix(day) {
  if (day > 3 && day < 21) return "th";
  switch (day % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

export default function MasterTimeCalendar({
  events = [],
  onSaveEvent,
  onDeleteEvent,
  readOnly = false,
  selectedCategory = "WORKING_HOURS",
  viewMode: propViewMode,
  actionMenuItems = [],
  onDateSelect,
  onDisplayModeChange,
  className = "",
}) {
  const { openDrawer } = useRightSidebar();
  const { activeTenantId } = useTenant();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDate());
  const [searchQuery, setSearchQuery] = useState("");
  const [displayMode, setDisplayMode] = useState(() => {
    return localStorage.getItem("spr_calendar_display_mode") || "grid";
  });
  const [isHijriEnabled, setIsHijriEnabled] = useState(() => calendarSettings.getHijriEnabled());
  const [, setTaxonomyVersion] = useState(0);

  useEffect(() => {
    const handleSettingsUpdate = () => {
      setIsHijriEnabled(calendarSettings.getHijriEnabled());
    };
    const handleTaxonomyUpdate = () => {
      setTaxonomyVersion((v) => v + 1);
    };

    window.addEventListener("spr_calendar_settings_updated", handleSettingsUpdate);
    window.addEventListener("spr_calendar_event_kinds_updated", handleTaxonomyUpdate);
    window.addEventListener("spr_calendar_event_types_updated", handleTaxonomyUpdate);
    window.addEventListener("spr_calendar_events_updated", handleTaxonomyUpdate);
    return () => {
      window.removeEventListener("spr_calendar_settings_updated", handleSettingsUpdate);
      window.removeEventListener("spr_calendar_event_kinds_updated", handleTaxonomyUpdate);
      window.removeEventListener("spr_calendar_event_types_updated", handleTaxonomyUpdate);
      window.removeEventListener("spr_calendar_events_updated", handleTaxonomyUpdate);
    };
  }, []);

  const monthStripRef = useRef(null);
  const dayStripRef = useRef(null);

  const viewMode = propViewMode || (selectedCategory === "AGENDA" ? "list" : "month");
  const viewYear = currentDate.getFullYear();
  const viewMonth = currentDate.getMonth();

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

  const handleSetDisplayMode = (mode) => {
    setDisplayMode(mode);
    localStorage.setItem("spr_calendar_display_mode", mode);
    if (onDisplayModeChange) {
      onDisplayModeChange(mode);
    }
  };

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
  const handleOpenEventDetail = (evt, dateStr = "") => {
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

  // Open Right Sidebar for editing entry
  const handleEditEvent = (evt, dateStr = "") => {
    openDrawer("schedule", {
      mode: "edit",
      eventId: evt.id,
      category: evt.category,
      date: dateStr || selectedDateStr,
    });
  };

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (selectedCategory && selectedCategory !== "ALL" && selectedCategory !== "AGENDA") {
        if (selectedCategory === "WORKING_HOURS") {
          if (e.category !== "WORKING_HOURS") return false;
        } else if (selectedCategory === "ACADEMIC_EVENT") {
          // Under Academic Events tab, include all academic events, exams, holidays, etc.
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

  const monthGridDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells = [];

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

  const getEventsForDate = (dateStr, weekday) => {
    return filteredEvents
      .filter((e) => {
        // If this occurrence has an exception/override, skip the recurring parent
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
        const rankA = a.priorityRank !== undefined && a.priorityRank !== null ? Number(a.priorityRank) : (a.rank !== undefined ? Number(a.rank) : 999);
        const rankB = b.priorityRank !== undefined && b.priorityRank !== null ? Number(b.priorityRank) : (b.rank !== undefined ? Number(b.rank) : 999);
        return rankA - rankB;
      });
  };

  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  // Timeline selected day safe resolution
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

  // Continuous Day Strip: Includes days from previous and next months for seamless scrolling beyond month boundaries
  const timelineStripDays = useMemo(() => {
    const list = [];
    const prevMonthLastDate = new Date(viewYear, viewMonth, 0).getDate();

    // 10 trailing days from previous month
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

    // All days of current view month
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

    // 14 leading days from next month
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

  // Attach mouse wheel and drag-to-scroll to an element
  const setupHorizontalScroll = (el) => {
    if (!el) return () => {};

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    const handleWheel = (e) => {
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (delta !== 0) {
        e.preventDefault();
        e.stopPropagation();
        el.scrollLeft += delta;
      }
    };

    const handleMouseDown = (e) => {
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

    const handleMouseMove = (e) => {
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

  // Setup wheel & drag scroll for day strip
  useEffect(() => {
    const cleanupDay = setupHorizontalScroll(dayStripRef.current);
    return () => {
      cleanupDay();
    };
  }, [displayMode, viewMonth, viewYear]);

  // Auto-scroll selected day into view in day strip
  useEffect(() => {
    if (dayStripRef.current && displayMode === "timeline") {
      const activeEl = dayStripRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }
  }, [selectedDay, viewMonth, viewYear, displayMode]);

  return (
    <div className={`flex flex-col w-full min-w-0 @container ${className}`}>
      
      {/* ─── Single Unified Calendar Control Bar Card ──────────────────── */}
      <div className="p-3 sm:p-4 rounded-2xl border theme-border theme-bg-surface shadow-xs flex flex-col @lg:flex-row items-stretch @lg:items-center justify-between gap-3 mb-4 w-full min-w-0">
        
        {/* Left Side: Month Navigator with Arrow Buttons & Hijri Date or Agenda Header */}
        {viewMode === "month" ? (
          <div className="flex items-center gap-2 @sm:gap-3 shrink-0 flex-wrap">
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-xl theme-bg-sub border theme-border hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary transition cursor-pointer shadow-2xs shrink-0"
                title="Previous Month"
              >
                <ChevronLeftIcon className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-xl theme-bg-sub border theme-border hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary transition cursor-pointer shadow-2xs shrink-0"
                title="Next Month"
              >
                <ChevronRightIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-col">
              <h3 className="text-sm @sm:text-base font-bold theme-text-primary tracking-tight leading-tight">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </h3>
              {isHijriEnabled && hijriMonthHeader && (
                <span className="text-[10px] @sm:text-xs font-mono theme-accent font-semibold leading-none pt-0.5">
                  {hijriMonthHeader}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleJumpToday}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold theme-bg-sub border theme-border hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary transition flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
              title="Jump to Today"
            >
              <CalendarIcon className="w-3.5 h-3.5 theme-accent" />
              <span>Today</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 shrink-0">
            <h3 className="text-sm @sm:text-base font-bold theme-text-primary tracking-tight">
              Upcoming Agenda & Schedules
            </h3>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20">
              {filteredEvents.length} items
            </span>
          </div>
        )}

        {/* Right Side Tools: Single Toggle View Switcher, Custom Search & ActionMenu */}
        <div className="flex items-center gap-2 justify-between @lg:justify-end flex-1 @lg:flex-none min-w-0">
          
          {/* Single View Mode Toggle Button */}
          {viewMode === "month" && (
            <button
              type="button"
              onClick={() => handleSetDisplayMode(displayMode === "grid" ? "timeline" : "grid")}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold theme-bg-sub border theme-border hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary transition flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0 select-none"
              title={displayMode === "grid" ? "Switch to Timeline View" : "Switch to Grid View"}
            >
              {displayMode === "grid" ? (
                <>
                  <TimelineIcon className="w-3.5 h-3.5 theme-accent" />
                  <span>Timeline</span>
                </>
              ) : (
                <>
                  <GridIcon className="w-3.5 h-3.5 theme-accent" />
                  <span>Grid</span>
                </>
              )}
            </button>
          )}

          {/* Reusable Search Box with CustomInput */}
          <div className="flex-1 @sm:w-48 @lg:w-60 min-w-0">
            <CustomInput
              type="search"
              size="md"
              value={searchQuery}
              onChange={(val) => setSearchQuery(val)}
              placeholder="Search..."
              clearable={true}
            />
          </div>

          {/* Three-dots Action Menu */}
          {actionMenuItems && actionMenuItems.length > 0 && (
            <ActionMenu items={actionMenuItems} />
          )}
        </div>
      </div>

      {/* ─── Calendar Main Content Area ─── */}
      <div className="overflow-hidden rounded-2xl border theme-border theme-bg-surface shadow-xs w-full min-w-0">
        
        {/* ─── 1. Traditional 7-Column Month Grid View ─── */}
        {viewMode === "month" && displayMode === "grid" && (
          <div className="flex flex-col w-full min-w-0">
            {/* Weekday Header Columns (SUN to SAT) */}
            <div className="grid grid-cols-7 border-b theme-border theme-bg-sub/60 text-center select-none shrink-0">
              {WEEKDAY_NAMES_SHORT.map((wd) => (
                <div key={wd} className="py-1 @sm:py-2 text-[9px] @sm:text-[10px] @lg:text-xs font-bold tracking-wider uppercase border-r theme-border last:border-r-0 theme-text-secondary">
                  {wd}
                </div>
              ))}
            </div>

            {/* Month Day Cells Grid (Square & Compact on Mobile / Narrow Containers - No bottom dead space) */}
            <div className="grid grid-cols-7 w-full bg-[var(--border-color,rgba(0,0,0,0.06))] gap-px">
              {monthGridDays.map((cell) => {
                const dayEvents = getEventsForDate(cell.dateStr, cell.weekday);
                const isToday = cell.dateStr === todayStr;

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
                        // Switch to Timeline view on this selected day to immediately display all works for this day
                        handleSetDisplayMode("timeline");
                      } else if (!readOnly) {
                        handleOpenAddDrawer(cell.dateStr);
                      }
                    }}
                    className={`aspect-square @xl:aspect-auto min-h-0 @xl:min-h-[110px] w-full p-1 @sm:p-1.5 @xl:p-2 flex flex-col items-center @xl:items-stretch justify-center @xl:justify-between transition-colors cursor-pointer group relative select-none ${
                      cell.isCurrentMonth
                        ? "theme-bg-surface hover:theme-bg-sub/40"
                        : "theme-bg-sub/30 opacity-40 hover:opacity-75"
                    }`}
                    title={dayEvents.length > 0 ? `${dayEvents.length} item(s) on ${cell.dateStr}. Click to view all works.` : cell.dateStr}
                  >
                    {/* Top: Day Number (Top Left/Center) & Hijri Day Number (Top Right) */}
                    <div className="flex items-center justify-between relative w-full mb-0.5">
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
                          {getHijriDateString(cell.dateStr).split(' ')[0]}
                        </span>
                      )}

                      {!readOnly && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenAddDrawer(cell.dateStr);
                          }}
                          className="hidden @2xl:inline-block absolute right-0 top-0 opacity-0 group-hover:opacity-100 text-[10px] theme-accent font-bold px-1 rounded transition hover:theme-bg-sub cursor-pointer"
                          title="Add schedule"
                        >
                          +
                        </span>
                      )}
                    </div>

                    {/* Middle: Event Indicators */}
                    {/* Compact View (< @xl): Colored Dots Indicator centered directly below day number in the square box */}
                    <div className="flex @xl:hidden items-center justify-center gap-1 mt-0.5 max-w-full">
                      {dayEvents.slice(0, 3).map((evt) => {
                        const style = getEventColors(evt, activeTenantId);
                        return (
                          <span
                            key={evt.id}
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot} shadow-2xs`}
                            title={`${evt.title} (${evt.category === 'WORKING_HOURS' ? 'Working Hours' : 'Event'})`}
                          />
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <span
                          className="text-[8px] font-mono font-bold theme-text-secondary leading-none px-0.5 rounded theme-bg-sub border theme-border"
                          title={`+${dayEvents.length - 3} more items`}
                        >
                          +{dayEvents.length - 3}
                        </span>
                      )}
                    </div>

                    {/* Wide Container View (>= @xl): Full Event Pills */}
                    <div className="hidden @xl:block flex-1 space-y-1 overflow-y-auto max-h-[84px] scrollbar-none mt-1">
                      {dayEvents.map((evt) => {
                        const style = getEventColors(evt, activeTenantId);
                        const isAllDay = evt.isFullDay || !evt.startTime || !evt.endTime;

                        return (
                          <div
                            key={evt.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEventDetail(evt, cell.dateStr);
                            }}
                            className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold truncate transition-all cursor-pointer select-none drop-shadow-2xs ${style.bg} ${style.text} border ${style.border} hover:opacity-90 shadow-2xs`}
                            title={`${evt.title}${!isAllDay ? ` (${formatTime12(evt.startTime)} - ${formatTime12(evt.endTime)})` : " (Full Day)"}`}
                          >
                            {!isAllDay ? (
                              <span className="font-mono">
                                {formatTime12(evt.startTime)}-{formatTime12(evt.endTime)}
                              </span>
                            ) : (
                              <span className="truncate">{evt.title}</span>
                            )}
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
            
            {/* Continuous Day-Number Strip - Supports smooth scrolling beyond month boundaries (Prev, Current & Next Month) */}
            <div
              ref={dayStripRef}
              onWheel={(e) => {
                const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
                if (delta !== 0) {
                  e.currentTarget.scrollLeft += delta;
                }
              }}
              className="flex items-stretch overflow-x-auto scrollbar-none select-none theme-bg-surface min-w-0 cursor-grab active:cursor-grabbing border-b theme-border"
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
                    onClick={() => {
                      if (item.isCurrentMonth) {
                        setSelectedDay(item.dayNum);
                      } else {
                        setCurrentDate(new Date(item.yearNum, item.monthIdx, item.dayNum));
                        setSelectedDay(item.dayNum);
                      }
                    }}
                    className="w-[34px] min-w-[34px] max-w-[34px] @sm:w-[40px] @sm:min-w-[40px] @sm:max-w-[40px] shrink-0"
                  />
                );
              })}
            </div>

            {/* Selected Day Main View: Vertical Timeline (Maximized width for sidebars) */}
            <div className="p-1.5 @sm:p-3 @md:p-5 space-y-2 @sm:space-y-3.5 min-w-0">
              
              {/* Top Selected Day Date Header with Hijri Date */}
              <div className="flex items-center justify-between gap-2 px-1 pb-1.5 border-b theme-border flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs @sm:text-sm font-bold theme-text-primary">
                    {WEEKDAY_NAMES_FULL[selectedWeekday]}, {selectedDay} {MONTH_NAMES[viewMonth]} {viewYear}
                  </span>
                  {isHijriEnabled && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] @sm:text-[11px] font-mono font-bold theme-bg-accent-soft theme-accent border theme-border">
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
                <div className="p-6 @sm:p-10 text-center border theme-border rounded-xl @sm:rounded-2xl theme-bg-sub/30 my-2 flex flex-col items-center justify-center gap-2">
                  <div className="p-2.5 rounded-xl theme-bg-surface border theme-border theme-text-secondary opacity-60 shadow-inner">
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
                      className="mt-1 px-3 py-1.5 rounded-xl text-xs font-bold border theme-border theme-bg-surface hover:theme-bg-elevated theme-text-primary transition-all cursor-pointer shadow-xs"
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
                          <div className={`w-1.5 h-1.5 @sm:w-2 @sm:h-2 rounded-full ${style.dot} ring-2 ring-transparent group-hover:scale-125 transition-transform z-10`} />
                          {idx < selectedDayEvents.length - 1 && (
                            <div className="w-0.5 flex-1 bg-[var(--border-color,rgba(0,0,0,0.1))] mt-1" />
                          )}
                        </div>

                        {/* Event Card (Maximum usable width) */}
                        <div
                          onClick={() => handleOpenEventDetail(evt, selectedDateStr)}
                          className="flex-1 min-w-0 p-1.5 @sm:p-2.5 @md:p-3.5 rounded-xl @sm:rounded-2xl border theme-border theme-bg-surface hover:theme-bg-sub/50 transition-all duration-200 cursor-pointer shadow-2xs relative overflow-hidden flex items-center justify-between gap-1.5 @sm:gap-2.5"
                        >
                          {/* Left Accent Bar */}
                          <div className={`absolute left-0 top-0 bottom-0 w-1 @sm:w-1.5 ${style.dot}`} />

                          <div className="min-w-0 flex-1 pl-1 space-y-0.5 @sm:space-y-1">
                            {/* Type Line */}
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="text-[8px] @sm:text-[10px] uppercase font-mono tracking-wider theme-text-secondary">Type:</span>
                              <span className={`text-[9px] @sm:text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${style.bg} ${style.text} ${style.border}`}>
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

                          {/* Right Avatar Badge & Chevron */}
                          <div className="flex items-center gap-1 @sm:gap-2 shrink-0">
                            <div className={`w-6 h-6 @sm:w-8 @sm:h-8 rounded-full flex items-center justify-center font-bold font-mono text-[9px] @sm:text-xs ${style.bg} ${style.text} border ${style.border} shadow-2xs`}>
                              {(evt.audience || "ALL").slice(0, 2).toUpperCase()}
                            </div>
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
          <div className="p-3 @sm:p-4 space-y-2.5 @sm:space-y-3">
            {filteredEvents.length === 0 ? (
              <div className="p-10 @sm:p-12 text-center text-xs theme-text-secondary border theme-border rounded-xl theme-bg-sub/30">
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
                    className="p-3.5 @sm:p-4 rounded-xl border theme-border theme-bg-surface hover:theme-bg-sub/50 transition cursor-pointer flex flex-col @sm:flex-row items-start @sm:items-center justify-between gap-2.5 @sm:gap-4 shadow-xs"
                  >
                    <div className="flex items-start @sm:items-center gap-3 min-w-0 flex-1">
                      <div className={`w-2.5 h-2.5 @sm:w-3 @sm:h-3 rounded-full shrink-0 mt-1 @sm:mt-0 ${style.dot}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs @sm:text-sm font-bold theme-text-primary truncate">{evt.title}</h4>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${style.bg} ${style.text} ${style.border}`}>
                            {getEventDisplayType(evt, activeTenantId)}
                          </span>
                        </div>
                        <p className="text-[11px] @sm:text-xs theme-text-secondary mt-0.5 truncate">
                          Audience: <strong className="theme-text-primary font-medium">{evt.audience || "ALL"}</strong>
                          {evt.description && <span className="ml-1 opacity-80">({evt.description})</span>}
                        </p>
                      </div>
                    </div>

                    <div className="text-left @sm:text-right shrink-0 flex @sm:flex-col items-center @sm:items-end justify-between w-full @sm:w-auto pt-1 @sm:pt-0 border-t @sm:border-t-0 theme-border">
                      {!isAllDay ? (
                        <div className={`font-mono font-bold text-xs ${style.text}`}>
                          {formatTime12(evt.startTime)} – {formatTime12(evt.endTime)}
                        </div>
                      ) : (
                        <div className="text-xs font-semibold theme-text-secondary">Full Day</div>
                      )}
                      <div className="text-[10px] @sm:text-[11px] theme-text-secondary mt-0.5 font-mono flex items-center gap-1.5 flex-wrap">
                        <span>{evt.repeats ? `Repeats weekly` : evt.startDate}</span>
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
