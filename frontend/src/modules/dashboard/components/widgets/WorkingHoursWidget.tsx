import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MasterTimeCalendar, WorkingShiftRow } from '../../../academy/calendar-events';
import { resolveWorkingHoursData } from '../../../academy/calendar-events/calendarDataResolver';
import {
  ClockIcon,
  PlusIcon,
} from '../../../../components/ui/Icons';
import useDashboardCalendarSync from '../../hooks/useDashboardCalendarSync';
import type { CalendarDisplayMode } from '../../../academy/calendar-events/types';

export interface WorkingHoursWidgetProps {
  displayMode?: CalendarDisplayMode;
  initialDisplayMode?: CalendarDisplayMode;
  title?: string;
  className?: string;
  [key: string]: any;
}

export default function WorkingHoursWidget({
  displayMode: propDisplayMode,
  initialDisplayMode = 'grid',
  title = 'Working Hours & Shifts',
  className = '',
}: WorkingHoursWidgetProps) {
  const navigate = useNavigate();
  // View mode is strictly governed by Workspace Customizer settings
  const effectiveDisplayMode: CalendarDisplayMode = propDisplayMode || initialDisplayMode || 'grid';

  const {
    events,
    activeTenantId,
    handleSaveEvent,
    handleDeleteEvent,
    openDrawer,
  } = useDashboardCalendarSync('WORKING_HOURS');

  const resolved = React.useMemo(() => {
    return resolveWorkingHoursData(events, activeTenantId);
  }, [events, activeTenantId]);

  const handleAddShift = () => {
    openDrawer('schedule', {
      mode: 'add',
      date: new Date().toISOString().split('T')[0],
      category: 'WORKING_HOURS',
    });
  };

  const handleOpenHolidays = () => {
    openDrawer('weekly-holidays', { academyScope: activeTenantId });
  };

  const handleNavigateToHub = () => {
    navigate('/academy/calendar-events?tab=WORKING_HOURS');
  };

  return (
    <div
      className={`p-5 rounded-3xl theme-bg-surface shadow-xs h-full flex flex-col justify-start space-y-4 select-none min-w-0 border-0 ${className}`}
    >
      {/* Top Header Row: Clean, uncluttered layout without any Grid/Timeline/Category/Search switches */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <ClockIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold theme-text-primary leading-tight truncate">
              {title}
            </h3>
            <p className="text-[11px] theme-text-secondary mt-0.5 truncate">
              Operational work shifts, active roster coverage & weekly holidays
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Configure Holidays Button */}
          <button
            type="button"
            onClick={handleOpenHolidays}
            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold theme-bg-app hover:theme-bg-elevated/60 theme-text-secondary hover:theme-text-primary transition-all cursor-pointer border-0"
            title="Configure Weekly Holidays"
          >
            Holidays ({resolved.weeklyHolidays.length})
          </button>

          {/* Add Shift Button */}
          <button
            type="button"
            onClick={handleAddShift}
            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold theme-bg-accent theme-accent-text hover:brightness-105 transition-all flex items-center gap-1 cursor-pointer border-0 shadow-2xs"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Shift</span>
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
        {/* Active Shift Card */}
        <div className="p-3 rounded-2xl theme-bg-app border-0 flex items-center gap-2.5 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full shrink-0 bg-emerald-500 animate-pulse" />
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider theme-text-secondary block truncate">
              Active Shift
            </span>
            <span className="text-xs font-bold theme-text-primary truncate block">
              {resolved.activeShift
                ? `${resolved.activeShift.title} (${resolved.activeShift.startTime} - ${resolved.activeShift.endTime})`
                : 'No Active Shift Right Now'}
            </span>
          </div>
        </div>

        {/* Weekly Workdays Card */}
        <div className="p-3 rounded-2xl theme-bg-app border-0 flex items-center gap-2.5 min-w-0">
          <div className="w-2 h-2 rounded-full shrink-0 bg-sky-500" />
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider theme-text-secondary block truncate">
              Weekly Coverage
            </span>
            <span className="text-xs font-bold theme-text-primary truncate block">
              {resolved.weeklyWorkDaysCount} Days / Week Active
            </span>
          </div>
        </div>

        {/* Weekly Holidays Card */}
        <div className="p-3 rounded-2xl theme-bg-app border-0 flex items-center gap-2.5 min-w-0">
          <div className="w-2 h-2 rounded-full shrink-0 bg-amber-500" />
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider theme-text-secondary block truncate">
              Weekly Holidays
            </span>
            <span className="text-xs font-bold theme-text-primary truncate block">
              {resolved.weeklyHolidays.length > 0 ? resolved.weeklyHolidays.join(', ') : 'None Configured'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Calendar Engine: Completely clean without internal search, category selector or view switches */}
      <div className="min-h-[420px] flex-1 flex flex-col justify-start">
        <MasterTimeCalendar
          events={events}
          selectedCategory="WORKING_HOURS"
          displayMode={effectiveDisplayMode}
          hideCategorySelector={true}
          hideSearch={true}
          hideViewModeToggle={true}
          onSaveEvent={handleSaveEvent}
          onDeleteEvent={handleDeleteEvent}
        />
      </div>

      {/* Today's / Active Shift Roster Preview */}
      {resolved.todayShifts.length > 0 && (
        <div className="pt-2 border-t theme-border/30 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold theme-text-secondary">
              Configured Shifts ({resolved.totalShiftsCount})
            </span>
            <button
              type="button"
              onClick={handleNavigateToHub}
              className="text-[11px] font-medium theme-accent-text hover:underline"
            >
              Manage all shifts
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {resolved.todayShifts.slice(0, 3).map((shift) => (
              <WorkingShiftRow
                key={shift.id}
                shift={shift}
                onClick={() =>
                  openDrawer('schedule', {
                    mode: 'detail',
                    eventId: shift.id,
                    category: 'WORKING_HOURS',
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
