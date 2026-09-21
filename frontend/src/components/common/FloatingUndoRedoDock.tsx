import React from 'react';
import { useLocation } from 'react-router-dom';
import { UndoIcon, RedoIcon, GripVerticalIcon } from '../ui/Icons';
import IconButton from '../ui/IconButton';
import { useUndoRedo } from '../../context/useUndoRedo';
import { useDraggable } from '../../hooks/useDraggable';

export interface FloatingUndoRedoDockProps {
  className?: string;
  defaultBottom?: number;
  storageKey?: string;
}

/**
 * Enterprise Draggable Floating Undo / Redo Dock
 * -----------------------------------------------
 * Minimal, high-aesthetic floating action pill that dynamically appears
 * when undo/redo actions are available. Uses the centralized `useDraggable` hook
 * for boundary-constrained mouse & touch dragging with double-click reset.
 */
export const FloatingUndoRedoDock: React.FC<FloatingUndoRedoDockProps> = ({
  className = '',
  defaultBottom = 24,
  storageKey = 'spr_floating_undo_pos',
}) => {
  const location = useLocation();
  const { canUndo, canRedo, undoTitle, redoTitle, undo, redo } = useUndoRedo();

  const { targetRef, handleProps, containerProps, isDragging, style } = useDraggable({
    defaultPosition: 'bottom-center',
    defaultOffset: { bottom: defaultBottom },
    storageKey,
    boundaryMargin: 12,
    zIndex: 9999,
  });

  // Hidden on dashboard or when no undo/redo actions exist
  const isDashboard = location.pathname === '/' || location.pathname === '/dashboard';
  const isVisible = (canUndo || canRedo) && !isDashboard;

  if (!isVisible) return null;

  return (
    <nav
      ref={targetRef}
      role="toolbar"
      aria-label="Floating Undo Redo Controls"
      style={style}
      {...containerProps}
      className={`
        flex items-center gap-1 px-1.5 py-1 rounded-2xl theme-bg-surface/95 border theme-border shadow-2xl backdrop-blur-md select-none
        transition-shadow duration-150 animate-fade-in
        ${isDragging ? 'cursor-grabbing shadow-3xl scale-102 ring-2 ring-[var(--accent-main)]/30' : 'cursor-grab'}
        ${className}
      `.trim()}
    >
      {/* Subtle Drag Grip Handle */}
      <div 
        {...handleProps}
        className="px-1 py-1 theme-text-secondary/50 hover:theme-text-primary transition-colors flex items-center justify-center shrink-0 cursor-grab active:cursor-grabbing"
      >
        <GripVerticalIcon className="w-3.5 h-3.5" />
      </div>

      {/* Vertical Divider */}
      <div className="w-px h-4 bg-zinc-300 dark:bg-zinc-700/60 shrink-0" />

      {/* Undo Button */}
      <IconButton
        icon={UndoIcon}
        size="sm"
        variant="ghost"
        disabled={!canUndo}
        onClick={(e) => {
          e.stopPropagation();
          undo();
        }}
        title={canUndo ? `Undo: ${undoTitle || 'Last action'} (Ctrl+Z)` : 'Nothing to undo (Ctrl+Z)'}
        ariaLabel="Undo"
      />

      {/* Redo Button */}
      <IconButton
        icon={RedoIcon}
        size="sm"
        variant="ghost"
        disabled={!canRedo}
        onClick={(e) => {
          e.stopPropagation();
          redo();
        }}
        title={canRedo ? `Redo: ${redoTitle || 'Last action'} (Ctrl+Y)` : 'Nothing to redo (Ctrl+Y)'}
        ariaLabel="Redo"
      />
    </nav>
  );
};

export default FloatingUndoRedoDock;
