import { useRef, useState, useEffect } from "react";
import { useFont } from "../../../context/useFont";
import { getHijriDateString } from "../../../utils/hijriUtils";
import { TIMEZONE_LIST } from "../../../constants/calendarConstants";
import { calendarSettings } from "../../../utils/localStore";
import { formatDate } from "../../../utils/reportGenerator";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const WEEKDAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function HeaderDateSection({
  selectedDate,
  timeZone = "Asia/Dhaka",
  dateFormat = "DD/MM/YYYY",
  onDateChange
}) {
  const { activeFont } = useFont();
  const containerRef = useRef(null);

  const [selectedCustomDate, setSelectedCustomDate] = useState(() => {
    return selectedDate || new Date().toISOString().split("T")[0];
  });

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isHijriEnabled, setIsHijriEnabled] = useState(() => calendarSettings.getHijriEnabled());
  const [activeDateFormat, setActiveDateFormat] = useState(() => calendarSettings.getDateFormat());

  useEffect(() => {
    if (selectedDate && selectedDate !== selectedCustomDate) {
      setSelectedCustomDate(selectedDate);
      const dateObj = new Date(selectedDate);
      if (!isNaN(dateObj.getFullYear())) {
        setViewYear(dateObj.getFullYear());
        setViewMonth(dateObj.getMonth());
      }
    }
  }, [selectedDate]);

  useEffect(() => {
    const handleSettingsUpdate = (e) => {
      setIsHijriEnabled(calendarSettings.getHijriEnabled());
      setActiveDateFormat(calendarSettings.getDateFormat());
    };
    window.addEventListener("spr_calendar_settings_updated", handleSettingsUpdate);
    window.addEventListener("storage", handleSettingsUpdate);
    return () => {
      window.removeEventListener("spr_calendar_settings_updated", handleSettingsUpdate);
      window.removeEventListener("storage", handleSettingsUpdate);
    };
  }, []);

  const initialDateObj = new Date(selectedCustomDate);
  const [viewYear, setViewYear] = useState(
    isNaN(initialDateObj.getFullYear()) ? new Date().getFullYear() : initialDateObj.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState(
    isNaN(initialDateObj.getMonth()) ? new Date().getMonth() : initialDateObj.getMonth()
  );

  const activeRawDate = selectedCustomDate;

  const formattedDisplayDate = formatDate(activeRawDate, activeDateFormat || dateFormat);
  const hijriDateString = getHijriDateString(activeRawDate);

  const tzObj = TIMEZONE_LIST.find((t) => t.id === timeZone);
  const tzAbbr = tzObj ? tzObj.offset : "(UTC+06:00)";

  useEffect(() => {
    if (onDateChange && selectedCustomDate) {
      onDateChange(selectedCustomDate);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsCalendarOpen(false);
      }
    };
    if (isCalendarOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCalendarOpen]);

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

    setSelectedCustomDate(dateStr);
    if (onDateChange) onDateChange(dateStr);
    setIsCalendarOpen(false);
  };

  const handleSelectToday = (e) => {
    e.stopPropagation();
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    const todayStr = `${y}-${m}-${d}`;

    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedCustomDate(todayStr);
    if (onDateChange) onDateChange(todayStr);
    setIsCalendarOpen(false);
  };

  return (
    <div 
      ref={containerRef}
      style={{ fontFamily: activeFont.css }}
      className="relative inline-flex flex-wrap items-center justify-center gap-1.5 sm:gap-2.5 text-xs font-medium theme-text-secondary px-1 py-0.5 mx-auto select-none max-w-full bg-transparent border-0 mt-0.5 sm:mt-1"
    >
      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        <button
          type="button"
          onClick={() => setIsCalendarOpen(!isCalendarOpen)}
          className="relative cursor-pointer hover:theme-bg-elevated px-0.5 py-0.5 rounded-lg transition-all duration-150 flex items-center justify-center border border-transparent hover:theme-border group"
          title="Click to select date"
        >
          <span className="theme-text-primary text-xs sm:text-sm tracking-normal opacity-90 group-hover:opacity-100 group-hover:theme-accent transition-colors">
            {formattedDisplayDate}
          </span>

          {isHijriEnabled && hijriDateString && (
            <span className="inline-flex items-center gap-[4px] sm:gap-[6px] ml-[4px] sm:ml-[6px] theme-accent font-semibold text-xs sm:text-sm tracking-normal">
              <span>•</span>
              <span>{hijriDateString}</span>
            </span>
          )}
        </button>
      </div>

      <span 
        style={{ fontFamily: activeFont.css }}
        className="text-[10px] sm:text-[11px] theme-accent font-semibold theme-bg-accent-soft px-2 py-0.5 rounded-lg uppercase shrink-0"
      >
        ({tzAbbr})
      </span>

      {isCalendarOpen && (
        <div 
          style={{ fontFamily: activeFont.css }}
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 theme-bg-surface border theme-border rounded-2xl p-4 shadow-2xl w-72 text-left animate-fade-in theme-text-primary"
        >
          <div className="flex items-center justify-between pb-3 mb-2 border-b theme-border">
            <span className="text-xs font-bold theme-text-primary">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="w-7 h-7 rounded-lg theme-bg-sub hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary flex items-center justify-center text-[18px] transition cursor-pointer"
                title="Previous Month"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="w-7 h-7 rounded-lg theme-bg-sub hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary flex items-center justify-center text-[18px] transition cursor-pointer"
                title="Next Month"
              >
                ›
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-1.5 ">
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
              const isSelected = currentGridDateStr === activeRawDate;
              const isToday = currentGridDateStr === new Date().toISOString().split("T")[0];

              return (
                <button
                  key={dayNum}
                  type="button"
                  onClick={() => handleSelectDay(dayNum)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? "theme-bg-accent theme-accent-text font-bold shadow-md scale-105"
                      : isToday
                      ? "border border-[var(--accent-main)] theme-accent theme-bg-accent-soft font-bold"
                      : "hover:theme-bg-elevated theme-text-primary"
                  }`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          <div className="pt-3 mt-2 border-t theme-border flex items-center justify-between">
            <span className="text-[10px] theme-text-secondary font-medium">
              Click any date to apply
            </span>
            <button
              type="button"
              onClick={handleSelectToday}
              className="text-xs font-bold theme-accent hover:underline cursor-pointer"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
