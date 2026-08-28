import React, { useCallback } from 'react';
import CustomInput from './CustomInput';
import { handleEnterFocusNext, handleBackspaceFocusPrev } from '../../utils/keyboardUtils';

/**
 * Enterprise Reusable Page Range Input Component
 * 
 * Provides a unified linked dual-input box for (Start Page — End Page).
 * Guarantees that Start Page is never greater than End Page (start <= end).
 * Fully responsive, accessible, with keyboard navigation and theme token styling.
 * 
 * @param {Object} props
 * @param {number|string} props.startValue - Current start page value
 * @param {number|string} props.endValue - Current end page value
 * @param {Function} [props.onChange] - Callback returning { start, end }
 * @param {Function} [props.onStartChange] - Direct callback for start change
 * @param {Function} [props.onEndChange] - Direct callback for end change
 * @param {number} [props.min=1] - Minimum allowed page number
 * @param {number} [props.max=9999] - Maximum allowed page number
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Height and padding sizing
 * @param {string} [props.className=''] - Additional container classes
 * @param {string} [props.width='w-full @[480px]:w-[170px]'] - Custom width
 * @param {string} [props.placeholderStart='Start']
 * @param {string} [props.placeholderEnd='End']
 * @param {boolean} [props.disabled=false]
 * @param {boolean} [props.required=false]
 */
export default function PageRangeInput({
  startValue,
  endValue,
  onChange,
  onStartChange,
  onEndChange,
  min = 1,
  max = 9999,
  size = 'md',
  className = '',
  width = 'w-full @[480px]:w-[170px]',
  placeholderStart = 'Start',
  placeholderEnd = 'End',
  disabled = false,
  required = false,
  idPrefix = 'page-range',
  onEnter,
  onAdd,
  onAddShift,
  onEmptyBackspace,
}) {
  const startNum = startValue !== '' && startValue !== undefined && startValue !== null ? Number(startValue) : NaN;
  const endNum = endValue !== '' && endValue !== undefined && endValue !== null ? Number(endValue) : NaN;

  // Maximum allowed start page cannot exceed end page (or max limit)
  const maxStart = !isNaN(endNum) && endNum >= min ? Math.min(endNum, max) : max;
  // Minimum allowed end page cannot be less than start page (or min limit)
  const minEnd = !isNaN(startNum) && startNum <= max ? Math.max(startNum, min) : min;

  // Handle Start Page Change
  const handleStartChange = useCallback(
    (rawVal) => {
      let nextStart = rawVal === '' ? '' : Number(rawVal);
      if (typeof nextStart === 'number' && !isNaN(nextStart)) {
        if (nextStart < min) nextStart = min;
        if (!isNaN(endNum) && nextStart > endNum) {
          nextStart = endNum;
        } else if (nextStart > max) {
          nextStart = max;
        }
      }

      if (onStartChange) onStartChange(nextStart);
      if (onChange) {
        onChange({ start: nextStart, end: endValue });
      }
    },
    [min, max, endNum, endValue, onStartChange, onChange]
  );

  // Handle End Page Change
  const handleEndChange = useCallback(
    (rawVal) => {
      let nextEnd = rawVal === '' ? '' : Number(rawVal);
      if (typeof nextEnd === 'number' && !isNaN(nextEnd)) {
        if (!isNaN(startNum) && nextEnd < startNum) {
          nextEnd = startNum;
        } else if (nextEnd < min) {
          nextEnd = min;
        } else if (nextEnd > max) {
          nextEnd = max;
        }
      }

      if (onEndChange) onEndChange(nextEnd);
      if (onChange) {
        onChange({ start: startValue, end: nextEnd });
      }
    },
    [min, max, startNum, startValue, onEndChange, onChange]
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

  return (
    <div
      className={`flex items-center theme-bg-surface border theme-border overflow-hidden shadow-2xs transition-all focus-within:border-[var(--accent-main)] focus-within:ring-2 focus-within:ring-[var(--accent-main)]/20 ${sizeClasses} ${width} ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    >
      {/* Start Page Input */}
      <div className="flex-1 h-full flex items-center justify-center min-w-0">
        <CustomInput
          id={`${idPrefix}-start`}
          type="number"
          variant="borderless"
          scrollable={true}
          allowDecimals={false}
          value={startValue}
          onChange={handleStartChange}
          onEnter={onEnter || handleEnterFocusNext}
          onAdd={onAdd}
          onAddShift={onAddShift}
          onEmptyBackspace={onEmptyBackspace}
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
          id={`${idPrefix}-end`}
          type="number"
          variant="borderless"
          scrollable={true}
          allowDecimals={false}
          value={endValue}
          onChange={handleEndChange}
          onEnter={onEnter || handleEnterFocusNext}
          onAdd={onAdd}
          onAddShift={onAddShift}
          min={minEnd}
          max={max}
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
