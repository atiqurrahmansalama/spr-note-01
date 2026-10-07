/**
 * TokenInspectorPopover
 *
 * Enterprise-grade Minimal Editable Floating Popover for DocLab Tokens.
 * Displays the full token key / expression in a lightweight, clean editable input.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CopyIcon, CheckIcon, CloseIcon, TrashIcon } from '../../../ui/Icons';

export interface TokenInspectorPopoverProps {
  /** The raw token string or expression, e.g. "exam-date | direction: horizontal, separator: cell" */
  rawToken: string;
  /** Bounding client rect of the triggering token chip */
  anchorRect?: DOMRect | { top: number; left: number; bottom: number; right: number; width: number; height: number } | null;
  /** Category or human-readable taxonomy label */
  displayLabel?: string;
  /** Category badge name (e.g. 'hifz', 'examination', 'student') */
  category?: string;
  /** Callback fired when the user applies updated token changes */
  onApply?: (newRawToken: string) => void;
  /** Callback fired when user deletes the token */
  onDelete?: () => void;
  /** Callback fired when popover is closed/dismissed */
  onClose: () => void;
}

export const TokenInspectorPopover: React.FC<TokenInspectorPopoverProps> = ({
  rawToken,
  anchorRect,
  onApply,
  onDelete,
  onClose,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const clean = (rawToken || '').trim();
  const initialFullKey = clean.startsWith('{{') && clean.endsWith('}}')
    ? clean
    : `{{${clean.replace(/^\{+/, '').replace(/\}+$/, '').trim()}}`;

  const [editValue, setEditValue] = useState<string>(initialFullKey);
  const [copied, setCopied] = useState(false);

  // Auto-focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  // Positioning calculations (compact floating popover directly adjacent to token chip)
  const popoverStyle = useMemo<React.CSSProperties>(() => {
    if (!anchorRect) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 9999,
      };
    }

    const popoverWidth = Math.min(460, typeof window !== 'undefined' ? window.innerWidth - 32 : 380);
    const popoverHeight = 44;
    const margin = 6;

    let top = anchorRect.bottom + margin;
    let left = anchorRect.left + anchorRect.width / 2 - popoverWidth / 2;

    if (typeof window !== 'undefined') {
      const vWidth = window.innerWidth;
      const vHeight = window.innerHeight;

      if (left < margin) left = margin;
      if (left + popoverWidth > vWidth - margin) {
        left = vWidth - popoverWidth - margin;
      }

      // If overflowing bottom, flip to above the token
      if (top + popoverHeight > vHeight - margin) {
        top = Math.max(margin, anchorRect.top - popoverHeight - margin);
      }
    }

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${popoverWidth}px`,
      maxWidth: 'calc(100vw - 32px)',
      zIndex: 9999,
    };
  }, [anchorRect]);

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed) {
      const cleanKey = trimmed.replace(/^\{+/, '').replace(/\}+$/, '').trim();
      if (cleanKey && onApply) {
        onApply(cleanKey);
      }
    }
    onClose();
  };

  // Click outside and Escape key listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      }
    };

    const handlePointerDownOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handlePointerDownOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handlePointerDownOutside);
    };
  }, [onClose, editValue, onApply]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(editValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <>
      {/* Invisible backdrop to capture outside dismiss */}
      <div className="fixed inset-0 z-[9998] bg-transparent" onClick={onClose} />

      {/* Floating Small Editable Token Key Popup */}
      <div
        ref={popoverRef}
        style={popoverStyle}
        className="theme-bg-elevated border theme-border rounded-lg shadow-xl p-1.5 flex items-center gap-1.5 text-xs theme-text-primary animate-in fade-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          placeholder="{{variable_name}}"
          className="flex-1 px-2 py-1 rounded bg-transparent border-0 font-mono text-xs font-medium text-[var(--accent-main)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-main)] min-w-0"
        />

        {/* Save / Apply Button */}
        <button
          type="button"
          onClick={handleSave}
          className="p-1.5 rounded hover:bg-[var(--accent-main)]/10 text-[var(--accent-main)] transition-colors cursor-pointer shrink-0"
          title="Save Key (Enter)"
        >
          <CheckIcon className="w-3.5 h-3.5" />
        </button>

        {/* Copy Button */}
        <button
          type="button"
          onClick={handleCopy}
          className="p-1.5 rounded hover:theme-bg-sub theme-text-secondary hover:theme-text-primary transition-colors cursor-pointer shrink-0"
          title={copied ? 'Copied' : 'Copy Key'}
        >
          {copied ? <CheckIcon className="w-3.5 h-3.5 text-emerald-500" /> : <CopyIcon className="w-3.5 h-3.5" />}
        </button>

        {/* Delete Button */}
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 rounded hover:bg-red-500/10 text-red-500 hover:text-red-600 transition-colors cursor-pointer shrink-0"
            title="Delete Key"
          >
            <TrashIcon className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded hover:theme-bg-sub theme-text-secondary hover:theme-text-primary transition-colors cursor-pointer shrink-0"
          title="Close (Esc)"
        >
          <CloseIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    </>
  );
};


