import React, { useEffect, useRef } from 'react';
import {
  EditIcon,
  CopyIcon,
  TrashIcon,
  PlusIcon,
  BookOpenIcon,
  UserCheckIcon,
  BuildingIcon,
  ClockIcon,
} from '../../ui/Icons';

/**
 * TimetableCellContextMenu
 * Enterprise Context Menu for 2D Timetable Routine Matrix Grid.
 * Replaces intrusive floating hover buttons with a sleek, native-feel right-click menu.
 */
export default function TimetableCellContextMenu({
  x,
  y,
  item = null,
  rowItem,
  colItem,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
  onAdd,
  readOnly = false,
}) {
  const menuRef = useRef(null);

  // Close context menu on click outside, window scroll, or Escape key
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose?.();
      }
    };

    const handleScroll = () => {
      onClose?.();
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Viewport bounding math to prevent context menu overflowing window edges
  const menuWidth = 230;
  const menuHeight = item ? 210 : 110;
  const posX = typeof x === 'number' ? x : 100;
  const posY = typeof y === 'number' ? y : 100;

  const adjustedX = Math.max(12, Math.min(posX, window.innerWidth - menuWidth - 12));
  const adjustedY = Math.max(12, Math.min(posY, window.innerHeight - menuHeight - 12));

  const subjectTitle = item?.curriculumBookName || item?.subjectName || 'Subject Routine';
  const teacherName = item?.examinerName || item?.evaluatorName || item?.invigilatorName || item?.teacherName || null;
  const timing = item?.startTime && item?.endTime ? `${item.startTime} - ${item.endTime}` : (colItem?.timing || null);

  return (
    <div
      ref={menuRef}
      style={{ top: `${adjustedY}px`, left: `${adjustedX}px` }}
      onClick={(e) => e.stopPropagation()}
      className="fixed z-[9999] w-56 theme-bg-surface border theme-border rounded-2xl shadow-2xl p-1.5 text-xs font-medium theme-text-primary animate-fade-in space-y-0.5 select-none"
    >
      {/* Menu Header / Target Slot Summary */}
      <div className="px-3 py-2 border-b theme-border text-[11px] theme-text-secondary">
        <p className="font-black theme-text-primary truncate">{item ? subjectTitle : (rowItem?.label || 'Routine Slot')}</p>
        <p className="text-[10px] truncate mt-0.5 theme-text-secondary flex items-center gap-1 font-mono">
          <ClockIcon className="w-3 h-3 opacity-60 shrink-0" />
          <span>{colItem?.dateLabel || colItem?.date || 'Date'} • {timing || 'Shift 1'}</span>
        </p>
      </div>

      {/* ─── A. Actions for Occupied Cell ─── */}
      {item && (
        <>
          {!readOnly && onEdit && (
            <button
              type="button"
              onClick={() => {
                onEdit(item, rowItem, colItem);
                onClose?.();
              }}
              className="w-full px-3 py-2 rounded-xl hover:theme-bg-sub font-semibold flex items-center gap-2.5 transition cursor-pointer text-left theme-text-primary"
            >
              <EditIcon className="w-3.5 h-3.5 theme-accent" />
              <span>Edit Schedule</span>
            </button>
          )}

          {!readOnly && onDuplicate && (
            <button
              type="button"
              onClick={() => {
                onDuplicate(item, rowItem, colItem);
                onClose?.();
              }}
              className="w-full px-3 py-2 rounded-xl hover:theme-bg-sub font-semibold flex items-center gap-2.5 transition cursor-pointer text-left theme-text-primary"
            >
              <CopyIcon className="w-3.5 h-3.5 theme-text-secondary" />
              <span>Duplicate Schedule</span>
            </button>
          )}

          {!readOnly && onDelete && (
            <>
              <div className="border-t theme-border my-1" />
              <button
                type="button"
                onClick={() => {
                  onDelete(item, rowItem, colItem);
                  onClose?.();
                }}
                className="w-full px-3 py-2 rounded-xl hover:bg-rose-500/10 text-rose-500 font-semibold flex items-center gap-2.5 transition cursor-pointer text-left"
              >
                <TrashIcon className="w-3.5 h-3.5 text-rose-500" />
                <span>Remove from Routine</span>
              </button>
            </>
          )}
        </>
      )}

      {/* ─── B. Actions for Empty Cell ─── */}
      {!item && !readOnly && onAdd && (
        <button
          type="button"
          onClick={() => {
            onAdd(rowItem, colItem);
            onClose?.();
          }}
          className="w-full px-3 py-2 rounded-xl hover:theme-bg-sub font-semibold flex items-center gap-2.5 transition cursor-pointer text-left theme-text-primary"
        >
          <PlusIcon className="w-3.5 h-3.5 theme-accent" />
          <span>Add Subject Routine</span>
        </button>
      )}
    </div>
  );
}
