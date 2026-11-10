import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MasterTimeCalendar } from '../../../academy/calendar-events';
import { masterCalendarStore } from '../../../../utils/localStore';
import { useTenant } from '../../../../context/TenantContext';
import { useRightSidebar } from '../../../../context/RightSidebarContext';
import { CalendarIcon, PlusIcon } from '../../../../components/ui/Icons';
import type { CalendarDisplayMode } from '../../../academy/calendar-events/types';

export interface AcademicCalendarWidgetProps {
  defaultCategory?: 'ALL' | 'ACADEMIC_EVENT' | 'WORKING_HOURS';
  defaultViewMode?: 'month' | 'list';
  displayMode?: CalendarDisplayMode;
  title?: string;
  className?: string;
}

/**
 * Enterprise Academic Calendar & Events Dashboard Widget
 * 
 * Reuses the canonical MasterTimeCalendar directly from Calendar & Events (Single Source of Truth).
 * Connects directly to masterCalendarStore and tenant updates.
 * Zero duplicated logic, zero internal switch clutter.
 */
export default function AcademicCalendarWidget({
  defaultCategory = 'ACADEMIC_EVENT',
  defaultViewMode = 'month',
  displayMode = 'grid',
  title = 'Academic Calendar & Events',
  className = '',
}: AcademicCalendarWidgetProps) {
  const { activeTenantId } = useTenant();
  const navigate = useNavigate();
  const { openDrawer } = useRightSidebar();
  const [events, setEvents] = useState<any[]>([]);

  const loadEvents = useCallback(() => {
    try {
      const data = masterCalendarStore.getEvents(activeTenantId);
      setEvents(data || []);
    } catch {
      setEvents([]);
    }
  }, [activeTenantId]);

  useEffect(() => {
    loadEvents();
    window.addEventListener('spr_calendar_events_updated', loadEvents);
    window.addEventListener('spr_tenant_changed', loadEvents);
    return () => {
      window.removeEventListener('spr_calendar_events_updated', loadEvents);
      window.removeEventListener('spr_tenant_changed', loadEvents);
    };
  }, [loadEvents]);

  const handleOpenAdd = () => {
    openDrawer('schedule', {
      mode: 'add',
      date: new Date().toISOString().split('T')[0],
      category: defaultCategory === 'ALL' ? 'ACADEMIC_EVENT' : defaultCategory,
    });
  };

  const handleSaveEvent = (savedEvent: any) => {
    masterCalendarStore.saveEvent(activeTenantId, savedEvent);
    loadEvents();
  };

  const handleDeleteEvent = (eventId: any) => {
    masterCalendarStore.deleteEvent(activeTenantId, eventId);
    loadEvents();
  };

  return (
    <div className={`p-5 rounded-3xl theme-bg-surface shadow-xs h-full flex flex-col justify-start space-y-4 select-none min-w-0 border-0 ${className}`}>
      {/* Top Header Row: Clean and minimal without All, Events, Shifts, Search, Grid, Timeline switches */}
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
              Academic milestones & institutional schedules
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Add Event Button */}
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold theme-bg-accent theme-accent-text hover:brightness-105 transition-all flex items-center gap-1 cursor-pointer border-0 shadow-2xs"
            title="Add Schedule or Academic Event"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Event</span>
          </button>

          {/* Full Calendar Hub Shortcut */}
          <button
            type="button"
            onClick={() => navigate('/academy/calendar-events')}
            className="text-xs font-semibold theme-accent-text hover:underline cursor-pointer flex items-center gap-1 border-0"
            title="Open Full Calendar & Events Console"
          >
            <span>Hub</span>
            <span className="text-[10px]">→</span>
          </button>
        </div>
      </div>

      {/* Embedded Master Calendar Engine without internal search, category selector or view switches */}
      <div className="min-h-[460px] flex-1 flex flex-col justify-start">
        <MasterTimeCalendar
          events={events}
          selectedCategory={defaultCategory}
          viewMode={defaultViewMode}
          displayMode={displayMode}
          hideCategorySelector={true}
          hideSearch={true}
          hideViewModeToggle={true}
          onSaveEvent={handleSaveEvent}
          onDeleteEvent={handleDeleteEvent}
        />
      </div>
    </div>
  );
}
