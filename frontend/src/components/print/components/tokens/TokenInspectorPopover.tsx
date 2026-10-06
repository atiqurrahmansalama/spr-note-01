/**
 * TokenInspectorPopover
 *
 * Enterprise-grade Interactive Floating Popover for DocLab Tokens & Directives.
 * Provides intuitive visual controls (Direction, Cell Splitting, Indent, Filters)
 * alongside a two-way synchronized raw Mustache expression editor.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  SparklesIcon,
  CheckIcon,
  CloseIcon,
  TrashIcon,
} from '../../../ui/Icons';
import { extractTokenSummary, buildTokenString, TokenSummaryInfo } from './tokenChipRenderer';

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
  onApply: (newRawToken: string) => void;
  /** Callback fired when user deletes the token */
  onDelete?: () => void;
  /** Callback fired when popover is closed/dismissed */
  onClose: () => void;
}

export const TokenInspectorPopover: React.FC<TokenInspectorPopoverProps> = ({
  rawToken,
  anchorRect,
  displayLabel,
  category = 'general',
  onApply,
  onDelete,
  onClose,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Initial parsed state
  const initialSummary = useMemo<TokenSummaryInfo>(() => {
    return extractTokenSummary(rawToken);
  }, [rawToken]);

  // Form State
  const [baseKey, setBaseKey] = useState<string>(initialSummary.baseKey);
  const [direction, setDirection] = useState<'vertical' | 'horizontal' | undefined>(initialSummary.direction);
  const [separator, setSeparator] = useState<string>(initialSummary.separator || '');
  const [indent, setIndent] = useState<number>(initialSummary.indent || 0);
  const [fromLine, setFromLine] = useState<number>(initialSummary.fromLine || 2);
  const [selectedFilter, setSelectedFilter] = useState<string>(initialSummary.filters[0] || '');
  const [rawExpression, setRawExpression] = useState<string>(
    rawToken.startsWith('{{') ? rawToken : `{{${rawToken}}}`
  );
  const [activeTab, setActiveTab] = useState<'visual' | 'code'>('visual');

  // Sync raw expression whenever visual controls change
  const syncExpressionFromVisual = (
    newKey: string,
    newDir?: 'vertical' | 'horizontal',
    newSep?: string,
    newIndent?: number,
    newFrom?: number,
    newFilt?: string
  ) => {
    const filters = newFilt ? [newFilt] : [];
    const synthesized = buildTokenString(newKey, {
      direction: newDir,
      separator: newSep || undefined,
      indent: newIndent && newIndent > 0 ? newIndent : undefined,
      fromLine: newIndent && newIndent > 0 ? newFrom : undefined,
      filters,
    });
    setRawExpression(synthesized);
  };

  // Sync visual controls whenever raw expression text is edited
  const handleRawExpressionChange = (val: string) => {
    setRawExpression(val);
    try {
      const summary = extractTokenSummary(val);
      setBaseKey(summary.baseKey);
      setDirection(summary.direction);
      setSeparator(summary.separator || '');
      setIndent(summary.indent || 0);
      setFromLine(summary.fromLine || 2);
      setSelectedFilter(summary.filters[0] || '');
    } catch {
      // ignore parse errors during typing
    }
  };

  // Positioning calculations
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

    const popoverWidth = 380;
    const popoverHeight = 440;
    const margin = 12;

    let top = anchorRect.bottom + margin;
    let left = anchorRect.left + anchorRect.width / 2 - popoverWidth / 2;

    // Viewport boundary collision prevention
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
      zIndex: 9999,
    };
  }, [anchorRect]);

  // Click outside and Escape key listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        handleApply();
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
  }, [onClose, rawExpression]);

  const handleApply = () => {
    const cleanToApply = rawExpression.replace(/^\{+/, '').replace(/\}+$/, '').trim();
    if (cleanToApply) {
      onApply(cleanToApply);
    }
  };

  return (
    <>
      {/* Invisible backdrop to capture outside dismiss */}
      <div className="fixed inset-0 z-[9998] bg-black/10 backdrop-blur-[0.5px] transition-opacity" />

      {/* Floating Inspector Card */}
      <div
        ref={popoverRef}
        style={popoverStyle}
        className="theme-bg-elevated border theme-border rounded-xl shadow-2xl p-4 flex flex-col gap-3.5 text-xs theme-text-primary animate-in fade-in zoom-in-95 duration-150 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b theme-border">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 rounded-md theme-bg-accent-soft theme-accent shrink-0">
              <SparklesIcon className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <div className="font-bold text-sm truncate flex items-center gap-1.5">
                <span>{baseKey}</span>
                {category && (
                  <span className="px-1.5 py-0.2 text-[10px] font-semibold uppercase tracking-wider rounded theme-bg-sub theme-text-secondary">
                    {category}
                  </span>
                )}
              </div>
              <div className="text-[11px] theme-text-secondary truncate">
                {displayLabel || 'Dynamic Variable Token'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition-colors cursor-pointer"
            title="Close inspector"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector Tabs (Visual Controls vs Raw Syntax) */}
        <div className="flex items-center p-0.5 rounded-lg theme-bg-sub border theme-border">
          <button
            type="button"
            onClick={() => setActiveTab('visual')}
            className={`flex-1 py-1 rounded-md text-center font-semibold transition-all cursor-pointer ${
              activeTab === 'visual'
                ? 'theme-bg-elevated theme-text-primary shadow-2xs font-bold'
                : 'theme-text-secondary hover:theme-text-primary'
            }`}
          >
            🎛️ Visual Config
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`flex-1 py-1 rounded-md text-center font-semibold transition-all cursor-pointer ${
              activeTab === 'code'
                ? 'theme-bg-elevated theme-text-primary shadow-2xs font-bold'
                : 'theme-text-secondary hover:theme-text-primary'
            }`}
          >
            📝 Raw Code
          </button>
        </div>

        {/* Tab 1: Visual Configuration Controls */}
        {activeTab === 'visual' ? (
          <div className="flex flex-col gap-3 max-h-[280px] overflow-y-auto pr-1">
            {/* Variable Key Input */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold theme-text-secondary">Variable Key</label>
              <input
                type="text"
                value={baseKey}
                onChange={(e) => {
                  const val = e.target.value.trim();
                  setBaseKey(val);
                  syncExpressionFromVisual(val, direction, separator, indent, fromLine, selectedFilter);
                }}
                className="w-full px-2.5 py-1.5 rounded-md theme-bg-surface border theme-border theme-text-primary font-mono text-xs focus:outline-hidden focus:ring-1 focus:ring-[var(--accent-main)]"
                placeholder="e.g. exam-date, student-name"
              />
            </div>

            {/* Layout Direction */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold theme-text-secondary">Layout Flow & Direction</label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const next = direction === 'vertical' ? undefined : 'vertical';
                    setDirection(next);
                    syncExpressionFromVisual(baseKey, next, separator, indent, fromLine, selectedFilter);
                  }}
                  className={`px-2.5 py-1.5 rounded-md border text-left font-medium transition-all cursor-pointer flex items-center justify-between ${
                    direction === 'vertical'
                      ? 'theme-bg-accent-soft theme-accent border-[var(--accent-main)] font-bold'
                      : 'theme-bg-surface theme-border theme-text-secondary hover:theme-text-primary'
                  }`}
                >
                  <span>↕️ Vertical (Rows)</span>
                  {direction === 'vertical' && <CheckIcon className="w-3.5 h-3.5 shrink-0" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const next = direction === 'horizontal' ? undefined : 'horizontal';
                    setDirection(next);
                    syncExpressionFromVisual(baseKey, next, separator, indent, fromLine, selectedFilter);
                  }}
                  className={`px-2.5 py-1.5 rounded-md border text-left font-medium transition-all cursor-pointer flex items-center justify-between ${
                    direction === 'horizontal'
                      ? 'theme-bg-accent-soft theme-accent border-[var(--accent-main)] font-bold'
                      : 'theme-bg-surface theme-border theme-text-secondary hover:theme-text-primary'
                  }`}
                >
                  <span>↔️ Horizontal (Cols)</span>
                  {direction === 'horizontal' && <CheckIcon className="w-3.5 h-3.5 shrink-0" />}
                </button>
              </div>
            </div>

            {/* Separator / Table Cell Splitting */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold theme-text-secondary">Separator & Table Splitting</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { key: 'cell', label: '📑 Table Cells' },
                  { key: 'comma', label: ', Comma' },
                  { key: 'newline', label: '↵ Newline' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      const next = separator === item.key ? '' : item.key;
                      setSeparator(next);
                      syncExpressionFromVisual(baseKey, direction, next, indent, fromLine, selectedFilter);
                    }}
                    className={`px-2 py-1 rounded-md border text-center font-medium transition-all cursor-pointer ${
                      separator === item.key
                        ? 'theme-bg-accent-soft theme-accent border-[var(--accent-main)] font-bold'
                        : 'theme-bg-surface theme-border theme-text-secondary hover:theme-text-primary'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Multi-line Indentation */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold theme-text-secondary">Multi-Line Indentation</label>
              <div className="flex items-center gap-1.5">
                {[
                  { count: 0, label: 'None' },
                  { count: 5, label: '5 sp (Standard)' },
                  { count: 11, label: '11 sp (Juz)' },
                ].map((item) => (
                  <button
                    key={item.count}
                    type="button"
                    onClick={() => {
                      setIndent(item.count);
                      syncExpressionFromVisual(baseKey, direction, separator, item.count, fromLine, selectedFilter);
                    }}
                    className={`flex-1 px-2 py-1 rounded-md border text-center font-medium transition-all cursor-pointer ${
                      indent === item.count
                        ? 'theme-bg-accent-soft theme-accent border-[var(--accent-main)] font-bold'
                        : 'theme-bg-surface theme-border theme-text-secondary hover:theme-text-primary'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Formatting Filters */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold theme-text-secondary">Formatting Filter</label>
              <select
                value={selectedFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedFilter(val);
                  syncExpressionFromVisual(baseKey, direction, separator, indent, fromLine, val);
                }}
                className="w-full px-2.5 py-1.5 rounded-md theme-bg-surface border theme-border theme-text-primary text-xs focus:outline-hidden focus:ring-1 focus:ring-[var(--accent-main)] cursor-pointer"
              >
                <option value="">No Filter (Default)</option>
                <option value="uppercase">UPPERCASE (Aa → AA)</option>
                <option value="lowercase">lowercase (Aa → aa)</option>
                <option value="capitalize">Capitalize Words (aa → Aa)</option>
                <option value="bengali_digits">বাংলা সংখ্যা (123 → ১২৩)</option>
                <option value="currency">Currency Symbol (৳ 100.00)</option>
                <option value="date: short">Short Date (YYYY-MM-DD)</option>
                <option value="date: long">Long Date (Month DD, YYYY)</option>
              </select>
            </div>
          </div>
        ) : (
          /* Tab 2: Raw Code / Expression Editor */
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-semibold theme-text-secondary">
              Direct Mustache Syntax Editor
            </label>
            <textarea
              rows={4}
              value={rawExpression}
              onChange={(e) => handleRawExpressionChange(e.target.value)}
              className="w-full px-3 py-2 rounded-md theme-bg-surface border theme-border theme-text-primary font-mono text-xs focus:outline-hidden focus:ring-1 focus:ring-[var(--accent-main)] resize-none"
              placeholder="{{token_name | direction: horizontal, separator: cell}}"
            />
            <div className="text-[10px] theme-text-secondary leading-relaxed">
              Tip: Press <kbd className="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10 font-mono">Ctrl+Enter</kbd> to apply changes instantly.
            </div>
          </div>
        )}

        {/* Live Preview Box */}
        <div className="px-2.5 py-1.5 rounded-md bg-black/5 dark:bg-white/5 border theme-border flex items-center justify-between gap-2">
          <span className="text-[10px] font-mono theme-text-secondary truncate">
            {rawExpression}
          </span>
          <span className="text-[10px] font-semibold theme-accent shrink-0">Live Syntax</span>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t theme-border">
          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="px-2.5 py-1.5 rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 font-medium transition-colors cursor-pointer flex items-center gap-1.5"
              title="Delete variable token from document"
            >
              <TrashIcon className="w-3.5 h-3.5" />
              <span>Remove</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md theme-bg-surface border theme-border theme-text-secondary hover:theme-text-primary transition-colors cursor-pointer font-medium"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-1.5 rounded-md theme-bg-accent text-white font-bold shadow-xs hover:opacity-95 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <CheckIcon className="w-3.5 h-3.5" />
              <span>Apply</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
