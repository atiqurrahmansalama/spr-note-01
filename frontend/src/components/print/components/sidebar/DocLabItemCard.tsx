import React, { useState } from 'react';
import { ChevronIcon } from '../../../../components/ui/Icons';

export interface DocLabItemCardProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  titleClassName?: string;
  titleTooltip?: string;
  indicator?: React.ReactNode;
  badge?: React.ReactNode;
  badgePosition?: 'start' | 'end';
  description?: React.ReactNode;
  actions?: React.ReactNode;
  isActive?: boolean;
  isClickable?: boolean;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  expanded?: boolean;
  storageKey?: string;
  onToggle?: (expanded: boolean) => void;
  borderVariant?: 'default' | 'subtle' | 'accent' | 'amber';
  onClick?: (e: React.MouseEvent) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  className?: string;
  children?: React.ReactNode;
}

/**
 * DocLabItemCard
 * Enterprise 2-line reusable sidebar item card used across Presets (Templates), Tokens (Keys), and Rules.
 * - Line 1: Title (Template name / Token / Rule) + Indicator (Default star) + Status/Type Badge
 * - Line 2: Description / Subtitle / Live value
 * - Right: Action controls (ActionMenu / Copy Button / Collapsible Chevron)
 * - Left: Optional Icon (Included in Presets, omitted in Tokens)
 * - Collapsible: Built-in accordion collapse & expand support with smooth animation and optional localStorage persistence
 * - Bottom (optional): Parameter inputs or children container
 */
export const DocLabItemCard: React.FC<DocLabItemCardProps> = ({
  icon,
  title,
  titleClassName = '',
  titleTooltip,
  indicator,
  badge,
  badgePosition = 'end',
  description,
  actions,
  isActive = false,
  isClickable,
  collapsible = false,
  defaultExpanded = true,
  expanded,
  storageKey,
  onToggle,
  borderVariant = 'default',
  onClick,
  onMouseDown,
  className = '',
  children,
}) => {
  const [isInternalExpanded, setIsInternalExpanded] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && storageKey && collapsible) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved !== null) {
          return JSON.parse(saved) === true;
        }
      } catch (err) {
        // Fallback to default
      }
    }
    return defaultExpanded;
  });
  const isExpanded = expanded !== undefined ? expanded : isInternalExpanded;

  const handleToggle = (e: React.MouseEvent) => {
    if (!collapsible) return;
    e.stopPropagation();
    const next = !isExpanded;
    if (expanded === undefined) {
      setIsInternalExpanded(next);
      if (typeof window !== 'undefined' && storageKey) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch (err) {
          // Ignore
        }
      }
    }
    onToggle?.(next);
  };

  const isInteractive = isClickable !== undefined ? isClickable : Boolean(onClick || collapsible);

  let stateClasses = isInteractive
    ? 'theme-bg-surface theme-border-subtle hover:theme-border-accent-soft hover:theme-bg-sub/30 cursor-pointer'
    : 'theme-bg-surface theme-border-subtle cursor-default';

  if (isActive) {
    stateClasses = 'theme-bg-accent-soft theme-border-accent-soft shadow-xs cursor-pointer';
  } else if (borderVariant === 'amber') {
    stateClasses = isInteractive
      ? 'border-amber-500/30 theme-bg-sub/80 hover:border-amber-500/60 cursor-pointer'
      : 'border-amber-500/30 theme-bg-sub/80 cursor-default';
  } else if (borderVariant === 'accent') {
    stateClasses = isInteractive
      ? 'theme-border-accent-soft theme-bg-accent-soft/30 hover:theme-border-accent-soft cursor-pointer'
      : 'theme-border-accent-soft theme-bg-accent-soft/30 cursor-default';
  }

  const handleCardClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick(e);
    } else if (collapsible) {
      handleToggle(e);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      onMouseDown={onMouseDown}
      className={`group relative p-2.5 rounded-xl border transition-all select-none flex flex-col gap-2 ${stateClasses} ${className}`}
    >
      <div className="flex items-center justify-between gap-2.5 w-full">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Optional Icon (Rendered in Presets, omitted in Tokens) */}
          {icon && (
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                isActive
                  ? 'theme-bg-accent text-white shadow-xs'
                  : 'theme-bg-sub theme-text-secondary group-hover:theme-accent'
              }`}
            >
              {icon}
            </div>
          )}

          {/* 2-Line Content Body */}
          <div className="min-w-0 flex-1 text-left">
            {/* Line 1: Title, Indicator, and Badge */}
            <div className="flex items-center gap-1.5 min-w-0">
              {badge && badgePosition === 'start' && (
                <div className="shrink-0 flex items-center">{badge}</div>
              )}

              <span
                className={`text-xs truncate ${
                  titleClassName && /font-/.test(titleClassName) ? '' : 'font-semibold'
                } ${
                  isActive ? 'theme-accent font-bold' : 'theme-text-primary'
                } ${titleClassName}`}
                title={titleTooltip || (typeof title === 'string' ? title : undefined)}
              >
                {title}
              </span>

              {indicator && <div className="shrink-0 flex items-center">{indicator}</div>}
              {badge && badgePosition !== 'start' && (
                <div className="shrink-0 flex items-center">{badge}</div>
              )}
            </div>

            {/* Line 2: Description / Subtitle */}
            {description && (
              <p className="text-[11px] theme-text-secondary truncate mt-0.5 leading-tight">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Right Action Controls & Collapsible Toggle Button */}
        {(actions || collapsible) && (
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            {actions}
            {collapsible && (
              <button
                type="button"
                onClick={handleToggle}
                className="w-6 h-6 rounded-lg flex items-center justify-center theme-text-secondary hover:theme-text-primary hover:theme-bg-sub/80 transition-colors cursor-pointer"
                title={isExpanded ? 'Click to collapse' : 'Click to expand'}
                aria-label={isExpanded ? 'Collapse card' : 'Expand card'}
              >
                <ChevronIcon
                  isOpen={isExpanded}
                  className="w-3.5 h-3.5 transition-transform duration-200"
                />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Optional Children / Parameters Row (Rendered when expanded) */}
      {children && isExpanded && (
        <div
          className="w-full pt-2 border-t theme-border-subtle animate-fade-in"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export default DocLabItemCard;
