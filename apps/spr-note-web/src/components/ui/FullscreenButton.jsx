import React from 'react';
import { FullScreenIcon, MinimizeIcon } from './Icons';

/**
 * Universal Fullscreen Toggle Button Component
 * Reusable across tables, charts, registers, calendars, and dashboards.
 *
 * @param {Object} props
 * @param {boolean} props.isFullscreen - Current fullscreen status
 * @param {Function} props.onToggle - Handler function to toggle fullscreen
 * @param {boolean} [props.showLabel=false] - Whether to display text label alongside the icon
 * @param {string} [props.fullscreenLabel='Full Screen'] - Label when not in fullscreen
 * @param {string} [props.minimizeLabel='Minimize'] - Label when in fullscreen
 * @param {string} [props.size='sm'] - Size variant ('xs', 'sm', 'md')
 * @param {string} [props.className=''] - Additional Tailwind CSS classes
 * @param {string} [props.title] - Optional override title tooltip
 */
export default function FullscreenButton({
  isFullscreen = false,
  onToggle,
  showLabel = false,
  fullscreenLabel = 'Full Screen',
  minimizeLabel = 'Minimize',
  size = 'sm',
  className = '',
  title,
}) {
  if (!onToggle) return null;

  const sizeClasses = {
    xs: 'px-2 py-1 text-[11px] gap-1 rounded-lg',
    sm: 'px-2.5 py-1.5 text-xs gap-1.5 rounded-xl',
    md: 'px-3 py-2 text-sm gap-2 rounded-xl',
  };

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
  };

  const defaultTitle = isFullscreen
    ? 'Exit Full Screen View (Esc)'
    : 'Enter Full Screen View';

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center justify-center font-semibold theme-bg-sub hover:theme-bg-elevated border theme-border theme-text-primary transition-all cursor-pointer shadow-xs active:scale-95 select-none ${
        sizeClasses[size] || sizeClasses.sm
      } ${className}`}
      title={title || defaultTitle}
      aria-label={isFullscreen ? minimizeLabel : fullscreenLabel}
    >
      {isFullscreen ? (
        <>
          <MinimizeIcon className={`${iconSizes[size] || iconSizes.sm} theme-accent shrink-0`} />
          {showLabel && <span>{minimizeLabel}</span>}
        </>
      ) : (
        <>
          <FullScreenIcon className={`${iconSizes[size] || iconSizes.sm} theme-accent shrink-0`} />
          {showLabel && <span>{fullscreenLabel}</span>}
        </>
      )}
    </button>
  );
}
