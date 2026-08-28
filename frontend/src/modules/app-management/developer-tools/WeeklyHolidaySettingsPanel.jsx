import React, { useState, useEffect, useMemo } from "react";
import { useToast } from "../../../context/ToastContext";
import { useTenant } from "../../../context/TenantContext";
import {
  weeklyHolidaysStore,
  WEEKDAY_OPTIONS,
  DEFAULT_WEEKLY_HOLIDAYS_CONFIG,
} from "../../../utils/stores/calendarStore";
import {
  CalendarIcon,
  RefreshIcon,
  SaveIcon,
  ClockIcon,
  ShieldCheckIcon,
} from "../../../components/ui/Icons";
import CustomCheckbox from "../../../components/ui/CustomCheckbox";

/**
 * Enterprise Weekly Institutional Holiday & Weekend Configuration Panel
 * Standalone section in Admin / Developer Tools.
 */
export default function WeeklyHolidaySettingsPanel({ activeTenantId }) {
  const { showToast } = useToast();
  const { activeTenant } = useTenant();
  const effectiveTenantId = activeTenantId || activeTenant?.id || "default";

  const [savedConfig, setSavedConfig] = useState(() =>
    weeklyHolidaysStore.getHolidays(effectiveTenantId)
  );
  const [config, setConfig] = useState(() =>
    weeklyHolidaysStore.getHolidays(effectiveTenantId)
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const handleUpdated = (e) => {
      const next = e.detail || weeklyHolidaysStore.getHolidays(effectiveTenantId);
      setSavedConfig(next);
      setConfig(next);
    };

    window.addEventListener("spr_weekly_holidays_updated", handleUpdated);
    return () => {
      window.removeEventListener("spr_weekly_holidays_updated", handleUpdated);
    };
  }, [effectiveTenantId]);

  const hasChanges = useMemo(() => {
    return JSON.stringify(config) !== JSON.stringify(savedConfig);
  }, [config, savedConfig]);

  // Toggle Day
  const handleToggleDay = (dayCode) => {
    setConfig((prev) => {
      const exists = prev.weekendDays.includes(dayCode);
      if (exists && prev.weekendDays.length === 1) {
        showToast("At least one weekly holiday / weekend day must remain selected.", "warning");
        return prev;
      }
      const nextDays = exists
        ? prev.weekendDays.filter((d) => d !== dayCode)
        : [...prev.weekendDays, dayCode];
      return {
        ...prev,
        weekendDays: nextDays,
      };
    });
  };

  // Save Config
  const handleSave = () => {
    if (!config.weekendDays || config.weekendDays.length === 0) {
      showToast("Please select at least one weekly holiday day.", "warning");
      return;
    }
    setIsSaving(true);
    try {
      weeklyHolidaysStore.saveHolidays(effectiveTenantId, config);
      setSavedConfig(config);
      if (config.affectsAttendance) {
        showToast("Weekly holiday settings saved & synchronized to Event Calendar as a recurring weekly event.", "success");
      } else {
        showToast("Weekly institutional holiday settings saved successfully.", "success");
      }
    } catch {
      showToast("Failed to save weekly holiday settings.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to Default (Friday)
  const handleReset = () => {
    setConfig(DEFAULT_WEEKLY_HOLIDAYS_CONFIG);
  };

  // Active Working Days calculation
  const workingDays = useMemo(() => {
    return WEEKDAY_OPTIONS.filter((w) => !config.weekendDays.includes(w.code));
  }, [config.weekendDays]);

  return (
    <div className="w-full space-y-6 animate-fade-in text-left">
      {/* ─── Top Header Card ────────────────────────────────────────── */}
      <div className="p-4 sm:p-5 rounded-2xl border theme-border theme-bg-surface shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 min-w-0">
        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
          <div className="p-2.5 rounded-xl theme-bg-accent-soft theme-accent shrink-0 mt-0.5 sm:mt-0 shadow-inner">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold theme-text-primary tracking-tight">
                Weekly Institutional Holiday &amp; Weekend Schedule
              </h2>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20">
                {config.weekendDays.length === 1
                  ? "1 Day Weekend"
                  : `${config.weekendDays.length} Days Weekend`}
              </span>
            </div>
            <p className="text-xs theme-text-secondary mt-1 max-w-2xl leading-relaxed">
              Configure official weekly institutional holiday(s), non-academic recess days, class routine rules, and attendance auto-excuse policies.
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
          {hasChanges && (
            <button
              type="button"
              onClick={() => setConfig(savedConfig)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold theme-bg-sub border theme-border theme-text-secondary hover:theme-text-primary transition cursor-pointer flex items-center gap-1.5"
            >
              <RefreshIcon className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 shadow-xs ${
              hasChanges
                ? "theme-bg-accent text-white hover:opacity-90"
                : "opacity-50 cursor-not-allowed theme-bg-sub theme-text-secondary border theme-border"
            }`}
          >
            <SaveIcon className="w-3.5 h-3.5" />
            <span>{isSaving ? "Saving..." : "Save Settings"}</span>
          </button>
        </div>
      </div>

      {/* ─── Card 1: Day Selection ─────────────────── */}
      <div className="p-5 sm:p-6 rounded-2xl border theme-border theme-bg-surface shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b theme-border">
          <div>
            <h3 className="text-sm sm:text-base font-bold theme-text-primary flex items-center gap-2">
              <ClockIcon className="w-4 h-4 theme-accent" />
              <span>Weekly Holiday Day(s) Selection</span>
            </h3>
            <p className="text-xs theme-text-secondary mt-0.5">
              Click individual day badges to toggle weekly holiday days and active academic working days for your institution.
            </p>
          </div>
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg theme-bg-sub border theme-border theme-text-secondary self-start sm:self-auto">
            {config.weekendDays.length} of 7 Days Holiday
          </span>
        </div>

        {/* 7 Day Interactive Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
          {WEEKDAY_OPTIONS.map((wDay) => {
            const isHoliday = config.weekendDays.includes(wDay.code);

            return (
              <button
                key={wDay.code}
                type="button"
                onClick={() => handleToggleDay(wDay.code)}
                className={`p-3.5 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1.5 shadow-2xs ${
                  isHoliday
                    ? "theme-bg-accent-soft theme-accent border-[var(--accent-main)] ring-1 ring-[var(--accent-main)]/20"
                    : "theme-bg-sub/50 border theme-border theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated"
                }`}
              >
                <span className="text-sm font-bold">{wDay.label}</span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    isHoliday
                      ? "theme-bg-accent text-white"
                      : "theme-bg-surface theme-text-secondary border theme-border"
                  }`}
                >
                  {isHoliday ? "Holiday" : "Academic Day"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Card 2: Impact Policies & Summary ────────────────────────── */}
      <div className="p-5 sm:p-6 rounded-2xl border theme-border theme-bg-surface shadow-xs space-y-5">
        <div className="pb-4 border-b theme-border">
          <h3 className="text-sm sm:text-base font-bold theme-text-primary flex items-center gap-2">
            <ShieldCheckIcon className="w-4 h-4 theme-accent" />
            <span>Institutional Rules &amp; Breakdown</span>
          </h3>
          <p className="text-xs theme-text-secondary mt-0.5">
            Configure how weekly holidays automatically influence class routine timetables and daily student/staff attendance.
          </p>
        </div>

        {/* Policy Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl theme-bg-sub/40 border theme-border space-y-2">
            <CustomCheckbox
              label="Affects Class Timetables & Daily Routines"
              checked={Boolean(config.affectsTimetable)}
              onChange={(checked) =>
                setConfig((prev) => ({ ...prev, affectsTimetable: checked }))
              }
            />
            <p className="text-xs theme-text-secondary pl-6">
              Period schedule views and class routine displays automatically mark these days with a weekly holiday recess indicator.
            </p>
          </div>

          <div className="p-4 rounded-2xl theme-bg-sub/40 border theme-border space-y-2">
            <CustomCheckbox
              label="Auto-Excuse in Class & Staff Attendance (Event Calendar Sync)"
              checked={Boolean(config.affectsAttendance)}
              onChange={(checked) =>
                setConfig((prev) => ({ ...prev, affectsAttendance: checked }))
              }
            />
            <p className="text-xs theme-text-secondary pl-6">
              Automatically creates and synchronizes a recurring weekly holiday event in the Event Calendar on the selected day(s), ensuring attendance registers treat these days as institutional recess.
            </p>
          </div>
        </div>

        {/* Live Breakdown Banner */}
        <div className="p-4 rounded-2xl theme-bg-sub/60 border theme-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
              Active Academic Week Summary
            </div>
            <div className="text-xs theme-text-primary leading-relaxed">
              <strong>Weekly Holiday:</strong>{" "}
              <span className="font-bold theme-accent">
                {config.weekendDays
                  .map((code) => WEEKDAY_OPTIONS.find((w) => w.code === code)?.label || code)
                  .join(", ")}
              </span>{" "}
              • <strong>Working Academic Days:</strong>{" "}
              <span>{workingDays.length} Days ({workingDays.map((w) => w.short).join(", ")})</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold theme-bg-surface border theme-border theme-text-secondary hover:theme-text-primary transition cursor-pointer self-start sm:self-auto shrink-0"
          >
            Reset to Friday Default
          </button>
        </div>
      </div>
    </div>
  );
}
