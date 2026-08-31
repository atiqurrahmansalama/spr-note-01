import React, { useState, useEffect, useMemo } from 'react';
import CustomButton from '../../../../components/ui/CustomButton';
import ReusableCalendar from '../../../../components/common/ReusableCalendar';
import { CopyIcon, CloseIcon } from '../../../../components/ui/Icons';
import { learningStore } from '../../../../utils/stores/learningStore';
import { getOrdinalPeriodLabel } from '../../../../utils/localStore';
import { doesLessonMatchClass } from '../dailyClassroomUtils';

/**
 * Reusable In-Drawer Carry Forward Panel
 * Scans previous academic lessons and auto-populates Sabaq / Assessment drawer forms with auto-page advancing.
 */
export default function CarryForwardLessonPanel({
  isOpen = false,
  onClose,
  currentDate = '',
  classId = '',
  classes = [],
  tenantId = 'default',
  onApplyLesson,
}) {
  const getYesterdayDate = (baseDate) => {
    try {
      const d = baseDate ? new Date(baseDate) : new Date();
      d.setDate(d.getDate() - 1);
      return d.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const [carrySourceDate, setCarrySourceDate] = useState(() => getYesterdayDate(currentDate));
  const [autoAdvancePages, setAutoAdvancePages] = useState(true);

  // Find all distinct previous dates that have lessons for auto-detection and quick selection pills
  const availablePreviousDates = useMemo(() => {
    if (!isOpen) return [];
    try {
      const allLessons = learningStore.getDailyLessons(tenantId) || [];
      const currentTargetDate = String(currentDate || '').split('T')[0];
      const dateMap = new Map();

      allLessons.forEach((l) => {
        const d = String(l.lesson_date || '').split('T')[0];
        if (d && d !== currentTargetDate) {
          const match = !classId || classId === 'ALL' || doesLessonMatchClass(l, classId, classes);
          if (match) {
            dateMap.set(d, (dateMap.get(d) || 0) + 1);
          }
        }
      });

      return Array.from(dateMap.entries())
        .map(([dateVal, count]) => ({ date: dateVal, count }))
        .sort((a, b) => (a.date < b.date ? 1 : -1));
    } catch {
      return [];
    }
  }, [isOpen, currentDate, classId, classes, tenantId]);

  // Auto-sync carrySourceDate to the most recent date with lessons if current date has 0 lessons
  useEffect(() => {
    if (isOpen && availablePreviousDates.length > 0) {
      const currentSourceClean = String(carrySourceDate || '').split('T')[0];
      const hasLessonsOnCurrentSource = availablePreviousDates.some((p) => p.date === currentSourceClean);
      if (!hasLessonsOnCurrentSource && availablePreviousDates[0]?.date) {
        setCarrySourceDate(availablePreviousDates[0].date);
      }
    }
  }, [isOpen, availablePreviousDates, carrySourceDate]);

  // Load source lessons matching class from carrySourceDate
  const sourceLessons = useMemo(() => {
    if (!isOpen || !carrySourceDate) return [];
    try {
      const allLessons = learningStore.getDailyLessons(tenantId) || [];
      const targetSource = String(carrySourceDate).split('T')[0];

      return allLessons.filter((l) => {
        const lDate = String(l.lesson_date || '').split('T')[0];
        if (lDate !== targetSource) return false;
        if (classId && classId !== 'ALL') {
          return doesLessonMatchClass(l, classId, classes);
        }
        return true;
      });
    } catch {
      return [];
    }
  }, [isOpen, carrySourceDate, classId, classes, tenantId]);

  if (!isOpen) return null;

  const handleApply = (src) => {
    const sNum = parseInt(src.start_unit, 10);
    const eNum = parseInt(src.end_unit, 10);
    let nextStart = src.start_unit || '';
    let nextEnd = src.end_unit || '';
    if (autoAdvancePages && !isNaN(sNum) && !isNaN(eNum) && eNum >= sNum) {
      const span = eNum - sNum + 1;
      nextStart = String(eNum + 1);
      nextEnd = String(eNum + span);
    }
    if (onApplyLesson) {
      onApplyLesson(src, { autoAdvancePages, nextStart, nextEnd });
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--accent-main)]/40 theme-bg-sub/70 p-4 space-y-3.5 shadow-sm animate-fade-in text-left">
      <div className="flex items-center justify-between gap-2 border-b theme-border pb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-xl theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20 shrink-0">
            <CopyIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold theme-text-primary truncate">Carry Forward Previous Sabaq</h4>
            <p className="text-[11px] theme-text-secondary truncate">Select previous day's Sabaq to auto-fill current form</p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition-colors cursor-pointer"
            title="Close Carry Forward Panel"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Source Date & Auto-Advance Toggle */}
      <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
        <ReusableCalendar
          label="Source Lesson Date (Yesterday)"
          selectedDate={carrySourceDate}
          onSelectDate={setCarrySourceDate}
          placeholder="Select Date"
        />
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-xs font-semibold theme-text-primary cursor-pointer p-2.5 rounded-xl border theme-border theme-bg-surface w-full">
            <input
              type="checkbox"
              checked={autoAdvancePages}
              onChange={(e) => setAutoAdvancePages(e.target.checked)}
              className="rounded theme-border theme-accent cursor-pointer"
            />
            <span>Auto-advance pages (+1 span)</span>
          </label>
        </div>
      </div>

      {/* Quick Available Dates Badges */}
      {availablePreviousDates.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <span className="text-[11px] font-semibold theme-text-secondary">Recent Dates with Sabaq:</span>
          {availablePreviousDates.slice(0, 5).map((item) => (
            <button
              key={item.date}
              type="button"
              onClick={() => setCarrySourceDate(item.date)}
              className={`text-[11px] px-2 py-0.5 rounded-lg border font-semibold transition-all cursor-pointer ${
                String(carrySourceDate).split('T')[0] === item.date
                  ? 'theme-bg-accent text-white border-[var(--accent-main)] shadow-xs'
                  : 'theme-bg-surface theme-border theme-text-primary hover:theme-bg-sub'
              }`}
            >
              {item.date} ({item.count} sabaq)
            </button>
          ))}
        </div>
      )}

      {/* Source Lessons List */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-wider theme-text-secondary block">
          Found Lessons on {carrySourceDate || 'Selected Date'} ({sourceLessons.length})
        </span>

        {sourceLessons.length === 0 ? (
          <div className="p-3.5 rounded-xl border theme-border theme-bg-surface text-center space-y-1">
            <p className="text-xs font-semibold theme-text-primary">No previous lessons found on {carrySourceDate}</p>
            <p className="text-[11px] theme-text-secondary">
              {availablePreviousDates.length > 0
                ? 'Click one of the recent dates above with available Sabaqs.'
                : 'Try selecting a different date in the calendar above.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1 no-scrollbar">
            {sourceLessons.map((src) => {
              const sNum = parseInt(src.start_unit, 10);
              const eNum = parseInt(src.end_unit, 10);
              let nextStart = src.start_unit || '';
              let nextEnd = src.end_unit || '';
              if (autoAdvancePages && !isNaN(sNum) && !isNaN(eNum) && eNum >= sNum) {
                const span = eNum - sNum + 1;
                nextStart = String(eNum + 1);
                nextEnd = String(eNum + span);
              }

              return (
                <div
                  key={src.id}
                  className="p-3 rounded-xl border theme-border theme-bg-surface flex items-center justify-between gap-2.5 flex-wrap"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold theme-text-primary">
                        {src.curriculum_book_name || src.subject_name || 'Curriculum Book'}
                      </span>
                      {src.period_order && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded theme-bg-sub theme-text-secondary border theme-border">
                          {getOrdinalPeriodLabel(src.period_order)}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] theme-text-secondary truncate mt-0.5">
                      {src.lesson_title || 'Untitled Sabaq'} • Page {src.start_unit || 1} - {src.end_unit || 1}
                      {autoAdvancePages && nextStart && (
                        <span className="theme-text-accent font-semibold ml-1.5">
                          ➔ Suggests Page {nextStart} – {nextEnd}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <CustomButton
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => handleApply(src)}
                      title="Auto-fill form with this lesson details"
                    >
                      Apply to Form
                    </CustomButton>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
