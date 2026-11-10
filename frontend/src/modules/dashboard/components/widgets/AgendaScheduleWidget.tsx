import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AgendaTaskRow } from '../../../academy/calendar-events';
import { resolveAgendaScheduleData } from '../../../academy/calendar-events/calendarDataResolver';
import {
  ClockIcon,
  PlusIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '../../../../components/ui/Icons';
import useDashboardCalendarSync from '../../hooks/useDashboardCalendarSync';

export interface AgendaScheduleWidgetProps {
  title?: string;
  className?: string;
}

export default function AgendaScheduleWidget({
  title = 'Daily Agenda & Schedule',
  className = '',
}: AgendaScheduleWidgetProps) {
  const navigate = useNavigate();
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const {
    events,
    activeTenantId,
    openDrawer,
  } = useDashboardCalendarSync('AGENDA');

  const resolved = useMemo(() => {
    return resolveAgendaScheduleData(events, selectedDate, activeTenantId);
  }, [events, selectedDate, activeTenantId]);

  const handleDateShift = (daysOffset: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + daysOffset);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const handleSetToday = () => {
    setSelectedDate(todayStr);
  };

  const handleAddItem = () => {
    openDrawer('schedule', {
      mode: 'add',
      date: selectedDate,
      category: 'ACADEMIC_EVENT',
    });
  };

  const handleNavigateToHub = () => {
    navigate('/academy/calendar-events?tab=AGENDA');
  };

  const formattedDateLabel = useMemo(() => {
    try {
      const parts = selectedDate.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  const isToday = selectedDate === todayStr;

  return (
    <div
      className={`p-5 rounded-3xl theme-bg-surface shadow-xs h-full flex flex-col justify-start space-y-4 select-none min-w-0 border-0 ${className}`}
    >
      {/* Top Header Row with Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <ClockIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold theme-text-primary leading-tight truncate">
              {title}
            </h3>
            <p className="text-[11px] theme-text-secondary mt-0.5 truncate">
              Day-by-day operational agenda, events & timeline checklist
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Add Item Button */}
          <button
            type="button"
            onClick={handleAddItem}
            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold theme-bg-accent theme-accent-text hover:brightness-105 transition-all flex items-center gap-1 cursor-pointer border-0 shadow-2xs"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Item</span>
          </button>

          {/* View Hub Shortcut */}
          <button
            type="button"
            onClick={handleNavigateToHub}
            className="text-xs font-semibold theme-accent-text hover:underline cursor-pointer flex items-center gap-1 border-0"
          >
            <span>Hub</span>
            <span className="text-[10px]">→</span>
          </button>
        </div>
      </div>

      {/* Date Navigation & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-2xl theme-bg-app border-0 shrink-0">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleDateShift(-1)}
            className="p-1.5 rounded-xl theme-text-secondary hover:theme-text-primary hover:theme-bg-surface transition-all cursor-pointer border-0"
            title="Previous Day"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>

          <span className="text-xs font-bold theme-text-primary px-2">
            {formattedDateLabel}
          </span>

          <button
            type="button"
            onClick={() => handleDateShift(1)}
            className="p-1.5 rounded-xl theme-text-secondary hover:theme-text-primary hover:theme-bg-surface transition-all cursor-pointer border-0"
            title="Next Day"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {!isToday && (
            <button
              type="button"
              onClick={handleSetToday}
              className="px-2.5 py-1 rounded-xl text-xs font-semibold theme-bg-surface theme-accent-text hover:theme-bg-elevated transition-all cursor-pointer border-0 shadow-2xs"
            >
              Today
            </button>
          )}

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              if (e.target.value) setSelectedDate(e.target.value);
            }}
            className="px-2 py-1 rounded-xl text-xs theme-bg-surface theme-text-primary border-0 cursor-pointer focus:outline-none"
          />
        </div>
      </div>

      {/* KPI Metric Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 shrink-0">
        {/* Total Items for Target Date */}
        <div className="p-3 rounded-2xl theme-bg-app border-0 flex items-center gap-2.5 min-w-0">
          <div className="w-2 h-2 rounded-full shrink-0 bg-purple-500" />
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider theme-text-secondary block truncate">
              Daily Agenda
            </span>
            <span className="text-xs font-bold theme-text-primary truncate block">
              {resolved.totalItemsCount} Scheduled Items
            </span>
          </div>
        </div>

        {/* Active Now */}
        <div className="p-3 rounded-2xl theme-bg-app border-0 flex items-center gap-2.5 min-w-0">
          <div className="w-2 h-2 rounded-full shrink-0 bg-emerald-500 animate-pulse" />
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider theme-text-secondary block truncate">
              Ongoing Now
            </span>
            <span className="text-xs font-bold theme-text-primary truncate block">
              {resolved.activeNowCount} Active Now
            </span>
          </div>
        </div>

        {/* Completed Items */}
        <div className="p-3 rounded-2xl theme-bg-app border-0 flex items-center gap-2.5 min-w-0">
          <div className="w-2 h-2 rounded-full shrink-0 bg-sky-500" />
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider theme-text-secondary block truncate">
              Completed
            </span>
            <span className="text-xs font-bold theme-text-primary truncate block">
              {resolved.completedCount} Elapsed Items
            </span>
          </div>
        </div>
      </div>

      {/* Actionable Agenda Task List */}
      <div className="flex-1 flex flex-col justify-start space-y-2 overflow-y-auto max-h-[460px] pr-0.5">
        {resolved.items.length === 0 ? (
          <div className="py-12 px-4 rounded-2xl theme-bg-app text-center flex flex-col items-center justify-center space-y-3 my-auto border-0">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div className="max-w-xs">
              <p className="text-xs font-semibold theme-text-primary">
                No scheduled agenda items for this day
              </p>
              <p className="text-[11px] theme-text-secondary mt-0.5">
                Add an operational event, meeting or milestone to keep your roster on track.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddItem}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold theme-bg-accent theme-accent-text hover:brightness-105 transition-all cursor-pointer border-0 shadow-2xs"
            >
              + Schedule Item
            </button>
          </div>
        ) : (
          resolved.items.map((item) => (
            <AgendaTaskRow
              key={item.id}
              item={item}
              onClick={() =>
                openDrawer('schedule', {
                  mode: 'detail',
                  eventId: item.id,
                  category: item.category,
                  date: selectedDate,
                })
              }
            />
          ))
        )}
      </div>
    </div>
  );
}

