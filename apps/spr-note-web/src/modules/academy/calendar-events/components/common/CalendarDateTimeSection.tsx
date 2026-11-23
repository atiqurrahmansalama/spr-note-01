/**
 * Calendar Date & Timing Reusable Section Component
 * ===================================================
 * Canonical Date & Timing block reused across all 4 calendar/productivity workflows:
 * 1. Add Academic Event
 * 2. Add Working Schedule
 * 3. Assign Official Duty
 * 4. Create Personal Task
 *
 * Design & Standards:
 * - Adheres to Rule 14 (Borderless soft surfaces, zero boxed cards, rounded-3xl / rounded-2xl).
 * - Adheres to Rule 5 & 17 (Container responsiveness with @container and @[480px]:grid-cols-2).
 * - Zero hardcoded colors, zero emojis (RULE 1 & user_rules).
 * - Multi-language localization support via useCalendarTranslation.
 */

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ReusableCalendar from '@/components/common/ReusableCalendar';
import CustomSelect from '@/components/ui/CustomSelect';
import CustomButton from '@/components/ui/CustomButton';
import { DrawerSection } from '@/components/layout';
import {
  CalendarIcon,
  ChevronIcon,
  CheckIcon,
  ClockIcon,
} from '@/components/ui/Icons';
import { useCalendarTranslation } from '../../locales';

export interface InlineTimePickerProps {
  value?: string;
  onChange: (time: string) => void;
  label?: string;
  placeholder?: string;
}

export function formatTime12(timeStr?: string): string {
  if (!timeStr) return '';
  const parts = String(timeStr).split(':');
  let h = parseInt(parts[0], 10);
  const m = String(parts[1] || '00').padStart(2, '0');
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m}${ampm}`;
}

export function InlineTimePicker({
  value,
  onChange,
  label,
  placeholder = 'Choose Time',
}: InlineTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const hoursScrollRef = useRef<HTMLDivElement>(null);
  const minutesScrollRef = useRef<HTMLDivElement>(null);
  const selectedHourRef = useRef<HTMLButtonElement>(null);
  const selectedMinuteRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  const parsed = useMemo(() => {
    if (!value) return { hour: 9, minute: 0, period: 'am' };
    const [hStr, mStr] = String(value).split(':');
    const h = parseInt(hStr, 10) || 0;
    const m = parseInt(mStr, 10) || 0;
    const period = h >= 12 ? 'pm' : 'am';
    let hour = h % 12;
    if (hour === 0) hour = 12;
    return { hour, minute: m, period };
  }, [value]);

  const [selHour, setSelHour] = useState(parsed.hour);
  const [selMinute, setSelMinute] = useState(parsed.minute);
  const [selPeriod, setSelPeriod] = useState(parsed.period);

  useEffect(() => {
    setSelHour(parsed.hour);
    setSelMinute(parsed.minute);
    setSelPeriod(parsed.period);
  }, [parsed]);

  // Viewport-safe position calculator: never overflows left or right of window
  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const popoverWidth = 230;
    const popoverHeight = 250;

    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 12) {
      left = window.innerWidth - popoverWidth - 12;
    }
    if (left < 12) left = 12;

    let top = rect.bottom + 6;
    if (top + popoverHeight > window.innerHeight - 12) {
      top = Math.max(12, rect.top - popoverHeight - 6);
    }

    setCoords({ top, left });
  }, []);

  const hoursList = useMemo(() => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], []);
  const minutesList = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);

  // 3x repeating sets for infinite cyclic scrolling
  const repeatedHours = useMemo(() => [...hoursList, ...hoursList, ...hoursList], [hoursList]);
  const repeatedMinutes = useMemo(() => [...minutesList, ...minutesList, ...minutesList], [minutesList]);

  // Center middle set on open
  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleScrollOrResize = () => updatePosition();
      window.addEventListener('resize', handleScrollOrResize);
      window.addEventListener('scroll', handleScrollOrResize, true);

      setTimeout(() => {
        const hEl = hoursScrollRef.current;
        if (hEl) {
          const singleSetHeight = hEl.scrollHeight / 3;
          const targetIndex = hoursList.indexOf(selHour);
          const itemHeight = singleSetHeight / 12;
          hEl.scrollTop = singleSetHeight + targetIndex * itemHeight - hEl.clientHeight / 2 + itemHeight / 2;
        }
        const mEl = minutesScrollRef.current;
        if (mEl) {
          const singleSetHeight = mEl.scrollHeight / 3;
          const targetIndex = minutesList.indexOf(selMinute);
          const itemHeight = singleSetHeight / 60;
          mEl.scrollTop = singleSetHeight + targetIndex * itemHeight - mEl.clientHeight / 2 + itemHeight / 2;
        }
      }, 50);

      return () => {
        window.removeEventListener('resize', handleScrollOrResize);
        window.removeEventListener('scroll', handleScrollOrResize, true);
      };
    }
  }, [isOpen, updatePosition, selHour, selMinute, hoursList, minutesList]);

  // Infinite cyclic scroll handlers
  const handleHoursScroll = () => {
    const el = hoursScrollRef.current;
    if (!el) return;
    const singleSetHeight = el.scrollHeight / 3;
    if (el.scrollTop < singleSetHeight * 0.25) {
      el.scrollTop += singleSetHeight;
    } else if (el.scrollTop > singleSetHeight * 1.75) {
      el.scrollTop -= singleSetHeight;
    }
  };

  const handleMinutesScroll = () => {
    const el = minutesScrollRef.current;
    if (!el) return;
    const singleSetHeight = el.scrollHeight / 3;
    if (el.scrollTop < singleSetHeight * 0.25) {
      el.scrollTop += singleSetHeight;
    } else if (el.scrollTop > singleSetHeight * 1.75) {
      el.scrollTop -= singleSetHeight;
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const commitTime = (h: number, m: number, p: string) => {
    let hour24 = h % 12;
    if (p === 'pm') hour24 += 12;
    const hh = String(hour24).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    onChange(`${hh}:${mm}`);
  };

  return (
    <div ref={containerRef} className="relative flex-1">
      {label && (
        <label className="block text-xs font-bold uppercase tracking-wider theme-text-secondary mb-2">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full h-[46px] min-h-[46px] flex items-center justify-between px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-2xl border-0 theme-bg-surface hover:theme-bg-elevated/50 transition focus:outline-none cursor-pointer shadow-xs"
      >
        <div className="flex items-center gap-2 min-w-0">
          <ClockIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
          <span className="font-semibold font-mono theme-text-primary text-xs sm:text-sm">
            {value ? formatTime12(value) : placeholder}
          </span>
        </div>
        <ChevronIcon
          className={`w-3.5 h-3.5 theme-text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && coords && typeof document !== 'undefined' && createPortal(
        <div
          ref={popoverRef}
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            zIndex: 99999,
            width: 230,
          }}
          className="p-2.5 rounded-2xl theme-bg-surface border-0 shadow-2xl animate-fade-in flex flex-col gap-1.5 select-none"
        >
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider theme-text-secondary px-1 pb-1 border-b theme-border">
            <span className="flex-1 text-center">Hour</span>
            <span className="flex-1 text-center">Min</span>
            <span className="w-12 text-center">Period</span>
          </div>
          <div className="flex gap-1.5 h-44">
            {/* Hours Column (Infinite Cyclic Scroll) */}
            <div
              ref={hoursScrollRef}
              onScroll={handleHoursScroll}
              className="flex-1 overflow-y-auto scrollbar-none space-y-0.5"
            >
              {repeatedHours.map((h, idx) => {
                const isSel = selHour === h;
                return (
                  <button
                    key={`hr-${h}-${idx}`}
                    ref={isSel && idx >= 12 && idx < 24 ? selectedHourRef : null}
                    type="button"
                    onClick={() => {
                      setSelHour(h);
                      commitTime(h, selMinute, selPeriod);
                    }}
                    className={`w-full py-1 text-xs rounded-xl font-mono transition text-center cursor-pointer border-0 ${
                      isSel
                        ? 'theme-bg-accent theme-accent-text font-bold shadow-xs'
                        : 'hover:theme-bg-elevated theme-text-primary'
                    }`}
                  >
                    {String(h).padStart(2, '0')}
                  </button>
                );
              })}
            </div>

            {/* Minutes Column (Infinite Cyclic Scroll) */}
            <div
              ref={minutesScrollRef}
              onScroll={handleMinutesScroll}
              className="flex-1 overflow-y-auto scrollbar-none px-0.5 space-y-0.5 border-0"
            >
              {repeatedMinutes.map((m, idx) => {
                const isSel = selMinute === m;
                return (
                  <button
                    key={`min-${m}-${idx}`}
                    ref={isSel && idx >= 60 && idx < 120 ? selectedMinuteRef : null}
                    type="button"
                    onClick={() => {
                      setSelMinute(m);
                      commitTime(selHour, m, selPeriod);
                    }}
                    className={`w-full py-1 text-xs rounded-xl font-mono transition text-center cursor-pointer border-0 ${
                      isSel
                        ? 'theme-bg-accent theme-accent-text font-bold shadow-xs'
                        : 'hover:theme-bg-elevated theme-text-primary'
                    }`}
                  >
                    {String(m).padStart(2, '0')}
                  </button>
                );
              })}
            </div>

            {/* AM/PM Column */}
            <div className="w-12 flex flex-col justify-center space-y-1">
              {['am', 'pm'].map((p) => {
                const isSel = selPeriod === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setSelPeriod(p);
                      commitTime(selHour, selMinute, p);
                    }}
                    className={`w-full py-2 text-xs rounded-xl font-bold uppercase transition text-center cursor-pointer border-0 ${
                      isSel
                        ? 'theme-bg-accent theme-accent-text shadow-xs'
                        : 'theme-bg-tile hover:theme-bg-elevated theme-text-primary'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="pt-1.5 border-t theme-border flex items-center justify-between text-xs">
            <span className="font-mono text-[11px] font-bold theme-text-primary">
              {formatTime12(value)}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2.5 py-0.5 rounded-lg text-[11px] font-semibold theme-bg-elevated hover:theme-bg-elevated/80 theme-text-primary cursor-pointer border-0"
            >
              Done
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export interface UntilWhenPickerProps {
  until?: 'ONGOING' | 'DATE' | string;
  untilDate?: string;
  startDate?: string;
  onChangeUntil: (until: 'ONGOING' | 'DATE' | string) => void;
  onChangeUntilDate: (date: string) => void;
}

export function UntilWhenPicker({
  until = 'ONGOING',
  untilDate = '',
  startDate = '',
  onChangeUntil,
  onChangeUntilDate,
}: UntilWhenPickerProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useCalendarTranslation();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
        setIsCalendarOpen(false);
      }
    };
    if (isMenuOpen || isCalendarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen, isCalendarOpen]);

  const handleSelectOngoing = () => {
    onChangeUntil('ONGOING');
    onChangeUntilDate('');
    setIsMenuOpen(false);
    setIsCalendarOpen(false);
  };

  const handleSelectSpecificDate = () => {
    onChangeUntil('DATE');
    if (!untilDate) {
      onChangeUntilDate(startDate || new Date().toISOString().split('T')[0]);
    }
    setIsMenuOpen(false);
    setIsCalendarOpen(true);
  };

  const handleToggle = () => {
    if (until === 'DATE') {
      setIsCalendarOpen((prev) => !prev);
      setIsMenuOpen(false);
    } else {
      setIsMenuOpen((prev) => !prev);
      setIsCalendarOpen(false);
    }
  };

  const formatDateDisplay = (dStr?: string) => {
    if (!dStr) return '';
    const [y, m, d] = String(dStr).split('-');
    return `${d}/${m}/${y ? y.slice(2) : ''}`;
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-xs font-bold uppercase tracking-wider theme-text-secondary truncate">
          {t('untilWhen', 'Until when?')}
        </label>
        {until === 'DATE' && (
          <button
            type="button"
            onClick={handleSelectOngoing}
            className="text-[10px] theme-accent hover:underline font-semibold cursor-pointer uppercase tracking-wider"
            title={t('resetToOngoing', 'Reset to Ongoing')}
          >
            {t('resetToOngoing', 'Reset to Ongoing')}
          </button>
        )}
      </div>

      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        className="w-full min-h-[46px] flex items-center justify-between px-3.5 py-2.5 rounded-2xl theme-bg-surface border-0 theme-text-primary text-xs sm:text-sm font-semibold hover:theme-bg-elevated/40 focus:outline-none transition-all duration-200 cursor-pointer select-none shadow-xs"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {until === 'DATE' ? (
            <>
              <CalendarIcon className="w-4 h-4 theme-accent shrink-0" />
              <span className="truncate font-medium">
                {untilDate ? formatDateDisplay(untilDate) : t('specifyDate', 'Specify date')}
              </span>
            </>
          ) : (
            <span className="truncate font-medium">{t('ongoing', 'Ongoing')}</span>
          )}
        </div>
        <ChevronIcon isOpen={isMenuOpen || isCalendarOpen} className="w-3.5 h-3.5 theme-text-secondary shrink-0 ml-1" />
      </button>

      {/* Menu Dropdown when choosing between Ongoing and Specific Date */}
      {isMenuOpen && (
        <div className="absolute z-50 right-0 left-0 mt-1.5 p-1.5 theme-bg-surface border-0 rounded-2xl shadow-xl space-y-1 animate-fade-in select-none">
          <button
            type="button"
            onClick={handleSelectOngoing}
            className={`w-full text-left px-3 py-2 text-xs rounded-xl transition flex items-center justify-between cursor-pointer border-0 ${
              until === 'ONGOING'
                ? 'bg-[var(--accent-main)]/15 dark:bg-[var(--accent-main)]/25 theme-accent font-bold'
                : 'theme-bg-app hover:theme-bg-elevated/40 theme-text-primary'
            }`}
          >
            <span>{t('ongoing', 'Ongoing')}</span>
            {until === 'ONGOING' && (
              <span className="w-4 h-4 rounded-full theme-bg-accent theme-accent-text flex items-center justify-center shadow-xs shrink-0">
                <CheckIcon className="w-2.5 h-2.5" />
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={handleSelectSpecificDate}
            className={`w-full text-left px-3 py-2 text-xs rounded-xl transition flex items-center justify-between cursor-pointer border-0 ${
              until === 'DATE'
                ? 'bg-[var(--accent-main)]/15 dark:bg-[var(--accent-main)]/25 theme-accent font-bold'
                : 'theme-bg-app hover:theme-bg-elevated/40 theme-text-primary'
            }`}
          >
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-3.5 h-3.5 theme-accent" />
              <span>{t('specifyDate', 'Specify date')}</span>
            </div>
            {until === 'DATE' && (
              <span className="w-4 h-4 rounded-full theme-bg-accent theme-accent-text flex items-center justify-center shadow-xs shrink-0">
                <CheckIcon className="w-2.5 h-2.5" />
              </span>
            )}
          </button>
        </div>
      )}

      {/* Calendar Picker Popup (Directly below Until when?) */}
      {isCalendarOpen && (
        <div className="absolute z-50 right-0 mt-1.5 w-72 p-4 theme-bg-surface border-0 rounded-2xl shadow-xl space-y-3 animate-fade-in select-none">
          <ReusableCalendar
            isInline={true}
            selectedDate={untilDate || startDate || new Date().toISOString().split('T')[0]}
            minDate={startDate}
            onSelectDate={(newDate) => {
              onChangeUntil('DATE');
              onChangeUntilDate(newDate);
              setIsCalendarOpen(false);
            }}
          />
          <div className="pt-2 border-0 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={handleSelectOngoing}
              className="text-xs font-semibold theme-text-secondary hover:theme-text-primary cursor-pointer"
            >
              {t('resetToOngoing', 'Reset to Ongoing')}
            </button>
            <CustomButton
              type="button"
              variant="primary"
              size="xs"
              onClick={() => setIsCalendarOpen(false)}
            >
              {t('done', 'Done')}
            </CustomButton>
          </div>
        </div>
      )}
    </div>
  );
}

const FREQUENCY_OPTIONS = [
  { value: 'WEEKLY', label: 'Every Week' },
  { value: 'BIWEEKLY', label: 'Every 2 Weeks' },
  { value: 'MONTHLY', label: 'Every Month' },
  { value: 'YEARLY', label: 'Annually (Every Year)' },
];

const WEEKDAY_INITIALS = [
  { day: 0, label: 'S', name: 'Sunday' },
  { day: 1, label: 'M', name: 'Monday' },
  { day: 2, label: 'T', name: 'Tuesday' },
  { day: 3, label: 'W', name: 'Wednesday' },
  { day: 4, label: 'T', name: 'Thursday' },
  { day: 5, label: 'F', name: 'Friday' },
  { day: 6, label: 'S', name: 'Saturday' },
];

export interface CalendarDateTimeSectionProps {
  startDate: string;
  endDate?: string;
  until?: 'ONGOING' | 'DATE' | string;
  isFullDay?: boolean;
  startTime?: string;
  endTime?: string;
  repeats?: boolean;
  repeatDays?: number[];
  frequency?: string;

  // Visual & Feature Customization Flags
  title?: string;
  dateLabel?: string;
  timeLabel?: string;
  showUntilPicker?: boolean;
  showAllDayToggle?: boolean;
  showTimePickers?: boolean;
  singleTimeMode?: boolean; // When true, displays 1 time picker instead of From/To
  showRecurrence?: boolean;

  // Change Handlers
  onChangeStartDate: (date: string) => void;
  onChangeEndDate?: (date: string) => void;
  onChangeUntil?: (until: 'ONGOING' | 'DATE' | string) => void;
  onChangeIsFullDay?: (isFullDay: boolean) => void;
  onChangeStartTime?: (time: string) => void;
  onChangeEndTime?: (time: string) => void;
  onChangeRepeats?: (repeats: boolean) => void;
  onChangeRepeatDays?: (days: number[]) => void;
  onChangeFrequency?: (frequency: string) => void;

  validationErrors?: {
    startDate?: string;
    startTime?: string;
    endTime?: string;
  };
}

export function CalendarDateTimeSection({
  startDate,
  endDate,
  until = 'ONGOING',
  isFullDay = false,
  startTime = '09:00',
  endTime = '17:00',
  repeats = false,
  repeatDays = [0, 1, 2, 3, 4],
  frequency = 'WEEKLY',

  title,
  dateLabel,
  timeLabel,
  showUntilPicker = true,
  showAllDayToggle = true,
  showTimePickers = true,
  singleTimeMode = false,
  showRecurrence = false,

  onChangeStartDate,
  onChangeEndDate,
  onChangeUntil,
  onChangeIsFullDay,
  onChangeStartTime,
  onChangeEndTime,
  onChangeRepeats,
  onChangeRepeatDays,
  onChangeFrequency,

  validationErrors = {},
}: CalendarDateTimeSectionProps) {
  const { t } = useCalendarTranslation();

  const toggleRepeatDay = (day: number) => {
    if (!onChangeRepeatDays) return;
    const currentDays = repeatDays || [];
    if (currentDays.includes(day)) {
      if (currentDays.length > 1) {
        onChangeRepeatDays(currentDays.filter((d) => d !== day));
      }
    } else {
      onChangeRepeatDays([...currentDays, day].sort((a, b) => a - b));
    }
  };

  return (
    <DrawerSection
      title={title || t('dateAndTiming', 'Date & Timing')}
      icon={ClockIcon}
      variant="streamlined"
    >
      {/* 1. Date Selection Row */}
      <div>
        <ReusableCalendar
          label={dateLabel || t('dateLabel', 'Date')}
          selectedDate={startDate}
          onSelectDate={(newDate) => {
            onChangeStartDate(newDate);
          }}
        />
        {validationErrors.startDate && (
          <p className="text-[11px] font-medium theme-danger mt-1">{validationErrors.startDate}</p>
        )}
      </div>

      {/* 2. Until when? & All day Row (Strictly 2 columns on all screen sizes when UntilPicker is enabled) */}
      {showUntilPicker ? (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 items-end">
          <div className="min-w-0">
            <UntilWhenPicker
              until={until}
              untilDate={endDate}
              startDate={startDate}
              onChangeUntil={(val) => onChangeUntil && onChangeUntil(val)}
              onChangeUntilDate={(val) => {
                if (onChangeEndDate) onChangeEndDate(val);
              }}
            />
          </div>

          {showAllDayToggle && (
            <div className="min-w-0 flex flex-col justify-end">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold uppercase tracking-wider theme-text-secondary truncate">
                  {t('allDay', 'All day')}
                </label>
              </div>
              <div className="h-[46px] min-h-[46px] flex items-center justify-between px-3 sm:px-3.5 py-2.5 rounded-2xl border-0 theme-bg-surface shadow-xs">
                <span className="text-xs font-semibold theme-text-primary select-none truncate">
                  {isFullDay ? t('yes', 'Yes') : t('no', 'No')}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={Boolean(isFullDay)}
                  onClick={() => onChangeIsFullDay && onChangeIsFullDay(!isFullDay)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center px-0.5 cursor-pointer rounded-full border-0 transition-colors duration-200 ease-in-out focus:outline-none ${
                    isFullDay ? 'theme-bg-accent' : 'bg-black/15 dark:bg-white/15'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      isFullDay ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        showAllDayToggle && (
          <div className="flex items-center justify-between px-4 py-3 rounded-2xl border-0 theme-bg-surface shadow-xs">
            <span className="text-xs font-bold theme-text-primary">{t('allDay', 'All day')}</span>
            <button
              type="button"
              role="switch"
              aria-checked={Boolean(isFullDay)}
              onClick={() => onChangeIsFullDay && onChangeIsFullDay(!isFullDay)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center px-0.5 cursor-pointer rounded-full border-0 transition-colors duration-200 ease-in-out focus:outline-none ${
                isFullDay ? 'theme-bg-accent' : 'bg-black/15 dark:bg-white/15'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  isFullDay ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        )
      )}

      {/* 3. Time Pickers (Visible when NOT All Day) */}
      {showTimePickers && !isFullDay && (
        <div className="animate-fade-in">
          {singleTimeMode ? (
            <div className="grid grid-cols-1">
              <InlineTimePicker
                label={timeLabel || t('dueTime', 'Due Time')}
                value={startTime}
                onChange={(val) => onChangeStartTime && onChangeStartTime(val)}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <InlineTimePicker
                label={t('fromTime', 'From')}
                value={startTime || '09:00'}
                placeholder="09:00am"
                onChange={(val) => onChangeStartTime && onChangeStartTime(val)}
              />
              <InlineTimePicker
                label={t('toTime', 'To')}
                value={endTime || '17:00'}
                placeholder="05:00pm"
                onChange={(val) => onChangeEndTime && onChangeEndTime(val)}
              />
            </div>
          )}
        </div>
      )}

      {/* 4. Repeats / Recurrence Toggle & Options */}
      {showRecurrence && (
        <>
          <div className="flex items-center justify-between px-4 py-3 rounded-2xl border-0 theme-bg-surface shadow-xs">
            <span className="text-xs font-bold theme-text-primary">{t('repeats', 'Repeats')}</span>
            <button
              type="button"
              role="switch"
              aria-checked={Boolean(repeats)}
              onClick={() => onChangeRepeats && onChangeRepeats(!repeats)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center px-0.5 cursor-pointer rounded-full border-0 transition-colors duration-200 ease-in-out focus:outline-none ${
                repeats ? 'theme-bg-accent' : 'bg-black/15 dark:bg-white/15'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  repeats ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {repeats && (
            <div className="space-y-3.5 pt-1 animate-fade-in">
              {/* Days of Week Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider theme-text-secondary mb-2">
                  {t('recurrenceDays', 'Days')}
                </label>
                <div className="grid grid-cols-7 gap-1.5">
                  {WEEKDAY_INITIALS.map((item) => {
                    const isSelected = repeatDays.includes(item.day);
                    return (
                      <button
                        key={item.day}
                        type="button"
                        onClick={() => toggleRepeatDay(item.day)}
                        className={`h-9 rounded-2xl text-xs font-bold flex items-center justify-center transition cursor-pointer select-none border-0 ring-0 ${
                          isSelected
                            ? 'theme-bg-accent theme-accent-text shadow-xs'
                            : 'theme-bg-surface theme-text-secondary hover:theme-bg-elevated/40 hover:theme-text-primary shadow-xs'
                        }`}
                        title={item.name}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Repeat Frequency */}
              <div>
                <CustomSelect
                  label={t('repeatFrequency', 'Repeat')}
                  value={frequency}
                  onChange={(val) => onChangeFrequency && onChangeFrequency(String(val))}
                  options={FREQUENCY_OPTIONS}
                  placeholder={t('repeatFrequency', 'Select How Often')}
                />
              </div>
            </div>
          )}
        </>
      )}
    </DrawerSection>
  );
}

export default CalendarDateTimeSection;
