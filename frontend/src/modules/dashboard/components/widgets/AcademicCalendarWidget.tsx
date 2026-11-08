import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MasterTimeCalendar } from '../../../academy/calendar-events';
import { masterCalendarStore } from '../../../../utils/localStore';
import { useTenant } from '../../../../context/TenantContext';
import { useRightSidebar } from '../../../../context/RightSidebarContext';
import { CalendarIcon, PlusIcon, ChevronIcon } from '../../../../components/ui/Icons';

export interface AcademicCalendarWidgetProps {
  defaultCategory?: 'ALL' | 'ACADEMIC_EVENT' | 'WORKING_HOURS';
  defaultViewMode?: 'month' | 'list';
  title?: string;
  className?: string;
}

/**
 * Enterprise Academic Calendar & Events Dashboard Widget
 * 
 * Reuses the canonical MasterTimeCalendar directly from Calendar & Events (Single Source of Truth).
 * Connects directly to masterCalendarStore and tenant updates.
 * Zero duplicated logic or hardcoded mock schedules.
 */
export default function AcademicCalendarWidget({
  defaultCategory = 'ALL',
  defaultViewMode = 'month',
  title = 'Academic Calendar & Events',
  className = '',
}: AcademicCalendarWidgetProps) {
  const { activeTenantId } = useTenant();
  const navigate = useNavigate();
  const { openDrawer } = useRightSidebar();
  const [events, setEvents] = useState<any[]>([]);
  const [category, setCategory] = useState<'ALL' | 'ACADEMIC_EVENT' | 'WORKING_HOURS'>(defaultCategory);

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
      category: category === 'ALL' ? 'ACADEMIC_EVENT' : category,
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
    <div className={`p-5 rounded-2xl theme-bg-surface shadow-xs h-full flex flex-col justify-start space-y-4 select-none min-w-0 ${className}`}>
      {/* Top Header Row with Category Filters and Open Full Hub Link */}
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
              Academic milestones, shifts & institutional schedules
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Quick Category Filter Pills */}
          <div className="flex items-center gap-1 p-0.5 rounded-xl theme-bg-sub/60 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setCategory('ALL')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                category === 'ALL'
                  ? 'theme-bg-accent theme-accent-text shadow-2xs font-bold'
                  : 'theme-text-secondary hover:theme-text-primary'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setCategory('ACADEMIC_EVENT')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                category === 'ACADEMIC_EVENT'
                  ? 'theme-bg-accent theme-accent-text shadow-2xs font-bold'
                  : 'theme-text-secondary hover:theme-text-primary'
              }`}
            >
              Events
            </button>
            <button
              type="button"
              onClick={() => setCategory('WORKING_HOURS')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                category === 'WORKING_HOURS'
                  ? 'theme-bg-accent theme-accent-text shadow-2xs font-bold'
                  : 'theme-text-secondary hover:theme-text-primary'
              }`}
            >
              Shifts
            </button>
          </div>

          {/* Add Event Button */}
          <button
            type="button"
            onClick={handleOpenAdd}
            className="p-1.5 rounded-xl theme-bg-sub/60 hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary transition-all cursor-pointer"
            title="Add Schedule or Academic Event"
          >
            <PlusIcon className="w-4 h-4" />
          </button>

          {/* Full Calendar Hub Shortcut */}
          <button
            type="button"
            onClick={() => navigate('/academy/calendar-events')}
            className="px-3 py-1.5 rounded-xl theme-bg-sub/60 hover:theme-bg-elevated text-xs font-semibold theme-text-primary transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
            title="Open Full Calendar & Events Console"
          >
            <span>Console</span>
            <span className="text-[10px]">→</span>
          </button>
        </div>
      </div>

      {/* Embedded Master Calendar Engine directly from Calendar & Events */}
      <div className="flex-1 w-full min-w-0 min-h-[380px]">
        <MasterTimeCalendar
          events={events}
          selectedCategory={category}
          viewMode={defaultViewMode}
          readOnly={false}
          onSaveEvent={handleSaveEvent}
          onDeleteEvent={handleDeleteEvent}
          onDateSelect={() => {}}
          onDisplayModeChange={() => {}}
          className="w-full h-full"
        />
      </div>
    </div>
  );
}
