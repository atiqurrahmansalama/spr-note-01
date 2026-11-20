import React, { useState, useEffect, useCallback } from 'react';
import { masterCalendarStore } from '../../../utils/localStore';
import { useTenant } from '../../../context/TenantContext';
import { useRightSidebar, useDrawerRegistration } from '../../../context/RightSidebarContext';
import { useFeatureControl } from '../../../context/FeatureControlContext';
import AccessDeniedView from '../../../components/common/AccessDeniedView';
import {
  TimeScheduleDrawerForm,
  TimeScheduleDetailDrawer,
} from '../../academy/calendar-events';
import WeeklyHolidaySettingsPanel from '../../academy/calendar-events/work-schedule/WeeklyHolidaySettingsPanel';
import type { CalendarEvent } from '../../academy/calendar-events/types';

export function useDashboardCalendarSync(defaultCategory: 'WORKING_HOURS' | 'ACADEMIC_EVENT' | 'AGENDA' | 'ALL' = 'ALL') {
  const { activeTenantId } = useTenant();
  const { openDrawer, closeDrawer } = useRightSidebar();
  const { isSectionEnabled } = useFeatureControl();
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const canAddWorkingHours = isSectionEnabled('calendar_add_working_hours');
  const canAddEvents = isSectionEnabled('calendar_add_events');

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
    if ((savedEvent as any)?.id) {
      masterCalendarStore.updateEvent(activeTenantId, (savedEvent as any).id, savedEvent);
    } else {
      masterCalendarStore.addEvent(activeTenantId, savedEvent);
    }
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
      const getParam = (key: string) => {
        if (!params) return null;
        if (typeof params.get === 'function') return params.get(key);
        return params[key] !== undefined ? params[key] : null;
      };

      const eventId = getParam('eventId') || getParam('id');
      const mode = getParam('mode') || (eventId ? 'detail' : 'add');
      const targetDate = getParam('date') || new Date().toISOString().split('T')[0];
      const explicitCategory = getParam('category');
      const targetCategory = (explicitCategory && explicitCategory !== 'ALL' && explicitCategory !== 'AGENDA')
        ? explicitCategory
        : (defaultCategory === 'ALL' || defaultCategory === 'AGENDA' ? 'ACADEMIC_EVENT' : defaultCategory);

      // Search in events state or directly from masterCalendarStore (Only in detail/edit modes)
      let foundEvent = (mode !== 'add' && eventId) ? events.find((e) => String(e.id) === String(eventId)) : null;
      if (!foundEvent && mode !== 'add' && eventId) {
        try {
          const stored = masterCalendarStore.getEvents(activeTenantId);
          foundEvent = stored?.find((e: any) => String(e.id) === String(eventId)) || null;
        } catch {}
      }
      const isWorkingHours = mode === 'add'
        ? targetCategory === 'WORKING_HOURS'
        : (foundEvent?.category || targetCategory) === 'WORKING_HOURS';
      const canEditCategory = isWorkingHours ? canAddWorkingHours : canAddEvents;

      // Zero-Trust Security Guard: Block unauthorized add/edit attempts from dashboard widgets
      if ((mode === 'add' || mode === 'edit') && !canEditCategory) {
        return {
          title: isWorkingHours ? 'Working Hours Restricted' : 'Academic Events Restricted',
          category: 'Schedule & Calendar',
          size: 'md' as const,
          content: (
            <AccessDeniedView
              variant="drawer"
              title={
                isWorkingHours
                  ? 'Working Hours Modification Restricted'
                  : 'Academic Event Modification Restricted'
              }
              message="You do not have permission to add or modify this schedule. Please contact your institution administrator."
              sectionKey={isWorkingHours ? 'calendar_add_working_hours' : 'calendar_add_events'}
              onClose={closeDrawer}
            />
          ),
        };
      }

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
              readOnly={!canEditCategory}
              onEdit={canEditCategory ? () => {
                openDrawer('schedule', {
                  mode: 'edit',
                  eventId: foundEvent.id,
                  category: foundEvent.category,
                  date: targetDate,
                });
              } : undefined}
              onDelete={canEditCategory ? (deleteInfo: any) => {
                handleDeleteEvent(deleteInfo || foundEvent.id);
                closeDrawer();
              } : undefined}
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
            key={`dashboard-schedule-form-${mode}-${mode === 'add' ? 'new' : (eventId || 'new')}-${targetDate}-${targetCategory}`}
            event={mode === 'add' ? null : foundEvent}
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
    [events, defaultCategory, canAddWorkingHours, canAddEvents, handleSaveEvent, handleDeleteEvent, openDrawer, closeDrawer]
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
