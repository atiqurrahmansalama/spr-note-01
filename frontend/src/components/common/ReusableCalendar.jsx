import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronIcon, CalendarIcon } from "../ui/Icons";
import { getHijriDateString, getHijriDetails } from "../../utils/hijriUtils";
import { calendarSettings } from "../../utils/localStore";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const WEEKDAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function ReusableCalendar({
  selectedDate = "",
  startDate = "",
  endDate = "",
  onSelectDate,
  onRangeSelect,
  isRange = false,
  minDate = "",
  maxDate = "",
  disabledRanges = [],
  disabledDates = [],
  placeholder = "Select Date",
  className = "",
  popupClassName = "",
  alignRight = false,
  isInline = false,
  defaultOpen = false,
  label = "",
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [tempStart, setTempStart] = useState(startDate || selectedDate);
  const [tempEnd, setTempEnd] = useState(endDate);
  const containerRef = useRef(null);
  const popupRef = useRef(null);

  const [coords, setCoords] = useState({
    top: 0,
    left: 0,
    width: 288,
    openUpward: false,
  });

  useEffect(() => {
    if (defaultOpen) {
      setIsOpen(true);
    }
  }, [defaultOpen]);

  const activeDate = selectedDate || startDate || new Date().toISOString().split("T")[0];
  const initDate = new Date(activeDate);
  const [viewYear, setViewYear] = useState(
    isNaN(initDate.getFullYear()) ? new Date().getFullYear() : initDate.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState(
    isNaN(initDate.getMonth()) ? new Date().getMonth() : initDate.getMonth()
  );

  useEffect(() => {
    setTempStart(startDate || selectedDate);
    setTempEnd(endDate);
    if (selectedDate || startDate) {
      const d = new Date(selectedDate || startDate);
      if (!isNaN(d.getFullYear())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [selectedDate, startDate, endDate]);

  const updatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const popupWidth = 288;
    const popupHeight = 310;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    const shouldOpenUpward = spaceBelow < popupHeight && spaceAbove > spaceBelow;

    let targetLeft = alignRight ? rect.right - popupWidth : rect.left;
    if (typeof window !== "undefined") {
      if (targetLeft + popupWidth > window.innerWidth - 8) {
        targetLeft = window.innerWidth - popupWidth - 8;
      }
      if (targetLeft < 8) {
        targetLeft = 8;
      }
    }

    setCoords({
      left: targetLeft,
      top: shouldOpenUpward ? rect.top - 6 : rect.bottom + 6,
      openUpward: shouldOpenUpward,
      width: Math.min(popupWidth, typeof window !== "undefined" ? window.innerWidth - 16 : popupWidth),
    });
  };

  useEffect(() => {
    if (isOpen && !isInline) {
      updatePosition();
      const handleScrollOrResize = () => updatePosition();
      window.addEventListener("scroll", handleScrollOrResize, true);
      window.addEventListener("resize", handleScrollOrResize);
      return () => {
        window.removeEventListener("scroll", handleScrollOrResize, true);
        window.removeEventListener("resize", handleScrollOrResize);
      };
    }
  }, [isOpen, isInline, alignRight]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        popupRef.current &&
        !popupRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen && !isInline) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen, isInline]);

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  // Guard against navigating before minDate or after maxDate
  const isPrevMonthDisabled = Boolean(
    minDate && (() => {
      const prevMonthLastDay = new Date(viewYear, viewMonth, 0);
      const prevMonthLastDayStr = `${prevMonthLastDay.getFullYear()}-${String(prevMonthLastDay.getMonth() + 1).padStart(2, "0")}-${String(prevMonthLastDay.getDate()).padStart(2, "0")}`;
      return prevMonthLastDayStr < minDate;
    })()
  );

  const isNextMonthDisabled = Boolean(
    maxDate && (() => {
      const nextMonthFirstDay = new Date(viewYear, viewMonth + 1, 1);
      const nextMonthFirstDayStr = `${nextMonthFirstDay.getFullYear()}-${String(nextMonthFirstDay.getMonth() + 1).padStart(2, "0")}-01`;
      return nextMonthFirstDayStr > maxDate;
    })()
  );

  const handlePrevMonth = (e) => {
    if (e) e.stopPropagation();
    if (isPrevMonthDisabled) return;
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e) => {
    if (e) e.stopPropagation();
    if (isNextMonthDisabled) return;
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (dayNum) => {
    const monthStr = String(viewMonth + 1).padStart(2, "0");
    const dayStr = String(dayNum).padStart(2, "0");
    const dateStr = `${viewYear}-${monthStr}-${dayStr}`;

    if (!isRange) {
      setTempStart(dateStr);
      if (onSelectDate) onSelectDate(dateStr);
      setIsOpen(false);
      return;
    }

    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(dateStr);
      setTempEnd("");
    } else if (tempStart && !tempEnd) {
      if (dateStr < tempStart) {
        setTempStart(dateStr);
        setTempEnd("");
      } else {
        setTempEnd(dateStr);
        if (onRangeSelect) onRangeSelect(tempStart, dateStr);
        setIsOpen(false);
      }
    }
  };

  const handleSelectToday = (e) => {
    if (e) e.stopPropagation();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    if (!isRange) {
      setTempStart(todayStr);
      if (onSelectDate) onSelectDate(todayStr);
      setIsOpen(false);
    } else {
      setTempStart(todayStr);
      setTempEnd(todayStr);
      if (onRangeSelect) onRangeSelect(todayStr, todayStr);
      setIsOpen(false);
    }
  };

  const formatDateDisplay = (dStr) => {
    if (!dStr) return "";
    const [y, m, d] = dStr.split("-");
    return `${d}/${m}/${y.slice(2)}`;
  };

  const getLabel = () => {
    if (isRange) {
      if (!startDate && !endDate) return placeholder;

      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];

      const yest = new Date(today);
      yest.setDate(yest.getDate() - 1);
      const yestStr = yest.toISOString().split("T")[0];

      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 6);
      const weekStr = weekAgo.toISOString().split("T")[0];

      const monthAgo = new Date(today);
      monthAgo.setDate(monthAgo.getDate() - 29);
      const monthStr = monthAgo.toISOString().split("T")[0];

      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];

      if (startDate === todayStr && endDate === todayStr) return "Today";
      if (startDate === yestStr && endDate === yestStr) return "Yesterday";
      if (startDate === weekStr && endDate === todayStr) return "Past Week";
      if (startDate === startOfMonth && endDate === todayStr) return "This Month";
      if (startDate === monthStr && endDate === todayStr) return "Past 1 Month";

      if (startDate && endDate) {
        return `${formatDateDisplay(startDate)} - ${formatDateDisplay(endDate)}`;
      }
      if (startDate) return `${formatDateDisplay(startDate)} - ...`;
      return placeholder;
    }
    if (selectedDate) return formatDateDisplay(selectedDate);
    return placeholder;
  };

  const calendarDropdown = (
    <div
      ref={popupRef}
      style={
        isInline
          ? {}
          : {
              position: "fixed",
              left: `${coords.left}px`,
              top: coords.openUpward ? "auto" : `${coords.top}px`,
              bottom: coords.openUpward ? `${window.innerHeight - coords.top}px` : "auto",
              width: `${coords.width}px`,
              zIndex: 99999,
            }
      }
      className={
        isInline
          ? "w-full p-2 space-y-3 select-none"
          : `p-4 theme-bg-surface border theme-border rounded-2xl shadow-2xl space-y-3 animate-fade-in select-none ${popupClassName}`
      }
    >
      {/* Month/Year Header */}
      <div className="flex items-center justify-between pb-2 mb-1 border-b theme-border">
        <div className="flex flex-col">
          <span className="text-xs font-bold theme-text-primary">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          {(() => {
            try {
              const firstDayStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-01`;
              const d = getHijriDetails(new Date(firstDayStr));
              return (
                <span className="text-[10px] font-mono theme-accent font-semibold leading-none pt-0.5">
                  {d.monthName} {d.year}h
                </span>
              );
            } catch {
              return null;
            }
          })()}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={isPrevMonthDisabled}
            onClick={handlePrevMonth}
            className="w-7 h-7 rounded-lg theme-bg-sub hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary flex items-center justify-center text-sm transition cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
            title={isPrevMonthDisabled ? "Outside academic year range" : "Previous Month"}
          >
            ‹
          </button>
          <button
            type="button"
            disabled={isNextMonthDisabled}
            onClick={handleNextMonth}
            className="w-7 h-7 rounded-lg theme-bg-sub hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary flex items-center justify-center text-sm transition cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
            title={isNextMonthDisabled ? "Outside academic year range" : "Next Month"}
          >
            ›
          </button>
        </div>
      </div>

      {/* Weekday Grid */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {WEEKDAY_NAMES.map((w) => (
          <span key={w} className="text-[11px] font-bold theme-text-secondary">
            {w}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <span key={`blank-${i}`} className="w-8 h-8" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const monthStr = String(viewMonth + 1).padStart(2, "0");
          const dayStr = String(dayNum).padStart(2, "0");
          const currDateStr = `${viewYear}-${monthStr}-${dayStr}`;

          const isSelected = isRange
            ? currDateStr === tempStart || currDateStr === tempEnd
            : currDateStr === selectedDate;

          const isInRange = isRange && tempStart && tempEnd && currDateStr >= tempStart && currDateStr <= tempEnd;
          const isToday = currDateStr === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;

          // Date Guard checks
          const isInDisabledRange =
            Array.isArray(disabledRanges) &&
            disabledRanges.some((r) => r?.startDate && r?.endDate && currDateStr >= r.startDate && currDateStr <= r.endDate);

          const isSpecificDisabledDate =
            Array.isArray(disabledDates) && disabledDates.includes(currDateStr);

          const isDisabled =
            (minDate && currDateStr < minDate) ||
            (maxDate && currDateStr > maxDate) ||
            isInDisabledRange ||
            isSpecificDisabledDate;

          return (
            <button
              key={currDateStr}
              type="button"
              disabled={isDisabled}
              onClick={() => handleSelectDay(dayNum)}
              className={`w-8 h-8 rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                isSelected
                  ? "theme-bg-accent theme-accent-text font-bold shadow-md scale-105"
                  : isInRange
                  ? "bg-[var(--accent-main)]/20 theme-accent font-semibold"
                  : isToday
                  ? "border border-[var(--accent-main)] theme-accent theme-bg-accent-soft font-bold"
                  : isDisabled
                  ? "opacity-25 cursor-not-allowed bg-black/5 dark:bg-white/5 line-through"
                  : "hover:theme-bg-elevated theme-text-primary"
              }`}
            >
              {dayNum}
            </button>
          );
        })}
      </div>

      {/* Footer with Today Shortcut */}
      <div className="pt-2.5 mt-2 border-t theme-border flex items-center justify-between">
        <span className="text-[10px] theme-text-secondary font-medium">
          Click date to select
        </span>
        {(() => {
          const t = new Date();
          const tStr = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
          const isTodayDisabled = Boolean((minDate && tStr < minDate) || (maxDate && tStr > maxDate));
          return (
            <button
              type="button"
              disabled={isTodayDisabled}
              onClick={handleSelectToday}
              className="text-xs font-bold theme-accent hover:underline cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:no-underline"
              title={isTodayDisabled ? "Today is outside the academic year" : "Select Today"}
            >
              Today
            </button>
          );
        })()}
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {label && <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-1.5 select-none">{label}</label>}

      {!isInline && (
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="w-full min-h-[42px] flex items-center justify-between px-3.5 py-2.5 rounded-xl theme-bg-sub border theme-border theme-text-primary text-xs font-semibold hover:theme-bg-elevated/60 focus:outline-none focus:border-[var(--accent-main)] focus:ring-1 focus:ring-[var(--accent-main)] transition-all duration-200 cursor-pointer select-none shadow-2xs"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <CalendarIcon className="w-4 h-4 theme-accent shrink-0" />
            <span className="truncate font-medium">{getLabel()}</span>
          </div>
          <ChevronIcon isOpen={isOpen} className="w-3.5 h-3.5 theme-text-secondary shrink-0 ml-1" />
        </button>
      )}

      {isInline
        ? calendarDropdown
        : isOpen && typeof document !== "undefined"
        ? createPortal(calendarDropdown, document.body)
        : null}
    </div>
  );
}
