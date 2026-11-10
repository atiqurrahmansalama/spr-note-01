import React, { useState, useEffect, useCallback } from 'react';
import { masterCalendarStore } from '../../../utils/localStore';
import { useTenant } from '../../../context/TenantContext';
import { useRightSidebar, useDrawerRegistration } from '../../../context/RightSidebarContext';
import {
  TimeScheduleDrawerForm,
  TimeScheduleDetailDrawer,
} from '../../academy/calendar-events';
import WeeklyHolidaySettingsPanel from '../../academy/calendar-events/work-schedule/WeeklyHolidaySettingsPanel';
import type { CalendarEvent } from '../../academy/calendar-events/types';

export function useDashboardCalendarSync(defaultCategory: 'WORKING_HOURS' | 'ACADEMIC_EVENT' | 'AGENDA' | 'ALL' = 'ALL') {
  const { activeTenantId } = useTenant();
  const { openDrawer, closeDrawer } = useRightSidebar();
  const [events, setEvents] = useState<CalendarEvent[]>([]);

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

  const handleSaveEvent = useCallback((savedEvent: CalendarEvent) => {
    masterCalendarStore.saveEvent(activeTenantId, savedEvent);
    loadEvents();
  }, [activeTenantId, loadEvents]);

  const handleDeleteEvent = useCallback((eventIdOrDeleteInfo: any) => {
    masterCalendarStore.deleteEvent(activeTenantId, eventIdOrDeleteInfo);
    loadEvents();
  }, [activeTenantId, loadEvents]);

  // Universal Drawer Registration for Calendar/Schedule details and editing
  useDrawerRegistration(
    'schedule',
    (params?: any) => {
      const mode = params?.mode || 'detail';
      const eventId = params?.eventId;
      const targetDate = params?.date || new Date().toISOString().split('T')[0];
      const targetCategory = params?.category || (defaultCategory === 'ALL' || defaultCategory === 'AGENDA' ? 'ACADEMIC_EVENT' : defaultCategory);

      const foundEvent = events.find((e) => e.id === eventId) || null;
      const isWorkingHours = (foundEvent?.category || targetCategory) === 'WORKING_HOURS';

      if (mode === 'detail' && foundEvent) {
        return {
          title: isWorkingHours ? 'Working Hours Details' : 'Academic Event Details',
          category: 'Schedule & Calendar',
          size: 'md' as const,
          content: (
            <TimeScheduleDetailDrawer
              event={foundEvent}
              currentDate={targetDate}
              initialDate={targetDate}
              onEdit={() => {
                openDrawer('schedule', {
                  mode: 'edit',
                  eventId: foundEvent.id,
                  category: foundEvent.category,
                  date: targetDate,
                });
              }}
              onDelete={(deleteInfo: any) => {
                handleDeleteEvent(deleteInfo || foundEvent.id);
                closeDrawer();
              }}
              onClose={closeDrawer}
            />
          ),
        };
      }

      return {
        title: mode === 'add'
          ? (isWorkingHours ? 'Add Working Hours' : 'Add Academic Event')
          : 'Edit Schedule / Event',
        category: 'Schedule & Calendar',
        size: 'md' as const,
        content: (
          <TimeScheduleDrawerForm
            key={`dashboard-schedule-form-${mode}-${eventId || 'new'}-${targetDate}-${targetCategory}`}
            event={foundEvent}
            initialDate={targetDate}
            defaultCategory={targetCategory}
            onSave={(savedData: any) => {
              handleSaveEvent(savedData);
              closeDrawer();
            }}
            onCancel={closeDrawer}
          />
        ),
      };
    },
    [events, defaultCategory, handleSaveEvent, handleDeleteEvent, openDrawer, closeDrawer]
  );

  // Universal Drawer Registration for Weekly Holidays
  useDrawerRegistration(
    'weekly-holidays',
    () => ({
      title: 'Weekly Holidays & Weekends',
      category: 'Schedule & Calendar',
      size: 'lg' as const,
      content: (
        <div className="p-4 sm:p-6">
          <WeeklyHolidaySettingsPanel activeTenantId={activeTenantId} />
        </div>
      ),
    }),
    [activeTenantId]
  );

  return {
    events,
    activeTenantId,
    loadEvents,
    handleSaveEvent,
    handleDeleteEvent,
    openDrawer,
    closeDrawer,
  };
}

export default useDashboardCalendarSync;
