import React, { useId } from 'react';
import { SleekCheckIcon } from './Icons';

export default function CustomCheckbox({
  id,
  name,
  checked = false,
  onChange,
  label,
  subLabel,
  description,
  disabled = false,
  size = 'md', // 'sm' | 'md' | 'lg'
  className = '',
  boxClassName = '',
}) {
  const autoId = useId();
  const inputId = id || autoId;

  const sizeBoxClasses =
    size === 'sm'
      ? 'w-4 h-4 rounded-md'
      : size === 'lg'
      ? 'w-5 h-5 rounded-lg'
      : 'w-4.5 h-4.5 rounded-lg';

  const iconSizeClasses =
    size === 'sm'
      ? 'w-3 h-3'
      : size === 'lg'
      ? 'w-4 h-4'
      : 'w-3.5 h-3.5';

  const handleChange = (e) => {
    if (disabled) return;
    onChange?.(e.target.checked, e);
  };

  const handleContainerClick = (e) => {
    if (disabled) return;
    e.stopPropagation();
  };

  const hasMultipleLines = Boolean(subLabel || description);

  return (
    <label
      htmlFor={inputId}
      onClick={handleContainerClick}
      className={`inline-flex ${hasMultipleLines ? 'items-start' : 'items-center'} gap-2.5 select-none transition-opacity ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer group'
      } ${className}`}
    >
      <div className={`relative flex items-center justify-center shrink-0 ${hasMultipleLines ? 'mt-0.5' : ''}`}>
        <input
          type="checkbox"
          id={inputId}
          name={name}
          checked={Boolean(checked)}
          onChange={handleChange}
          disabled={disabled}
          className="sr-only"
        />
        <div
          className={`flex items-center justify-center border transition-all duration-150 shadow-xs ${sizeBoxClasses} ${
            checked
              ? 'theme-bg-accent theme-accent-text border-[var(--accent-main)] shadow-xs scale-100'
              : 'theme-bg-sub border-black/[0.15] dark:border-white/[0.18] group-hover:border-[var(--accent-main)]/60'
          } ${boxClassName}`}
        >
          <SleekCheckIcon
            className={`${iconSizeClasses} transition-transform duration-150 ${
              checked ? 'scale-100 opacity-100 stroke-[2.5]' : 'scale-50 opacity-0'
            }`}
          />
        </div>
      </div>

      {(label || subLabel || description) && (
        <div className="flex flex-col text-left justify-center">
          {label && (
            <span
              className={`text-xs font-bold leading-normal ${
                disabled ? 'theme-text-secondary' : 'theme-text-primary'
              }`}
            >
              {label}
            </span>
          )}
          {subLabel && (
            <span className="text-[10px] theme-text-secondary mt-0.5 font-medium">
              {subLabel}
            </span>
          )}
          {description && (
            <span className="text-[11px] theme-text-secondary mt-1 leading-relaxed opacity-80">
              {description}
            </span>
          )}
        </div>
      )}
    </label>
  );
}
