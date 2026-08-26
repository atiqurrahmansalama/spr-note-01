import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronIcon, CalendarIcon, CheckIcon } from "../ui/Icons";
import ReusableCalendar from "../common/ReusableCalendar";
import { calendarSettings } from "../../utils/localStore";
import { getCurrentHijriMonthRange } from "../../utils/hijriUtils";

/**
 * Universal Reusable Date Range Picker Component
 * Supports preset ranges (Past 1 Week, Past 2 Weeks, 1 Month, Full Hijri Month, etc.) and custom range picking.
 * Uses portal-based rendering to prevent container clipping and mobile right-edge overflow.
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
  const dropdownRef = useRef(null);

  const [coords, setCoords] = useState({
    top: 0,
    left: 0,
    width: 0,
    openUpward: false,
    maxHeight: 360,
  });

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

  // Viewport position updater
  const updatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const requiredHeight = showCustomCalendar ? 370 : 270;

    const shouldOpenUpward = spaceBelow < requiredHeight && spaceAbove > spaceBelow;
    const availableHeight = shouldOpenUpward
      ? Math.max(120, spaceAbove - 16)
      : Math.max(120, spaceBelow - 16);

    const minPopupW = showCustomCalendar ? 320 : 230;
    const maxScreenW = typeof window !== "undefined" ? window.innerWidth - 16 : 340;
    const calculatedWidth = Math.min(maxScreenW, Math.max(rect.width, minPopupW));

    let targetLeft = rect.left;
    if (typeof window !== "undefined") {
      if (targetLeft + calculatedWidth > window.innerWidth - 8) {
        targetLeft = window.innerWidth - calculatedWidth - 8;
      }
      if (targetLeft < 8) {
        targetLeft = 8;
      }
    }

    setCoords({
      left: targetLeft,
      width: calculatedWidth,
      top: shouldOpenUpward ? rect.top - 6 : rect.bottom + 6,
      openUpward: shouldOpenUpward,
      maxHeight: Math.min(420, availableHeight),
    });
  };

  useEffect(() => {
    if (isDropdownOpen || showCustomCalendar) {
      updatePosition();
      const handleScroll = (e) => {
        if (dropdownRef.current && dropdownRef.current.contains(e.target)) return;
        updatePosition();
      };
      window.addEventListener("scroll", handleScroll, true);
      window.addEventListener("resize", updatePosition);
      return () => {
        window.removeEventListener("scroll", handleScroll, true);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [isDropdownOpen, showCustomCalendar]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target)
      ) {
        setIsDropdownOpen(false);
        setShowCustomCalendar(false);
        setIsCustomPicking(false);
      }
    };
    if (isDropdownOpen || showCustomCalendar) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isDropdownOpen, showCustomCalendar]);

  const getPresetDates = (presetKey) => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    let start = "";
    let end = "";

    if (presetKey === "today") {
      start = todayStr;
      end = todayStr;
    } else if (presetKey === "yesterday") {
      const yest = new Date(today);
      yest.setDate(yest.getDate() - 1);
      const yestStr = yest.toISOString().split("T")[0];
      start = yestStr;
      end = yestStr;
    } else if (presetKey === "past_week") {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 6);
      start = weekAgo.toISOString().split("T")[0];
      end = todayStr;
    } else if (presetKey === "past_2weeks") {
      const twoWeeksAgo = new Date(today);
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 13);
      start = twoWeeksAgo.toISOString().split("T")[0];
      end = todayStr;
    } else if (presetKey === "this_month") {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      start = startOfMonth.toISOString().split("T")[0];
      end = todayStr;
    } else if (presetKey === "full_hijri_month") {
      const hijriRange = getCurrentHijriMonthRange(today);
      start = hijriRange.start;
      end = hijriRange.end;
    } else if (presetKey === "past_month") {
      const monthAgo = new Date(today);
      monthAgo.setDate(monthAgo.getDate() - 29);
      start = monthAgo.toISOString().split("T")[0];
      end = todayStr;
    } else if (presetKey === "past_3months") {
      const ago = new Date(today);
      ago.setDate(ago.getDate() - 89);
      start = ago.toISOString().split("T")[0];
      end = todayStr;
    } else if (presetKey === "all_time") {
      return { start: minDate || "", end: maxDate || "" };
    }

    // Boundary Clamp: Restrict preset range strictly within Academic Year minDate/maxDate
    if (start && minDate && start < minDate) start = minDate;
    if (end && maxDate && end > maxDate) end = maxDate;
    if (start && maxDate && start > maxDate) start = maxDate;
    if (end && minDate && end < minDate) end = minDate;

    return { start, end };
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

    const hijriRange = getCurrentHijriMonthRange(today);
    if (startDate === hijriRange.start && endDate === hijriRange.end) return "full_hijri_month";

    if (startDate === monthStr && endDate === todayStr) return "past_month";
    if (startDate === threeMonthStr && endDate === todayStr) return "past_3months";

    return "custom";
  };

  const activeKey = getActivePresetKey();

  const getLabel = () => {
    if (isCustomPicking) return "Pick custom range";
    if (activeKey === "today") return "Today";
    if (activeKey === "yesterday") return "Yesterday";
    if (activeKey === "past_week") return "Last 7 Days";
    if (activeKey === "past_2weeks") return "Last 14 Days";
    if (activeKey === "this_month") return "This Month";
    if (activeKey === "full_hijri_month") {
      return `Full Hijri Month`;
    }
    if (activeKey === "past_month") return "Last 30 Days";
    if (activeKey === "past_3months") return "Last 90 Days";
    if (activeKey === "all_time") return "Full Month";

    if (startDate && endDate) {
      return `${formatDateDisplay(startDate)} – ${formatDateDisplay(endDate)}`;
    }
    if (startDate) return `${formatDateDisplay(startDate)} – ...`;
    return placeholder;
  };

  const PRESET_OPTIONS = [
    { key: "all_time", label: "Full Month (Reset)" },
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "past_week", label: "Last 7 Days" },
    { key: "past_2weeks", label: "Last 14 Days" },
    { key: "this_month", label: "This Month" },
    { key: "full_hijri_month", label: `Full Hijri Month` },
    { key: "past_month", label: "Last 30 Days" },
    { key: "past_3months", label: "Last 90 Days" },
    { key: "custom", label: "Custom Date Range…" },
  ];

  const heightClass = size === "sm" ? "h-[38px] text-xs py-1.5" : "h-[42px] text-xs py-2";

  // Dropdown Portal Menu Component
  const dropdownPortal =
    isDropdownOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              left: `${coords.left}px`,
              top: coords.openUpward ? "auto" : `${coords.top}px`,
              bottom: coords.openUpward ? `${window.innerHeight - coords.top}px` : "auto",
              width: `${coords.width}px`,
              maxHeight: `${coords.maxHeight}px`,
              zIndex: 99999,
            }}
            className="theme-bg-surface border theme-border rounded-2xl shadow-2xl p-1.5 space-y-1 animate-fade-in text-xs font-medium select-none overflow-y-auto"
          >
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
                  <span className="truncate">{opt.label}</span>
                  <div className="flex items-center gap-1.5 shrink-0 ml-1.5">
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
          </div>,
          document.body
        )
      : null;

  // Custom Calendar Portal Component
  const calendarPortal =
    showCustomCalendar && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              left: `${coords.left}px`,
              top: coords.openUpward ? "auto" : `${coords.top}px`,
              bottom: coords.openUpward ? `${window.innerHeight - coords.top}px` : "auto",
              width: `${coords.width}px`,
              maxHeight: `${coords.maxHeight}px`,
              zIndex: 99999,
            }}
            className="theme-bg-surface border theme-border rounded-2xl shadow-2xl p-3 animate-fade-in overflow-y-auto"
          >
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
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={containerRef} className={`w-full relative ${className}`}>
      {label && (
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider">
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
              className="text-[10px] font-bold theme-accent hover:underline cursor-pointer transition uppercase tracking-wider"
              title="Reset date filter"
            >
              Clear
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

      {/* Render Dropdown & Calendar Portals */}
      {dropdownPortal}
      {calendarPortal}
    </div>
  );
}
