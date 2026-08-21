import React, { useState, useMemo } from "react";
import ActionMenu from "../ui/ActionMenu";
import {
  CalendarIcon,
  SearchIcon,
  CloseIcon,
  TrashIcon,
  EditIcon,
} from "../ui/Icons";
import { useRightSidebar } from "../../context/RightSidebarContext";
import TimeScheduleDrawerForm from "./TimeScheduleDrawerForm";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAY_NAMES_SHORT = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

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

export default function MasterTimeCalendar({
  events = [],
  onSaveEvent,
  onDeleteEvent,
  readOnly = false,
  selectedCategory = "WORKING_HOURS",
  actionMenuItems = [],
  className = "",
}) {
  const { openRightSidebar, closeRightSidebar } = useRightSidebar();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("month");
  const [searchQuery, setSearchQuery] = useState("");

  const [activeEventDetail, setActiveEventDetail] = useState(null);

  const viewYear = currentDate.getFullYear();
  const viewMonth = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(viewYear, viewMonth - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentDate(new Date(viewYear, viewMonth + 1, 1));
  };
  const handleJumpToday = () => {
    setCurrentDate(new Date());
  };

  // Open Right Sidebar for adding new entry
  const handleOpenAddDrawer = (initialDate = "") => {
    openRightSidebar({
      title: selectedCategory === "WORKING_HOURS" ? "Add Working Hours" : "Add Academic Event",
      width: 520,
      content: (
        <TimeScheduleDrawerForm
          initialDate={initialDate}
          defaultCategory={selectedCategory === "ALL" ? "WORKING_HOURS" : selectedCategory}
          onSave={(savedData) => {
            if (onSaveEvent) onSaveEvent(savedData);
            closeRightSidebar();
          }}
          onCancel={closeRightSidebar}
        />
      ),
    });
  };

  // Open Right Sidebar for editing entry
  const handleEditEvent = (evt) => {
    setActiveEventDetail(null);
    openRightSidebar({
      title: "Edit Schedule / Event",
      width: 520,
      content: (
        <TimeScheduleDrawerForm
          event={evt}
          defaultCategory={evt.category}
          onSave={(savedData) => {
            if (onSaveEvent) onSaveEvent(savedData);
            closeRightSidebar();
          }}
          onCancel={closeRightSidebar}
        />
      ),
    });
  };

  const handleDelete = (eventId) => {
    if (onDeleteEvent) {
      onDeleteEvent(eventId);
    }
    setActiveEventDetail(null);
  };

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (selectedCategory && selectedCategory !== "ALL" && e.category !== selectedCategory) {
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

  return (
    <div className={`flex flex-col w-full ${className}`}>
      
      {/* ─── Single Unified Calendar Control Bar ──────────────────── */}
      <div className="py-2.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-3">
        
        {/* Month Navigator with Precision Arrow SVGs */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg border theme-border hover:theme-bg-sub theme-text-secondary hover:theme-text-primary transition cursor-pointer flex items-center justify-center"
              title="Previous Month"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg border theme-border hover:theme-bg-sub theme-text-secondary hover:theme-text-primary transition cursor-pointer flex items-center justify-center"
              title="Next Month"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>

          <h3 className="text-lg font-bold theme-text-primary tracking-tight">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </h3>

          <button
            type="button"
            onClick={handleJumpToday}
            className="text-xs px-2.5 py-1 rounded-lg border theme-border hover:theme-bg-sub theme-text-secondary hover:theme-text-primary font-semibold transition cursor-pointer"
          >
            Today
          </button>
        </div>

        {/* Right Tools: Search, View Switcher & ActionMenu */}
        <div className="flex items-center gap-2 justify-between sm:justify-end">
          {/* Search Box */}
          <div className="relative w-36 sm:w-52">
            <SearchIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 theme-text-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border theme-border theme-bg-surface theme-text-primary placeholder:theme-text-secondary focus:outline-none focus:ring-1 focus:ring-[var(--accent-main)]"
            />
          </div>

          {/* View Switcher Pills */}
          <div className="flex items-center p-0.5 rounded-xl theme-bg-sub border theme-border">
            {[
              { id: "month", label: "Month" },
              { id: "list", label: "Agenda" },
            ].map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setViewMode(v.id)}
                className={`text-xs px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  viewMode === v.id
                    ? "theme-bg-surface theme-text-primary shadow-xs"
                    : "theme-text-secondary hover:theme-text-primary"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Three-dots Action Menu */}
          {actionMenuItems && actionMenuItems.length > 0 && (
            <ActionMenu items={actionMenuItems} />
          )}
        </div>
      </div>

      {/* ─── Calendar Main Content Area (Single Unified Card Grid) ─── */}
      <div className="flex-1 overflow-hidden rounded-2xl border theme-border theme-bg-surface shadow-xs">
        {viewMode === "month" && (
          <div className="flex flex-col min-h-[580px]">
            {/* Weekday Header Columns (SUN to SAT) */}
            <div className="grid grid-cols-7 border-b theme-border theme-bg-sub/60 text-center select-none shrink-0">
              {WEEKDAY_NAMES_SHORT.map((wd, i) => (
                <div key={wd} className={`py-2.5 text-xs font-bold tracking-wider uppercase border-r theme-border last:border-r-0 ${i === 5 || i === 6 ? "text-rose-500/80" : "theme-text-secondary"}`}>
                  {wd}
                </div>
              ))}
            </div>

            {/* Month Day Cells Grid */}
            <div className="grid grid-cols-7 flex-1 auto-rows-fr bg-[var(--border-color,rgba(0,0,0,0.06))] gap-px">
              {monthGridDays.map((cell) => {
                const dayEvents = getEventsForDate(cell.dateStr, cell.weekday);
                const isToday = cell.dateStr === todayStr;

                return (
                  <div
                    key={cell.dateStr}
                    onClick={() => !readOnly && handleOpenAddDrawer(cell.dateStr)}
                    className={`min-h-[105px] sm:min-h-[120px] p-2 flex flex-col justify-between transition-colors cursor-pointer group ${
                      cell.isCurrentMonth
                        ? "theme-bg-surface hover:theme-bg-sub/40"
                        : "theme-bg-sub/30 opacity-40 hover:opacity-75"
                    }`}
                  >
                    {/* Top: Day Number */}
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-xs font-bold inline-flex items-center justify-center w-6 h-6 rounded-full transition ${
                          isToday
                            ? "theme-bg-accent text-white shadow-xs"
                            : "theme-text-primary group-hover:theme-accent font-mono"
                        }`}
                      >
                        {cell.dayNum}
                      </span>

                      {!readOnly && (
                        <span className="opacity-0 group-hover:opacity-100 text-[10px] theme-accent font-bold px-1 rounded transition">
                          +
                        </span>
                      )}
                    </div>

                    {/* Middle: Event & Time Slot Pills */}
                    <div className="flex-1 space-y-1 overflow-y-auto max-h-[88px] scrollbar-none">
                      {dayEvents.map((evt) => {
                        const isWorkingHour = evt.category === "WORKING_HOURS";

                        return (
                          <div
                            key={evt.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveEventDetail(evt);
                            }}
                            className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold truncate transition-all cursor-pointer select-none drop-shadow-2xs ${
                              isWorkingHour
                                ? "theme-bg-accent text-white hover:brightness-110 shadow-xs"
                                : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
                            }`}
                            title={`${evt.title}${evt.startTime ? ` (${formatTime12(evt.startTime)} - ${formatTime12(evt.endTime)})` : ""}`}
                          >
                            {evt.startTime && evt.endTime ? (
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

        {/* Agenda / List View */}
        {viewMode === "list" && (
          <div className="p-4 space-y-3">
            {filteredEvents.length === 0 ? (
              <div className="p-12 text-center text-xs theme-text-secondary border theme-border rounded-xl theme-bg-sub/30">
                No events or working hours matching the filter criteria.
              </div>
            ) : (
              filteredEvents.map((evt) => (
                <div
                  key={evt.id}
                  onClick={() => setActiveEventDetail(evt)}
                  className="p-4 rounded-xl border theme-border theme-bg-surface hover:theme-bg-sub/50 transition cursor-pointer flex items-center justify-between gap-4 shadow-xs"
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`w-3 h-3 rounded-full ${evt.category === 'WORKING_HOURS' ? 'theme-bg-accent' : 'bg-emerald-500'}`} />
                    <div>
                      <h4 className="text-sm font-bold theme-text-primary">{evt.title}</h4>
                      <p className="text-xs theme-text-secondary mt-0.5">
                        {evt.category === 'WORKING_HOURS' ? 'Working Hours' : 'Academic Event'} • Audience: <strong className="theme-text-primary font-medium">{evt.audience}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    {evt.startTime && evt.endTime ? (
                      <div className="font-mono font-bold text-xs theme-accent">
                        {formatTime12(evt.startTime)} – {formatTime12(evt.endTime)}
                      </div>
                    ) : (
                      <div className="text-xs font-semibold theme-text-secondary">Full Day</div>
                    )}
                    <div className="text-[11px] theme-text-secondary mt-0.5">
                      {evt.repeats ? `Repeats weekly` : evt.startDate}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ─── Slot Details Modal ───────────────────────────────────── */}
      {activeEventDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl theme-bg-surface border theme-border shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b theme-border">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${activeEventDetail.category === 'WORKING_HOURS' ? 'theme-bg-accent' : 'bg-emerald-500'}`} />
                <h4 className="text-sm font-bold theme-text-primary">{activeEventDetail.title}</h4>
              </div>
              <button
                type="button"
                onClick={() => setActiveEventDetail(null)}
                className="p-1 rounded-lg border theme-border hover:theme-bg-elevated theme-text-secondary cursor-pointer"
              >
                <CloseIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b theme-border">
                <span className="theme-text-secondary">Category:</span>
                <span className="font-semibold theme-text-primary">
                  {activeEventDetail.category === 'WORKING_HOURS' ? 'Working Hours' : 'Academic Event'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b theme-border">
                <span className="theme-text-secondary">Audience:</span>
                <span className="font-semibold theme-text-primary">{activeEventDetail.audience}</span>
              </div>
              {activeEventDetail.startTime && (
                <div className="flex justify-between py-1 border-b theme-border">
                  <span className="theme-text-secondary">Timing:</span>
                  <span className="font-mono font-bold theme-accent">
                    {formatTime12(activeEventDetail.startTime)} – {formatTime12(activeEventDetail.endTime)}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b theme-border">
                <span className="theme-text-secondary">Recurrence:</span>
                <span className="font-medium theme-text-primary">
                  {activeEventDetail.repeats ? "Weekly Schedule" : "Single Date"}
                </span>
              </div>
            </div>

            {!readOnly && (
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleDelete(activeEventDetail.id)}
                  className="px-3 py-1.5 rounded-xl border border-rose-500/30 text-rose-600 hover:bg-rose-500/10 text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleEditEvent(activeEventDetail)}
                  className="px-3.5 py-1.5 rounded-xl theme-bg-accent theme-accent-text text-xs font-semibold shadow-xs hover:opacity-90 transition flex items-center gap-1 cursor-pointer"
                >
                  <EditIcon className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
