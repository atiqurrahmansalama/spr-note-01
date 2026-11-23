import React, { Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarIcon } from '../../../../../components/ui/Icons';
import useDashboardCalendarSync from '../../../hooks/useDashboardCalendarSync';

// Code-split heavy MasterTimeCalendar asynchronously to avoid blocking the dashboard main thread
const MasterTimeCalendar = React.lazy(() =>
  import('../../../../academy/calendar-events').then((m) => ({
    default: m.MasterTimeCalendar,
  }))
);

function CalendarWidgetSkeleton() {
  return (
    <div className="w-full h-full min-h-[240px] rounded-2xl theme-bg-app/40 animate-pulse flex flex-col p-3 space-y-3">
      <div className="h-4 w-28 rounded-md theme-bg-app" />
      <div className="space-y-2 flex-1">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl theme-bg-app/50 h-14" />
        ))}
      </div>
    </div>
  );
}

export interface AgendaScheduleWidgetProps {
  title?: string;
  className?: string;
}

export default function AgendaScheduleWidget({
  title = 'Daily Agenda & Schedule',
  className = '',
}: AgendaScheduleWidgetProps) {
  const navigate = useNavigate();
  const { events, handleSaveEvent, handleDeleteEvent } = useDashboardCalendarSync('ALL');

  const handleNavigateToHub = () => {
    navigate('/academy/calendar-events?tab=AGENDA');
  };

  return (
    <div
      className={`@container p-4 @sm:p-5 rounded-3xl theme-bg-surface shadow-xs h-full flex flex-col justify-start space-y-3 select-none min-w-0 border-0 ${className}`}
    >
      {/* Top Header Row with dignified icon, title, and "Detail View" text link */}
      <div className="flex items-center justify-between gap-2 pb-1 shrink-0">
        <div className="flex items-center gap-2 @sm:gap-2.5 min-w-0">
          <div className="w-7 h-7 @sm:w-8 @sm:h-8 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0">
            <CalendarIcon className="w-3.5 h-3.5 @sm:w-4 @sm:h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs @sm:text-sm font-bold theme-text-primary leading-tight truncate">
              {title}
            </h3>
            {/* Subtitle hidden on very narrow containers (< 480px) for seamless 1-column scalability */}
            <p className="hidden @[480px]:block text-[10px] @sm:text-[11px] theme-text-secondary mt-0.5 truncate">
              Day-by-day operational agenda, events & timeline schedule
            </p>
          </div>
        </div>

        {/* Action Control: Pure text button "Detail View" (No hard colors, no Add Item) */}
        <button
          type="button"
          onClick={handleNavigateToHub}
          className="px-1.5 py-1 text-[11px] @sm:text-xs font-semibold theme-text-secondary hover:theme-text-primary hover:underline transition-colors cursor-pointer border-0 bg-transparent select-none shrink-0"
        >
          Detail View
        </button>
      </div>

      {/* Main Agenda Engine: Directly reuses MasterTimeCalendar */}
      <div className="min-h-0 flex-1 flex flex-col justify-start overflow-y-auto">
        <Suspense fallback={<CalendarWidgetSkeleton />}>
          <MasterTimeCalendar
            events={events}
            selectedCategory="AGENDA"
            hideControlBar={true}
            hideCategorySelector={true}
            hideSearch={true}
            hideViewModeToggle={true}
            embeddedSurface={true}
            readOnly={true}
            canAddEvents={false}
            canAddWorkingHours={false}
            showPersonalTasks={false}
            onSaveEvent={handleSaveEvent}
            onDeleteEvent={handleDeleteEvent}
          />
        </Suspense>
      </div>
    </div>
  );
}
