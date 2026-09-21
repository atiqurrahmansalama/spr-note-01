import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronIcon, SleekCheckIcon } from './Icons';
import { focusNextInput } from '../../utils/keyboardUtils';
import { usePortalPosition } from '../../hooks/usePortalPosition';
import { useDropdownKeyboard } from '../../hooks/useDropdownKeyboard';
import PortalDropdownMenu from './PortalDropdownMenu';

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
  actionTo?: string | ((searchTerm: string) => string) | null;
  actionTitle?: string | null;
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
 * 
 * Reusable input with headless positioning, keyboard navigation,
 * and design-token compliant portal rendering.
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
  actionTo = null,
  actionTitle = null,
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

  const localInputRef = useRef<HTMLInputElement>(null);
  const refToUse = (inputRef as React.RefObject<HTMLInputElement>) || localInputRef;

  if (value !== prevValue) {
    setPrevValue(value);
    setSearchTerm(typeof value === 'string' ? value : value?.label || value?.name || '');
  }

  // Headless Positioning Engine
  const { coords, updatePosition, containerRef, dropdownRef } = usePortalPosition({
    isOpen,
    setIsOpen,
    minRequiredSpace: 160,
    maxDropdownHeight: 260,
    offset: 6,
  });

  const safeSearchTerm = typeof searchTerm === 'string' ? searchTerm : (searchTerm as any)?.label || '';
  const resolvedActionTo = typeof actionTo === 'function' ? actionTo(safeSearchTerm) : actionTo;

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

  const handleSaveClick = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsOpen(false);
    if (onAddNew) onAddNew(safeSearchTerm);
  };

  // Headless Keyboard Navigation Engine
  const {
    highlightedIndex,
    handleKeyDown,
    optionsListRef,
    resetHighlight,
  } = useDropdownKeyboard({
    isOpen,
    setIsOpen,
    itemCount: filteredOptions.length,
    onSelectIndex: (idx) => {
      const selected = filteredOptions[idx];
      if (selected) handleSelect(selected);
    },
    onAddNew: safeSearchTerm.trim() && onAddNew ? () => handleSaveClick() : undefined,
    onNextFocus: triggerNextFocus,
  });

  useEffect(() => {
    if (autoFocus && refToUse.current) {
      setTimeout(() => {
        if (refToUse.current) {
          refToUse.current.focus();
        }
      }, 100);
    }
  }, [autoFocus, refToUse]);

  const handleOpen = () => {
    if (disabled) return;
    updatePosition();
    setIsOpen(true);
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
      refToUse.current?.focus();
    } else {
      setIsOpen(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    updatePosition();
    setIsOpen(true);
    resetHighlight();
    if (onChange) onChange(val);
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

  return (
    <div ref={containerRef} className={`relative w-full text-left font-sans ${className}`}>
      {/* Top Bar: Label, Badge, and Action */}
      {(label || subLabel || onActionClick || actionLabel || actionTo || manageLabel || headerAction || badge) && (
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
            ) : resolvedActionTo ? (
              <Link
                to={resolvedActionTo}
                className="text-xs font-semibold theme-accent hover:underline hover:opacity-80 transition-all flex items-center gap-1 cursor-pointer"
                title={actionTitle || (typeof actionLabel === 'string' ? actionLabel : undefined)}
              >
                <span>{actionLabel || manageLabel || '+ Add'}</span>
              </Link>
            ) : onActionClick || actionLabel ? (
              <button
                type="button"
                onClick={onActionClick || handleSaveClick}
                className="text-xs font-semibold theme-accent hover:opacity-80 cursor-pointer flex items-center gap-1 transition-colors"
                title={actionTitle || undefined}
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
            onKeyDown={readOnly ? (e) => { if (e.key === 'Enter') handleToggle(e as any); } : handleKeyDown}
            onFocus={handleOpen}
            onClick={handleOpen}
            placeholder={placeholder}
            className={`w-full bg-transparent border-0 outline-none p-0 font-medium theme-text-primary placeholder:theme-text-secondary placeholder:opacity-50 text-xs sm:text-sm ${
              readOnly ? 'cursor-pointer select-none' : ''
            } ${inputClassName}`}
          />
        </div>

        <div
          onClick={handleToggle}
          className="shrink-0 ml-1.5 p-0.5 theme-text-secondary hover:theme-text-primary cursor-pointer select-none flex items-center justify-center"
        >
          <ChevronIcon isOpen={isOpen} className="w-3.5 h-3.5 theme-text-secondary transition-transform duration-200" />
        </div>
      </div>

      {/* Portal Dropdown Menu using Reusable Portal Component */}
      <PortalDropdownMenu
        isOpen={isOpen}
        coords={coords}
        dropdownRef={dropdownRef}
        optionsListRef={optionsListRef}
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
                data-dropdown-item="true"
                type="button"
                onClick={() => handleSelect(item)}
                className={`w-full px-3 py-2 rounded-xl text-left text-xs transition-all duration-150 ease-out flex items-center justify-between cursor-pointer group/item active:scale-[0.985] ${
                  isSelected || isHighlighted
                    ? 'theme-bg-accent theme-accent-text font-semibold shadow-xs translate-x-1'
                    : 'hover:bg-[var(--accent-main)]/15 hover:theme-accent theme-text-primary hover:translate-x-0.5'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 pr-2 flex-1">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">{itemLabel}</span>
                      {itemBadge && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md font-mono shrink-0 border transition-all duration-150 ${
                            isSelected || isHighlighted
                              ? 'theme-bg-surface/85 border-[var(--accent-main)]/40 theme-accent font-semibold shadow-2xs'
                              : 'theme-bg-sub theme-text-secondary border-current/10 group-hover/item:border-[var(--accent-main)]/20'
                          }`}
                        >
                          {itemBadge}
                        </span>
                      )}
                    </div>
                    {itemSub && (
                      <div
                        className={`text-[10px] truncate mt-0.5 transition-opacity duration-150 ${
                          isSelected || isHighlighted ? 'opacity-90' : 'theme-text-secondary'
                        }`}
                      >
                        {itemSub}
                      </div>
                    )}
                  </div>
                </div>
                {isSelected && (
                  <span className="shrink-0 ml-1.5 transform transition-transform duration-200 scale-100">
                    <SleekCheckIcon className="w-3.5 h-3.5" />
                  </span>
                )}
              </button>
            );
          })
        ) : safeSearchTerm.trim() && onAddNew ? (
          <button
            type="button"
            onClick={handleSaveClick}
            className="w-full px-3 py-2.5 rounded-xl text-left text-xs font-semibold theme-accent hover:bg-[var(--accent-main)]/15 transition-all duration-150 flex items-center justify-between cursor-pointer active:scale-[0.985] animate-item-slide"
          >
            <span className="truncate">Add &ldquo;{safeSearchTerm.trim()}&rdquo;</span>
            <span className="text-[10px] font-mono opacity-70">Shift + +</span>
          </button>
        ) : (
          <div className="px-3 py-2 text-center text-xs theme-text-secondary">
            No matching options
          </div>
        )}
      </PortalDropdownMenu>
    </div>
  );
}
