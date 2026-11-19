import { useCallback } from 'react';
import type { CalendarEvent } from '../../../types';
import type { MonthGridCell, WeekEventItem } from '../types';
import { isEventOnDate } from '../utils/calendarUtils';

interface UseWeekEventsPackingProps {
  sortedFilteredEvents: CalendarEvent[];
  getEventsForDate: (dateStr: string, weekday: number) => CalendarEvent[];
}

export function useWeekEventsPacking({
  sortedFilteredEvents,
  getEventsForDate,
}: UseWeekEventsPackingProps) {
  const getWeekEvents = useCallback(
    (weekDays: MonthGridCell[]): { items: WeekEventItem[]; maxTracks: number; daysWithOverflow: Set<number> } => {
      if (weekDays.length !== 7) return { items: [], maxTracks: 0, daysWithOverflow: new Set() };

      const daysWithOverflow = new Set<number>();
      weekDays.forEach((cell, idx) => {
        if (!cell.isCurrentMonth) return;
        const dayEvts = getEventsForDate(cell.dateStr, cell.weekday);
        if (dayEvts.length > 3) {
          daysWithOverflow.add(idx + 1);
        }
      });

      const rawItems: Omit<WeekEventItem, 'row'>[] = [];

      sortedFilteredEvents.forEach((evt) => {
        const activeCols: number[] = [];

        weekDays.forEach((cell, idx) => {
          const col = idx + 1;
          const dateStr = cell.dateStr;
          const weekday = cell.weekday;

          if (!cell.isCurrentMonth) return;
          if (isEventOnDate(evt, dateStr, weekday)) {
            activeCols.push(col);
          }
        });

        if (activeCols.length === 0) return;

        activeCols.sort((a, b) => a - b);
        const spans: { startCol: number; endCol: number }[] = [];
        let currentSpan: { startCol: number; endCol: number } | null = null;

        activeCols.forEach((col) => {
          if (!currentSpan) {
            currentSpan = { startCol: col, endCol: col };
          } else if (col === currentSpan.endCol + 1) {
            currentSpan.endCol = col;
          } else {
            spans.push(currentSpan);
            currentSpan = { startCol: col, endCol: col };
          }
        });
        if (currentSpan) {
          spans.push(currentSpan);
        }

        spans.forEach((sp) => {
          const spanLength = sp.endCol - sp.startCol + 1;
          const startDayStr = weekDays[sp.startCol - 1].dateStr;
          const endDayStr = weekDays[sp.endCol - 1].dateStr;

          let isStart = true;
          let isEnd = true;

          if (!evt.repeats) {
            const evtStart = evt.startDate || '';
            const evtEnd = evt.endDate || evt.untilDate || evt.startDate || '';
            if (evtStart) isStart = startDayStr === evtStart;
            if (evtEnd) isEnd = endDayStr === evtEnd;
          } else {
            if (sp.startCol === 1 && evt.repeatDays?.includes(6)) {
              isStart = false;
            }
            if (sp.endCol === 7 && evt.repeatDays?.includes(0)) {
              isEnd = false;
            }
          }

          rawItems.push({
            event: evt,
            startCol: sp.startCol,
            endCol: sp.endCol,
            span: spanLength,
            isStart,
            isEnd,
          });
        });
      });

      rawItems.sort((a, b) => {
        if (a.span !== b.span) return b.span - a.span;
        if (a.startCol !== b.startCol) return a.startCol - b.startCol;
        const rankA = a.event.priorityRank !== undefined && a.event.priorityRank !== null
          ? Number(a.event.priorityRank)
          : (a.event.rank !== undefined ? Number(a.event.rank) : 999);
        const rankB = b.event.priorityRank !== undefined && b.event.priorityRank !== null
          ? Number(b.event.priorityRank)
          : (b.event.rank !== undefined ? Number(b.event.rank) : 999);
        if (rankA !== rankB) return rankA - rankB;
        return (a.event.title || '').localeCompare(b.event.title || '');
      });

      const MAX_EVENT_ROWS = 3;
      const tracks: boolean[][] = [
        new Array(7).fill(false),
        new Array(7).fill(false),
        new Array(7).fill(false),
      ];
      daysWithOverflow.forEach((col) => {
        tracks[2][col - 1] = true;
      });

      const items: WeekEventItem[] = [];

      rawItems.forEach((item) => {
        let assignedRow = 0;
        while (assignedRow < MAX_EVENT_ROWS) {
          let fits = true;
          for (let c = item.startCol - 1; c < item.endCol; c++) {
            if (tracks[assignedRow][c]) {
              fits = false;
              break;
            }
          }
          if (fits) {
            for (let c = item.startCol - 1; c < item.endCol; c++) {
              tracks[assignedRow][c] = true;
            }
            items.push({
              ...item,
              row: assignedRow + 1,
            });
            break;
          }
          assignedRow++;
        }
      });

      return { items, maxTracks: Math.min(MAX_EVENT_ROWS, tracks.length), daysWithOverflow };
    },
    [sortedFilteredEvents, getEventsForDate]
  );

  return { getWeekEvents };
}
