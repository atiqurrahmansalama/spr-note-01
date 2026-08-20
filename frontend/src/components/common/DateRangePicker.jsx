import { useState, useRef, useEffect } from "react";
import { ChevronIcon, CalendarIcon, CheckIcon } from "../ui/Icons";
import ReusableCalendar from "./ReusableCalendar";
import { calendarSettings } from "../../utils/localStore";
import { getCurrentHijriMonthRange } from "../../utils/hijriUtils";

/**
 * Universal Reusable Date Range Picker Component
 * Supports preset ranges (Past 1 Week, Past 2 Weeks, 1 Month, Full Hijri Month, etc.) and custom range picking.
 */
export default function DateRangePicker({
  startDate,
  endDate,
  onRangeSelect,
  minDate,
  maxDate,
  onReset,
  isHijriEnabled,
  label = "Select Date Range",
  placeholder = "Select Date Range...",
  className = "",
  size = "md",
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showCustomCalendar, setShowCustomCalendar] = useState(false);
  const [isCustomPicking, setIsCustomPicking] = useState(false);
  const containerRef = useRef(null);

  const [isHijriActive, setIsHijriActive] = useState(() => {
    if (typeof isHijriEnabled === "boolean") return isHijriEnabled;
    return calendarSettings.getHijriEnabled();
  });

  useEffect(() => {
    if (typeof isHijriEnabled === "boolean") {
      setIsHijriActive(isHijriEnabled);
    }
  }, [isHijriEnabled]);

  useEffect(() => {
    const handleCalendarSetting = () => {
      if (typeof isHijriEnabled !== "boolean") {
        setIsHijriActive(calendarSettings.getHijriEnabled());
      }
    };
    window.addEventListener("spr_calendar_settings_updated", handleCalendarSetting);
    return () => window.removeEventListener("spr_calendar_settings_updated", handleCalendarSetting);
  }, [isHijriEnabled]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
        setShowCustomCalendar(false);
        setIsCustomPicking(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getPresetDates = (presetKey) => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    if (presetKey === "today") {
      return { start: todayStr, end: todayStr };
    }
    if (presetKey === "yesterday") {
      const yest = new Date(today);
      yest.setDate(yest.getDate() - 1);
      const yestStr = yest.toISOString().split("T")[0];
      return { start: yestStr, end: yestStr };
    }
    if (presetKey === "past_week") {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 6);
      const startStr = weekAgo.toISOString().split("T")[0];
      return { start: startStr, end: todayStr };
    }
    if (presetKey === "past_2weeks") {
      const twoWeeksAgo = new Date(today);
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 13);
      const startStr = twoWeeksAgo.toISOString().split("T")[0];
      return { start: startStr, end: todayStr };
    }
    if (presetKey === "this_month") {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startStr = startOfMonth.toISOString().split("T")[0];
      return { start: startStr, end: todayStr };
    }
    if (presetKey === "full_hijri_month") {
      const hijriRange = getCurrentHijriMonthRange(today);
      return { start: hijriRange.start, end: hijriRange.end };
    }
    if (presetKey === "past_month") {
      const monthAgo = new Date(today);
      monthAgo.setDate(monthAgo.getDate() - 29);
      const startStr = monthAgo.toISOString().split("T")[0];
      return { start: startStr, end: todayStr };
    }
    if (presetKey === "past_3months") {
      const ago = new Date(today);
      ago.setDate(ago.getDate() - 89);
      return { start: ago.toISOString().split("T")[0], end: todayStr };
    }
    if (presetKey === "all_time") {
      return { start: "", end: "" };
    }
    return { start: "", end: "" };
  };

  const handleSelectPreset = (presetKey) => {
    if (presetKey === "custom") {
      setIsCustomPicking(true);
      setIsDropdownOpen(false);
      setShowCustomCalendar(true);
      return;
    }

    const { start, end } = getPresetDates(presetKey);
    if (presetKey === "all_time" && onReset) {
      onReset();
    } else if (onRangeSelect) {
      onRangeSelect(start, end);
    }
    setIsDropdownOpen(false);
    setShowCustomCalendar(false);
    setIsCustomPicking(false);
  };

  const formatDateDisplay = (dStr) => {
    if (!dStr) return "";
    const [y, m, d] = dStr.split("-");
    return `${d}/${m}/${y.slice(2)}`;
  };

  const getActivePresetKey = () => {
    if (isCustomPicking) return "custom";
    if (!startDate && !endDate) return "all_time";

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    const yest = new Date(today);
    yest.setDate(yest.getDate() - 1);
    const yestStr = yest.toISOString().split("T")[0];

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 6);
    const weekStr = weekAgo.toISOString().split("T")[0];

    const twoWeeksAgo = new Date(today);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 13);
    const twoWeeksStr = twoWeeksAgo.toISOString().split("T")[0];

    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 29);
    const monthStr = monthAgo.toISOString().split("T")[0];

    const threeMonthsAgo = new Date(today);
    threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 89);
    const threeMonthStr = threeMonthsAgo.toISOString().split("T")[0];

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];

    if (startDate === todayStr && endDate === todayStr) return "today";
    if (startDate === yestStr && endDate === yestStr) return "yesterday";
    if (startDate === weekStr && endDate === todayStr) return "past_week";
    if (startDate === twoWeeksStr && endDate === todayStr) return "past_2weeks";
    if (startDate === startOfMonth && endDate === todayStr) return "this_month";

    if (isHijriActive) {
      const hijriRange = getCurrentHijriMonthRange(today);
      if (startDate === hijriRange.start && endDate === hijriRange.end) return "full_hijri_month";
    }

    if (startDate === monthStr && endDate === todayStr) return "past_month";
    if (startDate === threeMonthStr && endDate === todayStr) return "past_3months";

    return "custom";
  };

  const activeKey = getActivePresetKey();

  const getLabel = () => {
    if (isCustomPicking) return "Pick custom range";
    if (activeKey === "today") return "Today";
    if (activeKey === "yesterday") return "Yesterday";
    if (activeKey === "past_week") return "Past 1 Week (7 Days)";
    if (activeKey === "past_2weeks") return "Past 2 Weeks (14 Days)";
    if (activeKey === "this_month") return "This Month";
    if (activeKey === "full_hijri_month") {
      const hijriRange = getCurrentHijriMonthRange(new Date());
      return `Full Hijri Month (${hijriRange.hijriMonthName})`;
    }
    if (activeKey === "past_month") return "Past 1 Month (30 Days)";
    if (activeKey === "past_3months") return "Past 3 Months";
    if (activeKey === "all_time") return "Full Month / All Time";

    if (startDate && endDate) {
      return `${formatDateDisplay(startDate)} – ${formatDateDisplay(endDate)}`;
    }
    if (startDate) return `${formatDateDisplay(startDate)} – ...`;
    return placeholder;
  };

  const currentHijriRange = isHijriActive ? getCurrentHijriMonthRange() : null;

  const PRESET_OPTIONS = [
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "past_week", label: "Past 1 Week (Last 7 Days)" },
    { key: "past_2weeks", label: "Past 2 Weeks (Last 14 Days)" },
    { key: "this_month", label: "This Month" },
    ...(isHijriActive && currentHijriRange
      ? [
          {
            key: "full_hijri_month",
            label: `Full Hijri Month (${currentHijriRange.hijriMonthName})`,
          },
        ]
      : []),
    { key: "past_month", label: "Past 1 Month (Last 30 Days)" },
    { key: "past_3months", label: "Past 3 Months" },
    { key: "all_time", label: "Full Month View (Reset)" },
    { key: "custom", label: "Custom Date Range…" },
  ];

  const heightClass = size === "sm" ? "h-[38px] text-xs py-1.5" : "h-[42px] text-xs py-2";

  return (
    <div ref={containerRef} className={`w-full relative ${className}`}>
      {label && (
        <div className="flex items-center justify-between mb-1.5 min-h-[16px]">
          <label className="block text-xs font-semibold theme-text-secondary">
            {label}
          </label>
          {(startDate || endDate) && onReset && (
            <button
              type="button"
              onClick={() => {
                onReset();
                setIsDropdownOpen(false);
                setShowCustomCalendar(false);
                setIsCustomPicking(false);
              }}
              className="text-[11px] font-normal theme-accent hover:underline cursor-pointer transition"
              title="Reset date filter"
            >
              Clear date
            </button>
          )}
        </div>
      )}

      {/* Main Select Dropdown Trigger Button */}
      <button
        type="button"
        onClick={() => {
          if (showCustomCalendar) {
            setShowCustomCalendar(false);
            setIsCustomPicking(false);
          } else {
            setIsDropdownOpen((prev) => !prev);
          }
        }}
        className={`w-full ${heightClass} flex items-center justify-between px-3.5 rounded-xl theme-bg-sub border theme-border theme-text-primary font-semibold hover:theme-bg-elevated/50 focus:outline-none transition-all duration-200 cursor-pointer select-none shadow-sm`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 text-left">
          <CalendarIcon className="w-4 h-4 theme-accent shrink-0" />
          <span className="truncate">{getLabel()}</span>
        </div>
        <ChevronIcon isOpen={isDropdownOpen || showCustomCalendar} className="w-3.5 h-3.5 theme-text-secondary shrink-0 ml-1" />
      </button>

      {/* Dropdown Options Popup Menu */}
      {isDropdownOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 w-full min-w-[220px] theme-bg-surface border theme-border rounded-2xl shadow-2xl p-1.5 space-y-1 animate-fade-in text-xs font-medium select-none">
          {PRESET_OPTIONS.map((opt) => {
            const isSelected = activeKey === opt.key;
            const isCustom = opt.key === "custom";
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => handleSelectPreset(opt.key)}
                className={`w-full px-3 py-2 rounded-xl flex items-center justify-between transition cursor-pointer text-left ${
                  isSelected
                    ? "theme-bg-accent-soft theme-accent font-bold"
                    : "hover:theme-bg-elevated theme-text-primary"
                }`}
              >
                <span>{opt.label}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {isSelected && !isCustom && <CheckIcon className="w-3.5 h-3.5 theme-accent" />}
                  {isCustom && (
                    <ChevronIcon
                      isOpen={showCustomCalendar}
                      className="w-3 h-3 theme-text-secondary"
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Custom Calendar Popup below input */}
      {showCustomCalendar && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 w-full min-w-[280px] theme-bg-surface border theme-border rounded-2xl shadow-2xl p-3 animate-fade-in">
          <ReusableCalendar
            isInline={true}
            isRange={true}
            startDate={startDate}
            endDate={endDate}
            onRangeSelect={(start, end) => {
              if (onRangeSelect) onRangeSelect(start, end);
              setIsDropdownOpen(false);
              setShowCustomCalendar(false);
              setIsCustomPicking(false);
            }}
            minDate={minDate}
            maxDate={maxDate}
            placeholder="Pick custom range"
            className="w-full flex justify-center"
          />
        </div>
      )}
    </div>
  );
}
