/**
 * SPR Note — CollapsibleCard UI Component
 * =========================================
 * Enterprise reusable collapsible card container with built-in accordion support.
 * Features:
 * - Pure project design tokens (no hardcoded styles)
 * - Clickable header with smooth chevron toggle
 * - Safe action slot with automatic event propagation stop
 * - Accessible keyboard navigation (Enter / Space, aria-expanded)
 * - Optional localStorage persistence for expansion state
 * - Smooth fade-in animation for expanded children
 */

import React, { useState, useCallback } from 'react';
import { ChevronIcon } from './Icons';

export interface CollapsibleCardProps {
  /** Optional icon rendered in header */
  icon?: React.ComponentType<{ className?: string }>;
  /** Card primary title */
  title?: React.ReactNode;
  /** Subtitle or secondary metadata */
  subtitle?: React.ReactNode;
  /** Badge next to title */
  badge?: React.ReactNode;
  /** Right-side actions (e.g. ActionMenu, buttons) */
  headerRight?: React.ReactNode;
  /** Custom header renderer override (bypasses default header layout) */
  renderHeader?: (isExpanded: boolean, toggle: () => void) => React.ReactNode;
  /** Whether the card is collapsible (default: true) */
  collapsible?: boolean;
  /** Initial expansion state (default: false) */
  defaultExpanded?: boolean;
  /** Controlled expansion state */
  expanded?: boolean;
  /** Callback fired on expand/collapse toggle */
  onToggle?: (isExpanded: boolean) => void;
  /** Storage key to persist expanded state in localStorage */
  storageKey?: string;
  /** Outer container className */
  className?: string;
  /** Header bar className */
  headerClassName?: string;
  /** Body container className */
  bodyClassName?: string;
  /** Children rendered when expanded */
  children?: React.ReactNode;
}

export default function CollapsibleCard({
  icon: Icon,
  title,
  subtitle,
  badge,
  headerRight,
  renderHeader,
  collapsible = true,
  defaultExpanded = false,
  expanded: controlledExpanded,
  onToggle,
  storageKey,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  children,
}: CollapsibleCardProps) {
  const [internalExpanded, setInternalExpanded] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && storageKey && collapsible) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved !== null) {
          return JSON.parse(saved) === true;
        }
      } catch {
        // Fallback to default
      }
    }
    return defaultExpanded;
  });

  const isControlled = controlledExpanded !== undefined;
  const isExpanded = collapsible ? (isControlled ? controlledExpanded : internalExpanded) : true;

  const handleToggle = useCallback(() => {
    if (!collapsible) return;
    const next = !isExpanded;
    if (isControlled) {
      onToggle?.(next);
    } else {
      setInternalExpanded(next);
      if (typeof window !== 'undefined' && storageKey) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // Ignore storage errors
        }
      }
      onToggle?.(next);
    }
  }, [collapsible, isExpanded, isControlled, onToggle, storageKey]);

  return (
    <div
      className={`rounded-2xl border theme-border theme-bg-surface shadow-xs transition-all overflow-hidden ${className}`}
    >
      {/* ─── Header Bar ────────────────────────────────────────────── */}
      {renderHeader ? (
        renderHeader(isExpanded, handleToggle)
      ) : (
        <div
          role={collapsible ? 'button' : undefined}
          tabIndex={collapsible ? 0 : undefined}
          aria-expanded={collapsible ? isExpanded : undefined}
          onClick={collapsible ? handleToggle : undefined}
          onKeyDown={
            collapsible
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleToggle();
                  }
                }
              : undefined
          }
          className={`p-4 sm:p-5 flex items-center justify-between gap-3 select-none transition-colors ${
            collapsible ? 'cursor-pointer hover:theme-bg-sub/30' : ''
          } ${headerClassName}`}
        >
          {/* Left: Icon, Title, Badge, Subtitle */}
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            {Icon && (
              <div className="w-10 h-10 rounded-xl theme-bg-sub border theme-border flex items-center justify-center shrink-0 theme-accent">
                <Icon className="w-5 h-5" />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {title && (
                  <h3 className="text-base sm:text-lg font-bold theme-text-primary truncate">
                    {title}
                  </h3>
                )}
                {badge}
              </div>
              {subtitle && (
                <div className="text-xs font-mono theme-text-secondary mt-1 flex items-center gap-2 flex-wrap">
                  {subtitle}
                </div>
              )}
            </div>
          </div>

          {/* Right: Actions & Collapse Chevron */}
          <div className="flex items-center gap-2 shrink-0">
            {headerRight && (
              <div
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                {headerRight}
              </div>
            )}

            {collapsible && (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition-colors"
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                <ChevronIcon isOpen={isExpanded} className="w-4 h-4" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Expandable Body ───────────────────────────────────────── */}
      {isExpanded && children && (
        <div className={`p-4 sm:p-5 pt-0 border-t theme-border space-y-4 animate-fade-in ${bodyClassName}`}>
          {children}
        </div>
      )}
    </div>
  );
}
