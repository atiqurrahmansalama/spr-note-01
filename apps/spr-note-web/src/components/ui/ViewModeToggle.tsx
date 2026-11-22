import React from 'react';
import { TableIcon, Squares2X2Icon } from './Icons';

export interface ViewModeToggleProps {
  /** Current active view mode ('table' or 'grid') */
  viewMode: 'table' | 'grid';
  /** Callback fired with the next inverted mode */
  onChange?: (mode: 'table' | 'grid') => void;
  /** Legacy or direct toggle callback without argument */
  onToggle?: () => void;
  /** Text label displayed when switched to Table View */
  tableLabel?: string;
  /** Text label displayed when switched to Card Grid */
  cardsLabel?: string;
  /** Additional custom class names */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

/**
 * Enterprise Reusable View Mode Toggle Button
 * Matches the project-wide single-click Table / Cards switcher standard (as used in Staff Roster & DataViewToolbar).
 */
export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
  viewMode,
  onChange,
  onToggle,
  tableLabel = 'Table View',
  cardsLabel = 'Card Grid',
  className = '',
  disabled = false,
}) => {
  const handleToggle = () => {
    if (disabled) return;
    const nextMode = viewMode === 'grid' ? 'table' : 'grid';
    if (onChange) {
      onChange(nextMode);
    } else if (onToggle) {
      onToggle();
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={disabled}
      className={`px-3.5 py-2.5 rounded-2xl text-xs font-semibold theme-bg-tile border-0 hover:theme-bg-elevated/75 theme-text-secondary hover:theme-text-primary transition flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0 select-none disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      title={viewMode === 'grid' ? `Switch to ${tableLabel}` : `Switch to ${cardsLabel}`}
      aria-label={viewMode === 'grid' ? `Switch to ${tableLabel}` : `Switch to ${cardsLabel}`}
    >
      {viewMode === 'grid' ? (
        <>
          <TableIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
          <span>{tableLabel}</span>
        </>
      ) : (
        <>
          <Squares2X2Icon className="w-3.5 h-3.5 theme-accent shrink-0" />
          <span>{cardsLabel}</span>
        </>
      )}
    </button>
  );
};

export default ViewModeToggle;
