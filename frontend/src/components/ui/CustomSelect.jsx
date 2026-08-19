import React, { useState, useRef, useEffect } from 'react';
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

  const filteredOptions = options.filter((opt) => {
    const labelText = typeof opt === 'string' ? opt : opt.label || opt.name || '';
    return labelText.toLowerCase().includes(search.toLowerCase());
  });

  const selectedOption = options.find((opt) => {
    if (typeof opt === 'string') return opt === value;
    return opt.value === value || opt.id === value;
  });

  const selectedLabel = selectedOption
    ? typeof selectedOption === 'string'
      ? selectedOption
      : selectedOption.label || selectedOption.name
    : '';

  const handleSelect = (opt) => {
    const val = typeof opt === 'string' ? opt : opt.value ?? opt.id;
    onChange(val);
    setIsOpen(false);
    setSearch('');
  };

  const sizeClasses =
    size === 'sm'
      ? 'px-3 py-1.5 min-h-[38px] h-[38px] rounded-xl text-xs'
      : size === 'lg'
      ? 'px-4 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm'
      : 'px-3.5 py-2 min-h-[40px] h-10 rounded-xl text-xs sm:text-sm';

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
            {/* Search Box */}
            {!compactMode && (searchable || options.length > 6) && (
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
                maxHeight: `${Math.max(80, coords.maxHeight - (!compactMode && (searchable || options.length > 6) ? 55 : 10))}px`,
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
                  const isSelected = String(optVal) === String(value);

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
                      <div className="min-w-0 pr-2">
                        <div className="truncate">{optLabel}</div>
                        {optDesc && (
                          <div
                            className={`text-[10px] truncate ${
                              isSelected ? 'opacity-80' : 'theme-text-secondary'
                            }`}
                          >
                            {optDesc}
                          </div>
                        )}
                      </div>
                      {isSelected && <SleekCheckIcon className="w-3.5 h-3.5 shrink-0" />}
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
          <div className="flex items-center gap-2 min-w-0 truncate">
            {Icon && <Icon className="w-3.5 h-3.5 shrink-0 theme-accent" />}
            {selectedLabel ? (
              <span className="truncate theme-text-primary font-medium">{selectedLabel}</span>
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