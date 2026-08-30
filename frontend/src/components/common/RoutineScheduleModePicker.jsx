import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TimerIcon } from '../ui/Icons';
import { weeklyHolidaysStore } from '../../utils/stores/calendarStore';
import { useToast } from '../../context/ToastContext';
import { useTenant } from '../../context/TenantContext';

/**
 * RoutineScheduleModePicker
 * =========================
 * Reusable enterprise component for configuring Routine Schedule Mode (Full Week vs Split Days).
 * Dynamically synchronized with the Institution Event Calendar and Weekly Holidays settings.
 *
 * @param {string} scheduleType - 'FULL_WEEK' | 'SPLIT_DAYS'
 * @param {Array<string>} scheduleDays - Array of day codes (e.g. ['SAT', 'SUN', 'MON'])
 * @param {Function} onChange - Callback returning ({ scheduleType, scheduleDays })
 * @param {string} tenantId - Active tenant ID (optional)
 * @param {boolean} disabled - Whether the control is disabled
 * @param {string} label - Custom header label
 */
export default function RoutineScheduleModePicker({
  scheduleType = 'FULL_WEEK',
  scheduleDays = [],
  onChange,
  tenantId,
  disabled = false,
  label = 'Routine Schedule Mode',
  conflicts = [],
}) {
  const { showToast } = useToast();
  const { activeTenant } = useTenant();
  const effectiveTenantId = tenantId || activeTenant?.id || 'default';

  // Version state to trigger re-renders when calendar/holiday settings are updated
  const [settingsVersion, setSettingsVersion] = useState(0);

  useEffect(() => {
    const handleSettingsUpdated = () => {
      setSettingsVersion((v) => v + 1);
    };

    window.addEventListener('spr_weekly_holidays_updated', handleSettingsUpdated);
    window.addEventListener('spr_settings_updated', handleSettingsUpdated);

    return () => {
      window.removeEventListener('spr_weekly_holidays_updated', handleSettingsUpdated);
      window.removeEventListener('spr_settings_updated', handleSettingsUpdated);
    };
  }, []);

  // Ordered 7 weekdays starting from the institution's configured First Day of the Week
  const orderedWeekdays = useMemo(() => {
    return weeklyHolidaysStore.getOrderedWeekdays(effectiveTenantId);
  }, [effectiveTenantId, settingsVersion]);

  // Short codes for all working days (e.g. ['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU'])
  const workingDayCodes = useMemo(() => {
    return weeklyHolidaysStore.getWorkingDayCodes(effectiveTenantId, true);
  }, [effectiveTenantId, settingsVersion]);

  // Normalized active schedule days (always strictly excluding institutional holidays)
  const activeDayCodes = useMemo(() => {
    if (scheduleType === 'FULL_WEEK') {
      return workingDayCodes;
    }
    if (Array.isArray(scheduleDays) && scheduleDays.length > 0) {
      const valid = scheduleDays
        .map((d) => weeklyHolidaysStore.normalizeDayCode(d))
        .filter((code) => !weeklyHolidaysStore.isWeekendDay(effectiveTenantId, code));
      return valid.length > 0 ? valid : workingDayCodes.slice(0, Math.min(3, workingDayCodes.length));
    }
    return workingDayCodes.slice(0, Math.min(3, workingDayCodes.length));
  }, [scheduleType, scheduleDays, workingDayCodes, effectiveTenantId]);

  const isDaySelected = useCallback(
    (dayItem) => {
      const shortCode = dayItem.short.toUpperCase();
      const fullCode = dayItem.code.toUpperCase();
      return activeDayCodes.some(
        (code) => code === shortCode || code === fullCode || fullCode.startsWith(code)
      );
    },
    [activeDayCodes]
  );

  const handleSelectFullWeek = () => {
    if (disabled) return;
    if (onChange) {
      onChange({
        scheduleType: 'FULL_WEEK',
        scheduleDays: workingDayCodes,
      });
    }
  };

  const handleSelectSplitDays = () => {
    if (disabled) return;
    // Default split days: preserve existing if valid and not full, otherwise choose first half of working days
    let nextDays = activeDayCodes;
    if (!nextDays || nextDays.length === 0 || nextDays.length >= workingDayCodes.length) {
      const defaultSplitCount = Math.max(1, Math.floor(workingDayCodes.length / 2));
      nextDays = workingDayCodes.slice(0, defaultSplitCount);
    }
    if (onChange) {
      onChange({
        scheduleType: 'SPLIT_DAYS',
        scheduleDays: nextDays,
      });
    }
  };

  const handleToggleDay = (dayItem) => {
    if (disabled) return;
    if (weeklyHolidaysStore.isWeekendDay(effectiveTenantId, dayItem.code)) {
      showToast(`${dayItem.label} is an institutional holiday and cannot be scheduled.`, 'info');
      return;
    }

    const shortCode = dayItem.short.toUpperCase();
    const isCurrentlySelected = isDaySelected(dayItem);

    let updatedDays = [];
    if (isCurrentlySelected) {
      updatedDays = activeDayCodes.filter(
        (code) => code !== shortCode && !dayItem.code.startsWith(code)
      );
      if (updatedDays.length === 0) {
        showToast('At least one routine day must remain active.', 'warning');
        return;
      }
    } else {
      updatedDays = [...activeDayCodes, shortCode];
    }

    if (onChange) {
      onChange({
        scheduleType: 'SPLIT_DAYS',
        scheduleDays: updatedDays,
      });
    }
  };

  const isSplitMode = scheduleType === 'SPLIT_DAYS';

  return (
    <div className="@container p-3.5 rounded-2xl theme-bg-sub/40 border theme-border space-y-3">
      {/* Header & Mode Switcher */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="text-xs font-bold uppercase tracking-wider theme-text-secondary flex items-center gap-1.5">
          <TimerIcon className="w-3.5 h-3.5 theme-accent" />
          <span>{label}</span>
        </label>

        {/* Schedule Mode Switcher Toggle */}
        <div className="flex items-center p-1 rounded-xl theme-bg-surface border theme-border shadow-2xs">
          <button
            type="button"
            disabled={disabled}
            onClick={handleSelectFullWeek}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              !isSplitMode
                ? 'theme-bg-accent text-white shadow-xs'
                : 'theme-text-secondary hover:theme-text-primary'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Full Week
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={handleSelectSplitDays}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
              isSplitMode
                ? 'theme-bg-accent text-white shadow-xs'
                : 'theme-text-secondary hover:theme-text-primary'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span>Split Days</span>
          </button>
        </div>
      </div>

      {/* Split Days Interactive Weekdays Selector */}
      {isSplitMode && (
        <div className="pt-2 border-t theme-border space-y-2.5 animate-fade-in">
          <div className="flex items-center justify-between text-[11px] theme-text-secondary">
            <span>Select which weekdays this book is taught during this period:</span>
            <span className="font-mono font-bold theme-text-primary">
              {activeDayCodes.length} of {workingDayCodes.length} Working Days Active
            </span>
          </div>

          <div className="grid grid-cols-4 @[420px]:grid-cols-7 gap-1.5">
            {orderedWeekdays.map((day) => {
              const isHoliday = weeklyHolidaysStore.isWeekendDay(effectiveTenantId, day.code);
              const selected = !isHoliday && isDaySelected(day);
              const isBtnDisabled = disabled || isHoliday;

              return (
                <button
                  key={day.code}
                  type="button"
                  disabled={isBtnDisabled}
                  onClick={() => handleToggleDay(day)}
                  className={`p-2 rounded-xl text-center border transition-all flex flex-col items-center justify-center gap-1 shadow-2xs ${
                    isHoliday
                      ? 'theme-bg-sub/20 border-dashed theme-border theme-text-secondary/40 opacity-50 cursor-not-allowed select-none'
                      : selected
                      ? 'theme-bg-accent-soft theme-accent font-bold border-[var(--accent-main)]/50 ring-1 ring-[var(--accent-main)]/20 shadow-xs cursor-pointer'
                      : 'theme-bg-surface theme-text-secondary border theme-border hover:theme-border-strong hover:theme-text-primary cursor-pointer'
                  }`}
                  title={
                    isHoliday
                      ? `${day.label} (Weekly Holiday — No classes can be scheduled)`
                      : `${day.label} (Academic Working Day)`
                  }
                >
                  <span className={`text-xs font-bold ${isHoliday ? 'line-through opacity-75' : ''}`}>
                    {day.short}
                  </span>
                  <span
                    className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded ${
                      isHoliday
                        ? 'theme-bg-sub/60 theme-text-secondary/70 border theme-border'
                        : selected
                        ? 'theme-bg-accent text-white shadow-2xs'
                        : 'theme-bg-sub theme-text-secondary border theme-border'
                    }`}
                  >
                    {isHoliday ? 'Holiday' : 'Class'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Schedule Overlap / Conflict Notices */}
      {Array.isArray(conflicts) && conflicts.length > 0 && (
        <div className="pt-2 border-t theme-border space-y-1.5 animate-fade-in">
          {conflicts.map((conflict) => {
            const scopeLabel = conflict.sectionName
              ? `${conflict.className || 'Class'} (${conflict.sectionName})`
              : (conflict.className || 'Class');

            return (
              <div
                key={conflict.id}
                className="flex items-start gap-2 text-[11px] @[480px]:text-xs font-normal theme-text-secondary theme-bg-surface/80 border theme-border px-3 py-2 rounded-xl leading-relaxed shadow-2xs"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                <span>
                  Period conflict: <strong className="font-semibold text-amber-500">"{conflict.bookName}"</strong> is already assigned in <strong className="font-semibold theme-text-primary">{scopeLabel}</strong> on <strong className="font-semibold text-amber-500">{conflict.conflictingDaysLabel}</strong> during this period.
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
