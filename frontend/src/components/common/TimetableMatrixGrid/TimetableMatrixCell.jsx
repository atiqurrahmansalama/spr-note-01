import React, { useState } from 'react';
import {
  BookOpenIcon,
  UserCheckIcon,
  ClockIcon,
  PlusIcon,
  CopyIcon,
  ArrowsRightLeftIcon,
} from '../../ui/Icons';
import { LENS_MODES } from './TimetableLensSelector';
import RoutineConflictBadge from '../../../modules/examinations/exam-schedules/routine-matrix/components/RoutineConflictBadge';

/**
 * TimetableMatrixCell
 * Draggable & droppable matrix cell with smooth 60fps micro-animations,
 * hover elevation, conflict warning detection, swap dropzone detection, and multi-lens content rendering.
 */
export default function TimetableMatrixCell({
  item = null,
  rowItem,
  colItem,
  rowIndex,
  colIndex,
  activeLens = LENS_MODES.ALL,
  conflictInfo = null,
  isDragSource = false,
  isDragTarget = false,
  isSwapTarget = false,
  isDraggingActive = false,
  isCopyMode = false,
  isRestricted = false,
  draggedItem = null,
  onContextMenu,
  onCellClick,
  onCellAdd,
  onCellDuplicate,
  onCellDelete,
  onCellEdit,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  density = 'normal', // 'compact' | 'normal' | 'comfortable'
  readOnly = false,
}) {
  const [isHovered, setIsHovered] = useState(false);

  const handleDragStartInternal = (e) => {
    if (readOnly || !item) return;
    e.dataTransfer.setData(
      'text/plain',
      JSON.stringify({
        id: item.id,
        rowId: rowItem?.id,
        colId: colItem?.id,
      })
    );
    e.dataTransfer.effectAllowed = 'copyMove';
    onDragStart?.(item, rowItem, colItem);
  };

  const handleDragOverInternal = (e) => {
    if (readOnly) return;
    e.preventDefault();
    if (isRestricted) {
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'none';
      onDragOver?.(e, rowItem, colItem, item);
      return;
    }
    const isCopy = Boolean(e.ctrlKey || e.altKey || e.metaKey || isCopyMode);
    if (e.dataTransfer) e.dataTransfer.dropEffect = isCopy ? 'copy' : 'move';
    onDragOver?.(e, rowItem, colItem, item);
  };

  const handleDragEnterInternal = (e) => {
    if (readOnly) return;
    e.preventDefault();
    onDragEnter?.(e, rowItem, colItem, item);
  };

  const handleDragLeaveInternal = (e) => {
    if (readOnly) return;
    e.preventDefault();
    if (e.currentTarget && e.relatedTarget && e.currentTarget.contains(e.relatedTarget)) {
      return;
    }
    onDragLeave?.(e, rowItem, colItem, item);
  };

  const handleDropInternal = (e) => {
    if (readOnly || isRestricted) return;
    e.preventDefault();
    e.stopPropagation();
    onDrop?.(e, rowItem, colItem, item);
  };


  const minHeightClass =
    density === 'compact'
      ? 'min-h-[72px] p-2'
      : density === 'comfortable'
      ? 'min-h-[110px] p-3.5'
      : 'min-h-[90px] p-2.5';

  // Dynamic DND Scope Labels
  const getSwapActionLabel = () => {
    if (isCopyMode) {
      if (activeLens === LENS_MODES.TEACHER) return 'Copy Examiner';
      if (activeLens === LENS_MODES.ROOM) return 'Copy Room';
      if (activeLens === LENS_MODES.SUBJECT) return 'Copy Subject';
      return 'Copy Slot';
    }
    if (activeLens === LENS_MODES.TEACHER) return 'Swap Examiner';
    if (activeLens === LENS_MODES.ROOM) return 'Swap Room';
    if (activeLens === LENS_MODES.SUBJECT) return 'Swap Subject';
    return 'Swap Position';
  };

  // ─── 1. Empty Cell Slot ─────────────────────────────────────────────────────
  if (!item) {
    return (
      <div
        onDragOver={handleDragOverInternal}
        onDragEnter={handleDragEnterInternal}
        onDragLeave={handleDragLeaveInternal}
        onDrop={handleDropInternal}
        onContextMenu={(e) => onContextMenu?.(e, null, rowItem, colItem)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`relative w-full h-full ${minHeightClass} rounded-xl border border-dashed transition-colors duration-100 flex flex-col items-center justify-center select-none ${
          isDragTarget
            ? isRestricted
              ? 'border-rose-500 bg-rose-500/10 ring-2 ring-inset ring-rose-500 shadow-2xs'
              : isCopyMode
              ? 'border-sky-500 bg-sky-500/10 ring-2 ring-inset ring-sky-500 shadow-2xs'
              : 'border-[var(--accent-main)] bg-[var(--accent-main)]/10 ring-2 ring-inset ring-[var(--accent-main)] shadow-2xs'
            : isHovered && !readOnly && !isDraggingActive
            ? 'border-[var(--accent-main)]/40 theme-bg-sub/60'
            : 'border-black/[0.08] dark:border-white/[0.08] theme-bg-sub/20 opacity-60 hover:opacity-100'
        }`}
      >
        <div className="pointer-events-none flex flex-col items-center justify-center">
          {isDragTarget ? (
            <div
              className={`flex items-center gap-1.5 text-xs font-bold ${
                isRestricted
                  ? 'text-rose-600 dark:text-rose-400'
                  : isCopyMode
                  ? 'text-sky-600 dark:text-sky-400'
                  : 'theme-accent'
              }`}
            >
              {isRestricted ? (
                <span>Blocked (Cross-Class)</span>
              ) : isCopyMode ? (
                <>
                  <CopyIcon className="w-4 h-4" />
                  <span>Copy to Slot</span>
                </>
              ) : (
                <>
                  <PlusIcon className="w-4 h-4" />
                  <span>Drop to Schedule</span>
                </>
              )}
            </div>
          ) : (
            <span className="text-xs font-mono font-medium theme-text-muted/40 tracking-widest">
              --
            </span>
          )}
        </div>
      </div>
    );
  }

  // ─── 2. Occupied Draggable Cell Card ─────────────────────────────────────────
  const subjectTitle = item.curriculumBookName || item.subjectName || 'Subject';
  const subTitle = item.subjectName && item.subjectName !== subjectTitle ? item.subjectName : null;
  const teacherName = item.examinerName || item.evaluatorName || item.invigilatorName || item.teacherName || null;
  const timingLabel = item.startTime && item.endTime ? `${item.startTime} - ${item.endTime}` : (colItem?.timing || null);
  const hasConflict = Boolean(conflictInfo?.hasConflict);

  return (
    <div
      draggable={!readOnly}
      onDragStart={handleDragStartInternal}
      onDragEnd={onDragEnd}
      onDragOver={handleDragOverInternal}
      onDragEnter={handleDragEnterInternal}
      onDragLeave={handleDragLeaveInternal}
      onDrop={handleDropInternal}
      onContextMenu={(e) => onContextMenu?.(e, item, rowItem, colItem)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative w-full h-full ${minHeightClass} rounded-xl border transition-colors duration-100 flex flex-col justify-between select-none ${
        isDragSource
          ? 'opacity-30 border-dashed border-[var(--accent-main)] theme-bg-sub'
          : isSwapTarget
          ? isRestricted
            ? 'border-rose-500 bg-rose-500/10 ring-2 ring-inset ring-rose-500 shadow-2xs'
            : isCopyMode
            ? 'border-sky-500 bg-sky-500/10 ring-2 ring-inset ring-sky-500 shadow-2xs'
            : 'border-purple-500 bg-purple-500/10 ring-2 ring-inset ring-purple-500 shadow-2xs'
          : hasConflict
          ? 'border-[var(--danger-main)]/40 theme-bg-surface shadow-2xs hover:shadow-md hover:border-[var(--danger-main)]/70'
          : `theme-bg-surface theme-border shadow-2xs hover:shadow-md hover:border-[var(--accent-main)]/60 ${
              !isDraggingActive ? 'hover:-translate-y-0.5 transition-all duration-150' : ''
            }`
      } ${!readOnly ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
    >
      {/* Swap indicator overlay when hovering over occupied cell during drag */}
      {isSwapTarget && (
        <div
          className={`absolute inset-0 z-20 rounded-xl backdrop-blur-[0.5px] flex items-center justify-center gap-1.5 font-bold text-xs pointer-events-none select-none ${
            isRestricted
              ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
              : isCopyMode
              ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
              : 'bg-purple-500/15 text-purple-700 dark:text-purple-300'
          }`}
        >
          {isRestricted ? (
            <span>Blocked (Different Class)</span>
          ) : isCopyMode ? (
            <>
              <CopyIcon className="w-4 h-4" />
              <span>{getSwapActionLabel()}</span>
            </>
          ) : (
            <>
              <ArrowsRightLeftIcon className="w-4 h-4" />
              <span>{getSwapActionLabel()}</span>
            </>
          )}
        </div>
      )}

      {/* ─── Unified Comprehensive Card Content (Always Full View) ─── */}
      <div className="space-y-1.5 text-left min-w-0">
        {/* Top: Book / Subject Name */}
        <div className="flex items-start justify-between gap-1.5">
          <div className="flex items-start gap-1.5 min-w-0">
            <BookOpenIcon className="w-3.5 h-3.5 theme-accent shrink-0 mt-0.5" />
            <span className="font-bold text-xs sm:text-[13px] theme-text-primary leading-snug break-words whitespace-normal" title={subjectTitle}>
              {subjectTitle}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0 mt-0.5">
            {hasConflict && <RoutineConflictBadge conflictInfo={conflictInfo} />}
          </div>
        </div>

        {/* Middle: Teacher Meta */}
        {teacherName && (
          <div className="space-y-0.5 text-[11px] theme-text-secondary pl-5">
            <div className="flex items-start gap-1.5 leading-tight break-words whitespace-normal" title={`Examiner: ${teacherName}`}>
              <UserCheckIcon className="w-3 h-3 shrink-0 opacity-70 mt-0.5" />
              <span className="font-medium break-words whitespace-normal leading-tight">{teacherName}</span>
            </div>
          </div>
        )}

        {/* Bottom: Shift Timing */}
        <div className="flex items-center gap-1.5 pt-1 border-t border-black/[0.04] dark:border-white/[0.04] text-[10px] font-mono theme-text-secondary">
          <ClockIcon className="w-3 h-3 opacity-60 shrink-0" />
          <span className="break-words whitespace-normal leading-tight">{timingLabel || '09:00 AM'}</span>
        </div>
      </div>
    </div>
  );
}

