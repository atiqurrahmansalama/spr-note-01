import React, { useState, useMemo, useRef, useEffect, useLayoutEffect, useCallback } from "react";
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
  CheckCircleIcon,
} from "../../../../components/ui/Icons";
import DateHeaderCell from "../../../../components/common/DateHeaderCell";
import { useRightSidebar } from "../../../../context/RightSidebarContext";
import { calendarEventTypesStore, calendarEventKindsStore, calendarSettings } from "../../../../utils/localStore";
import { useTenant } from "../../../../context/TenantContext";
import { getHijriDateString, getHijriDetails } from "../../../../utils/hijriUtils";
import type { CalendarEvent, CalendarCategory, CalendarDisplayMode, DeleteEventOptions } from "../types";
import { EVENT_COLOR_MAP, resolveCanonicalEventColor, type EventColorStyle } from "../constants/eventColors";
import { useUserTasks } from "../tasks/useUserTasks";

export { EVENT_COLOR_MAP, type EventColorStyle };

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAY_NAMES_SHORT = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const WEEKDAY_NAMES_FULL = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
];

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
    return EVENT_COLOR_MAP.eucalyptus;
  }
  const cacheKey = `${tenantId || "def"}_${evt.id || evt.title || ""}_${evt.color || ""}_${evt.category || ""}_${evt.type || ""}`;
  if (eventColorsCache.has(cacheKey)) {
    return eventColorsCache.get(cacheKey)!;
  }

  const isWorkingHours = evt?.category === "WORKING_HOURS" || evt?.type === "WORKING_HOURS";

  // 1. Direct explicit color on event (supports canonical and legacy keys)
  if (evt?.color) {
    const canonicalColor = resolveCanonicalEventColor(evt.color, "");
    const base = EVENT_COLOR_MAP[canonicalColor] || EVENT_COLOR_MAP[evt.color];
    if (base) {
      const res: EventColorStyle = isWorkingHours ? { ...base, text: "theme-text-primary" } : base;
      eventColorsCache.set(cacheKey, res);
      return res;
    }
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
        if (matchedKind?.color) {
          const canonicalColor = resolveCanonicalEventColor(matchedKind.color);
          const base = EVENT_COLOR_MAP[canonicalColor] || EVENT_COLOR_MAP[matchedKind.color];
          if (base) {
            const res: EventColorStyle = isWorkingHours ? { ...base, text: "theme-text-primary" } : base;
            eventColorsCache.set(cacheKey, res);
            return res;
          }
        }
      }
    } catch {}
  }

  if (isWorkingHours) {
    const res: EventColorStyle = {
      ...EVENT_COLOR_MAP.blueberry,
      text: "theme-text-primary",
    };
    eventColorsCache.set(cacheKey, res);
    return res;
  }

  // 3. Fallback based on display type using canonical 13-color palette
  const displayType = getEventDisplayType(evt, tenantId);
  let fallback = EVENT_COLOR_MAP.eucalyptus;
  if (displayType === "Holiday") fallback = EVENT_COLOR_MAP.radicchio;
  else if (displayType === "Exam") fallback = EVENT_COLOR_MAP.flamingo;
  else if (displayType === "Meeting") fallback = EVENT_COLOR_MAP.peacock;
  else if (displayType === "Sports & Cultural") fallback = EVENT_COLOR_MAP.amethyst;
  else if (displayType === "Academic") fallback = EVENT_COLOR_MAP.eucalyptus;

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
  showPersonalTasks?: boolean;
  onTogglePersonalTasks?: () => void;
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
  showPersonalTasks: propShowPersonalTasks,
  onTogglePersonalTasks,
}: MasterTimeCalendarProps) {
  const { openDrawer } = useRightSidebar();
  const { activeTenantId } = useTenant();
  const { tasks: userTasks, getTasksForDate, toggleTaskStatus } = useUserTasks();
  const [internalShowPersonalTasks, setInternalShowPersonalTasks] = useState<boolean>(true);
  const showPersonalTasks = propShowPersonalTasks !== undefined ? propShowPersonalTasks : internalShowPersonalTasks;
  const setShowPersonalTasks = onTogglePersonalTasks || setInternalShowPersonalTasks;

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

  // Track whether today's date element in timeline strip has scrolled out of the visible horizontal viewport
  const [isTodayScrolledOutOfView, setIsTodayScrolledOutOfView] = useState(false);
  const isProgrammaticScrollRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const checkTodayVisibility = useCallback(() => {
    if (!dayStripRef.current || displayMode !== "timeline") {
      setIsTodayScrolledOutOfView(false);
      return;
    }
    const container = dayStripRef.current;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const todayEl = (container.querySelector(`[data-datestr="${todayStr}"]`) as HTMLElement | null) ||
                    (container.querySelector(`[data-date="${todayStr}"]`) as HTMLElement | null) ||
                    (container.querySelector('[data-today="true"]') as HTMLElement | null);
    if (!todayEl) {
      setIsTodayScrolledOutOfView(true);
      return;
    }

    // 1. Try DOM offset calculation (robust against display/animation/tab transition states)
    if (container.clientWidth > 0 && todayEl.offsetWidth > 0) {
      const scrollLeft = container.scrollLeft;
      const clientWidth = container.clientWidth;
      const elLeft = todayEl.offsetLeft;
      const elWidth = todayEl.offsetWidth;

      // Element is scrolled out if its right edge is before the visible viewport or its left edge is past the visible viewport
      const isOutScroll = (elLeft + elWidth <= scrollLeft + 8) || (elLeft >= scrollLeft + clientWidth - 8);
      setIsTodayScrolledOutOfView(isOutScroll);
      return;
    }

    // 2. Fallback to bounding client rect if clientWidth is ready
    const containerRect = container.getBoundingClientRect();
    const todayRect = todayEl.getBoundingClientRect();
    if (containerRect.width > 0 && todayRect.width > 0) {
      const isOut = todayRect.right <= containerRect.left + 8 || todayRect.left >= containerRect.right - 8;
      setIsTodayScrolledOutOfView(isOut);
    }
  }, [displayMode]);

  const scrollToTimelineDate = useCallback((date: Date, behavior: ScrollBehavior = "smooth") => {
    if (!dayStripRef.current || displayMode !== "timeline") return;
    isProgrammaticScrollRef.current = true;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const targetStr = `${y}-${m}-${d}`;

    const el = dayStripRef.current;
    const targetEl = (el.querySelector(`[data-datestr="${targetStr}"]`) as HTMLElement | null) ||
                     (el.querySelector(`[data-date="${targetStr}"]`) as HTMLElement | null);
    if (targetEl) {
      const targetCenter = targetEl.offsetLeft - (el.clientWidth / 2) + (targetEl.offsetWidth / 2);
      const distance = Math.abs(el.scrollLeft - targetCenter);

      // Instant positioning if requested ("auto") or distance is large (>800px) so it doesn't take seconds to crawl
      if (behavior === "auto" || distance > 800) {
        el.scrollLeft = Math.max(0, targetCenter);
      } else {
        targetEl.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }

    scrollTimeoutRef.current = setTimeout(() => {
      isProgrammaticScrollRef.current = false;
      checkTodayVisibility();
    }, behavior === "smooth" ? 250 : 20);
  }, [displayMode, checkTodayVisibility]);

  // Determine if Today button should be displayed
  const shouldShowTodayButton = useMemo(() => {
    if (viewMode !== "month") return false;
    const now = new Date();
    const isCurrentMonthYear = viewYear === now.getFullYear() && viewMonth === now.getMonth();

    if (displayMode === "grid") {
      return !isCurrentMonthYear;
    }

    // In timeline view: show if not in current month/year, or not today selected, or today pill scrolled off-screen
    return !isCurrentMonthYear || selectedDay !== now.getDate() || isTodayScrolledOutOfView;
  }, [viewMode, displayMode, viewYear, viewMonth, selectedDay, isTodayScrolledOutOfView]);

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
    const nextDate = new Date(viewYear, viewMonth - 1, 1);
    setCurrentDate(nextDate);
    setSelectedDay(1);
    if (displayMode === "timeline") {
      scrollToTimelineDate(nextDate, "smooth");
    }
  };

  const handleNextMonth = () => {
    const nextDate = new Date(viewYear, viewMonth + 1, 1);
    setCurrentDate(nextDate);
    setSelectedDay(1);
    if (displayMode === "timeline") {
      scrollToTimelineDate(nextDate, "smooth");
    }
  };

  const handleJumpToday = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDay(now.getDate());
    if (displayMode === "timeline") {
      scrollToTimelineDate(now, "auto");
    } else {
      setTimeout(() => {
        checkTodayVisibility();
      }, 60);
    }
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
      category: selectedCategory === "WORKING_HOURS" ? "WORKING_HOURS" : "ACADEMIC_EVENT",
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
  const getWeekEvents = (weekDays: MonthGridCell[]): { items: WeekEventItem[]; maxTracks: number; daysWithOverflow: Set<number> } => {
    if (weekDays.length !== 7) return { items: [], maxTracks: 0, daysWithOverflow: new Set() };

    // Option 2 (Google Calendar & Linear standard):
    // For days with more than 3 events, reserve row 3 (track index 2) for the "+N more" interactive counter pill
    // Never show +N more on padding days belonging to other months
    const daysWithOverflow = new Set<number>(); // 1-based col (1 to 7)
    weekDays.forEach((cell, idx) => {
      if (!cell.isCurrentMonth) return;
      const dayEvts = getEventsForDate(cell.dateStr, cell.weekday);
      if (dayEvts.length > 3) {
        daysWithOverflow.add(idx + 1);
      }
    });

    const rawItems: Omit<WeekEventItem, "row">[] = [];

    filteredEvents.forEach((evt) => {
      // Find all active columns (1 to 7) for this event within this 7-day week
      const activeCols: number[] = [];

      weekDays.forEach((cell, idx) => {
        const col = idx + 1; // 1-based (1 = Sun, 7 = Sat)
        const dateStr = cell.dateStr;
        const weekday = cell.weekday;

        // Multi-day spanning events on the current page must strictly constrain to the current month's dates
        // Leading or trailing padding days belonging to adjacent months are not spanned across
        if (!cell.isCurrentMonth) {
          return;
        }

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

    // Greedy non-overlapping track allocation (Strictly maximum 3 lines for events/shifts in Month Grid)
    const MAX_EVENT_ROWS = 3;
    const tracks: boolean[][] = [
      new Array(7).fill(false),
      new Array(7).fill(false),
      new Array(7).fill(false),
    ];
    // Reserve row 3 for "+N more" pill on overflow days so spanning events don't overwrite the pill
    daysWithOverflow.forEach((col) => {
      tracks[2][col - 1] = true;
    });

    const items: WeekEventItem[] = [];

    rawItems.forEach((item) => {
      let assignedRow = 0;
      while (assignedRow < MAX_EVENT_ROWS) {
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

    return { items, maxTracks: Math.min(MAX_EVENT_ROWS, tracks.length), daysWithOverflow };
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

  const [timelineRange, setTimelineRange] = useState<{ startYear: number; endYear: number }>(() => {
    const curY = new Date().getFullYear();
    return { startYear: curY - 2, endYear: curY + 2 };
  });

  // Dynamically expand timeline range when viewYear approaches boundaries
  useEffect(() => {
    setTimelineRange((prev) => {
      let { startYear, endYear } = prev;
      let changed = false;
      if (viewYear <= startYear) {
        startYear = viewYear - 2;
        changed = true;
      }
      if (viewYear >= endYear) {
        endYear = viewYear + 2;
        changed = true;
      }
      return changed ? { startYear, endYear } : prev;
    });
  }, [viewYear]);

  // Continuous multi-year Day Strip for Timeline
  const timelineStripDays: TimelineStripDay[] = useMemo(() => {
    const list: TimelineStripDay[] = [];
    const { startYear, endYear } = timelineRange;

    for (let y = startYear; y <= endYear; y++) {
      for (let m = 0; m < 12; m++) {
        const daysInMonth = new Date(y, m + 1, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
          const dObj = new Date(y, m, d);
          const dStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          list.push({
            dateObj: dObj,
            dateStr: dStr,
            dayNum: d,
            monthIdx: m,
            yearNum: y,
            weekday: dObj.getDay(),
            isCurrentMonth: y === viewYear && m === viewMonth,
          });
        }
      }
    }

    return list;
  }, [timelineRange, viewYear, viewMonth]);

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

  const scrollRafIdRef = useRef<number | null>(null);
  const hasMountedTimelineRef = useRef(false);

  const handleScroll = useCallback(() => {
    checkTodayVisibility();

    if (isProgrammaticScrollRef.current || displayMode !== "timeline") return;

    if (scrollRafIdRef.current) {
      cancelAnimationFrame(scrollRafIdRef.current);
    }

    scrollRafIdRef.current = requestAnimationFrame(() => {
      const el = dayStripRef.current;
      if (!el || el.children.length === 0) return;

      const centerScroll = el.scrollLeft + el.clientWidth / 2;
      const firstChild = el.children[0] as HTMLElement;
      const itemTotalWidth = firstChild.offsetWidth + 6;
      if (itemTotalWidth <= 0) return;

      const centerIdx = Math.max(
        0,
        Math.min(el.children.length - 1, Math.round(centerScroll / itemTotalWidth))
      );
      const centerEl = el.children[centerIdx] as HTMLElement;
      if (!centerEl) return;

      const y = Number(centerEl.getAttribute("data-year"));
      const m = Number(centerEl.getAttribute("data-month"));
      if (!isNaN(y) && !isNaN(m)) {
        setCurrentDate((prev) => {
          if (prev.getFullYear() === y && prev.getMonth() === m) {
            return prev;
          }
          return new Date(y, m, prev.getDate());
        });
      }
    });
  }, [checkTodayVisibility, displayMode]);

  useEffect(() => {
    const el = dayStripRef.current;
    const cleanupDay = setupHorizontalScroll(el);

    let resizeObserver: ResizeObserver | null = null;
    let intersectionObserver: IntersectionObserver | null = null;

    if (el) {
      el.addEventListener("scroll", handleScroll, { passive: true });
      window.addEventListener("resize", handleScroll, { passive: true });

      // Observe container size changes (tab switch, sidebar toggle, layout settle)
      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => {
          checkTodayVisibility();
        });
        resizeObserver.observe(el);
      }
    }

    // IntersectionObserver to observe today's date element inside the scrollable strip
    const attachIntersectionObserver = () => {
      if (!el || displayMode !== "timeline") return;
      const todayEl = (el.querySelector('[data-today="true"]') as HTMLElement | null) ||
                      (el.querySelector(`[data-datestr="${new Date().toISOString().split("T")[0]}"]`) as HTMLElement | null);
      if (!todayEl) {
        setIsTodayScrolledOutOfView(true);
        return;
      }

      if (typeof IntersectionObserver !== "undefined") {
        if (intersectionObserver) intersectionObserver.disconnect();
        intersectionObserver = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              const isVisible = entry.isIntersecting && entry.intersectionRatio > 0.15;
              setIsTodayScrolledOutOfView(!isVisible);
            }
          },
          {
            root: el,
            threshold: [0, 0.15, 0.5, 1.0],
          }
        );
        intersectionObserver.observe(todayEl);
      }
    };

    checkTodayVisibility();
    attachIntersectionObserver();

    // Multi-stage timers to ensure measurements settle across transitions and font loads
    const t1 = setTimeout(() => {
      checkTodayVisibility();
      attachIntersectionObserver();
    }, 60);
    const t2 = setTimeout(() => {
      checkTodayVisibility();
      attachIntersectionObserver();
    }, 200);
    const t3 = setTimeout(() => {
      checkTodayVisibility();
      attachIntersectionObserver();
    }, 500);

    return () => {
      cleanupDay();
      if (el) {
        el.removeEventListener("scroll", handleScroll);
      }
      window.removeEventListener("resize", handleScroll);
      if (resizeObserver) resizeObserver.disconnect();
      if (intersectionObserver) intersectionObserver.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (scrollRafIdRef.current) cancelAnimationFrame(scrollRafIdRef.current);
    };
  }, [displayMode, handleScroll, checkTodayVisibility]);

  // Initial timeline centering when mounting or switching to timeline view: instant positioning with 0ms delay
  useLayoutEffect(() => {
    if (displayMode === "timeline" && dayStripRef.current) {
      const targetDate = selectedDateObj || currentDate;
      scrollToTimelineDate(targetDate, "auto");
    }
  }, [displayMode, scrollToTimelineDate]);

  useEffect(() => {
    if (dayStripRef.current && displayMode === "timeline" && !isProgrammaticScrollRef.current) {
      const activeEl = dayStripRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
      const t1 = setTimeout(checkTodayVisibility, 80);
      const t2 = setTimeout(checkTodayVisibility, 250);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [selectedDay, displayMode, checkTodayVisibility]);

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
            
            {/* View Mode Toggle (Grid/Timeline) & Today Button Group */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Today Button: Placed before the Grid/Timeline view button */}
              {shouldShowTodayButton && (
                <CustomButton
                  type="button"
                  variant={navControlVariant}
                  size="sm"
                  icon={CalendarIcon}
                  onClick={handleJumpToday}
                  title="Jump to Today"
                  className="shrink-0 select-none transition-all duration-150"
                >
                  <span>Today</span>
                </CustomButton>
              )}

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

              {/* Personal Tasks Overlay Toggle */}
              {viewMode === "month" && (
                <CustomButton
                  type="button"
                  variant={showPersonalTasks ? "primary" : navControlVariant}
                  size="sm"
                  icon={CheckCircleIcon}
                  onClick={() => setShowPersonalTasks((prev) => !prev)}
                  title={showPersonalTasks ? "Personal Tasks Active. Click to hide." : "Personal Tasks Hidden. Click to show."}
                  className="shrink-0 select-none"
                >
                  <span className="hidden @[560px]:inline">Tasks</span>
                </CustomButton>
              )}
            </div>

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
          <div className={`flex flex-col w-full min-w-0 ${embeddedSurface ? "p-0 pb-4" : "p-2 sm:p-3 pb-5 sm:pb-6"}`}>
            {/* Weekday Header Columns (SUN to SAT) */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center select-none shrink-0 mb-1.5">
              {WEEKDAY_NAMES_SHORT.map((wd) => (
                <div key={wd} className="py-2.5 @sm:py-3 min-h-[34px] @sm:min-h-[38px] flex items-center justify-center rounded-md theme-bg-tile text-[9.5px] @sm:text-[10.5px] @lg:text-xs font-bold tracking-wider uppercase border-0 theme-text-secondary">
                  {wd}
                </div>
              ))}
            </div>

            {/* Month Grid Weeks Rows with Spanning Multi-Day Banners */}
            <div className="flex flex-col w-full gap-1 sm:gap-1.5">
              {weeks.map((weekDays, weekIdx) => {
                const { items: weekEvents, daysWithOverflow } = getWeekEvents(weekDays);
                const hasWeekSpanningEvents = weekEvents.length > 0;
                const hasWeekTasks = showPersonalTasks && weekDays.some(c => {
                  const tasks = getTasksForDate(c.dateStr);
                  return tasks.length > 0;
                });

                return (
                  <div
                    key={`week-${weekIdx}-${weekDays[0].dateStr}`}
                    className="relative w-full border-0"
                  >
                    {/* Background 7-Day Columns Grid */}
                    <div className="grid grid-cols-7 gap-1 sm:gap-1.5 w-full min-h-0">
                      {weekDays.map((cell) => {
                        const dayEvents = getEventsForDate(cell.dateStr, cell.weekday);
                        const cellTasks = showPersonalTasks ? getTasksForDate(cell.dateStr) : [];
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
                            className={`border-0 w-full p-1 @sm:p-1.5 @xl:p-2 flex flex-col justify-start transition-colors cursor-pointer group select-none rounded-md relative overflow-hidden ${
                              hasWeekSpanningEvents
                                ? hasWeekTasks
                                  ? "aspect-square @[480px]:aspect-auto @[480px]:min-h-[116px] @[480px]:@sm:min-h-[124px] @[480px]:@xl:min-h-[134px]"
                                  : "aspect-square @[480px]:aspect-auto @[480px]:min-h-[92px] @[480px]:@sm:min-h-[98px] @[480px]:@xl:min-h-[104px]"
                                : "aspect-square"
                            } ${
                              isToday
                                ? "bg-transparent @[480px]:bg-[var(--accent-main)]/15 @[480px]:dark:bg-[var(--accent-main)]/25 @[480px]:hover:bg-[var(--accent-main)]/30"
                                : cell.isCurrentMonth
                                ? "bg-transparent @[380px]:theme-bg-tile @[380px]:dark:bg-white/[0.14] @[380px]:dark:hover:bg-white/[0.18] @[380px]:hover:theme-bg-elevated/80"
                                : "bg-transparent opacity-40 @[380px]:theme-bg-tile-muted @[380px]:dark:bg-white/[0.05] @[380px]:hover:opacity-80"
                            }`}
                            title={
                              dayEvents.length > 0 || cellTasks.length > 0
                                ? `${dayEvents.length} event(s), ${cellTasks.length} task(s) on ${cell.dateStr}. Click to view details.`
                                : cell.dateStr
                            }
                          >
                            {/* Top Header: Day Number (Centered on small screens, Start on wide) & Hijri (2nd line on small, End on wide). Zero background on badges */}
                            <div className="flex flex-col @[480px]:flex-row items-center @[480px]:justify-between relative w-full mb-0.5 shrink-0 pointer-events-auto">
                              <div className="flex items-center justify-center @[480px]:justify-start min-w-0">
                                <span
                                  className={`text-[10px] @sm:text-[11px] @xl:text-xs font-bold inline-flex items-center justify-center transition border-0 ${
                                    isToday
                                      ? "w-5 h-5 rounded-full bg-[var(--accent-main)]/15 dark:bg-[var(--accent-main)]/25 text-[var(--accent-main)] @[480px]:w-auto @[480px]:h-auto @[480px]:rounded-none @[480px]:bg-transparent"
                                      : "theme-text-primary group-hover:theme-accent font-mono bg-transparent"
                                  }`}
                                >
                                  {cell.dayNum}
                                </span>
                              </div>

                              {isHijriEnabled && (
                                <span
                                  className="text-[8.5px] @[480px]:text-[9.5px] font-mono theme-accent font-medium leading-none select-none opacity-85 shrink-0 text-center @[480px]:text-right bg-transparent border-0 mt-0.5 @[480px]:mt-0"
                                  title={`Hijri: ${getHijriDateString(cell.dateStr)}`}
                                >
                                  {getHijriDateString(cell.dateStr).split(" ")[0]}
                                </span>
                              )}
                            </div>

                            {/* Middle Event Spacer: Only present if this day has events! If no events, task sits naturally without giant empty gap */}
                            {dayEvents.length > 0 && (
                              <div className="hidden @[480px]:block flex-1 min-h-[44px] @xl:min-h-[66px] pointer-events-none" />
                            )}

                            {/* Personal Tasks Count Badge: Pinned to bottom (mt-auto) whether events exist or not */}
                            {cellTasks.length > 0 && (
                              <div className="mt-auto pb-0.5 w-full flex items-center justify-center shrink-0 z-20 pointer-events-auto">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openDrawer('user-task', { date: cell.dateStr });
                                  }}
                                  className="px-1 py-0.5 rounded-md text-[10px] @sm:text-[11px] font-medium theme-text-secondary hover:theme-text-primary transition cursor-pointer select-none border-0 ring-0 bg-transparent shadow-none flex items-center justify-center gap-1 max-w-full truncate"
                                  title={`${cellTasks.length} personal task(s). Click to view / manage.`}
                                >
                                  {/* Small screens (<480px): Pure badge indicator dot only, zero numbers */}
                                  <div className="inline-flex @[480px]:hidden items-center gap-1">
                                    {dayEvents.length > 0 && topStyle && (
                                      <span className={`w-1 h-1 rounded-full shrink-0 ${topStyle.dot} shadow-none`} />
                                    )}
                                    <span className="w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-500 shrink-0" />
                                  </div>

                                  {/* Large screens (>=480px): Neutral dot + readable text label */}
                                  <span className="hidden @[480px]:inline-flex items-center gap-1 truncate">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 shrink-0" />
                                    <span className="truncate">
                                      {cellTasks.length} {cellTasks.length === 1 ? 'Task' : 'Tasks'}
                                    </span>
                                  </span>
                                </button>
                              </div>
                            )}

                            {/* Narrow Container (<480px): When without tasks, small event dot at bottom (no shadow, smaller size) */}
                            {cellTasks.length === 0 && dayEvents.length > 0 && topStyle && (
                              <div className="flex @[480px]:hidden items-center justify-center mt-auto pb-0.5 shrink-0 pointer-events-auto">
                                <span
                                  className={`w-1 h-1 rounded-full shrink-0 ${topStyle.dot} shadow-none`}
                                  title={`${dayEvents.length} schedule item(s)`}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Wide Container (>=480px): Continuous Spanning Events Grid Layer across the Week (Strictly 3 lines max) */}
                    {hasWeekSpanningEvents && (
                      <div
                        className={`hidden @[480px]:grid grid-cols-7 gap-x-1 sm:gap-x-1.5 gap-y-1 absolute inset-x-0 top-[26px] @sm:top-[28px] @xl:top-[30px] ${hasWeekTasks ? "bottom-[26px]" : "bottom-[4px]"} pointer-events-none z-10 overflow-hidden`}
                        style={{
                          gridTemplateRows: 'repeat(3, minmax(0, 22px))',
                          maxHeight: '74px',
                        }}
                      >
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
                              className={`h-[22px] px-2 py-0.5 text-[10px] font-semibold truncate transition-all cursor-pointer select-none pointer-events-auto flex items-center shadow-2xs ${style.bannerBg || style.solidBg} ${style.bannerText || style.solidText} hover:brightness-105 ${edgeClasses}`}
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

                        {/* Option 2 (Google Calendar & Linear standard): Render "+N more" Interactive Counter Pill on Row 3 */}
                        {daysWithOverflow && Array.from(daysWithOverflow).map((col) => {
                          const cell = weekDays[col - 1];
                          if (!cell?.isCurrentMonth) return null;
                          const dayEvts = getEventsForDate(cell.dateStr, cell.weekday);
                          const overflowCount = dayEvts.length - 2;
                          if (overflowCount <= 0) return null;

                          return (
                            <button
                              key={`overflow-${cell.dateStr}`}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDay(cell.dayNum);
                                handleSetDisplayMode("timeline");
                              }}
                              style={{
                                gridColumn: `${col} / span 1`,
                                gridRow: 3,
                              }}
                              className="h-[20px] @sm:h-[22px] mx-0.5 @sm:mx-1 px-1.5 py-0.5 rounded-md text-[9px] @sm:text-[10px] font-medium theme-bg-elevated hover:theme-bg-surface theme-text-secondary hover:theme-text-primary transition-all cursor-pointer select-none pointer-events-auto flex items-center justify-center border-0 shadow-2xs truncate"
                              title={`${dayEvts.length} total items on this date. Click to view all in timeline.`}
                            >
                              +{overflowCount} more
                            </button>
                          );
                        })}
                      </div>
                    )}
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
                const isSelected = item.dateStr === selectedDateStr;
                const dEvents = getEventsForDate(item.dateStr, item.weekday);
                const isToday = item.dateStr === todayStr;
                const topEvent = dEvents.length > 0 ? dEvents[0] : null;
                const topColor = topEvent ? getEventColors(topEvent, activeTenantId) : null;
                const isCurrentMonth = item.yearNum === viewYear && item.monthIdx === viewMonth;

                return (
                  <DateHeaderCell
                    key={item.dateStr}
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
                    isCurrentMonth={isCurrentMonth}
                    keepNormalBgOnOtherMonths={true}
                    borderless={true}
                    data-year={item.yearNum}
                    data-month={item.monthIdx}
                    data-datestr={item.dateStr}
                    onClick={() => {
                      setSelectedDay(item.dayNum);
                      setCurrentDate(new Date(item.yearNum, item.monthIdx, item.dayNum));
                    }}
                    className="w-[36px] min-w-[36px] max-w-[36px] @sm:w-[42px] @sm:min-w-[42px] @sm:max-w-[42px] shrink-0"
                  />
                );
              })}
            </div>

            {/* Selected Day Main View: Vertical Timeline */}
            <div className={`${embeddedSurface ? "pt-2 pb-4" : "p-2 @sm:p-3 @md:p-4 pb-5 @sm:pb-6"} space-y-2.5 @sm:space-y-3.5 min-w-0`}>
              
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
                <div className="p-6 @sm:p-10 text-center border-0 rounded-2xl theme-bg-tile shadow-2xs my-1 flex flex-col items-center justify-center gap-2">
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
                          className="flex-1 min-w-0 p-2 @sm:p-3 @md:p-3.5 rounded-2xl border-0 theme-bg-tile hover:theme-bg-elevated/75 transition-all duration-200 cursor-pointer shadow-2xs relative overflow-hidden flex items-center justify-between gap-1.5 @sm:gap-2.5"
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

              {/* Daily Personal Tasks & Checklist for Selected Date */}
              {showPersonalTasks && (
                <div className="pt-3 border-t theme-border space-y-2.5 mt-2">
                  <div className="flex items-center justify-between gap-2 px-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 shadow-xs" />
                      <span className="text-xs font-bold theme-text-primary">
                        Personal Tasks ({getTasksForDate(selectedDateStr).length})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => openDrawer('user-task', { date: selectedDateStr })}
                      className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline transition cursor-pointer"
                    >
                      + Add Task
                    </button>
                  </div>

                  {getTasksForDate(selectedDateStr).length === 0 ? (
                    <div className="p-3.5 text-center border-0 rounded-2xl theme-bg-tile text-[11px] theme-text-secondary shadow-2xs">
                      No personal tasks scheduled for this day.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {getTasksForDate(selectedDateStr).map((task) => (
                        <div
                          key={task.id}
                          className="p-2 sm:p-2.5 rounded-xl border-0 theme-bg-tile hover:theme-bg-elevated/75 transition-all flex items-center justify-between gap-2 shadow-2xs group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <input
                              type="checkbox"
                              checked={task.status === 'COMPLETED'}
                              onChange={() => toggleTaskStatus(task.id)}
                              className="w-4 h-4 rounded border-0 accent-indigo-600 cursor-pointer shrink-0"
                            />
                            <span
                              onClick={() => openDrawer('user-task', { task, date: selectedDateStr })}
                              className={`text-xs truncate cursor-pointer select-none ${
                                task.status === 'COMPLETED'
                                  ? 'line-through opacity-50 theme-text-secondary'
                                  : 'font-medium theme-text-primary group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                              }`}
                            >
                              {task.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {task.priority && task.priority !== 'MEDIUM' && (
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shadow-2xs ${
                                task.priority === 'URGENT'
                                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                  : task.priority === 'HIGH'
                                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                  : 'bg-slate-500/15 text-slate-600 dark:text-slate-400'
                              }`}>
                                {task.priority}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => openDrawer('user-task', { task, date: selectedDateStr })}
                              className="text-[10px] font-semibold opacity-0 group-hover:opacity-100 theme-text-secondary hover:theme-text-primary transition cursor-pointer"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── 3. Full Agenda / List View ─── */}
        {viewMode === "list" && (
          <div className={`${embeddedSurface ? "p-0 pb-4" : "p-3 @sm:p-4 pb-5 @sm:pb-6"} space-y-2.5 @sm:space-y-3`}>
            {filteredEvents.length === 0 ? (
              <div className="p-10 @sm:p-12 text-center text-xs theme-text-secondary border-0 rounded-2xl theme-bg-tile shadow-2xs">
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
                    className="p-3.5 @sm:p-4 rounded-2xl border-0 theme-bg-tile hover:theme-bg-elevated/75 transition cursor-pointer flex flex-col @sm:flex-row items-start @sm:items-center justify-between gap-2.5 @sm:gap-4 shadow-2xs"
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

