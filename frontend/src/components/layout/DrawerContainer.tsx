import React, { useState } from "react";
import CustomButton from "../ui/CustomButton";
import AutoSaveBadge from "../ui/AutoSaveBadge";
import { ChevronIcon } from "../ui/Icons";

export interface DrawerContainerProps {
  children?: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  spacing?: 'normal' | 'compact' | 'relaxed' | 'none' | string;
  padding?: 'normal' | 'compact' | 'none' | string;
  animate?: boolean;
  className?: string;
  [key: string]: any;
}

export interface DrawerBannerProps {
  icon?: React.ComponentType<{ className?: string }>;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
  [key: string]: any;
}

export interface DrawerSectionProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: React.ReactNode;
  headerRight?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  variant?: 'streamlined' | 'card' | string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  expanded?: boolean;
  storageKey?: string;
  onToggle?: (expanded: boolean) => void;
  [key: string]: any;
}

export interface DrawerFooterProps {
  onCancel?: () => void;
  onSubmit?: ((e?: any) => void) | boolean;
  onSave?: ((e?: any) => void) | boolean;
  onConfirm?: ((e?: any) => void) | boolean;
  cancelLabel?: string;
  cancelText?: string;
  saveLabel?: string;
  saveText?: string;
  confirmText?: string;
  saveIcon?: React.ComponentType<{ className?: string }>;
  confirmIcon?: React.ComponentType<{ className?: string }>;
  isSubmitting?: boolean;
  confirmLoading?: boolean;
  isSaveDisabled?: boolean;
  saveDisabled?: boolean;
  confirmDisabled?: boolean;
  isDisabled?: boolean;
  autoSaveStatus?: any;
  lastSavedAt?: any;
  showAutoSave?: boolean;
  extraButtons?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
  [key: string]: any;
}

/**
 * Enterprise Reusable Right Sidebar / Drawer Content Container (TypeScript)
 * Standardizes padding, spacing, typography, theme tokens, and action footers
 * across all right sidebar drawers, slide-overs, and forms.
 */
export function DrawerContainer({
  children,
  header,
  footer,
  spacing = "normal",
  padding = "normal",
  animate = false,
  className = "",
  ...rest
}: DrawerContainerProps): React.JSX.Element {
  const spacingClass = {
    normal: "space-y-6 sm:space-y-7",
    compact: "space-y-4 sm:space-y-5",
    relaxed: "space-y-8 sm:space-y-9",
    none: "space-y-0",
  }[spacing] || "space-y-6 sm:space-y-7";

  const paddingClass = {
    normal: "p-3.5 sm:p-5",
    compact: "p-2.5 sm:p-3.5",
    none: "p-0",
  }[padding] || "p-3.5 sm:p-5";

  return (
    <div
      className={`w-full ${paddingClass} ${spacingClass} font-sans text-left theme-text-primary min-w-0 flex flex-col justify-between ${
        animate ? "animate-fade-in" : ""
      } ${className}`}
      {...rest}
    >
      {/* Optional Top Header / Banner Slot */}
      {header && <div className="w-full shrink-0">{header}</div>}

      {/* Main Content Area */}
      <div className={`w-full flex-1 min-w-0 ${spacingClass}`}>
        {children}
      </div>

      {/* Optional Bottom Action Footer Slot */}
      {footer && (
        <div className="w-full shrink-0 pt-2 pb-6 sm:pb-8">
          {footer}
        </div>
      )}
    </div>
  );
}

/**
 * Reusable Info Banner for Drawer Top
 */
export function DrawerBanner({
  icon: Icon,
  title,
  subtitle,
  badge,
  actions,
  className = "",
  children,
  ...rest
}: DrawerBannerProps): React.JSX.Element {
  return (
    <div
      className={`p-3.5 sm:p-4 rounded-2xl theme-bg-sub border theme-border flex items-center justify-between gap-3 shadow-2xs ${className}`}
      {...rest}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        {Icon && (
          <div className="w-10 h-10 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center border theme-border shrink-0 shadow-2xs mt-0.5">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {title && (
              <h4 className="text-xs sm:text-sm font-bold theme-text-primary leading-snug break-words">
                {title}
              </h4>
            )}
            {badge && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-[11px] sm:text-xs theme-text-secondary mt-0.5 font-normal leading-relaxed break-words">
              {subtitle}
            </p>
          )}
          {children}
        </div>
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}

/**
 * Reusable Section for Grouping Form Inputs or Content in Right Sidebar Drawers
 * Default is streamlined (zero boxed cards) with clean header divider & ample top margin.
 */
export function DrawerSection({
  title,
  subtitle,
  icon: Icon,
  badge,
  headerRight,
  children,
  className = "",
  bodyClassName = "",
  variant = "streamlined",
  collapsible = false,
  defaultExpanded = true,
  expanded: controlledExpanded,
  storageKey,
  onToggle,
  ...rest
}: DrawerSectionProps): React.JSX.Element {
  const [internalExpanded, setInternalExpanded] = useState<boolean>(() => {
    if (typeof window !== "undefined" && storageKey && collapsible) {
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

  const handleToggle = () => {
    if (!collapsible) return;
    const next = !isExpanded;
    if (isControlled) {
      onToggle?.(next);
    } else {
      setInternalExpanded(next);
      if (typeof window !== "undefined" && storageKey) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // Ignore
        }
      }
      onToggle?.(next);
    }
  };

  const isCard = variant === "card";

  return (
    <div
      className={
        isCard
          ? `rounded-2xl theme-bg-surface border theme-border p-4 sm:p-5 shadow-2xs space-y-4 ${className}`
          : `space-y-4 pt-5 sm:pt-6 first:pt-1 ${className}`
      }
      {...rest}
    >
      {(title || subtitle || headerRight || collapsible) && (
        <div
          role={collapsible ? "button" : undefined}
          tabIndex={collapsible ? 0 : undefined}
          aria-expanded={collapsible ? isExpanded : undefined}
          onClick={collapsible ? handleToggle : undefined}
          onKeyDown={collapsible ? (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleToggle();
            }
          } : undefined}
          className={`flex flex-wrap items-center justify-between gap-y-1.5 gap-x-2 pb-2 border-b theme-border ${
            collapsible ? "cursor-pointer select-none group" : ""
          }`}
        >
          <div className="flex items-start gap-2 min-w-0 flex-1">
            {Icon && <Icon className="w-4 h-4 theme-accent shrink-0 mt-0.5" />}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {title && (
                  <h3 className={`text-xs font-bold uppercase tracking-wider theme-text-primary ${
                    collapsible ? "group-hover:theme-accent transition-colors" : ""
                  }`}>
                    {title}
                  </h3>
                )}
                {badge && (
                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded-md theme-bg-sub theme-text-secondary border theme-border shrink-0">
                    {badge}
                  </span>
                )}
              </div>
              {subtitle && (
                <p className="text-[11px] theme-text-secondary font-normal mt-0.5 leading-relaxed break-words">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <div className="shrink-0 ml-auto flex items-center gap-2">
            {headerRight && (
              <div onClick={collapsible ? (e) => e.stopPropagation() : undefined}>
                {headerRight}
              </div>
            )}
            {collapsible && (
              <div className="p-0.5 rounded-md theme-text-secondary group-hover:theme-text-primary group-hover:theme-bg-sub transition-colors">
                <ChevronIcon isOpen={isExpanded} className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        </div>
      )}
      {isExpanded && (
        <div className={`${bodyClassName || "space-y-3.5"} ${collapsible ? "animate-fade-in" : ""}`}>
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Reusable Action Footer Bar with Standard Buttons
 */
export function DrawerFooter({
  onCancel,
  onSubmit,
  onSave,
  onConfirm,
  cancelLabel,
  cancelText,
  saveLabel,
  saveText,
  confirmText,
  saveIcon,
  confirmIcon,
  isSubmitting = false,
  confirmLoading = false,
  isSaveDisabled = false,
  saveDisabled = false,
  confirmDisabled = false,
  isDisabled = false,
  autoSaveStatus = null,
  lastSavedAt = null,
  showAutoSave = false,
  extraButtons,
  className = "",
  children,
  ...rest
}: DrawerFooterProps): React.JSX.Element {
  const resolvedCancelLabel = cancelLabel || cancelText || "Cancel";
  const resolvedSaveLabel = saveLabel || saveText || confirmText || "Save Changes";
  const resolvedSaveIcon = saveIcon || confirmIcon;
  const resolvedIsSubmitting = Boolean(isSubmitting || confirmLoading);
  const resolvedIsSaveDisabled = Boolean(isSaveDisabled || saveDisabled || confirmDisabled || isDisabled);
  const hasSaveAction = Boolean(onSubmit || onSave || onConfirm || confirmText || saveText || saveLabel);
  const formattedLastSavedAt = lastSavedAt instanceof Date ? lastSavedAt.toISOString() : (lastSavedAt ? String(lastSavedAt) : null);

  const hasStandardActions = Boolean(onCancel || hasSaveAction);

  if (!hasStandardActions && children) {
    return (
      <div className={`pt-4 border-t theme-border w-full flex items-center justify-between gap-2.5 ${className}`} {...rest}>
        <div className="flex items-center gap-2 min-w-0 flex-wrap w-full">
          {showAutoSave && (
            <AutoSaveBadge status={autoSaveStatus || 'saved'} lastSavedAt={formattedLastSavedAt} size="sm" variant="badge" />
          )}
          {extraButtons}
          {children}
        </div>
      </div>
    );
  }

  const handleSaveClick = (e: React.MouseEvent) => {
    if (typeof onSave === "function") {
      onSave(e);
    } else if (typeof onConfirm === "function") {
      onConfirm(e);
    } else if (typeof onSubmit === "function") {
      onSubmit(e);
    }
  };

  return (
    <div
      className={`flex items-center justify-between gap-2.5 pt-4 border-t theme-border w-full ${className}`}
      {...rest}
    >
      <div className="flex items-center gap-2 min-w-0 flex-wrap">
        {onCancel && (
          <CustomButton
            type="button"
            variant="sub"
            size="md"
            onClick={onCancel}
            disabled={resolvedIsSubmitting}
          >
            {resolvedCancelLabel}
          </CustomButton>
        )}
        {showAutoSave && (
          <AutoSaveBadge status={autoSaveStatus || 'saved'} lastSavedAt={formattedLastSavedAt} size="sm" variant="badge" />
        )}
        {extraButtons}
        {children}
      </div>

      <div className="flex items-center gap-2 ml-auto shrink-0">
        {hasSaveAction && (
          <CustomButton
            type={typeof onSubmit === "function" ? "submit" : (onSubmit || (!onSave && !onConfirm) ? "submit" : "button")}
            variant="primary"
            size="md"
            icon={resolvedSaveIcon}
            onClick={handleSaveClick}
            loading={resolvedIsSubmitting}
            disabled={resolvedIsSaveDisabled}
          >
            {resolvedSaveLabel}
          </CustomButton>
        )}
      </div>
    </div>
  );
}

// Compound component attachments
DrawerContainer.Banner = DrawerBanner;
DrawerContainer.Section = DrawerSection;
DrawerContainer.Footer = DrawerFooter;

// Aliases for convenience
export const RightSidebarContainer = DrawerContainer;

export default DrawerContainer;
