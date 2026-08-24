import React from "react";

/**
 * Enterprise Reusable Right Sidebar / Drawer Content Container
 * Standardizes padding, spacing, typography, theme tokens, and action footers
 * across all right sidebar drawers, slide-overs, and forms.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Main drawer content
 * @param {React.ReactNode} [props.header] - Optional Header element / Banner
 * @param {React.ReactNode} [props.footer] - Optional Sticky / Bottom Action Footer
 * @param {'normal'|'compact'|'relaxed'} [props.spacing='normal'] - Vertical spacing between sections
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
  animate = true,
  className = "",
  ...rest
}) {
  const spacingClass = {
    normal: "space-y-4 sm:space-y-5",
    compact: "space-y-3 sm:space-y-3.5",
    relaxed: "space-y-5 sm:space-y-6",
  }[spacing] || "space-y-4 sm:space-y-5";

  const paddingClass = {
    normal: "p-3.5 sm:p-5",
    compact: "p-2.5 sm:p-3.5",
    none: "p-0",
  }[padding] || "p-3.5 sm:p-5";

  return (
    <div
      className={`w-full ${paddingClass} ${spacingClass} font-sans text-left theme-text-primary select-none min-w-0 flex flex-col justify-between ${
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
 * Reusable Card Section for Grouping Form Inputs or Content
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
  ...rest
}) {
  return (
    <div
      className={`rounded-2xl theme-bg-surface border theme-border p-4 sm:p-5 shadow-2xs space-y-3.5 ${className}`}
      {...rest}
    >
      {(title || subtitle || headerRight) && (
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b theme-border">
          <div className="flex items-center gap-2 min-w-0">
            {Icon && <Icon className="w-4 h-4 theme-accent shrink-0" />}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h5 className="text-xs font-bold uppercase tracking-wider theme-text-primary truncate">
                  {title}
                </h5>
                {badge && (
                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded theme-bg-sub theme-text-secondary border theme-border">
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
          {headerRight && <div className="shrink-0">{headerRight}</div>}
        </div>
      )}
      <div className={`space-y-3 ${bodyClassName}`}>{children}</div>
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
  extraButtons,
  className = "",
  children,
}) {
  return (
    <div
      className={`flex items-center justify-between gap-2.5 pt-4 border-t theme-border select-none ${className}`}
    >
      <div className="flex items-center gap-2">
        {extraButtons}
        {children}
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl border theme-border hover:theme-bg-sub text-xs font-semibold theme-text-secondary hover:theme-text-primary transition-all cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>
        )}

        {(onSubmit || onSave) && (
          <button
            type={onSubmit ? "submit" : "button"}
            onClick={onSave}
            disabled={isSubmitting || isSaveDisabled}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl theme-bg-accent theme-accent-text hover:opacity-90 text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50 active:scale-95"
          >
            {isSubmitting ? "Saving..." : saveLabel}
          </button>
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
