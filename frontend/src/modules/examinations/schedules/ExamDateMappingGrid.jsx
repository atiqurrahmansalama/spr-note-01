import React, { useState, useMemo } from 'react';
import {
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  ChevronIcon,
} from '../../../components/ui/Icons';
import ActionMenu from '../../../components/ui/ActionMenu';

/**
 * Helper to generate an array of YYYY-MM-DD strings between two dates
 */
const generateDateRange = (startDateStr, endDateStr) => {
  if (!startDateStr || !endDateStr) return [];
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [];

  const dates = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatCleanTime = (t) => {
  if (!t) return '';
  return t.replace(/^0(\d:)/, '$1');
};

const formatCleanRange = (start, end) => {
  if (!start || !end) return '';
  const s = formatCleanTime(start);
  const e = formatCleanTime(end);
  return `${s} – ${e}`;
};

/**
 * Format date string (YYYY-MM-DD) into readable day & date label without duplication
 */
const formatDateLabel = (dateStr) => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dayName = DAY_NAMES[d.getDay()];
  const monthName = MONTH_NAMES[d.getMonth()];
  const dayNum = d.getDate();
  const year = d.getFullYear();
  return `${dayName}, ${dayNum} ${monthName} ${year}`;
};

/**
 * ExamDateMappingGrid
 * Interactive day-by-day scheduler allowing institution admins to classify each day
 * in the examination window as:
 * - EXAM_DAY : Single subject examination on this day (Shift 1)
 * - DUAL_EXAM : Dual / Two subject examinations on this day (Shift 1 + Shift 2 via Three-Dots menu)
 * - PREPARATION_GAP : Study & revision break / off day before or between exams
 * Segmented Switcher has only 2 clean buttons: Exam vs Gap.
 * Three-dots ActionMenu on the right allows assigning multiple exam shifts.
 * Zero hardcoded colors and zero emojis — 100% project theme tokens.
 * Supports smooth Expand & Collapse with ultra-clean modern SaaS styling.
 */
export default function ExamDateMappingGrid({
  startDate,
  endDate,
  scheduleDays = [],
  startTime = '09:00 AM',
  endTime = '11:00 AM',
  hasSecondShift = false,
  secondStartTime = '02:00 PM',
  secondEndTime = '04:00 PM',
  onEnableSecondShift,
  onChange,
  defaultExpanded = true,
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const dateList = useMemo(() => generateDateRange(startDate, endDate), [startDate, endDate]);

  // Build full mapping of date -> type
  const dayMap = useMemo(() => {
    const map = {};
    if (Array.isArray(scheduleDays)) {
      scheduleDays.forEach((item) => {
        if (item && item.date) {
          map[item.date] = item.type;
        }
      });
    }
    // Default unmapped dates within examination window to EXAM_DAY
    dateList.forEach((dt) => {
      if (!map[dt]) {
        map[dt] = 'EXAM_DAY';
      }
    });
    return map;
  }, [dateList, scheduleDays]);

  const updateDayType = (dateStr, newType) => {
    if (newType === 'DUAL_EXAM' && !hasSecondShift) {
      onEnableSecondShift?.();
    }
    const updated = dateList.map((dt) => ({
      date: dt,
      type: dt === dateStr ? newType : (dayMap[dt] || 'EXAM_DAY'),
    }));
    onChange?.(updated);
  };

  // Quick Preset Handlers
  const handleSetAllSingleExamDays = (e) => {
    e?.stopPropagation();
    const updated = dateList.map((dt) => ({
      date: dt,
      type: 'EXAM_DAY',
    }));
    onChange?.(updated);
  };

  const handleSetAllDualExamDays = (e) => {
    e?.stopPropagation();
    if (!hasSecondShift) onEnableSecondShift?.();
    const updated = dateList.map((dt) => ({
      date: dt,
      type: 'DUAL_EXAM',
    }));
    onChange?.(updated);
  };

  const handleSetAlternateGaps = (e) => {
    e?.stopPropagation();
    const updated = dateList.map((dt, idx) => ({
      date: dt,
      type: idx % 2 === 0 ? 'EXAM_DAY' : 'PREPARATION_GAP',
    }));
    onChange?.(updated);
  };

  // Summary Metrics
  const singleExamDaysCount = useMemo(() => {
    return dateList.filter((dt) => dayMap[dt] === 'EXAM_DAY').length;
  }, [dateList, dayMap]);

  const dualExamDaysCount = useMemo(() => {
    return dateList.filter((dt) => dayMap[dt] === 'DUAL_EXAM').length;
  }, [dateList, dayMap]);

  const totalExamSlotsCount = singleExamDaysCount + dualExamDaysCount * 2;
  const totalActiveExamDays = singleExamDaysCount + dualExamDaysCount;

  const prepGapsCount = useMemo(() => {
    return dateList.filter((dt) => dayMap[dt] === 'PREPARATION_GAP' || dayMap[dt] === 'EXAM_BREAK').length;
  }, [dateList, dayMap]);

  if (dateList.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border theme-border theme-bg-sub/10 overflow-hidden transition-all duration-200">
      {/* Collapsible Header Banner */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsExpanded((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded((prev) => !prev);
          }
        }}
        className="p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none hover:theme-bg-sub/30 transition-colors"
      >
        <div className="space-y-0.5 text-left">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md theme-bg-accent-soft theme-accent">
              <CalendarIcon className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider theme-text-primary">
              Exam Schedule & Study Gaps
            </span>
          </div>
          <p className="text-[11px] theme-text-secondary pl-6">
            Assign exam days and study preparation gaps. Use three-dots menu for dual/multiple shifts.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-semibold theme-text-secondary hidden @[480px]:inline">
            {isExpanded ? 'Collapse' : 'Expand'}
          </span>
          <div className="p-1 rounded-md theme-bg-surface border theme-border shadow-2xs">
            <ChevronIcon isOpen={isExpanded} className="w-3.5 h-3.5 theme-accent" />
          </div>
        </div>
      </div>

      {/* Summary Badges Bar (Always Visible) */}
      <div className="px-3.5 pb-3 flex items-center gap-2 flex-wrap text-xs border-b theme-border">
        <span className="px-2.5 py-0.5 rounded-full font-bold text-[11px] theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20 flex items-center gap-1.5 shadow-2xs">
          <CheckIcon className="w-3 h-3" />
          {totalExamSlotsCount} Exams ({totalActiveExamDays} Days)
        </span>
        <span className="px-2.5 py-0.5 rounded-full font-semibold text-[11px] theme-bg-sub theme-text-secondary border theme-border flex items-center gap-1.5">
          <ClockIcon className="w-3 h-3" />
          {prepGapsCount} Study {prepGapsCount === 1 ? 'Gap' : 'Gaps'}
        </span>
        <span className="text-[11px] font-medium theme-text-secondary ml-auto">
          Total Window: {dateList.length} Days
        </span>
      </div>

      {/* Expanded Interactive Scheduler Content */}
      {isExpanded && (
        <div className="p-3.5 space-y-3 animate-fade-in">
          {/* Quick Action Presets Bar */}
          <div className="flex items-center justify-between gap-2 flex-wrap pb-1">
            <span className="text-[11px] font-bold theme-text-secondary">Quick Layout Presets:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={handleSetAllSingleExamDays}
                className="px-2.5 py-1 rounded-md text-[10px] font-bold theme-bg-surface border theme-border theme-text-primary hover:border-[var(--accent-main)]/60 hover:theme-accent transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                All 1 Exam
              </button>
              <button
                type="button"
                onClick={handleSetAllDualExamDays}
                className="px-2.5 py-1 rounded-md text-[10px] font-bold theme-bg-surface border theme-border theme-text-primary hover:border-[var(--accent-main)]/60 hover:theme-accent transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                All 2 Exams
              </button>
              <button
                type="button"
                onClick={handleSetAlternateGaps}
                className="px-2.5 py-1 rounded-md text-[10px] font-bold theme-bg-surface border theme-border theme-text-primary hover:border-[var(--accent-main)]/60 hover:theme-accent transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                Alternate (1 Exam + 1 Gap)
              </button>
            </div>
          </div>

          {/* Date List Interactive Grid */}
          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-2.5 max-h-[480px] overflow-y-auto pr-1.5 no-scrollbar pt-1">
            {dateList.map((dt) => {
              const type = dayMap[dt] || 'EXAM_DAY';
              const dateLabel = formatDateLabel(dt);
              const isExamDay = type === 'EXAM_DAY' || type === 'DUAL_EXAM';

              return (
                <div
                  key={dt}
                  className={`p-3 rounded-xl border transition-all duration-150 flex flex-col justify-between gap-1 shadow-2xs hover:shadow-xs ${
                    type === 'DUAL_EXAM'
                      ? 'border-[var(--accent-main)]/50 theme-bg-surface ring-1 ring-[var(--accent-main)]/10'
                      : type === 'EXAM_DAY'
                      ? 'border-[var(--accent-main)]/30 theme-bg-surface'
                      : 'theme-border theme-bg-sub/20 opacity-90'
                  }`}
                >
                  {/* Top Row: Date on Left, Switch & Three-Dots Menu on Right */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold theme-text-primary truncate">
                      {dateLabel}
                    </span>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex items-center p-0.5 rounded-lg border theme-border theme-bg-sub/50 gap-0.5 shadow-2xs">
                        <button
                          type="button"
                          title={type === 'DUAL_EXAM' ? "Exam Day (Dual Shifts Active)" : "Mark as Exam Day"}
                          onClick={() => {
                            if (!isExamDay) {
                              updateDayType(dt, 'EXAM_DAY');
                            }
                          }}
                          className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all duration-150 cursor-pointer ${
                            isExamDay
                              ? 'theme-bg-accent text-white shadow-2xs'
                              : 'theme-text-secondary hover:theme-text-primary'
                          }`}
                        >
                          {type === 'DUAL_EXAM' ? 'Exam (2x)' : 'Exam'}
                        </button>
                        <button
                          type="button"
                          title="Mark as Preparation / Study Gap Day"
                          onClick={() => updateDayType(dt, 'PREPARATION_GAP')}
                          className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all duration-150 cursor-pointer ${
                            !isExamDay
                              ? 'theme-bg-accent text-white shadow-2xs'
                              : 'theme-text-secondary hover:theme-text-primary'
                          }`}
                        >
                          Gap
                        </button>
                      </div>

                      {/* Three-dots menu for Shift configuration */}
                      <ActionMenu
                        buttonClassName="p-1.5 rounded-lg border theme-border theme-bg-surface hover:theme-bg-sub/80 cursor-pointer transition-colors shadow-2xs"
                        items={[
                          {
                            label: 'Single Exam (1 Shift)',
                            onClick: () => updateDayType(dt, 'EXAM_DAY'),
                          },
                          {
                            label: 'Dual Exam (2 Shifts)',
                            onClick: () => updateDayType(dt, 'DUAL_EXAM'),
                          },
                          {
                            label: 'Mark as Preparation Gap',
                            onClick: () => updateDayType(dt, 'PREPARATION_GAP'),
                          },
                        ]}
                      />
                    </div>
                  </div>

                  {/* Bottom Row: Full-width Time on Next Line */}
                  {isExamDay && (
                    <div className="mt-1">
                      {type === 'EXAM_DAY' && startTime && endTime && (
                        <div className="text-xs font-semibold theme-text-secondary font-mono tracking-tight">
                          <span>{formatCleanRange(startTime, endTime)}</span>
                        </div>
                      )}

                      {type === 'DUAL_EXAM' && (
                        <div className="flex items-center gap-2 flex-wrap font-mono text-xs font-semibold theme-text-secondary tracking-tight">
                          <span>{formatCleanRange(startTime, endTime)}</span>
                          <span className="opacity-30 font-normal theme-text-secondary select-none">|</span>
                          <span>{formatCleanRange(secondStartTime || '02:00 PM', secondEndTime || '04:00 PM')}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
