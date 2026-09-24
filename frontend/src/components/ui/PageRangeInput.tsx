import React, { useCallback } from 'react';
import CustomInput from './CustomInput';
import { handleEnterFocusNext, handleBackspaceFocusPrev } from '../../utils/keyboardUtils';

export interface PageRangeObject {
  id?: string;
  start: number | string;
  end: number | string;
  [key: string]: any;
}

export type PageRange = PageRangeObject;

export interface PageRangeChangeValue {
  start: number | string;
  end: number | string;
}

export interface PageRangeInputProps {
  // Direct values
  startValue?: number | string;
  endValue?: number | string;
  // Or range object structure
  range?: PageRangeObject;
  onChange?: ((value: PageRangeChangeValue) => void) | ((value: PageRangeObject) => void);
  onStartChange?: (value: number | string) => void;
  onEndChange?: (value: number | string) => void;
  onBlur?: (e?: React.FocusEvent<HTMLInputElement>) => void;
  onRemove?: () => void;
  min?: number;
  max?: number;
  isLast?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  width?: string;
  placeholderStart?: string;
  placeholderEnd?: string;
  disabled?: boolean;
  required?: boolean;
  idPrefix?: string;
  onEnter?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onAdd?: () => void;
  onAddNextRange?: () => void;
  onAddShift?: () => void;
  onAddJuzRow?: () => void;
  onEmptyBackspace?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * Enterprise Reusable Page Range Input Component
 * 
 * Provides a unified linked dual-input box for (Start Page — End Page).
 * Pure generic UI component without domain-specific hardcoding.
 * Supports unrestricted typing during keystrokes and smart validation upon completion (onBlur / onEnter).
 * Fully responsive, accessible, with keyboard navigation and theme token styling.
 */
export default function PageRangeInput({
  startValue,
  endValue,
  range,
  onChange,
  onStartChange,
  onEndChange,
  onBlur,
  onRemove,
  min = 1,
  max: propMax = 9999,
  size = 'md',
  variant = 'sub',
  className = '',
  width = 'w-24 sm:w-28',
  placeholderStart = '--',
  placeholderEnd = '--',
  disabled = false,
  required = false,
  idPrefix,
  onEnter,
  onAdd,
  onAddNextRange,
  onAddShift,
  onAddJuzRow,
  onEmptyBackspace,
}: PageRangeInputProps & { variant?: 'sub' | 'surface' | 'elevated' }) {
  const max = propMax || 9999;

  // Extract start and end values
  const effectiveStart = range ? range.start : startValue;
  const effectiveEnd = range ? range.end : endValue;
  const prefix = idPrefix || (range?.id ? range.id : 'page-range');

  // Handle Start Page Change (DURING TYPING - unrestricted input without premature keystroke clamping)
  const handleStartChange = useCallback(
    (rawVal: any) => {
      const cleanVal = rawVal === '' || rawVal === undefined || rawVal === null
        ? ''
        : String(rawVal).replace(/\D/g, '');
      const nextStart: number | string = cleanVal === '' ? '' : parseInt(cleanVal, 10);

      if (onStartChange) onStartChange(nextStart);
      if (onChange) {
        if (range) {
          (onChange as (val: PageRangeObject) => void)({ ...range, start: nextStart });
        } else {
          (onChange as (val: PageRangeChangeValue) => void)({ start: nextStart, end: effectiveEnd ?? '' });
        }
      }
    },
    [effectiveEnd, onStartChange, onChange, range]
  );

  // Handle End Page Change (DURING TYPING - unrestricted input without premature keystroke clamping)
  const handleEndChange = useCallback(
    (rawVal: any) => {
      const cleanVal = rawVal === '' || rawVal === undefined || rawVal === null
        ? ''
        : String(rawVal).replace(/\D/g, '');
      const nextEnd: number | string = cleanVal === '' ? '' : parseInt(cleanVal, 10);

      if (onEndChange) onEndChange(nextEnd);
      if (onChange) {
        if (range) {
          (onChange as (val: PageRangeObject) => void)({ ...range, end: nextEnd });
        } else {
          (onChange as (val: PageRangeChangeValue) => void)({ start: effectiveStart ?? '', end: nextEnd });
        }
      }
    },
    [effectiveStart, onEndChange, onChange, range]
  );

  // Post-typing validation & auto-adjustment on blur / completion
  const handleStartBlur = useCallback(
    (e?: React.FocusEvent<HTMLInputElement>) => {
      if (effectiveStart !== '' && effectiveStart !== undefined && effectiveStart !== null) {
        const startNumVal = Number(effectiveStart);
        if (!isNaN(startNumVal)) {
          let adjusted = startNumVal;
          if (adjusted < min) adjusted = min;
          if (adjusted > max) adjusted = max;

          const curEnd = effectiveEnd !== '' && effectiveEnd !== undefined && effectiveEnd !== null ? Number(effectiveEnd) : NaN;
          let nextEndVal = effectiveEnd;

          // If start was adjusted higher than an existing end page, auto-advance end page so range remains valid
          if (!isNaN(curEnd) && curEnd < adjusted) {
            nextEndVal = adjusted;
            if (onEndChange) onEndChange(adjusted);
          }

          if (adjusted !== startNumVal || nextEndVal !== effectiveEnd) {
            if (onStartChange) onStartChange(adjusted);
            if (onChange) {
              if (range) {
                (onChange as (val: PageRangeObject) => void)({ ...range, start: adjusted, end: nextEndVal ?? '' });
              } else {
                (onChange as (val: PageRangeChangeValue) => void)({ start: adjusted, end: nextEndVal ?? '' });
              }
            }
          }
        }
      }

      onBlur?.(e);
    },
    [effectiveStart, effectiveEnd, min, max, onStartChange, onEndChange, onChange, range, onBlur]
  );

  // Post-typing validation & auto-adjustment on blur / completion
  const handleEndBlur = useCallback(
    (e?: React.FocusEvent<HTMLInputElement>) => {
      if (effectiveEnd !== '' && effectiveEnd !== undefined && effectiveEnd !== null) {
        const endNumVal = Number(effectiveEnd);
        if (!isNaN(endNumVal)) {
          let adjusted = endNumVal;
          const curStart = effectiveStart !== '' && effectiveStart !== undefined && effectiveStart !== null ? Number(effectiveStart) : NaN;

          // Smart relational adjustment after user finishes typing:
          // If start page is set and end page is less than start, adjust end to match start
          if (!isNaN(curStart) && adjusted < curStart) {
            adjusted = curStart;
          } else if (adjusted < min) {
            adjusted = min;
          }

          if (adjusted > max) {
            adjusted = max;
          }

          if (adjusted !== endNumVal) {
            if (onEndChange) onEndChange(adjusted);
            if (onChange) {
              if (range) {
                (onChange as (val: PageRangeObject) => void)({ ...range, end: adjusted });
              } else {
                (onChange as (val: PageRangeChangeValue) => void)({ start: effectiveStart ?? '', end: adjusted });
              }
            }
          }
        }
      }

      onBlur?.(e);
    },
    [effectiveEnd, effectiveStart, min, max, onEndChange, onChange, range, onBlur]
  );

  const handleStartEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    handleStartBlur();
    if (onEnter) onEnter(e);
    else handleEnterFocusNext(e);
  };

  const handleEndEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    handleEndBlur();
    if (onEnter) onEnter(e);
    else handleEnterFocusNext(e);
  };

  // Size styling matching Juz input box (compact: h-9, md: h-10)
  const sizeClasses = {
    sm: 'h-9 rounded-lg text-xs sm:text-sm',
    md: 'h-10 rounded-lg text-xs sm:text-sm',
    lg: 'h-[44px] rounded-xl text-sm sm:text-base',
  }[size] || 'h-10 rounded-lg text-xs sm:text-sm';

  // Variant classes (default theme-bg-sub matching Juz input)
  let variantClasses = 'theme-bg-sub border theme-border shadow-sm';
  if (variant === 'surface') {
    variantClasses = 'theme-bg-surface border theme-border shadow-sm';
  } else if (variant === 'elevated') {
    variantClasses = 'theme-bg-elevated border theme-border shadow-sm';
  }

  const handleBackspace = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (onEmptyBackspace) {
      onEmptyBackspace(e);
    } else {
      handleBackspaceFocusPrev(e, true);
      if (onRemove) onRemove();
    }
  };

  return (
    <div
      className={`flex items-center overflow-hidden transition-all focus-within:border-[var(--accent-main)]/50 focus-within:ring-1 focus-within:ring-[var(--accent-main)]/30 ${variantClasses} ${sizeClasses} ${width} ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    >
      {/* Start Page Input */}
      <div className="flex-1 h-full flex items-center justify-center min-w-0">
        <CustomInput
          id={`${prefix}-start`}
          type="number"
          variant="borderless"
          scrollable={true}
          allowDecimals={false}
          value={effectiveStart}
          onChange={handleStartChange}
          onBlur={handleStartBlur}
          onEnter={handleStartEnter}
          onAdd={onAdd || onAddNextRange}
          onAddShift={onAddShift || onAddJuzRow}
          onEmptyBackspace={handleBackspace}
          min={min}
          max={max}
          placeholder={placeholderStart}
          disabled={disabled}
          required={required}
          className="w-full h-full p-0 min-h-0"
          wrapperClassName="w-full h-full"
          inputClassName="w-full h-full text-center text-xs sm:text-sm theme-text-primary font-semibold font-mono p-0"
        />
      </div>

      {/* Linked Divider & Dash */}
      <span className="theme-text-secondary font-mono px-0.5 select-none font-semibold text-center text-xs sm:text-sm shrink-0">
        -
      </span>

      {/* End Page Input */}
      <div className="flex-1 h-full flex items-center justify-center min-w-0">
        <CustomInput
          id={`${prefix}-end`}
          type="number"
          variant="borderless"
          scrollable={true}
          allowDecimals={false}
          value={effectiveEnd}
          onChange={handleEndChange}
          onBlur={handleEndBlur}
          onEnter={handleEndEnter}
          onAdd={onAdd || onAddNextRange}
          onAddShift={onAddShift || onAddJuzRow}
          onEmptyBackspace={(e) => {
            handleBackspaceFocusPrev(e, true);
          }}
          min={min}
          max={max}
          placeholder={placeholderEnd}
          disabled={disabled}
          required={required}
          className="w-full h-full p-0 min-h-0"
          wrapperClassName="w-full h-full"
          inputClassName="w-full h-full text-center text-xs sm:text-sm theme-text-primary font-semibold font-mono p-0"
        />
      </div>
    </div>
  );
}
