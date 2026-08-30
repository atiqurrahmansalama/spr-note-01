import React, { forwardRef, useMemo } from 'react';
import { SpinnerIcon } from './Icons';

/**
 * Helper to determine whether an item fulfills requirement conditions.
 * Supports strings, numbers, booleans, arrays, and objects.
 */
function isConditionMet(val) {
  if (val === null || val === undefined) return false;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') return val.trim().length > 0;
  if (typeof val === 'number') return !isNaN(val);
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === 'object') return Object.keys(val).length > 0;
  return Boolean(val);
}

/**
 * CustomButton
 * ============
 * Highly reusable enterprise button component with built-in:
 * - Integrated loading spinner state (`loading`, `loadingText`)
 * - Smart prerequisite requirements checker (`requireAll`, `disabledReason`)
 * - Theme-compliant design tokens & semantic variants
 * - Standardized responsive sizing & icon slots
 */
const CustomButton = forwardRef(function CustomButton(
  {
    children,
    type = 'button',
    variant = 'primary', // 'primary' | 'secondary' | 'sub' | 'surface' | 'outline' | 'soft' | 'danger' | 'danger-solid' | 'success' | 'success-solid' | 'warning' | 'ghost'
    size = 'md', // 'xs' | 'sm' | 'md' | 'lg' | 'icon-xs' | 'icon-sm' | 'icon-md' | 'icon-lg'
    loading = false,
    loadingText,
    icon: IconProp,
    iconRight: IconRightProp,
    disabled = false,
    requireAll, // Array of prerequisite values (e.g. [name, classId]) or single value
    disabledReason, // Tooltip / title explaining why disabled
    fullWidth = false,
    className = '',
    onClick,
    title,
    ...restProps
  },
  ref
) {
  // ─── Prerequisites / Requirements Evaluation ──────────────────────────────
  const requirementsMet = useMemo(() => {
    if (requireAll === undefined) return true;
    if (Array.isArray(requireAll)) {
      return requireAll.every((cond) => isConditionMet(cond));
    }
    return isConditionMet(requireAll);
  }, [requireAll]);

  const isDisabled = disabled || loading || !requirementsMet;

  // ─── Size Mappings ────────────────────────────────────────────────────────
  const sizeClasses = useMemo(() => {
    switch (size) {
      case 'xs':
        return 'px-2.5 py-1 text-[11px] font-bold rounded-lg gap-1.5';
      case 'sm':
        return 'px-3.5 py-1.5 text-xs font-bold rounded-xl gap-1.5';
      case 'lg':
        return 'px-6 py-3 text-sm font-bold rounded-2xl gap-2.5';
      case 'icon-xs':
        return 'p-1.5 rounded-lg';
      case 'icon-sm':
        return 'p-2 rounded-xl';
      case 'icon-lg':
        return 'p-3 rounded-2xl';
      case 'icon-md':
      case 'icon':
        return 'p-2.5 rounded-xl';
      case 'md':
      default:
        return 'px-5 py-2.5 text-xs font-bold rounded-xl gap-2';
    }
  }, [size]);

  // Default icon dimensions based on button size
  const iconSizeClasses = useMemo(() => {
    switch (size) {
      case 'xs':
      case 'icon-xs':
        return 'w-3 h-3';
      case 'sm':
      case 'icon-sm':
        return 'w-3.5 h-3.5';
      case 'lg':
      case 'icon-lg':
        return 'w-5 h-5';
      case 'md':
      case 'icon-md':
      case 'icon':
      default:
        return 'w-4 h-4';
    }
  }, [size]);

  // ─── Variant Styling ──────────────────────────────────────────────────────
  const variantClasses = useMemo(() => {
    switch (variant) {
      case 'secondary':
      case 'sub':
        return 'theme-bg-sub border theme-border hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary shadow-2xs';
      case 'surface':
        return 'theme-bg-surface border theme-border hover:theme-border-strong hover:theme-text-primary theme-text-secondary shadow-2xs';
      case 'outline':
      case 'soft':
        return 'theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/30 hover:border-[var(--accent-main)]/60 hover:bg-[var(--accent-main)]/20 shadow-2xs';
      case 'danger':
      case 'danger-soft':
        return 'theme-bg-danger-soft theme-danger border theme-border-danger hover:opacity-85 shadow-2xs';
      case 'danger-solid':
        return 'theme-bg-danger text-white hover:opacity-90 shadow-xs';
      case 'success':
      case 'success-soft':
        return 'theme-bg-success-soft theme-success border theme-border-success hover:opacity-85 shadow-2xs';
      case 'success-solid':
        return 'theme-bg-success text-white hover:opacity-90 shadow-xs';
      case 'warning':
      case 'warning-soft':
        return 'theme-bg-warning-soft theme-warning border theme-border-warning hover:opacity-85 shadow-2xs';
      case 'ghost':
        return 'bg-transparent hover:theme-bg-sub theme-text-secondary hover:theme-text-primary';
      case 'primary':
      default:
        return 'theme-bg-accent theme-accent-text shadow-md hover:opacity-90';
    }
  }, [variant]);

  // ─── Icon Render Helpers ──────────────────────────────────────────────────
  const renderIcon = (IconItem) => {
    if (!IconItem) return null;
    if (React.isValidElement(IconItem)) {
      return IconItem;
    }
    if (typeof IconItem === 'function') {
      const Component = IconItem;
      return <Component className={iconSizeClasses} />;
    }
    return null;
  };

  const effectiveTitle = title || (isDisabled && disabledReason ? disabledReason : undefined);

  const handleClick = (e) => {
    if (isDisabled) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onClick?.(e);
  };

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      onClick={handleClick}
      title={effectiveTitle}
      aria-disabled={isDisabled}
      aria-busy={loading}
      className={`inline-flex items-center justify-center transition-all duration-150 select-none cursor-pointer ${
        fullWidth ? 'w-full' : ''
      } ${sizeClasses} ${variantClasses} ${
        isDisabled
          ? 'opacity-50 cursor-not-allowed pointer-events-none active:scale-100 shadow-none'
          : 'active:scale-[0.98]'
      } ${className}`}
      {...restProps}
    >
      {/* Loading Spinner or Left Icon */}
      {loading ? (
        <SpinnerIcon className={iconSizeClasses} />
      ) : (
        renderIcon(IconProp)
      )}

      {/* Button Content / Loading Text */}
      {loading && loadingText ? (
        <span>{loadingText}</span>
      ) : (
        children !== undefined && children !== null && <span>{children}</span>
      )}

      {/* Right Icon (Hidden when loading to preserve layout balance) */}
      {!loading && renderIcon(IconRightProp)}
    </button>
  );
});

export default CustomButton;
