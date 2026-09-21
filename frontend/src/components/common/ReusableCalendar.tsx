import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  CloseIcon,
  CheckIcon,
} from '../ui/Icons';
import IconButton from '../ui/IconButton';
import CustomInput from '../ui/CustomInput';
import { getHijriDetails } from '../../utils/hijriUtils';
import { useTranslation } from '../../i18n';

// ─── LOCALIZED MONTH & WEEKDAY DICTIONARIES ──────────────────────────────────
const LOCALIZED_MONTHS: Record<string, { full: string[]; short: string[] }> = {
  en: {
    full: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    short: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  },
  bn: {
    full: ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'],
    short: ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'],
  },
  ar: {
    full: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
    short: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
  },
  ur: {
    full: ['جنوری', 'فروری', 'مارچ', 'اپریل', 'مئی', 'جون', 'جولائی', 'اگست', 'ستمبر', 'اکتوبر', 'نومبر', 'دسمبر'],
    short: ['جنوری', 'فروری', 'مارچ', 'اپریل', 'مئی', 'جون', 'جولائی', 'اگست', 'ستمبر', 'اکتوبر', 'نومبر', 'دسمبر'],
  },
};

const LOCALIZED_WEEKDAYS: Record<string, string[]> = {
  en: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
  bn: ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'],
  ar: ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'],
  ur: ['اتوار', 'پیر', 'منگل', 'بدھ', 'جمعرات', 'جمعہ', 'ہفتہ'],
};

export interface DisabledRangeItem {
  startDate: string;
  endDate: string;
  [key: string]: any;
}

export interface ReusableCalendarProps {
  selectedDate?: string;
  startDate?: string;
  endDate?: string;
  onSelectDate?: (dateStr: string) => void;
  onRangeSelect?: (startDate: string, endDate: string) => void;
  isRange?: boolean;
  minDate?: string;
  maxDate?: string;
  disabledRanges?: DisabledRangeItem[];
  disabledDates?: string[];
  placeholder?: string;
  className?: string;
  popupClassName?: string;
  alignRight?: boolean;
  isInline?: boolean;
  defaultOpen?: boolean;
  label?: string;
  subLabel?: string;
  required?: boolean;
  optional?: boolean;
  dateFormat?: string;
  showHijri?: boolean;
  headerAction?: React.ReactNode;
  onManage?: () => void;
  onActionClick?: () => void;
  actionLabel?: string | null;
  manageLabel?: string | null;
  badge?: React.ReactNode;
  error?: string | null;
  helperText?: string | null;
  disabled?: boolean;
  clearable?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filled' | 'elevated' | 'sub' | 'borderless';
  icon?: React.ComponentType<{ className?: string }> | null;
  id?: string;
  name?: string;
  inputClassName?: string;
  wrapperClassName?: string;
}

type CalendarViewMode = 'days' | 'months' | 'years';

/**
 * Enterprise Reusable Calendar Component
 * Design Specifications:
 * - Minimal, clutter-free, aesthetic modern form factor (compact 280px width)
 * - Seamless 3-tier view switcher: Days ↔ 3×4 Months Grid ↔ 3×4 Years Grid
 * - Smooth hover states, contiguous date range tracks & today indicators
 * - Multi-language (en, bn, ar, ur) & RTL bidirectional compliance
 * - Zero hardcoded colors; 100% theme token integration
 */
export default function ReusableCalendar({
  selectedDate = '',
  startDate = '',
  endDate = '',
  onSelectDate,
  onRangeSelect,
  isRange = false,
  minDate = '',
  maxDate = '',
  disabledRanges = [],
  disabledDates = [],
  placeholder = 'Select Date',
  className = '',
  popupClassName = '',
  alignRight = false,
  isInline = false,
  defaultOpen = false,
  label = '',
  subLabel = '',
  required = false,
  optional = false,
  badge = null,
  headerAction = null,
  onManage = null,
  onActionClick = null,
  actionLabel = null,
  manageLabel = null,
  dateFormat = '',
  showHijri = false,
  error = null,
  helperText = null,
  disabled = false,
  clearable = false,
  size = 'md',
  variant = 'sub',
  icon: CustomIcon = null,
  id,
  name,
  inputClassName = '',
  wrapperClassName = '',
}: ReusableCalendarProps) {
  const { t, language, isRTL } = useTranslation('common');

  const [isOpen, setIsOpen] = useState<boolean>(defaultOpen);
  const [viewMode, setViewMode] = useState<CalendarViewMode>('days');
  const [tempStart, setTempStart] = useState<string>(startDate || selectedDate);
  const [tempEnd, setTempEnd] = useState<string>(endDate);
  const [hoverDate, setHoverDate] = useState<string>('');

  const containerRef = useRef<HTMLDivElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);

  const activeDate = selectedDate || startDate || new Date().toISOString().split('T')[0];
  const initDate = new Date(activeDate);
  const [viewYear, setViewYear] = useState<number>(
    isNaN(initDate.getFullYear()) ? new Date().getFullYear() : initDate.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState<number>(
    isNaN(initDate.getMonth()) ? new Date().getMonth() : initDate.getMonth()
  );

  // Decade pagination start (e.g. 2020 for 2020-2031)
  const [decadeStart, setDecadeStart] = useState<number>(
    Math.floor((isNaN(initDate.getFullYear()) ? new Date().getFullYear() : initDate.getFullYear()) / 12) * 12
  );

  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    openUpward: boolean;
  }>({
    top: 0,
    left: 0,
    width: 280,
    openUpward: false,
  });

  const langKey = LOCALIZED_MONTHS[language] ? language : 'en';
  const monthNames = LOCALIZED_MONTHS[langKey].full;
  const monthShortNames = LOCALIZED_MONTHS[langKey].short;
  const weekdayNames = LOCALIZED_WEEKDAYS[langKey] || LOCALIZED_WEEKDAYS.en;

  useEffect(() => {
    if (defaultOpen) {
      setIsOpen(true);
    }
  }, [defaultOpen]);

  useEffect(() => {
    setTempStart(startDate || selectedDate);
    setTempEnd(endDate);
    if (selectedDate || startDate) {
      const d = new Date(selectedDate || startDate);
      if (!isNaN(d.getFullYear())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
        setDecadeStart(Math.floor(d.getFullYear() / 12) * 12);
      }
    }
  }, [selectedDate, startDate, endDate]);

  // Viewport-aware position calculator
  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (!rect.width) return;

    // Auto-close if trigger is scrolled out of viewport or beneath header
    if (rect.bottom < 50 || rect.top > window.innerHeight - 20) {
      setIsOpen(false);
      return;
    }

    const popupWidth = 280;
    const popupHeight = 310;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    const shouldOpenUpward = spaceBelow < popupHeight && spaceAbove > spaceBelow;

    let targetLeft = alignRight ? rect.right - popupWidth : rect.left;
    if (typeof window !== 'undefined') {
      if (targetLeft + popupWidth > window.innerWidth - 12) {
        targetLeft = window.innerWidth - popupWidth - 12;
      }
      if (targetLeft < 12) {
        targetLeft = 12;
      }
    }

    setCoords({
      left: targetLeft,
      top: shouldOpenUpward ? rect.top - 6 : rect.bottom + 6,
      openUpward: shouldOpenUpward,
      width: popupWidth,
    });
  }, [alignRight]);

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      setViewMode('days');
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useLayoutEffect(() => {
    if (isOpen && !isInline) {
      updatePosition();
    }
  }, [isOpen, isInline, updatePosition]);

  useEffect(() => {
    if (isOpen && !isInline) {
      const handleScroll = (e: Event) => {
        if (popupRef.current && popupRef.current.contains(e.target as Node)) return;
        setIsOpen(false);
      };
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen, isInline, updatePosition]);

  // Outside click & Escape dismiss handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        popupRef.current &&
        !popupRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setViewMode('days');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setViewMode('days');
      }
    };

    if (isOpen && !isInline) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isInline]);

  // Calendar Calculation Utilities
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  // Guard against navigating outside minDate or maxDate
  const isPrevMonthDisabled = Boolean(
    minDate && (() => {
      const prevMonthLastDay = new Date(viewYear, viewMonth, 0);
      const prevMonthLastDayStr = `${prevMonthLastDay.getFullYear()}-${String(prevMonthLastDay.getMonth() + 1).padStart(2, '0')}-${String(prevMonthLastDay.getDate()).padStart(2, '0')}`;
      return prevMonthLastDayStr < minDate;
    })()
  );

  const isNextMonthDisabled = Boolean(
    maxDate && (() => {
      const nextMonthFirstDay = new Date(viewYear, viewMonth + 1, 1);
      const nextMonthFirstDayStr = `${nextMonthFirstDay.getFullYear()}-${String(nextMonthFirstDay.getMonth() + 1).padStart(2, '0')}-01`;
      return nextMonthFirstDayStr > maxDate;
    })()
  );

  const handlePrevMonth = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isPrevMonthDisabled) return;
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isNextMonthDisabled) return;
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (dayNum: number) => {
    const monthStr = String(viewMonth + 1).padStart(2, '0');
    const dayStr = String(dayNum).padStart(2, '0');
    const dateStr = `${viewYear}-${monthStr}-${dayStr}`;

    if (!isRange) {
      setTempStart(dateStr);
      if (onSelectDate) onSelectDate(dateStr);
      setIsOpen(false);
      return;
    }

    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(dateStr);
      setTempEnd('');
    } else if (tempStart && !tempEnd) {
      if (dateStr < tempStart) {
        setTempStart(dateStr);
        setTempEnd('');
      } else {
        setTempEnd(dateStr);
        if (onRangeSelect) onRangeSelect(tempStart, dateStr);
        setIsOpen(false);
      }
    }
  };

  const handleSelectToday = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setViewMode('days');

    if (!isRange) {
      setTempStart(todayStr);
      if (onSelectDate) onSelectDate(todayStr);
      setIsOpen(false);
    } else {
      setTempStart(todayStr);
      setTempEnd(todayStr);
      if (onRangeSelect) onRangeSelect(todayStr, todayStr);
      setIsOpen(false);
    }
  };

  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isRange) {
      setTempStart('');
      setTempEnd('');
      onRangeSelect?.('', '');
    } else {
      setTempStart('');
      onSelectDate?.('');
    }
    setIsOpen(false);
  };

  const formatDateDisplay = (dStr: string) => {
    if (!dStr) return '';
    const [y, m, d] = dStr.split('-');
    if (!y || !m || !d) return dStr;
    if (dateFormat) {
      return dateFormat
        .replace('YYYY', y)
        .replace('YY', y.slice(2))
        .replace('MM', m)
        .replace('DD', d);
    }
    return `${d}/${m}/${y.slice(2)}`;
  };

  const getLabel = () => {
    if (isRange) {
      if (!startDate && !endDate) return placeholder;

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      const yest = new Date(today);
      yest.setDate(yest.getDate() - 1);
      const yestStr = yest.toISOString().split('T')[0];

      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 6);
      const weekStr = weekAgo.toISOString().split('T')[0];

      const monthAgo = new Date(today);
      monthAgo.setDate(monthAgo.getDate() - 29);
      const monthStr = monthAgo.toISOString().split('T')[0];

      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];

      if (startDate === todayStr && endDate === todayStr) return t('today', 'Today');
      if (startDate === yestStr && endDate === yestStr) return t('yesterday', 'Yesterday');
      if (startDate === weekStr && endDate === todayStr) return t('thisWeek', 'This Week');
      if (startDate === startOfMonth && endDate === todayStr) return t('thisMonth', 'This Month');
      if (startDate === monthStr && endDate === todayStr) return t('pastMonth', 'Past 1 Month');

      if (startDate && endDate) {
        return `${formatDateDisplay(startDate)} - ${formatDateDisplay(endDate)}`;
      }
      if (startDate) return `${formatDateDisplay(startDate)} - ...`;
      return placeholder;
    }
    if (selectedDate) return formatDateDisplay(selectedDate);
    return placeholder;
  };

  // 12-Year Grid range computation
  const yearsGrid = Array.from({ length: 12 }, (_, i) => decadeStart + i);

  // ────────────────── CALENDAR DROPDOWN COMPONENT ──────────────────
  const calendarDropdown = (
    <div
      ref={popupRef}
      dir={isRTL ? 'rtl' : 'ltr'}
      style={
        isInline
          ? {}
          : {
              position: 'fixed',
              left: `${coords.left}px`,
              top: coords.openUpward ? 'auto' : `${coords.top}px`,
              bottom: coords.openUpward ? `${window.innerHeight - coords.top}px` : 'auto',
              width: `${coords.width}px`,
              zIndex: 99999,
            }
      }
      className={
        isInline
          ? 'w-full max-w-[280px] p-2 space-y-2 select-none mx-auto'
          : `w-[280px] p-3 theme-bg-surface border theme-border rounded-2xl shadow-xl space-y-2.5 animate-fade-in select-none backdrop-blur-md ${popupClassName}`
      }
    >
      {/* ────────────────── 1. MONTH SELECTOR (3x4 Grid) ────────────────── */}
      {viewMode === 'months' && (
        <div className="space-y-2 animate-fade-in">
          {/* Header with Year Stepper */}
          <div className="flex items-center justify-between pb-1.5 border-b theme-border">
            <button
              type="button"
              onClick={() => {
                setDecadeStart(Math.floor(viewYear / 12) * 12);
                setViewMode('years');
              }}
              className="flex items-center gap-1 px-1 py-0.5 rounded-md hover:theme-bg-elevated/60 theme-text-primary text-xs font-bold transition cursor-pointer active:scale-95 group"
              title="Click to select year"
            >
              <span>{viewYear}</span>
              <ChevronIcon isOpen={false} className="w-2.5 h-2.5 theme-accent group-hover:translate-y-0.5 transition-transform" />
            </button>

            <div className="flex items-center gap-0.5">
              <IconButton
                icon={isRTL ? ChevronRightIcon : ChevronLeftIcon}
                size="xs"
                variant="ghost"
                onClick={() => setViewYear((y) => y - 1)}
                title="Previous Year"
              />
              <IconButton
                icon={isRTL ? ChevronLeftIcon : ChevronRightIcon}
                size="xs"
                variant="ghost"
                onClick={() => setViewYear((y) => y + 1)}
                title="Next Year"
              />
            </div>
          </div>

          {/* 3x4 Month Grid */}
          <div className="grid grid-cols-3 gap-1.5 py-1">
            {monthShortNames.map((mShort, idx) => {
              const isSelected = viewMonth === idx;
              const monthStartStr = `${viewYear}-${String(idx + 1).padStart(2, '0')}-01`;
              const monthLastDay = new Date(viewYear, idx + 1, 0).getDate();
              const monthEndStr = `${viewYear}-${String(idx + 1).padStart(2, '0')}-${String(monthLastDay).padStart(2, '0')}`;

              const isMonthDisabled = Boolean(
                (minDate && monthEndStr < minDate) ||
                (maxDate && monthStartStr > maxDate)
              );

              return (
                <button
                  key={mShort}
                  type="button"
                  disabled={isMonthDisabled}
                  onClick={() => {
                    setViewMonth(idx);
                    setViewMode('days');
                  }}
                  className={`h-8 rounded-xl text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? 'theme-bg-accent theme-accent-text font-bold shadow-xs scale-102 ring-1 ring-[var(--accent-main)]/30'
                      : isMonthDisabled
                      ? 'opacity-25 cursor-not-allowed line-through'
                      : 'theme-bg-sub/50 hover:theme-bg-elevated theme-text-primary active:scale-95'
                  }`}
                >
                  {mShort}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ────────────────── 2. YEAR SELECTOR (3x4 Grid) ────────────────── */}
      {viewMode === 'years' && (
        <div className="space-y-2 animate-fade-in">
          {/* Decade Stepper Header */}
          <div className="flex items-center justify-between pb-1.5 border-b theme-border">
            <span className="text-xs font-bold theme-text-primary pl-1">
              {decadeStart} - {decadeStart + 11}
            </span>

            <div className="flex items-center gap-0.5">
              <IconButton
                icon={isRTL ? ChevronRightIcon : ChevronLeftIcon}
                size="xs"
                variant="ghost"
                onClick={() => setDecadeStart((d) => d - 12)}
                title="Previous Decade"
              />
              <IconButton
                icon={isRTL ? ChevronLeftIcon : ChevronRightIcon}
                size="xs"
                variant="ghost"
                onClick={() => setDecadeStart((d) => d + 12)}
                title="Next Decade"
              />
            </div>
          </div>

          {/* 3x4 Years Grid */}
          <div className="grid grid-cols-3 gap-1.5 py-1">
            {yearsGrid.map((yr) => {
              const isSelected = viewYear === yr;
              const yearStartStr = `${yr}-01-01`;
              const yearEndStr = `${yr}-12-31`;

              const isYearDisabled = Boolean(
                (minDate && yearEndStr < minDate) ||
                (maxDate && yearStartStr > maxDate)
              );

              return (
                <button
                  key={yr}
                  type="button"
                  disabled={isYearDisabled}
                  onClick={() => {
                    setViewYear(yr);
                    setViewMode('months');
                  }}
                  className={`h-8 rounded-xl text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? 'theme-bg-accent theme-accent-text font-bold shadow-xs scale-102 ring-1 ring-[var(--accent-main)]/30'
                      : isYearDisabled
                      ? 'opacity-25 cursor-not-allowed line-through'
                      : 'theme-bg-sub/50 hover:theme-bg-elevated theme-text-primary active:scale-95'
                  }`}
                >
                  {yr}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ────────────────── 3. STANDARD DAYS VIEW MODE ────────────────── */}
      {viewMode === 'days' && (
        <>
          {/* Clean Minimal Header */}
          <div className="flex items-center justify-between pb-1.5 border-b theme-border">
            <div className="flex flex-col gap-0.5">
              {/* Clickable Month + Year to open Fast Selector */}
              <button
                type="button"
                onClick={() => setViewMode('months')}
                className="flex items-center gap-1.5 px-1 py-0.5 rounded-md hover:theme-bg-elevated/60 theme-text-primary font-bold text-xs transition cursor-pointer active:scale-95 group"
                title="Click to jump month or year"
              >
                <span>{monthNames[viewMonth]} {viewYear}</span>
                <ChevronIcon isOpen={false} className="w-2.5 h-2.5 theme-accent group-hover:translate-y-0.5 transition-transform" />
              </button>

              {/* Hijri Dynamic Subtitle (Optional) */}
              {showHijri && (() => {
                try {
                  const firstDayStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-01`;
                  const d = getHijriDetails(new Date(firstDayStr));
                  return (
                    <span className="text-[10px] font-mono theme-accent font-semibold leading-none pt-0.5 pl-0.5">
                      {d.monthName} {d.year}h
                    </span>
                  );
                } catch {
                  return null;
                }
              })()}
            </div>

            {/* Quick Next/Prev Month Buttons */}
            <div className="flex items-center gap-0.5">
              <IconButton
                icon={isRTL ? ChevronRightIcon : ChevronLeftIcon}
                size="xs"
                variant="ghost"
                disabled={isPrevMonthDisabled}
                onClick={handlePrevMonth}
                title={isPrevMonthDisabled ? 'Previous Month outside range' : 'Previous Month'}
              />
              <IconButton
                icon={isRTL ? ChevronLeftIcon : ChevronRightIcon}
                size="xs"
                variant="ghost"
                disabled={isNextMonthDisabled}
                onClick={handleNextMonth}
                title={isNextMonthDisabled ? 'Next Month outside range' : 'Next Month'}
              />
            </div>
          </div>

          {/* Weekday Row */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {weekdayNames.map((w) => (
              <span key={w} className="text-[11px] font-semibold theme-text-secondary h-6 flex items-center justify-center">
                {w}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center" onMouseLeave={() => setHoverDate('')}>
            {/* Blank offset placeholders from previous month */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => {
              const prevDateNum = daysInPrevMonth - firstDayOfMonth + i + 1;
              return (
                <span
                  key={`prev-${i}`}
                  className="w-8 h-8 rounded-lg text-[11px] font-medium flex items-center justify-center opacity-25 theme-text-secondary select-none"
                >
                  {prevDateNum}
                </span>
              );
            })}

            {/* Current Month Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const monthStr = String(viewMonth + 1).padStart(2, '0');
              const dayStr = String(dayNum).padStart(2, '0');
              const currDateStr = `${viewYear}-${monthStr}-${dayStr}`;

              const isStart = isRange && currDateStr === tempStart;
              const isEnd = isRange && currDateStr === tempEnd;
              const isSelected = isRange ? isStart || isEnd : currDateStr === selectedDate;

              const effectiveEnd = tempEnd || (tempStart && hoverDate && hoverDate >= tempStart ? hoverDate : '');
              const isInRange = isRange && tempStart && effectiveEnd && currDateStr >= tempStart && currDateStr <= effectiveEnd;

              const todayObj = new Date();
              const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
              const isToday = currDateStr === todayStr;

              // Date Guard checks
              const isInDisabledRange =
                Array.isArray(disabledRanges) &&
                disabledRanges.some((r) => r?.startDate && r?.endDate && currDateStr >= r.startDate && currDateStr <= r.endDate);

              const isSpecificDisabledDate =
                Array.isArray(disabledDates) && disabledDates.includes(currDateStr);

              const isDisabled =
                (minDate && currDateStr < minDate) ||
                (maxDate && currDateStr > maxDate) ||
                isInDisabledRange ||
                isSpecificDisabledDate;

              return (
                <button
                  key={currDateStr}
                  type="button"
                  disabled={isDisabled}
                  onMouseEnter={() => {
                    if (isRange && tempStart && !tempEnd) {
                      setHoverDate(currDateStr);
                    }
                  }}
                  onClick={() => handleSelectDay(dayNum)}
                  className={`w-8 h-8 text-xs font-medium flex items-center justify-center transition-all cursor-pointer relative select-none ${
                    isSelected
                      ? 'theme-bg-accent theme-accent-text font-bold rounded-lg shadow-xs scale-102 ring-1 ring-[var(--accent-main)]/30 z-10'
                      : isInRange
                      ? 'bg-[var(--accent-main)]/15 theme-accent font-semibold rounded-none'
                      : isToday
                      ? 'border border-[var(--accent-main)] theme-accent font-semibold rounded-lg theme-bg-accent-soft/30'
                      : isDisabled
                      ? 'opacity-25 cursor-not-allowed line-through'
                      : 'rounded-lg hover:theme-bg-elevated theme-text-primary active:scale-95'
                  }`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* ────────────────── BOTTOM ACTION BAR ────────────────── */}
      <div className="pt-2 border-t theme-border flex items-center justify-between">
        {(() => {
          const tDate = new Date();
          const tStr = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}-${String(tDate.getDate()).padStart(2, '0')}`;
          const isTodayDisabled = Boolean((minDate && tStr < minDate) || (maxDate && tStr > maxDate));
          return (
            <button
              type="button"
              disabled={isTodayDisabled}
              onClick={handleSelectToday}
              className="text-xs font-semibold theme-text-secondary hover:theme-text-primary px-2 py-0.5 rounded-md hover:theme-bg-elevated transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              title={isTodayDisabled ? 'Today is outside valid date range' : 'Select Today'}
            >
              {t('today', 'Today')}
            </button>
          );
        })()}

        {(selectedDate || startDate) && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs font-medium text-rose-500/80 hover:text-rose-500 hover:theme-bg-elevated px-2 py-0.5 rounded-md transition cursor-pointer"
            title="Clear date"
          >
            {t('clear', 'Clear')}
          </button>
        )}
      </div>
    </div>
  );

  const IconToRender = CustomIcon || CalendarIcon;

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {!isInline && (
        <div
          onClick={handleToggle}
          className="w-full cursor-pointer select-none"
        >
          <CustomInput
            id={id}
            name={name}
            label={label}
            subLabel={subLabel}
            required={required}
            optional={optional}
            badge={badge}
            headerAction={headerAction}
            onManage={onManage}
            onActionClick={onActionClick}
            actionLabel={actionLabel}
            manageLabel={manageLabel}
            placeholder={placeholder}
            value={getLabel() === placeholder ? '' : getLabel()}
            readOnly={true}
            disabled={disabled}
            error={error}
            helperText={helperText}
            size={size}
            variant={variant}
            icon={IconToRender}
            className={`cursor-pointer ${inputClassName}`}
            inputClassName="cursor-pointer select-none"
            wrapperClassName={wrapperClassName}
            endAdornment={
              <div className="flex items-center gap-1 shrink-0">
                {clearable && (selectedDate || startDate) && !disabled && (
                  <IconButton
                    icon={CloseIcon}
                    size="2xs"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClear(e);
                    }}
                    title="Clear date"
                  />
                )}
                <ChevronIcon isOpen={isOpen} className="w-3.5 h-3.5 theme-text-secondary" />
              </div>
            }
          />
        </div>
      )}

      {isInline
        ? calendarDropdown
        : isOpen && coords.top > 0 && typeof document !== 'undefined'
        ? createPortal(calendarDropdown, document.body)
        : null}
    </div>
  );
}
