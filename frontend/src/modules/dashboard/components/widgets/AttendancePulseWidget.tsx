import React from 'react';
import { useTranslation } from '../../../../i18n';
import type { AttendancePulseData } from '../../types';
import { AttendanceIcon, ChevronIcon } from '../../../../components/ui/Icons';

export interface AttendancePulseWidgetProps {
  data?: AttendancePulseData;
  onTakeAttendance?: () => void;
  title?: string;
  className?: string;
}

const DEFAULT_PULSE_DATA: AttendancePulseData = {
  present: 0,
  absent: 0,
  late: 0,
  onLeave: 0,
  total: 0,
  presentRate: 0,
};

export default function AttendancePulseWidget({
  data = DEFAULT_PULSE_DATA,
  onTakeAttendance,
  title,
  className = '',
}: AttendancePulseWidgetProps) {
  const { t, formatNumber } = useTranslation('dashboard');

  const safeData = data || DEFAULT_PULSE_DATA;
  const pulseTitle = title || t('attendancePulse', "Today's Attendance Pulse");
  const total = safeData.total || 0;
  const present = safeData.present || 0;
  const absent = safeData.absent || 0;
  const late = safeData.late || 0;
  const onLeave = safeData.onLeave || 0;

  const presentPct = Math.round(
    safeData.presentRate ?? (total > 0 ? (present / total) * 100 : 0)
  );
  const absentPct = total > 0 ? Math.round((absent / total) * 100) : 0;
  const latePct = total > 0 ? Math.round((late / total) * 100) : 0;
  const leavePct = total > 0 ? Math.round((onLeave / total) * 100) : 0;

  return (
    <div className={`p-5 rounded-2xl theme-bg-surface shadow-xs h-full flex flex-col justify-start space-y-4 select-none ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-1">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <AttendanceIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold theme-text-primary leading-tight truncate">
              {pulseTitle}
            </h3>
            <p className="text-[11px] theme-text-secondary mt-0.5 truncate">
              {t('totalStudents', 'Total Students')}: <span className="font-mono font-bold theme-text-primary">{formatNumber(total)}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onTakeAttendance && (
            <button
              type="button"
              onClick={onTakeAttendance}
              className="px-3 py-1.5 rounded-xl theme-bg-accent theme-accent-text text-xs font-semibold shadow-xs hover:opacity-95 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>{t('takeAttendance', 'Roll Call')}</span>
              <span className="text-[10px]">→</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Rate Hero Banner (Borderless) */}
      <div className="flex items-center justify-between p-3.5 rounded-xl theme-bg-sub/60">
        <div className="space-y-0.5">
          <div className="text-[11px] font-semibold theme-text-secondary">
            {t('overallRate', 'Overall Attendance Rate')}
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
            {formatNumber(presentPct)}%
          </div>
        </div>

        {/* Multi-segment Progress Bar Preview */}
        <div className="w-36 sm:w-48 space-y-1.5">
          <div className="h-2.5 rounded-full overflow-hidden flex bg-zinc-800/15">
            <div style={{ width: `${presentPct}%` }} className="bg-emerald-500 transition-all duration-500" title={`Present: ${presentPct}%`} />
            <div style={{ width: `${latePct}%` }} className="bg-amber-500 transition-all duration-500" title={`Late: ${latePct}%`} />
            <div style={{ width: `${leavePct}%` }} className="bg-sky-500 transition-all duration-500" title={`Leave: ${leavePct}%`} />
            <div style={{ width: `${absentPct}%` }} className="bg-rose-500 transition-all duration-500" title={`Absent: ${absentPct}%`} />
          </div>
          <div className="flex items-center justify-between text-[9px] font-mono theme-text-muted">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* 4 Status Pills (Borderless) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Present */}
        <div className="p-2.5 rounded-xl bg-emerald-500/10 space-y-0.5 text-left rtl:text-right">
          <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 truncate">
            {t('present', 'Present')}
          </div>
          <div className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {formatNumber(present)} <span className="text-[10px] font-normal opacity-80">({formatNumber(presentPct)}%)</span>
          </div>
        </div>

        {/* Late */}
        <div className="p-2.5 rounded-xl bg-amber-500/10 space-y-0.5 text-left rtl:text-right">
          <div className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 truncate">
            {t('late', 'Late')}
          </div>
          <div className="text-base font-black text-amber-600 dark:text-amber-400 font-mono">
            {formatNumber(late)} <span className="text-[10px] font-normal opacity-80">({formatNumber(latePct)}%)</span>
          </div>
        </div>

        {/* On Leave */}
        <div className="p-2.5 rounded-xl bg-sky-500/10 space-y-0.5 text-left rtl:text-right">
          <div className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 truncate">
            {t('onLeave', 'On Leave')}
          </div>
          <div className="text-base font-black text-sky-600 dark:text-sky-400 font-mono">
            {formatNumber(onLeave)} <span className="text-[10px] font-normal opacity-80">({formatNumber(leavePct)}%)</span>
          </div>
        </div>

        {/* Absent */}
        <div className="p-2.5 rounded-xl bg-rose-500/10 space-y-0.5 text-left rtl:text-right">
          <div className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 truncate">
            {t('absent', 'Absent')}
          </div>
          <div className="text-base font-black text-rose-600 dark:text-rose-400 font-mono">
            {formatNumber(absent)} <span className="text-[10px] font-normal opacity-80">({formatNumber(absentPct)}%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
