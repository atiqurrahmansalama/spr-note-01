import { useState, useRef, useEffect } from "react";
import { CalendarIcon } from "../ui/Icons";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const WEEKDAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function ReportDateRangePicker({
  startDate,
  endDate,
  onRangeSelect,
  minDate,
  maxDate,
  onReset
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);
  const containerRef = useRef(null);

  // Synchronize internal state with props
  useEffect(() => {
    setTempStart(startDate);
    setTempEnd(endDate);
  }, [startDate, endDate]);

  const initDate = startDate ? new Date(startDate) : new Date();
  const [viewYear, setViewYear] = useState(
    isNaN(initDate.getFullYear()) ? new Date().getFullYear() : initDate.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState(
    isNaN(initDate.getMonth()) ? new Date().getMonth() : initDate.getMonth()
  );

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
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

    if (!tempStart || (tempStart && tempEnd)) {
      // First click: Pick Start Date
      setTempStart(dateStr);
      setTempEnd("");
    } else if (tempStart && !tempEnd) {
      // Second click: Pick End Date
      if (dateStr < tempStart) {
        setTempStart(dateStr);
        setTempEnd("");
      } else {
        setTempEnd(dateStr);
        onRangeSelect(tempStart, dateStr);
        setIsOpen(false);
      }
    }
  };

  const formatDateDisplay = (dStr) => {
    if (!dStr) return "";
    const [y, m, d] = dStr.split("-");
    return `${d}/${m}/${y.slice(2)}`;
  };

  const buttonLabel = startDate && endDate
    ? `${formatDateDisplay(startDate)} - ${formatDateDisplay(endDate)}`
    : startDate
    ? `From ${formatDateDisplay(startDate)}...`
    : "Date Range Filter";

  return (
    <div ref={containerRef} className="relative inline-block text-xs select-none">
      
      {/* Single Clean Calendar Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 border ${
          startDate || endDate
            ? "theme-bg-accent-soft border-[var(--accent-main)] theme-accent font-bold"
            : "theme-bg-sub border-transparent theme-text-secondary hover:theme-text-primary"
        }`}
        title="Click to select Date Range"
      >
        <CalendarIcon className="w-4 h-4 theme-accent shrink-0" />
        <span className="text-xs font-semibold">{buttonLabel}</span>
        {(startDate || endDate) && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              setTempStart("");
              setTempEnd("");
              onReset();
            }}
            className="ml-1 text-[11px] hover:text-rose-400 font-bold p-0.5 rounded cursor-pointer"
            title="Clear date filter"
          >
            ✕
          </span>
        )}
      </button>

      {/* Popover Calendar */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 theme-bg-surface border theme-border rounded-2xl p-4 shadow-2xl w-72 text-left animate-fade-in theme-text-primary">
          <div className="flex items-center justify-between pb-3 mb-2 border-b theme-border">
            <span className="text-xs font-bold theme-text-primary">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="w-7 h-7 rounded-lg theme-bg-sub hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary flex items-center justify-center text-xs transition cursor-pointer font-bold"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="w-7 h-7 rounded-lg theme-bg-sub hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary flex items-center justify-center text-xs transition cursor-pointer font-bold"
              >
                ›
              </button>
            </div>
          </div>

          <div className="text-[10px] theme-text-secondary mb-2 italic">
            {!tempStart ? "Click 1st date for Start Date" : !tempEnd ? "Click 2nd date for End Date" : "Range selected"}
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {WEEKDAY_NAMES.map((wd) => (
              <span key={wd} className="text-[11px] font-bold theme-text-secondary">
                {wd}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <span key={`empty-${i}`} className="w-8 h-8" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const monthStr = String(viewMonth + 1).padStart(2, "0");
              const dayStr = String(dayNum).padStart(2, "0");
              const currentGridDateStr = `${viewYear}-${monthStr}-${dayStr}`;

              const isStart = currentGridDateStr === tempStart;
              const isEnd = currentGridDateStr === tempEnd;
              const inRange = tempStart && tempEnd && currentGridDateStr >= tempStart && currentGridDateStr <= tempEnd;

              const isDisabled =
                (minDate && currentGridDateStr < minDate) ||
                (maxDate && currentGridDateStr > maxDate);

              return (
                <button
                  key={dayNum}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => !isDisabled && handleSelectDay(dayNum)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold flex items-center justify-center transition-all ${
                    isDisabled
                      ? "opacity-25 cursor-not-allowed theme-text-secondary"
                      : isStart || isEnd
                      ? "theme-bg-accent theme-accent-text font-bold shadow-md scale-105 cursor-pointer"
                      : inRange
                      ? "theme-bg-accent-soft theme-accent font-bold"
                      : "hover:theme-bg-elevated theme-text-primary cursor-pointer"
                  }`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          <div className="pt-3 mt-2 border-t theme-border flex items-center justify-between">
            <span className="text-[10px] theme-text-secondary font-medium">
              Range: {minDate || 'Earliest'} to {maxDate || 'Today'}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold theme-accent hover:underline cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
