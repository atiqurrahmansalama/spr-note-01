import { useState, useRef, useEffect } from "react";
import { ChevronIcon, CalendarIcon, CheckIcon } from "../../../components/ui/Icons";
import ReusableCalendar from "../../../components/common/ReusableCalendar";

export default function ReportDateRangePicker({
  startDate,
  endDate,
  onRangeSelect,
  minDate,
  maxDate,
  onReset
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showCustomCalendar, setShowCustomCalendar] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
        setShowCustomCalendar(false);
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
    if (presetKey === "this_month") {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startStr = startOfMonth.toISOString().split("T")[0];
      return { start: startStr, end: todayStr };
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
      // Toggle custom calendar inline within dropdown
      setShowCustomCalendar((prev) => !prev);
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
  };

  const formatDateDisplay = (dStr) => {
    if (!dStr) return "";
    const [y, m, d] = dStr.split("-");
    return `${d}/${m}/${y.slice(2)}`;
  };

  const getActivePresetKey = () => {
    if (!startDate && !endDate) return "all_time";

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

    const threeMonthsAgo = new Date(today);
    threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 89);
    const threeMonthStr = threeMonthsAgo.toISOString().split("T")[0];

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];

    if (startDate === todayStr && endDate === todayStr) return "today";
    if (startDate === yestStr && endDate === yestStr) return "yesterday";
    if (startDate === weekStr && endDate === todayStr) return "past_week";
    if (startDate === startOfMonth && endDate === todayStr) return "this_month";
    if (startDate === monthStr && endDate === todayStr) return "past_month";
    if (startDate === threeMonthStr && endDate === todayStr) return "past_3months";

    return "custom";
  };

  const activeKey = getActivePresetKey();

  const getLabel = () => {
    if (activeKey === "today") return "Today";
    if (activeKey === "yesterday") return "Yesterday";
    if (activeKey === "past_week") return "Past Week (Last 7 Days)";
    if (activeKey === "this_month") return "This Month";
    if (activeKey === "past_month") return "Past 1 Month (Last 30 Days)";
    if (activeKey === "past_3months") return "Past 3 Months";
    if (activeKey === "all_time") return "All Time";

    if (startDate && endDate) {
      return `${formatDateDisplay(startDate)} – ${formatDateDisplay(endDate)}`;
    }
    if (startDate) return `${formatDateDisplay(startDate)} – ...`;
    return "Select Date Range...";
  };

  const PRESET_OPTIONS = [
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "past_week", label: "Past Week (Last 7 Days)" },
    { key: "this_month", label: "This Month" },
    { key: "past_month", label: "Past 1 Month (30 Days)" },
    { key: "past_3months", label: "Past 3 Months" },
    { key: "custom", label: "Custom Date Range…" },
    { key: "all_time", label: "All Time (Clear Filter)" },
  ];

  return (
    <div ref={containerRef} className="space-y-1.5 w-full relative">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold uppercase tracking-wider theme-text-secondary block">
          Select Date Range
        </label>
        {(startDate || endDate) && onReset && (
          <button
            type="button"
            onClick={() => {
              onReset();
              setIsDropdownOpen(false);
              setShowCustomCalendar(false);
            }}
            className="text-[10px] theme-bg-sub border theme-border hover:theme-bg-elevated px-2 py-0.5 rounded-lg text-rose-400 font-bold uppercase tracking-wider cursor-pointer transition active:scale-95 shadow-sm"
            title="Reset date filter"
          >
            Clear Date
          </button>
        )}
      </div>

      {/* Main Select Dropdown Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsDropdownOpen((prev) => !prev);
          if (isDropdownOpen) setShowCustomCalendar(false);
        }}
        className="w-full h-[42px] flex items-center justify-between px-3.5 py-2.5 rounded-xl theme-bg-sub border theme-border theme-text-primary text-xs font-semibold hover:theme-bg-elevated/50 focus:outline-none transition-all duration-200 cursor-pointer select-none shadow-sm"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <CalendarIcon className="w-4 h-4 theme-accent shrink-0" />
          <span className="truncate">{getLabel()}</span>
        </div>
        <ChevronIcon isOpen={isDropdownOpen} className="w-3.5 h-3.5 theme-text-secondary shrink-0 ml-1" />
      </button>

      {/* Dropdown Options Popup Menu */}
      {isDropdownOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 w-full theme-bg-surface border theme-border rounded-2xl shadow-2xl p-1.5 space-y-1 animate-fade-in text-xs font-medium select-none">
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

          {/* Inline Custom Calendar — appears inside the dropdown when Custom is chosen */}
          {showCustomCalendar && (
            <div className="pt-1 pb-0.5 px-1 border-t theme-border mt-1 animate-fade-in">
              <ReusableCalendar
                isRange={true}
                startDate={startDate}
                endDate={endDate}
                onRangeSelect={(start, end) => {
                  if (onRangeSelect) onRangeSelect(start, end);
                  setIsDropdownOpen(false);
                  setShowCustomCalendar(false);
                }}
                minDate={minDate}
                maxDate={maxDate}
                placeholder="Pick custom range"
                className="w-full"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
