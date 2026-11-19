import React, { useCallback } from 'react';

export interface PanelResizerProps {
  /** MouseDown / TouchStart drag initializer */
  onStartResize?: (e: React.MouseEvent | React.TouchEvent | any) => void;
  /** Double click handler to reset or toggle width */
  onResetResize?: () => void;
  /** Edge attachment position (default: 'left') */
  position?: 'left' | 'right' | 'top' | 'bottom';
  /** Drag direction (default: 'vertical') */
  orientation?: 'vertical' | 'horizontal';
  /** Whether actively being dragged */
  isResizing?: boolean;
  /** Accessible tooltip text */
  title?: string;
  /** Additional wrapper CSS classes */
  className?: string;
  /** Additional indicator pill CSS classes */
  indicatorClassName?: string;
  /** Current size in pixels (for ARIA accessibility) */
  currentWidth?: number;
  /** Step change callback when adjusting via keyboard arrow keys */
  onStepChange?: (delta: number) => void;
}

/**
 * Enterprise Reusable `PanelResizer` Component
 * ---------------------------------------------
 * Drag resizer handle with theme indicator pill and full keyboard & touch accessibility.
 * Single source of truth for all sidebars, split views, drawers, and modal studios.
 */
export const PanelResizer: React.FC<PanelResizerProps> = ({
  onStartResize,
  onResetResize,
  position = 'left',
  orientation = 'vertical',
  isResizing = false,
  title = 'Drag to resize (Double-click to toggle size)',
  className = '',
  indicatorClassName = '',
  currentWidth,
  onStepChange,
}) => {
  if (!onStartResize) return null;

  const isVertical = orientation === 'vertical';

  const positionClasses = {
    left: 'top-0 left-0 bottom-0 w-3 -ml-1.5 cursor-col-resize',
    right: 'top-0 right-0 bottom-0 w-3 -mr-1.5 cursor-col-resize',
    top: 'top-0 left-0 right-0 h-3 -mt-1.5 cursor-row-resize',
    bottom: 'bottom-0 left-0 right-0 h-3 -mb-1.5 cursor-row-resize',
  }[position] || 'top-0 left-0 bottom-0 w-3 -ml-1.5 cursor-col-resize';

  const pillClasses = isVertical
    ? 'w-1.5 h-14 rounded-full'
    : 'h-1.5 w-14 rounded-full';

  // Keyboard accessibility handler
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onResetResize?.();
      } else if (onStepChange) {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
          e.preventDefault();
          onStepChange(position === 'left' ? 20 : -20);
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
          e.preventDefault();
          onStepChange(position === 'left' ? -20 : 20);
        }
      }
    },
    [onResetResize, onStepChange, position]
  );

  return (
    <div
      tabIndex={0}
      onMouseDown={onStartResize}
      onTouchStart={onStartResize}
      onDoubleClick={onResetResize}
      onKeyDown={handleKeyDown}
      className={`hidden md:flex absolute z-40 group items-center justify-center select-none touch-none ${positionClasses} ${
        isResizing
          ? 'bg-[var(--accent-main)]/35'
          : 'hover:bg-[var(--accent-main)]/20 active:bg-[var(--accent-main)]/40 focus:outline-none focus:ring-1 focus:ring-[var(--accent-main)]'
      } transition-colors ${className}`}
      title={title}
      role="separator"
      aria-orientation={orientation}
      aria-valuenow={currentWidth}
      aria-label="Sidebar Resizer Handle"
    >
      <div
        className={`${pillClasses} theme-bg-accent ${
          isResizing ? 'opacity-100 scale-105 shadow-md' : 'opacity-60 group-hover:opacity-100'
        } transition-all shadow-xs ${indicatorClassName}`}
      />
    </div>
  );
};

export default PanelResizer;
