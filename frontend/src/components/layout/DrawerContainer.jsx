import React, { useState } from "react";
import CustomButton from "../ui/CustomButton";
import AutoSaveBadge from "../ui/AutoSaveBadge";
import { ChevronIcon } from "../ui/Icons";

/**
 * Enterprise Reusable Right Sidebar / Drawer Content Container
 * Standardizes padding, spacing, typography, theme tokens, and action footers
 * across all right sidebar drawers, slide-overs, and forms.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Main drawer content
 * @param {React.ReactNode} [props.header] - Optional Header element / Banner
 * @param {React.ReactNode} [props.footer] - Optional Sticky / Bottom Action Footer
 * @param {'normal'|'compact'|'relaxed'|'none'} [props.spacing='normal'] - Vertical spacing between sections
 * @param {'normal'|'compact'|'none'} [props.padding='normal'] - Outer container padding
 * @param {boolean} [props.animate=true] - Whether to apply smooth fade-in animation
 * @param {string} [props.className=''] - Additional custom CSS classes
 */
export default function DrawerContainer({
  children,
  header,
  footer,
  spacing = "normal",
  padding = "normal",
  animate = false,
  className = "",
  ...rest
}) {
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
        <div className="w-full shrink-0 pt-4 border-t theme-border">
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
}) {
  return (
    <div
      className={`p-3.5 sm:p-4 rounded-2xl theme-bg-sub border theme-border flex items-center justify-between gap-3 shadow-2xs ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {Icon && (
          <div className="w-10 h-10 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center border theme-border shrink-0 shadow-2xs">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-xs sm:text-sm font-bold theme-text-primary truncate">
              {title}
            </h4>
            {badge && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-[11px] sm:text-xs theme-text-secondary truncate mt-0.5 font-normal">
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
  variant = "streamlined", // "streamlined" (default) | "card"
  collapsible = false,
  defaultExpanded = true,
  expanded: controlledExpanded,
  onToggle,
  ...rest
}) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isControlled = controlledExpanded !== undefined;
  const isExpanded = collapsible ? (isControlled ? controlledExpanded : internalExpanded) : true;

  const handleToggle = () => {
    if (!collapsible) return;
    if (isControlled) {
      onToggle?.(!isExpanded);
    } else {
      setInternalExpanded((prev) => !prev);
      onToggle?.(!internalExpanded);
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
          <div className="flex items-center gap-2 min-w-0">
            {Icon && <Icon className="w-4 h-4 theme-accent shrink-0" />}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {title && (
                  <h3 className={`text-xs font-bold uppercase tracking-wider theme-text-primary truncate ${
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
                <p className="text-[11px] theme-text-secondary font-normal truncate mt-0.5">
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
  cancelLabel = "Cancel",
  saveLabel = "Save Changes",
  isSubmitting = false,
  isSaveDisabled = false,
  autoSaveStatus = null,
  lastSavedAt = null,
  showAutoSave = false,
  extraButtons,
  className = "",
  children,
}) {
  const hasStandardActions = Boolean(onCancel || onSubmit || onSave);

  if (!hasStandardActions && children) {
    return (
      <div className={`pt-4 border-t theme-border w-full flex items-center justify-between gap-2.5 ${className}`}>
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          {showAutoSave && (
            <AutoSaveBadge status={autoSaveStatus || 'saved'} lastSavedAt={lastSavedAt} size="sm" variant="badge" />
          )}
          {extraButtons}
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-between gap-2.5 pt-4 border-t theme-border w-full ${className}`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-wrap">
        {onCancel && (
          <CustomButton
            type="button"
            variant="sub"
            size="md"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {cancelLabel}
          </CustomButton>
        )}
        {showAutoSave && (
          <AutoSaveBadge status={autoSaveStatus || 'saved'} lastSavedAt={lastSavedAt} size="sm" variant="badge" />
        )}
        {extraButtons}
        {children}
      </div>

      <div className="flex items-center gap-2 ml-auto shrink-0">
        {(onSubmit || onSave) && (
          <CustomButton
            type={onSubmit ? "submit" : "button"}
            variant="primary"
            size="md"
            onClick={onSave}
            loading={isSubmitting}
            disabled={isSaveDisabled}
          >
            {saveLabel}
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
