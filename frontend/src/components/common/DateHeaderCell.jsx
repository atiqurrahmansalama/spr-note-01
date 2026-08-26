import React from "react";
import { getHijriDateString } from "../../utils/hijriUtils";

const WEEKDAY_2LETTER = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

/**
 * Universal Date Header Cell Component
 * Centralized standard date header cell used across:
 * 1. Student Class Attendance (AttendanceMatrixTable)
 * 2. Student Residential Attendance (AttendanceMatrixTable)
 * 3. Teacher Class Attendance (AttendanceMatrixTable)
 * 4. Staff Daily Attendance (AttendanceMatrixTable)
 * 5. Event Calendar Timeline View (MasterTimeCalendar)
 *
 * Provides the unified 3-tier layout:
 * - Gregorian Day Number
 * - Hijri Day Number (clean text without background pill)
 * - Event Indicator Dot
 * - Centered 2-letter Weekday with Divider
 */
export default function DateHeaderCell({
  as: Component = "th",
  dayData,
  dateStr: propDateStr,
  dayNum: propDayNum,
  weekday: propWeekday,
  isHijriEnabled = false,
  hijriDay: propHijriDay,
  hasEvent: propHasEvent,
  eventColors: propEventColors,
  eventTitle: propEventTitle,
  isHoliday: propIsHoliday,
  holidayTitle: propHolidayTitle,
  isSelected = false,
  isToday: propIsToday,
  isCurrentMonth = true,
  showEventBackground = false,
  onClick,
  title,
  className = "",
  children,
  ...restProps
}) {
  const dateStr = propDateStr || dayData?.date || '';
  const dayNum = propDayNum !== undefined && propDayNum !== null ? propDayNum : dayData?.day;
  const weekday = propWeekday !== undefined && propWeekday !== null ? propWeekday : dayData?.weekday;
  const isHoliday = propIsHoliday !== undefined ? propIsHoliday : Boolean(dayData?.is_holiday);
  const holidayTitle = propHolidayTitle || dayData?.holiday_title || '';
  const hasEvent = propHasEvent !== undefined ? propHasEvent : Boolean(dayData?.has_event);
  const eventColors = propEventColors || dayData?.event_colors || null;
  const eventTitle = propEventTitle || dayData?.event_title || '';
  const isToday = propIsToday !== undefined ? propIsToday : Boolean(dayData?.is_today);
  const hijriDay = propHijriDay || dayData?.hijri_day || null;
  // Resolve numeric day
  const resolvedDayNum = dayNum !== undefined && dayNum !== null
    ? dayNum
    : (dateStr ? parseInt(String(dateStr).split("-")[2], 10) : "");

  // Resolve Hijri Day number
  const resolvedHijriDay = isHijriEnabled
    ? (hijriDay || (dateStr ? getHijriDateString(dateStr).split(" ")[0] : null))
    : null;

  // Resolve 2-letter weekday
  let resolvedWeekday2Letter = "";
  if (typeof weekday === "number") {
    resolvedWeekday2Letter = WEEKDAY_2LETTER[weekday % 7] || "";
  } else if (typeof weekday === "string" && weekday.length > 0) {
    resolvedWeekday2Letter = weekday.slice(0, 2).toUpperCase();
  } else if (dateStr) {
    const dObj = new Date(dateStr);
    if (!isNaN(dObj.getDay())) {
      resolvedWeekday2Letter = WEEKDAY_2LETTER[dObj.getDay()];
    }
  }

  // Construct comprehensive title tooltip if not provided
  const tooltipText = title || (
    isHoliday
      ? `Holiday / Class Off: ${holidayTitle || eventTitle || 'Class Attendance Closed'} [${dateStr || resolvedDayNum}]`
      : eventTitle
      ? `${eventTitle} [${dateStr || resolvedDayNum}]`
      : `${resolvedWeekday2Letter} - ${dateStr || resolvedDayNum}${resolvedHijriDay ? ` (Hijri: ${resolvedHijriDay})` : ""}`
  );

  // Dynamic status-based background & text styling
  let statusClasses = "";
  if (isSelected) {
    statusClasses = "theme-bg-accent text-white font-bold shadow-xs";
  } else if (isToday) {
    statusClasses = "theme-bg-accent-soft theme-accent font-bold hover:brightness-95";
  } else if (hasEvent && eventColors && showEventBackground) {
    statusClasses = `${eventColors.bg} ${eventColors.text} font-bold hover:brightness-95`;
  } else if (isHoliday) {
    statusClasses = "theme-bg-sub/80 hover:theme-bg-sub theme-text-secondary";
  } else if (!isCurrentMonth) {
    statusClasses = "theme-bg-sub/30 opacity-40 hover:opacity-75 theme-text-secondary";
  } else {
    statusClasses = "theme-bg-surface hover:theme-bg-sub/40 theme-text-primary";
  }

  return (
    <Component
      onClick={onClick}
      title={tooltipText}
      data-active={isSelected}
      data-today={isToday}
      className={`py-1.5 px-0.5 sm:px-1 font-mono border-r border-b theme-border transition-colors cursor-pointer select-none align-middle ${statusClasses} ${className}`}
      {...restProps}
    >
      <div className="flex flex-col items-center justify-between min-h-[62px] sm:min-h-[68px] py-1">
        {/* Top Group: Gregorian & Hijri Dates */}
        <div className="flex flex-col items-center justify-center gap-1.5 sm:gap-2">
          {/* 1. Gregorian Day Number */}
          <div
            className={`font-bold text-xs sm:text-sm tracking-tight leading-none ${
              isSelected
                ? "text-white"
                : isToday
                ? "theme-accent"
                : hasEvent && eventColors && showEventBackground
                ? eventColors.text
                : !isCurrentMonth
                ? "theme-text-secondary"
                : "theme-text-primary"
            }`}
          >
            {resolvedDayNum}
          </div>

          {/* 2. Hijri Day Number (Clean text, no boxed background pill) */}
          {isHijriEnabled && resolvedHijriDay && (
            <div
              className={`text-[10px] sm:text-[11px] font-mono font-bold leading-none select-none ${
                isSelected
                  ? "text-white/90"
                  : "theme-accent"
              }`}
            >
              {resolvedHijriDay}
            </div>
          )}

          {/* 3. Event Indicator Dot */}
          {hasEvent && (
            <span
              className={`w-1 h-1 rounded-full shrink-0 ${
                isSelected
                  ? "bg-white"
                  : eventColors?.dot || "theme-bg-accent"
              }`}
              style={
                !isSelected && eventColors?.hex
                  ? { backgroundColor: eventColors.hex }
                  : undefined
              }
            />
          )}
        </div>

        {/* Bottom Group: Centered 2-Letter Weekday Name */}
        <div className="w-full pt-1.5 mt-1 border-t theme-border flex items-center justify-center">
          <span
            className={`text-[8px] sm:text-[9px] font-semibold uppercase leading-none text-center block ${
              isSelected
                ? "text-white/80"
                : "opacity-60 theme-text-primary"
            }`}
          >
            {resolvedWeekday2Letter}
          </span>
        </div>

        {children}
      </div>
    </Component>
  );
}
