/**
 * TokenInspectorPopover
 *
 * Enterprise-grade Minimal Editable Floating Popover for DocLab Tokens.
 * Displays the token expression in a lightweight, clean editable input with
 * instant Save, Copy, and Delete actions. Supports both Hover and Click interaction.
 * Features ultra-close snug positioning and live dynamic scroll tracking.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CopyIcon, CheckIcon, CloseIcon, TrashIcon } from '../../../ui/Icons';

export interface TokenInspectorPopoverProps {
  /** The raw token string or expression, e.g. "exam-date | direction: horizontal, separator: cell" */
  rawToken: string;
  /** Bounding client rect of the triggering token chip */
  anchorRect?: DOMRect | { top: number; left: number; bottom: number; right: number; width: number; height: number } | null;
  /** Direct DOM element reference for live dynamic repositioning on scroll/zoom */
  targetElement?: HTMLElement | null;
  /** Taxonomy label (optional metadata) */
  displayLabel?: string;
  /** Category badge name (optional metadata) */
  category?: string;
  /** Realistic sample value (optional metadata) */
  sampleValue?: string;
  /** Whether the popover was opened via click (pinned) or hover */
  isPinned?: boolean;
  /** Callback fired when the user applies updated token changes */
  onApply?: (newRawToken: string) => void;
  /** Callback fired when user deletes the token */
  onDelete?: () => void;
  /** Callback fired when popover is closed/dismissed */
  onClose: () => void;
  /** Callback when mouse enters popover */
  onMouseEnter?: () => void;
  /** Callback when mouse leaves popover */
  onMouseLeave?: () => void;
  /** Callback when pin state changes */
  onPinChange?: (isPinned: boolean) => void;
}

/** Formats a token string cleanly with surrounding double brackets `{{...}}` */
function formatMustacheDisplay(token: string): string {
  const clean = (token || '').trim();
  if (clean.startsWith('{{') && clean.endsWith('}}')) return clean;
  return `{{${clean.replace(/^\{+/, '').replace(/\}+$/, '').trim()}}`;
}

/** Extracts the inner key / expression without surrounding double brackets */
function stripMustacheBrackets(token: string): string {
  return (token || '').replace(/^\{+/, '').replace(/\}+$/, '').trim();
}

export const TokenInspectorPopover: React.FC<TokenInspectorPopoverProps> = ({
  rawToken,
  anchorRect,
  targetElement,
  isPinned = false,
  onApply,
  onDelete,
  onClose,
  onMouseEnter,
  onMouseLeave,
  onPinChange,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLocalPinned, setIsLocalPinned] = useState<boolean>(isPinned);
  const [editValue, setEditValue] = useState<string>(() => formatMustacheDisplay(rawToken));
  const [copied, setCopied] = useState<boolean>(false);

  // Sync internal editValue whenever rawToken prop changes
  useEffect(() => {
    setEditValue(formatMustacheDisplay(rawToken));
  }, [rawToken]);

  // Sync pinned state when isPinned prop changes
  useEffect(() => {
    if (isPinned) {
      setIsLocalPinned(true);
    }
  }, [isPinned]);

  // Direct positioning calculation that updates DOM styles without React state cascade loops
  const updatePosition = useCallback(() => {
    if (!popoverRef.current) return;
    const rect = targetElement?.isConnected
      ? targetElement.getBoundingClientRect()
      : anchorRect;

    if (!rect) return;

    const popoverWidth = Math.min(320, typeof window !== 'undefined' ? window.innerWidth - 16 : 300);
    const popoverHeight = 36;
    const margin = 3;

    let top = rect.bottom + margin;
    let left = rect.left;

    if (typeof window !== 'undefined') {
      const vWidth = window.innerWidth;
      const vHeight = window.innerHeight;

      if (left < 8) left = 8;
      if (left + popoverWidth > vWidth - 8) {
        left = vWidth - popoverWidth - 8;
      }

      if (top + popoverHeight > vHeight - 8) {
        top = Math.max(8, rect.top - popoverHeight - margin);
      }
    }

    popoverRef.current.style.top = `${Math.round(top)}px`;
    popoverRef.current.style.left = `${Math.round(left)}px`;
    popoverRef.current.style.width = `${popoverWidth}px`;
  }, [targetElement, anchorRect]);

  // Live dynamic positioning tracking on scroll, resize, and canvas pan/zoom
  useEffect(() => {
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [updatePosition]);

  // Auto-focus input when pinned
  useEffect(() => {
    if (isLocalPinned && inputRef.current && document.activeElement !== inputRef.current) {
      inputRef.current.focus({ preventScroll: true });
    }
  }, [isLocalPinned]);

  // Positioning calculations for initial render
  const initialStyle = useMemo<React.CSSProperties>(() => {
    const rect = targetElement?.isConnected ? targetElement.getBoundingClientRect() : anchorRect;
    if (!rect) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 99999,
      };
    }

    const popoverWidth = Math.min(320, typeof window !== 'undefined' ? window.innerWidth - 16 : 300);
    const popoverHeight = 36;
    const margin = 3;

    let top = rect.bottom + margin;
    let left = rect.left;

    if (typeof window !== 'undefined') {
      const vWidth = window.innerWidth;
      const vHeight = window.innerHeight;

      if (left < 8) left = 8;
      if (left + popoverWidth > vWidth - 8) {
        left = vWidth - popoverWidth - 8;
      }

      if (top + popoverHeight > vHeight - 8) {
        top = Math.max(8, rect.top - popoverHeight - margin);
      }
    }

    return {
      position: 'fixed',
      top: `${Math.round(top)}px`,
      left: `${Math.round(left)}px`,
      width: `${popoverWidth}px`,
      maxWidth: 'calc(100vw - 16px)',
      zIndex: 99999,
    };
  }, [targetElement, anchorRect]);

  const handleSaveAndClose = useCallback(() => {
    const cleanKey = stripMustacheBrackets(editValue);
    const originalKey = stripMustacheBrackets(rawToken);
    if (cleanKey && cleanKey !== originalKey && onApply) {
      onApply(cleanKey);
    }
    onClose();
  }, [editValue, rawToken, onApply, onClose]);

  // Click outside and Escape key listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handlePointerDownOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        handleSaveAndClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handlePointerDownOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handlePointerDownOutside);
    };
  }, [onClose, handleSaveAndClose]);

  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(editValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }, [editValue]);

  const handlePin = useCallback(() => {
    setIsLocalPinned(true);
    onPinChange?.(true);
  }, [onPinChange]);

  const popoverContent = (
    <div
      ref={popoverRef}
      style={initialStyle}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        handlePin();
      }}
      data-token-popover="true"
      className="doclab-token-popover theme-bg-elevated/95 backdrop-blur-md border theme-border rounded-lg shadow-xl p-1 flex items-center gap-1 text-xs theme-text-primary animate-in fade-in-0 zoom-in-95 duration-100 text-left z-[99999]"
    >
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onFocus={handlePin}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          handlePin();
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSaveAndClose();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
          }
        }}
        onKeyUp={(e) => e.stopPropagation()}
        onKeyPress={(e) => e.stopPropagation()}
        placeholder="{{variable_name}}"
        className="flex-1 px-2 py-1 rounded bg-transparent border-0 font-mono text-[11.5px] font-medium text-[var(--accent-main)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-main)]/40 min-w-0 select-text leading-tight cursor-text"
      />

      {/* Save / Apply Button */}
      <button
        type="button"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          handleSaveAndClose();
        }}
        className="p-1 rounded hover:bg-[var(--accent-main)]/10 text-[var(--accent-main)] transition-colors cursor-pointer shrink-0 active:scale-95"
        title="Save Key (Enter)"
      >
        <CheckIcon className="w-3.5 h-3.5" />
      </button>

      {/* Copy Button */}
      <button
        type="button"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={handleCopy}
        className="p-1 rounded hover:theme-bg-sub theme-text-secondary hover:theme-text-primary transition-colors cursor-pointer shrink-0 active:scale-95"
        title={copied ? 'Copied' : 'Copy Key'}
      >
        {copied ? (
          <CheckIcon className="w-3.5 h-3.5 text-emerald-500" />
        ) : (
          <CopyIcon className="w-3.5 h-3.5" />
        )}
      </button>

      {/* Delete Button */}
      {onDelete && (
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 rounded hover:bg-red-500/10 text-red-500 hover:text-red-600 transition-colors cursor-pointer shrink-0 active:scale-95"
          title="Delete Key"
        >
          <TrashIcon className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Close Button */}
      <button
        type="button"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="p-1 rounded hover:theme-bg-sub theme-text-secondary hover:theme-text-primary transition-colors cursor-pointer shrink-0 active:scale-95"
        title="Close (Esc)"
      >
        <CloseIcon className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(popoverContent, document.body);
};

export default TokenInspectorPopover;
