import React from 'react';

const COLOR_MAP: Record<string, { icon: string; value: string }> = {
  accent: {
    icon: 'theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20',
    value: 'theme-accent',
  },
  default: {
    icon: 'theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20',
    value: 'theme-text-primary',
  },
  primary: {
    icon: 'theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20',
    value: 'theme-text-primary',
  },
  sky: {
    icon: 'theme-bg-sky-soft text-sky-600 dark:text-sky-400 border border-sky-500/20',
    value: 'text-sky-600 dark:text-sky-400',
  },
  emerald: {
    icon: 'theme-bg-emerald-soft text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    value: 'text-emerald-600 dark:text-emerald-400',
  },
  purple: {
    icon: 'theme-bg-purple-soft text-purple-600 dark:text-purple-400 border border-purple-500/20',
    value: 'text-purple-600 dark:text-purple-400',
  },
  amber: {
    icon: 'theme-bg-amber-soft text-amber-600 dark:text-amber-400 border border-amber-500/20',
    value: 'text-amber-600 dark:text-amber-400',
  },
  rose: {
    icon: 'theme-bg-rose-soft text-rose-600 dark:text-rose-400 border border-rose-500/20',
    value: 'text-rose-600 dark:text-rose-400',
  },
  indigo: {
    icon: 'theme-bg-indigo-soft text-indigo-600 dark:text-indigo-400 border border-indigo-500/20',
    value: 'text-indigo-600 dark:text-indigo-400',
  },
};

export type MetricCardDensity = 'default' | 'compact' | 'minimal';
export type MetricCardVariant = 'surface' | 'sub' | 'outline' | 'flat';
export type MetricIconPosition = 'right' | 'left' | 'top';

export interface MetricItem {
  id?: string | number;
  label: string;
  value: string | number | React.ReactNode;
  subLabel?: string;
  badge?: React.ReactNode | string;
  icon?: React.ComponentType<{ className?: string }>;
  iconPosition?: MetricIconPosition;
  color?: 'accent' | 'default' | 'primary' | 'sky' | 'emerald' | 'purple' | 'amber' | 'rose' | 'indigo' | string;
  density?: MetricCardDensity;
  variant?: MetricCardVariant;
  onClick?: () => void;
  className?: string;
  title?: string;
  labelClassName?: string;
  valueClassName?: string;
  subLabelClassName?: string;
  iconClassName?: string;
  iconWrapperClassName?: string;
  [key: string]: any;
}

export interface MetricCardProps {
  label: string;
  value: string | number | React.ReactNode;
  subLabel?: string;
  badge?: React.ReactNode | string;
  icon?: React.ComponentType<{ className?: string }>;
  iconPosition?: MetricIconPosition;
  color?: string;
  density?: MetricCardDensity;
  variant?: MetricCardVariant;
  onClick?: () => void;
  className?: string;
  title?: string;
  labelClassName?: string;
  valueClassName?: string;
  subLabelClassName?: string;
  iconClassName?: string;
  iconWrapperClassName?: string;
  children?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subLabel,
  badge,
  icon: Icon,
  iconPosition = 'right',
  color = 'default',
  density = 'default',
  variant = 'surface',
  onClick,
  className = '',
  title,
  labelClassName = '',
  valueClassName = '',
  subLabelClassName = '',
  iconClassName = '',
  iconWrapperClassName = '',
  children,
}) => {
  const colorConfig = COLOR_MAP[color] || COLOR_MAP.default;

  // Density configurations
  const densityStyles = {
    compact: {
      card: 'p-2.5 @sm:p-3 rounded-xl gap-2',
      label: 'text-[10px] uppercase font-bold tracking-wider',
      value: 'text-sm @sm:text-base font-bold',
      subLabel: 'text-[9px]',
      iconBox: 'w-7 h-7 @sm:w-8 @sm:h-8 rounded-lg',
      icon: 'w-3.5 h-3.5 @sm:w-4 @sm:h-4',
    },
    minimal: {
      card: 'p-2 rounded-lg gap-1.5',
      label: 'text-[9px] uppercase font-semibold tracking-wide',
      value: 'text-xs @sm:text-sm font-bold',
      subLabel: 'text-[8px]',
      iconBox: 'w-6 h-6 rounded-md',
      icon: 'w-3 h-3',
    },
    default: {
      card: 'p-3 @sm:p-4 rounded-2xl gap-2.5',
      label: 'text-[10px] @sm:text-[11px] font-semibold',
      value: 'text-base @sm:text-lg font-bold',
      subLabel: 'text-[9px] @sm:text-[10px]',
      iconBox: 'w-8 h-8 @sm:w-10 @sm:h-10 rounded-xl',
      icon: 'w-4 h-4 @sm:w-5 @sm:h-5',
    },
  }[density];

  // Variant surface styles
  const variantStyles = {
    surface: 'theme-bg-surface border theme-border shadow-xs',
    sub: 'theme-bg-sub/25 border theme-border shadow-2xs',
    outline: 'bg-transparent border theme-border',
    flat: 'theme-bg-sub/35 border-0',
  }[variant];

  // Layout arrangement based on iconPosition
  const isLeftIcon = iconPosition === 'left';
  const isTopIcon = iconPosition === 'top';

  return (
    <div
      onClick={onClick}
      title={title}
      className={`transition-all min-w-0 ${variantStyles} ${densityStyles.card} ${
        isTopIcon
          ? 'flex flex-col'
          : isLeftIcon
          ? 'flex items-center'
          : 'flex items-center justify-between'
      } ${
        onClick ? 'cursor-pointer hover:theme-bg-sub/40 active:scale-98' : ''
      } ${className}`}
    >
      {/* Optional Left Icon */}
      {Icon && isLeftIcon && (
        <div
          className={`flex items-center justify-center shrink-0 shadow-2xs ${densityStyles.iconBox} ${colorConfig.icon} ${iconWrapperClassName}`}
        >
          <Icon className={`${densityStyles.icon} ${iconClassName}`} />
        </div>
      )}

      {/* Top row if Top Icon position */}
      {isTopIcon && (Icon || badge) && (
        <div className="flex items-center justify-between gap-2 w-full">
          {Icon && (
            <div
              className={`flex items-center justify-center shrink-0 shadow-2xs ${densityStyles.iconBox} ${colorConfig.icon} ${iconWrapperClassName}`}
            >
              <Icon className={`${densityStyles.icon} ${iconClassName}`} />
            </div>
          )}
          {badge && (
            <div className="shrink-0 text-[10px] font-bold">
              {badge}
            </div>
          )}
        </div>
      )}

      {/* Text Body */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1.5">
          <span
            className={`theme-text-secondary block truncate ${densityStyles.label} ${labelClassName}`}
          >
            {label}
          </span>
          {!isTopIcon && badge && (
            <div className="shrink-0 text-[10px] font-bold">
              {badge}
            </div>
          )}
        </div>

        <div
          className={`tracking-tight mt-0.5 truncate ${densityStyles.value} ${colorConfig.value} ${valueClassName}`}
        >
          {value ?? 0}
        </div>

        {subLabel && (
          <span
            className={`theme-text-secondary mt-0.5 block truncate opacity-85 ${densityStyles.subLabel} ${subLabelClassName}`}
          >
            {subLabel}
          </span>
        )}

        {children}
      </div>

      {/* Default Right Icon */}
      {Icon && !isLeftIcon && !isTopIcon && (
        <div
          className={`flex items-center justify-center shrink-0 shadow-xs ${densityStyles.iconBox} ${colorConfig.icon} ${iconWrapperClassName}`}
        >
          <Icon className={`${densityStyles.icon} ${iconClassName}`} />
        </div>
      )}
    </div>
  );
};

export interface MetricsGridProps {
  items?: MetricItem[];
  cols?: number;
  density?: MetricCardDensity;
  variant?: MetricCardVariant;
  iconPosition?: MetricIconPosition;
  gap?: 'xs' | 'sm' | 'md' | 'lg' | string;
  className?: string;
}

export const MetricsGrid: React.FC<MetricsGridProps> = ({
  items = [],
  cols,
  density,
  variant,
  iconPosition,
  gap = 'md',
  className = '',
}) => {
  if (!items || items.length === 0) return null;

  let gridColsClass = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 @sm:grid-cols-2 @2xl:grid-cols-4';
  if (cols === 1) gridColsClass = 'grid-cols-1';
  else if (cols === 2) gridColsClass = 'grid-cols-1 sm:grid-cols-2 @sm:grid-cols-2';
  else if (cols === 3) gridColsClass = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 @sm:grid-cols-2 @xl:grid-cols-3';
  else if (cols === 4) gridColsClass = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 @sm:grid-cols-2 @2xl:grid-cols-4';
  else if (cols === 5) gridColsClass = 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 @sm:grid-cols-2 @md:grid-cols-3 @2xl:grid-cols-5';
  else if (cols === 6) gridColsClass = 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 @sm:grid-cols-2 @md:grid-cols-3 @2xl:grid-cols-6';
  else if (items.length === 6) gridColsClass = 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 @sm:grid-cols-2 @md:grid-cols-3 @2xl:grid-cols-6';
  else if (items.length === 5) gridColsClass = 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 @sm:grid-cols-2 @md:grid-cols-3 @2xl:grid-cols-5';
  else if (items.length === 3) gridColsClass = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 @sm:grid-cols-2 @xl:grid-cols-3';
  else if (items.length === 2) gridColsClass = 'grid-cols-1 sm:grid-cols-2 @sm:grid-cols-2';

  const gapClass = {
    xs: 'gap-1.5 @sm:gap-2',
    sm: 'gap-2 @sm:gap-2.5',
    md: 'gap-2.5 @sm:gap-3.5',
    lg: 'gap-3.5 @sm:gap-5',
  }[gap as 'xs' | 'sm' | 'md' | 'lg'] || gap;

  return (
    <div className={`grid ${gridColsClass} ${gapClass} w-full min-w-0 ${className}`}>
      {items.map((item, idx) => (
        <MetricCard
          key={item.id || item.label || idx}
          label={item.label}
          value={item.value}
          subLabel={item.subLabel}
          badge={item.badge}
          icon={item.icon}
          iconPosition={item.iconPosition || iconPosition}
          color={item.color || 'default'}
          density={item.density || density}
          variant={item.variant || variant}
          onClick={item.onClick}
          className={item.className}
          title={item.title}
          labelClassName={item.labelClassName}
          valueClassName={item.valueClassName}
          subLabelClassName={item.subLabelClassName}
          iconClassName={item.iconClassName}
          iconWrapperClassName={item.iconWrapperClassName}
        />
      ))}
    </div>
  );
};

export default MetricsGrid;
