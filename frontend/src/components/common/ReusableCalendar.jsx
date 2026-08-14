import { useState, useRef, useEffect } from "react";
import { ChevronIcon, CalendarIcon } from "../ui/Icons";

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
  placeholder = "Select Date",
  className = "",
  isInline = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempStart, setTempStart] = useState(startDate || selectedDate);
  const [tempEnd, setTempEnd] = useState(endDate);
  const containerRef = useRef(null);

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
  }, [selectedDate, startDate, endDate]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen && !isInline) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, isInline]);

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

  return (
    <div ref={containerRef} className={`relative w-full inline-block ${className}`}>
      {!isInline && (
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="w-full h-[42px] flex items-center justify-between px-3.5 py-2.5 rounded-xl theme-bg-sub border theme-border theme-text-primary text-xs font-medium hover:theme-bg-elevated/50 focus:outline-none transition-all duration-200 cursor-pointer select-none shadow-sm"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <CalendarIcon className="w-4 h-4 theme-accent shrink-0" />
            <span className="truncate font-semibold">{getLabel()}</span>
          </div>
          <ChevronIcon isOpen={isOpen} className="w-3.5 h-3.5 theme-text-secondary shrink-0 ml-1" />
        </button>
      )}

      {(isOpen || isInline) && (
        <div className={isInline ? "w-full p-1 space-y-3 select-none" : "absolute z-50 left-0 mt-2 w-72 p-3 theme-bg-surface border theme-border rounded-2xl shadow-2xl space-y-3 animate-fade-in select-none"}>

          {/* Month/Year Header */}
          <div className="flex items-center justify-between text-xs font-bold theme-text-primary px-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:theme-bg-elevated transition-colors cursor-pointer"
            >
              &larr;
            </button>
            <span>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:theme-bg-elevated transition-colors cursor-pointer"
            >
              &rarr;
            </button>
          </div>

          {/* Weekday Grid */}
          <div className="grid grid-cols-7 text-center text-[10px] font-bold theme-text-secondary">
            {WEEKDAY_NAMES.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <span key={`blank-${i}`} />
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

              const isToday = currDateStr === new Date().toISOString().split("T")[0];
              const isDisabled = (minDate && currDateStr < minDate) || (maxDate && currDateStr > maxDate);

              return (
                <button
                  key={currDateStr}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelectDay(dayNum)}
                  className={`h-8 w-8 rounded-lg flex items-center justify-center font-medium transition-colors text-xs cursor-pointer ${
                    isSelected
                      ? "theme-bg-accent theme-accent-text font-bold shadow"
                      : isInRange
                      ? "bg-[var(--accent-main)]/20 theme-accent font-semibold"
                      : isToday
                      ? "border border-[var(--accent-main)] theme-accent font-bold"
                      : isDisabled
                      ? "opacity-30 cursor-not-allowed"
                      : "hover:theme-bg-elevated theme-text-primary"
                  }`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
