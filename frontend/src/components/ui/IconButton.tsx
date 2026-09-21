import React, { forwardRef } from 'react';
import { SpinnerIcon } from './Icons';

export type IconButtonVariant =
  | 'ghost'        // Flat transparent, hover:theme-bg-elevated/60 (Default)
  | 'sub'          // theme-bg-sub/60 hover:theme-bg-elevated border theme-border
  | 'surface'      // theme-bg-surface hover:theme-bg-elevated border theme-border
  | 'outline'      // Transparent border theme-border hover:theme-bg-elevated
  | 'filled'       // theme-bg-elevated hover:theme-bg-surface
  | 'accent'       // theme-bg-accent theme-accent-text hover:brightness-110 shadow-2xs
  | 'accent-soft'  // theme-bg-accent-soft theme-accent hover:theme-bg-accent hover:theme-accent-text
  | 'danger'       // text-rose-500 hover:bg-rose-500/10 hover:text-rose-600
  | 'danger-soft'  // bg-rose-500/15 text-rose-500 hover:bg-rose-500/25
  | 'success'      // text-emerald-500 hover:bg-emerald-500/10
  | 'success-soft';// bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25

export type IconButtonSize =
  | '2xs' // 20x20 px (for inline tag chips, clear adornments)
  | 'xs'  // 24x24 px (for calendar navigation, table compact actions)
  | 'sm'  // 28x28 px (for app header actions, undo/redo, drawer close)
  | 'md'  // 36x36 px (for toolbars, card actions)
  | 'lg'; // 44x44 px (for prominent touch targets, floating buttons)

export type IconButtonShape = 'rounded' | 'square' | 'circle';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ComponentType<{ className?: string }> | React.ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  shape?: IconButtonShape;
  loading?: boolean;
  active?: boolean;
  title?: string;
  ariaLabel?: string;
  className?: string;
}

const SIZE_STYLES: Record<IconButtonSize, { button: string; icon: string }> = {
  '2xs': {
    button: 'w-5 h-5 min-w-[20px] min-h-[20px]',
    icon: 'w-2.5 h-2.5',
  },
  xs: {
    button: 'w-6 h-6 min-w-[24px] min-h-[24px]',
    icon: 'w-3 h-3',
  },
  sm: {
    button: 'w-7 h-7 min-w-[28px] min-h-[28px]',
    icon: 'w-3.5 h-3.5',
  },
  md: {
    button: 'w-9 h-9 min-w-[36px] min-h-[36px]',
    icon: 'w-4 h-4',
  },
  lg: {
    button: 'w-11 h-11 min-w-[44px] min-h-[44px]',
    icon: 'w-5 h-5',
  },
};

const SHAPE_STYLES: Record<IconButtonShape, Record<IconButtonSize, string>> = {
  rounded: {
    '2xs': 'rounded-sm',
    xs: 'rounded-md',
    sm: 'rounded-lg',
    md: 'rounded-xl',
    lg: 'rounded-2xl',
  },
  square: {
    '2xs': 'rounded-none',
    xs: 'rounded-none',
    sm: 'rounded-none',
    md: 'rounded-none',
    lg: 'rounded-none',
  },
  circle: {
    '2xs': 'rounded-full',
    xs: 'rounded-full',
    sm: 'rounded-full',
    md: 'rounded-full',
    lg: 'rounded-full',
  },
};

const VARIANT_STYLES: Record<IconButtonVariant, string> = {
  ghost: 'bg-transparent border-0 theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated/60',
  sub: 'theme-bg-sub/60 hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary border theme-border shadow-2xs',
  surface: 'theme-bg-surface hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary border theme-border shadow-2xs',
  outline: 'bg-transparent hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary border theme-border shadow-2xs',
  filled: 'theme-bg-elevated hover:theme-bg-surface theme-text-primary border theme-border shadow-2xs',
  accent: 'theme-bg-accent theme-accent-text hover:brightness-110 shadow-2xs',
  'accent-soft': 'theme-bg-accent-soft theme-accent hover:theme-bg-accent hover:theme-accent-text shadow-2xs',
  danger: 'bg-transparent text-rose-500 hover:text-rose-600 hover:bg-rose-500/10',
  'danger-soft': 'bg-rose-500/15 text-rose-500 hover:bg-rose-500/25',
  success: 'bg-transparent text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10',
  'success-soft': 'bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25',
};

/**
 * Highly Reusable Enterprise Icon Button Component
 * ------------------------------------------------
 * Standardized touch targets, semantic design token variants,
 * loading indicator, smooth active scale, and strict accessibility.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    icon,
    children,
    variant = 'ghost',
    size = 'sm',
    shape = 'rounded',
    loading = false,
    active = false,
    disabled = false,
    type = 'button',
    title,
    ariaLabel,
    className = '',
    onClick,
    ...restProps
  },
  ref
) {
  const sizeConfig = SIZE_STYLES[size] || SIZE_STYLES.sm;
  const shapeClass = SHAPE_STYLES[shape]?.[size] || SHAPE_STYLES.rounded.sm;
  const variantClass = VARIANT_STYLES[variant] || VARIANT_STYLES.ghost;

  const isDisabled = disabled || loading;

  const renderIcon = () => {
    if (loading) {
      return <SpinnerIcon className={`${sizeConfig.icon} animate-spin`} />;
    }

    if (icon) {
      if (typeof icon === 'function') {
        const IconComponent = icon as React.ComponentType<{ className?: string }>;
        return <IconComponent className={sizeConfig.icon} />;
      }
      if (React.isValidElement(icon)) {
        return React.cloneElement(icon as React.ReactElement<{ className?: string }>, {
          className: `${sizeConfig.icon} ${(icon.props as any).className || ''}`.trim(),
        });
      }
      return icon;
    }

    if (children) {
      if (React.isValidElement(children)) {
        return React.cloneElement(children as React.ReactElement<{ className?: string }>, {
          className: `${sizeConfig.icon} ${(children.props as any).className || ''}`.trim(),
        });
      }
      return children;
    }

    return null;
  };

  const resolvedAriaLabel = ariaLabel || title || (restProps as any)['aria-label'];

  return (
    <button
      ref={ref}
      type={type}
      title={title}
      aria-label={resolvedAriaLabel}
      disabled={isDisabled}
      onClick={isDisabled ? undefined : onClick}
      className={`
        inline-flex items-center justify-center shrink-0 select-none transition-all duration-150
        ${sizeConfig.button}
        ${shapeClass}
        ${variantClass}
        ${active ? 'theme-bg-accent theme-accent-text ring-1 ring-[var(--accent-main)]/40 shadow-xs' : ''}
        ${
          isDisabled
            ? 'opacity-30 cursor-not-allowed pointer-events-none'
            : 'cursor-pointer active:scale-95'
        }
        ${className}
      `.trim()}
      {...restProps}
    >
      {renderIcon()}
    </button>
  );
});

export default IconButton;
