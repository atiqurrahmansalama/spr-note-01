/**
 * DocLabTokenChip
 *
 * Enterprise Smart Variable Pill Component for DocLab Canvas.
 * Replaces cumbersome, layout-breaking raw expressions with compact, interactive badges.
 * Supports Hover preview and Click-to-inspect floating popover.
 */

import React, { useState, useRef, useMemo } from 'react';
import { SparklesIcon, EditIcon } from '../../../ui/Icons';
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
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  const summary = useMemo<TokenSummaryInfo>(() => {
    return extractTokenSummary(rawToken);
  }, [rawToken]);

  const handleChipClick = (e: React.MouseEvent) => {
    if (!isEditable) return;
    e.preventDefault();
    e.stopPropagation();

    if (chipRef.current) {
      setAnchorRect(chipRef.current.getBoundingClientRect());
    }
    setIsPopoverOpen(true);
  };

  const handleApplyUpdate = (newRawToken: string) => {
    setIsPopoverOpen(false);
    if (onUpdate) {
      onUpdate(newRawToken);
    }
  };

  const handleDelete = () => {
    setIsPopoverOpen(false);
    if (onDelete) {
      onDelete();
    }
  };

  // 1. Raw Syntax Mode: Displays clean {{key | directives}}
  if (viewMode === 'raw') {
    const rawFormatted = rawToken.startsWith('{{') ? rawToken : `{{${rawToken}}}`;
    return (
      <span
        ref={chipRef}
        onClick={handleChipClick}
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
        contentEditable={false}
        className={`doclab-token-chip inline-flex items-center gap-1.5 px-2 py-0.5 my-0.5 mx-1 rounded-full text-[11px] font-medium leading-none vertical-baseline transition-all cursor-pointer shadow-2xs select-none theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/30 hover:border-[var(--accent-main)] hover:shadow-xs group ${className}`}
        title={`{{${rawToken}}}\nClick to configure layout, cell split, indent, or filters`}
        data-token={rawToken}
        data-token-key={summary.baseKey}
      >
        {/* Token Icon */}
        <SparklesIcon className="w-3 h-3 shrink-0 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-transform" />

        {/* Variable Key */}
        <span className="font-bold tracking-tight">{summary.baseKey}</span>

        {/* Directives Badges */}
        {summary.directiveBadges.length > 0 && (
          <span className="inline-flex items-center gap-1 pl-1 border-l border-current/20 shrink-0">
            {summary.directiveBadges.map((badge, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9.5px] font-semibold bg-white/40 dark:bg-black/30 backdrop-blur-xs text-current"
                title={badge.title}
              >
                <span>{badge.icon}</span>
                <span>{badge.text}</span>
              </span>
            ))}
          </span>
        )}

        {/* Hover Pencil Indicator */}
        {isEditable && (
          <EditIcon className="w-2.5 h-2.5 opacity-0 group-hover:opacity-60 transition-opacity ml-0.5 shrink-0" />
        )}
      </span>

      {/* Interactive Floating Popover */}
      {isPopoverOpen && (
        <TokenInspectorPopover
          rawToken={rawToken}
          anchorRect={anchorRect}
          displayLabel={displayLabel}
          category={category}
          onApply={handleApplyUpdate}
          onDelete={onDelete ? handleDelete : undefined}
          onClose={() => setIsPopoverOpen(false)}
        />
      )}
    </>
  );
};
