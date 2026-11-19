import React from 'react';

export interface RadioCardProps {
  selected?: boolean;
  onClick?: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: React.ReactNode;
  disabled?: boolean;
  indicatorType?: 'radio' | 'check' | 'none';
  className?: string;
  role?: string;
  tabIndex?: number;
  children?: React.ReactNode;
}

/**
 * Enterprise Reusable Radio / Selection Card Component
 * Fully responsive, keyboard-accessible card selector adhering to SPR Note design tokens.
 */
export default function RadioCard({
  selected = false,
  onClick,
  title,
  description,
  icon: Icon,
  badge,
  disabled = false,
  indicatorType = 'radio',
  className = '',
  role = 'radio',
  tabIndex = 0,
  children,
}: RadioCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onClick?.();
    }
  };

  const handleClick = () => {
    if (disabled) return;
    onClick?.();
  };

  return (
    <div
      role={role}
      aria-checked={selected}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : tabIndex}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 select-none outline-none focus:outline-none ${
        disabled
          ? 'opacity-50 cursor-not-allowed theme-bg-surface theme-border'
          : selected
          ? 'theme-bg-accent-soft/35 border-[var(--accent-main)]/40 shadow-xs cursor-pointer'
          : 'theme-bg-surface theme-border hover:theme-bg-sub/30 opacity-80 hover:opacity-100 cursor-pointer'
      } ${className}`}
    >
      <div className="space-y-1.5 w-full">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {Icon && (
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  selected
                    ? 'theme-bg-accent theme-accent-text'
                    : 'theme-bg-sub theme-text-secondary'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
            )}
            <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold theme-text-primary truncate">
                {title}
              </span>
              {badge && (
                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded-md theme-bg-sub theme-text-secondary border theme-border shrink-0">
                  {badge}
                </span>
              )}
            </div>
          </div>

          {indicatorType === 'radio' && (
            <div
              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                selected
                  ? 'border-[var(--accent-main)] bg-[var(--accent-main)] text-white'
                  : 'theme-border bg-transparent'
              }`}
            >
              {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
          )}
        </div>

        {description && (
          <p className="text-[11px] theme-text-secondary leading-relaxed">
            {description}
          </p>
        )}

        {children}
      </div>
    </div>
  );
}
