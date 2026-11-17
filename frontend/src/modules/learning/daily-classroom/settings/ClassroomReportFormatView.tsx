import React, { useState, useEffect } from 'react';
import {
  TeacherIcon,
  CalendarIcon,
} from '@/components/ui/Icons';
import CustomSelect from '@/components/ui/CustomSelect';
import { DATE_FORMAT_LIST } from '@/constants/calendarConstants';
import { classroomSettings as copyStore, calendarSettings } from '@/stores';
import { useToast } from '@/context/ToastContext';

/**
 * Enterprise Section Configuration Item for Developer Tools / Institution Settings
 */
export const classroomReportFormatSectionConfig = {
  id: 'classroom-report-format',
  group: 'Classroom Configuration',
  title: 'Daily Progress Report Settings',
  description: 'Configure standard report date representation, evaluator teacher mention handle, and footer attribution in copied reports',
  icon: TeacherIcon,
};

/**
 * Enterprise View: Daily Progress Report Settings
 * Integrates Report Date Format standards and Evaluator Teacher Tag mentions into a unified view.
 */
export const ClassroomReportFormatView: React.FC = () => {
  const { showToast } = useToast();
  const [dateFormat, setDateFormat] = useState<string>(() => copyStore.getDateFormat());
  const [includeTeacher, setIncludeTeacher] = useState<boolean>(() => copyStore.getIncludeTeacher());
  const [teacherName, setTeacherName] = useState<string>(() => copyStore.getTeacherName());
  const [appDateFormat, setAppDateFormat] = useState<string>(() =>
    calendarSettings.getDateFormat ? calendarSettings.getDateFormat() : 'DD/MM/YYYY'
  );

  useEffect(() => {
    const handleCalendarUpdate = (e: any) => {
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

  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthNamesLong = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthShort = monthNamesShort[today.getMonth()];
  const monthLong = monthNamesLong[today.getMonth()];

  const formatSample = (fmtId: string) => {
    switch (fmtId) {
      case 'DD/MM/YYYY': return `${day}/${month}/${year}`;
      case 'MM/DD/YYYY': return `${month}/${day}/${year}`;
      case 'YYYY-MM-DD': return `${year}-${month}-${day}`;
      case 'DD MMM YYYY': return `${day} ${monthShort} ${year}`;
      case 'DD MMMM YYYY': return `${day} ${monthLong} ${year}`;
      case 'MMM DD, YYYY': return `${monthShort} ${day}, ${year}`;
      case 'MMMM DD, YYYY': return `${monthLong} ${day}, ${year}`;
      case 'DD.MM.YYYY': return `${day}.${month}.${year}`;
      case 'YYYY/MM/DD': return `${year}/${month}/${day}`;
      default: return `${day}/${month}/${year}`;
    }
  };

  const appSample = formatSample(appDateFormat);

  const dateFormatOptions = [
    { label: `App's Default (${appSample} — ${appDateFormat})`, value: 'APP_DEFAULT' },
    ...DATE_FORMAT_LIST.map((fmt: any) => ({
      label: `${formatSample(fmt.id)} (${fmt.name})`,
      value: fmt.id,
    })),
  ];

  const handleDateFormatChange = (val: any) => {
    const targetId = typeof val === 'object' ? val.value : val;
    if (targetId) {
      setDateFormat(targetId);
      copyStore.saveDateFormat(targetId);
      window.dispatchEvent(
        new CustomEvent('spr_copy_settings_updated', { detail: { dateFormat: targetId } })
      );
      window.dispatchEvent(
        new CustomEvent('spr_classroom_date_format_changed', { detail: { dateFormat: targetId } })
      );
      showToast('Classroom report date format updated', 'info');
    }
  };

  const toggleTeacher = () => {
    const val = !includeTeacher;
    setIncludeTeacher(val);
    copyStore.saveIncludeTeacher(val);
    window.dispatchEvent(
      new CustomEvent('spr_copy_settings_updated', { detail: { includeTeacher: val } })
    );
    showToast(
      val ? 'Teacher attribution enabled' : 'Teacher attribution disabled',
      'info'
    );
  };

  const handleTeacherNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTeacherName(val);
    copyStore.saveTeacherName(val);
    window.dispatchEvent(
      new CustomEvent('spr_copy_settings_updated', { detail: { teacherName: val } })
    );
  };

  const cleanHandle = teacherName.replace(/^@+/, '').trim();

  return (
    <div className="w-full space-y-4 animate-fade-in text-left @container">
      {/* ─── Header Card ─── */}
      <div className="p-4 sm:p-5 rounded-2xl border-0 theme-bg-surface shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 min-w-0">
        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
          <div className="p-2.5 rounded-xl theme-bg-accent-soft theme-accent shrink-0 mt-0.5 sm:mt-0">
            <TeacherIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold theme-text-primary tracking-tight">
                Daily Progress Report Settings
              </h2>
            </div>
            <p className="text-xs theme-text-secondary mt-1 max-w-2xl leading-relaxed">
              Configure date representation standards, evaluator teacher mention handle, and footer attribution in copied classroom reports.
            </p>
          </div>
        </div>
      </div>

      {/* ─── Section 1: Report Date Standard ─── */}
      <div className="p-5 rounded-2xl theme-bg-surface border-0 shadow-xs space-y-4">
        <div className="flex flex-col @[520px]:flex-row @[520px]:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="text-sm font-bold theme-text-primary flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 theme-accent" />
              <span>Report Date Format Standard</span>
            </div>
            <p className="text-xs theme-text-secondary leading-relaxed max-w-xl">
              Standard date representation used in progress report headings, clipboard copies, and printable summaries.
            </p>
          </div>

          <div className="w-full @[520px]:w-80 shrink-0">
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

      {/* ─── Section 2: Evaluator Teacher Tag ─── */}
      <div className="p-5 rounded-2xl theme-bg-surface border-0 shadow-xs space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-sm font-bold theme-text-primary flex items-center gap-2">
              <TeacherIcon className="w-4 h-4 theme-accent" />
              <span>Mention Teacher Tag</span>
            </div>
            <p className="text-xs theme-text-secondary leading-relaxed max-w-xl">
              Include an official evaluator signature or teacher mention tag at the bottom of progress summaries copied for parents or administration.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={includeTeacher}
            onClick={toggleTeacher}
            className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer shrink-0 border-0 ${
              includeTeacher ? 'theme-bg-accent' : 'theme-bg-elevated'
            }`}
          >
            <div
              className={`w-4.5 h-4.5 rounded-full theme-bg-surface shadow-xs transition-transform absolute top-1 ${
                includeTeacher ? 'right-1' : 'left-1'
              }`}
            />
          </button>
        </div>

        {/* Teacher Tag Input */}
        {includeTeacher && (
          <div className="pt-4 border-t theme-border space-y-3 animate-fade-in">
            <label className="text-xs font-bold theme-text-primary block">
              Teacher Tag
            </label>
            <div className="relative max-w-md">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold font-mono theme-accent">
                @
              </span>
              <input
                type="text"
                value={cleanHandle}
                onChange={handleTeacherNameChange}
                placeholder="e.g. Hafez Qari Ahmad"
                className="w-full theme-bg-app border-0 theme-text-primary pl-8 pr-4 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[var(--accent-main)] transition-colors shadow-2xs"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassroomReportFormatView;
