import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  EVENT_COLORS,
  resolveCanonicalEventColor,
} from '../constants/eventColors';
import { useCalendarTranslation } from '../locales';
import { ChevronIcon, CheckIcon } from '@/components/ui/Icons';

const COLOR_GROUPS = [
  'Emerald & Nature',
  'Ocean & Sky',
  'Purple & Royal',
  'Rose & Coral',
  'Amber & Earth',
] as const;

export interface EventColorPickerDropdownProps {
  value?: string;
  onChange: (colorId: string) => void;
  label?: string;
  className?: string;
  align?: 'left' | 'right';
}

export function EventColorPickerDropdown({
  value,
  onChange,
  label,
  className = '',
  align = 'left',
}: EventColorPickerDropdownProps) {
  const { t } = useCalendarTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const canonicalId = resolveCanonicalEventColor(value, EVENT_COLORS[0].id);
  const selectedColor = useMemo(() => {
    return EVENT_COLORS.find((c) => c.id === canonicalId) || EVENT_COLORS[0];
  }, [canonicalId]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  // Auto-scroll into view when opened so palette is never clipped or hidden at drawer bottom
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const timer = setTimeout(() => {
        containerRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest',
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const displayLabel = label || t('eventColor', 'Event Color');

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs font-bold uppercase tracking-wider theme-text-secondary truncate">
          {displayLabel}
        </label>
      </div>

      {/* Selected Event Color Trigger Card (Exact input height h-[46px] matching CustomInput) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-[46px] flex items-center justify-between px-3.5 py-2.5 rounded-2xl border-0 ring-0 transition cursor-pointer text-left focus:outline-hidden shadow-xs ${
          isOpen
            ? 'bg-[var(--accent-main)]/15 dark:bg-[var(--accent-main)]/25'
            : 'theme-bg-surface hover:theme-bg-elevated/40'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="w-4 h-4 rounded-full shrink-0 shadow-xs border-0"
            style={{ backgroundColor: selectedColor.hex }}
          />
          <span className="text-xs font-semibold theme-text-primary truncate leading-tight">
            {selectedColor.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-1.5">
          <ChevronIcon isOpen={isOpen} className="w-3.5 h-3.5 theme-text-secondary" />
        </div>
      </button>

      {/* Borderless Curated Enterprise Palette Dropdown */}
      {isOpen && (
        <div
          className={`mt-1.5 p-3 rounded-3xl theme-bg-surface border-0 ring-0 shadow-xl animate-fade-in space-y-3 z-40 w-[calc(100vw-3rem)] max-w-xs sm:w-80 absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {/* Grouped by Color Family with Clean Small Section Headers */}
          <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-none pr-0.5">
            {COLOR_GROUPS.map((cat) => {
              const colorsInCat = EVENT_COLORS.filter((c) => c.category === cat);
              return (
                <div key={cat} className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary px-1">
                    {cat}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {colorsInCat.map((col) => {
                      const isSelected = selectedColor.id === col.id;
                      return (
                        <button
                          key={col.id}
                          type="button"
                          onClick={() => {
                            onChange(col.id);
                            setIsOpen(false);
                          }}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-2xl border-0 ring-0 text-left transition cursor-pointer select-none min-w-0 ${
                            isSelected
                              ? 'bg-[var(--accent-main)]/15 dark:bg-[var(--accent-main)]/25 theme-accent font-bold'
                              : 'theme-bg-app hover:theme-bg-elevated/60 theme-text-primary'
                          }`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs border-0"
                            style={{ backgroundColor: col.hex }}
                          />
                          <span className="text-[11px] font-medium truncate leading-tight flex-1 min-w-0">
                            {col.label}
                          </span>
                          {isSelected && (
                            <span className="w-3.5 h-3.5 rounded-full theme-bg-accent theme-accent-text flex items-center justify-center shadow-xs shrink-0 ml-auto">
                              <CheckIcon className="w-2 h-2" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default EventColorPickerDropdown;
