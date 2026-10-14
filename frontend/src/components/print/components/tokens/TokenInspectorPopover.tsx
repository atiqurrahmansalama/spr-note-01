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
  onApply?: (newRawToken: string, closeAfterApply?: boolean) => void;
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
  const inner = clean.replace(/^\{+/, '').replace(/\}+$/, '').trim();
  return `{{${inner}}}`;
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
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isLocalPinned, setIsLocalPinned] = useState<boolean>(isPinned);
  const [editValue, setEditValue] = useState<string>(() => stripMustacheBrackets(rawToken));
  const [copied, setCopied] = useState<boolean>(false);

  // Sync internal editValue whenever rawToken prop changes
  useEffect(() => {
    setEditValue(stripMustacheBrackets(rawToken));
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

    const popoverWidth = Math.min(340, typeof window !== 'undefined' ? window.innerWidth - 16 : 320);
    const popoverHeight = popoverRef.current.offsetHeight || 36;
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

  // Auto-resize textarea height dynamically based on scrollHeight
  const adjustTextareaHeight = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const newHeight = Math.min(Math.max(el.scrollHeight, 22), 140);
    el.style.height = `${newHeight}px`;
    updatePosition();
  }, [updatePosition]);

  useEffect(() => {
    adjustTextareaHeight();
  }, [editValue, adjustTextareaHeight]);

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

    const popoverWidth = Math.min(340, typeof window !== 'undefined' ? window.innerWidth - 16 : 320);
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

  // Listen for native input events and injected directive updates from CaretInsertManager
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const handleValueInjected = (e: any) => {
      const val = e.detail?.value ?? input.value;
      setEditValue(val);
      const cleanKey = stripMustacheBrackets(val);
      if (cleanKey && onApply) {
        onApply(cleanKey, false);
      }
    };

    const handleNativeInput = () => {
      setEditValue(input.value);
    };

    input.addEventListener('spr_popover_value_injected' as any, handleValueInjected);
    input.addEventListener('input', handleNativeInput);
    input.addEventListener('change', handleNativeInput);

    return () => {
      input.removeEventListener('spr_popover_value_injected' as any, handleValueInjected);
      input.removeEventListener('input', handleNativeInput);
      input.removeEventListener('change', handleNativeInput);
    };
  }, [onApply]);

  const handleSaveAndClose = useCallback(() => {
    const valueToSave = inputRef.current ? inputRef.current.value : editValue;
    const cleanKey = stripMustacheBrackets(valueToSave);
    const originalKey = stripMustacheBrackets(rawToken);
    if (cleanKey && cleanKey !== originalKey && onApply) {
      onApply(cleanKey, true);
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
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Do NOT close or dismiss if clicking inside the sidebar, drawer, ribbon, or toolbars
      if (
        target.closest(
          '.print-sidebar-control, .doclab-sidebar, .doclab-ribbon, [data-sidebar-panel="true"], .theme-drawer, [role="dialog"]'
        )
      ) {
        return;
      }

      if (popoverRef.current && !popoverRef.current.contains(target)) {
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
    const tokenToCopy = formatMustacheDisplay(editValue);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(tokenToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }, [editValue]);

  const handlePin = useCallback(() => {
    setIsLocalPinned(true);
    onPinChange?.(true);
  }, [onPinChange]);

  const handleAppendOrUpdateDirective = (directiveStr: string) => {
    let current = editValue.trim();
    if (directiveStr.startsWith('default:')) {
      if (/\b(?:default|fallback)\s*:\s*["'][^"']*["']/i.test(current)) {
        current = current.replace(/\b(?:default|fallback)\s*:\s*["'][^"']*["']/i, directiveStr);
      } else if (/\b(?:default|fallback)\s*:\s*[^,|]+/i.test(current)) {
        current = current.replace(/\b(?:default|fallback)\s*:\s*[^,|]+/i, directiveStr);
      } else {
        current = `${current} | ${directiveStr}`;
      }
    } else if (directiveStr.startsWith('removeLine:')) {
      if (/\bremoveLine\s*:\s*[^,|]+/i.test(current)) {
        current = current.replace(/\bremoveLine\s*:\s*[^,|]+/i, directiveStr);
      } else {
        current = `${current} | ${directiveStr}`;
      }
    } else {
      current = `${current} | ${directiveStr}`;
    }
    setEditValue(current);
  };

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
      className="doclab-token-popover theme-bg-elevated/95 backdrop-blur-md border theme-border rounded-lg shadow-xl p-1.5 flex flex-col gap-1 text-xs theme-text-primary animate-in fade-in-0 zoom-in-95 duration-100 text-left z-[99999]"
    >
      <div className="flex items-start gap-1.5 w-full">
        {/* Decorative Token Indicator Badge */}
        <span
          className="shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--accent-main)]/15 text-[var(--accent-main)] select-none pointer-events-none"
          title="Dynamic Template Token"
        >
          {'{ }'}
        </span>

        <textarea
          ref={inputRef}
          rows={1}
          value={editValue}
          onChange={(e) => {
            setEditValue(e.target.value);
          }}
          onInput={(e) => {
            setEditValue((e.target as HTMLTextAreaElement).value);
          }}
          onFocus={handlePin}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            handlePin();
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSaveAndClose();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              onClose();
            }
          }}
          onKeyUp={(e) => e.stopPropagation()}
          onKeyPress={(e) => e.stopPropagation()}
          placeholder="variable_name | directives"
          className="flex-1 px-1.5 py-0.5 rounded bg-transparent border-0 font-mono text-[11.5px] font-medium text-[var(--accent-main)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-main)]/40 min-w-0 select-text leading-snug cursor-text resize-none overflow-y-auto break-words whitespace-pre-wrap transition-[height] duration-75"
          style={{ height: '22px', minHeight: '22px', maxHeight: '140px' }}
        />

        {/* Action Buttons Toolbar */}
        <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
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
      </div>

      {/* Quick Fallback & Directive Modifiers Toolbar (when Pinned / Focused) */}
      {isLocalPinned && (
        <div className="w-full flex items-center gap-1 pt-1 mt-0.5 border-t theme-border-subtle flex-wrap select-none">
          <span className="text-[9px] uppercase font-bold theme-text-muted mr-0.5">Quick:</span>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation();
              handleAppendOrUpdateDirective('default: "N/A"');
            }}
            className="px-1.5 py-0.5 rounded text-[10px] font-mono theme-bg-sub hover:theme-bg-accent-soft theme-text-secondary hover:theme-accent border theme-border-subtle transition-all cursor-pointer active:scale-95"
            title="Insert fallback default: &quot;N/A&quot;"
          >
            + def: &quot;N/A&quot;
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation();
              handleAppendOrUpdateDirective('default: "---"');
            }}
            className="px-1.5 py-0.5 rounded text-[10px] font-mono theme-bg-sub hover:theme-bg-accent-soft theme-text-secondary hover:theme-accent border theme-border-subtle transition-all cursor-pointer active:scale-95"
            title="Insert fallback default: &quot;---&quot;"
          >
            + def: &quot;---&quot;
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation();
              handleAppendOrUpdateDirective('default: ""');
            }}
            className="px-1.5 py-0.5 rounded text-[10px] font-mono theme-bg-sub hover:theme-bg-accent-soft theme-text-secondary hover:theme-accent border theme-border-subtle transition-all cursor-pointer active:scale-95"
            title="Insert fallback default: &quot;&quot; (blank)"
          >
            + def: &quot;&quot;
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation();
              handleAppendOrUpdateDirective('removeLine: self');
            }}
            className="px-1.5 py-0.5 rounded text-[10px] font-mono theme-bg-sub hover:theme-bg-accent-soft theme-text-secondary hover:theme-accent border theme-border-subtle transition-all cursor-pointer active:scale-95"
            title="Insert line removal: removeLine: self"
          >
            + removeLine: self
          </button>
        </div>
      )}
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(popoverContent, document.body);
};

export default TokenInspectorPopover;
