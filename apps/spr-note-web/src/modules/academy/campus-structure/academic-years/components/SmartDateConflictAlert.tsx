/**
 * SPR Note — SmartDateConflictAlert Component
 * =============================================
 * Enterprise live conflict detection card.
 * Highlights overlapping sessions with precision metrics, collision taxonomy,
 * and 1-click predictive slot resolution.
 * Styling adheres strictly to user preference:
 * - Light red background (bg-rose-500/[0.04])
 * - Neutral theme border (ZERO red border)
 * - Red accents only on typography and alert icons
 */

import React from 'react';
import {
  AlertCircleIcon,
  SparklesIcon,
} from '@/components/ui/Icons';
import CustomButton from '@/components/ui/CustomButton';
import { DateConflict, AvailableDateSlot } from '../types';
import { useTranslation } from '@/i18n';

export interface SmartDateConflictAlertProps {
  conflicts: DateConflict[];
  suggestedSlot?: AvailableDateSlot;
  onAutoFix?: (slot: AvailableDateSlot) => void;
}

export default function SmartDateConflictAlert({
  conflicts,
  suggestedSlot,
  onAutoFix,
}: SmartDateConflictAlertProps) {
  const { t, formatNumber } = useTranslation('academy');

  // If no collisions detected, render nothing per enterprise preference
  if (!conflicts || conflicts.length === 0) {
    return null;
  }

  return (
    <div className="p-3.5 sm:p-4 rounded-2xl border theme-border bg-rose-500/[0.04] space-y-3 animate-fade-in shadow-2xs">
      {/* Header Banner */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
            <AlertCircleIcon className="w-4 h-4 text-rose-500" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs sm:text-sm font-bold text-rose-500">
                {t('collisionDetected', 'Academic Session Collision Detected')}
              </h4>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500">
                {formatNumber(conflicts.length)} Overlap{conflicts.length > 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-[11px] theme-text-secondary mt-0.5">
              {t(
                'collisionDescription',
                'The selected date window collides with existing academic records. Academic years must maintain discrete boundaries.'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Detailed Breakdown for each conflicting academic year */}
      <div className="space-y-2 pt-1">
        {conflicts.map((col, idx) => (
          <div
            key={col.conflictingYear.id || idx}
            className="p-3 rounded-xl border theme-border theme-bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs font-mono"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              <span className="font-bold theme-text-primary truncate">
                {col.conflictingYear.name}
              </span>
              <span className="text-[10px] theme-text-secondary opacity-75">
                ({col.conflictingYear.startDate} to {col.conflictingYear.endDate})
              </span>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
              <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-500 font-bold text-[10px]">
                {formatNumber(col.overlapDays)} {t('days', 'Days')} Overlap
              </span>
              <span className="text-[10px] uppercase tracking-wider theme-text-secondary opacity-80">
                {col.collisionType.replace('_', ' ')}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Predictive 1-Click Resolution Slot */}
      {suggestedSlot && onAutoFix && (
        <div className="p-3 rounded-xl theme-bg-surface border theme-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-1 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0 border border-[var(--accent-main)]/20">
              <SparklesIcon className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary block">
                {t('recommendedAvailableWindow', 'Recommended Available Window')}
              </span>
              <span className="text-xs font-mono font-bold theme-text-primary">
                {suggestedSlot.startDate} – {suggestedSlot.endDate} ({suggestedSlot.suggestedName})
              </span>
            </div>
          </div>

          <CustomButton
            type="button"
            variant="primary"
            size="xs"
            icon={SparklesIcon}
            onClick={() => onAutoFix(suggestedSlot)}
            className="self-start sm:self-auto shrink-0"
          >
            {t('autoFixAvailableSlot', 'Auto-Resolve & Apply Slot')}
          </CustomButton>
        </div>
      )}
    </div>
  );
}
