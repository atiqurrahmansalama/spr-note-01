import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { DotsVerticalIcon, ChevronIcon } from './Icons';
import IconButton from './IconButton';

export interface ActionMenuItem {
  label?: string;
  icon?: React.ComponentType<{ className?: string }> | React.ReactElement<{ className?: string }>;
  iconClassName?: string;
  onClick?: (e?: React.MouseEvent) => void;
  variant?: 'default' | 'danger' | 'warning' | 'destructive' | string;
  danger?: boolean;
  disabled?: boolean;
  divider?: boolean;
  badge?: string | number;
  badgeClassName?: string;
  title?: string;
  hidden?: boolean;
  [key: string]: any;
}

export interface ActionMenuProps {
  items?: ActionMenuItem[];
  actions?: ActionMenuItem[] | null;
  align?: 'left' | 'right';
  buttonClassName?: string;
  menuClassName?: string;
  icon?: React.ComponentType<{ className?: string }>;
  label?: React.ReactNode;
  disabled?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | string;
  variant?: 'default' | 'sub' | 'surface' | 'primary' | 'ghost' | string;
  showChevron?: boolean;
  ariaLabel?: string;
  header?: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  showActiveRing?: boolean;
  // --- Coordinate / Controlled Context Menu Props ---
  isOpen?: boolean;
  onClose?: (() => void) | null;
  coords?: { x?: number; y?: number; left?: number; top?: number } | null;
  x?: number | null;
  y?: number | null;
  headless?: boolean;
  children?: React.ReactNode;
}

/**
 * Universal Action & Context Menu Component (TypeScript)
 *
 * Supports two operational modes:
 * 1. Button Anchor Mode (Default): Renders an interactive trigger button (label or icon)
 *    and positions the dropdown relative to the button element.
 * 2. Coordinate / Context Menu Mode: Controlled via `coords: { x, y }` or `x`, `y` and `isOpen`.
 *    Renders directly at cursor coordinates (e.g. on row right-click) with automatic
 *    viewport overflow protection and headless execution.
 */
export default function ActionMenu({
  items = [],
  actions = null,
  align = 'right',
  buttonClassName = '',
  menuClassName = '',
  icon: TriggerIcon = DotsVerticalIcon,
  label = null,
  disabled = false,
  size = 'md',
  variant = 'default',
  showChevron = true,
  ariaLabel = 'Actions Menu',
  header = null,
  title = null,
  subtitle = null,
  showActiveRing = undefined,
  // --- Coordinate / Controlled Context Menu Props ---
  isOpen: controlledIsOpen = undefined,
  onClose = null,
  coords: externalCoords = null,
  x = null,
  y = null,
  headless = false,
  children = null,
}: ActionMenuProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isControlled = controlledIsOpen !== undefined;
  const isMenuOpen = isControlled ? Boolean(controlledIsOpen) : internalIsOpen;

  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    right: number;
    isFlipped: boolean;
    isCustomCoord: boolean;
  }>({
    top: 0,
    left: 0,
    right: 0,
    isFlipped: false,
    isCustomCoord: false,
  });

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuPortalRef = useRef<HTMLDivElement | null>(null);

  // Check if opening in mouse coordinate mode
  const isCoordMode = headless || externalCoords !== null || (x !== null && y !== null);

  const closeMenu = useCallback(() => {
    if (!isControlled) {
      setInternalIsOpen(false);
    }
    onClose?.();
  }, [isControlled, onClose]);

  const updatePosition = useCallback(() => {
    // 1. Coordinate / Context Menu Mode (Arbitrary mouse position x, y)
    if (isCoordMode) {
      const posX = typeof x === 'number' ? x : externalCoords?.x ?? externalCoords?.left ?? 20;
      const posY = typeof y === 'number' ? y : externalCoords?.y ?? externalCoords?.top ?? 20;
      const estimatedWidth = 224;
      const estimatedHeight = 280;

      const adjustedX = Math.max(10, Math.min(posX, window.innerWidth - estimatedWidth - 10));
      const adjustedY = Math.max(10, Math.min(posY, window.innerHeight - estimatedHeight - 10));

      setCoords({
        top: adjustedY,
        left: adjustedX,
        right: 0,
        isFlipped: false,
        isCustomCoord: true,
      });
      return;
    }

    // 2. Anchor Button Mode (Relative to trigger button DOMRect)
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = 200;
    const menuHeight = 220;
    const padding = 6;

    // Check if bottom overflow
    const spaceBelow = window.innerHeight - rect.bottom;
    const isFlipped = spaceBelow < menuHeight && rect.top > menuHeight;

    const top = isFlipped ? rect.top - padding : rect.bottom + padding;
    const left = rect.left;
    const right = window.innerWidth - rect.right;

    setCoords({ top, left, right, isFlipped, isCustomCoord: false });
  }, [isCoordMode, x, y, externalCoords]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    if (!isMenuOpen) {
      updatePosition();
      if (!isControlled) setInternalIsOpen(true);
    } else {
      closeMenu();
    }
  };

  // Synchronously measure and place menu before browser paint
  useLayoutEffect(() => {
    if (isMenuOpen) {
      updatePosition();
    }
  }, [isMenuOpen, updatePosition]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const isButtonClicked = buttonRef.current && buttonRef.current.contains(target);
      const isMenuClicked = menuPortalRef.current && menuPortalRef.current.contains(target);

      if (!isButtonClicked && !isMenuClicked) {
        closeMenu();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeMenu();
      }
    }

    function handleScrollOrResize() {
      if (isMenuOpen) {
        if (isCoordMode) {
          closeMenu();
        } else {
          updatePosition();
        }
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside, true);
      document.addEventListener('keydown', handleKeyDown);
      window.addEventListener('resize', handleScrollOrResize, true);
      window.addEventListener('scroll', handleScrollOrResize, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleScrollOrResize, true);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isMenuOpen, isCoordMode, updatePosition, closeMenu]);

  const rawItems = items && items.length > 0 ? items : actions || [];
  const activeItems = rawItems.filter((item) => item && !item.hidden);

  const renderIcon = (iconInput: any, className: string) => {
    if (!iconInput) return null;
    if (React.isValidElement(iconInput)) {
      return React.cloneElement(iconInput as React.ReactElement<{ className?: string }>, {
        className: `${(iconInput.props as any)?.className || ''} ${className}`.trim(),
      });
    }
    if (typeof iconInput === 'function' || typeof iconInput === 'object') {
      const IconComponent = iconInput;
      return <IconComponent className={className} />;
    }
    return null;
  };

  const sizeClasses =
    size === 'xs'
      ? 'px-2.5 py-1 text-xs gap-1.5 rounded-xl'
      : size === 'sm'
      ? 'px-3 py-1.5 text-xs gap-1.5 rounded-xl'
      : size === 'lg'
      ? 'px-4 py-2.5 text-sm gap-2.5 rounded-xl'
      : 'px-3.5 py-2 text-xs gap-2 rounded-xl';

  const variantClasses =
    variant === 'ghost'
      ? 'border border-transparent bg-transparent hover:theme-bg-sub theme-accent shadow-none'
      : variant === 'primary'
      ? 'border border-transparent theme-bg-accent theme-accent-text hover:opacity-95 shadow-xs'
      : variant === 'surface'
      ? 'theme-bg-surface hover:theme-bg-sub/60 border theme-border theme-text-secondary hover:theme-text-primary shadow-2xs'
      : variant === 'sub'
      ? 'theme-bg-sub hover:theme-bg-elevated border theme-border theme-text-secondary hover:theme-text-primary shadow-2xs'
      : 'border theme-border hover:theme-bg-sub theme-text-secondary hover:theme-text-primary shadow-xs';

  return (
    <div
      className={isCoordMode ? 'inline' : 'relative inline-block text-left'}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. Trigger Button (Omitted if in headless or coordinate mode) */}
      {!isCoordMode && (
        label ? (
          <button
            ref={buttonRef}
            type="button"
            disabled={disabled}
            onClick={handleToggle}
            aria-label={ariaLabel}
            aria-expanded={isMenuOpen}
            className={`inline-flex items-center font-semibold border transition-all duration-150 select-none ${sizeClasses} ${variantClasses} ${
              disabled ? 'opacity-50 cursor-not-allowed pointer-events-none shadow-none' : 'cursor-pointer'
            } ${
              isMenuOpen
                ? variant === 'primary'
                  ? 'opacity-95 ring-2 ring-[var(--accent-main)]/40'
                  : variant === 'ghost'
                  ? 'opacity-85'
                  : (showActiveRing ?? (variant !== 'ghost' && variant !== 'sub'))
                  ? 'theme-bg-sub theme-text-primary ring-2 ring-[var(--accent-main)]/30'
                  : 'theme-bg-sub theme-text-primary'
                : ''
            } ${buttonClassName}`}
          >
            {renderIcon(
              TriggerIcon,
              `w-3.5 h-3.5 shrink-0 ${variant === 'primary' ? '' : 'theme-accent'}`
            )}
            <span className="truncate">{label}</span>
            {showChevron && (
              <ChevronIcon
                isOpen={isMenuOpen}
                className={`w-3 h-3 ml-0.5 shrink-0 ${variant === 'primary' ? 'opacity-90' : variant === 'ghost' ? 'theme-accent opacity-90' : 'opacity-70'}`}
              />
            )}
          </button>
        ) : (
          <IconButton
            ref={buttonRef}
            type="button"
            disabled={disabled}
            onClick={handleToggle}
            ariaLabel={ariaLabel}
            aria-expanded={isMenuOpen}
            icon={TriggerIcon}
            size={size === 'xs' ? 'xs' : size === 'sm' ? 'sm' : 'md'}
            variant={
              variant === 'ghost'
                ? 'ghost'
                : variant === 'primary'
                ? 'accent-soft'
                : variant === 'surface'
                ? 'surface'
                : variant === 'sub'
                ? 'sub'
                : 'sub'
            }
            shape="rounded"
            active={isMenuOpen}
            className={`${
              isMenuOpen
                ? (showActiveRing ?? (variant !== 'ghost' && variant !== 'sub' && variant !== 'surface'))
                  ? 'ring-2 ring-[var(--accent-main)]/30 theme-bg-sub'
                  : 'theme-bg-sub'
                : ''
            } ${buttonClassName}`}
          />
        )
      )}

      {/* 2. Menu Popover (Portal to document.body) */}
      {isMenuOpen && (coords.top > 0 || coords.isCustomCoord) && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuPortalRef}
            role="menu"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: coords.isCustomCoord
                ? `${coords.top}px`
                : coords.isFlipped
                ? undefined
                : `${coords.top}px`,
              bottom: coords.isCustomCoord
                ? undefined
                : coords.isFlipped
                ? `${window.innerHeight - coords.top}px`
                : undefined,
              left: coords.isCustomCoord
                ? `${coords.left}px`
                : align === 'left'
                ? `${coords.left}px`
                : undefined,
              right: coords.isCustomCoord
                ? undefined
                : align === 'right'
                ? `${coords.right}px`
                : undefined,
              zIndex: 99999,
            }}
            className={`min-w-[190px] max-w-[280px] max-h-[340px] overflow-y-auto scrollbar-none no-scrollbar rounded-2xl theme-bg-surface border theme-border shadow-2xl p-1.5 space-y-0.5 animate-scale-in text-left focus:outline-none backdrop-blur-md select-none print:hidden print-studio-no-print ${menuClassName}`}
          >
            {/* Header: title/subtitle or header label */}
            {(title || subtitle) ? (
              <div className="px-3 py-2 border-b theme-border text-[11px] theme-text-secondary select-none mb-1">
                {title && <p className="font-bold theme-text-primary truncate">{title}</p>}
                {subtitle && <p className="text-[10px] truncate mt-0.5 opacity-80">{subtitle}</p>}
              </div>
            ) : header ? (
              <div className="px-3 py-1.5 text-[10px] font-bold theme-text-secondary uppercase tracking-wider border-b theme-border-subtle mb-1">
                {header}
              </div>
            ) : null}

            {/* Menu Items */}
            {activeItems.map((item, index) => {
              if (item.divider) {
                return <div key={`divider-${index}`} className="my-1 border-t theme-border-subtle mx-1" />;
              }

              const isDanger = item.danger || item.variant === 'danger' || item.variant === 'destructive';
              const isWarning = item.variant === 'warning';
              const isDisabled = item.disabled;

              return (
                <button
                  key={item.label || index}
                  type="button"
                  role="menuitem"
                  disabled={isDisabled}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isDisabled) return;
                    try {
                      item.onClick?.(e);
                    } finally {
                      closeMenu();
                    }
                  }}
                  className={`w-full px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-2.5 transition-all duration-150 cursor-pointer text-left select-none group/item ${
                    isDisabled
                      ? 'opacity-40 cursor-not-allowed theme-text-muted pointer-events-none'
                      : isDanger
                      ? 'text-rose-400 hover:bg-rose-500/15 focus:bg-rose-500/15 active:bg-rose-500/20'
                      : isWarning
                      ? 'text-amber-400 hover:bg-amber-500/15 focus:bg-amber-500/15 active:bg-amber-500/20'
                      : 'theme-text-primary hover:bg-[var(--accent-main)]/15 hover:theme-accent focus:bg-[var(--accent-main)]/15 focus:theme-accent'
                  }`}
                  title={item.title || item.label}
                >
                  {renderIcon(
                    item.icon,
                    `w-3.5 h-3.5 shrink-0 transition-transform duration-150 group-hover/item:scale-110 ${
                      item.iconClassName || (isDanger ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'theme-accent')
                    }`
                  )}
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-mono tracking-tight opacity-70 px-1.5 py-0.5 rounded theme-bg-sub border theme-border ${
                        item.badgeClassName || ''
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Custom Children */}
            {children}
          </div>,
          document.body
        )}
    </div>
  );
}
