import React from 'react';
import { useTranslation } from '../../../../i18n';
import type { AttendancePulseData } from '../../types';
import { AttendanceIcon, ChevronIcon } from '../../../../components/ui/Icons';

export interface AttendancePulseWidgetProps {
  data: AttendancePulseData;
  onTakeAttendance?: () => void;
  title?: string;
  className?: string;
}

export default function AttendancePulseWidget({
  data,
  onTakeAttendance,
  title,
  className = '',
}: AttendancePulseWidgetProps) {
  const { t, formatNumber } = useTranslation('dashboard');

  const pulseTitle = title || t('attendancePulse', "Today's Attendance Pulse");
  const presentPct = Math.round(data.presentRate || (data.total ? (data.present / data.total) * 100 : 0));
  const absentPct = data.total ? Math.round((data.absent / data.total) * 100) : 0;
  const latePct = data.total ? Math.round((data.late / data.total) * 100) : 0;
  const leavePct = data.total ? Math.round((data.onLeave / data.total) * 100) : 0;

  return (
    <div className={`p-5 rounded-2xl theme-bg-surface border theme-border shadow-xs space-y-4 select-none ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b theme-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <AttendanceIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold theme-text-primary leading-tight">
              {pulseTitle}
            </h3>
            <p className="text-[11px] theme-text-secondary mt-0.5">
              {t('totalStudents', 'Total Students')}: <span className="font-mono font-bold theme-text-primary">{formatNumber(data.total)}</span>
            </p>
          </div>
        </div>

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

      {/* Main Rate Hero Banner */}
      <div className="flex items-center justify-between p-3.5 rounded-xl theme-bg-sub border theme-border">
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
          <div className="h-2.5 rounded-full overflow-hidden flex bg-zinc-800/20 border theme-border">
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

      {/* 4 Status Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Present */}
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-0.5 text-left rtl:text-right">
          <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 truncate">
            {t('present', 'Present')}
          </div>
          <div className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {formatNumber(data.present)} <span className="text-[10px] font-normal opacity-80">({formatNumber(presentPct)}%)</span>
          </div>
        </div>

        {/* Late */}
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-0.5 text-left rtl:text-right">
          <div className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 truncate">
            {t('late', 'Late')}
          </div>
          <div className="text-base font-black text-amber-600 dark:text-amber-400 font-mono">
            {formatNumber(data.late)} <span className="text-[10px] font-normal opacity-80">({formatNumber(latePct)}%)</span>
          </div>
        </div>

        {/* On Leave */}
        <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 space-y-0.5 text-left rtl:text-right">
          <div className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 truncate">
            {t('onLeave', 'On Leave')}
          </div>
          <div className="text-base font-black text-sky-600 dark:text-sky-400 font-mono">
            {formatNumber(data.onLeave)} <span className="text-[10px] font-normal opacity-80">({formatNumber(leavePct)}%)</span>
          </div>
        </div>

        {/* Absent */}
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-0.5 text-left rtl:text-right">
          <div className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 truncate">
            {t('absent', 'Absent')}
          </div>
          <div className="text-base font-black text-rose-600 dark:text-rose-400 font-mono">
            {formatNumber(data.absent)} <span className="text-[10px] font-normal opacity-80">({formatNumber(absentPct)}%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
