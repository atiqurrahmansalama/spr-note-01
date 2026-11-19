import React, { useState, useEffect } from 'react';
import {
  ClockIcon,
  GlobeIcon,
  SparklesIcon,
} from '@/components/ui/Icons';
import CustomSelect from '@/components/ui/CustomSelect';
import { getEnrichedTimezoneList, getSystemTimezone } from '@/constants/calendarConstants';
import { classroomSettings as copyStore, calendarSettings } from '@/stores';
import { useToast } from '@/context/ToastContext';

/**
 * Enterprise Section Configuration Item for Developer Tools / Institution Settings
 */
export const classroomTimezoneSectionConfig = {
  id: 'classroom-date-timezone',
  group: 'Classroom Configuration',
  title: 'Classroom Date Timezone',
  description: 'Configure date timezone indicator badges and classroom-specific timezone offsets across daily classroom workflows',
  icon: ClockIcon,
};

/**
 * Enterprise View: Classroom Date Timezone Configuration
 * Manages timezone indicators and specific classroom timezone offsets.
 */
export const ClassroomTimezoneConfigView: React.FC = () => {
  const { showToast } = useToast();
  const [timezoneEnabled, setTimezoneEnabled] = useState<boolean>(() => copyStore.getTimezoneEnabled());
  const [timezoneId, setTimezoneId] = useState<string>(() =>
    copyStore.getTimezone ? copyStore.getTimezone() : 'APP_DEFAULT'
  );

  const [appTimezone, setAppTimezone] = useState<string>(() =>
    calendarSettings.getTimezone ? calendarSettings.getTimezone() : getSystemTimezone()
  );

  const timezoneList = getEnrichedTimezoneList();

  useEffect(() => {
    const handleCalendarUpdate = (e: any) => {
      if (e?.detail?.timezone) {
        setAppTimezone(e.detail.timezone);
      } else if (calendarSettings.getTimezone) {
        setAppTimezone(calendarSettings.getTimezone());
      }
    };

    window.addEventListener('spr_calendar_settings_updated', handleCalendarUpdate);
    window.addEventListener('spr_date_time_updated', handleCalendarUpdate);
    return () => {
      window.removeEventListener('spr_calendar_settings_updated', handleCalendarUpdate);
      window.removeEventListener('spr_date_time_updated', handleCalendarUpdate);
    };
  }, []);

  const appTimezoneEntry = timezoneList.find((t: any) => t.id === appTimezone);
  const appTzLabel = appTimezoneEntry
    ? `${appTimezoneEntry.offset} ${appTimezoneEntry.city}`
    : appTimezone;

  const timezoneOptions = [
    { label: `App's Default (${appTzLabel})`, value: 'APP_DEFAULT' },
    ...timezoneList.map((tz: any) => ({
      label: `${tz.offset} ${tz.city}`,
      value: tz.id,
    })),
  ];

  const resolvedTimezone = timezoneId === 'APP_DEFAULT' ? appTimezone : timezoneId;
  const resolvedTzEntry = timezoneList.find((t: any) => t.id === resolvedTimezone);
  const resolvedTzOffset = resolvedTzEntry ? resolvedTzEntry.offset : 'UTC+06:00';

  const toggleTimezone = () => {
    const val = !timezoneEnabled;
    setTimezoneEnabled(val);
    copyStore.saveTimezoneEnabled(val);
    window.dispatchEvent(
      new CustomEvent('spr_classroom_settings_updated', {
        detail: { timezoneEnabled: val, timezone: timezoneId },
      })
    );
    showToast(
      val ? 'Classroom date timezone enabled' : 'Classroom date timezone disabled',
      'info'
    );
  };

  const handleTimezoneChange = (val: any) => {
    const targetId = typeof val === 'object' ? val.value : val;
    if (targetId) {
      setTimezoneId(targetId);
      copyStore.saveTimezone(targetId);
      window.dispatchEvent(
        new CustomEvent('spr_classroom_settings_updated', {
          detail: { timezone: targetId, timezoneEnabled: true },
        })
      );
      showToast('Classroom timezone updated', 'info');
    }
  };

  return (
    <div className="w-full space-y-4 animate-fade-in text-left @container">
      {/* ─── Header Card ─── */}
      <div className="p-4 sm:p-5 rounded-2xl border-0 theme-bg-surface shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 min-w-0">
        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
          <div className="p-2.5 rounded-xl theme-bg-accent-soft theme-accent shrink-0 mt-0.5 sm:mt-0">
            <ClockIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold theme-text-primary tracking-tight">
                Classroom Date Timezone
              </h2>
            </div>
            <p className="text-xs theme-text-secondary mt-1 max-w-2xl leading-relaxed">
              Configure date timezone indicator badges and classroom-specific timezone offsets across daily classroom workflows.
            </p>
          </div>
        </div>
      </div>

      {/* ─── Main Control Card ─── */}
      <div className="p-5 rounded-2xl theme-bg-surface border-0 shadow-xs space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-sm font-bold theme-text-primary flex items-center gap-2">
              <ClockIcon className="w-4 h-4 theme-accent" />
              <span>Classroom Date Timezone Indicator</span>
            </div>
            <p className="text-xs theme-text-secondary leading-relaxed max-w-xl">
              Display classroom timezone badge (e.g. {resolvedTzOffset}) alongside dates on progress logs, assessments, and date pickers.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={timezoneEnabled}
            onClick={toggleTimezone}
            className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer shrink-0 border-0 ${
              timezoneEnabled ? 'theme-bg-accent' : 'theme-bg-elevated'
            }`}
          >
            <div
              className={`w-4.5 h-4.5 rounded-full theme-bg-surface shadow-xs transition-transform absolute top-1 ${
                timezoneEnabled ? 'right-1' : 'left-1'
              }`}
            />
          </button>
        </div>

        {/* Timezone Selector Dropdown */}
        {timezoneEnabled && (
          <div className="pt-4 border-t theme-border flex flex-col @[520px]:flex-row @[520px]:items-center justify-between gap-3 animate-fade-in">
            <div className="space-y-1">
              <div className="text-xs font-bold theme-text-primary flex items-center gap-2">
                <GlobeIcon className="w-4 h-4 theme-accent" />
                <span>Classroom Specific Timezone</span>
              </div>
              <p className="text-[11px] theme-text-secondary leading-relaxed">
                Override global app timezone or inherit directly from App Default ({appTzLabel}).
              </p>
            </div>
            <div className="w-full @[520px]:w-80 shrink-0">
              <CustomSelect
                options={timezoneOptions}
                value={timezoneId}
                onChange={handleTimezoneChange}
                searchable={true}
                placeholder="Select classroom timezone..."
              />
            </div>
          </div>
        )}

        {/* ─── Live Dynamic Preview ─── */}
        <div className="pt-4 border-t theme-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold theme-text-secondary flex items-center gap-1.5">
              <SparklesIcon className="w-3.5 h-3.5 theme-accent" />
              <span>Live Timezone Badge Preview</span>
            </div>
          </div>

          <div className="p-4 rounded-xl theme-bg-app border-0 font-mono text-xs space-y-2 theme-text-secondary select-text">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold theme-text-primary">Header Date Display:</span>
              <span className="theme-text-primary font-semibold">18 Nov 2026</span>
            </div>
            <div className="text-[11px] opacity-75">
              Configured Timezone: {resolvedTzEntry ? `${resolvedTzEntry.offset} ${resolvedTzEntry.city}` : resolvedTimezone}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassroomTimezoneConfigView;
