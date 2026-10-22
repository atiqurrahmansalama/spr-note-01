import React from 'react';

export interface SegmentedSwitchOption<T extends string = string> {
  value: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  count?: number | string;
  disabled?: boolean;
  title?: string;
}

export interface SegmentedSwitchProps<T extends string = string> {
  options: SegmentedSwitchOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  fullWidth?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}

/**
 * Enterprise Reusable Segmented Switch Component
 * Modern theme-aware pill switch designed for seamless switching between view modes,
 * lenses, or sub-scopes across all devices and viewport sizes.
 */
export default function SegmentedSwitch<T extends string = string>({
  options,
  value,
  onChange,
  size = 'sm',
  className = '',
  fullWidth = false,
  disabled = false,
  ariaLabel = 'View switcher',
}: SegmentedSwitchProps<T>) {
  const sizeClasses = {
    xs: {
      container: 'p-0.5 rounded-lg gap-0.5',
      button: 'py-1 px-2.5 text-[11px] gap-1 rounded-md',
      icon: 'w-3 h-3',
      badge: 'text-[9px] px-1 py-0.2',
    },
    sm: {
      container: 'p-1 rounded-xl gap-1',
      button: 'py-1.5 px-3 text-xs gap-1.5 rounded-lg',
      icon: 'w-3.5 h-3.5',
      badge: 'text-[10px] px-1.5 py-0.5',
    },
    md: {
      container: 'p-1.5 rounded-xl gap-1.5',
      button: 'py-2 px-4 text-xs font-semibold gap-2 rounded-lg',
      icon: 'w-4 h-4',
      badge: 'text-[11px] px-2 py-0.5',
    },
  }[size];

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`inline-flex items-center theme-bg-sub border theme-border shadow-2xs shrink-0 select-none ${sizeClasses.container} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
    >
      {options.map((opt) => {
        const isActive = value === opt.value;
        const isDisabled = disabled || opt.disabled;
        const IconComponent = opt.icon;

        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={isActive}
            disabled={isDisabled}
            type="button"
            title={opt.title || opt.label}
            onClick={() => !isDisabled && !isActive && onChange(opt.value)}
            className={`font-bold transition-all duration-200 cursor-pointer flex items-center justify-center outline-none focus:outline-none shrink-0 ${
              sizeClasses.button
            } ${fullWidth ? 'flex-1' : ''} ${
              isDisabled
                ? 'opacity-40 cursor-not-allowed theme-text-secondary'
                : isActive
                ? 'theme-bg-accent theme-accent-text shadow-xs scale-[1.01]'
                : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated/50'
            }`}
          >
            {IconComponent && (
              <IconComponent
                className={`${sizeClasses.icon} shrink-0 transition-transform duration-200 ${
                  isActive ? 'scale-105' : 'opacity-70 group-hover:opacity-100'
                }`}
              />
            )}
            <span className="whitespace-nowrap">{opt.label}</span>
            {opt.count !== undefined && opt.count !== null && (
              <span
                className={`font-mono font-bold rounded-full transition-colors ${sizeClasses.badge} ${
                  isActive
                    ? 'theme-bg-surface/20 theme-accent-text'
                    : 'theme-bg-surface border theme-border theme-text-secondary'
                }`}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
