import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { DotsVerticalIcon, ChevronIcon } from './Icons';

/** @type {any} */
export default function ActionMenu({
  items = [],
  actions = null,
  align = 'right',
  buttonClassName = '',
  menuClassName = '',
  icon: TriggerIcon = DotsVerticalIcon,
  label = null,
  disabled = false,
  size = 'md', // 'xs' | 'sm' | 'md'
  variant = 'default', // 'default' | 'sub' | 'surface'
  showChevron = true,
  ariaLabel = 'Actions Menu',
  header = null,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, right: 0, isFlipped: false });
  const buttonRef = useRef(null);
  const menuPortalRef = useRef(null);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = 200;
    const menuHeight = 220;
    const padding = 6;

    // Check if bottom overflow
    const spaceBelow = window.innerHeight - rect.bottom;
    const isFlipped = spaceBelow < menuHeight && rect.top > menuHeight;

    let top = isFlipped ? rect.top - padding : rect.bottom + padding;
    let left = rect.left;
    let right = window.innerWidth - rect.right;

    setCoords({ top, left, right, isFlipped });
  }, []);

  const handleToggle = (e) => {
    e.stopPropagation();
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  // Synchronously measure and place menu before browser paint
  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
    }
  }, [isOpen, updatePosition]);

  useEffect(() => {
    function handleClickOutside(event) {
      const isButtonClicked = buttonRef.current && buttonRef.current.contains(event.target);
      const isMenuClicked = menuPortalRef.current && menuPortalRef.current.contains(event.target);

      if (!isButtonClicked && !isMenuClicked) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    function handleScrollOrResize() {
      if (isOpen) {
        updatePosition();
      }
    }

    if (isOpen) {
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
  }, [isOpen, updatePosition]);

  const rawItems = items && items.length > 0 ? items : actions || [];
  const activeItems = rawItems.filter((item) => item && !item.hidden);

  const renderIcon = (iconInput, className) => {
    if (!iconInput) return null;
    if (React.isValidElement(iconInput)) {
      return React.cloneElement(iconInput, {
        className: `${iconInput.props.className || ''} ${className}`.trim(),
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
      : 'px-3.5 py-2 text-xs gap-2 rounded-xl';

  const iconOnlySizeClasses =
    size === 'xs'
      ? 'p-1 rounded-lg'
      : size === 'sm'
      ? 'p-1.5 rounded-xl'
      : 'p-2 rounded-xl';

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

  const iconOnlyVariantClasses = variantClasses;

  return (
    <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        className={`${
          label
            ? `inline-flex items-center font-semibold border transition-all duration-150 select-none ${sizeClasses} ${variantClasses}`
            : `transition-all duration-150 focus:outline-none flex items-center justify-center ${iconOnlySizeClasses} ${iconOnlyVariantClasses}`
        } ${
          disabled ? 'opacity-50 cursor-not-allowed pointer-events-none shadow-none' : 'cursor-pointer'
        } ${
          isOpen
            ? variant === 'primary'
              ? 'opacity-95 ring-2 ring-[var(--accent-main)]/40'
              : variant === 'ghost'
              ? 'opacity-85'
              : 'theme-bg-sub theme-text-primary ring-2 ring-[var(--accent-main)]/30'
            : ''
        } ${buttonClassName}`}
      >
        {renderIcon(
          TriggerIcon,
          label
            ? `w-3.5 h-3.5 shrink-0 ${variant === 'primary' ? '' : 'theme-accent'}`
            : `w-4 h-4 shrink-0 ${variant === 'ghost' ? 'theme-accent' : ''}`
        )}
        {label && <span className="truncate">{label}</span>}
        {label && showChevron && (
          <ChevronIcon
            isOpen={isOpen}
            className={`w-3 h-3 ml-0.5 shrink-0 ${variant === 'primary' ? 'opacity-90' : variant === 'ghost' ? 'theme-accent opacity-90' : 'opacity-70'}`}
          />
        )}
      </button>

      {isOpen && coords.top > 0 && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuPortalRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: coords.isFlipped ? undefined : `${coords.top}px`,
              bottom: coords.isFlipped ? `${window.innerHeight - coords.top}px` : undefined,
              left: align === 'left' ? `${coords.left}px` : undefined,
              right: align === 'right' ? `${coords.right}px` : undefined,
              zIndex: 99999,
            }}
            className={`min-w-[190px] max-w-[280px] max-h-[320px] overflow-y-auto scrollbar-none no-scrollbar rounded-2xl theme-bg-surface border theme-border shadow-2xl p-1.5 space-y-0.5 animate-scale-in text-left focus:outline-none backdrop-blur-md print:hidden print-studio-no-print ${menuClassName}`}
          >
            {header && (
              <div className="px-3 py-1.5 text-[10px] font-bold theme-text-secondary uppercase tracking-wider border-b theme-border-subtle mb-1">
                {header}
              </div>
            )}
            {activeItems.map((item, index) => {
              if (item.divider) {
                return <div key={`divider-${index}`} className="my-1 border-t theme-border-subtle mx-1" />;
              }

              const isDanger = item.danger || item.variant === 'danger' || item.variant === 'destructive';
              const isDisabled = item.disabled;

              return (
                <button
                  key={item.label || index}
                  type="button"
                  disabled={isDisabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isDisabled) return;
                    setIsOpen(false);
                    item.onClick?.(e);
                  }}
                  className={`w-full px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-2.5 transition-all duration-150 cursor-pointer text-left select-none group/item ${
                    isDisabled
                      ? 'opacity-40 cursor-not-allowed theme-text-muted pointer-events-none'
                      : isDanger
                      ? 'theme-danger hover:bg-[var(--color-danger)]/15 hover:theme-danger focus:bg-[var(--color-danger)]/15 focus:theme-danger'
                      : 'theme-text-primary hover:bg-[var(--accent-main)]/15 hover:theme-accent focus:bg-[var(--accent-main)]/15 focus:theme-accent'
                  }`}
                  title={item.title || item.label}
                >
                  {renderIcon(
                    item.icon,
                    `w-3.5 h-3.5 shrink-0 transition-transform duration-150 group-hover/item:scale-110 ${
                      item.iconClassName || (isDanger ? 'theme-danger' : 'theme-accent')
                    }`
                  )}
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10.5px] font-mono tracking-tight opacity-40 theme-text-muted group-hover/item:opacity-80 transition-opacity select-none ${
                        item.badgeClassName || ''
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}
