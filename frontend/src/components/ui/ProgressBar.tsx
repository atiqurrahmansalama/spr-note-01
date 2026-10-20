/**
 * SPR Note — ProgressBar Component
 * ===================================
 * Enterprise reusable progress bar indicator for dashboards, timelines,
 * academic milestones, quotas, and upload progress.
 *
 * Features:
 * - Pure project design tokens (no hardcoded styles)
 * - Flexible sizing (xs, sm, md, lg, xl)
 * - Semantic variants (accent, success, warning, danger, info, neutral)
 * - Optional header with left label and right value indicator
 * - Auto-clamped percentage (0 - 100%)
 * - Smooth CSS transitions and indeterminate state support
 * - Full ARIA accessibility attributes (role="progressbar")
 */

import React, { useMemo } from 'react';

export type ProgressBarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type ProgressBarVariant = 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface ProgressBarProps {
  /** Current progress value (default 0 - 100, or scaled by min/max) */
  value: number;
  /** Minimum scale boundary (default: 0) */
  min?: number;
  /** Maximum scale boundary (default: 100) */
  max?: number;
  /** Height density (default: 'sm' = 6px) */
  size?: ProgressBarSize;
  /** Semantic color theme (default: 'accent') */
  variant?: ProgressBarVariant;
  /** Left title or status indicator rendered in header */
  label?: React.ReactNode;
  /** Right value label (e.g. "35% Elapsed" or "12 / 30 Days") */
  valueLabel?: React.ReactNode;
  /** Auto-render percentage in header when valueLabel is not provided */
  showPercentage?: boolean;
  /** Custom percentage formatter */
  formatPercentage?: (pct: number) => React.ReactNode;
  /** Optional subtitle or description below the bar */
  description?: React.ReactNode;
  /** Smooth CSS transition on progress change (default: true) */
  animated?: boolean;
  /** Indeterminate active loading state */
  indeterminate?: boolean;
  /** Container className */
  className?: string;
  /** Track (background) className */
  trackClassName?: string;
  /** Progress fill bar className */
  barClassName?: string;
  /** Header row className */
  headerClassName?: string;
  /** Accessible label for screen readers */
  ariaLabel?: string;
}

const SIZE_CLASSES: Record<ProgressBarSize, string> = {
  xs: 'h-1',
  sm: 'h-1.5',
  md: 'h-2',
  lg: 'h-2.5',
  xl: 'h-3.5',
};

const VARIANT_BAR_CLASSES: Record<ProgressBarVariant, string> = {
  accent: 'theme-bg-accent',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  info: 'bg-sky-500',
  neutral: 'theme-bg-elevated theme-text-primary',
};

const VARIANT_TEXT_CLASSES: Record<ProgressBarVariant, string> = {
  accent: 'theme-accent',
  success: 'text-emerald-500',
  warning: 'text-amber-500',
  danger: 'text-rose-500',
  info: 'text-sky-500',
  neutral: 'theme-text-primary',
};

export default function ProgressBar({
  value,
  min = 0,
  max = 100,
  size = 'sm',
  variant = 'accent',
  label,
  valueLabel,
  showPercentage = false,
  formatPercentage,
  description,
  animated = true,
  indeterminate = false,
  className = '',
  trackClassName = '',
  barClassName = '',
  headerClassName = '',
  ariaLabel,
}: ProgressBarProps) {
  // Clamped percentage calculation
  const percentage = useMemo(() => {
    if (indeterminate) return 100;
    const range = max - min;
    if (range <= 0) return 0;
    const rawPct = ((value - min) / range) * 100;
    return Math.min(100, Math.max(0, Math.round(rawPct)));
  }, [value, min, max, indeterminate]);

  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.sm;
  const variantBarClass = VARIANT_BAR_CLASSES[variant] || VARIANT_BAR_CLASSES.accent;
  const variantTextClass = VARIANT_TEXT_CLASSES[variant] || VARIANT_TEXT_CLASSES.accent;

  // Resolve right-hand value label
  const renderedValueLabel = useMemo(() => {
    if (valueLabel !== undefined && valueLabel !== null) {
      return valueLabel;
    }
    if (showPercentage) {
      if (formatPercentage) {
        return formatPercentage(percentage);
      }
      return `${percentage}%`;
    }
    return null;
  }, [valueLabel, showPercentage, formatPercentage, percentage]);

  const hasHeader = Boolean(label || renderedValueLabel);

  return (
    <div className={`space-y-1.5 w-full select-none ${className}`}>
      {/* ─── Top Info Header (Label & Value) ─────────────────────────── */}
      {hasHeader && (
        <div
          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-mono ${headerClassName}`}
        >
          {label && (
            <span className="theme-text-secondary font-medium leading-tight break-words min-w-0">
              {label}
            </span>
          )}
          {renderedValueLabel && (
            <span className={`font-bold self-start sm:self-auto shrink-0 ${variantTextClass}`}>
              {renderedValueLabel}
            </span>
          )}
        </div>
      )}

      {/* ─── Track & Animated Fill Bar ──────────────────────────────── */}
      <div
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : percentage}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-label={typeof label === 'string' ? label : ariaLabel || 'Progress'}
        className={`w-full ${sizeClass} rounded-full theme-bg-sub border theme-border overflow-hidden relative shadow-2xs ${trackClassName}`}
      >
        <div
          className={`h-full rounded-full ${variantBarClass} ${
            animated && !indeterminate ? 'transition-all duration-500 ease-out' : ''
          } ${indeterminate ? 'w-1/3 animate-indeterminate-pulse' : ''} ${barClassName}`}
          style={indeterminate ? undefined : { width: `${percentage}%` }}
        />
      </div>

      {/* ─── Optional Description / Sub-label ────────────────────────── */}
      {description && (
        <p className="text-[11px] theme-text-secondary font-sans leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}
