import React from 'react';
import type { CalendarEvent, CalendarDisplayMode, UserPersonalTask } from '../../../types';
import type { MonthGridCell, WeekEventItem } from '../types';
import { WEEKDAY_NAMES_SHORT, formatTime12, getEventColors } from '../utils/calendarUtils';
import { getHijriDateString } from '../../../../../../utils/hijriUtils';

interface CalendarMonthGridViewProps {
  weeks: MonthGridCell[][];
  todayStr: string;
  viewYear: number;
  viewMonth: number;
  isHijriEnabled?: boolean;
  readOnly?: boolean;
  embeddedSurface?: boolean;
  showPersonalTasks?: boolean;
  activeTenantId?: string;
  getEventsForDate: (dateStr: string, weekday: number) => CalendarEvent[];
  getTasksForDate: (dateStr: string) => UserPersonalTask[];
  getWeekEvents: (weekDays: MonthGridCell[]) => { items: WeekEventItem[]; maxTracks: number; daysWithOverflow: Set<number> };
  onSelectDay: (dayNum: number) => void;
  onSetCurrentDate: (date: Date) => void;
  onSetDisplayMode: (mode: CalendarDisplayMode) => void;
  canAdd?: boolean;
  onOpenAddDrawer: (dateStr: string) => void;
  onOpenEventDetail: (evt: CalendarEvent, dateStr?: string) => void;
  onOpenTaskDetail?: (task: UserPersonalTask, dateStr: string) => void;
  onOpenDayTasks?: (dateStr: string, tasks: UserPersonalTask[]) => void;
}

export const CalendarMonthGridView: React.FC<CalendarMonthGridViewProps> = ({
  weeks,
  todayStr,
  viewYear,
  viewMonth,
  isHijriEnabled = false,
  readOnly = false,
  embeddedSurface = false,
  showPersonalTasks = true,
  canAdd = true,
  activeTenantId,
  getEventsForDate,
  getTasksForDate,
  getWeekEvents,
  onSelectDay,
  onSetCurrentDate,
  onSetDisplayMode,
  onOpenAddDrawer,
  onOpenEventDetail,
  onOpenTaskDetail,
  onOpenDayTasks,
}) => {
  const handleTaskClick = (
    e: React.MouseEvent,
    tasks: UserPersonalTask[],
    dateStr: string,
    dayNum: number
  ) => {
    e.stopPropagation();
    onSelectDay(dayNum);
    if (tasks.length === 1 && onOpenTaskDetail) {
      onOpenTaskDetail(tasks[0], dateStr);
    } else if (tasks.length > 1 && onOpenDayTasks) {
      onOpenDayTasks(dateStr, tasks);
    } else if (tasks.length > 0 && onOpenTaskDetail) {
      onOpenTaskDetail(tasks[0], dateStr);
    } else {
      onSetDisplayMode('timeline');
    }
  };

  return (
    <div className={`flex flex-col w-full min-w-0 ${embeddedSurface ? 'p-0 pb-4' : 'p-2 sm:p-3 pb-5 sm:pb-6'}`}>
      {/* Weekday Header Columns (SUN to SAT) */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center select-none shrink-0 mb-1.5">
        {WEEKDAY_NAMES_SHORT.map((wd) => (
          <div key={wd} className="py-1">
            <span className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider theme-text-secondary opacity-75">
              {wd}
            </span>
          </div>
        ))}
      </div>

      {/* 6 Weeks Grid Rows */}
      <div className="flex flex-col gap-1 sm:gap-1.5 w-full min-w-0">
        {weeks.map((weekDays, weekIdx) => {
          const { items: weekEvents, daysWithOverflow } = getWeekEvents(weekDays);
          const hasWeekSpanningEvents = weekEvents.length > 0;
          const hasWeekTasks = showPersonalTasks && weekDays.some((c) => {
            const tasks = getTasksForDate(c.dateStr);
            return tasks.length > 0;
          });

          return (
            <div
              key={`week-${weekIdx}-${weekDays[0].dateStr}`}
              className="relative w-full border-0"
            >
              {/* Background 7-Day Columns Grid */}
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5 w-full min-h-0">
                {weekDays.map((cell) => {
                  const dayEvents = getEventsForDate(cell.dateStr, cell.weekday);
                  const cellTasks = showPersonalTasks ? getTasksForDate(cell.dateStr) : [];
                  const isToday = cell.dateStr === todayStr;
                  const topEvent = dayEvents.length > 0 ? dayEvents[0] : null;
                  const topStyle = topEvent ? getEventColors(topEvent, activeTenantId) : null;
                  const hijriCellStr = isHijriEnabled ? getHijriDateString(cell.dateStr) : '';

                  return (
                    <div
                      key={cell.dateStr}
                      onClick={() => {
                        onSelectDay(cell.dayNum);
                        if (!cell.isCurrentMonth) {
                          const targetDate = new Date(cell.dateStr);
                          onSetCurrentDate(new Date(targetDate.getFullYear(), targetDate.getMonth(), cell.dayNum));
                        }
                        if (dayEvents.length > 0) {
                          onSetDisplayMode('timeline');
                        } else if (!readOnly && canAdd) {
                          onOpenAddDrawer(cell.dateStr);
                        } else {
                          onSetDisplayMode('timeline');
                        }
                      }}
                      className={`border-0 w-full p-1 @sm:p-1.5 @xl:p-2 flex flex-col justify-start transition-colors cursor-pointer group select-none rounded-md relative overflow-hidden ${
                        hasWeekSpanningEvents
                          ? hasWeekTasks
                            ? 'aspect-square @[480px]:aspect-auto @[480px]:min-h-[116px] @[480px]:@sm:min-h-[124px] @[480px]:@xl:min-h-[134px]'
                            : 'aspect-square @[480px]:aspect-auto @[480px]:min-h-[92px] @[480px]:@sm:min-h-[98px] @[480px]:@xl:min-h-[104px]'
                          : 'aspect-square'
                      } ${
                        isToday
                          ? 'bg-transparent @[480px]:bg-[var(--accent-main)]/15 @[480px]:dark:bg-[var(--accent-main)]/25 @[480px]:hover:bg-[var(--accent-main)]/30'
                          : cell.isCurrentMonth
                          ? 'bg-transparent @[380px]:theme-bg-tile @[380px]:dark:bg-white/[0.14] @[380px]:dark:hover:bg-white/[0.18] @[380px]:hover:theme-bg-elevated/80'
                          : 'bg-transparent opacity-40 @[380px]:theme-bg-tile-muted @[380px]:dark:bg-white/[0.05] @[380px]:hover:opacity-80'
                      }`}
                      title={
                        dayEvents.length > 0 || cellTasks.length > 0
                          ? `${dayEvents.length} event(s), ${cellTasks.length} task(s) on ${cell.dateStr}. Click to view details.`
                          : cell.dateStr
                      }
                    >
                      {/* Top Header: Day Number & Hijri */}
                      <div className="flex flex-col @[480px]:flex-row items-center @[480px]:justify-between relative w-full mb-0.5 shrink-0 pointer-events-auto">
                        <div className="flex items-center justify-center @[480px]:justify-start min-w-0">
                          <span
                            className={`text-[10px] @sm:text-[11px] @xl:text-xs font-bold inline-flex items-center justify-center transition border-0 ${
                              isToday
                                ? 'w-5 h-5 rounded-full bg-[var(--accent-main)]/15 dark:bg-[var(--accent-main)]/25 text-[var(--accent-main)] @[480px]:w-auto @[480px]:h-auto @[480px]:rounded-none @[480px]:bg-transparent'
                                : 'theme-text-primary group-hover:theme-accent font-mono bg-transparent'
                            }`}
                          >
                            {cell.dayNum}
                          </span>
                        </div>

                        {isHijriEnabled && (
                          <span
                            className="text-[8.5px] @[480px]:text-[9.5px] font-mono theme-accent font-medium leading-none select-none opacity-85 shrink-0 text-center @[480px]:text-right bg-transparent border-0 mt-0.5 @[480px]:mt-0"
                            title={`Hijri: ${hijriCellStr}`}
                          >
                            {hijriCellStr.split(' ')[0]}
                          </span>
                        )}
                      </div>

                      {/* Middle Event Spacer: Only present if this day has events */}
                      {dayEvents.length > 0 && (
                        <div className="hidden @[480px]:block flex-1 min-h-[44px] @xl:min-h-[66px] pointer-events-none" />
                      )}

                      {/* ─── 1. Wide Container (>=480px): Standard Task Pill at bottom ─── */}
                      {cellTasks.length > 0 && (
                        <div className="hidden @[480px]:flex mt-auto pb-0.5 w-full items-center justify-center shrink-0 z-20 pointer-events-auto">
                          <button
                            type="button"
                            onClick={(e) => handleTaskClick(e, cellTasks, cell.dateStr, cell.dayNum)}
                            className="px-1.5 py-0.5 rounded-full text-[9px] @sm:text-[9.5px] font-mono font-semibold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/25 transition-all flex items-center gap-1 shadow-2xs border-0 cursor-pointer"
                            title={`${cellTasks.length} task(s). Click to view details in sidebar.`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                            <span>
                              {cellTasks.length} {cellTasks.length === 1 ? 'task' : 'tasks'}
                            </span>
                          </button>
                        </div>
                      )}

                      {/* Narrow Container (<480px): Unified Event & Task Badges (Max 2 Badges, Identical Small Size) */}
                      {(dayEvents.length > 0 || cellTasks.length > 0) && (
                        <div className="flex @[480px]:hidden items-center justify-center gap-1 mt-auto pb-0.5 shrink-0 z-20 pointer-events-auto">
                          {/* Badge 1: Event or Shift (Small Dot w-1.5 h-1.5) */}
                          {dayEvents.length > 0 && topStyle && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectDay(cell.dayNum);
                                if (dayEvents.length === 1 && onOpenEventDetail) {
                                  onOpenEventDetail(dayEvents[0], cell.dateStr);
                                } else {
                                  onSetDisplayMode('timeline');
                                }
                              }}
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${topStyle.dot} border-0 p-0 cursor-pointer shadow-none hover:scale-125 transition-transform`}
                              title={`${dayEvents.length} event/shift item(s). Click to view.`}
                              aria-label={`${dayEvents.length} event/shift item(s)`}
                            />
                          )}

                          {/* Badge 2: Task (Identical Small Dot w-1.5 h-1.5) */}
                          {cellTasks.length > 0 && (
                            <button
                              type="button"
                              onClick={(e) => handleTaskClick(e, cellTasks, cell.dateStr, cell.dayNum)}
                              className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 border-0 p-0 cursor-pointer shadow-none hover:scale-125 transition-transform"
                              title={`${cellTasks.length} task(s). Click to view task details in sidebar.`}
                              aria-label={`${cellTasks.length} task(s)`}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Wide Container (>=480px): Continuous Spanning Events Grid Layer across the Week */}
              {hasWeekSpanningEvents && (
                <div
                  className={`hidden @[480px]:grid grid-cols-7 gap-x-1 sm:gap-x-1.5 gap-y-1 absolute inset-x-0 top-[26px] @sm:top-[28px] @xl:top-[30px] ${
                    hasWeekTasks ? 'bottom-[26px]' : 'bottom-[4px]'
                  } pointer-events-none z-10 overflow-hidden`}
                  style={{
                    gridTemplateRows: 'repeat(3, minmax(0, 22px))',
                    maxHeight: '74px',
                  }}
                >
                  {weekEvents.map((item) => {
                    const { event: evt, startCol, span, isStart, isEnd, row } = item;
                    const style = getEventColors(evt, activeTenantId);
                    const isAllDay = evt.isFullDay || !evt.startTime || !evt.endTime;
                    const isMultiDay = span > 1 || !isStart || !isEnd;

                    const edgeClasses = isStart && isEnd
                      ? 'mx-1 rounded-md'
                      : isStart && !isEnd
                      ? 'ml-1 mr-0 rounded-l-md rounded-r-none'
                      : !isStart && isEnd
                      ? 'ml-0 mr-1 rounded-r-md rounded-l-none'
                      : 'mx-0 rounded-none';

                    return (
                      <div
                        key={`${evt.id}-${startCol}-${row}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenEventDetail(evt, weekDays[startCol - 1]?.dateStr || evt.startDate);
                        }}
                        style={{
                          gridColumn: `${startCol} / span ${span}`,
                          gridRow: row,
                        }}
                        className={`h-[22px] px-2 py-0.5 text-[10px] font-semibold truncate transition-all cursor-pointer select-none pointer-events-auto flex items-center shadow-2xs ${
                          style.bannerBg || style.solidBg
                        } ${style.bannerText || style.solidText} hover:brightness-105 ${edgeClasses}`}
                        title={`${evt.title}${!isAllDay ? ` (${formatTime12(evt.startTime)} - ${formatTime12(evt.endTime)})` : ' (Full Day)'}${
                          isMultiDay ? ' (Multi-day Event)' : ''
                        }`}
                      >
                        <span className="truncate block font-medium leading-none">
                          {!isStart && <span className="opacity-70 mr-1 text-[9px] font-mono">...</span>}
                          {evt.title}
                        </span>
                      </div>
                    );
                  })}

                  {/* Render "+N more" Interactive Counter Pill on Row 3 */}
                  {daysWithOverflow && Array.from(daysWithOverflow).map((col) => {
                    const cell = weekDays[col - 1];
                    if (!cell?.isCurrentMonth) return null;
                    const dayEvts = getEventsForDate(cell.dateStr, cell.weekday);
                    const overflowCount = dayEvts.length - 2;
                    if (overflowCount <= 0) return null;

                    return (
                      <button
                        key={`overflow-${cell.dateStr}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDay(cell.dayNum);
                          onSetDisplayMode('timeline');
                        }}
                        style={{
                          gridColumn: `${col} / span 1`,
                          gridRow: 3,
                        }}
                        className="h-[20px] @sm:h-[22px] mx-0.5 @sm:mx-1 px-1.5 py-0.5 rounded-md text-[9px] @sm:text-[10px] font-medium theme-bg-elevated hover:theme-bg-surface theme-text-secondary hover:theme-text-primary transition-all cursor-pointer select-none pointer-events-auto flex items-center justify-center border-0 shadow-2xs truncate"
                        title={`${dayEvts.length} total items on this date. Click to view all in timeline.`}
                      >
                        +{overflowCount} more
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(CalendarMonthGridView);
