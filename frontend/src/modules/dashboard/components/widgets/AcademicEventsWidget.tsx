import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MasterTimeCalendar, AcademicEventCard } from '../../../academy/calendar-events';
import { resolveAcademicEventsData } from '../../../academy/calendar-events/calendarDataResolver';
import {
  CalendarIcon,
  PlusIcon,
} from '../../../../components/ui/Icons';
import useDashboardCalendarSync from '../../hooks/useDashboardCalendarSync';
import type { CalendarDisplayMode } from '../../../academy/calendar-events/types';

export interface AcademicEventsWidgetProps {
  displayMode?: CalendarDisplayMode;
  initialDisplayMode?: CalendarDisplayMode;
  title?: string;
  className?: string;
  [key: string]: any;
}

export default function AcademicEventsWidget({
  displayMode: propDisplayMode,
  initialDisplayMode = 'grid',
  title = 'Academic Events & Milestones',
  className = '',
}: AcademicEventsWidgetProps) {
  const navigate = useNavigate();
  // View mode is strictly governed by Workspace Customizer settings
  const effectiveDisplayMode: CalendarDisplayMode = propDisplayMode || initialDisplayMode || 'grid';

  const {
    events,
    activeTenantId,
    handleSaveEvent,
    handleDeleteEvent,
    openDrawer,
  } = useDashboardCalendarSync('ACADEMIC_EVENT');

  const resolved = React.useMemo(() => {
    return resolveAcademicEventsData(events, activeTenantId);
  }, [events, activeTenantId]);

  const handleAddEvent = () => {
    openDrawer('schedule', {
      mode: 'add',
      date: new Date().toISOString().split('T')[0],
      category: 'ACADEMIC_EVENT',
    });
  };

  const handleNavigateToHub = () => {
    navigate('/academy/calendar-events?tab=ACADEMIC_EVENT');
  };

  return (
    <div
      className={`p-5 rounded-3xl theme-bg-surface shadow-xs h-full flex flex-col justify-start space-y-4 select-none min-w-0 border-0 ${className}`}
    >
      {/* Top Header Row: Clean, uncluttered layout without any Grid/Timeline/Category/Search switches */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold theme-text-primary leading-tight truncate">
              {title}
            </h3>
            <p className="text-[11px] theme-text-secondary mt-0.5 truncate">
              Term examinations, institutional milestones & scheduled events
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Add Event Button */}
          <button
            type="button"
            onClick={handleAddEvent}
            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold theme-bg-accent theme-accent-text hover:brightness-105 transition-all flex items-center gap-1 cursor-pointer border-0 shadow-2xs"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Event</span>
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

      {/* KPI Metric Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 shrink-0">
        {/* Total Events Count */}
        <div className="p-3 rounded-2xl theme-bg-app border-0 flex items-center gap-2.5 min-w-0">
          <div className="w-2 h-2 rounded-full shrink-0 bg-sky-500" />
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider theme-text-secondary block truncate">
              Scheduled Events
            </span>
            <span className="text-xs font-bold theme-text-primary truncate block">
              {resolved.totalEventsCount} Recorded Milestones
            </span>
          </div>
        </div>

        {/* Exams Count */}
        <div className="p-3 rounded-2xl theme-bg-app border-0 flex items-center gap-2.5 min-w-0">
          <div className="w-2 h-2 rounded-full shrink-0 bg-rose-500" />
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider theme-text-secondary block truncate">
              Examinations
            </span>
            <span className="text-xs font-bold theme-text-primary truncate block">
              {resolved.examCount} Scheduled Exams
            </span>
          </div>
        </div>

        {/* Holidays Count */}
        <div className="p-3 rounded-2xl theme-bg-app border-0 flex items-center gap-2.5 min-w-0">
          <div className="w-2 h-2 rounded-full shrink-0 bg-emerald-500" />
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider theme-text-secondary block truncate">
              Term Holidays
            </span>
            <span className="text-xs font-bold theme-text-primary truncate block">
              {resolved.holidayCount} Declared Breaks
            </span>
          </div>
        </div>
      </div>

      {/* Main Calendar Engine: Completely clean without internal search, category selector or view switches */}
      <div className="min-h-[420px] flex-1 flex flex-col justify-start">
        <MasterTimeCalendar
          events={events}
          selectedCategory="ACADEMIC_EVENT"
          displayMode={effectiveDisplayMode}
          hideCategorySelector={true}
          hideSearch={true}
          hideViewModeToggle={true}
          onSaveEvent={handleSaveEvent}
          onDeleteEvent={handleDeleteEvent}
        />
      </div>

      {/* Upcoming Events Feed Preview */}
      {resolved.upcomingEvents.length > 0 && (
        <div className="pt-2 border-t theme-border/30 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold theme-text-secondary">
              Upcoming Events & Countdowns ({resolved.upcomingEvents.length})
            </span>
            <button
              type="button"
              onClick={handleNavigateToHub}
              className="text-[11px] font-medium theme-accent-text hover:underline"
            >
              View full list
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {resolved.upcomingEvents.slice(0, 3).map((item) => (
              <AcademicEventCard
                key={item.id}
                event={item}
                showHijri={true}
                onClick={() =>
                  openDrawer('schedule', {
                    mode: 'detail',
                    eventId: item.id,
                    category: 'ACADEMIC_EVENT',
                  })
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
