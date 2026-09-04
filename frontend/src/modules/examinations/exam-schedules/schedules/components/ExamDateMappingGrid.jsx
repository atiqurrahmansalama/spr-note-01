import React, { useState, useMemo } from 'react';
import CollapsibleCard from '../../../../../components/ui/CollapsibleCard';
import {
  CalendarIcon,
  ClockIcon,
  BookOpenIcon,
  SparklesIcon,
} from '../../../../../components/ui/Icons';
import ActionMenu from '../../../../../components/ui/ActionMenu';

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
  shifts = [],
  startTime = '09:00 AM',
  endTime = '11:00 AM',
  hasSecondShift = false,
  secondStartTime = '02:00 PM',
  secondEndTime = '04:00 PM',
  onAddShift,
  onChange,
  defaultExpanded = true,
}) {
  const [presetIndex, setPresetIndex] = useState(0);

  const dateList = useMemo(() => generateDateRange(startDate, endDate), [startDate, endDate]);

  // Resolve active shifts list with full backward compatibility
  const resolvedShifts = useMemo(() => {
    if (Array.isArray(shifts) && shifts.length > 0) {
      return shifts;
    }
    const list = [
      { id: 'shift_1', name: 'Shift 1', startTime: startTime || '09:00 AM', endTime: endTime || '11:00 AM' },
    ];
    if (hasSecondShift || secondStartTime) {
      list.push({
        id: 'shift_2',
        name: 'Shift 2',
        startTime: secondStartTime || '02:00 PM',
        endTime: secondEndTime || '04:00 PM',
      });
    }
    return list;
  }, [shifts, startTime, endTime, hasSecondShift, secondStartTime, secondEndTime]);

  // Build full mapping of date -> { type, shiftCount }
  const dayMap = useMemo(() => {
    const map = {};
    if (Array.isArray(scheduleDays)) {
      scheduleDays.forEach((item) => {
        if (item && item.date) {
          const isGap = item.type === 'PREPARATION_GAP' || item.type === 'EXAM_BREAK';
          let count = 1;
          if (isGap) {
            count = 0;
          } else if (typeof item.shiftCount === 'number') {
            count = Math.max(1, Math.min(item.shiftCount, resolvedShifts.length));
          } else if (item.type === 'DUAL_EXAM') {
            count = Math.min(2, resolvedShifts.length);
          } else if (item.type === 'MULTI_EXAM' && Array.isArray(item.shifts)) {
            count = Math.min(item.shifts.length, resolvedShifts.length);
          }
          map[item.date] = {
            type: isGap ? 'PREPARATION_GAP' : 'EXAM_DAY',
            shiftCount: count,
          };
        }
      });
    }
    // Default unmapped dates within examination window to EXAM_DAY
    dateList.forEach((dt) => {
      if (!map[dt]) {
        map[dt] = {
          type: 'EXAM_DAY',
          shiftCount: 1,
        };
      }
    });
    return map;
  }, [dateList, scheduleDays, resolvedShifts.length]);

  const updateDayConfig = (dateStr, newType, shiftCount = 1) => {
    const isGap = newType === 'PREPARATION_GAP';
    const effectiveShiftCount = isGap ? 0 : Math.max(1, Math.min(shiftCount, resolvedShifts.length));
    const effectiveType = isGap ? 'PREPARATION_GAP' : (effectiveShiftCount === 2 ? 'DUAL_EXAM' : (effectiveShiftCount > 2 ? 'MULTI_EXAM' : 'EXAM_DAY'));

    const updated = dateList.map((dt) => {
      if (dt === dateStr) {
        return {
          date: dt,
          type: effectiveType,
          shiftCount: effectiveShiftCount,
        };
      }
      const existing = dayMap[dt];
      const exIsGap = existing?.type === 'PREPARATION_GAP';
      const exCount = exIsGap ? 0 : (existing?.shiftCount || 1);
      const exType = exIsGap ? 'PREPARATION_GAP' : (exCount === 2 ? 'DUAL_EXAM' : (exCount > 2 ? 'MULTI_EXAM' : 'EXAM_DAY'));
      return {
        date: dt,
        type: exType,
        shiftCount: exCount,
      };
    });
    onChange?.(updated);
  };

  // Available dynamic quick presets
  const availablePresets = useMemo(() => {
    const totalShifts = Math.max(1, resolvedShifts.length);
    const multiShiftLabel = totalShifts === 2 ? 'All 1+1 Shift' : `All ${totalShifts} Shifts`;

    const list = [
      {
        id: 'all_1_shift',
        label: 'All 1 Shift',
        build: () => dateList.map((dt) => ({
          date: dt,
          type: 'EXAM_DAY',
          shiftCount: 1,
        })),
      },
    ];

    if (totalShifts > 1) {
      list.push({
        id: 'all_multi_shift',
        label: multiShiftLabel,
        build: () => dateList.map((dt) => ({
          date: dt,
          type: totalShifts === 2 ? 'DUAL_EXAM' : 'MULTI_EXAM',
          shiftCount: totalShifts,
        })),
      });
    }

    list.push({
      id: 'alt_1e_1g',
      label: 'Alternate (1E + 1G)',
      build: () => dateList.map((dt, idx) => ({
        date: dt,
        type: idx % 2 === 0 ? 'EXAM_DAY' : 'PREPARATION_GAP',
        shiftCount: idx % 2 === 0 ? 1 : 0,
      })),
    });

    list.push({
      id: 'block_2e_1g',
      label: 'Block (2E + 1G)',
      build: () => dateList.map((dt, idx) => ({
        date: dt,
        type: idx % 3 === 2 ? 'PREPARATION_GAP' : 'EXAM_DAY',
        shiftCount: idx % 3 === 2 ? 0 : 1,
      })),
    });

    return list;
  }, [dateList, resolvedShifts.length]);

  // Single-Button Cycle Preset Handler
  const handleCyclePreset = (e) => {
    e?.stopPropagation();
    if (availablePresets.length === 0) return;
    const nextIdx = (presetIndex + 1) % availablePresets.length;
    setPresetIndex(nextIdx);
    const nextPreset = availablePresets[nextIdx];
    onChange?.(nextPreset.build());
  };

  // Summary Metrics
  const totalExamSlotsCount = useMemo(() => {
    return dateList.reduce((acc, dt) => {
      const entry = dayMap[dt];
      if (!entry || entry.type === 'PREPARATION_GAP') return acc;
      return acc + (entry.shiftCount || 1);
    }, 0);
  }, [dateList, dayMap]);

  const totalActiveExamDays = useMemo(() => {
    return dateList.filter((dt) => dayMap[dt]?.type !== 'PREPARATION_GAP').length;
  }, [dateList, dayMap]);

  const prepGapsCount = useMemo(() => {
    return dateList.filter((dt) => dayMap[dt]?.type === 'PREPARATION_GAP').length;
  }, [dateList, dayMap]);

  if (dateList.length === 0) {
    return null;
  }

  const getActionMenuItems = (dt) => {
    const items = [];
    for (let k = 1; k <= resolvedShifts.length; k++) {
      const shiftNames = resolvedShifts
        .slice(0, k)
        .map((s, i) => (s.name || `Shift ${i + 1}`).replace(/\s*\([^)]*\)/g, '').trim())
        .join(' + ');
      items.push({
        label: `${k} ${k === 1 ? 'Shift' : 'Shifts'} (${shiftNames})`,
        onClick: () => updateDayConfig(dt, 'EXAM_DAY', k),
      });
    }

    if (onAddShift) {
      items.push({
        label: 'Add Another Shift',
        onClick: () => onAddShift?.(),
      });
    }

    items.push({
      label: 'Mark as Gap',
      onClick: () => updateDayConfig(dt, 'PREPARATION_GAP', 0),
    });

    return items;
  };

  return (
    <CollapsibleCard
      title="Exam Schedule & Gaps"
      icon={CalendarIcon}
      subtitle={`${totalExamSlotsCount} ${totalExamSlotsCount === 1 ? 'Exam' : 'Exams'} (${totalActiveExamDays} ${totalActiveExamDays === 1 ? 'Day' : 'Days'})${prepGapsCount > 0 ? ` • ${prepGapsCount} ${prepGapsCount === 1 ? 'Gap' : 'Gaps'}` : ''}`}
      defaultExpanded={defaultExpanded}
      headerRight={
        availablePresets.length > 0 ? (
          <button
            type="button"
            onClick={handleCyclePreset}
            title="Click to cycle and apply next schedule preset"
            className="px-2 py-1 rounded-lg text-xs font-bold theme-bg-surface border theme-border hover:border-[var(--accent-main)]/60 theme-text-primary hover:theme-accent transition-all cursor-pointer shadow-2xs active:scale-95 flex items-center gap-1.5 group shrink-0"
          >
            <div className="w-3 h-3 rounded theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0">
              <SparklesIcon className="w-2.5 h-2.5 group-hover:rotate-12 transition-transform" />
            </div>
            <span className="font-semibold truncate hidden @[480px]:inline text-[11px]">
              {availablePresets[presetIndex % availablePresets.length]?.label || 'Preset'}
            </span>
            <span className="text-[10px] font-mono theme-text-secondary opacity-70 group-hover:opacity-100 transition-opacity">
              ({((presetIndex % availablePresets.length) + 1)}/{availablePresets.length})
            </span>
          </button>
        ) : null
      }
    >
      <div className="space-y-3.5">
        {/* Date List Interactive Grid */}
        <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-1 no-scrollbar pt-1">
          {dateList.map((dt) => {
            const entry = dayMap[dt] || { type: 'EXAM_DAY', shiftCount: 1 };
            const isGap = entry.type === 'PREPARATION_GAP';
            const dateLabel = formatDateLabel(dt);
            const currentShiftCount = isGap ? 0 : (entry.shiftCount || 1);
            const activeShiftsForDay = resolvedShifts.slice(0, currentShiftCount);

            return (
              <div
                key={dt}
                className={`p-3.5 rounded-xl border transition-all duration-150 flex flex-col justify-between gap-2.5 shadow-2xs hover:shadow-xs ${
                  !isGap && currentShiftCount > 1
                    ? 'border-[var(--accent-main)]/50 theme-bg-surface ring-1 ring-[var(--accent-main)]/15'
                    : !isGap
                    ? 'border-[var(--accent-main)]/30 theme-bg-surface'
                    : 'theme-border theme-bg-sub/20 opacity-90'
                }`}
              >
                {/* Top Row: Date with Icon on Left, Switch & Three-Dots Menu on Right */}
                <div className="flex items-center justify-between gap-2">
                  {/* Left: Date Icon + Formatted Date Text */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border shadow-2xs ${
                        !isGap
                          ? 'theme-bg-accent-soft theme-accent border-[var(--accent-main)]/20'
                          : 'theme-bg-sub theme-text-secondary border-theme-border opacity-80'
                      }`}
                    >
                      {!isGap ? (
                        <CalendarIcon className="w-3.5 h-3.5" />
                      ) : (
                        <BookOpenIcon className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <span className="text-xs font-bold theme-text-primary truncate">
                      {dateLabel}
                    </span>
                  </div>

                  {/* Right: Segmented Toggle Switch + ActionMenu */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex items-center p-0.5 rounded-lg border theme-border theme-bg-sub/50 gap-0.5 shadow-2xs">
                      <button
                        type="button"
                        title={!isGap ? `Exam Day (${currentShiftCount} ${currentShiftCount === 1 ? 'Shift' : 'Shifts'} Active)` : "Mark as Exam Day"}
                        onClick={() => {
                          if (isGap) {
                            updateDayConfig(dt, 'EXAM_DAY', 1);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all duration-150 cursor-pointer ${
                          !isGap
                            ? 'theme-bg-accent text-white shadow-2xs'
                            : 'theme-text-secondary hover:theme-text-primary'
                        }`}
                      >
                        {!isGap && currentShiftCount > 1 ? `Exam (${currentShiftCount}x)` : 'Exam'}
                      </button>
                      <button
                        type="button"
                        title="Mark as Preparation / Study Gap Day"
                        onClick={() => updateDayConfig(dt, 'PREPARATION_GAP', 0)}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all duration-150 cursor-pointer ${
                          isGap
                            ? 'theme-bg-accent text-white shadow-2xs'
                            : 'theme-text-secondary hover:theme-text-primary'
                        }`}
                      >
                        Gap
                      </button>
                    </div>

                    {/* Three-dots menu for dynamic Shift configuration */}
                    <ActionMenu
                      buttonClassName="p-1.5 rounded-lg border theme-border theme-bg-surface hover:theme-bg-sub/80 cursor-pointer transition-colors shadow-2xs"
                      items={getActionMenuItems(dt)}
                    />
                  </div>
                </div>

                {/* Bottom Row: Each shift time on its own separate line with Clock icon, or Gap notice */}
                {!isGap && activeShiftsForDay.length > 0 ? (
                  <div className="pt-2 border-t theme-border space-y-1.5">
                    {activeShiftsForDay.map((s, sIdx) => {
                      const cleanShiftName = (s.name || `Shift ${sIdx + 1}`).replace(/\s*\([^)]*\)/g, '').trim();
                      return (
                        <div
                          key={s.id || sIdx}
                          className="flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <ClockIcon className="w-3.5 h-3.5 theme-accent opacity-80 shrink-0" />
                            {activeShiftsForDay.length > 1 && (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded theme-bg-sub border theme-border theme-text-secondary font-mono shrink-0">
                                {cleanShiftName}
                              </span>
                            )}
                            <span className="font-mono text-xs font-semibold theme-text-secondary tracking-tight">
                              {formatCleanRange(s.startTime, s.endTime)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : isGap ? (
                  <div className="pt-2 border-t theme-border flex items-center gap-1.5 text-[11px] font-medium theme-text-secondary">
                    <BookOpenIcon className="w-3.5 h-3.5 opacity-50 shrink-0" />
                    <span>Study & Revision Break (No Exam)</span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </CollapsibleCard>
  );
}
