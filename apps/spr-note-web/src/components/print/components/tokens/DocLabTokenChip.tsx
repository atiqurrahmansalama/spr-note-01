/**
 * DocLabTokenChip
 *
 * Enterprise Smart Variable Pill Component for DocLab Canvas.
 * Replaces cumbersome, layout-breaking raw expressions with compact, interactive badges.
 * Supports Hover preview mode and Click-to-inspect pinned floating popover.
 */

import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { extractTokenSummary, TokenSummaryInfo } from './tokenChipRenderer';
import { TokenInspectorPopover } from './TokenInspectorPopover';

export type TokenViewMode = 'chip' | 'raw' | 'sample';

export interface DocLabTokenChipProps {
  /** The full raw token string or expression, e.g. "exam-date | direction: horizontal, separator: cell" */
  rawToken: string;
  /** Human-readable taxonomy label */
  displayLabel?: string;
  /** Taxonomy category (e.g. 'examination', 'student', 'hifz') */
  category?: string;
  /** Realistic sample value for sample preview mode (e.g. '15/10/2026') */
  sampleValue?: string;
  /** Current display mode across the canvas */
  viewMode?: TokenViewMode;
  /** Whether the chip is interactively editable */
  isEditable?: boolean;
  /** Callback fired when token is updated in-place */
  onUpdate?: (newRawToken: string) => void;
  /** Callback fired when token is removed from document */
  onDelete?: () => void;
  /** Custom CSS classes */
  className?: string;
}

export const DocLabTokenChip: React.FC<DocLabTokenChipProps> = ({
  rawToken,
  displayLabel,
  category = 'general',
  sampleValue,
  viewMode = 'chip',
  isEditable = true,
  onUpdate,
  onDelete,
  className = '',
}) => {
  const chipRef = useRef<HTMLSpanElement>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
  const [isPinned, setIsPinned] = useState<boolean>(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const hoverTimerRef = useRef<any>(null);

  const summary = useMemo<TokenSummaryInfo>(() => {
    return extractTokenSummary(rawToken);
  }, [rawToken]);

  const clearHoverTimer = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (!isEditable) return;
    clearHoverTimer();
    if (chipRef.current) {
      setAnchorRect(chipRef.current.getBoundingClientRect());
    }
    setIsPopoverOpen(true);
  }, [isEditable, clearHoverTimer]);

  const handleMouseLeave = useCallback(() => {
    clearHoverTimer();
    if (!isPinned) {
      hoverTimerRef.current = setTimeout(() => {
        setIsPopoverOpen(false);
      }, 300);
    }
  }, [isPinned, clearHoverTimer]);

  const handleChipClick = (e: React.MouseEvent) => {
    if (!isEditable) return;
    e.preventDefault();
    e.stopPropagation();
    clearHoverTimer();

    if (chipRef.current) {
      setAnchorRect(chipRef.current.getBoundingClientRect());
    }
    setIsPinned(true);
    setIsPopoverOpen(true);
  };

  const handleApplyUpdate = (newRawToken: string) => {
    setIsPopoverOpen(false);
    setIsPinned(false);
    if (onUpdate) {
      onUpdate(newRawToken);
    }
  };

  const handleDelete = () => {
    setIsPopoverOpen(false);
    setIsPinned(false);
    if (onDelete) {
      onDelete();
    }
  };

  const handleClosePopover = () => {
    clearHoverTimer();
    setIsPopoverOpen(false);
    setIsPinned(false);
  };

  useEffect(() => {
    return () => {
      clearHoverTimer();
    };
  }, [clearHoverTimer]);

  // 1. Raw Syntax Mode: Displays clean {{key | directives}}
  if (viewMode === 'raw') {
    const rawFormatted = rawToken.startsWith('{{') ? rawToken : `{{${rawToken}}}`;
    return (
      <span
        ref={chipRef}
        onClick={handleChipClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        contentEditable={false}
        className={`inline-block font-mono text-[0.9em] px-1 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 cursor-pointer hover:bg-blue-500/20 transition-all select-none ${className}`}
        title="Click to edit variable and directives"
      >
        {rawFormatted}
      </span>
    );
  }

  // 2. Sample Data Preview Mode: Displays sample data with subtle dashed underline
  if (viewMode === 'sample' && sampleValue) {
    return (
      <span
        ref={chipRef}
        onClick={handleChipClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        contentEditable={false}
        className={`inline-block border-b border-dashed border-[var(--accent-main)]/60 text-[var(--accent-main)] cursor-pointer hover:opacity-80 transition-opacity select-none ${className}`}
        title={`Variable: {{${rawToken}}} (Sample Preview)`}
      >
        {sampleValue}
      </span>
    );
  }

  // 3. Smart Chip Mode (Default Compact Pill)
  return (
    <>
      <span
        ref={chipRef}
        onClick={handleChipClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        contentEditable={false}
        className={`doclab-token-chip inline-flex items-center justify-center w-[22px] h-[14px] min-w-[22px] max-w-[22px] my-0 mx-0.5 rounded-full text-[0px] leading-none vertical-middle transition-all cursor-pointer select-none bg-[var(--accent-main)]/20 hover:bg-[var(--accent-main)]/35 border-0 ${className}`}
        title={`{{${rawToken}}}`}
        data-token={rawToken}
        data-token-key={summary.baseKey}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-main)] opacity-80" />
      </span>

      {/* Interactive Floating Popover with Hover and Pinned support */}
      {isPopoverOpen && (
        <TokenInspectorPopover
          key={rawToken}
          rawToken={rawToken}
          anchorRect={anchorRect}
          targetElement={chipRef.current}
          displayLabel={displayLabel}
          category={category}
          sampleValue={sampleValue}
          isPinned={isPinned}
          onApply={handleApplyUpdate}
          onDelete={onDelete ? handleDelete : undefined}
          onClose={handleClosePopover}
          onMouseEnter={clearHoverTimer}
          onMouseLeave={handleMouseLeave}
          onPinChange={setIsPinned}
        />
      )}
    </>
  );
};

export default DocLabTokenChip;
