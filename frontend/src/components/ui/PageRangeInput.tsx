import React, { useCallback } from 'react';
import CustomInput from './CustomInput';
import { handleEnterFocusNext, handleBackspaceFocusPrev } from '../../utils/keyboardUtils';

export interface PageRangeObject {
  id?: string;
  start: number | string;
  end: number | string;
  [key: string]: any;
}

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
  onRemove?: () => void;
  min?: number;
  max?: number;
  juzValue?: number | string;
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
 * Guarantees that Start Page is never greater than End Page (start <= end).
 * Supports both direct value props (startValue, endValue) and range object props (range: { start, end }).
 * Fully responsive, accessible, with keyboard navigation and theme token styling.
 */
export default function PageRangeInput({
  startValue,
  endValue,
  range,
  onChange,
  onStartChange,
  onEndChange,
  onRemove,
  min = 1,
  max: propMax,
  juzValue,
  size = 'md',
  className = '',
  width = 'w-full @[480px]:w-[170px]',
  placeholderStart = 'Start',
  placeholderEnd = 'End',
  disabled = false,
  required = false,
  idPrefix,
  onEnter,
  onAdd,
  onAddNextRange,
  onAddShift,
  onAddJuzRow,
  onEmptyBackspace,
}: PageRangeInputProps) {
  // Determine effective max page from juzValue if provided
  const getMaxPage = (juzStr?: number | string) => {
    if (!juzStr) return propMax || 9999;
    const j = parseInt(String(juzStr), 10);
    if (j === 29) return 24;
    if (j === 30) return 25;
    if (j >= 1 && j <= 30) return 20;
    return propMax || 9999;
  };

  const effectiveMax = getMaxPage(juzValue);

  // Extract start and end values
  const effectiveStart = range ? range.start : startValue;
  const effectiveEnd = range ? range.end : endValue;
  const prefix = idPrefix || (range?.id ? range.id : 'page-range');

  const startNum = effectiveStart !== '' && effectiveStart !== undefined && effectiveStart !== null ? Number(effectiveStart) : NaN;
  const endNum = effectiveEnd !== '' && effectiveEnd !== undefined && effectiveEnd !== null ? Number(effectiveEnd) : NaN;

  // Maximum allowed start page cannot exceed end page (or max limit)
  const maxStart = !isNaN(endNum) && endNum >= min ? Math.min(endNum, effectiveMax) : effectiveMax;
  // Minimum allowed end page cannot be less than start page (or min limit)
  const minEnd = !isNaN(startNum) && startNum <= effectiveMax ? Math.max(startNum, min) : min;

  // Handle Start Page Change
  const handleStartChange = useCallback(
    (rawVal: any) => {
      let nextStart: number | string = rawVal === '' ? '' : Number(rawVal);
      if (typeof nextStart === 'number' && !isNaN(nextStart)) {
        if (nextStart < min) nextStart = min;
        if (!isNaN(endNum) && nextStart > endNum) {
          nextStart = endNum;
        } else if (nextStart > effectiveMax) {
          nextStart = effectiveMax;
        }
      }

      if (onStartChange) onStartChange(nextStart);
      if (onChange) {
        if (range) {
          (onChange as (val: PageRangeObject) => void)({ ...range, start: nextStart });
        } else {
          (onChange as (val: PageRangeChangeValue) => void)({ start: nextStart, end: effectiveEnd ?? '' });
        }
      }
    },
    [min, effectiveMax, endNum, effectiveEnd, onStartChange, onChange, range]
  );

  // Handle End Page Change
  const handleEndChange = useCallback(
    (rawVal: any) => {
      let nextEnd: number | string = rawVal === '' ? '' : Number(rawVal);
      if (typeof nextEnd === 'number' && !isNaN(nextEnd)) {
        if (!isNaN(startNum) && nextEnd < startNum) {
          nextEnd = startNum;
        } else if (nextEnd < min) {
          nextEnd = min;
        } else if (nextEnd > effectiveMax) {
          nextEnd = effectiveMax;
        }
      }

      if (onEndChange) onEndChange(nextEnd);
      if (onChange) {
        if (range) {
          (onChange as (val: PageRangeObject) => void)({ ...range, end: nextEnd });
        } else {
          (onChange as (val: PageRangeChangeValue) => void)({ start: effectiveStart ?? '', end: nextEnd });
        }
      }
    },
    [min, effectiveMax, startNum, effectiveStart, onEndChange, onChange, range]
  );

  // Size styling map
  const sizeClasses = {
    sm: 'min-h-[38px] h-[38px] rounded-xl text-xs',
    md: 'min-h-[46px] h-[46px] rounded-2xl text-sm',
    lg: 'min-h-[52px] h-[52px] rounded-2xl text-base',
  }[size] || 'min-h-[46px] h-[46px] rounded-2xl text-sm';

  const dividerHeight = {
    sm: 'h-4',
    md: 'h-6',
    lg: 'h-7',
  }[size] || 'h-6';

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
      className={`flex items-center theme-bg-surface border theme-border overflow-hidden shadow-2xs transition-all focus-within:border-[var(--accent-main)] focus-within:ring-2 focus-within:ring-[var(--accent-main)]/20 ${sizeClasses} ${width} ${
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
          onEnter={onEnter || handleEnterFocusNext}
          onAdd={onAdd || onAddNextRange}
          onAddShift={onAddShift || onAddJuzRow}
          onEmptyBackspace={handleBackspace}
          min={min}
          max={maxStart}
          placeholder={placeholderStart}
          disabled={disabled}
          required={required}
          className="w-full h-full p-0 min-h-0"
          wrapperClassName="w-full h-full"
          inputClassName="w-full h-full text-center font-bold font-mono p-0"
        />
      </div>

      {/* Linked Divider & Dash */}
      <div className={`w-px ${dividerHeight} theme-border border-r shrink-0`} />
      <span className="theme-text-secondary font-mono px-2 select-none font-bold text-center text-xs sm:text-sm shrink-0">
        -
      </span>
      <div className={`w-px ${dividerHeight} theme-border border-r shrink-0`} />

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
          onEnter={onEnter || handleEnterFocusNext}
          onAdd={onAdd || onAddNextRange}
          onAddShift={onAddShift || onAddJuzRow}
          onEmptyBackspace={(e) => {
            handleBackspaceFocusPrev(e, true);
          }}
          min={minEnd}
          max={effectiveMax}
          placeholder={placeholderEnd}
          disabled={disabled}
          required={required}
          className="w-full h-full p-0 min-h-0"
          wrapperClassName="w-full h-full"
          inputClassName="w-full h-full text-center font-bold font-mono p-0"
        />
      </div>
    </div>
  );
}
