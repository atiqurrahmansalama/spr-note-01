import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  ChevronIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  CloseIcon,
  CheckIcon,
} from "../ui/Icons";
import { getHijriDetails } from "../../utils/hijriUtils";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const MONTH_SHORT_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const WEEKDAY_NAMES = ["S", "M", "T", "W", "T", "F", "S"];

// Generates a comprehensive range of years (1950 to 2060)
const ALL_YEARS = Array.from({ length: 111 }, (_, i) => 1950 + i);

/**
 * Enterprise Reusable Calendar Component
 * Features:
 * - Dual-Column Month & Year Picker (Left column: Months, Right column: Years side-by-side with scrollbar-none)
 * - Auto-scroll centering on active Month and Year
 * - Minimal, clutter-free header with clean navigation
 * - Multi-tier hijri & weekday markers
 * - Portal positioning engine
 */
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
  const [isPickerMode, setIsPickerMode] = useState(false); // false: Days grid, true: 2-column Month & Year picker
  const containerRef = useRef(null);
  const popupRef = useRef(null);
  const selectedYearRef = useRef(null);
  const selectedMonthRef = useRef(null);

  const [coords, setCoords] = useState({
    top: 0,
    left: 0,
    width: 320,
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

  // Auto-scroll columns to center active month & year when opening Picker Mode
  useEffect(() => {
    if (isPickerMode) {
      setTimeout(() => {
        selectedYearRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        selectedMonthRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 50);
    }
  }, [isPickerMode]);

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
    const popupWidth = 320;
    const popupHeight = 360;
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
        setIsPickerMode(false);
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
    setIsPickerMode(false);
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
          ? "w-full p-2.5 space-y-3 select-none"
          : `p-3.5 sm:p-4 theme-bg-surface border theme-border rounded-2xl shadow-2xl space-y-3 animate-fade-in select-none backdrop-blur-md ${popupClassName}`
      }
    >
      {/* ────────────────── 1. DUAL-COLUMN MONTH & YEAR PICKER ────────────────── */}
      {isPickerMode ? (
        <div className="space-y-2.5 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b theme-border">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold theme-text-primary tracking-tight">Month & Year</span>
              <span className="px-2 py-0.5 rounded-lg theme-bg-accent-soft theme-accent text-[11px] font-bold">
                {MONTH_SHORT_NAMES[viewMonth]} {viewYear}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsPickerMode(false)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl theme-bg-accent theme-accent-text text-xs font-bold transition cursor-pointer shadow-xs active:scale-95"
              title="Apply and return to calendar"
            >
              <CheckIcon className="w-3.5 h-3.5" />
              <span>Done</span>
            </button>
          </div>

          {/* Dual Columns Container (Left: Months, Right: Years) */}
          <div className="grid grid-cols-2 gap-2 h-[230px]">
            {/* Column 1: 12 Months List (Scrollbar Hidden) */}
            <div className="flex flex-col border theme-border rounded-xl p-1 overflow-hidden theme-bg-sub/30">
              <div className="flex-1 overflow-y-auto scrollbar-none space-y-0.5 p-1 scroll-smooth">
                {MONTH_NAMES.map((mName, mIdx) => {
                  const isSelected = viewMonth === mIdx;
                  const monthStartStr = `${viewYear}-${String(mIdx + 1).padStart(2, "0")}-01`;
                  const monthLastDay = new Date(viewYear, mIdx + 1, 0).getDate();
                  const monthEndStr = `${viewYear}-${String(mIdx + 1).padStart(2, "0")}-${String(monthLastDay).padStart(2, "0")}`;

                  const isMonthDisabled = Boolean(
                    (minDate && monthEndStr < minDate) ||
                    (maxDate && monthStartStr > maxDate)
                  );

                  return (
                    <button
                      key={mName}
                      ref={isSelected ? selectedMonthRef : null}
                      type="button"
                      disabled={isMonthDisabled}
                      onClick={() => setViewMonth(mIdx)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? "theme-bg-accent theme-accent-text font-bold shadow-2xs scale-102 ring-1 ring-[var(--accent-main)]/30"
                          : isMonthDisabled
                          ? "opacity-25 cursor-not-allowed line-through"
                          : "theme-bg-sub/50 hover:theme-bg-elevated theme-text-primary active:scale-98"
                      }`}
                    >
                      <span className="truncate">{mName}</span>
                      <span className="text-[9px] font-mono opacity-60 ml-1 shrink-0">
                        {String(mIdx + 1).padStart(2, "0")}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Column 2: Scrollable Years List (1950 - 2060, Scrollbar Hidden) */}
            <div className="flex flex-col border theme-border rounded-xl p-1 overflow-hidden theme-bg-sub/30">
              <div className="flex-1 overflow-y-auto scrollbar-none space-y-0.5 p-1 scroll-smooth">
                {ALL_YEARS.map((yr) => {
                  const isSelected = viewYear === yr;
                  const yearStartStr = `${yr}-01-01`;
                  const yearEndStr = `${yr}-12-31`;

                  const isYearDisabled = Boolean(
                    (minDate && yearEndStr < minDate) ||
                    (maxDate && yearStartStr > maxDate)
                  );

                  return (
                    <button
                      key={yr}
                      ref={isSelected ? selectedYearRef : null}
                      type="button"
                      disabled={isYearDisabled}
                      onClick={() => setViewYear(yr)}
                      className={`w-full text-center px-2 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? "theme-bg-accent theme-accent-text shadow-2xs scale-102 ring-1 ring-[var(--accent-main)]/30"
                          : isYearDisabled
                          ? "opacity-25 cursor-not-allowed line-through"
                          : "theme-bg-sub/50 hover:theme-bg-elevated theme-text-primary active:scale-98"
                      }`}
                    >
                      <span>{yr}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ────────────────── 2. STANDARD DAYS VIEW MODE ────────────────── */
        <>
          {/* Month/Year Unified Segmented Header */}
          <div className="flex items-center justify-between pb-2 mb-1 border-b theme-border">
            <div className="flex flex-col gap-0.5">
              {/* Clickable Month + Year Pill to open Dual Column Picker */}
              <button
                type="button"
                onClick={() => setIsPickerMode(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl theme-bg-sub border theme-border theme-text-primary font-bold text-xs hover:theme-bg-elevated transition cursor-pointer active:scale-95 shadow-2xs group"
                title="Click to pick month and year"
              >
                <span>{MONTH_NAMES[viewMonth]} {viewYear}</span>
                <ChevronIcon isOpen={false} className="w-2.5 h-2.5 theme-accent group-hover:translate-y-0.5 transition-transform" />
              </button>

              {/* Hijri Dynamic Subtitle */}
              {(() => {
                try {
                  const firstDayStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-01`;
                  const d = getHijriDetails(new Date(firstDayStr));
                  return (
                    <span className="text-[10px] font-mono theme-accent font-semibold leading-none pt-0.5 pl-1">
                      {d.monthName} {d.year}h
                    </span>
                  );
                } catch {
                  return null;
                }
              })()}
            </div>

            {/* Clean Minimal Previous / Next Month Navigation */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={isPrevMonthDisabled}
                onClick={handlePrevMonth}
                className="w-7 h-7 rounded-xl theme-bg-sub hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary flex items-center justify-center transition cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed border theme-border active:scale-95 shadow-2xs"
                title={isPrevMonthDisabled ? "Previous Month outside range" : "Previous Month"}
              >
                <ChevronLeftIcon className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={isNextMonthDisabled}
                onClick={handleNextMonth}
                className="w-7 h-7 rounded-xl theme-bg-sub hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary flex items-center justify-center transition cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed border theme-border active:scale-95 shadow-2xs"
                title={isNextMonthDisabled ? "Next Month outside range" : "Next Month"}
              >
                <ChevronRightIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Weekday Grid */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {WEEKDAY_NAMES.map((w) => (
              <span key={w} className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
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
                  className={`w-8 h-8 rounded-xl text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? "theme-bg-accent theme-accent-text font-bold shadow-md scale-105 ring-2 ring-[var(--accent-main)]/40"
                      : isInRange
                      ? "bg-[var(--accent-main)]/20 theme-accent font-semibold"
                      : isToday
                      ? "border border-[var(--accent-main)] theme-accent theme-bg-accent-soft font-bold shadow-2xs"
                      : isDisabled
                      ? "opacity-25 cursor-not-allowed bg-black/5 dark:bg-white/5 line-through"
                      : "hover:theme-bg-elevated theme-text-primary active:scale-95"
                  }`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Footer with Mode Indicator & Today Shortcut */}
      <div className="pt-2.5 mt-2 border-t theme-border flex items-center justify-between">
        <span className="text-[10px] theme-text-secondary font-medium">
          {isPickerMode ? "Select month & year" : "Tap month/year to jump"}
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
              className="text-xs font-bold theme-text-secondary hover:underline cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:no-underline px-2 py-0.5"
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
