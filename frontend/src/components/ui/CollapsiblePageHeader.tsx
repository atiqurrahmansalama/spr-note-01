import React, { useState } from "react";
import { ChevronUpIcon, ChevronDownIcon } from "./Icons";
import { IconButton } from "./IconButton";
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
  /** Label for collapse action on large screens */
  collapseLabel?: string;
  /** Label for expand action on large screens */
  expandLabel?: string;
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
  collapseLabel = "Collapse",
  expandLabel = "Expand",
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
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1 text-left">
            {Icon && (
              <div className="w-6 h-6 rounded-lg theme-bg-accent-soft border border-[var(--accent-main)]/20 flex items-center justify-center theme-accent shrink-0">
                <Icon className="w-3.5 h-3.5" />
              </div>
            )}
            <span className="text-xs sm:text-sm font-semibold theme-text-primary truncate">
              {title}
            </span>
          </div>

          {/* Right: Expand Toggle Button (mobile icon and desktop text+icon) */}
          <div className="flex items-center shrink-0">
            <div className="block @md:hidden">
              <IconButton
                icon={ChevronDownIcon}
                ariaLabel="Expand page header"
                title="Expand header and tabs"
                size="sm"
                variant="sub"
                className="pointer-events-none"
              />
            </div>
            <div className="hidden @md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border theme-border theme-bg-sub/50 group-hover:theme-bg-sub text-xs font-semibold theme-text-secondary group-hover:theme-text-primary transition-all duration-150 shrink-0 pointer-events-none">
              <span>{expandLabel}</span>
              <ChevronDownIcon className="w-3.5 h-3.5" />
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
        className={`flex items-center justify-between gap-3 @md:gap-4 pb-1.5 sm:pb-2.5 w-full min-w-0 ${headerClassName}`}
      >
        {/* Left: Icon, Title & Badge */}
        <div className="flex items-center gap-2.5 @sm:gap-3.5 min-w-0 flex-1">
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

        {/* Right: Actions + Collapse Toggle Button (positioned at the far right on both mobile & desktop) */}
        <div className="flex items-center gap-2 @sm:gap-2.5 shrink-0 justify-end">
          {headerActions}
          {collapsible && (
            <>
              {/* Mobile Collapse Button (at the far right on small screens) */}
              <div className="block @md:hidden shrink-0">
                <IconButton
                  icon={ChevronUpIcon}
                  onClick={handleToggle}
                  ariaLabel="Collapse page header"
                  title="Collapse header and tabs"
                  size="sm"
                  variant="sub"
                />
              </div>
              {/* Desktop Collapse Button */}
              <div className="hidden @md:block shrink-0">
                <button
                  type="button"
                  onClick={handleToggle}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border theme-border theme-bg-sub/50 hover:theme-bg-sub text-xs font-semibold theme-text-secondary hover:theme-text-primary transition-all duration-150 cursor-pointer shadow-2xs"
                  title="Collapse header and tabs"
                  aria-label="Collapse page header"
                >
                  <span>{collapseLabel}</span>
                  <ChevronUpIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
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
