import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { SleekCheckIcon, ChevronIcon, AlertCircleIcon } from './Icons';
import CustomInput from './CustomInput';
import { usePortalPosition } from '../../hooks/usePortalPosition';
import PortalDropdownMenu from './PortalDropdownMenu';

export interface SelectOption {
  value?: any;
  id?: any;
  label?: string;
  name?: string;
  description?: string;
  desc?: string;
  subLabel?: string;
  typeLabel?: string;
  badge?: string;
  [key: string]: any;
}

export interface CustomSelectProps {
  value?: any;
  onChange?: (val: any) => void;
  options?: (string | number | SelectOption)[];
  placeholder?: string;
  label?: React.ReactNode;
  error?: string | null;
  required?: boolean;
  searchable?: boolean;
  disabled?: boolean;
  direction?: 'auto' | 'up' | 'down';
  icon?: React.ComponentType<{ className?: string }> | null;
  size?: 'sm' | 'md' | 'lg' | string;
  compactMode?: boolean;
  showChevron?: boolean;
  hideChevron?: boolean;
  showDescription?: boolean;
  showBadge?: boolean;
  multiple?: boolean;
  isMulti?: boolean;
  onManage?: (() => void) | null;
  manageLabel?: string | null;
  manageTitle?: string | null;
  onActionClick?: (() => void) | null;
  actionLabel?: string | null;
  actionTo?: string | null;
  actionTitle?: string | null;
  headerAction?: React.ReactNode;
  badge?: React.ReactNode;
  subLabel?: React.ReactNode;
  className?: string;
  [key: string]: any;
}

/**
 * Enterprise CustomSelect Component
 * 
 * Reusable dropdown select with headless viewport-aware portal positioning,
 * zero clipping, multi-select, search filtering, and enterprise design-token styling.
 */
export default function CustomSelect({
  value = '',
  onChange = () => {},
  options = [],
  placeholder = 'Select an option...',
  label = '',
  error = null,
  required = false,
  searchable = false,
  disabled = false,
  direction = 'auto',
  icon: Icon = null,
  size = 'md',
  compactMode = false,
  showChevron = true,
  hideChevron = false,
  showDescription = false,
  showBadge = true,
  multiple = false,
  isMulti = false,
  onManage = null,
  manageLabel = null,
  manageTitle = null,
  onActionClick = null,
  actionLabel = null,
  actionTo = null,
  actionTitle = null,
  headerAction = null,
  badge = null,
  subLabel = null,
  className = '',
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Headless Viewport-Aware Positioning Engine
  const { coords, updatePosition, containerRef, dropdownRef } = usePortalPosition({
    isOpen,
    setIsOpen,
    direction: direction as 'auto' | 'up' | 'down',
    minRequiredSpace: compactMode ? 100 : 200,
    maxDropdownHeight: 260,
    offset: 6,
  });

  const handleToggle = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const isMultiple = Boolean(multiple || isMulti);

  const currentValues = useMemo(() => {
    if (!isMultiple) return [];
    if (Array.isArray(value)) return value.map(String);
    if (typeof value === 'string' && value.trim()) {
      return value.split(',').map((s) => s.trim());
    }
    return [];
  }, [value, isMultiple]);

  const safeOptions = Array.isArray(options) ? options : [];

  const filteredOptions = useMemo(() => {
    if (!search || !search.trim()) return safeOptions;
    const term = search.toLowerCase();
    return safeOptions.filter((opt) => {
      const labelText = typeof opt === 'string' ? opt : typeof opt === 'number' ? String(opt) : opt?.label || opt?.name || '';
      return labelText.toLowerCase().includes(term);
    });
  }, [safeOptions, search]);

  const selectedOption = !isMultiple
    ? safeOptions.find((opt) => {
        if (typeof opt === 'string' || typeof opt === 'number') return String(opt) === String(value);
        return String(opt?.value) === String(value) || String(opt?.id) === String(value);
      })
    : null;

  const selectedLabel = selectedOption
    ? typeof selectedOption === 'string' || typeof selectedOption === 'number'
      ? String(selectedOption)
      : selectedOption?.label || selectedOption?.name || ''
    : '';

  const handleSelect = (opt: string | number | SelectOption) => {
    const val = typeof opt === 'string' || typeof opt === 'number' ? opt : opt.value ?? opt.id;
    if (isMultiple) {
      let nextValues: string[];
      const strVal = String(val);
      if (strVal === 'ALL') {
        if (currentValues.includes('ALL')) {
          nextValues = [];
        } else {
          nextValues = ['ALL'];
        }
      } else {
        const withoutAll = currentValues.filter((v) => v !== 'ALL');
        if (withoutAll.includes(strVal)) {
          nextValues = withoutAll.filter((v) => v !== strVal);
        } else {
          nextValues = [...withoutAll, strVal];
        }
      }
      onChange(nextValues);
    } else {
      onChange(val);
      setIsOpen(false);
      setSearch('');
    }
  };

  const sizeClasses = {
    sm: 'min-h-[38px] px-3 py-1.5 text-xs rounded-xl',
    md: 'min-h-[46px] px-4 py-2.5 sm:py-3 text-xs sm:text-sm rounded-2xl',
    lg: 'min-h-[54px] px-5 py-3.5 text-sm sm:text-base rounded-2xl',
  }[size] || 'min-h-[46px] px-4 py-2.5 sm:py-3 text-xs sm:text-sm rounded-2xl';

  return (
    <div
      className={`relative w-full text-left font-sans ${compactMode ? 'h-full' : ''} ${className}`}
      ref={containerRef}
    >
      {/* Top Bar: Label, Badge, and Action */}
      {(label || subLabel || onManage || onActionClick || actionTo || actionLabel || headerAction || badge) && (
        <div className="flex items-center justify-between gap-2 mb-2 select-none">
          <div className="flex items-center gap-1.5 flex-wrap">
            {label && (
              <label
                onClick={() => handleToggle()}
                className="block text-xs font-bold theme-text-secondary uppercase tracking-wider cursor-pointer"
              >
                {label} {required && <span className="theme-danger">*</span>}
              </label>
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
            ) : actionTo ? (
              <Link
                to={actionTo}
                className="text-[10px] font-semibold theme-accent hover:underline hover:opacity-80 transition-all flex items-center gap-1 cursor-pointer"
                title={actionTitle || manageTitle || (typeof actionLabel === 'string' ? actionLabel : undefined)}
              >
                <span>{actionLabel || manageLabel || '+ Add'}</span>
              </Link>
            ) : (onManage || onActionClick) ? (
              <button
                type="button"
                onClick={onManage || onActionClick || undefined}
                className="text-[10px] font-semibold theme-accent hover:underline cursor-pointer flex items-center gap-1"
                title={actionTitle || manageTitle || `Manage ${typeof label === 'string' ? label : 'options'}`}
              >
                <span>{actionLabel || manageLabel || 'Manage'}</span>
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

      {/* Trigger Button */}
      {compactMode ? (
        <button
          type="button"
          disabled={disabled}
          onClick={handleToggle}
          className={`w-full h-full theme-bg-sub rounded-lg border overflow-hidden relative flex items-center justify-center cursor-pointer shadow-xs transition-all hover:theme-bg-elevated focus:outline-none ${
            isOpen
              ? 'border-[var(--accent-main)]/60 ring-1 ring-[var(--accent-main)]/20 shadow-xs'
              : 'theme-border hover:border-[var(--accent-main)]/40'
          }`}
        >
          <span className="w-full text-center text-[12px] sm:text-[14px] font-mono font-semibold theme-text-primary pointer-events-none">
            {selectedLabel || placeholder}
          </span>
          {showChevron && !hideChevron && (
            <span className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none opacity-30">
              <ChevronIcon isOpen={isOpen} className="w-2.5 h-2.5 theme-text-secondary transition-transform duration-200" />
            </span>
          )}
        </button>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={handleToggle}
          className={`w-full ${sizeClasses} border transition-all duration-150 flex items-center justify-between font-medium cursor-pointer ${
            disabled
              ? 'opacity-50 cursor-not-allowed theme-bg-sub theme-border theme-text-secondary'
              : isOpen
              ? 'theme-bg-elevated border-[var(--accent-main)]/70 ring-2 ring-[var(--accent-main)]/15 shadow-xs'
              : error
              ? 'border-[var(--color-danger)]/70 ring-2 ring-[var(--color-danger)]/20 theme-bg-sub theme-text-primary'
              : 'theme-bg-sub hover:theme-bg-elevated/70 theme-border hover:border-current/20 theme-text-primary'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {Icon && (
              <div className="mr-3 shrink-0 flex items-center justify-center select-none pointer-events-none">
                <Icon className="w-4 h-4 shrink-0 theme-accent" />
              </div>
            )}
            
            {/* Multi-Select Trigger View */}
            {isMultiple ? (
              currentValues.length === 0 ? (
                <span className="truncate theme-text-secondary opacity-60">{placeholder}</span>
              ) : currentValues.includes('ALL') ? (
                (() => {
                  const allOption = safeOptions.find((opt) => {
                    const optVal = typeof opt === 'string' || typeof opt === 'number' ? opt : opt.value ?? opt.id;
                    return String(optVal) === 'ALL';
                  });
                  const allLabel = (typeof allOption === 'object' && allOption !== null ? allOption?.label || allOption?.name : allOption) || 'All';
                  return (
                    <span className="truncate theme-text-primary font-medium">{String(allLabel)}</span>
                  );
                })()
              ) : (
                (() => {
                  const selectedLabels = safeOptions
                    .filter((opt) => {
                      const optVal = typeof opt === 'string' || typeof opt === 'number' ? opt : opt.value ?? opt.id;
                      return currentValues.includes(String(optVal));
                    })
                    .map((opt) => (typeof opt === 'string' || typeof opt === 'number' ? String(opt) : opt.label || opt.name || ''));

                  if (selectedLabels.length === 0) {
                    return <span className="truncate theme-text-secondary opacity-60">{placeholder}</span>;
                  }

                  return (
                    <span className="truncate theme-text-primary font-medium">
                      {selectedLabels.join(', ')}
                    </span>
                  );
                })()
              )
            ) : selectedLabel ? (
              <div className="flex items-center justify-between gap-2 w-full min-w-0 pr-1">
                <span className="truncate theme-text-primary font-medium">{selectedLabel}</span>
                {showBadge && typeof selectedOption === 'object' && selectedOption !== null && (selectedOption.typeLabel || selectedOption.badge) && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md font-mono shrink-0 theme-bg-app theme-text-secondary border theme-border">
                    {selectedOption.typeLabel || selectedOption.badge}
                  </span>
                )}
              </div>
            ) : (
              <span className="truncate theme-text-secondary opacity-60">{placeholder}</span>
            )}
          </div>

          <div className="shrink-0 ml-1.5">
            <ChevronIcon isOpen={isOpen} className="w-3.5 h-3.5 theme-text-secondary transition-transform duration-200" />
          </div>
        </button>
      )}

      {error && (
        <div className="flex items-center gap-1.5 mt-1.5 text-xs font-medium theme-danger animate-fade-in">
          <AlertCircleIcon className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Portal Dropdown Menu using Reusable Headless Portal Engine */}
      <PortalDropdownMenu
        isOpen={isOpen}
        coords={coords}
        dropdownRef={dropdownRef}
        className={compactMode ? 'rounded-xl p-1' : 'rounded-2xl p-1.5'}
        listClassName={compactMode ? 'p-0.5 space-y-1' : 'p-1 space-y-0.5'}
        header={
          !compactMode && searchable ? (
            <div className="p-2 border-b theme-border theme-bg-sub/60">
              <CustomInput
                type="search"
                size="sm"
                autoFocus
                placeholder="Search options..."
                value={search}
                onChange={(val: string) => setSearch(val)}
                clearable={true}
              />
            </div>
          ) : null
        }
      >
        {filteredOptions.length === 0 ? (
          <div className="px-2 py-2 text-center text-xs theme-text-secondary">
            No matching options
          </div>
        ) : (
          filteredOptions.map((opt, idx) => {
            const optVal = typeof opt === 'string' || typeof opt === 'number' ? opt : opt.value ?? opt.id;
            const optLabel = typeof opt === 'string' || typeof opt === 'number' ? String(opt) : opt.label || opt.name || '';
            const optDesc =
              typeof opt === 'object' && opt !== null && showDescription ? opt.description || opt.desc : null;
            const isSelected = isMultiple
              ? currentValues.includes(String(optVal))
              : String(optVal) === String(value);

            if (compactMode) {
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className={`w-full py-1.5 px-1 rounded-lg text-center text-[12px] sm:text-[14px] font-mono font-semibold transition-all cursor-pointer block ${
                    isSelected
                      ? 'theme-bg-accent theme-accent-text font-bold border border-[var(--accent-main)]/30 shadow-xs'
                      : 'hover:bg-[var(--accent-main)]/15 hover:theme-accent theme-text-primary border border-transparent'
                  }`}
                >
                  {optLabel}
                </button>
              );
            }

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelect(opt)}
                className={`w-full px-3 py-2 rounded-xl text-left text-xs transition-colors flex items-center justify-between cursor-pointer group/item ${
                  isSelected
                    ? 'theme-bg-accent theme-accent-text font-bold shadow-xs'
                    : 'hover:bg-[var(--accent-main)]/15 hover:theme-accent theme-text-primary'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 pr-2 flex-1">
                  {/* Checkbox Icon for Multi-Select */}
                  {isMultiple && (
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                        isSelected
                          ? 'theme-bg-accent border-[var(--accent-main)] text-white shadow-xs'
                          : 'theme-bg-sub theme-border'
                      }`}
                    >
                      {isSelected && <SleekCheckIcon className="w-3 h-3 text-white" />}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">{optLabel}</span>
                      {showBadge && typeof opt === 'object' && opt !== null && (opt.typeLabel || opt.badge) && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md font-mono shrink-0 border ${
                            isSelected
                              ? 'theme-bg-surface/80 border-[var(--accent-main)]/30 theme-accent font-semibold'
                              : 'theme-bg-sub theme-text-secondary border-current/10'
                          }`}
                        >
                          {opt.typeLabel || opt.badge}
                        </span>
                      )}
                    </div>
                    {(optDesc || (typeof opt === 'object' && opt !== null && opt.subLabel)) && (
                      <div
                        className={`text-[10px] truncate mt-0.5 ${
                          isSelected ? 'opacity-80' : 'theme-text-secondary'
                        }`}
                      >
                        {optDesc || (opt as SelectOption).subLabel}
                      </div>
                    )}
                  </div>
                </div>
                {!isMultiple && isSelected && <SleekCheckIcon className="w-3.5 h-3.5 shrink-0 ml-1.5" />}
              </button>
            );
          })
        )}
      </PortalDropdownMenu>
    </div>
  );
}
