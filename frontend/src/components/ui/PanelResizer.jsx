import React from 'react';

/**
 * PanelResizer
 * Enterprise Reusable Drag Resizer Handle with Theme Indicator Pill.
 * Single source of truth for all sidebars, split views, drawers, and modal studios.
 *
 * @param {Object} props
 * @param {Function} props.onStartResize - MouseDown / TouchStart drag initializer
 * @param {Function} [props.onResetResize] - Double click handler to reset/toggle width
 * @param {'left'|'right'|'top'|'bottom'} [props.position='left'] - Edge attachment position
 * @param {'vertical'|'horizontal'} [props.orientation='vertical'] - Drag direction
 * @param {boolean} [props.isResizing=false] - Whether actively being dragged
 * @param {string} [props.title] - Accessible tooltip text
 * @param {string} [props.className] - Additional wrapper CSS classes
 * @param {string} [props.indicatorClassName] - Additional indicator pill CSS classes
 */
export default function PanelResizer({
  onStartResize = undefined,
  onResetResize = undefined,
  position = 'left',
  orientation = 'vertical',
  isResizing = false,
  title = 'Drag left or right to resize sidebar width (Double click to toggle size)',
  className = '',
  indicatorClassName = '',
}) {
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

  return (
    <div
      onMouseDown={onStartResize}
      onTouchStart={onStartResize}
      onDoubleClick={onResetResize}
      className={`hidden md:flex absolute z-40 group items-center justify-center select-none touch-none ${positionClasses} ${
        isResizing
          ? 'bg-[var(--accent-main)]/35'
          : 'hover:bg-[var(--accent-main)]/20 active:bg-[var(--accent-main)]/40'
      } transition-colors ${className}`}
      title={title}
      role="separator"
      aria-orientation={orientation}
    >
      <div
        className={`${pillClasses} theme-bg-accent ${
          isResizing ? 'opacity-100 scale-105' : 'opacity-60 group-hover:opacity-100'
        } transition-all shadow-sm ${indicatorClassName}`}
      />
    </div>
  );
}
