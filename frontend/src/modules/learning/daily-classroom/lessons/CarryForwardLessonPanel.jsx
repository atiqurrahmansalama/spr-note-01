import React, { useState, useEffect, useMemo } from 'react';
import CustomButton from '../../../../components/ui/CustomButton';
import CustomCheckbox from '../../../../components/ui/CustomCheckbox';
import ReusableCalendar from '../../../../components/common/ReusableCalendar';
import {
  CopyIcon,
  CloseIcon,
  BookOpenIcon,
  TimerIcon,
  CheckIcon,
} from '../../../../components/ui/Icons';
import { learningStore } from '../../../../utils/stores/learningStore';
import { getOrdinalPeriodLabel } from '../../../../utils/localStore';
import { doesLessonMatchClass, getYesterdayDate } from '../dailyClassroomUtils';

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
  const [carrySourceDate, setCarrySourceDate] = useState(() => getYesterdayDate(currentDate));
  const [autoAdvancePages, setAutoAdvancePages] = useState(true);

  // Auto-detect previous dates with lessons
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

  // Auto-sync carrySourceDate to the most recent date with lessons if current source date has 0 lessons
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
    <div className="rounded-2xl border theme-border theme-bg-sub/40 p-4 sm:p-5 space-y-4 shadow-xs animate-fade-in text-left">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b theme-border">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl theme-bg-accent/10 theme-accent shrink-0">
            <CopyIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-bold theme-text-primary truncate">Carry Forward Previous Sabaq</h4>
              <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full theme-bg-accent/10 theme-text-accent">
                {sourceLessons.length} Available
              </span>
            </div>
            <p className="text-xs theme-text-secondary truncate mt-0.5">
              Select a previous lesson to auto-populate the form with smart page advancement
            </p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition-colors cursor-pointer"
            title="Close Carry Forward Panel"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Controls Row: Date Picker & Auto-Advance Toggle */}
      <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3 items-end">
        <ReusableCalendar
          label="Source Routine Date"
          selectedDate={carrySourceDate}
          onSelectDate={setCarrySourceDate}
          placeholder="Select Date"
        />
        <div className="p-3 rounded-xl border theme-border theme-bg-surface hover:theme-bg-sub/60 transition-colors flex items-center min-h-[46px]">
          <CustomCheckbox
            checked={autoAdvancePages}
            onChange={setAutoAdvancePages}
            label="Auto-advance Range"
            subLabel="Increment bounds (+1 span)"
            size="md"
          />
        </div>
      </div>

      {/* Source Lessons Section */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider theme-text-secondary">
            Lessons on {carrySourceDate || 'Selected Date'}
          </span>
          {sourceLessons.length > 0 && (
            <span className="text-[11px] theme-text-secondary">
              Click &quot;Apply&quot; to import
            </span>
          )}
        </div>

        {sourceLessons.length === 0 ? (
          <div className="p-5 rounded-xl border theme-border theme-bg-surface text-center space-y-1.5">
            <div className="w-9 h-9 mx-auto rounded-xl theme-bg-sub flex items-center justify-center theme-text-secondary">
              <BookOpenIcon className="w-4 h-4 opacity-70" />
            </div>
            <p className="text-xs font-bold theme-text-primary">No previous lessons found on {carrySourceDate}</p>
            <p className="text-[11px] theme-text-secondary">
              Select another source date from the calendar above to inspect lessons.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1 no-scrollbar">
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
                  className="p-3.5 rounded-xl border theme-border theme-bg-surface hover:border-[var(--accent-main)]/40 transition-all flex items-center justify-between gap-3 shadow-2xs group"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold theme-text-primary">
                        {src.curriculum_book_name || src.subject_name || 'Curriculum Book'}
                      </span>
                      {src.period_order && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md theme-bg-sub theme-text-secondary border theme-border inline-flex items-center gap-1">
                          <TimerIcon className="w-3 h-3 theme-accent shrink-0" />
                          {getOrdinalPeriodLabel(src.period_order)}
                        </span>
                      )}
                      {src.teacher_name && (
                        <span className="text-[11px] theme-text-secondary truncate">
                          • {src.teacher_name}
                        </span>
                      )}
                    </div>

                    <div className="text-xs font-medium theme-text-primary truncate">
                      {src.lesson_title || 'Untitled Sabaq'}
                    </div>

                    <div className="flex items-center gap-2 text-xs flex-wrap pt-0.5">
                      <span className="text-[11px] theme-text-secondary">
                        Source: <span className="font-semibold theme-text-primary">Page {src.start_unit || 1} – {src.end_unit || 1}</span>
                      </span>
                      {autoAdvancePages && nextStart && (
                        <span className="text-[11px] font-bold theme-text-accent px-1.5 py-0.5 rounded theme-bg-accent/10 inline-flex items-center gap-1">
                          <span>➔</span> Next: Page {nextStart} – {nextEnd}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0">
                    <CustomButton
                      type="button"
                      variant="secondary"
                      size="sm"
                      icon={CheckIcon}
                      onClick={() => handleApply(src)}
                      title="Apply lesson details to form"
                    >
                      Apply
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
