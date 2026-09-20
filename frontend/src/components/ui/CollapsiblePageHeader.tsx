import React, { useState } from "react";
import { ChevronUpIcon, ChevronDownIcon } from "./Icons";
import TabSwitcher from "./TabSwitcher";

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  Icon?: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  disabled?: boolean;
  [key: string]: any;
}

export interface CollapsiblePageHeaderProps {
  /** Main module / page title */
  title: string | React.ReactNode;
  /** Secondary descriptive subtitle */
  subtitle?: string | React.ReactNode;
  /** Optional module icon component (e.g. BookOpenIcon, TimerIcon) */
  icon?: React.ComponentType<{ className?: string }>;
  /** Optional badge placed next to the title */
  badge?: React.ReactNode;
  /** Action buttons rendered on the right side in expanded mode */
  actions?: React.ReactNode;
  /** Where to place the primary action buttons: 'header' (top right of header) or 'tabs' (far right of tab switcher) */
  actionsPlacement?: 'header' | 'tabs';
  /** Tab items list for TabSwitcher */
  tabs?: TabItem[];
  /** Currently active tab ID */
  activeTab?: string;
  /** Callback triggered on tab switch */
  onTabChange?: (tabId: string) => void;
  /** Alternative alias for tab switch callback */
  onChange?: (tabId: string) => void;
  /** Custom action slot on the right side of TabSwitcher */
  tabsRightContent?: React.ReactNode;
  /** Additional styling for TabSwitcher */
  tabSwitcherClassName?: string;
  /** LocalStorage key for persisting collapsed state */
  storageKey?: string;
  /** Initial expanded state (uncontrolled mode, defaults to true) */
  defaultExpanded?: boolean;
  /** Controlled expanded state */
  expanded?: boolean;
  /** Callback fired when expanded/collapsed state changes */
  onToggle?: (isExpanded: boolean) => void;
  /** Whether the header is collapsible (defaults to true) */
  collapsible?: boolean;
  /** If true, completely hides the header */
  hideHeader?: boolean;
  /** Additional wrapper CSS classes */
  className?: string;
  /** Additional header section CSS classes */
  headerClassName?: string;
  /** Additional children rendered beneath tabs */
  children?: React.ReactNode;
}

/**
 * CollapsiblePageHeader
 * Enterprise-grade reusable collapsible page header & tab navigation container.
 * 
 * Complies with SPR Note Enterprise Engineering Standards:
 * - 100% Theme Tokens & Zero Hardcoded Colors
 * - Full Mobile / Tablet / Desktop Responsiveness with Container Queries (@container)
 * - Safe Keyboard & Mouse event handling
 * - Optional LocalStorage state persistence per module
 * - Ultra-minimal collapsed mode displaying only Title, Icon, and Expand Button
 */
export default function CollapsiblePageHeader({
  title,
  subtitle,
  icon: Icon,
  badge,
  actions,
  actionsPlacement = "header",
  tabs,
  activeTab,
  onTabChange,
  onChange,
  tabsRightContent,
  tabSwitcherClassName = "",
  storageKey,
  defaultExpanded = true,
  expanded: controlledExpanded,
  onToggle,
  collapsible = true,
  hideHeader = false,
  className = "",
  headerClassName = "",
  children,
}: CollapsiblePageHeaderProps) {
  const [internalExpanded, setInternalExpanded] = useState<boolean>(() => {
    if (storageKey && typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`spr_header_collapsed_${storageKey}`);
        if (saved !== null) {
          return saved !== "true";
        }
      } catch {
        // Fallback to default
      }
    }
    return defaultExpanded;
  });

  const isControlled = controlledExpanded !== undefined;
  const isExpanded = isControlled ? controlledExpanded : internalExpanded;

  const handleTabSelect = onTabChange || onChange;

  const headerActions = actionsPlacement === "header" ? actions : null;
  const effectiveTabsRightContent =
    tabsRightContent !== undefined
      ? tabsRightContent
      : actionsPlacement === "tabs"
      ? actions
      : null;

  const handleToggle = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (!collapsible) return;

    if (isControlled) {
      onToggle?.(!isExpanded);
    } else {
      setInternalExpanded((prev) => {
        const next = !prev;
        if (storageKey && typeof window !== "undefined") {
          try {
            localStorage.setItem(`spr_header_collapsed_${storageKey}`, String(!next));
          } catch {
            // Ignore storage errors
          }
        }
        onToggle?.(next);
        return next;
      });
    }
  };

  if (hideHeader) {
    return null;
  }

  // ── Collapsed Mode: Ultra-Minimal Bar with Only Title & Expand Button ─────────
  if (collapsible && !isExpanded) {
    return (
      <div className={`@container w-full min-w-0 ${className}`}>
        <div
          role="button"
          tabIndex={0}
          onClick={handleToggle}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleToggle(e);
            }
          }}
          aria-expanded={false}
          aria-label="Expand page header"
          title="Click to expand header and tabs"
          className="w-full py-2 px-3 sm:px-4 rounded-xl border theme-border theme-bg-surface hover:theme-bg-sub/30 transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 shadow-2xs group select-none"
        >
          {/* Left: Icon & Title */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1 text-left">
            {Icon && (
              <div className="w-6 h-6 rounded-lg theme-bg-accent-soft border border-[var(--accent-main)]/20 flex items-center justify-center theme-accent shrink-0">
                <Icon className="w-3.5 h-3.5" />
              </div>
            )}
            <span className="text-xs sm:text-sm font-semibold theme-text-primary truncate">
              {title}
            </span>
          </div>

          {/* Right: Only Expand Toggle Button */}
          <div className="flex items-center gap-1 shrink-0">
            <div className="p-1 sm:p-1.5 rounded-lg theme-bg-sub/40 group-hover:theme-bg-accent-soft group-hover:theme-accent transition-colors flex items-center justify-center">
              <ChevronDownIcon className="w-4 h-4 theme-text-secondary group-hover:theme-accent transition-transform group-hover:translate-y-0.5" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Expanded Mode: Full Header + Action Controls + TabSwitcher ───────────────
  return (
    <div className={`@container space-y-3 sm:space-y-4 w-full min-w-0 animate-fade-in ${className}`}>
      {/* 1. Page Header Bar */}
      <div
        className={`flex flex-col @md:flex-row @md:items-center justify-between gap-3 @md:gap-4 pb-1.5 sm:pb-2.5 w-full min-w-0 ${headerClassName}`}
      >
        {/* Left: Icon, Title, Badge, Subtitle */}
        <div className="flex items-center gap-3 @sm:gap-3.5 min-w-0 flex-1">
          {Icon && (
            <div className="w-9 h-9 @sm:w-10 @sm:h-10 rounded-2xl theme-bg-accent-soft border border-[var(--accent-main)]/20 flex items-center justify-center theme-accent shrink-0 shadow-xs">
              <Icon className="w-4.5 h-4.5 @sm:w-5 @sm:h-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 @sm:gap-2.5 flex-wrap">
              <h1 className="text-lg @sm:text-xl @xl:text-2xl font-bold tracking-tight theme-text-primary truncate">
                {title}
              </h1>
              {badge && <span className="shrink-0">{badge}</span>}
            </div>
          </div>
        </div>

        {/* Right: Actions + Collapse Toggle Button */}
        <div className="flex flex-wrap items-center gap-2 @sm:gap-2.5 w-full @md:w-auto shrink-0 justify-start @md:justify-end">
          {headerActions}
          {collapsible && (
            <button
              type="button"
              onClick={handleToggle}
              aria-expanded={true}
              aria-label="Collapse page header"
              title="Collapse header and tabs"
              className="p-2 sm:p-2.5 rounded-xl theme-bg-surface border theme-border hover:theme-bg-sub/40 hover:border-[var(--accent-main)]/40 transition-colors shadow-2xs flex items-center justify-center text-xs theme-text-secondary hover:theme-text-primary cursor-pointer shrink-0"
            >
              <ChevronUpIcon className="w-4 h-4 theme-accent shrink-0" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Tab Switcher (if provided) */}
      {tabs && tabs.length > 0 && (
        <TabSwitcher
          tabs={tabs}
          activeTab={activeTab}
          onChange={handleTabSelect}
          rightContent={effectiveTabsRightContent}
          className={tabSwitcherClassName}
        />
      )}

      {/* 3. Optional Extra Sub-components */}
      {children}
    </div>
  );
}
