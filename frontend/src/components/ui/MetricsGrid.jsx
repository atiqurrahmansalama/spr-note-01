import React from 'react';

const COLOR_MAP = {
  sky: {
    icon: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    value: 'text-sky-400',
  },
  emerald: {
    icon: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    value: 'text-emerald-400',
  },
  purple: {
    icon: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    value: 'text-purple-400',
  },
  amber: {
    icon: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    value: 'text-amber-400',
  },
  rose: {
    icon: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    value: 'text-rose-400',
  },
  accent: {
    icon: 'theme-bg-accent-soft theme-accent border theme-border',
    value: 'theme-accent',
  },
  default: {
    icon: 'theme-bg-sub theme-text-secondary border theme-border',
    value: 'theme-text-primary',
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
      className={`p-4 rounded-2xl theme-bg-surface border theme-border shadow-xs flex items-center justify-between transition-all ${
        onClick ? 'cursor-pointer hover:theme-bg-sub/30' : ''
      } ${className}`}
    >
      <div className="min-w-0 flex-1 pr-3">
        <span className="text-[11px] font-semibold theme-text-secondary block truncate">
          {label}
        </span>
        <p className={`text-xl font-bold tracking-tight mt-0.5 truncate ${colorConfig.value}`}>
          {value ?? 0}
        </p>
        {subLabel && (
          <span className="text-[10px] theme-text-secondary mt-0.5 block truncate">
            {subLabel}
          </span>
        )}
      </div>

      {Icon && (
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${colorConfig.icon}`}>
          <Icon className="w-5 h-5" />
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

  let gridColsClass = 'grid-cols-2 lg:grid-cols-4';
  if (cols === 1) gridColsClass = 'grid-cols-1';
  else if (cols === 2) gridColsClass = 'grid-cols-1 sm:grid-cols-2';
  else if (cols === 3) gridColsClass = 'grid-cols-1 sm:grid-cols-3';
  else if (cols === 4) gridColsClass = 'grid-cols-2 lg:grid-cols-4';
  else if (items.length === 3) gridColsClass = 'grid-cols-1 sm:grid-cols-3';
  else if (items.length === 2) gridColsClass = 'grid-cols-1 sm:grid-cols-2';

  return (
    <div className={`grid ${gridColsClass} gap-3.5 ${className}`}>
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
