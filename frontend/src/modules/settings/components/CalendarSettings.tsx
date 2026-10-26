import React, { useState, useEffect, useMemo } from "react";
import { useOutletContext, Link } from "react-router-dom";
import {
  CalendarIcon,
  ClockIcon,
  GlobeIcon,
  CheckIcon,
  RefreshIcon,
  SearchIcon,
  CloseIcon,
  InfoIcon,
} from "../../../components/ui/Icons";
import {
  getEnrichedTimezoneList,
  getSystemTimezone,
  getTimezoneOffsetString,
  getTodayInTimezone,
  DATE_FORMAT_LIST,
  FIRST_DAY_LIST,
} from "../../../constants/calendarConstants";
import { calendarSettings as calStore } from "../../../utils/localStore";
import { getHijriDateString } from "../../../utils/hijriUtils";

export interface CalendarSettingsProps {
  timeZone?: string;
  setTimeZone?: (tz: string) => void;
  dateFormat?: string;
  setDateFormat?: (fmt: string) => void;
  hideHeader?: boolean;
  isEmbedded?: boolean;
}

interface OutletContextType {
  timeZone?: string;
  setTimeZone?: (tz: string) => void;
  dateFormat?: string;
  setDateFormat?: (fmt: string) => void;
}

/**
 * Enterprise Date, Time & Calendar Settings Section
 * Provides centralized configuration for:
 * 1. Workspace Regional Timezone & Live Clock Sync
 * 2. Enterprise Date Formatting Patterns
 * 3. Academic Calendar First-Day-of-Week Standard
 * 4. Islamic Lunar (Hijri) Estimate Engine
 * 5. Daily Classroom Multi-Region Synchronization Reference
 */
export default function CalendarSettings({
  timeZone: propTimeZone,
  setTimeZone: propSetTimeZone,
  dateFormat: propDateFormat,
  setDateFormat: propSetDateFormat,
  hideHeader = false,
  isEmbedded = false,
}: CalendarSettingsProps) {
  const outletContext = (useOutletContext() as OutletContextType) || {};

  const activeTimeZone = propTimeZone || outletContext.timeZone || calStore.getTimezone();
  const setTimeZoneHandler = propSetTimeZone || outletContext.setTimeZone || calStore.saveTimezone;

  const activeDateFormat = propDateFormat || outletContext.dateFormat || calStore.getDateFormat();
  const setDateFormatHandler = propSetDateFormat || outletContext.setDateFormat || calStore.saveDateFormat;

  const [firstDay, setFirstDay] = useState<string>(() => calStore.getFirstDay());
  const [enableHijri, setEnableHijri] = useState<boolean>(() => calStore.getHijriEnabled());
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());

  const systemTimezone = useMemo(() => getSystemTimezone(), []);
  const enrichedTimezones = useMemo(() => getEnrichedTimezoneList(), []);

  // Live ticking clock updated every second
  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Handler for Timezone update
  const handleTimezoneSelect = (tzId: string) => {
    setTimeZoneHandler(tzId);
    calStore.saveTimezone(tzId);
    window.dispatchEvent(
      new CustomEvent("spr_calendar_settings_updated", {
        detail: { timezone: tzId, dateFormat: activeDateFormat, enableHijri, firstDay },
      })
    );
  };

  // Handler for Date Format update
  const handleDateFormatSelect = (fmtId: string) => {
    setDateFormatHandler(fmtId);
    calStore.saveDateFormat(fmtId);
    window.dispatchEvent(
      new CustomEvent("spr_calendar_settings_updated", {
        detail: { timezone: activeTimeZone, dateFormat: fmtId, enableHijri, firstDay },
      })
    );
  };

  // Handler for First Day of Week update
  const handleFirstDayChange = (dayId: string) => {
    setFirstDay(dayId);
    calStore.saveFirstDay(dayId);
    window.dispatchEvent(
      new CustomEvent("spr_calendar_settings_updated", {
        detail: { timezone: activeTimeZone, dateFormat: activeDateFormat, enableHijri, firstDay: dayId },
      })
    );
  };

  // Handler for Islamic Hijri Toggle
  const handleHijriToggle = () => {
    const nextVal = !enableHijri;
    setEnableHijri(nextVal);
    calStore.saveHijriEnabled(nextVal);
    window.dispatchEvent(
      new CustomEvent("spr_calendar_settings_updated", {
        detail: { timezone: activeTimeZone, dateFormat: activeDateFormat, enableHijri: nextVal, firstDay },
      })
    );
  };

  // Handler for Resetting All Defaults
  const handleResetDefaults = () => {
    const defaultTz = getSystemTimezone();
    const defaultFmt = "DD/MM/YYYY";
    const defaultDay = "Saturday";
    const defaultHijri = false;

    setTimeZoneHandler(defaultTz);
    setDateFormatHandler(defaultFmt);
    setFirstDay(defaultDay);
    setEnableHijri(defaultHijri);

    calStore.saveTimezone(defaultTz);
    calStore.saveDateFormat(defaultFmt);
    calStore.saveFirstDay(defaultDay);
    calStore.saveHijriEnabled(defaultHijri);

    window.dispatchEvent(
      new CustomEvent("spr_calendar_settings_updated", {
        detail: {
          timezone: defaultTz,
          dateFormat: defaultFmt,
          enableHijri: defaultHijri,
          firstDay: defaultDay,
        },
      })
    );
  };

  // Format today's date in selected timezone
  const todayDateStr = useMemo(() => {
    return getTodayInTimezone(activeTimeZone);
  }, [activeTimeZone]);

  // Compute live local time in active timezone
  const formattedLiveTime = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: activeTimeZone || "UTC",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(currentTime);
    } catch {
      return currentTime.toLocaleTimeString();
    }
  }, [currentTime, activeTimeZone]);

  // Active timezone offset string
  const activeOffsetString = useMemo(() => {
    return getTimezoneOffsetString(activeTimeZone);
  }, [activeTimeZone]);

  // Hijri date string for today
  const liveHijriDate = useMemo(() => {
    return getHijriDateString(todayDateStr);
  }, [todayDateStr]);

  // Helper to format live sample dates
  const formatSampleDate = (fmt: string, dateStr: string) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    const monthIdx = parseInt(m, 10) - 1;
    const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const fullMonths = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const shortM = shortMonths[monthIdx] || m;
    const fullM = fullMonths[monthIdx] || m;

    switch (fmt) {
      case "DD/MM/YYYY":
        return `${d}/${m}/${y}`;
      case "MM/DD/YYYY":
        return `${m}/${d}/${y}`;
      case "YYYY-MM-DD":
        return `${y}-${m}-${d}`;
      case "DD MMM YYYY":
        return `${d} ${shortM} ${y}`;
      case "DD MMMM YYYY":
        return `${d} ${fullM} ${y}`;
      case "MMM DD, YYYY":
        return `${shortM} ${d}, ${y}`;
      case "MMMM DD, YYYY":
        return `${fullM} ${d}, ${y}`;
      case "DD.MM.YYYY":
        return `${d}.${m}.${y}`;
      case "YYYY/MM/DD":
        return `${y}/${m}/${d}`;
      default:
        return `${d}/${m}/${y}`;
    }
  };

  // Filtered Timezone List based on user search query
  const filteredTimezones = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return enrichedTimezones;
    return enrichedTimezones.filter((tz) => {
      const matchName = tz.name.toLowerCase().includes(q);
      const matchCity = (tz.city || "").toLowerCase().includes(q);
      const matchOffset = tz.offset.toLowerCase().includes(q);
      const matchId = tz.id.toLowerCase().includes(q);
      return matchName || matchCity || matchOffset || matchId;
    });
  }, [searchQuery, enrichedTimezones]);

  return (
    <div
      className={`w-full ${
        isEmbedded ? "max-w-none" : "max-w-4xl mx-auto"
      } flex flex-col space-y-6 animate-fade-in theme-text-primary ${
        isEmbedded ? "py-0 px-0" : "py-4 px-3 sm:px-6"
      }`}
    >
      {/* ─── 1. TOP HEADER & LIVE TELEMETRY BANNER ────────────────────────── */}
      {!hideHeader && (
        <div className="w-full theme-bg-surface border theme-border rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 theme-bg-accent-soft rounded-xl theme-accent shrink-0">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold theme-text-primary tracking-tight">
                Date & Time Settings
              </h2>
              <p className="text-xs theme-text-secondary mt-0.5">
                Centralized workspace timezone, synchronized clock, regional date formats, and calendar standards.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-1.5 text-xs font-semibold theme-text-secondary hover:theme-text-primary theme-bg-sub hover:theme-bg-elevated rounded-xl transition flex items-center gap-1.5 shrink-0 cursor-pointer border theme-border"
          >
            <RefreshIcon className="w-3.5 h-3.5 theme-text-secondary" />
            <span>Reset Defaults</span>
          </button>
        </div>
      )}

      {/* ─── 2. LIVE CLOCK & DATE PREVIEW CAROUSEL CARD ─────────────────────── */}
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b theme-border">
          <div className="flex items-center gap-2">
            <ClockIcon className="w-4 h-4 theme-accent" />
            <h3 className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
              Live Regional Synchronizer
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono theme-accent theme-bg-accent-soft px-2.5 py-0.5 rounded-md font-bold">
              {activeOffsetString}
            </span>
            <span className="text-xs font-medium theme-text-secondary hidden sm:inline">
              {activeTimeZone}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* Live Digital Clock */}
          <div className="p-4 theme-bg-sub rounded-xl border theme-border flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
                Live Digital Time
              </span>
              <span className="w-2 h-2 rounded-full theme-bg-accent animate-pulse" />
            </div>
            <div className="text-2xl font-bold font-mono theme-accent tracking-tight mt-2">
              {formattedLiveTime}
            </div>
            <div className="text-[11px] theme-text-secondary mt-1 font-mono truncate">
              {activeTimeZone}
            </div>
          </div>

          {/* Formatted Date */}
          <div className="p-4 theme-bg-sub rounded-xl border theme-border flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
                Formatted System Date
              </span>
              <span className="text-[10px] font-mono font-semibold theme-accent theme-bg-accent-soft px-1.5 py-0.5 rounded">
                {activeDateFormat}
              </span>
            </div>
            <div className="text-xl font-bold font-mono theme-text-primary tracking-tight mt-2">
              {formatSampleDate(activeDateFormat, todayDateStr)}
            </div>
            <div className="text-[11px] theme-text-secondary mt-1 truncate">
              ISO Date: <span className="font-mono">{todayDateStr}</span>
            </div>
          </div>

          {/* Hijri Lunar Preview or Standard Week */}
          <div className="p-4 theme-bg-sub rounded-xl border theme-border flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
                {enableHijri ? "Islamic Lunar Estimate" : "Academic Week Start"}
              </span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                  enableHijri
                    ? "theme-bg-accent-soft theme-accent"
                    : "theme-bg-elevated theme-text-secondary"
                }`}
              >
                {enableHijri ? "Hijri Active" : firstDay}
              </span>
            </div>
            <div className="text-lg font-bold theme-text-primary tracking-tight mt-2 truncate">
              {enableHijri ? liveHijriDate : `${firstDay} is Day 1`}
            </div>
            <div className="text-[11px] theme-text-secondary mt-1 truncate">
              {enableHijri
                ? "Calculated using Islamic lunar algorithm"
                : "MADRASA & Regional attendance standard"}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3. TIMEZONE SELECTION SECTION ─────────────────────────────────── */}
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b theme-border">
          <div className="flex items-center gap-2">
            <GlobeIcon className="w-4 h-4 theme-accent" />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
                Workspace Timezone
              </h3>
              <p className="text-xs font-medium theme-text-primary">
                Select your institution's primary regional operating timezone
              </p>
            </div>
          </div>

          {/* Auto-detect device timezone button */}
          {activeTimeZone !== systemTimezone && (
            <button
              type="button"
              onClick={() => handleTimezoneSelect(systemTimezone)}
              className="px-3 py-1.5 text-xs font-semibold theme-text-secondary hover:theme-text-primary theme-bg-sub hover:theme-bg-elevated rounded-xl transition flex items-center gap-1.5 shrink-0 cursor-pointer border theme-border self-start sm:self-auto"
            >
              <GlobeIcon className="w-3.5 h-3.5 theme-accent" />
              <span>Use Device Timezone ({systemTimezone})</span>
            </button>
          )}
        </div>

        {/* Search Bar for Timezones */}
        <div className="relative w-full">
          <SearchIcon className="w-4 h-4 theme-text-secondary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search timezone by city, country or offset (e.g. Dhaka, Riyadh, London, UTC+06)..."
            className="w-full pl-9 pr-9 py-2 text-xs theme-bg-sub border theme-border rounded-xl theme-text-primary placeholder:theme-text-secondary/60 focus:outline-none focus:border-[var(--accent-main)] transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary transition cursor-pointer"
            >
              <CloseIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Scrollable Timezone List */}
        <div
          className="flex flex-col space-y-1.5 max-h-72 overflow-y-auto pr-1"
          style={{ scrollbarGutter: "stable" }}
        >
          {filteredTimezones.length === 0 ? (
            <div className="text-center py-8 theme-text-secondary text-xs">
              No timezones matched "{searchQuery}"
            </div>
          ) : (
            filteredTimezones.map((tz) => {
              const isSelected = tz.id === activeTimeZone;
              const isSystemTz = tz.id === systemTimezone;
              return (
                <button
                  key={tz.id}
                  type="button"
                  onClick={() => handleTimezoneSelect(tz.id)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-left transition-all duration-150 cursor-pointer flex items-center justify-between gap-3 border ${
                    isSelected
                      ? "theme-bg-elevated border-[var(--accent-main)]/60 theme-text-primary font-bold shadow-sm"
                      : "theme-bg-sub border-transparent theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <GlobeIcon
                      className={`w-4 h-4 shrink-0 ${
                        isSelected ? "theme-accent" : "theme-text-secondary"
                      }`}
                    />
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-xs font-bold theme-text-primary truncate">
                        {tz.name}
                      </span>
                      {isSystemTz && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider theme-bg-accent-soft theme-accent shrink-0">
                          Detected Device
                        </span>
                      )}
                    </div>
                    {tz.city && (
                      <span className="text-[11px] theme-text-secondary truncate hidden sm:inline">
                        ({tz.city})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md theme-bg-app theme-accent font-semibold">
                      {tz.offset}
                    </span>
                    {isSelected && <CheckIcon className="w-4 h-4 theme-accent shrink-0" />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ─── 4. DATE FORMAT STANDARD ───────────────────────────────────────── */}
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b theme-border">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 theme-accent" />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
                Date Format Standard
              </h3>
              <p className="text-xs font-medium theme-text-primary">
                Determine how dates are rendered throughout tables, cards, exports, and forms
              </p>
            </div>
          </div>
          <span className="text-xs font-mono theme-accent theme-bg-accent-soft px-2.5 py-0.5 rounded-md font-bold">
            {activeDateFormat}
          </span>
        </div>

        {/* Date Formats Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {DATE_FORMAT_LIST.map((fmt) => {
            const isSelected = fmt.id === activeDateFormat;
            const liveSample = formatSampleDate(fmt.id, todayDateStr);
            return (
              <button
                key={fmt.id}
                type="button"
                onClick={() => handleDateFormatSelect(fmt.id)}
                className={`p-3.5 rounded-xl text-left transition-all duration-150 cursor-pointer flex flex-col justify-between gap-2 border ${
                  isSelected
                    ? "theme-bg-elevated border-[var(--accent-main)]/70 shadow-sm"
                    : "theme-bg-sub border-transparent hover:theme-bg-elevated"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-mono font-bold theme-text-primary">
                    {fmt.name}
                  </span>
                  {isSelected && <CheckIcon className="w-3.5 h-3.5 theme-accent shrink-0" />}
                </div>

                <div className="text-sm font-mono font-semibold theme-accent">
                  {liveSample}
                </div>

                <div className="text-[11px] theme-text-secondary truncate" title={fmt.label}>
                  {fmt.label}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── 5. ACADEMIC WEEK START & HIJRI ESTIMATE DUAL GRID ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* First Day of the Week */}
        <div className="w-full theme-bg-surface border theme-border rounded-2xl p-5 shadow-sm space-y-3.5">
          <div className="flex items-center gap-2 pb-2 border-b theme-border">
            <CalendarIcon className="w-4 h-4 theme-accent" />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
                First Day of Week
              </h3>
              <p className="text-xs font-medium theme-text-primary">
                Sets default start column in calendar views
              </p>
            </div>
          </div>

          <div className="flex flex-col space-y-2">
            {FIRST_DAY_LIST.map((item) => {
              const isSelected = item.id === firstDay;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleFirstDayChange(item.id)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-left transition-all cursor-pointer flex items-center justify-between border ${
                    isSelected
                      ? "theme-bg-elevated border-[var(--accent-main)]/60 font-bold"
                      : "theme-bg-sub border-transparent hover:theme-bg-elevated theme-text-secondary"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold theme-text-primary">{item.name}</div>
                    <div className="text-[10px] theme-text-secondary truncate">{item.label}</div>
                  </div>
                  {isSelected && <CheckIcon className="w-4 h-4 theme-accent shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Islamic Lunar (Hijri) Estimate Tracking */}
        <div className="w-full theme-bg-surface border theme-border rounded-2xl p-5 shadow-sm space-y-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-2 border-b theme-border">
              <CalendarIcon className="w-4 h-4 theme-accent" />
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
                  Hijri Calendar Estimate
                </h3>
                <p className="text-xs font-medium theme-text-primary">
                  Display Islamic lunar date alongside Gregorian dates
                </p>
              </div>
            </div>

            <div className="p-3.5 mt-3 theme-bg-sub rounded-xl flex items-center justify-between border theme-border">
              <div className="space-y-1 pr-3">
                <div className="text-xs font-bold theme-text-primary">Enable Hijri Tracking</div>
                <div className="text-[11px] theme-text-secondary">
                  Calculates estimated Islamic lunar date on calendar pickers, attendance headers, and reports.
                </div>
                {enableHijri && (
                  <div className="text-xs font-mono font-semibold theme-accent pt-1">
                    Today: {liveHijriDate}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleHijriToggle}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  enableHijri ? "theme-bg-accent" : "theme-bg-elevated"
                }`}
                aria-label="Toggle Hijri Calendar"
              >
                <div
                  className={`w-4 h-4 rounded-full theme-bg-surface transition-transform absolute top-1 ${
                    enableHijri ? "right-1" : "left-1"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="text-[11px] theme-text-secondary/80 bg-transparent pt-1">
            Note: Lunar dates are calculated using astronomical estimates and may vary by 1 day depending on regional moon sightings.
          </div>
        </div>
      </div>

      {/* ─── 6. DAILY CLASSROOM INDEPENDENT TIMEZONE INFORMATION CARD ──────── */}
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 theme-bg-accent-soft rounded-xl theme-accent shrink-0 mt-0.5">
            <InfoIcon className="w-5 h-5" />
          </div>
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xs font-bold theme-text-primary uppercase tracking-wider">
                Multi-Region Architecture Standard
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold theme-bg-accent-soft theme-accent uppercase tracking-wider">
                Daily Classroom Isolation
              </span>
            </div>
            <p className="text-xs theme-text-secondary leading-relaxed">
              This central <strong className="theme-text-primary">Date & Time</strong> setting dictates system attendance records, academic years, financial transactions, logs, and progress reports institution-wide.
            </p>
            <p className="text-xs theme-text-secondary leading-relaxed">
              For instructors conducting remote classes with students in overseas timezones (e.g. United Kingdom, North America, Saudi Arabia), <strong className="theme-text-primary">Daily Classroom</strong> maintains an independent classroom timezone setting to prevent cross-border schedule confusion without altering campus operations.
            </p>
            <div className="pt-1">
              <Link
                to="/admin-tools?tab=classroom-config"
                className="inline-flex items-center gap-1.5 text-xs font-semibold theme-accent hover:underline cursor-pointer"
              >
                <span>Configure Daily Classroom Timezone</span>
                <span>&rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 7. RESET DEFAULTS FOOTER ───────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2">
        <span className="text-xs theme-text-secondary">
          Settings are saved automatically to your local profile.
        </span>
        <button
          type="button"
          onClick={handleResetDefaults}
          className="px-3.5 py-1.5 text-xs font-semibold theme-text-secondary hover:theme-text-primary theme-bg-sub hover:theme-bg-elevated rounded-xl transition flex items-center gap-1.5 cursor-pointer border theme-border"
        >
          <RefreshIcon className="w-3.5 h-3.5" />
          <span>Reset All to System Defaults</span>
        </button>
      </div>
    </div>
  );
}
