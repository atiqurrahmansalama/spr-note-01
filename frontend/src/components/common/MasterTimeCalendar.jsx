import React, { useState, useMemo, useRef, useEffect } from "react";
import ActionMenu from "../ui/ActionMenu";
import {
  CalendarIcon,
  SearchIcon,
  CloseIcon,
  TrashIcon,
  EditIcon,
  PlusIcon,
} from "../ui/Icons";
import { useRightSidebar } from "../../context/RightSidebarContext";
import { EVENT_COLORS } from "./TimeScheduleDrawerForm";

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
  emerald: { bg: "bg-emerald-500/15", border: "border-emerald-500/30", text: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500", hex: "#10b981" },
  indigo: { bg: "bg-indigo-500/15", border: "border-indigo-500/30", text: "text-indigo-600 dark:text-indigo-400", dot: "bg-indigo-500", hex: "#6366f1" },
  blue: { bg: "bg-blue-500/15", border: "border-blue-500/30", text: "text-blue-600 dark:text-blue-400", dot: "bg-blue-500", hex: "#3b82f6" },
  sky: { bg: "bg-sky-500/15", border: "border-sky-500/30", text: "text-sky-600 dark:text-sky-400", dot: "bg-sky-500", hex: "#0ea5e9" },
  cyan: { bg: "bg-cyan-500/15", border: "border-cyan-500/30", text: "text-cyan-600 dark:text-cyan-400", dot: "bg-cyan-500", hex: "#06b6d4" },
  teal: { bg: "bg-teal-500/15", border: "border-teal-500/30", text: "text-teal-600 dark:text-teal-400", dot: "bg-teal-500", hex: "#14b8a6" },
  violet: { bg: "bg-violet-500/15", border: "border-violet-500/30", text: "text-violet-600 dark:text-violet-400", dot: "bg-violet-500", hex: "#8b5cf6" },
  purple: { bg: "bg-purple-500/15", border: "border-purple-500/30", text: "text-purple-600 dark:text-purple-400", dot: "bg-purple-500", hex: "#a855f7" },
  fuchsia: { bg: "bg-fuchsia-500/15", border: "border-fuchsia-500/30", text: "text-fuchsia-600 dark:text-fuchsia-400", dot: "bg-fuchsia-500", hex: "#d946ef" },
  rose: { bg: "bg-rose-500/15", border: "border-rose-500/30", text: "text-rose-600 dark:text-rose-400", dot: "bg-rose-500", hex: "#f43f5e" },
  red: { bg: "bg-red-500/15", border: "border-red-500/30", text: "text-red-600 dark:text-red-400", dot: "bg-red-500", hex: "#ef4444" },
  orange: { bg: "bg-orange-500/15", border: "border-orange-500/30", text: "text-orange-600 dark:text-orange-400", dot: "bg-orange-500", hex: "#f97316" },
  amber: { bg: "bg-amber-500/15", border: "border-amber-500/30", text: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500", hex: "#f59e0b" },
  lime: { bg: "bg-lime-500/15", border: "border-lime-500/30", text: "text-lime-600 dark:text-lime-400", dot: "bg-lime-500", hex: "#84cc16" },
  slate: { bg: "bg-slate-500/15", border: "border-slate-500/30", text: "text-slate-600 dark:text-slate-400", dot: "bg-slate-500", hex: "#64748b" },
};

export function getEventColors(evt) {
  const isWorkingHours = evt?.category === "WORKING_HOURS";

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
  if (isWorkingHours) {
    return {
      bg: "theme-bg-accent-soft",
      border: "border-[var(--accent-main)]/20",
      text: "theme-text-primary",
      dot: "theme-bg-accent",
      hex: "#6366f1",
    };
  }
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
  className = "",
}) {
  const { openDrawer } = useRightSidebar();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDate());
  const [searchQuery, setSearchQuery] = useState("");
  const [displayMode, setDisplayMode] = useState(() => {
    return localStorage.getItem("spr_calendar_display_mode") || "grid";
  });

  const monthStripRef = useRef(null);
  const dayStripRef = useRef(null);

  const viewMode = propViewMode || (selectedCategory === "AGENDA" ? "list" : "month");
  const viewYear = currentDate.getFullYear();
  const viewMonth = currentDate.getMonth();

  const handleSetDisplayMode = (mode) => {
    setDisplayMode(mode);
    localStorage.setItem("spr_calendar_display_mode", mode);
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(viewYear, viewMonth - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentDate(new Date(viewYear, viewMonth + 1, 1));
  };
  const handleJumpToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDay(now.getDate());
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
      if (selectedCategory && selectedCategory !== "ALL" && selectedCategory !== "AGENDA" && e.category !== selectedCategory) {
        return false;
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
      cells.push({
        dateStr: prevMonthDate.toISOString().split("T")[0],
        dayNum,
        isCurrentMonth: false,
        weekday: prevMonthDate.getDay(),
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(viewYear, viewMonth, d);
      cells.push({
        dateStr: dateObj.toISOString().split("T")[0],
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
      cells.push({
        dateStr: nextMonthDate.toISOString().split("T")[0],
        dayNum: d,
        isCurrentMonth: false,
        weekday: nextMonthDate.getDay(),
      });
    }

    return cells;
  }, [viewYear, viewMonth]);

  const getEventsForDate = (dateStr, weekday) => {
    return filteredEvents.filter((e) => {
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
    });
  };

  const todayStr = new Date().toISOString().split("T")[0];

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
      
      {/* ─── Single Unified Calendar Control Bar ──────────────────── */}
      <div className="py-2 flex flex-col @lg:flex-row items-stretch @lg:items-center justify-between gap-2.5 @lg:gap-3 mb-3 w-full min-w-0">
        
        {/* Month Navigator with Precision Arrow SVGs (in month mode) or Agenda Title */}
        {viewMode === "month" ? (
          <div className="flex items-center gap-1.5 @sm:gap-3 shrink-0 flex-wrap">
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-0.5 @sm:p-1 theme-text-secondary hover:theme-text-primary transition cursor-pointer flex items-center justify-center bg-transparent border-0 shadow-none hover:bg-transparent active:scale-90"
                title="Previous Month"
              >
                <svg className="w-3.5 h-3.5 @sm:w-4 @sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-0.5 @sm:p-1 theme-text-secondary hover:theme-text-primary transition cursor-pointer flex items-center justify-center bg-transparent border-0 shadow-none hover:bg-transparent active:scale-90"
                title="Next Month"
              >
                <svg className="w-3.5 h-3.5 @sm:w-4 @sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>

            <h3 className="text-sm @sm:text-lg font-bold theme-text-primary tracking-tight">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </h3>

            <button
              type="button"
              onClick={handleJumpToday}
              className="p-1 @sm:px-2.5 @sm:py-1 rounded-lg border theme-border hover:theme-bg-sub theme-text-secondary hover:theme-text-primary text-xs font-semibold transition cursor-pointer shadow-xs flex items-center justify-center gap-1 shrink-0"
              title="Jump to Today"
            >
              <CalendarIcon className="w-3.5 h-3.5 @sm:hidden" />
              <span className="hidden @sm:inline">Today</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <h3 className="text-base @sm:text-lg font-bold theme-text-primary tracking-tight">
              Upcoming Agenda & Schedules
            </h3>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20">
              {filteredEvents.length} items
            </span>
          </div>
        )}

        {/* Right Tools: Single Toggle View Switcher, Search Box & ActionMenu */}
        <div className="flex items-center gap-2 justify-between @lg:justify-end flex-1 @lg:flex-none min-w-0 flex-nowrap">
          
          {/* Single View Mode Toggle Button: Click to switch between Grid and Timeline */}
          {viewMode === "month" && (
            <button
              type="button"
              onClick={() => handleSetDisplayMode(displayMode === "grid" ? "timeline" : "grid")}
              className="flex items-center gap-1.5 px-2 @sm:px-2.5 py-1.5 rounded-xl border theme-border theme-bg-surface hover:theme-bg-sub text-xs font-semibold theme-text-primary transition-all cursor-pointer shadow-xs shrink-0"
              title={displayMode === "grid" ? "Switch to Timeline View" : "Switch to Grid View"}
            >
              {displayMode === "grid" ? (
                <>
                  <svg className="w-3.5 h-3.5 theme-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                  <span className="hidden @sm:inline">Timeline</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 theme-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  <span className="hidden @sm:inline">Grid</span>
                </>
              )}
            </button>
          )}

          {/* Search Box - Compact on small screens */}
          <div className="relative flex-1 @sm:w-48 @lg:w-60 min-w-[32px] @sm:min-w-0">
            <SearchIcon className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 theme-text-secondary pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full text-xs pl-7 pr-2 py-1.5 rounded-xl border theme-border theme-bg-surface theme-text-primary placeholder:opacity-0 @sm:placeholder:opacity-100 placeholder:theme-text-secondary focus:outline-none focus:ring-1 focus:ring-[var(--accent-main)] focus:placeholder:opacity-100"
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
              {WEEKDAY_NAMES_SHORT.map((wd, i) => (
                <div key={wd} className={`py-1 @sm:py-2 text-[9px] @sm:text-[10px] @lg:text-xs font-bold tracking-wider uppercase border-r theme-border last:border-r-0 ${i === 5 || i === 6 ? "text-rose-500/80" : "theme-text-secondary"}`}>
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
                    {/* Top: Day Number (Top Center Aligned on compact/small, top-left on wide) */}
                    <div className="flex items-center justify-center @xl:justify-between relative w-full mb-0.5">
                      <span
                        className={`text-[10px] @sm:text-[11px] @xl:text-xs font-bold inline-flex items-center justify-center w-5 h-5 @sm:w-5.5 @sm:h-5.5 @xl:w-6 @xl:h-6 rounded-full transition ${
                          isToday
                            ? "theme-bg-accent text-white shadow-xs"
                            : "theme-text-primary group-hover:theme-accent font-mono"
                        }`}
                      >
                        {cell.dayNum}
                      </span>

                      {!readOnly && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenAddDrawer(cell.dateStr);
                          }}
                          className="hidden @xl:inline-block absolute right-0 top-0 opacity-0 group-hover:opacity-100 text-[10px] theme-accent font-bold px-1 rounded transition hover:theme-bg-sub cursor-pointer"
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
                        const style = getEventColors(evt);
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
                        const style = getEventColors(evt);
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
              className="px-2 @sm:px-4 py-2 flex items-start gap-1 overflow-x-auto scrollbar-none select-none theme-bg-surface min-w-0 cursor-grab active:cursor-grabbing border-b border-[var(--border-color,rgba(0,0,0,0.07))]"
            >
              {timelineStripDays.map((item) => {
                const isSelected = item.isCurrentMonth && item.dayNum === safeSelectedDay;
                const dEvents = getEventsForDate(item.dateStr, item.weekday);
                const isToday = item.dateStr === todayStr;

                return (
                  <button
                    key={`${item.yearNum}-${item.monthIdx}-${item.dayNum}`}
                    data-active={isSelected}
                    type="button"
                    onClick={() => {
                      if (item.isCurrentMonth) {
                        setSelectedDay(item.dayNum);
                      } else {
                        setCurrentDate(new Date(item.yearNum, item.monthIdx, item.dayNum));
                        setSelectedDay(item.dayNum);
                      }
                    }}
                    className={`h-[50px] min-w-[34px] @sm:min-w-[38px] p-1 rounded-xl flex flex-col items-center justify-between transition-colors cursor-pointer shrink-0 ${
                      isSelected
                        ? "theme-bg-accent text-white font-bold shadow-xs"
                        : isToday
                        ? "theme-bg-accent-soft theme-accent font-semibold hover:theme-bg-sub"
                        : !item.isCurrentMonth
                        ? "opacity-40 hover:opacity-90 hover:theme-bg-sub/50 theme-text-secondary"
                        : "hover:theme-bg-sub theme-text-secondary hover:theme-text-primary"
                    }`}
                    title={`${MONTH_NAMES_SHORT[item.monthIdx]} ${item.dayNum}, ${item.yearNum}`}
                  >
                    {/* Top Weekday Slot */}
                    <span className={`text-[8px] @sm:text-[9px] font-mono uppercase leading-none ${isSelected ? "text-white/80" : "theme-text-secondary"}`}>
                      {WEEKDAY_NAMES_SHORT[item.weekday]}
                    </span>

                    {/* Middle Day Number Slot */}
                    <span className="text-xs @sm:text-sm font-bold font-mono leading-none">
                      {item.dayNum}
                    </span>

                    {/* Bottom Indicator Dot Slot (Constant height container prevents text from shifting) */}
                    <div className="w-full h-1.5 flex items-center justify-center">
                      {dEvents.length > 0 && (
                        <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : "theme-bg-accent"}`} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Day Main View: Header + Vertical Timeline (Maximized width for sidebars) */}
            <div className="p-1.5 @sm:p-3 @md:p-5 space-y-2 @sm:space-y-3.5 min-w-0">
              
              {/* Day Header with Full Weekday & Date */}
              <div className="flex items-center justify-between pb-1.5 @sm:pb-2.5 border-b border-[var(--border-color,rgba(0,0,0,0.07))] flex-wrap gap-1.5 min-w-0">
                <div className="flex items-baseline gap-1.5 @sm:gap-2 flex-wrap min-w-0">
                  <h2 className="text-sm @sm:text-lg @md:text-xl font-bold tracking-tight theme-text-primary">
                    {WEEKDAY_NAMES_FULL[selectedWeekday]}
                  </h2>
                  <span className="text-[10px] @sm:text-xs @md:text-sm font-semibold theme-text-secondary font-mono">
                    {selectedDateObj.getDate()}{getOrdinalSuffix(selectedDateObj.getDate())} {MONTH_NAMES[viewMonth]} {viewYear}
                  </span>
                </div>

                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleOpenAddDrawer(selectedDateStr)}
                    className="flex items-center gap-1 px-2 @sm:px-3 py-1 @sm:py-1.5 rounded-lg @sm:rounded-xl text-[11px] @sm:text-xs font-bold theme-bg-accent text-white hover:opacity-90 shadow-2xs transition-all cursor-pointer shrink-0"
                    title="Add schedule for this date"
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                    <span className="hidden @sm:inline">Add</span>
                  </button>
                )}
              </div>

              {/* Timeline Cards Container */}
              {selectedDayEvents.length === 0 ? (
                <div className="p-4 @sm:p-8 text-center border theme-border rounded-xl @sm:rounded-2xl theme-bg-sub/30 my-2 flex flex-col items-center justify-center gap-2">
                  <div className="p-2 rounded-xl theme-bg-surface border theme-border theme-text-secondary opacity-60 shadow-inner">
                    <CalendarIcon className="w-4 h-4 @sm:w-5 @sm:h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs @sm:text-sm font-bold theme-text-primary">No schedules or events for this date</h4>
                    <p className="text-[10px] @sm:text-[11px] theme-text-secondary mt-0.5">Click Add to create working hours or an academic event.</p>
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
                    const style = getEventColors(evt);
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
                                {evt.category === 'WORKING_HOURS' ? 'Working Hours' : 'Academic Event'}
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
                            <svg className="w-3 h-3 @sm:w-4 @sm:h-4 theme-text-secondary group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                            </svg>
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
                const style = getEventColors(evt);
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
                            {evt.category === 'WORKING_HOURS' ? 'Working Hours' : 'Academic Event'}
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
                      <div className="text-[10px] @sm:text-[11px] theme-text-secondary mt-0.5 font-mono">
                        {evt.repeats ? `Repeats weekly` : evt.startDate}
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
