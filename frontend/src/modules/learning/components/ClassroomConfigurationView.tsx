import React, { useState, useEffect } from 'react';
import {
  GroupsIcon,
  TeacherIcon,
  CalendarIcon,
  ClockIcon,
  GlobeIcon,
  SettingsIcon,
} from '@/components/ui/Icons';
import CustomSelect from '@/components/ui/CustomSelect';
import { DATE_FORMAT_LIST, getEnrichedTimezoneList, getSystemTimezone } from '@/constants/calendarConstants';
import { classroomSettings as copyStore, calendarSettings } from '@/stores';
import { useToast } from '@/context/ToastContext';

/**
 * Enterprise Classroom Configuration View
 * Configures classroom timezone display & specific timezone offset, default report copy formats, evaluator teacher attribution tags, student group suffix, and date standards.
 */
export const classroomConfigSectionConfig = {
  id: 'classroom-config',
  group: 'Classroom Configuration',
  title: 'Classroom Configuration',
  icon: SettingsIcon,
};

export default function ClassroomConfigurationView() {
  const { showToast } = useToast();
  const [timezoneEnabled, setTimezoneEnabled] = useState(() => copyStore.getTimezoneEnabled());
  const [timezoneId, setTimezoneId] = useState(() => (copyStore.getTimezone ? copyStore.getTimezone() : 'APP_DEFAULT'));
  const [includeGroup, setIncludeGroup] = useState(() => copyStore.getIncludeGroup());
  const [includeTeacher, setIncludeTeacher] = useState(() => copyStore.getIncludeTeacher());
  const [teacherName, setTeacherName] = useState(() => copyStore.getTeacherName());
  const [dateFormat, setDateFormat] = useState(() => copyStore.getDateFormat());

  const [appTimezone, setAppTimezone] = useState(() => (calendarSettings.getTimezone ? calendarSettings.getTimezone() : getSystemTimezone()));
  const [appDateFormat, setAppDateFormat] = useState(() => (calendarSettings.getDateFormat ? calendarSettings.getDateFormat() : 'DD/MM/YYYY'));

  const timezoneList = getEnrichedTimezoneList();

  useEffect(() => {
    const handleCalendarUpdate = (e: any) => {
      if (e?.detail?.timezone) {
        setAppTimezone(e.detail.timezone);
      } else if (calendarSettings.getTimezone) {
        setAppTimezone(calendarSettings.getTimezone());
      }
      if (e?.detail?.dateFormat) {
        setAppDateFormat(e.detail.dateFormat);
      } else if (calendarSettings.getDateFormat) {
        setAppDateFormat(calendarSettings.getDateFormat());
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
  const appTzLabel = appTimezoneEntry ? `${appTimezoneEntry.name} (${appTimezoneEntry.offset})` : appTimezone;

  const timezoneOptions = [
    { label: `App's Default (${appTzLabel})`, value: 'APP_DEFAULT' },
    ...timezoneList.map((tz: any) => ({
      label: `${tz.name} (${tz.offset}) — ${tz.city}${tz.isSystem ? ' (Local System)' : ''}`,
      value: tz.id,
    })),
  ];

  const appDateFormatEntry = DATE_FORMAT_LIST.find((f: any) => f.id === appDateFormat);
  const appDateLabel = appDateFormatEntry
    ? `${appDateFormatEntry.name} (${appDateFormatEntry.sample})`
    : appDateFormat;

  const dateFormatOptions = [
    { label: `App's Default (${appDateLabel})`, value: 'APP_DEFAULT' },
    ...DATE_FORMAT_LIST.map((fmt: any) => ({
      label: `${fmt.name} (${fmt.sample})`,
      value: fmt.id,
    })),
  ];

  const resolvedTimezone = timezoneId === 'APP_DEFAULT' ? appTimezone : timezoneId;
  const resolvedTzEntry = timezoneList.find((t: any) => t.id === resolvedTimezone);

  const handleTimezoneChange = (val: any) => {
    const targetId = typeof val === 'object' ? val.value : val;
    if (targetId) {
      setTimezoneId(targetId);
      copyStore.saveTimezone(targetId);
      window.dispatchEvent(new CustomEvent('spr_classroom_settings_updated', { detail: { timezone: targetId, timezoneEnabled: true } }));
    }
  };

  const handleDateFormatChange = (val: any) => {
    const targetId = typeof val === 'object' ? val.value : val;
    if (targetId) {
      setDateFormat(targetId);
      copyStore.saveDateFormat(targetId);
      window.dispatchEvent(new CustomEvent('spr_copy_settings_updated', { detail: { dateFormat: targetId } }));
    }
  };

  const handleTeacherNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTeacherName(val);
    copyStore.saveTeacherName(val);
    window.dispatchEvent(new CustomEvent('spr_copy_settings_updated', { detail: { teacherName: val } }));
  };

  const toggleTimezone = () => {
    const val = !timezoneEnabled;
    setTimezoneEnabled(val);
    copyStore.saveTimezoneEnabled(val);
    window.dispatchEvent(new CustomEvent('spr_classroom_settings_updated', { detail: { timezoneEnabled: val, timezone: timezoneId } }));
    showToast(val ? 'Classroom date timezone enabled' : 'Classroom date timezone disabled', 'info');
  };

  const toggleGroup = () => {
    const val = !includeGroup;
    setIncludeGroup(val);
    copyStore.saveIncludeGroup(val);
    window.dispatchEvent(new CustomEvent('spr_copy_settings_updated', { detail: { includeGroup: val } }));
  };

  const toggleTeacher = () => {
    const val = !includeTeacher;
    setIncludeTeacher(val);
    copyStore.saveIncludeTeacher(val);
    window.dispatchEvent(new CustomEvent('spr_copy_settings_updated', { detail: { includeTeacher: val } }));
  };

  return (
    <div className="w-full space-y-4 animate-fade-in text-left">
      {/* ─── Header Card ─── */}
      <div className="p-4 sm:p-5 rounded-2xl border theme-border theme-bg-surface shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 min-w-0">
        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
          <div className="p-2.5 rounded-xl theme-bg-accent-soft theme-accent shrink-0 mt-0.5 sm:mt-0">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold theme-text-primary tracking-tight">
                Classroom Configuration
              </h2>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md theme-bg-sub border theme-border theme-text-secondary">
                Configuration
              </span>
            </div>
            <p className="text-xs theme-text-secondary mt-1 max-w-2xl leading-relaxed">
              Configure classroom date timezone indicators, default report copy formats, evaluator teacher attribution tags, student group mentions, and date standards.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
          <span className="px-3 py-1.5 rounded-xl text-xs font-semibold theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20 flex items-center gap-1.5 shadow-2xs">
            <span className="w-2 h-2 rounded-full theme-bg-accent animate-pulse" />
            <span>Auto Saved</span>
          </span>
        </div>
      </div>

      {/* ─── 1. Main Setting Items ─── */}
      <div className="space-y-3">
        {/* 1. Classroom Date Timezone Setting */}
        <div className="p-4 rounded-2xl theme-bg-surface border theme-border shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="text-xs font-bold theme-text-primary flex items-center gap-2">
                <ClockIcon className="w-4 h-4 theme-accent" />
                <span>Classroom Date Timezone Indicator</span>
              </div>
              <p className="text-[11px] theme-text-secondary">
                Display classroom timezone badge (e.g. {resolvedTzEntry ? resolvedTzEntry.offset : 'UTC+06:00'}) on Date pickers across Daily Classroom
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={timezoneEnabled}
              onClick={toggleTimezone}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                timezoneEnabled ? 'theme-bg-accent' : 'theme-bg-elevated border theme-border'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full theme-bg-surface shadow-xs transition-transform absolute top-1 ${
                  timezoneEnabled ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Timezone Picker Dropdown */}
          {timezoneEnabled && (
            <div className="pt-3 border-t theme-border animate-fade-in flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-xs font-bold theme-text-primary flex items-center gap-2">
                  <GlobeIcon className="w-4 h-4 theme-accent" />
                  <span>Classroom Specific Timezone</span>
                </div>
                <p className="text-[11px] theme-text-secondary">
                  Choose specific timezone for classroom modules or inherit from App's Default ({appTzLabel})
                </p>
              </div>
              <div className="w-full sm:w-80 shrink-0">
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
        </div>

        {/* 2. Student Group Tag Setting */}
        <div className="p-4 rounded-2xl theme-bg-surface border theme-border shadow-xs flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="text-xs font-bold theme-text-primary flex items-center gap-2">
              <GroupsIcon className="w-4 h-4 theme-accent" />
              <span>Include Student Group</span>
            </div>
            <p className="text-[11px] theme-text-secondary">
              Automatically include the student's assigned group and attribution suffix in report copy
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={includeGroup}
            onClick={toggleGroup}
            className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
              includeGroup ? 'theme-bg-accent' : 'theme-bg-elevated border theme-border'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full theme-bg-surface shadow-xs transition-transform absolute top-1 ${
                includeGroup ? 'right-1' : 'left-1'
              }`}
            />
          </button>
        </div>

        {/* 3. Teacher Attribution Setting */}
        <div className="p-4 rounded-2xl theme-bg-surface border theme-border shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="text-xs font-bold theme-text-primary flex items-center gap-2">
                <TeacherIcon className="w-4 h-4 theme-accent" />
                <span>Mention Teacher Tag</span>
              </div>
              <p className="text-[11px] theme-text-secondary">
                Include evaluator teacher mention handle in the footer signature of copied reports
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={includeTeacher}
              onClick={toggleTeacher}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                includeTeacher ? 'theme-bg-accent' : 'theme-bg-elevated border theme-border'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full theme-bg-surface shadow-xs transition-transform absolute top-1 ${
                  includeTeacher ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>

          {includeTeacher && (
            <div className="pt-3 border-t theme-border animate-fade-in space-y-1.5">
              <label className="text-[11px] font-semibold theme-text-secondary block">
                Default Teacher Tag / Signature
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold font-mono theme-accent">
                  @
                </span>
                <input
                  type="text"
                  value={teacherName.replace(/^@+/, '')}
                  onChange={handleTeacherNameChange}
                  placeholder="e.g. Hafez Qari Ahmad"
                  className="w-full theme-bg-sub border theme-border theme-text-primary pl-7 pr-3 py-2 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)] transition-colors"
                />
              </div>
            </div>
          )}
        </div>

        {/* 4. Report Date Standard Setting */}
        <div className="p-4 rounded-2xl theme-bg-surface border theme-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="text-xs font-bold theme-text-primary flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 theme-accent" />
              <span>Report Date Format</span>
            </div>
            <p className="text-[11px] theme-text-secondary">
              Standard date representation used in clipboard copies, text exports, and modals
            </p>
          </div>
          <div className="w-full sm:w-80 shrink-0">
            <CustomSelect
              options={dateFormatOptions}
              value={dateFormat}
              onChange={handleDateFormatChange}
              searchable={true}
              placeholder="Select date format..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
