import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { DotsVerticalIcon } from './Icons';

export default function ActionMenu({
  items = [],
  align = 'right',
  buttonClassName = '',
  menuClassName = '',
  icon: TriggerIcon = DotsVerticalIcon,
  ariaLabel = 'Actions Menu',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, right: 0, isFlipped: false });
  const buttonRef = useRef(null);
  const menuPortalRef = useRef(null);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = 180;
    const menuHeight = 160;
    const padding = 8;

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
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

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

  const activeItems = items.filter((item) => item && !item.hidden);

  if (activeItems.length === 0) return null;

  return (
    <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        className={`p-1.5 rounded-xl border theme-border hover:theme-bg-sub theme-text-secondary hover:theme-text-primary transition-all duration-150 cursor-pointer shadow-xs focus:outline-none flex items-center justify-center ${
          isOpen ? 'theme-bg-sub theme-text-primary ring-2 ring-[var(--accent-main)]/30' : ''
        } ${buttonClassName}`}
      >
        <TriggerIcon className="w-4 h-4" />
      </button>

      {isOpen &&
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
            className={`w-48 rounded-2xl theme-bg-surface border theme-border shadow-2xl py-1.5 animate-scale-in text-left focus:outline-none backdrop-blur-md ${menuClassName}`}
          >
            {activeItems.map((item, index) => {
              if (item.divider) {
                return <div key={`divider-${index}`} className="my-1 border-t theme-border" />;
              }

              const Icon = item.icon;
              const isDanger = item.danger;
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
                  className={`w-full px-3.5 py-2 text-xs font-medium flex items-center gap-2.5 transition-colors cursor-pointer text-left ${
                    isDisabled
                      ? 'opacity-40 cursor-not-allowed theme-text-muted'
                      : isDanger
                      ? 'text-rose-400 hover:bg-rose-500/10 focus:bg-rose-500/10'
                      : 'theme-text-primary hover:theme-bg-sub focus:theme-bg-sub'
                  }`}
                >
                  {Icon && (
                    <Icon
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isDanger ? 'text-rose-400' : 'theme-text-secondary'
                      }`}
                    />
                  )}
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md theme-bg-sub border theme-border">
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
