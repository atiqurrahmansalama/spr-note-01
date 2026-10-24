import React, { useState } from 'react';
import { ChevronIcon, CloseIcon } from './Icons';

export interface FilterBoxScopeItem {
  label: string;
  value?: React.ReactNode;
}

export interface FilterBoxRenderProps {
  moreButton: React.ReactNode;
  isExpanded: boolean;
  hasVisibleScope: boolean;
}

export interface FilterBoxProps {
  /**
   * Layout presentation variant:
   * - 'card' (default): Full multi-column responsive card container with primary/secondary rows & collapsible drawer.
   * - 'bar': Single-line inline flex row for compact table toolbars with optional one-click Reset button.
   */
  variant?: 'card' | 'bar';

  /** Optional container class overrides */
  className?: string;

  /** Whether to wrap in a theme surface card border in 'card' mode (default: true) */
  showCardWrapper?: boolean;

  /** Primary row controls (always visible, typically a responsive grid of primary search/date/status fields) */
  primaryRow?: React.ReactNode;

  /** Secondary row controls (expanded/collapsed via More button) */
  secondaryRow?: React.ReactNode;

  /** Collapsible behavior configuration */
  collapsible?: boolean;
  defaultExpanded?: boolean;
  expanded?: boolean;
  onToggleExpanded?: (nextExpanded: boolean) => void;
  moreLabel?: string;
  hideMoreLabel?: string;

  /** Scope summary displayed in the footer bar when collapsed */
  scopeSummary?: React.ReactNode;
  scopeItems?: FilterBoxScopeItem[];
  scopeLabel?: string;

  /** Optional Reset All Filters button */
  hasActiveFilters?: boolean;
  onResetFilters?: () => void;
  onReset?: () => void;
  activeFilterCount?: number;
  activeCount?: number;
  resetLabel?: string;

  /** Custom actions rendered beside the More toggle button in the footer bar */
  footerActions?: React.ReactNode;

  /** Bottom content slot (e.g. Table action toolbars, result metrics, batch controls, or inline items if in 'bar' mode) */
  children?: React.ReactNode | ((props: FilterBoxRenderProps) => React.ReactNode);
}

/**
 * Enterprise Reusable FilterBox & FilterBar
 * Universal UI container for any module's filter controls.
 * Supports:
 * 1. 'card' variant: Multi-row container with primary row, collapsible drawer, scope summary, and bottom slot.
 * 2. 'bar' variant: Compact single-row flex layout with inline reset button for table headers.
 */
export default function FilterBox({
  variant = 'card',
  className = '',
  showCardWrapper = true,
  primaryRow,
  secondaryRow,
  collapsible = true,
  defaultExpanded = false,
  expanded: controlledExpanded,
  onToggleExpanded,
  moreLabel = 'More',
  hideMoreLabel = 'Hide More',
  scopeSummary,
  scopeItems = [],
  scopeLabel = 'Selected Scope:',
  hasActiveFilters = false,
  onResetFilters,
  onReset,
  activeFilterCount,
  activeCount,
  resetLabel = 'Reset',
  footerActions,
  children,
}: FilterBoxProps) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

  const effectiveReset = onResetFilters || onReset;
  const effectiveCount = activeFilterCount ?? activeCount ?? 0;

  // ── 1. Inline Toolbar Bar Variant ('bar') ──
  if (variant === 'bar') {
    const barChildren = typeof children === 'function' ? children({ moreButton: null, isExpanded: false, hasVisibleScope: false }) : children;
    return (
      <div className={`flex items-center gap-2 py-0.5 min-w-0 max-w-full flex-1 flex-wrap ${className}`}>
        <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
          {primaryRow || barChildren}
        </div>

        {hasActiveFilters && effectiveReset && (
          <button
            type="button"
            onClick={effectiveReset}
            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold theme-bg-sub border theme-border theme-text-secondary hover:theme-text-primary transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs hover:theme-bg-elevated select-none"
            title="Reset all active filters"
          >
            <CloseIcon className="w-3 h-3 theme-accent" />
            <span>{resetLabel}</span>
            {effectiveCount > 0 && (
              <span className="w-4 h-4 rounded-full theme-bg-accent theme-accent-text text-[9px] font-bold flex items-center justify-center">
                {effectiveCount}
              </span>
            )}
          </button>
        )}
      </div>
    );
  }

  // ── 2. Full Multi-Row Card Box Variant ('card') ──
  const handleToggle = () => {
    const next = !isExpanded;
    if (onToggleExpanded) {
      onToggleExpanded(next);
    } else {
      setInternalExpanded(next);
    }
  };

  const hasSecondary = Boolean(secondaryRow);
  const hasActiveScopeItems =
    Array.isArray(scopeItems) && scopeItems.some((item) => item && Boolean(item.value));
  const hasVisibleScope = !isExpanded && (Boolean(scopeSummary) || hasActiveScopeItems);

  const renderMoreButton = (customClass = '') => {
    if (!collapsible || !hasSecondary) return null;
    return (
      <button
        type="button"
        onClick={handleToggle}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl theme-bg-sub hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary border theme-border transition-colors cursor-pointer active:scale-95 text-xs font-semibold select-none ${customClass}`}
        title={isExpanded ? hideMoreLabel : moreLabel}
      >
        <span>{isExpanded ? hideMoreLabel : moreLabel}</span>
        <ChevronIcon isOpen={isExpanded} className="w-3 h-3 theme-text-secondary" />
      </button>
    );
  };

  const renderResetButton = () => {
    if (!hasActiveFilters || !effectiveReset) return null;
    return (
      <button
        type="button"
        onClick={effectiveReset}
        className="flex items-center gap-1 px-2.5 py-1 rounded-xl theme-bg-sub hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary border theme-border transition-colors cursor-pointer text-xs font-semibold select-none shadow-2xs"
        title="Reset active filters"
      >
        <CloseIcon className="w-3 h-3 theme-accent" />
        <span>{resetLabel}</span>
        {effectiveCount > 0 && (
          <span className="w-4 h-4 rounded-full theme-bg-accent theme-accent-text text-[9px] font-bold flex items-center justify-center">
            {effectiveCount}
          </span>
        )}
      </button>
    );
  };

  const renderedChildren =
    typeof children === 'function'
      ? children({
          moreButton: !hasVisibleScope ? renderMoreButton() : null,
          isExpanded,
          hasVisibleScope,
        })
      : children;

  const content = (
    <>
      {/* 1. Primary Row (Always Visible) */}
      {primaryRow && (
        <div className="w-full min-w-0">
          {primaryRow}
        </div>
      )}

      {/* 2. Secondary Collapsible Row (Clean grid flow, zero border line separating primary and secondary) */}
      {hasSecondary && (!collapsible || isExpanded) && (
        <div className="w-full min-w-0 animate-fade-in">
          {secondaryRow}
        </div>
      )}

      {/* 3. Scope Summary Line (Visible ONLY when collapsed AND active scope items exist) */}
      {hasVisibleScope && (
        <div className="pt-2.5 border-t theme-border flex items-center justify-between text-xs font-medium theme-text-secondary flex-wrap gap-2 animate-fade-in select-none">
          {/* Left: Selected Scope Summary */}
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            {scopeSummary ? (
              scopeSummary
            ) : (
              <>
                {scopeLabel && (
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                    {scopeLabel}
                  </span>
                )}
                {scopeItems
                  .filter((item) => item && Boolean(item.value))
                  .map((item, idx, arr) => (
                    <React.Fragment key={`${item.label}-${idx}`}>
                      <span className="text-xs font-normal">
                        {item.label}: <strong className="theme-text-primary font-semibold">{item.value}</strong>
                      </span>
                      {idx < arr.length - 1 && <span className="opacity-40">·</span>}
                    </React.Fragment>
                  ))}
              </>
            )}
          </div>

          {/* Right: Actions, Reset & More Button (seated directly on this line) */}
          <div className="flex items-center gap-2 ml-auto shrink-0">
            {footerActions}
            {renderResetButton()}
            {renderMoreButton()}
          </div>
        </div>
      )}

      {/* 4. Bottom Content / Children (Toolbars, Metrics, Routine Periods, etc.) */}
      {renderedChildren}

      {/* 5. Fallback Next Line for More/Reset Button if collapsed with no scope items and no children */}
      {!hasVisibleScope && (collapsible && hasSecondary) && !children && (
        <div className="pt-2 border-t theme-border flex items-center justify-end gap-2 text-xs select-none animate-fade-in">
          {footerActions}
          {renderResetButton()}
          {renderMoreButton()}
        </div>
      )}
    </>
  );

  if (showCardWrapper) {
    return (
      <div
        className={`@container p-3 sm:p-4 rounded-2xl theme-bg-surface border theme-border shadow-xs space-y-3 w-full min-w-0 ${className}`}
      >
        {content}
      </div>
    );
  }

  return (
    <div className={`@container w-full min-w-0 space-y-3 ${className}`}>
      {content}
    </div>
  );
}

/**
 * Enterprise Reusable FilterBar
 * Inline toolbar variant powered by FilterBox
 */
export function FilterBar(props: FilterBoxProps) {
  return <FilterBox variant="bar" {...props} />;
}
