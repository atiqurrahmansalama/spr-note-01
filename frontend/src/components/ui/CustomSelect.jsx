import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SleekCheckIcon, SearchIcon } from './Icons';

export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select an option...',
  label,
  error,
  required = false,
  searchable = false,
  disabled = false,
  direction = 'auto', // 'auto', 'up', 'down'
  icon: Icon,
  size = 'md', // 'sm' | 'md' | 'lg'
  compactMode = false, // compact mode for small juz-style dropdowns
  showDescription = false, // defaults to false to keep dropdown items clean and concise
  multiple = false,
  isMulti = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [coords, setCoords] = useState({
    top: 0,
    left: 0,
    width: 0,
    openUpward: false,
    maxHeight: 240,
  });

  const containerRef = useRef(null);
  const dropdownRef = useRef(null);

  // Recalculate popup position accurately
  const updatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const minRequiredSpace = compactMode ? 100 : 200;

    let shouldOpenUpward = false;
    if (direction === 'up') {
      shouldOpenUpward = true;
    } else if (direction === 'down') {
      shouldOpenUpward = false;
    } else {
      shouldOpenUpward = spaceBelow < minRequiredSpace && spaceAbove > spaceBelow;
    }

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
      const handleScroll = (e) => {
        if (dropdownRef.current && dropdownRef.current.contains(e.target)) return;
        updatePosition();
      };
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen, direction, compactMode]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const isMultiple = Boolean(multiple || isMulti);

  const currentValues = useMemo(() => {
    if (!isMultiple) return [];
    if (Array.isArray(value)) return value.map(String);
    if (typeof value === 'string' && value.trim()) {
      return value.split(',').map((s) => s.trim());
    }
    return [];
  }, [value, isMultiple]);

  const filteredOptions = options.filter((opt) => {
    const labelText = typeof opt === 'string' ? opt : opt.label || opt.name || '';
    return labelText.toLowerCase().includes(search.toLowerCase());
  });

  const selectedOption = !isMultiple
    ? options.find((opt) => {
        if (typeof opt === 'string') return opt === value;
        return opt.value === value || opt.id === value;
      })
    : null;

  const selectedLabel = selectedOption
    ? typeof selectedOption === 'string'
      ? selectedOption
      : selectedOption.label || selectedOption.name
    : '';

  const handleSelect = (opt) => {
    const val = typeof opt === 'string' ? opt : opt.value ?? opt.id;
    if (isMultiple) {
      let nextValues;
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

  const sizeClasses =
    size === 'sm'
      ? 'px-3 py-1.5 min-h-[38px] rounded-xl text-xs'
      : size === 'lg'
      ? 'px-4 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm'
      : 'px-3.5 py-2 min-h-[40px] rounded-xl text-xs sm:text-sm';

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
            className={`theme-bg-surface border theme-border shadow-2xl overflow-hidden animate-fade-in ${
              compactMode ? 'rounded-xl p-1' : 'rounded-2xl p-1.5'
            }`}
          >
            {/* Search Box (Only when searchable is true) */}
            {!compactMode && searchable && (
              <div className="p-2 border-b theme-border theme-bg-sub/60">
                <div className="relative">
                  <SearchIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 theme-text-secondary" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Search options..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl theme-bg-sub border theme-border text-xs theme-text-primary focus:outline-none focus:border-current"
                  />
                </div>
              </div>
            )}

            {/* Options List */}
            <div
              style={{
                maxHeight: `${Math.max(80, coords.maxHeight - (!compactMode && searchable ? 55 : 10))}px`,
                scrollbarGutter: 'stable',
              }}
              className={`${compactMode ? 'p-0.5 space-y-1' : 'p-1 space-y-0.5'} overflow-y-auto`}
            >
              {filteredOptions.length === 0 ? (
                <div className="px-2 py-2 text-center text-xs theme-text-secondary">
                  No matching options
                </div>
              ) : (
                filteredOptions.map((opt, idx) => {
                  const optVal = typeof opt === 'string' ? opt : opt.value ?? opt.id;
                  const optLabel = typeof opt === 'string' ? opt : opt.label || opt.name;
                  const optDesc =
                    typeof opt === 'object' && showDescription ? opt.description || opt.desc : null;
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
                            ? 'theme-bg-accent-soft theme-accent font-bold border border-[var(--accent-main)]/30 shadow-xs'
                            : 'hover:theme-bg-sub theme-text-primary border border-transparent'
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
                      className={`w-full px-3 py-2 rounded-xl text-left text-xs transition-colors flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'theme-bg-accent-soft theme-accent font-bold shadow-xs'
                          : 'hover:theme-bg-sub/70 theme-text-primary'
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
                            {isSelected && (
                              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            )}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate font-medium">{optLabel}</span>
                            {(opt.typeLabel || opt.badge) && (
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
                          {(optDesc || opt.subLabel) && (
                            <div
                              className={`text-[10px] truncate mt-0.5 ${
                                isSelected ? 'opacity-80' : 'theme-text-secondary'
                              }`}
                            >
                              {optDesc || opt.subLabel}
                            </div>
                          )}
                        </div>
                      </div>
                      {!isMultiple && isSelected && <SleekCheckIcon className="w-3.5 h-3.5 shrink-0 ml-1.5" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div
      className={`relative w-full text-left font-sans ${compactMode ? 'h-full' : ''}`}
      ref={containerRef}
    >
      {label && (
        <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
          {label} {required && <span className="text-rose-400">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      {compactMode ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          className={`w-full h-full theme-bg-sub rounded-lg border overflow-hidden relative flex items-center justify-center cursor-pointer shadow-xs transition-all hover:theme-bg-elevated select-none focus:outline-none ${
            isOpen
              ? 'border-[var(--accent-main)]/60 ring-1 ring-[var(--accent-main)]/20 shadow-xs'
              : 'theme-border hover:border-[var(--accent-main)]/40'
          }`}
        >
          <span className="w-full text-center text-[12px] sm:text-[14px] font-mono font-semibold theme-text-primary select-none pointer-events-none">
            {selectedLabel || placeholder}
          </span>
          <span className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none opacity-30">
            <svg
              className={`w-2.5 h-2.5 theme-text-secondary transition-transform duration-200 ${
                isOpen ? (coords.openUpward ? 'rotate-0' : 'rotate-180') : 'rotate-0'
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </button>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          className={`w-full ${sizeClasses} border transition-all duration-150 flex items-center justify-between font-medium cursor-pointer ${
            disabled
              ? 'opacity-50 cursor-not-allowed theme-bg-sub theme-border theme-text-secondary'
              : isOpen
              ? 'theme-bg-elevated border-[var(--accent-main)]/70 ring-2 ring-[var(--accent-main)]/15 shadow-xs'
              : error
              ? 'border-rose-500 theme-bg-sub theme-text-primary'
              : 'theme-bg-sub hover:theme-bg-elevated/70 theme-border hover:border-current/20 theme-text-primary'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {Icon && <Icon className="w-3.5 h-3.5 shrink-0 theme-accent" />}
            
            {/* Multi-Select Trigger View */}
            {isMultiple ? (
              currentValues.length === 0 ? (
                <span className="truncate theme-text-secondary opacity-60">{placeholder}</span>
              ) : currentValues.includes('ALL') ? (
                (() => {
                  const allOption = options.find((opt) => {
                    const optVal = typeof opt === 'string' ? opt : opt.value ?? opt.id;
                    return String(optVal) === 'ALL';
                  });
                  const allLabel = (typeof allOption === 'object' ? allOption?.label || allOption?.name : allOption) || 'All';
                  return (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md theme-bg-accent theme-accent-text font-mono">
                        ALL
                      </span>
                      <span className="text-xs theme-text-primary truncate">{allLabel}</span>
                    </div>
                  );
                })()
              ) : (
                <div className="flex items-center gap-1 flex-wrap min-w-0 pr-1 py-0.5">
                  {options
                    .filter((opt) => {
                      const optVal = typeof opt === 'string' ? opt : opt.value ?? opt.id;
                      return currentValues.includes(String(optVal));
                    })
                    .map((opt, i) => {
                      const optLabel = typeof opt === 'string' ? opt : opt.label || opt.name;
                      const optBadge = typeof opt === 'object' ? opt.badge || opt.typeLabel : null;
                      return (
                        <span
                          key={i}
                          className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold theme-bg-surface border theme-border theme-text-primary flex items-center gap-1 shrink-0 shadow-2xs"
                        >
                          <span className="truncate max-w-[120px]">{optBadge || optLabel}</span>
                        </span>
                      );
                    })}
                </div>
              )
            ) : selectedLabel ? (
              <div className="flex items-center justify-between gap-2 w-full min-w-0 pr-1">
                <span className="truncate theme-text-primary font-medium">{selectedLabel}</span>
                {(selectedOption?.typeLabel || selectedOption?.badge) && (
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
            <svg
              className={`w-3.5 h-3.5 theme-text-secondary transition-transform duration-200 ${
                isOpen ? (coords.openUpward ? 'rotate-0' : 'rotate-180') : 'rotate-0'
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>
      )}

      {error && <p className="mt-1 text-[11px] text-rose-400 font-medium">{error}</p>}

      {/* Render Portal Dropdown Menu */}
      {dropdownMenu}
    </div>
  );
}