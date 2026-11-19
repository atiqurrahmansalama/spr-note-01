import { useState, useMemo, useCallback, useEffect } from 'react';
import type { CalendarEvent, CalendarCategory, CalendarDisplayMode, UserPersonalTask } from '../../../types';
import type { MonthGridCell, TimelineStripDay } from '../types';
import { calendarEventComparator, isEventOnDate } from '../utils/calendarUtils';

interface UseCalendarEventsDataProps {
  events: CalendarEvent[];
  selectedCategory?: CalendarCategory | string;
  searchQuery: string;
  viewYear: number;
  viewMonth: number;
  selectedDateStr: string;
  selectedWeekday: number;
  displayMode: CalendarDisplayMode;
  userTasks: UserPersonalTask[];
  showPersonalTasks: boolean;
}

export function useCalendarEventsData({
  events,
  selectedCategory,
  searchQuery,
  viewYear,
  viewMonth,
  selectedDateStr,
  selectedWeekday,
  displayMode,
  userTasks,
  showPersonalTasks,
}: UseCalendarEventsDataProps) {
  // 1. Filter events by category and search query
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (selectedCategory && selectedCategory !== 'ALL' && selectedCategory !== 'AGENDA') {
        if (selectedCategory === 'WORKING_HOURS') {
          if (e.category !== 'WORKING_HOURS') return false;
        } else if (selectedCategory === 'ACADEMIC_EVENT') {
          if (e.category === 'WORKING_HOURS') return false;
        } else if (e.category !== selectedCategory) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (e.title || '').toLowerCase().includes(q);
        const matchDesc = (e.description || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDesc) return false;
      }
      return true;
    });
  }, [events, selectedCategory, searchQuery]);

  // 2. Pre-sorted filtered events (executed ONCE per change, eliminating repeated N log N sorts)
  const sortedFilteredEvents = useMemo(() => {
    return [...filteredEvents].sort(calendarEventComparator);
  }, [filteredEvents]);

  // 3. 42-day Month Grid calculation
  const monthGridDays: MonthGridCell[] = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells: MonthGridCell[] = [];

    // Prev month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevMonthDate = new Date(viewYear, viewMonth - 1, dayNum);
      const y = prevMonthDate.getFullYear();
      const m = String(prevMonthDate.getMonth() + 1).padStart(2, '0');
      const d = String(dayNum).padStart(2, '0');
      cells.push({
        dateStr: `${y}-${m}-${d}`,
        dayNum,
        isCurrentMonth: false,
        weekday: prevMonthDate.getDay(),
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(viewYear, viewMonth, d);
      const y = viewYear;
      const m = String(viewMonth + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      cells.push({
        dateStr: `${y}-${m}-${dStr}`,
        dayNum: d,
        isCurrentMonth: true,
        weekday: dateObj.getDay(),
      });
    }

    // Next month padding
    const totalCells = Math.ceil(cells.length / 7) * 7;
    const remaining = totalCells - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const nextMonthDate = new Date(viewYear, viewMonth + 1, d);
      const y = nextMonthDate.getFullYear();
      const m = String(nextMonthDate.getMonth() + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      cells.push({
        dateStr: `${y}-${m}-${dStr}`,
        dayNum: d,
        isCurrentMonth: false,
        weekday: nextMonthDate.getDay(),
      });
    }

    return cells;
  }, [viewYear, viewMonth]);

  // Group month grid cells into 7-day calendar weeks
  const weeks = useMemo<MonthGridCell[][]>(() => {
    const result: MonthGridCell[][] = [];
    for (let i = 0; i < monthGridDays.length; i += 7) {
      result.push(monthGridDays.slice(i, i + 7));
    }
    return result;
  }, [monthGridDays]);

  // 4. Timeline range state
  const [timelineRange, setTimelineRange] = useState<{ startYear: number; endYear: number }>(() => {
    const curY = new Date().getFullYear();
    return { startYear: curY, endYear: curY };
  });

  useEffect(() => {
    setTimelineRange((prev) => {
      let { startYear, endYear } = prev;
      let changed = false;
      if (viewYear < startYear) {
        startYear = viewYear;
        changed = true;
      }
      if (viewYear > endYear) {
        endYear = viewYear;
        changed = true;
      }
      return changed ? { startYear, endYear } : prev;
    });
  }, [viewYear]);

  // Lazy Day Strip for Timeline (computed ONLY when displayMode === 'timeline')
  const timelineStripDays: TimelineStripDay[] = useMemo(() => {
    if (displayMode !== 'timeline') {
      return [];
    }
    const list: TimelineStripDay[] = [];
    const { startYear, endYear } = timelineRange;

    for (let y = startYear; y <= endYear; y++) {
      for (let m = 0; m < 12; m++) {
        const daysInMonth = new Date(y, m + 1, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
          const dObj = new Date(y, m, d);
          const dStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          list.push({
            dateObj: dObj,
            dateStr: dStr,
            dayNum: d,
            monthIdx: m,
            yearNum: y,
            weekday: dObj.getDay(),
            isCurrentMonth: y === viewYear && m === viewMonth,
          });
        }
      }
    }

    return list;
  }, [displayMode, timelineRange, viewYear, viewMonth]);

  // 5. Pre-computed O(1) Date -> CalendarEvent[] Lookup Map
  const eventsByDateMap = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    const activeCells = displayMode === 'timeline' ? timelineStripDays : monthGridDays;
    for (let i = 0; i < activeCells.length; i++) {
      const cell = activeCells[i];
      const dStr = cell.dateStr;
      const wDay = cell.weekday;
      const matched: CalendarEvent[] = [];
      for (let j = 0; j < sortedFilteredEvents.length; j++) {
        const evt = sortedFilteredEvents[j];
        if (isEventOnDate(evt, dStr, wDay)) {
          matched.push(evt);
        }
      }
      map.set(dStr, matched);
    }
    return map;
  }, [sortedFilteredEvents, displayMode, timelineStripDays, monthGridDays]);

  // 6. Fast O(1) Event retriever
  const getEventsForDate = useCallback(
    (dateStr: string, weekday: number): CalendarEvent[] => {
      const cached = eventsByDateMap.get(dateStr);
      if (cached) return cached;
      return sortedFilteredEvents.filter((e) => isEventOnDate(e, dateStr, weekday));
    },
    [eventsByDateMap, sortedFilteredEvents]
  );

  // 7. Fast O(1) Personal Tasks Lookup Map
  const tasksByDateMap = useMemo(() => {
    const map = new Map<string, UserPersonalTask[]>();
    if (!showPersonalTasks || !userTasks || userTasks.length === 0) return map;
    for (let i = 0; i < userTasks.length; i++) {
      const t = userTasks[i];
      if (!t.dueDate) continue;
      const list = map.get(t.dueDate);
      if (list) {
        list.push(t);
      } else {
        map.set(t.dueDate, [t]);
      }
    }
    return map;
  }, [userTasks, showPersonalTasks]);

  const getTasksForDate = useCallback(
    (dateStr: string) => {
      return tasksByDateMap.get(dateStr) || [];
    },
    [tasksByDateMap]
  );

  const selectedDayEvents = useMemo(() => {
    return getEventsForDate(selectedDateStr, selectedWeekday);
  }, [selectedDateStr, selectedWeekday, getEventsForDate]);

  return {
    filteredEvents,
    sortedFilteredEvents,
    monthGridDays,
    weeks,
    timelineRange,
    timelineStripDays,
    getEventsForDate,
    getTasksForDate,
    selectedDayEvents,
  };
}
