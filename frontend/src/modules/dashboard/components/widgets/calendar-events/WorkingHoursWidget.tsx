import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MasterTimeCalendar } from '../../../../academy/calendar-events';
import {
  ClockIcon,
  PlusIcon,
} from '../../../../../components/ui/Icons';
import useDashboardCalendarSync from '../../../hooks/useDashboardCalendarSync';
import type { CalendarDisplayMode } from '../../../../academy/calendar-events/types';

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
    handleSaveEvent,
    handleDeleteEvent,
    openDrawer,
  } = useDashboardCalendarSync('WORKING_HOURS');

  const handleAddShift = () => {
    openDrawer('schedule', {
      mode: 'add',
      date: new Date().toISOString().split('T')[0],
      category: 'WORKING_HOURS',
    });
  };

  const handleNavigateToHub = () => {
    navigate('/academy/calendar-events?tab=WORKING_HOURS');
  };

  return (
    <div
      className={`p-5 rounded-3xl theme-bg-surface shadow-xs h-full flex flex-col justify-start space-y-3 select-none min-w-0 border-0 ${className}`}
    >
      {/* Top Header Row: Clean and minimal without All, Events, Shifts, Search, Grid, Timeline switches */}
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
              Operational work shifts, active roster coverage & weekly schedules
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
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

      {/* Main Calendar Engine: Directly rendered without top/bottom cards or internal search/view switches */}
      <div className="min-h-[460px] flex-1 flex flex-col justify-start">
        <MasterTimeCalendar
          events={events}
          selectedCategory="WORKING_HOURS"
          displayMode={effectiveDisplayMode}
          hideCategorySelector={true}
          hideSearch={true}
          hideViewModeToggle={true}
          embeddedSurface={true}
          onSaveEvent={handleSaveEvent}
          onDeleteEvent={handleDeleteEvent}
        />
      </div>
    </div>
  );
}
