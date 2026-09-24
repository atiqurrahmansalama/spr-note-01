import React, { forwardRef } from 'react';
import { SpinnerIcon } from './Icons';

export type IconButtonVariant =
  | 'ghost'        // Flat transparent, light subtle background on hover/touch (Default)
  | 'sub'          // Flat transparent, light subtle background on hover/touch
  | 'surface'      // Flat transparent, light subtle background on hover/touch
  | 'outline'      // Flat transparent, light subtle background on hover/touch
  | 'filled'       // theme-bg-elevated, light subtle background on hover/touch
  | 'accent'       // theme-bg-accent theme-accent-text hover:brightness-110 shadow-2xs
  | 'accent-soft'  // theme-bg-accent-soft theme-accent hover:theme-bg-accent hover:theme-accent-text
  | 'danger'       // text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 active:bg-rose-500/20
  | 'danger-soft'  // bg-rose-500/15 text-rose-500 hover:bg-rose-500/25 active:bg-rose-500/30
  | 'success'      // text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10 active:bg-emerald-500/20
  | 'success-soft';// bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 active:bg-emerald-500/30

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
    '2xs': 'rounded-full',
    xs: 'rounded-full',
    sm: 'rounded-full',
    md: 'rounded-full',
    lg: 'rounded-full',
  },
  square: {
    '2xs': 'rounded-full',
    xs: 'rounded-full',
    sm: 'rounded-full',
    md: 'rounded-full',
    lg: 'rounded-full',
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
  ghost: 'bg-transparent border-0 theme-text-secondary hover:theme-text-primary hover:bg-current/[0.10] active:bg-current/[0.18]',
  sub: 'bg-transparent border-0 theme-text-secondary hover:theme-text-primary hover:bg-current/[0.10] active:bg-current/[0.18]',
  surface: 'bg-transparent border-0 theme-text-secondary hover:theme-text-primary hover:bg-current/[0.10] active:bg-current/[0.18]',
  outline: 'bg-transparent border theme-border theme-text-secondary hover:theme-text-primary hover:bg-current/[0.10] active:bg-current/[0.18]',
  filled: 'theme-bg-elevated border-0 theme-text-primary hover:opacity-90 active:opacity-80',
  accent: 'theme-bg-accent border-0 theme-accent-text hover:brightness-110 active:brightness-95 shadow-2xs',
  'accent-soft': 'theme-bg-accent-soft border-0 theme-accent hover:theme-bg-accent hover:theme-accent-text',
  danger: 'bg-transparent border-0 text-rose-400 hover:text-rose-500 hover:bg-rose-500/[0.10] active:bg-rose-500/[0.20]',
  'danger-soft': 'bg-rose-500/10 border-0 text-rose-400 hover:bg-rose-500/18 active:bg-rose-500/25',
  success: 'bg-transparent border-0 text-emerald-400 hover:text-emerald-500 hover:bg-emerald-500/[0.10] active:bg-emerald-500/[0.20]',
  'success-soft': 'bg-emerald-500/10 border-0 text-emerald-400 hover:bg-emerald-500/18 active:bg-emerald-500/25',
};

/**
 * Highly Reusable Enterprise Icon Button Component
 * ------------------------------------------------
 * Fully rounded (rounded-full), borderless (border-0), standardized touch targets,
 * subtle light background on hover and phone tap/click, loading spinner, and strict accessibility.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    icon,
    children,
    variant = 'ghost',
    size = 'sm',
    shape = 'circle',
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
  const shapeClass = SHAPE_STYLES[shape]?.[size] || SHAPE_STYLES.circle.sm;
  
  // Prevent default hover text color from overriding caller's custom hover text color
  const hasCustomHoverText = /hover:(?:!)?(?:text-|theme-)/.test(className);
  const rawVariantClass = VARIANT_STYLES[variant] || VARIANT_STYLES.ghost;
  const variantClass = hasCustomHoverText
    ? rawVariantClass.replace(/\bhover:theme-text-\S+/g, '').trim()
    : rawVariantClass;

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
      data-component="icon-button"
      onClick={isDisabled ? undefined : onClick}
      className={`
        theme-icon-btn inline-flex items-center justify-center shrink-0 select-none transition-all duration-150 rounded-full border-0 outline-hidden focus:outline-hidden focus-visible:outline-hidden
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

