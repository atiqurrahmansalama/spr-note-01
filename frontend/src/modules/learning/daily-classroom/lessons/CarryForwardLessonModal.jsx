import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  CopyIcon,
  CloseIcon,
  BookOpenIcon,
  TimerIcon,
  CheckIcon,
  CalendarIcon,
  AlertTriangleIcon,
} from '../../../../components/ui/Icons';
import CustomButton from '../../../../components/ui/CustomButton';
import CustomInput from '../../../../components/ui/CustomInput';
import ReusableCalendar from '../../../../components/common/ReusableCalendar';
import { learningStore } from '../../../../utils/stores/learningStore';
import { useToast } from '../../../../context/ToastContext';
import { useTenant } from '../../../../context/TenantContext';

/**
 * Enterprise-grade Lesson Clone & Carry-Forward Modal
 * Supports:
 * 1. Bulk carry-forward from a previous date (e.g. yesterday) with lesson multi-selection.
 * 2. Single-lesson duplication / carry-forward with customizable next-day target date & range adjustment.
 */
export default function CarryForwardLessonModal({
  isOpen,
  onClose,
  mode = 'bulk', // 'bulk' | 'single'
  sourceLesson = null,
  currentDate = '',
  selectedClassId = 'ALL',
  selectedClassObj = null,
  classes = [],
  onSuccess,
}) {
  const { activeTenantId } = useTenant();
  const { showToast } = useToast();
  const tenantId = activeTenantId || 'default';

  // Helper to compute yesterday / tomorrow
  const getYesterdayDate = (baseDate) => {
    try {
      const d = baseDate ? new Date(baseDate) : new Date();
      d.setDate(d.getDate() - 1);
      return d.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const getTomorrowDate = (baseDate) => {
    try {
      const d = baseDate ? new Date(baseDate) : new Date();
      d.setDate(d.getDate() + 1);
      return d.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  // ── Mode 1: Bulk State ──
  const [sourceDate, setSourceDate] = useState(() => getYesterdayDate(currentDate));
  const [targetDate, setTargetDate] = useState(() => currentDate || new Date().toISOString().split('T')[0]);
  const [selectedLessonIds, setSelectedLessonIds] = useState([]);
  const [autoAdvancePages, setAutoAdvancePages] = useState(true);

  // ── Mode 2: Single Lesson State ──
  const [singleTargetDate, setSingleTargetDate] = useState(() => getTomorrowDate(currentDate));
  const [singleLessonTitle, setSingleLessonTitle] = useState('');
  const [singleStartUnit, setSingleStartUnit] = useState('');
  const [singleEndUnit, setSingleEndUnit] = useState('');
  const [singleHomework, setSingleHomework] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset / sync state on open
  useEffect(() => {
    if (isOpen) {
      if (mode === 'bulk') {
        const yest = getYesterdayDate(currentDate);
        setSourceDate(yest);
        setTargetDate(currentDate || new Date().toISOString().split('T')[0]);
        setAutoAdvancePages(true);
      } else if (mode === 'single' && sourceLesson) {
        setSingleTargetDate(getTomorrowDate(sourceLesson.lesson_date || currentDate));
        setSingleLessonTitle(sourceLesson.lesson_title || '');
        setSingleHomework(sourceLesson.homework_task || '');

        // Auto-increment pages if numerical
        const sPage = parseInt(sourceLesson.start_unit, 10);
        const ePage = parseInt(sourceLesson.end_unit, 10);
        if (!isNaN(sPage) && !isNaN(ePage) && ePage >= sPage) {
          const span = ePage - sPage + 1;
          setSingleStartUnit(String(ePage + 1));
          setSingleEndUnit(String(ePage + span));
        } else {
          setSingleStartUnit(sourceLesson.start_unit || '');
          setSingleEndUnit(sourceLesson.end_unit || '');
        }
      }
    }
  }, [isOpen, mode, sourceLesson, currentDate]);

  // Load available lessons from source date for bulk selection
  const sourceLessons = useMemo(() => {
    if (!isOpen || mode !== 'bulk' || !sourceDate) return [];
    try {
      const allLessons = learningStore.getDailyLessons(tenantId) || [];
      return allLessons.filter((l) => {
        if (l.lesson_date !== sourceDate) return false;
        if (selectedClassId && selectedClassId !== 'ALL') {
          return String(l.academic_class) === String(selectedClassId);
        }
        return true;
      });
    } catch {
      return [];
    }
  }, [isOpen, mode, sourceDate, selectedClassId, tenantId]);

  // Auto-select all source lessons when list loads
  useEffect(() => {
    if (mode === 'bulk' && sourceLessons.length > 0) {
      setSelectedLessonIds(sourceLessons.map((l) => String(l.id)));
    } else {
      setSelectedLessonIds([]);
    }
  }, [sourceLessons, mode]);

  if (!isOpen) return null;

  // Toggle selection for a single lesson in bulk list
  const handleToggleLesson = (id) => {
    setSelectedLessonIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedLessonIds.length === sourceLessons.length) {
      setSelectedLessonIds([]);
    } else {
      setSelectedLessonIds(sourceLessons.map((l) => String(l.id)));
    }
  };

  // Submit Bulk Carry Forward
  const handleBulkSubmit = (e) => {
    e.preventDefault();
    if (selectedLessonIds.length === 0) {
      showToast('Please select at least one lesson to carry forward.', 'warning');
      return;
    }
    if (!targetDate) {
      showToast('Target date is required.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const lessonsToCopy = sourceLessons.filter((l) => selectedLessonIds.includes(String(l.id)));
      let createdCount = 0;

      lessonsToCopy.forEach((src) => {
        let newStartUnit = src.start_unit || '';
        let newEndUnit = src.end_unit || '';

        if (autoAdvancePages) {
          const sNum = parseInt(src.start_unit, 10);
          const eNum = parseInt(src.end_unit, 10);
          if (!isNaN(sNum) && !isNaN(eNum) && eNum >= sNum) {
            const span = eNum - sNum + 1;
            newStartUnit = String(eNum + 1);
            newEndUnit = String(eNum + span);
          }
        }

        const newLesson = {
          ...src,
          id: `lesson_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          lesson_date: targetDate,
          start_unit: newStartUnit,
          end_unit: newEndUnit,
          created_at: new Date().toISOString(),
        };

        learningStore.saveDailyLesson(tenantId, newLesson);
        createdCount += 1;
      });

      showToast(`Successfully carried forward ${createdCount} lesson(s) to ${targetDate}.`, 'success');
      onSuccess?.();
      onClose();
    } catch (err) {
      showToast('Failed to carry forward lessons.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Single Lesson Carry Forward
  const handleSingleSubmit = (e) => {
    e.preventDefault();
    if (!sourceLesson) return;
    if (!singleTargetDate) {
      showToast('Target date is required.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const newLesson = {
        ...sourceLesson,
        id: `lesson_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        lesson_date: singleTargetDate,
        lesson_title: singleLessonTitle.trim() || sourceLesson.lesson_title,
        start_unit: singleStartUnit ? String(singleStartUnit) : '',
        end_unit: singleEndUnit ? String(singleEndUnit) : '',
        homework_task: singleHomework.trim() || '',
        created_at: new Date().toISOString(),
      };

      learningStore.saveDailyLesson(tenantId, newLesson);
      showToast(`Lesson duplicated & assigned for ${singleTargetDate}.`, 'success');
      onSuccess?.();
      onClose();
    } catch (err) {
      showToast('Failed to duplicate lesson.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-xl rounded-3xl border theme-border theme-bg-primary shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-up text-left"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b theme-border flex items-center justify-between theme-bg-secondary/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl theme-bg-accent/10 theme-text-accent">
              <CopyIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold theme-text-primary">
                {mode === 'bulk' ? 'Carry Forward Lessons' : 'Duplicate Lesson Assignment'}
              </h3>
              <p className="text-xs theme-text-secondary">
                {mode === 'bulk'
                  ? 'Clone active lesson routine from another date into today or tomorrow'
                  : `Cloning "${sourceLesson?.lesson_title || 'Lesson'}"`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        {mode === 'bulk' ? (
          <form onSubmit={handleBulkSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
            {/* Date Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <ReusableCalendar
                  label="Copy From (Source Date)"
                  selectedDate={sourceDate}
                  onSelectDate={setSourceDate}
                  placeholder="Select source date"
                />
              </div>
              <div>
                <ReusableCalendar
                  label="Apply To (Target Date)"
                  selectedDate={targetDate}
                  onSelectDate={setTargetDate}
                  placeholder="Select target date"
                />
              </div>
            </div>

            {/* Class Scope Notice */}
            {selectedClassId !== 'ALL' && selectedClassObj && (
              <div className="p-2.5 rounded-xl border theme-border theme-bg-secondary/30 flex items-center justify-between text-xs">
                <span className="theme-text-secondary">Filtering for Class:</span>
                <span className="font-bold theme-text-primary">
                  {selectedClassObj.name || selectedClassObj.class_name}
                </span>
              </div>
            )}

            {/* Auto Advance Pages Switch */}
            <label className="flex items-center gap-2.5 p-3 rounded-xl border theme-border theme-bg-secondary/20 cursor-pointer">
              <input
                type="checkbox"
                checked={autoAdvancePages}
                onChange={(e) => setAutoAdvancePages(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <div>
                <span className="font-bold theme-text-primary block">
                  Auto-Advance Page Range
                </span>
                <span className="text-[11px] theme-text-secondary block">
                  Automatically set the new start page to previous end page + 1 with matching page length.
                </span>
              </div>
            </label>

            {/* Source Lessons List with Checkboxes */}
            <div className="space-y-2 pt-1 border-t theme-border">
              <div className="flex items-center justify-between">
                <span className="font-bold theme-text-primary uppercase tracking-wider text-[11px]">
                  Lessons Available on {sourceDate} ({selectedLessonIds.length}/{sourceLessons.length})
                </span>
                {sourceLessons.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-xs font-semibold theme-text-accent hover:underline cursor-pointer"
                  >
                    {selectedLessonIds.length === sourceLessons.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>

              {sourceLessons.length === 0 ? (
                <div className="p-6 rounded-2xl border border-dashed theme-border text-center space-y-2">
                  <AlertTriangleIcon className="w-6 h-6 theme-accent mx-auto opacity-70" />
                  <p className="font-medium theme-text-primary text-xs">
                    No lessons found on {sourceDate}
                  </p>
                  <p className="text-[11px] theme-text-secondary">
                    Pick a different source date above that has assigned lessons.
                  </p>
                </div>
              ) : (
                <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                  {sourceLessons.map((l) => {
                    const isChecked = selectedLessonIds.includes(String(l.id));
                    return (
                      <div
                        key={l.id}
                        onClick={() => handleToggleLesson(String(l.id))}
                        className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all flex items-start justify-between gap-3 ${
                          isChecked
                            ? 'theme-bg-accent/10 border-[var(--accent-main)]/40'
                            : 'theme-bg-secondary/10 border-theme opacity-70 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 pointer-events-none"
                          />
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {l.curriculum_book_name && (
                                <span className="font-bold text-[10px] px-1.5 py-0.5 rounded theme-bg-accent/15 theme-text-accent">
                                  {l.curriculum_book_name}
                                </span>
                              )}
                              {l.period_name && (
                                <span className="text-[10px] theme-text-secondary font-medium">
                                  • {l.period_name}
                                </span>
                              )}
                            </div>
                            <h5 className="font-bold theme-text-primary truncate">
                              {l.lesson_title}
                            </h5>
                            <div className="text-[11px] theme-text-secondary">
                              Class: <span className="font-medium theme-text-primary">{l.class_name}</span>
                              {l.start_unit && ` • Range: ${l.start_unit} → ${l.end_unit || ''}`}
                            </div>
                          </div>
                        </div>

                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border theme-border theme-text-secondary shrink-0">
                          {l.teacher_name || 'Instructor'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="pt-3 border-t theme-border flex items-center justify-end gap-2.5">
              <CustomButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={onClose}
              >
                Cancel
              </CustomButton>
              <CustomButton
                type="submit"
                variant="primary"
                size="sm"
                loading={isSubmitting}
                disabled={selectedLessonIds.length === 0}
                icon={CopyIcon}
              >
                Carry Forward ({selectedLessonIds.length})
              </CustomButton>
            </div>
          </form>
        ) : (
          /* Single Lesson Form */
          <form onSubmit={handleSingleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
            {/* Target Date */}
            <div>
              <ReusableCalendar
                label="Target Duplicate Date"
                selectedDate={singleTargetDate}
                onSelectDate={setSingleTargetDate}
                placeholder="Select date"
              />
            </div>

            {/* Lesson Title */}
            <div>
              <CustomInput
                label="Lesson Title"
                value={singleLessonTitle}
                onChange={setSingleLessonTitle}
                required
              />
            </div>

            {/* Start Page + End Page */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <CustomInput
                  label="Start Page / Ayah"
                  type="number"
                  value={singleStartUnit}
                  onChange={setSingleStartUnit}
                  placeholder="e.g. 15"
                />
              </div>
              <div>
                <CustomInput
                  label="End Page / Ayah"
                  type="number"
                  value={singleEndUnit}
                  onChange={setSingleEndUnit}
                  placeholder="e.g. 20"
                />
              </div>
            </div>

            {/* Homework */}
            <div>
              <CustomInput
                label="Homework / Instructions"
                value={singleHomework}
                onChange={setSingleHomework}
                placeholder="e.g. Memorize Ayah 15-20"
              />
            </div>

            {/* Footer Actions */}
            <div className="pt-3 border-t theme-border flex items-center justify-end gap-2.5">
              <CustomButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={onClose}
              >
                Cancel
              </CustomButton>
              <CustomButton
                type="submit"
                variant="primary"
                size="sm"
                loading={isSubmitting}
                icon={CopyIcon}
              >
                Duplicate Lesson
              </CustomButton>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
