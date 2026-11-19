import React from "react";

/**
 * Highly reusable, responsive Page/Module Header component
 *
 * @param {React.ElementType} icon - Optional icon component (e.g. StudentIcon, ClassIcon)
 * @param {string|React.ReactNode} title - Main header title
 * @param {string|React.ReactNode} subtitle - Optional description/subtitle
 * @param {React.ReactNode} badge - Optional badge placed next to title
 * @param {React.ReactNode} actions - Optional action buttons rendered on the right
 * @param {React.ReactNode} children - Alternative slot for actions/extra controls
 * @param {string} className - Optional container styling
 */
/** @type {any} */
export default function PageHeader({
  icon: Icon = null,
  title = '',
  subtitle = null,
  badge = null,
  actions = null,
  children = null,
  className = "",
}) {
  const actionContent = actions || children;

  return (
    <div
      className={`flex flex-col @md:flex-row @md:items-center justify-between gap-3 @md:gap-4 pb-1.5 sm:pb-2.5 w-full min-w-0 ${className}`}
    >
      {/* Left: Icon & Title Metadata */}
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
            {badge && (
              <span className="shrink-0">{badge}</span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Action Buttons / Controls */}
      {actionContent && (
        <div className="flex flex-wrap items-center gap-2 @sm:gap-2.5 w-full @md:w-auto shrink-0 justify-start @md:justify-end">
          {actionContent}
        </div>
      )}
    </div>
  );
}
