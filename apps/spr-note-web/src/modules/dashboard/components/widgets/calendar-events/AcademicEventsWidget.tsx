import React, { Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarIcon,
  PlusIcon,
} from '../../../../../components/ui/Icons';
import useDashboardCalendarSync from '../../../hooks/useDashboardCalendarSync';
import type { CalendarDisplayMode } from '../../../../academy/calendar-events/types';

// Code-split heavy MasterTimeCalendar asynchronously to avoid blocking the dashboard main thread
const MasterTimeCalendar = React.lazy(() =>
  import('../../../../academy/calendar-events').then((m) => ({
    default: m.MasterTimeCalendar,
  }))
);

function CalendarWidgetSkeleton() {
  return (
    <div className="w-full h-full min-h-[360px] rounded-2xl theme-bg-app/40 animate-pulse flex flex-col p-3 space-y-3">
      <div className="flex items-center justify-between pb-2">
        <div className="h-4 w-28 rounded-md theme-bg-app" />
        <div className="h-6 w-20 rounded-md theme-bg-app" />
      </div>
      <div className="grid grid-cols-7 gap-1.5 flex-1">
        {[...Array(28)].map((_, i) => (
          <div key={i} className="rounded-xl theme-bg-app/50 h-12" />
        ))}
      </div>
    </div>
  );
}

export interface AcademicEventsWidgetProps {
  displayMode?: CalendarDisplayMode;
  initialDisplayMode?: CalendarDisplayMode;
  showTasks?: boolean;
  title?: string;
  className?: string;
  [key: string]: any;
}

export default function AcademicEventsWidget({
  displayMode: propDisplayMode,
  initialDisplayMode = 'grid',
  showTasks: propShowTasks,
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

  // Tasks visibility is strictly governed by Workspace Customizer setting
  const effectiveShowTasks = propShowTasks !== undefined ? propShowTasks : true;

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
      className={`p-3.5 @sm:p-5 rounded-3xl theme-bg-surface shadow-xs h-auto @[640px]:h-full flex flex-col justify-start space-y-2.5 @sm:space-y-3 select-none min-w-0 border-0 @container ${className}`}
    >
      {/* Top Header Row: Clean and minimal without All, Events, Shifts, Search, Grid, Timeline switches */}
      <div className="flex items-center justify-between gap-2 pb-1 shrink-0">
        <div className="flex items-center gap-2 @sm:gap-2.5 min-w-0">
          <div className="w-7 h-7 @sm:w-8 @sm:h-8 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0">
            <CalendarIcon className="w-3.5 h-3.5 @sm:w-4 @sm:h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs @sm:text-sm font-bold theme-text-primary leading-tight truncate">
              {title}
            </h3>
            {/* Subtitle hidden from mid screen down (< 820px) */}
            <p className="hidden @[820px]:block text-[10px] @sm:text-[11px] theme-text-secondary mt-0.5 truncate">
              Term examinations, institutional milestones & scheduled events
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 @sm:gap-2 shrink-0">
          {/* Main Page Navigation: Pure text button placed BEFORE Add button (No hard white) */}
          <button
            type="button"
            onClick={handleNavigateToHub}
            className="px-1.5 py-1 text-[11px] @sm:text-xs font-semibold theme-text-secondary hover:theme-text-primary hover:underline transition-colors cursor-pointer border-0 bg-transparent select-none shrink-0"
          >
            Full View
          </button>

          {/* Add Event Button (Short 'Add' on small screens) */}
          <button
            type="button"
            onClick={handleAddEvent}
            className="px-2 py-1 @sm:px-2.5 @sm:py-1.5 rounded-xl text-[11px] @sm:text-xs font-semibold theme-bg-accent theme-accent-text hover:brightness-105 transition-all flex items-center gap-1 cursor-pointer border-0 shadow-2xs shrink-0"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span className="inline @[480px]:hidden">Add</span>
            <span className="hidden @[480px]:inline">New Event</span>
          </button>
        </div>
      </div>

      {/* Main Calendar Engine: Responsive height without empty bottom void on small screens */}
      <div className="min-h-0 @[640px]:min-h-[420px] flex-1 flex flex-col justify-start">
        <Suspense fallback={<CalendarWidgetSkeleton />}>
          <MasterTimeCalendar
            events={events}
            selectedCategory="ACADEMIC_EVENT"
            displayMode={effectiveDisplayMode}
            hideCategorySelector={true}
            hideSearch={true}
            hideViewModeToggle={true}
            embeddedSurface={true}
            showPersonalTasks={effectiveShowTasks}
            onSaveEvent={handleSaveEvent}
            onDeleteEvent={handleDeleteEvent}
          />
        </Suspense>
      </div>
    </div>
  );
}
