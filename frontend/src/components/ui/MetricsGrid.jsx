import React from 'react';

const COLOR_MAP = {
  accent: {
    icon: 'theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20',
    value: 'theme-accent',
  },
  default: {
    icon: 'theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20',
    value: 'theme-accent',
  },
  sky: {
    icon: 'theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20',
    value: 'theme-accent',
  },
  emerald: {
    icon: 'theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20',
    value: 'theme-accent',
  },
  purple: {
    icon: 'theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20',
    value: 'theme-accent',
  },
  amber: {
    icon: 'theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20',
    value: 'theme-accent',
  },
  rose: {
    icon: 'theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20',
    value: 'theme-accent',
  },
  indigo: {
    icon: 'theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20',
    value: 'theme-accent',
  },
};

export function MetricCard({
  label,
  value,
  subLabel,
  icon: Icon,
  color = 'default',
  onClick,
  className = '',
}) {
  const colorConfig = COLOR_MAP[color] || COLOR_MAP.default;

  return (
    <div
      onClick={onClick}
      className={`p-3 @sm:p-4 rounded-2xl theme-bg-surface border theme-border shadow-xs flex items-center justify-between transition-all min-w-0 ${
        onClick ? 'cursor-pointer hover:theme-bg-sub/30' : ''
      } ${className}`}
    >
      <div className="min-w-0 flex-1 pr-2 @sm:pr-3">
        <span className="text-[10px] @sm:text-[11px] font-semibold theme-text-secondary block truncate">
          {label}
        </span>
        <p className={`text-lg @sm:text-xl font-bold tracking-tight mt-0.5 truncate ${colorConfig.value}`}>
          {value ?? 0}
        </p>
        {subLabel && (
          <span className="text-[9px] @sm:text-[10px] theme-text-secondary mt-0.5 block truncate">
            {subLabel}
          </span>
        )}
      </div>

      {Icon && (
        <div className={`w-8 h-8 @sm:w-10 @sm:h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${colorConfig.icon}`}>
          <Icon className="w-4 h-4 @sm:w-5 @sm:h-5" />
        </div>
      )}
    </div>
  );
}

export default function MetricsGrid({
  items = [],
  cols,
  className = '',
}) {
  if (!items || items.length === 0) return null;

  let gridColsClass = 'grid-cols-1 @sm:grid-cols-2 @2xl:grid-cols-4';
  if (cols === 1) gridColsClass = 'grid-cols-1';
  else if (cols === 2) gridColsClass = 'grid-cols-1 @sm:grid-cols-2';
  else if (cols === 3) gridColsClass = 'grid-cols-1 @sm:grid-cols-2 @xl:grid-cols-3';
  else if (cols === 4) gridColsClass = 'grid-cols-1 @sm:grid-cols-2 @2xl:grid-cols-4';
  else if (items.length === 3) gridColsClass = 'grid-cols-1 @sm:grid-cols-2 @xl:grid-cols-3';
  else if (items.length === 2) gridColsClass = 'grid-cols-1 @sm:grid-cols-2';

  return (
    <div className={`grid ${gridColsClass} gap-2.5 @sm:gap-3.5 w-full min-w-0 ${className}`}>
      {items.map((item, idx) => (
        <MetricCard
          key={item.id || item.label || idx}
          label={item.label}
          value={item.value}
          subLabel={item.subLabel}
          icon={item.icon}
          color={item.color || 'default'}
          onClick={item.onClick}
          className={item.className}
        />
      ))}
    </div>
  );
}
