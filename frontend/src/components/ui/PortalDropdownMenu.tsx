import React from 'react';
import { createPortal } from 'react-dom';
import type { PortalCoords } from '../../hooks/usePortalPosition';

export interface PortalDropdownMenuProps {
  isOpen: boolean;
  coords: PortalCoords;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  optionsListRef?: React.RefObject<HTMLDivElement | null>;
  header?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  listClassName?: string;
  zIndex?: number;
}

/**
 * Enterprise Reusable Portal Dropdown Menu Component
 * 
 * Renders dropdown content directly inside `document.body` via React Portal,
 * preventing clipping from any parent overflow-hidden containers, while applying
 * design token glassmorphism, animations, and responsive boundaries.
 */
export default function PortalDropdownMenu({
  isOpen,
  coords,
  dropdownRef,
  optionsListRef,
  header = null,
  children,
  className = '',
  listClassName = '',
  zIndex = 99999,
}: PortalDropdownMenuProps) {
  if (!isOpen || coords.width <= 0 || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        left: `${coords.left}px`,
        top: coords.openUpward ? 'auto' : `${coords.top}px`,
        bottom: coords.openUpward ? `${window.innerHeight - coords.top}px` : 'auto',
        width: `${coords.width}px`,
        zIndex,
      }}
      className={`theme-bg-surface border theme-border shadow-[0_16px_36px_-6px_rgba(0,0,0,0.35),0_6px_16px_rgba(0,0,0,0.15)] overflow-hidden rounded-2xl p-1.5 backdrop-blur-2xl transition-all duration-200 ease-out ${
        coords.openUpward ? 'origin-bottom animate-dropdown-up' : 'origin-top animate-dropdown-down'
      } ${className}`}
    >
      {header}
      <div
        ref={optionsListRef}
        style={{
          maxHeight: `${Math.max(80, coords.maxHeight - (header ? 55 : 10))}px`,
        }}
        className={`p-1 space-y-0.5 overflow-y-auto scrollbar-none no-scrollbar scroll-smooth ${listClassName}`}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
