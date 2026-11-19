import { useState, useMemo, useCallback, useEffect } from 'react';
import { getHijriDetails } from '../../../../../../utils/hijriUtils';
import type { CalendarDisplayMode } from '../../../types';

interface UseCalendarDatesProps {
  initialDate?: Date;
  isHijriEnabled?: boolean;
  displayMode?: CalendarDisplayMode;
  onDateSelect?: (dateStr: string) => void;
  onScrollToTimelineDate?: (date: Date, behavior?: ScrollBehavior) => void;
  onCheckTodayVisibility?: () => void;
}

export function useCalendarDates({
  initialDate,
  isHijriEnabled = false,
  displayMode = 'grid',
  onDateSelect,
  onScrollToTimelineDate,
  onCheckTodayVisibility,
}: UseCalendarDatesProps) {
  const [currentDate, setCurrentDate] = useState<Date>(() => initialDate || new Date());
  const [selectedDay, setSelectedDay] = useState<number>(() => (initialDate || new Date()).getDate());

  const viewYear = currentDate.getFullYear();
  const viewMonth = currentDate.getMonth();

  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const daysInCurrentViewMonth = useMemo(() => {
    return new Date(viewYear, viewMonth + 1, 0).getDate();
  }, [viewYear, viewMonth]);

  const safeSelectedDay = Math.min(Math.max(1, selectedDay), daysInCurrentViewMonth);

  const selectedDateObj = useMemo(() => {
    return new Date(viewYear, viewMonth, safeSelectedDay);
  }, [viewYear, viewMonth, safeSelectedDay]);

  const selectedDateStr = useMemo(() => {
    const y = selectedDateObj.getFullYear();
    const m = String(selectedDateObj.getMonth() + 1).padStart(2, '0');
    const d = String(selectedDateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [selectedDateObj]);

  const selectedWeekday = selectedDateObj.getDay();

  useEffect(() => {
    if (onDateSelect) {
      onDateSelect(selectedDateStr);
    }
  }, [selectedDateStr, onDateSelect]);

  const hijriMonthHeader = useMemo(() => {
    if (!isHijriEnabled) return '';
    try {
      const firstDayStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
      const lastDayStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      const firstDetails = getHijriDetails(new Date(firstDayStr));
      const lastDetails = getHijriDetails(new Date(lastDayStr));
      if (firstDetails.monthName === lastDetails.monthName) {
        return `${firstDetails.monthName} ${firstDetails.year}h`;
      }
      return `${firstDetails.monthName} – ${lastDetails.monthName} ${lastDetails.year}h`;
    } catch {
      return '';
    }
  }, [viewYear, viewMonth, isHijriEnabled]);

  const handlePrevMonth = useCallback(() => {
    const nextDate = new Date(viewYear, viewMonth - 1, 1);
    setCurrentDate(nextDate);
    setSelectedDay(1);
    if (displayMode === 'timeline' && onScrollToTimelineDate) {
      onScrollToTimelineDate(nextDate, 'smooth');
    }
  }, [viewYear, viewMonth, displayMode, onScrollToTimelineDate]);

  const handleNextMonth = useCallback(() => {
    const nextDate = new Date(viewYear, viewMonth + 1, 1);
    setCurrentDate(nextDate);
    setSelectedDay(1);
    if (displayMode === 'timeline' && onScrollToTimelineDate) {
      onScrollToTimelineDate(nextDate, 'smooth');
    }
  }, [viewYear, viewMonth, displayMode, onScrollToTimelineDate]);

  const handleJumpToday = useCallback(() => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDay(now.getDate());
    if (displayMode === 'timeline' && onScrollToTimelineDate) {
      onScrollToTimelineDate(now, 'auto');
    } else if (onCheckTodayVisibility) {
      setTimeout(() => {
        onCheckTodayVisibility();
      }, 60);
    }
  }, [displayMode, onScrollToTimelineDate, onCheckTodayVisibility]);

  return {
    currentDate,
    setCurrentDate,
    selectedDay,
    setSelectedDay,
    viewYear,
    viewMonth,
    todayStr,
    daysInCurrentViewMonth,
    safeSelectedDay,
    selectedDateObj,
    selectedDateStr,
    selectedWeekday,
    hijriMonthHeader,
    handlePrevMonth,
    handleNextMonth,
    handleJumpToday,
  };
}
