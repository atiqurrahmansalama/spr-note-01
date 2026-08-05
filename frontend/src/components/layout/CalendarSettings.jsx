import { useState, useEffect } from "react";
import { 
  CalendarIcon, 
  ClockIcon, 
  GlobeIcon, 
  CheckIcon, 
  RefreshIcon 
} from "../ui/Icons";
import { 
  TIMEZONE_LIST, 
  DATE_FORMAT_LIST, 
  FIRST_DAY_LIST 
} from "../../constants/calendarConstants";
import { calendarSettings as calStore } from "../../utils/localStore";

export default function CalendarSettings({ 
  timeZone, 
  setTimeZone, 
  dateFormat, 
  setDateFormat 
}) {
  const [firstDay, setFirstDay] = useState(() => calStore.getFirstDay());
  const [enableHijri, setEnableHijri] = useState(() => calStore.getHijriEnabled());

  const [currentTime, setCurrentTime] = useState(new Date());

  // Live ticking clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleFirstDayChange = (dayId) => {
    setFirstDay(dayId);
    calStore.saveFirstDay(dayId);
  };

  const handleHijriToggle = () => {
    const val = !enableHijri;
    setEnableHijri(val);
    calStore.saveHijriEnabled(val);
  };

  const handleResetDefaults = () => {
    setTimeZone("Asia/Dhaka");
    setDateFormat("DD/MM/YYYY");
    setFirstDay("Saturday");
    setEnableHijri(false);
    calStore.saveTimezone("Asia/Dhaka");
    calStore.saveDateFormat("DD/MM/YYYY");
    calStore.saveFirstDay("Saturday");
    calStore.saveHijriEnabled(false);
  };

  const getFormattedSampleDate = (fmt) => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthName = monthNames[d.getMonth()];

    switch (fmt) {
      case "MM/DD/YYYY": return `${month}/${day}/${year}`;
      case "YYYY-MM-DD": return `${year}-${month}-${day}`;
      case "DD MMM YYYY": return `${day} ${monthName} ${year}`;
      case "DD/MM/YYYY":
      default: return `${day}/${month}/${year}`;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-start py-4 px-3 sm:px-6 space-y-6 animate-fade-in theme-text-primary">
      
      {/* 1. Header Card */}
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 theme-bg-accent-soft rounded-xl theme-accent shrink-0">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold theme-text-primary tracking-tight">Date, Time & Calendar Settings</h2>
            <p className="text-[11px] theme-text-secondary mt-0.5">
              Configure timezone offsets, date formats, calendar standards, and live clock previews.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleResetDefaults}
          className="px-3.5 py-1.5 text-xs font-semibold theme-text-secondary hover:theme-text-primary theme-bg-sub hover:theme-bg-elevated rounded-xl transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
        >
          <RefreshIcon className="w-3.5 h-3.5 theme-text-secondary" />
          <span>Reset Defaults</span>
        </button>
      </div>

      {/* 2. Timezone Selection List */}
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2">
            <GlobeIcon className="w-4 h-4 theme-accent" />
            <div>
              <h3 className="text-xs font-bold theme-text-primary">Timezone Offset</h3>
              <p className="text-[10px] theme-text-secondary">Select primary regional timezone</p>
            </div>
          </div>
          <span className="text-[11px] font-mono theme-accent theme-bg-accent-soft px-2.5 py-0.5 rounded-md font-semibold">
            {timeZone}
          </span>
        </div>

        {/* Vertical list without inner borders */}
        <div className="flex flex-col space-y-1.5 max-h-72 overflow-y-auto pr-1" style={{ scrollbarGutter: "stable" }}>
          {TIMEZONE_LIST.map((tz) => {
            const isSelected = tz.id === timeZone;
            return (
              <button
                key={tz.id}
                type="button"
                onClick={() => setTimeZone(tz.id)}
                className={`w-full px-3.5 py-2.5 rounded-xl text-left transition-all duration-150 cursor-pointer flex items-center justify-between gap-3 border ${
                  isSelected
                    ? "theme-bg-elevated border-[var(--accent-main)]/60 theme-text-primary font-bold shadow-sm"
                    : "theme-bg-sub border-transparent theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <GlobeIcon className={`w-4 h-4 shrink-0 ${isSelected ? "theme-accent" : "theme-text-secondary"}`} />
                  <span className="text-xs font-bold theme-text-primary truncate">{tz.name}</span>
                  <span className="text-[11px] theme-text-secondary truncate hidden sm:inline">({tz.city})</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md theme-bg-app theme-accent font-semibold">
                    {tz.offset}
                  </span>
                  {isSelected && <CheckIcon className="w-4 h-4 theme-accent shrink-0" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Date Format Display List */}
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 theme-accent" />
            <div>
              <h3 className="text-xs font-bold theme-text-primary">Date Format Standard</h3>
              <p className="text-[10px] theme-text-secondary">Choose default date format pattern</p>
            </div>
          </div>
          <span className="text-[11px] font-mono theme-accent theme-bg-accent-soft px-2.5 py-0.5 rounded-md font-semibold">
            {dateFormat}
          </span>
        </div>

        {/* Vertical list without inner borders */}
        <div className="flex flex-col space-y-1.5">
          {DATE_FORMAT_LIST.map((fmt) => {
            const isSelected = fmt.id === dateFormat;
            return (
              <button
                key={fmt.id}
                type="button"
                onClick={() => setDateFormat(fmt.id)}
                className={`w-full px-3.5 py-2.5 rounded-xl text-left transition-all duration-150 cursor-pointer flex items-center justify-between gap-3 border ${
                  isSelected
                    ? "theme-bg-elevated border-[var(--accent-main)]/60 theme-text-primary font-bold shadow-sm"
                    : "theme-bg-sub border-transparent theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <CalendarIcon className={`w-4 h-4 shrink-0 ${isSelected ? "theme-accent" : "theme-text-secondary"}`} />
                  <span className="text-xs font-bold theme-text-primary">{fmt.name}</span>
                  <span className="text-xs font-mono theme-accent font-bold">({fmt.sample})</span>
                  <span className="text-[11px] theme-text-secondary truncate hidden md:inline">- {fmt.label}</span>
                </div>

                {isSelected && <CheckIcon className="w-4 h-4 theme-accent shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Hijri Mode Option Card */}
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-5 shadow-xl space-y-3">
        <div>
          <div className="pb-1">
            <h3 className="text-xs font-bold theme-text-primary">Hijri Calendar Estimate</h3>
            <p className="text-[10px] theme-text-secondary">Display Islamic lunar date on headers</p>
          </div>

          <div className="p-3.5 mt-3 theme-bg-sub rounded-xl flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-bold theme-text-primary">Enable Hijri Tracking</div>
              <div className="text-[10px] theme-text-secondary">Shows estimated Islamic date</div>
            </div>

            <button
              type="button"
              onClick={handleHijriToggle}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                enableHijri ? "theme-bg-accent" : "theme-bg-elevated"
              }`}
            >
              <div className={`w-4 h-4 rounded-full theme-bg-surface transition-transform absolute top-1 ${
                enableHijri ? "right-1" : "left-1"
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Live Date & Clock Preview Card */}
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2">
            <ClockIcon className="w-4 h-4 theme-accent" />
            <h3 className="text-xs font-bold theme-text-primary">Live Date & Clock Preview</h3>
          </div>
          <span className="text-[10px] font-mono theme-text-secondary">
            Timezone: <span className="theme-accent font-bold">{timeZone}</span>
          </span>
        </div>

        <div className="theme-bg-sub p-4 rounded-xl flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-[10px] font-mono uppercase tracking-wider theme-text-secondary">Formatted Date</div>
            <div className="text-sm font-bold theme-text-primary font-mono">
              {getFormattedSampleDate(dateFormat)}
            </div>
          </div>

          <div className="space-y-0.5 text-right">
            <div className="text-[10px] font-mono uppercase tracking-wider theme-text-secondary">Live Digital Time</div>
            <div className="text-base font-bold theme-accent font-mono">
              {currentTime.toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}