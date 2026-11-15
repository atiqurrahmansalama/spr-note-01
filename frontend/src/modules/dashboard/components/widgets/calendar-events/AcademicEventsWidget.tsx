import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MasterTimeCalendar } from '../../../../academy/calendar-events';
import {
  CalendarIcon,
  PlusIcon,
} from '../../../../../components/ui/Icons';
import useDashboardCalendarSync from '../../../hooks/useDashboardCalendarSync';
import type { CalendarDisplayMode } from '../../../../academy/calendar-events/types';

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
    handleSaveEvent,
    handleDeleteEvent,
    openDrawer,
  } = useDashboardCalendarSync('ACADEMIC_EVENT');

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
      className={`p-3.5 @sm:p-5 rounded-3xl theme-bg-surface shadow-xs h-full flex flex-col justify-start space-y-2.5 @sm:space-y-3 select-none min-w-0 border-0 @container ${className}`}
    >
      {/* Top Header Row: Clean and minimal without All, Events, Shifts, Search, Grid, Timeline switches */}
      <div className="flex items-center justify-between gap-2 pb-1 shrink-0">
        <div className="flex items-center gap-2 @sm:gap-2.5 min-w-0">
          <div className="w-7 h-7 @sm:w-8 @sm:h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <CalendarIcon className="w-3.5 h-3.5 @sm:w-4 @sm:h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs @sm:text-sm font-bold theme-text-primary leading-tight truncate">
              {title}
            </h3>
            <p className="hidden @[380px]:block text-[10px] @sm:text-[11px] theme-text-secondary mt-0.5 truncate">
              Term examinations, institutional milestones & scheduled events
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Add Event Button */}
          <button
            type="button"
            onClick={handleAddEvent}
            className="px-2 py-1 @sm:px-2.5 @sm:py-1.5 rounded-xl text-[11px] @sm:text-xs font-semibold theme-bg-accent theme-accent-text hover:brightness-105 transition-all flex items-center gap-1 cursor-pointer border-0 shadow-2xs"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span className="hidden @[320px]:inline">New Event</span>
          </button>

          {/* View Hub Shortcut */}
          <button
            type="button"
            onClick={handleNavigateToHub}
            className="text-[11px] @sm:text-xs font-semibold theme-accent-text hover:underline cursor-pointer flex items-center gap-0.5 border-0"
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
          selectedCategory="ACADEMIC_EVENT"
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
