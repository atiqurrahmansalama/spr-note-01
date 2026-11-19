import React from 'react';
import { CheckIcon, CloseIcon, SpinnerIcon } from './Icons';
import { IconButtonVariant } from './IconButton';

export interface SelectionActionItem {
  id: string;
  label: string; // Tooltip / Accessible name / Button text
  shortLabel?: string; // Optional shorter label on tablets
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: IconButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export interface SelectionActionBarProps {
  selectedCount: number;
  totalCount?: number;
  selectedLabel?: string;
  onToggleSelectAll?: () => void;
  onClearSelection?: () => void;
  actions: SelectionActionItem[];
  className?: string;
  size?: 'xs' | 'sm' | 'md';
  fullWidth?: boolean;
  showLabelsOnDesktop?: boolean;
  bordered?: boolean;
}

/**
 * Resolves standard styling classes for action buttons inside the action bar
 * adhering strictly to the enterprise theme design tokens.
 */
function getActionVariantClasses(variant: IconButtonVariant = 'ghost'): string {
  switch (variant) {
    case 'accent':
      return 'theme-bg-accent theme-accent-text hover:brightness-110 active:brightness-95 shadow-2xs';
    case 'accent-soft':
      return 'theme-bg-accent-soft theme-accent hover:theme-bg-accent hover:theme-accent-text';
    case 'danger':
    case 'danger-soft':
      return 'bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 active:bg-rose-500/25';
    case 'success':
    case 'success-soft':
      return 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 active:bg-emerald-500/25';
    case 'sub':
      return 'theme-bg-sub border theme-border theme-text-secondary hover:theme-text-primary hover:bg-current/[0.06]';
    case 'outline':
      return 'bg-transparent border theme-border theme-text-secondary hover:theme-text-primary hover:bg-current/[0.06]';
    case 'filled':
      return 'theme-bg-elevated theme-text-primary hover:opacity-90';
    case 'ghost':
    default:
      return 'bg-transparent theme-text-secondary hover:theme-text-primary hover:bg-current/[0.08]';
  }
}

/**
 * Enterprise Reusable Selection Action Bar
 * -------------------------------------------------------------
 * Google Drive-style selection toolbar that can replace regular header/footer rows.
 * Features:
 * - Selected count indicator with clickable Select/Deselect All toggle
 * - Responsive action buttons: Icon-only on mobile, Icon + Text Label on larger screens (sm+)
 * - Clear selection button
 * - Seamless adherence to project theme tokens
 */
export default function SelectionActionBar({
  selectedCount,
  totalCount,
  selectedLabel = 'Selected',
  onToggleSelectAll,
  onClearSelection,
  actions = [],
  className = '',
  size = 'sm',
  fullWidth = false,
  showLabelsOnDesktop = true,
  bordered = true,
}: SelectionActionBarProps) {
  if (selectedCount <= 0) return null;

  const isAllSelected = Boolean(totalCount && selectedCount === totalCount);
  const borderClass = bordered ? 'border theme-border shadow-xs' : 'border-0 shadow-none';

  if (fullWidth) {
    return (
      <div
        role="toolbar"
        aria-label="Selection Actions"
        className={`w-full flex flex-wrap items-center justify-between gap-2 p-1.5 px-3 rounded-xl theme-bg-sub/90 ${borderClass} animate-fade-in select-none ${className}`}
      >
        {/* Left: Selected Count Indicator & Active View Context */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onToggleSelectAll || onClearSelection}
            className="flex items-center gap-1.5 py-1 px-2.5 rounded-lg theme-bg-sub/80 border theme-border hover:theme-bg-elevated transition cursor-pointer text-xs font-semibold shrink-0"
            title={
              onToggleSelectAll
                ? isAllSelected
                  ? 'Deselect All'
                  : totalCount
                  ? `Select All (${totalCount})`
                  : 'Toggle Select All'
                : 'Clear Selection'
            }
          >
            <CheckIcon className="w-3.5 h-3.5 theme-text-primary shrink-0" />
            <span className="theme-text-primary font-bold whitespace-nowrap">
              {selectedCount} {selectedLabel}
            </span>
          </button>

          {totalCount ? (
            <span className="text-[11px] font-semibold theme-text-secondary truncate hidden xs:inline sm:inline">
              (Total {totalCount} records in active view)
            </span>
          ) : null}
        </div>

        {/* Right: Responsive Action Buttons (Icon on mobile, Icon + Text on Desktop) + Clear Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          {actions.map((act) => {
            const IconComp = act.icon;
            const variantClasses = getActionVariantClasses(act.variant);
            return (
              <button
                key={act.id}
                type="button"
                onClick={act.onClick}
                disabled={act.disabled || act.loading}
                title={act.label}
                aria-label={act.label}
                className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses} ${
                  act.className || ''
                }`}
              >
                {act.loading ? (
                  <SpinnerIcon className="w-3.5 h-3.5 shrink-0 animate-spin" />
                ) : (
                  <IconComp className="w-3.5 h-3.5 shrink-0" />
                )}
                {showLabelsOnDesktop && (
                  <span className="hidden sm:inline whitespace-nowrap">
                    {act.shortLabel || act.label}
                  </span>
                )}
              </button>
            );
          })}

          {onClearSelection && (
            <>
              <span className="h-4 w-px bg-zinc-300 dark:bg-zinc-700/50 shrink-0 mx-1" />
              <button
                type="button"
                onClick={onClearSelection}
                title="Clear selection"
                aria-label="Clear selection"
                className="inline-flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold theme-text-secondary hover:theme-text-primary hover:bg-current/[0.08] transition cursor-pointer"
              >
                <CloseIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // Inline / Compact Mode
  return (
    <div
      role="toolbar"
      aria-label="Selection Actions"
      className={`inline-flex items-center gap-1.5 p-1 px-2 rounded-xl theme-bg-sub/90 ${borderClass} animate-fade-in select-none ${className}`}
    >
      {/* 1. Selected Count Indicator (Clickable to Toggle Select All / Deselect) */}
      <button
        type="button"
        onClick={onToggleSelectAll || onClearSelection}
        className="flex items-center gap-1.5 py-0.5 px-1.5 rounded-lg theme-text-secondary hover:theme-text-primary transition cursor-pointer text-xs font-semibold"
        title={
          onToggleSelectAll
            ? isAllSelected
              ? 'Deselect All'
              : totalCount
              ? `Select All (${totalCount})`
              : 'Toggle Select All'
            : 'Clear Selection'
        }
      >
        <CheckIcon className="w-3.5 h-3.5 theme-text-primary shrink-0" />
        <span className="theme-text-primary font-bold whitespace-nowrap">
          {selectedCount} {selectedLabel}
        </span>
      </button>

      {/* 2. Vertical Divider */}
      {actions.length > 0 && (
        <span className="h-4 w-px bg-zinc-300 dark:bg-zinc-700/70 shrink-0" />
      )}

      {/* 3. Action Buttons */}
      <div className="flex items-center gap-1 shrink-0">
        {actions.map((act) => {
          const IconComp = act.icon;
          const variantClasses = getActionVariantClasses(act.variant);
          return (
            <button
              key={act.id}
              type="button"
              onClick={act.onClick}
              disabled={act.disabled || act.loading}
              title={act.label}
              aria-label={act.label}
              className={`inline-flex items-center justify-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses} ${
                act.className || ''
              }`}
            >
              {act.loading ? (
                <SpinnerIcon className="w-3.5 h-3.5 shrink-0 animate-spin" />
              ) : (
                <IconComp className="w-3.5 h-3.5 shrink-0" />
              )}
              {showLabelsOnDesktop && (
                <span className="hidden sm:inline whitespace-nowrap">
                  {act.shortLabel || act.label}
                </span>
              )}
            </button>
          );
        })}

        {/* 4. Clear Selection Button */}
        {onClearSelection && (
          <>
            <span className="h-3.5 w-px bg-zinc-300 dark:bg-zinc-700/50 shrink-0 mx-0.5" />
            <button
              type="button"
              onClick={onClearSelection}
              title="Clear selection"
              aria-label="Clear selection"
              className="inline-flex items-center justify-center p-1 rounded-lg text-xs font-semibold theme-text-secondary hover:theme-text-primary hover:bg-current/[0.08] transition cursor-pointer"
            >
              <CloseIcon className="w-3.5 h-3.5 shrink-0" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
