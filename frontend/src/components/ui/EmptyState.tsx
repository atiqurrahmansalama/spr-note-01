import React, { isValidElement } from 'react';
import CustomButton from './CustomButton';

export type EmptyStateVariant =
  | 'dashed'
  | 'card'
  | 'sub'
  | 'flat'
  | 'minimal'
  | 'bordered';

export type EmptyStateSize = 'sm' | 'md' | 'lg' | 'compact';

export type EmptyStateIconVariant =
  | 'default'
  | 'accent'
  | 'sub'
  | 'muted'
  | 'surface'
  | 'glow'
  | 'danger'
  | 'warning'
  | 'success';

export type EmptyStateIconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface EmptyStateAction {
  label: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  icon?: React.ComponentType<{ className?: string }> | React.ReactNode;
  iconRight?: React.ComponentType<{ className?: string }> | React.ReactNode;
  variant?: 'primary' | 'secondary' | 'sub' | 'surface' | 'outline' | 'soft' | 'danger' | 'ghost' | string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | string;
  disabled?: boolean;
  className?: string;
  title?: string;
}

export interface EmptyStateProps {
  /** Main icon component or React element */
  icon?: React.ComponentType<{ className?: string }> | React.ReactNode;
  /** Visual style variant of the icon container */
  iconVariant?: EmptyStateIconVariant;
  /** Sizing of the icon box */
  iconSize?: EmptyStateIconSize;
  /** Primary headline/title */
  title?: React.ReactNode;
  /** Explanatory description */
  description?: React.ReactNode;
  /** Primary action button configuration or custom React node */
  action?: EmptyStateAction | React.ReactNode;
  /** Optional secondary action button configuration or custom React node */
  secondaryAction?: EmptyStateAction | React.ReactNode;
  /** Visual container style variant */
  variant?: EmptyStateVariant;
  /** Sizing & density profile */
  size?: EmptyStateSize;
  /** Optional pill badge displayed above title */
  badge?: React.ReactNode;
  /** Apply micro-interaction animation (default: true) */
  animate?: boolean;
  /** Stretch width 100% */
  fullWidth?: boolean;
  /** Custom inline min-height */
  minHeight?: string | number;
  /** Custom wrapper classes */
  className?: string;
  /** Additional custom slot elements */
  children?: React.ReactNode;
}

/**
 * EmptyState / EmptyData
 * ======================
 * Enterprise-grade, highly customizable empty state placeholder component.
 * Provides unified theme styling, responsive scaling, icon containers, and flexible action slots.
 */
export function EmptyState({
  icon,
  iconVariant = 'default',
  iconSize,
  title,
  description,
  action,
  secondaryAction,
  variant = 'dashed',
  size = 'md',
  badge,
  animate = true,
  fullWidth = true,
  minHeight,
  className = '',
  children,
}: EmptyStateProps) {
  // ── Sizing Definitions ──
  const isCompact = size === 'sm' || size === 'compact';
  const isLarge = size === 'lg';

  const containerPadding = isCompact
    ? 'p-4 sm:p-5 space-y-2'
    : isLarge
    ? 'p-8 sm:p-12 space-y-3.5'
    : 'p-6 sm:p-8 space-y-2.5';

  // ── Container Style Variants ──
  const variantClasses: Record<EmptyStateVariant, string> = {
    dashed: 'border border-dashed theme-border rounded-xl theme-bg-sub/10',
    card: 'border theme-border rounded-2xl theme-bg-surface shadow-2xs',
    sub: 'border theme-border rounded-xl theme-bg-sub/30',
    flat: 'theme-bg-sub/20 rounded-xl',
    minimal: 'bg-transparent',
    bordered: 'border theme-border rounded-xl theme-bg-surface/50',
  };

  // ── Icon Box Variant Classes ──
  const iconVariantClasses: Record<EmptyStateIconVariant, string> = {
    default: 'theme-bg-sub border theme-border theme-text-secondary opacity-80',
    accent: 'theme-bg-accent-soft border border-[var(--accent-main)]/25 theme-accent shadow-2xs',
    sub: 'theme-bg-sub/70 border theme-border theme-text-secondary',
    muted: 'theme-bg-sub border theme-border theme-text-secondary/70',
    surface: 'theme-bg-surface border theme-border theme-text-primary shadow-2xs',
    glow: 'theme-bg-accent-soft border border-[var(--accent-main)]/35 theme-accent shadow-sm ring-4 ring-[var(--accent-main)]/10',
    danger: 'bg-rose-500/10 border border-rose-500/25 text-rose-500',
    warning: 'bg-amber-500/10 border border-amber-500/25 text-amber-500',
    success: 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-500',
  };

  // ── Icon Box Size Classes ──
  const resolvedIconSize =
    iconSize || (isCompact ? 'sm' : isLarge ? 'lg' : 'md');

  const iconBoxSizeClasses: Record<EmptyStateIconSize, { box: string; icon: string }> = {
    xs: { box: 'w-7 h-7 rounded-lg', icon: 'w-3.5 h-3.5' },
    sm: { box: 'w-8 h-8 rounded-lg', icon: 'w-4 h-4' },
    md: { box: 'w-10 h-10 rounded-xl', icon: 'w-5 h-5' },
    lg: { box: 'w-12 h-12 rounded-2xl', icon: 'w-6 h-6' },
    xl: { box: 'w-14 h-14 rounded-2xl', icon: 'w-7 h-7' },
  };

  const currentIconSize = iconBoxSizeClasses[resolvedIconSize] || iconBoxSizeClasses.md;

  // ── Helper to Render Action ──
  const renderActionNode = (
    act: EmptyStateAction | React.ReactNode,
    isSecondary = false
  ) => {
    if (!act) return null;
    if (isValidElement(act)) return act;

    const actionObj = act as EmptyStateAction;
    if (!actionObj.label) return null;

    const btnVariant =
      actionObj.variant || (isSecondary ? 'sub' : 'primary');
    const btnSize = actionObj.size || (isCompact ? 'xs' : 'sm');

    return (
      <CustomButton
        type="button"
        variant={btnVariant as any}
        size={btnSize as any}
        onClick={actionObj.onClick}
        icon={actionObj.icon as any}
        iconRight={actionObj.iconRight as any}
        disabled={actionObj.disabled}
        className={actionObj.className}
        title={actionObj.title}
      >
        {actionObj.label}
      </CustomButton>
    );
  };

  return (
    <div
      style={minHeight ? { minHeight } : undefined}
      className={`
        flex flex-col items-center justify-center text-center select-none
        ${fullWidth ? 'w-full' : ''}
        ${containerPadding}
        ${variantClasses[variant] || variantClasses.dashed}
        ${animate ? 'animate-fade-in' : ''}
        ${className}
      `.trim()}
    >
      {/* Optional Badge */}
      {badge && (
        <div className="mb-1">
          {typeof badge === 'string' ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold theme-bg-sub theme-text-secondary border theme-border">
              {badge}
            </span>
          ) : (
            badge
          )}
        </div>
      )}

      {/* Icon Container */}
      {icon && (
        <div
          className={`
            flex items-center justify-center shrink-0 transition-transform duration-200
            ${currentIconSize.box}
            ${iconVariantClasses[iconVariant] || iconVariantClasses.default}
          `}
        >
          {isValidElement(icon) ? (
            icon
          ) : typeof icon === 'function' ? (
            React.createElement(icon as React.ComponentType<{ className?: string }>, {
              className: currentIconSize.icon,
            })
          ) : null}
        </div>
      )}

      {/* Text Hierarchy */}
      {(title || description) && (
        <div className="space-y-0.5 max-w-sm px-2">
          {title && (
            <div
              className={`
                font-bold theme-text-primary tracking-tight
                ${isCompact ? 'text-xs' : isLarge ? 'text-base sm:text-lg' : 'text-xs sm:text-sm'}
              `}
            >
              {title}
            </div>
          )}
          {description && (
            <div
              className={`
                theme-text-secondary leading-relaxed
                ${isCompact ? 'text-[11px] max-w-xs' : 'text-xs max-w-sm'}
              `}
            >
              {description}
            </div>
          )}
        </div>
      )}

      {/* Action Slots */}
      {(action || secondaryAction) && (
        <div className="pt-1 flex items-center justify-center gap-2 flex-wrap">
          {renderActionNode(action, false)}
          {renderActionNode(secondaryAction, true)}
        </div>
      )}

      {/* Additional Custom Child Content */}
      {children}
    </div>
  );
}

export { EmptyState as EmptyData };
export default EmptyState;
