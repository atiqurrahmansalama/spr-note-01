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
export default function PageHeader({
  icon: Icon,
  title,
  subtitle,
  badge,
  actions,
  children,
  className = "",
}) {
  const actionContent = actions || children;

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b theme-border select-none ${className}`}
    >
      {/* Left: Icon & Title Metadata */}
      <div className="flex items-center gap-3.5 min-w-0">
        {Icon && (
          <div className="w-10 h-10 rounded-2xl theme-bg-accent-soft border border-[var(--accent-main)]/20 flex items-center justify-center theme-accent shrink-0 shadow-xs">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight theme-text-primary truncate">
              {title}
            </h1>
            {badge && (
              <span className="shrink-0">{badge}</span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs theme-text-secondary mt-0.5 leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right: Action Buttons / Controls */}
      {actionContent && (
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto shrink-0">
          {actionContent}
        </div>
      )}
    </div>
  );
}
