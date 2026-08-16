import React, { useState, useRef, useEffect } from 'react';
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
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef(null);

  // Determine if popup should open upward or downward
  useEffect(() => {
    if (isOpen && containerRef.current) {
      if (direction === 'up') {
        setOpenUpward(true);
      } else if (direction === 'down') {
        setOpenUpward(false);
      } else {
        const rect = containerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        // If less than 240px space below and more space above, open upward
        if (spaceBelow < 250 && spaceAbove > 200) {
          setOpenUpward(true);
        } else {
          setOpenUpward(false);
        }
      }
    }
  }, [isOpen, direction]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
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

  return (
    <div className="relative w-full text-left font-sans" ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
          {label} {required && <span className="text-rose-400">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full px-4 py-3 rounded-2xl border transition-all duration-200 flex items-center justify-between text-xs font-medium cursor-pointer ${
          disabled
            ? 'opacity-50 cursor-not-allowed theme-bg-sub theme-border theme-text-secondary'
            : isOpen
            ? 'theme-bg-elevated border-[var(--accent-main)] ring-2 ring-[var(--accent-main)]/20 shadow-md'
            : error
            ? 'border-rose-500 theme-bg-sub theme-text-primary'
            : 'theme-bg-sub hover:theme-bg-elevated theme-border hover:border-[var(--accent-main)]/50 theme-text-primary'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 truncate">
          {Icon && (
            <Icon className="w-4 h-4 shrink-0 text-sky-400" />
          )}
          {selectedLabel ? (
            <span className="truncate theme-text-primary font-bold text-xs">
              {selectedLabel}
            </span>
          ) : (
            <span className="truncate theme-text-secondary opacity-60">
              {placeholder}
            </span>
          )}
        </div>

        <div className="shrink-0 ml-2">
          <svg
            className={`w-4 h-4 theme-text-secondary transition-transform duration-200 ${
              isOpen ? (openUpward ? 'rotate-0' : 'rotate-180') : 'rotate-0'
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {error && <p className="mt-1 text-[11px] text-rose-400 font-medium">{error}</p>}

      {/* Dropdown Menu Popup with Auto Upward/Downward Orientation */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 z-[100] rounded-2xl theme-bg-elevated border theme-border shadow-2xl overflow-hidden animate-fade-in ${
            openUpward ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          {/* Search Box if Searchable or options > 6 */}
          {(searchable || options.length > 6) && (
            <div className="p-2 border-b theme-border theme-bg-sub/60">
              <div className="relative">
                <SearchIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 theme-text-secondary" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search options..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl theme-bg-app border theme-border text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]"
                />
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto p-1.5 space-y-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-3 text-center text-xs theme-text-secondary">
                No matching options found
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const optVal = typeof opt === 'string' ? opt : opt.value ?? opt.id;
                const optLabel = typeof opt === 'string' ? opt : opt.label || opt.name;
                const optDesc = typeof opt === 'object' ? opt.description || opt.desc : null;
                const isSelected = optVal === value;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-left text-xs transition-colors flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'theme-bg-accent theme-accent-text font-bold shadow-xs'
                        : 'hover:theme-bg-sub theme-text-primary'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="truncate">{optLabel}</div>
                      {optDesc && (
                        <div className={`text-[10px] truncate ${isSelected ? 'opacity-80' : 'theme-text-secondary'}`}>
                          {optDesc}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <SleekCheckIcon className="w-3.5 h-3.5 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}