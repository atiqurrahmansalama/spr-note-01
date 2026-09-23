import React from 'react';

export interface DocLabItemCardProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  titleClassName?: string;
  titleTooltip?: string;
  indicator?: React.ReactNode;
  badge?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  isActive?: boolean;
  borderVariant?: 'default' | 'subtle' | 'accent' | 'amber';
  onClick?: (e: React.MouseEvent) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  className?: string;
}

/**
 * DocLabItemCard
 * Enterprise 2-line reusable sidebar item card used across Presets (Templates) and Tokens (Keys).
 * - Line 1: Title (Template name / Token) + Indicator (Default star) + Status/Type Badge
 * - Line 2: Description / Subtitle / Live value
 * - Right: Action controls (Three-dot ActionMenu or Copy Button)
 * - Left: Optional Icon (Included in Presets, omitted in Tokens)
 */
export const DocLabItemCard: React.FC<DocLabItemCardProps> = ({
  icon,
  title,
  titleClassName = '',
  titleTooltip,
  indicator,
  badge,
  description,
  actions,
  isActive = false,
  borderVariant = 'default',
  onClick,
  onMouseDown,
  className = '',
}) => {
  let stateClasses =
    'theme-bg-surface theme-border-subtle hover:theme-border-accent-soft hover:theme-bg-sub/30';

  if (isActive) {
    stateClasses = 'theme-bg-accent-soft theme-border-accent-soft shadow-xs';
  } else if (borderVariant === 'amber') {
    stateClasses = 'border-amber-500/30 theme-bg-sub/80 hover:border-amber-500/60';
  } else if (borderVariant === 'accent') {
    stateClasses = 'theme-border-accent-soft theme-bg-accent-soft/30 hover:theme-border-accent-soft';
  }

  return (
    <div
      onClick={onClick}
      onMouseDown={onMouseDown}
      className={`group relative p-2.5 rounded-xl border transition-all cursor-pointer select-none flex items-center justify-between gap-2.5 active:scale-[0.99] ${stateClasses} ${className}`}
    >
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
            <span
              className={`text-xs font-semibold truncate ${
                isActive ? 'theme-accent font-bold' : 'theme-text-primary'
              } ${titleClassName}`}
              title={titleTooltip || (typeof title === 'string' ? title : undefined)}
            >
              {title}
            </span>

            {indicator && <div className="shrink-0 flex items-center">{indicator}</div>}
            {badge && <div className="shrink-0 flex items-center">{badge}</div>}
          </div>

          {/* Line 2: Description / Subtitle */}
          {description && (
            <p className="text-[11px] theme-text-secondary truncate mt-0.5 leading-tight">
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Right Action Controls */}
      {actions && (
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {actions}
        </div>
      )}
    </div>
  );
};

export default DocLabItemCard;
