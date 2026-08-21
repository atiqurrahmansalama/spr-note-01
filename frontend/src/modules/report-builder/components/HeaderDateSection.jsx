import { useRef, useState, useEffect } from "react";
import { useFont } from "../../../context/useFont";
import { getHijriDateString } from "../../../utils/hijriUtils";
import { TIMEZONE_LIST } from "../../../constants/calendarConstants";
import { calendarSettings } from "../../../utils/localStore";
import { formatDate } from "../../../utils/reportGenerator";
import ReusableCalendar from "../../../components/common/ReusableCalendar";

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
    if (selectedDate) {
      setSelectedCustomDate(selectedDate);
    }
  }, [selectedDate]);

  useEffect(() => {
    const handleSettingsUpdate = () => {
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

  const activeRawDate = selectedCustomDate;
  const formattedDisplayDate = formatDate(activeRawDate, activeDateFormat || dateFormat);
  const hijriDateString = getHijriDateString(activeRawDate);

  const tzObj = TIMEZONE_LIST.find((t) => t.id === timeZone);
  const tzAbbr = tzObj ? tzObj.offset : "(UTC+06:00)";

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

  const handleDateSelect = (dateStr) => {
    setSelectedCustomDate(dateStr);
    if (onDateChange) onDateChange(dateStr);
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
          className="relative cursor-pointer theme-bg-sub border theme-border hover:theme-bg-elevated active:scale-95 px-2.5 py-1 rounded-xl transition-all duration-150 flex items-center justify-center group shadow-sm"
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
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 theme-bg-surface border theme-border rounded-2xl p-2 shadow-2xl w-72 text-left animate-fade-in theme-text-primary"
        >
          <ReusableCalendar
            isInline
            selectedDate={activeRawDate}
            onSelectDate={handleDateSelect}
          />
        </div>
      )}
    </div>
  );
}
