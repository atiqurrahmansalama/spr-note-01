import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { TimerIcon, SleekCheckIcon } from './Icons';

/**
 * Parses a 24-hour time string ("08:00", "14:30:00") into 12-hour components.
 */
function parse24To12(timeStr) {
  if (!timeStr) {
    return { hour12: 8, minute: 0, period: 'AM' };
  }
  const parts = String(timeStr).split(':');
  let h = parseInt(parts[0], 10);
  let m = parseInt(parts[1], 10);
  if (isNaN(h)) h = 8;
  if (isNaN(m)) m = 0;

  const period = h >= 12 ? 'PM' : 'AM';
  let hour12 = h % 12;
  if (hour12 === 0) hour12 = 12;

  return { hour12, minute: m, period };
}

/**
 * Converts 12-hour components back into a standard "HH:MM" 24-hour string.
 */
function format12To24(hour12, minute, period) {
  let h = parseInt(hour12, 10);
  let m = parseInt(minute, 10);
  if (isNaN(h)) h = 8;
  if (isNaN(m)) m = 0;

  if (period === 'PM' && h < 12) {
    h += 12;
  } else if (period === 'AM' && h === 12) {
    h = 0;
  }

  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Formats a 24-hour time string into a user-friendly 12-hour string (e.g. "08:45 AM").
 */
export function formatDisplayTime(timeStr) {
  if (!timeStr) return '';
  const { hour12, minute, period } = parse24To12(timeStr);
  const hh = String(hour12).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  return `${hh}:${mm} ${period}`;
}

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5); // 0, 5, 10, 15... 55

export default function CustomTimePicker({
  value,
  onChange,
  label,
  placeholder = 'Select Time...',
  required = false,
  disabled = false,
  error,
  size = 'md', // 'sm' | 'md' | 'lg'
  direction = 'auto', // 'auto' | 'up' | 'down'
  id,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const popoverRef = useRef(null);
  const selectedHourRef = useRef(null);
  const selectedMinuteRef = useRef(null);

  const parsed = parse24To12(value);
  const [draftHour, setDraftHour] = useState(parsed.hour12);
  const [draftMinute, setDraftMinute] = useState(parsed.minute);
  const [draftPeriod, setDraftPeriod] = useState(parsed.period);

  const [coords, setCoords] = useState({
    top: 0,
    left: 0,
    width: 220,
    openUpward: false,
  });

  // Sync draft state whenever value changes or popover opens
  useEffect(() => {
    const p = parse24To12(value);
    setDraftHour(p.hour12);
    setDraftMinute(p.minute);
    setDraftPeriod(p.period);
  }, [value, isOpen]);

  // Auto-scroll selected hour & minute to center when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        selectedHourRef.current?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
        selectedMinuteRef.current?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
      }, 50);
    }
  }, [isOpen]);

  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const popoverHeight = 220;

    let shouldOpenUpward = false;
    if (direction === 'up') {
      shouldOpenUpward = true;
    } else if (direction === 'down') {
      shouldOpenUpward = false;
    } else {
      shouldOpenUpward = spaceBelow < popoverHeight && spaceAbove > spaceBelow;
    }

    const popoverWidth = Math.min(230, Math.max(200, rect.width));
    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - popoverWidth - 12);
    }

    setCoords({
      left,
      width: popoverWidth,
      top: shouldOpenUpward ? rect.top - 6 : rect.bottom + 6,
      openUpward: shouldOpenUpward,
    });
  }, [direction]);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleScroll = (e) => {
        if (popoverRef.current && popoverRef.current.contains(e.target)) return;
        updatePosition();
      };
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen, updatePosition]);

  // Handle outside click & escape key
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleHourSelect = (h) => {
    setDraftHour(h);
    onChange?.(format12To24(h, draftMinute, draftPeriod));
  };

  const handleMinuteSelect = (m) => {
    setDraftMinute(m);
    onChange?.(format12To24(draftHour, m, draftPeriod));
  };

  const handlePeriodSelect = (p) => {
    setDraftPeriod(p);
    onChange?.(format12To24(draftHour, draftMinute, p));
  };

  const handleSetNow = () => {
    const now = new Date();
    const h24 = now.getHours();
    const m = Math.round(now.getMinutes() / 5) * 5 % 60;
    const time24 = `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    const p = parse24To12(time24);
    setDraftHour(p.hour12);
    setDraftMinute(p.minute);
    setDraftPeriod(p.period);
    onChange?.(time24);
    setIsOpen(false);
  };

  const displayString = value ? formatDisplayTime(value) : '';

  const sizeClasses =
    size === 'sm'
      ? 'px-3 py-1.5 min-h-[38px] h-[38px] text-xs'
      : size === 'lg'
      ? 'px-4 py-2.5 min-h-[44px] text-sm'
      : 'px-3.5 py-2.5 min-h-[40px] text-xs font-medium';

  const popoverMenu =
    isOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              left: `${coords.left}px`,
              top: coords.openUpward ? 'auto' : `${coords.top}px`,
              bottom: coords.openUpward ? `${window.innerHeight - coords.top}px` : 'auto',
              width: `${coords.width}px`,
              zIndex: 999999,
            }}
            className="theme-bg-surface border theme-border shadow-2xl rounded-2xl p-2.5 space-y-2 animate-fade-in font-sans select-none overflow-hidden"
          >
            {/* Header: Compact Digital Preview & AM/PM Switcher */}
            <div className="flex items-center justify-between p-1.5 rounded-xl theme-bg-sub border theme-border">
              <div className="flex items-center gap-1 font-mono font-bold text-sm theme-text-primary px-1">
                <span className="theme-accent">{String(draftHour).padStart(2, '0')}</span>
                <span className="theme-text-secondary opacity-60">:</span>
                <span className="theme-accent">{String(draftMinute).padStart(2, '0')}</span>
              </div>

              {/* AM / PM Segment */}
              <div className="flex items-center p-0.5 rounded-lg theme-bg-elevated border theme-border">
                <button
                  type="button"
                  onClick={() => handlePeriodSelect('AM')}
                  className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                    draftPeriod === 'AM'
                      ? 'theme-bg-accent theme-accent-text shadow-xs'
                      : 'theme-text-secondary hover:theme-text-primary'
                  }`}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => handlePeriodSelect('PM')}
                  className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                    draftPeriod === 'PM'
                      ? 'theme-bg-accent theme-accent-text shadow-xs'
                      : 'theme-text-secondary hover:theme-text-primary'
                  }`}
                >
                  PM
                </button>
              </div>
            </div>

            {/* Compact Scrollable Columns */}
            <div className="grid grid-cols-2 gap-1.5 text-center">
              {/* Hours Column */}
              <div className="space-y-0.5">
                <div className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary pb-0.5">
                  Hr
                </div>
                <div className="h-36 overflow-y-auto scrollbar-thin p-1 rounded-xl theme-bg-sub border theme-border space-y-0.5">
                  {HOURS.map((h) => {
                    const isSelected = draftHour === h;
                    return (
                      <button
                        key={h}
                        ref={isSelected ? selectedHourRef : null}
                        type="button"
                        onClick={() => handleHourSelect(h)}
                        className={`w-full py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer block text-center ${
                          isSelected
                            ? 'theme-bg-accent theme-accent-text font-bold shadow-xs'
                            : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated'
                        }`}
                      >
                        {String(h).padStart(2, '0')}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Minutes Column */}
              <div className="space-y-0.5">
                <div className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary pb-0.5">
                  Min
                </div>
                <div className="h-36 overflow-y-auto scrollbar-thin p-1 rounded-xl theme-bg-sub border theme-border space-y-0.5">
                  {MINUTES.map((m) => {
                    const isSelected = Math.abs(draftMinute - m) < 3 || draftMinute === m;
                    return (
                      <button
                        key={m}
                        ref={isSelected ? selectedMinuteRef : null}
                        type="button"
                        onClick={() => handleMinuteSelect(m)}
                        className={`w-full py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer block text-center ${
                          isSelected
                            ? 'theme-bg-accent theme-accent-text font-bold shadow-xs'
                            : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated'
                        }`}
                      >
                        {String(m).padStart(2, '0')}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Compact Footer */}
            <div className="pt-1.5 border-t theme-border flex items-center justify-between gap-1.5">
              <button
                type="button"
                onClick={handleSetNow}
                className="px-2 py-1 rounded-lg theme-bg-sub border theme-border text-[10px] font-bold theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition cursor-pointer"
              >
                Now
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1 rounded-lg text-[11px] font-bold theme-bg-accent theme-accent-text hover:opacity-95 shadow-xs transition cursor-pointer flex items-center gap-1"
              >
                <SleekCheckIcon className="w-3 h-3" />
                <span>Done</span>
              </button>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className={`relative w-full text-left font-sans ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5">
          {label} {required && <span className="text-rose-400 font-bold">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full ${sizeClasses} rounded-xl border transition-all duration-150 flex items-center justify-between font-mono cursor-pointer select-none ${
          disabled
            ? 'opacity-50 cursor-not-allowed theme-bg-sub theme-border theme-text-secondary'
            : isOpen
            ? 'theme-bg-elevated border-[var(--accent-main)]/70 ring-2 ring-[var(--accent-main)]/15 shadow-xs'
            : error
            ? 'border-rose-500 theme-bg-sub theme-text-primary'
            : 'theme-bg-sub hover:theme-bg-elevated/70 theme-border hover:border-[var(--accent-main)]/40 theme-text-primary'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 truncate">
          <TimerIcon className="w-4 h-4 shrink-0 theme-accent" />
          {displayString ? (
            <span className="truncate theme-text-primary font-bold text-xs sm:text-sm">
              {displayString}
            </span>
          ) : (
            <span className="truncate theme-text-secondary opacity-50 font-sans text-xs">
              {placeholder}
            </span>
          )}
        </div>

        <div className="shrink-0 ml-1.5 flex items-center gap-1.5">
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md theme-bg-elevated theme-text-secondary border theme-border">
            {parsed.period}
          </span>
          <svg
            className={`w-3.5 h-3.5 theme-text-secondary transition-transform duration-200 ${
              isOpen ? (coords.openUpward ? 'rotate-0' : 'rotate-180') : 'rotate-0'
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {error && <p className="mt-1 text-[11px] text-rose-400 font-medium">{error}</p>}

      {/* Render Portal Popover */}
      {popoverMenu}
    </div>
  );
}
