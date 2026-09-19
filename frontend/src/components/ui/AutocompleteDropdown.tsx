import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronIcon, SleekCheckIcon } from './Icons';
import { focusNextInput } from '../../utils/keyboardUtils';

export interface AutocompleteOption {
  label?: string;
  name?: string;
  value?: any;
  sub?: string;
  subLabel?: string;
  group_name?: string;
  badge?: string;
  typeLabel?: string;
  onEdit?: (item: any) => void;
  onDelete?: (item: any) => void;
  [key: string]: any;
}

export interface AutocompleteDropdownProps {
  options?: (string | AutocompleteOption)[];
  value?: string | AutocompleteOption;
  onChange?: (val: any) => void;
  onAddNew?: (val: string) => void;
  onNextFocus?: () => void;
  placeholder?: string;
  label?: string;
  subLabel?: string;
  required?: boolean;
  optional?: boolean;
  badge?: React.ReactNode;
  headerAction?: React.ReactNode;
  onActionClick?: () => void;
  actionLabel?: string | null;
  manageLabel?: string | null;
  className?: string;
  inputClassName?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filled' | 'elevated' | 'sub';
  autoFocus?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null> | null;
  disableSaveButton?: boolean;
  showAllOptionsOnFocus?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  icon?: React.ComponentType<{ className?: string }> | null;
  error?: string | null;
  [key: string]: any;
}

/**
 * Enterprise AutocompleteDropdown Component
 * Features:
 * - 100% Design Token Parity with CustomSelect & CustomInput
 * - Portal Positioning Engine with Screen Boundary Calculation & Scroll Listeners
 * - Dual Search & Direct Keyboard Navigation (ArrowUp/Down, Enter, Shift++)
 * - Subtitle & Badge Enrichment for Student Group / Section metadata
 * - SleekCheckIcon & Project Standard Hover / Focus Ring Styling
 */
export default function AutocompleteDropdown({
  options = [],
  value = '',
  onChange,
  onAddNew,
  onNextFocus,
  placeholder = 'Search or type...',
  label = '',
  subLabel = '',
  required = false,
  optional = false,
  badge = null,
  headerAction = null,
  onActionClick = null,
  actionLabel = null,
  manageLabel = null,
  className = '',
  inputClassName = '',
  size = 'md',
  variant = 'sub',
  autoFocus = false,
  inputRef = null,
  disableSaveButton = false,
  showAllOptionsOnFocus = false,
  readOnly = false,
  disabled = false,
  icon: Icon = null,
  error = null,
}: AutocompleteDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const initialSearchTerm = typeof value === 'string' ? value : value?.label || value?.name || '';
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [prevValue, setPrevValue] = useState(value);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const localInputRef = useRef<HTMLInputElement>(null);
  const refToUse = (inputRef as React.RefObject<HTMLInputElement>) || localInputRef;
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [coords, setCoords] = useState({
    top: 0,
    left: 0,
    width: 0,
    openUpward: false,
    maxHeight: 240,
  });

  if (value !== prevValue) {
    setPrevValue(value);
    setSearchTerm(typeof value === 'string' ? value : value?.label || value?.name || '');
  }

  // Recalculate popup position accurately matching CustomSelect
  const updatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const minRequiredSpace = 160;

    const shouldOpenUpward = spaceBelow < minRequiredSpace && spaceAbove > spaceBelow;
    const availableHeight = shouldOpenUpward
      ? Math.max(120, spaceAbove - 16)
      : Math.max(120, spaceBelow - 16);
    const calculatedMaxHeight = Math.min(260, availableHeight);

    setCoords({
      left: rect.left,
      width: rect.width,
      top: shouldOpenUpward ? rect.top - 6 : rect.bottom + 6,
      openUpward: shouldOpenUpward,
      maxHeight: calculatedMaxHeight,
    });
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleScroll = (e: Event) => {
        if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) return;
        updatePosition();
      };
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (autoFocus && refToUse.current) {
      setTimeout(() => {
        if (refToUse.current) {
          refToUse.current.focus();
        }
      }, 100);
    }
  }, [autoFocus, refToUse]);

  const safeSearchTerm = typeof searchTerm === 'string' ? searchTerm : (searchTerm as any)?.label || '';

  const filteredOptions = useMemo(() => {
    return (options || []).filter((item) => {
      if (showAllOptionsOnFocus && isOpen) return true;
      if (!safeSearchTerm || !safeSearchTerm.trim()) return true;
      const term = safeSearchTerm.trim().toLowerCase();
      const labelText = (typeof item === 'string' ? item : item?.label || item?.name || '').toLowerCase();
      const sub = (
        typeof item === 'object' && item !== null
          ? (typeof item.sub === 'string' ? item.sub : typeof item.subLabel === 'string' ? item.subLabel : typeof item.group_name === 'string' ? item.group_name : '')
          : ''
      ).toLowerCase();
      return labelText.includes(term) || sub.includes(term);
    });
  }, [options, showAllOptionsOnFocus, isOpen, safeSearchTerm]);

  const triggerNextFocus = () => {
    if (onNextFocus) {
      onNextFocus();
    } else {
      setTimeout(() => {
        if (refToUse.current) {
          focusNextInput(refToUse.current);
        }
      }, 30);
    }
  };

  const handleSelect = (item: string | AutocompleteOption) => {
    const selectedLabel = typeof item === 'string' ? item : item.label || item.name || '';
    setSearchTerm(selectedLabel);
    setIsOpen(false);
    if (onChange) onChange(item);
    triggerNextFocus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    setIsOpen(true);
    setHighlightedIndex(0);
    if (onChange) onChange(val);
  };

  const handleSaveClick = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsOpen(false);
    if (onAddNew) onAddNew(safeSearchTerm);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.shiftKey && (e.key === '+' || e.key === '=')) {
      if (onAddNew && safeSearchTerm.trim()) {
        e.preventDefault();
        handleSaveClick();
        return;
      }
    }

    if (isOpen && filteredOptions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % filteredOptions.length);
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 + filteredOptions.length) % filteredOptions.length);
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filteredOptions[highlightedIndex];
        if (selected) {
          handleSelect(selected);
        } else if (onAddNew && safeSearchTerm.trim()) {
          handleSaveClick();
        } else {
          setIsOpen(false);
          triggerNextFocus();
        }
        return;
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      setIsOpen(false);
      triggerNextFocus();
    }
  };

  // Size classes matching CustomInput and CustomSelect
  const sizeClasses = {
    sm: 'min-h-[38px] px-3 py-1.5 text-xs rounded-xl',
    md: 'min-h-[46px] px-4 py-2.5 sm:py-3 text-xs sm:text-sm rounded-2xl',
    lg: 'min-h-[54px] px-5 py-3.5 text-sm sm:text-base rounded-2xl',
  }[size] || 'min-h-[46px] px-4 py-2.5 sm:py-3 text-xs sm:text-sm rounded-2xl';

  // Variant classes
  let variantClasses = 'theme-bg-sub theme-border border';
  if (variant === 'filled') {
    variantClasses = 'theme-bg-elevated theme-border border';
  } else if (variant === 'elevated') {
    variantClasses = 'theme-bg-elevated theme-border border shadow-sm';
  }

  const dropdownMenu =
    isOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              left: `${coords.left}px`,
              top: coords.openUpward ? 'auto' : `${coords.top}px`,
              bottom: coords.openUpward ? `${window.innerHeight - coords.top}px` : 'auto',
              width: `${coords.width}px`,
              zIndex: 99999,
            }}
            className="theme-bg-surface border theme-border shadow-2xl overflow-hidden animate-fade-in rounded-2xl p-1.5"
          >
            <div
              style={{
                maxHeight: `${Math.max(80, coords.maxHeight - 10)}px`,
              }}
              className="p-1 space-y-0.5 overflow-y-auto scrollbar-none no-scrollbar"
            >
              {filteredOptions.length > 0 ? (
                filteredOptions.map((item, index) => {
                  const itemLabel = typeof item === 'string' ? item : item?.label || item?.name || '';
                  const itemSub =
                    typeof item === 'object' && item !== null
                      ? (typeof item.sub === 'string' ? item.sub : typeof item.subLabel === 'string' ? item.subLabel : typeof item.group_name === 'string' ? item.group_name : null)
                      : null;
                  const itemBadge = typeof item === 'object' && item !== null ? item.badge || item.typeLabel : null;
                  const isHighlighted = index === highlightedIndex;
                  const isSelected = itemLabel.toLowerCase() === safeSearchTerm.toLowerCase();

                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSelect(item)}
                      className={`w-full px-3 py-2 rounded-xl text-left text-xs transition-colors flex items-center justify-between cursor-pointer group/item ${
                        isSelected || isHighlighted
                          ? 'theme-bg-accent theme-accent-text font-bold shadow-xs'
                          : 'hover:bg-[var(--accent-main)]/15 hover:theme-accent theme-text-primary'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2 flex-1">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate font-medium">{itemLabel}</span>
                            {itemBadge && (
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-md font-mono shrink-0 border ${
                                  isSelected || isHighlighted
                                    ? 'theme-bg-surface/80 border-[var(--accent-main)]/30 theme-accent font-semibold'
                                    : 'theme-bg-sub theme-text-secondary border-current/10'
                                }`}
                              >
                                {itemBadge}
                              </span>
                            )}
                          </div>
                          {itemSub && (
                            <div
                              className={`text-[10px] truncate mt-0.5 ${
                                isSelected || isHighlighted ? 'opacity-80' : 'theme-text-secondary'
                              }`}
                            >
                              {itemSub}
                            </div>
                          )}
                        </div>
                      </div>
                      {isSelected && <SleekCheckIcon className="w-3.5 h-3.5 shrink-0 ml-1.5" />}
                    </button>
                  );
                })
              ) : safeSearchTerm.trim() && onAddNew ? (
                <button
                  type="button"
                  onClick={handleSaveClick}
                  className="w-full px-3 py-2.5 rounded-xl text-left text-xs font-semibold theme-accent hover:bg-[var(--accent-main)]/15 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span className="truncate">Add &ldquo;{safeSearchTerm.trim()}&rdquo;</span>
                  <span className="text-[10px] font-mono opacity-70">Shift + +</span>
                </button>
              ) : (
                <div className="px-3 py-2 text-center text-xs theme-text-secondary">
                  No matching options
                </div>
              )}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={containerRef} className={`relative w-full text-left font-sans ${className}`}>
      {/* Top Bar: Label, Badge, and Action */}
      {(label || subLabel || onActionClick || actionLabel || manageLabel || headerAction || badge) && (
        <div className="flex items-center justify-between gap-2 mb-2 select-none">
          <div className="flex items-center gap-1.5 flex-wrap">
            {label && (
              <label
                onClick={() => refToUse.current?.focus()}
                className="block text-xs font-bold theme-text-secondary uppercase tracking-wider cursor-pointer"
              >
                {label} {required && <span className="theme-danger">*</span>}
              </label>
            )}
            {optional && (
              <span className="text-[10px] font-semibold theme-text-secondary opacity-60 uppercase tracking-wider">
                (Optional)
              </span>
            )}
            {badge && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md theme-bg-accent-soft theme-accent border theme-border">
                {badge}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {headerAction ? (
              headerAction
            ) : onActionClick || actionLabel ? (
              <button
                type="button"
                onClick={onActionClick || handleSaveClick}
                className="text-xs font-semibold theme-accent hover:opacity-80 cursor-pointer flex items-center gap-1 transition-colors"
              >
                <span>{actionLabel || manageLabel || '+ Save'}</span>
              </button>
            ) : null}
          </div>
        </div>
      )}

      {subLabel && (
        <p className="text-[11px] theme-text-secondary mb-2 font-medium leading-tight">
          {subLabel}
        </p>
      )}

      {/* Input Box Trigger matching CustomInput & CustomSelect styling */}
      <div
        className={`w-full ${sizeClasses} ${variantClasses} transition-all duration-150 flex items-center justify-between font-medium cursor-text ${
          disabled
            ? 'opacity-50 cursor-not-allowed theme-bg-sub theme-border theme-text-secondary'
            : isOpen
            ? 'theme-bg-elevated border-[var(--accent-main)]/70 ring-2 ring-[var(--accent-main)]/15 shadow-xs'
            : error
            ? 'border-[var(--color-danger)]/70 ring-2 ring-[var(--color-danger)]/20 theme-bg-sub theme-text-primary'
            : 'hover:border-[var(--accent-main)]/40 focus-within:border-[var(--accent-main)] focus-within:ring-2 focus-within:ring-[var(--accent-main)]/20 theme-text-primary'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 h-full">
          {Icon && (
            <div className="mr-1.5 shrink-0 flex items-center justify-center select-none pointer-events-none">
              <Icon className="w-4 h-4 shrink-0 theme-accent opacity-90" />
            </div>
          )}

          <input
            ref={refToUse}
            type="text"
            readOnly={readOnly}
            disabled={disabled}
            value={safeSearchTerm}
            onChange={readOnly ? undefined : handleInputChange}
            onKeyDown={readOnly ? (e) => { if (e.key === 'Enter') setIsOpen(!isOpen); } : handleKeyDown}
            onFocus={() => !disabled && setIsOpen(true)}
            onClick={() => !disabled && setIsOpen(true)}
            placeholder={placeholder}
            className={`w-full bg-transparent border-0 outline-none p-0 font-medium theme-text-primary placeholder:theme-text-secondary placeholder:opacity-50 text-xs sm:text-sm ${
              readOnly ? 'cursor-pointer select-none' : ''
            } ${inputClassName}`}
          />
        </div>

        <div
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) {
              setIsOpen((prev) => !prev);
              if (!isOpen) refToUse.current?.focus();
            }
          }}
          className="shrink-0 ml-1.5 p-0.5 theme-text-secondary hover:theme-text-primary cursor-pointer select-none flex items-center justify-center"
        >
          <ChevronIcon isOpen={isOpen} className="w-3.5 h-3.5 theme-text-secondary transition-transform duration-200" />
        </div>
      </div>

      {/* Portal Dropdown Menu */}
      {dropdownMenu}
    </div>
  );
}
