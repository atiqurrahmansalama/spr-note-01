import React, { useState } from 'react';
import { ChevronIcon } from './Icons';

/**
 * CollapsibleCard / CollapsibleSection
 * Enterprise High-Level Reusable Expandable/Collapsible Card Component.
 * 
 * Complies with SPR Note Enterprise Engineering Guidelines:
 * - 100% Theme Tokens & Zero Hardcoded Colors
 * - Full Mobile / Tablet / Desktop Responsiveness with Container Queries (@container)
 * - Safe Event Propagation for Header Action Buttons
 * - Accessible aria-expanded and keyboard navigation
 * 
 * @param {Object} props
 * @param {string|React.ReactNode} props.title - Primary title
 * @param {string|React.ReactNode} [props.subtitle] - Secondary description
 * @param {React.ComponentType} [props.icon] - Header icon component
 * @param {string|number|React.ReactNode} [props.badge] - Main badge / count pill
 * @param {React.ReactNode} [props.headerRight] - Action buttons (e.g. Add, Presets)
 * @param {React.ReactNode} [props.summaryBar] - Secondary summary stats bar (always visible or when collapsed)
 * @param {boolean} [props.defaultExpanded=true] - Initial expanded state (uncontrolled)
 * @param {boolean} [props.expanded] - Controlled expanded state
 * @param {function} [props.onToggle] - Controlled toggle callback
 * @param {'bordered'|'subtle'|'surface'|'card'|'streamlined'} [props.variant='bordered'] - Visual styling variant
 * @param {string} [props.className=''] - Additional outer container CSS classes
 * @param {string} [props.headerClassName=''] - Additional header CSS classes
 * @param {string} [props.bodyClassName=''] - Additional body CSS classes
 * @param {React.ReactNode} props.children - Collapsible content
 */
export default function CollapsibleCard({
  title,
  subtitle,
  icon: Icon,
  badge,
  headerRight,
  summaryBar,
  defaultExpanded = true,
  expanded: controlledExpanded,
  onToggle,
  hideHeaderRightOnCollapse = true,
  variant = 'bordered',
  className = '',
  headerClassName = '',
  bodyClassName = '',
  children,
  ...rest
}) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isControlled = controlledExpanded !== undefined;
  const isExpanded = isControlled ? controlledExpanded : internalExpanded;

  const handleToggle = (e) => {
    // If target is inside an interactive element with stopPropagation, do nothing
    if (isControlled) {
      onToggle?.(!isExpanded);
    } else {
      setInternalExpanded((prev) => {
        const next = !prev;
        onToggle?.(next);
        return next;
      });
    }
  };

  // Visual container variant mapping
  const containerVariantClasses = {
    bordered: 'rounded-2xl border theme-border theme-bg-sub/10 shadow-2xs',
    subtle: 'rounded-2xl border theme-border theme-bg-sub/20 shadow-2xs',
    surface: 'rounded-2xl border theme-border theme-bg-surface shadow-2xs',
    card: 'rounded-2xl border theme-border theme-bg-surface shadow-xs',
    streamlined: 'border-b theme-border pb-3',
  }[variant] || 'rounded-2xl border theme-border theme-bg-sub/10 shadow-2xs';

  return (
    <div
      className={`@container w-full overflow-hidden transition-all duration-200 ${containerVariantClasses} ${className}`}
      {...rest}
    >
      {/* Clickable Header Bar (Sleek, Compact, Enterprise-Grade) */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onClick={handleToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle(e);
          }
        }}
        className={`w-full px-3 py-2.5 sm:px-3.5 sm:py-2.5 flex items-center justify-between gap-2 cursor-pointer select-none hover:theme-bg-sub/30 active:theme-bg-sub/40 transition-colors ${
          isExpanded || summaryBar ? 'border-b theme-border' : ''
        } ${headerClassName}`}
      >
        {/* Left Side: Icon, Title, Badges */}
        <div className="flex items-center gap-2 min-w-0 flex-1 text-left">
          {Icon && (
            <div className="p-1 rounded-lg theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20 shadow-2xs shrink-0 flex items-center justify-center">
              <Icon className="w-3.5 h-3.5" />
            </div>
          )}

          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              {title && (
                <span className="text-xs font-bold uppercase tracking-wider theme-text-primary truncate">
                  {title}
                </span>
              )}
              {badge !== undefined && badge !== null && (
                typeof badge === 'string' || typeof badge === 'number' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20 shadow-2xs shrink-0">
                    {badge}
                  </span>
                ) : (
                  badge
                )
              )}
            </div>
            {subtitle && (
              <p className="text-[11px] theme-text-secondary truncate font-normal leading-tight">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right Side: Custom Actions (Shown on Expand) + Rotating Chevron */}
        <div className="flex items-center gap-1.5 shrink-0">
          {headerRight && (!hideHeaderRightOnCollapse || isExpanded) && (
            <div
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 shrink-0 animate-fade-in"
            >
              {typeof headerRight === 'function' ? headerRight({ isExpanded }) : headerRight}
            </div>
          )}

          {/* Toggle Indicator */}
          <div
            className="p-1 rounded-md theme-bg-surface border theme-border hover:border-[var(--accent-main)]/40 shadow-2xs flex items-center justify-center transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            <ChevronIcon
              isOpen={isExpanded}
              className="w-3.5 h-3.5 theme-accent transition-transform duration-200 ease-in-out"
            />
          </div>
        </div>
      </div>


      {/* Optional Persistent / Summary Stats Bar */}
      {summaryBar && (
        <div className={`w-full ${isExpanded ? 'border-b theme-border' : ''}`}>
          {summaryBar}
        </div>
      )}

      {/* Collapsible Content Body with Smooth Fade-in */}
      {isExpanded && (
        <div className={`p-3 sm:p-3.5 space-y-3 animate-fade-in ${bodyClassName}`}>
          {children}
        </div>
      )}
    </div>
  );
}

