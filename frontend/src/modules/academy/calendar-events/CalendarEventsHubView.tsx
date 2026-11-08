import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../../../components/ui/PageHeader';
import TabSwitcher from '../../../components/ui/TabSwitcher';
import CustomButton from '../../../components/ui/CustomButton';
import ErrorBoundary from '../../../components/ui/ErrorBoundary';
import { PageContainer } from '../../../components/layout';
import {
  MasterTimeCalendar,
  TimeScheduleDrawerForm,
  TimeScheduleDetailDrawer,
} from './components';
import { masterCalendarStore, calendarSettings } from '../../../utils/localStore';
import { useTenant } from '../../../context/TenantContext';
import { useToast } from '../../../context/ToastContext';
import { useRightSidebar, useDrawerRegistration } from '../../../context/RightSidebarContext';
import { useFeatureControl } from '../../../context/FeatureControlContext';
import { useCalendarTranslation } from './locales';
import { WeeklyHolidaySettingsPanel, WorkingSchedulesPanel } from './work-schedule';
import { EventTypesPanel } from './events';
import {
  CalendarIcon,
  TimerIcon,
  PrintIcon,
  RefreshIcon,
  PlusIcon,
  ChecklistIcon,
} from '../../../components/ui/Icons';
import type { CalendarEvent, CalendarTabItem, DeleteEventOptions } from './types';

export default function CalendarEventsHubView() {
  const { t } = useCalendarTranslation();
  const { showToast } = useToast();
  const { activeTenantId } = useTenant();
  const { openDrawer, closeDrawer } = useRightSidebar();
  const { isSectionEnabled } = useFeatureControl();
  const [searchParams, setSearchParams] = useSearchParams();

  const isWorkingHoursEnabled = isSectionEnabled('calendar_tab_working_hours');
  const isEventsEnabled = isSectionEnabled('calendar_tab_events');
  const isAgendaEnabled = isSectionEnabled('calendar_tab_agenda');

  const visibleTabs: CalendarTabItem[] = useMemo(() => {
    const list: CalendarTabItem[] = [];
    if (isWorkingHoursEnabled) {
      list.push({ id: 'WORKING_HOURS', label: t('workingHours', 'Working Hours'), icon: TimerIcon });
    }
    if (isEventsEnabled) {
      list.push({ id: 'ACADEMIC_EVENT', label: t('academicEvents', 'Academic Events'), icon: CalendarIcon });
    }
    if (isAgendaEnabled) {
      list.push({ id: 'AGENDA', label: t('agenda', 'Agenda'), icon: ChecklistIcon });
    }
    return list.length > 0 ? list : [{ id: 'WORKING_HOURS', label: t('workingHours', 'Working Hours'), icon: TimerIcon }];
  }, [isWorkingHoursEnabled, isEventsEnabled, isAgendaEnabled, t]);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const rawTab = searchParams.get('tab') || 'WORKING_HOURS';
  const activeTab = visibleTabs.some((t) => t.id === rawTab) ? rawTab : (visibleTabs[0]?.id || 'WORKING_HOURS');
  const [, setIsLoading] = useState<boolean>(true);
  const [selectedTimelineDate, setSelectedTimelineDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [calendarDisplayMode, setCalendarDisplayMode] = useState<string>(() => {
    try {
      return localStorage.getItem('spr_calendar_display_mode') || 'grid';
    } catch {
      return 'grid';
    }
  });
  const [isHijriEnabled, setIsHijriEnabled] = useState<boolean>(() => calendarSettings.getHijriEnabled());

  useEffect(() => {
    const handleSettingsUpdate = (e: any) => {
      if (e?.detail?.enableHijri !== undefined) {
        setIsHijriEnabled(Boolean(e.detail.enableHijri));
      } else {
        setIsHijriEnabled(calendarSettings.getHijriEnabled());
      }
    };
    const handleStorageUpdate = (e: StorageEvent) => {
      if (!e.key || e.key === 'spr_enable_hijri') {
        setIsHijriEnabled(calendarSettings.getHijriEnabled());
      }
    };

    window.addEventListener('spr_calendar_settings_updated', handleSettingsUpdate);
    window.addEventListener('storage', handleStorageUpdate);
    return () => {
      window.removeEventListener('spr_calendar_settings_updated', handleSettingsUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);

  const setActiveTab = (tabId: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tabId);
      return next;
    }, { replace: true });
  };

  // Load events from tenant store
  const loadEvents = useCallback(() => {
    try {
      const data = masterCalendarStore.getEvents(activeTenantId);
      setEvents(data || []);
    } catch (err) {
      console.error('Failed to load master calendar events:', err);
      showToast(t('loadError', 'Failed to load calendar events'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [activeTenantId, showToast, t]);

  useEffect(() => {
    loadEvents();

    const handleUpdate = () => loadEvents();
    window.addEventListener('spr_tenant_changed', handleUpdate);
    window.addEventListener('spr_calendar_events_updated', handleUpdate);
    return () => {
      window.removeEventListener('spr_tenant_changed', handleUpdate);
      window.removeEventListener('spr_calendar_events_updated', handleUpdate);
    };
  }, [loadEvents]);

  // Handle Save Event
  const handleSaveEvent = useCallback((eventData: any) => {
    try {
      if (eventData.id) {
        masterCalendarStore.updateEvent(activeTenantId, eventData.id, eventData);
        showToast(t('saveSuccess', 'Schedule updated successfully!'), 'success');
      } else {
        masterCalendarStore.addEvent(activeTenantId, eventData);
        showToast(t('createSuccess', 'New schedule / event created successfully!'), 'success');
      }
      loadEvents();
    } catch (err) {
      showToast(t('saveError', 'Failed to save event'), 'error');
    }
  }, [activeTenantId, showToast, loadEvents, t]);

  // Handle Delete Event (Supports scoped recurring deletion)
  const handleDeleteEvent = useCallback((eventOrId: any, options: DeleteEventOptions = {}) => {
    try {
      const id = typeof eventOrId === 'object' ? eventOrId.id : eventOrId;
      const opts = typeof eventOrId === 'object' ? eventOrId : options;
      masterCalendarStore.deleteEvent(activeTenantId, id, opts);
      showToast(t('deleteSuccess', 'Schedule removed successfully.'), 'info');
      loadEvents();
    } catch (err) {
      showToast(t('deleteError', 'Failed to delete event'), 'error');
    }
  }, [activeTenantId, showToast, loadEvents, t]);

  // Universal Drawer Registration for Schedule / Event
  useDrawerRegistration(
    'schedule',
    (params) => {
      const mode = params.get('mode') || 'add';
      const eventId = params.get('eventId');
      const targetDate = params.get('date') || '';
      const foundEvent = eventId ? events.find((e) => String(e.id) === String(eventId)) : null;
      const defaultTabCategory = activeTab === 'AGENDA' ? 'WORKING_HOURS' : activeTab;
      const targetCategory = foundEvent?.category || params.get('category') || defaultTabCategory;
      const isWorkingHours = targetCategory === 'WORKING_HOURS';

      if (mode === 'detail' && foundEvent) {
        return {
          title: isWorkingHours 
            ? t('workingHoursDetails', 'Working Hours Details') 
            : t('academicEventDetails', 'Academic Event Details'),
          category: t('scheduleDetails', 'Schedule & Calendar'),
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
          ? (isWorkingHours ? t('addWorkingHours', 'Add Working Hours') : t('addAcademicEvent', 'Add Academic Event'))
          : t('editSchedule', 'Edit Schedule / Event'),
        category: t('scheduleDetails', 'Schedule & Calendar'),
        size: 'md' as const,
        content: (
          <TimeScheduleDrawerForm
            key={`schedule-form-${mode}-${eventId || 'new'}-${targetDate}-${targetCategory}`}
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
    [events, activeTab, handleSaveEvent, handleDeleteEvent, openDrawer, closeDrawer, t]
  );

  // Universal Drawer Registration for Weekly Holidays
  useDrawerRegistration(
    'weekly-holidays',
    () => ({
      title: t('weeklyHolidays', 'Weekly Holidays & Weekends'),
      category: t('scheduleDetails', 'Schedule & Calendar'),
      size: 'lg' as const,
      content: (
        <div className="p-4 sm:p-6">
          <WeeklyHolidaySettingsPanel activeTenantId={activeTenantId} />
        </div>
      ),
    }),
    [activeTenantId, t]
  );

  // Universal Drawer Registration for Calendar Taxonomy
  useDrawerRegistration(
    'calendar-taxonomy',
    () => ({
      title: t('manageTaxonomies', 'Schedule & Event Taxonomies'),
      category: t('scheduleDetails', 'Schedule & Calendar'),
      size: 'lg' as const,
      content: (
        <div className="p-4 sm:p-6 space-y-6">
          <WorkingSchedulesPanel activeTenantId={activeTenantId} />
          <EventTypesPanel activeTenantId={activeTenantId} />
        </div>
      ),
    }),
    [activeTenantId, t]
  );

  // Open Right Sidebar for adding new entry from top TabSwitcher
  const handleOpenAddDrawer = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMode = localStorage.getItem('spr_calendar_display_mode') || calendarDisplayMode || 'grid';
    const targetDate = currentMode === 'timeline' ? (selectedTimelineDate || todayStr) : todayStr;
    openDrawer('schedule', {
      mode: 'add',
      date: targetDate,
      category: activeTab === 'AGENDA' ? 'WORKING_HOURS' : activeTab,
    });
  };

  // Export CSV
  const handleExportCSV = () => {
    let csv = 'ID,Title,Category,Audience,Start Date,End Date,Start Time,End Time,Repeats,Timezone\n';
    events.forEach((e) => {
      csv += `"${e.id}","${e.title || ''}","${e.category || ''}","${e.audience || ''}","${e.startDate || ''}","${e.endDate || ''}","${e.startTime || ''}","${e.endTime || ''}","${e.repeats ? 'YES' : 'NO'}","${e.timezone || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `institution_calendar_events_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(t('exportSuccess', 'Master schedule exported successfully.'), 'success');
  };

  // Reset Defaults
  const handleResetDefaults = () => {
    if (window.confirm(t('confirmReset', 'Reset calendar & events to standard institutional defaults? Custom changes will be restored.'))) {
      localStorage.removeItem(`spr_master_calendar_${activeTenantId || 'default'}`);
      loadEvents();
      showToast(t('resetSuccess', 'Calendar reset to standard institutional defaults.'), 'info');
    }
  };

  const actionMenuItems = [
    {
      label: t('weeklyHolidays', 'Weekly Holidays & Weekends'),
      icon: CalendarIcon,
      onClick: () => openDrawer('weekly-holidays'),
    },
    {
      label: t('manageTaxonomies', 'Schedule Taxonomies'),
      icon: ChecklistIcon,
      onClick: () => openDrawer('calendar-taxonomy'),
    },
    {
      label: t('exportCsv', 'Export Schedule (CSV)'),
      icon: PrintIcon,
      onClick: handleExportCSV,
    },
    {
      label: t('printCalendar', 'Print Calendar'),
      icon: PrintIcon,
      onClick: () => window.print(),
    },
    {
      label: t('resetDefaults', 'Reset to Standard Defaults'),
      icon: RefreshIcon,
      onClick: handleResetDefaults,
    },
  ];

  return (
    <ErrorBoundary>
      <PageContainer>
        {/* ─── 1. Header Overview with Reusable PageHeader ──────────── */}
        <div className="print:hidden">
          <PageHeader
            icon={CalendarIcon}
            title={t('calendarAndEvents', 'Calendar & Events')}
            subtitle={t('calendarSubtitle', 'Master institutional console for managing operational working hours, faculty shifts, public holidays, and academic event schedules.')}
          />
        </div>

        {/* ─── 2. Top Tab Switcher with Add Button on Far Right ─── */}
        <div className="print:hidden">
          <TabSwitcher
            tabs={visibleTabs}
            activeTab={activeTab}
            onChange={setActiveTab}
            rightContent={
              <CustomButton
                type="button"
                variant="primary"
                size="sm"
                icon={PlusIcon}
                onClick={handleOpenAddDrawer}
                title={t('addSchedule', 'Add Schedule or Event')}
              >
                <span className="hidden sm:inline">{t('addSchedule', 'Add')}</span>
              </CustomButton>
            }
          />
        </div>

        {/* ─── 3. Reusable Master Calendar Engine ────────────────────── */}
        <div className="min-h-[640px] w-full min-w-0">
          <MasterTimeCalendar
            events={events}
            onSaveEvent={handleSaveEvent}
            onDeleteEvent={handleDeleteEvent}
            selectedCategory={activeTab === 'AGENDA' ? 'ALL' : activeTab}
            viewMode={activeTab === 'AGENDA' ? 'list' : 'month'}
            actionMenuItems={actionMenuItems}
            onDateSelect={setSelectedTimelineDate}
            onDisplayModeChange={setCalendarDisplayMode}
            isHijriEnabled={isHijriEnabled}
          />
        </div>
      </PageContainer>
    </ErrorBoundary>
  );
}
