import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import TabSwitcher from '../../../components/ui/TabSwitcher';
import CustomButton from '../../../components/ui/CustomButton';
import ErrorBoundary from '../../../components/ui/ErrorBoundary';
import { PageContainer } from '../../../components/layout';
import {
  MasterTimeCalendar,
  TimeScheduleDrawerForm,
  TimeScheduleDetailDrawer,
  UserTaskDrawerForm,
  MyTasksHubView,
} from './components';
import { masterCalendarStore, calendarSettings } from '../../../utils/localStore';
import { userTaskStore } from './tasks/userTaskStore';
import { useTenant } from '../../../context/TenantContext';
import { useAuth } from '../../../context/AuthContext';
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
  PlusIcon,
  ChecklistIcon,
  CheckCircleIcon,
} from '../../../components/ui/Icons';
import type { CalendarEvent, CalendarTabItem, DeleteEventOptions, UserPersonalTask } from './types';

export default function CalendarEventsHubView() {
  const { t } = useCalendarTranslation();
  const { showToast } = useToast();
  const { activeTenantId } = useTenant();
  const { user } = useAuth() as any;
  const userId = user?.id || user?.username || user?.email || 'me';
  const { openDrawer, closeDrawer } = useRightSidebar();
  const { isSectionEnabled } = useFeatureControl();
  const [searchParams, setSearchParams] = useSearchParams();

  const isWorkingHoursEnabled = isSectionEnabled('calendar_tab_working_hours');
  const isEventsEnabled = isSectionEnabled('calendar_tab_events');
  const isAgendaEnabled = isSectionEnabled('calendar_tab_agenda');
  const isMyTasksEnabled = isSectionEnabled('calendar_tab_personal_tasks');

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
    if (isMyTasksEnabled) {
      list.push({ id: 'MY_TASKS', label: t('myTasks', 'My Tasks'), icon: CheckCircleIcon });
    }
    return list.length > 0 ? list : [{ id: 'WORKING_HOURS', label: t('workingHours', 'Working Hours'), icon: TimerIcon }];
  }, [isWorkingHoursEnabled, isEventsEnabled, isAgendaEnabled, isMyTasksEnabled, t]);

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
          : (isWorkingHours ? t('editWorkingHours', 'Edit Working Hours') : t('editAcademicEvent', 'Edit Academic Event')),
        category: isWorkingHours ? t('workingHours', 'Working Hours') : t('academicEvents', 'Academic Events'),
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
        <div className="pt-1 pb-6 @container">
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
        <div className="pt-1 pb-6 space-y-6 @container">
          <WorkingSchedulesPanel activeTenantId={activeTenantId} />
          <EventTypesPanel activeTenantId={activeTenantId} />
        </div>
      ),
    }),
    [activeTenantId, t]
  );

  // Universal Drawer Registration for User Task Form
  useDrawerRegistration(
    'user-task',
    (params: any) => {
      const targetTask = params?.task || null;
      const targetDate = params?.date || new Date().toISOString().split('T')[0];
      return {
        title: targetTask ? t('updateTask', 'Update Task') : t('createTask', 'Create Task'),
        category: t('personalTasks', 'Personal Tasks & To-Do'),
        size: 'md' as const,
        content: (
          <UserTaskDrawerForm
            key={`task-form-${targetTask?.id || 'new'}-${targetDate}`}
            task={targetTask}
            initialDate={targetDate}
            onSave={(savedTask) => {
              userTaskStore.saveTask(activeTenantId, userId, savedTask);
              showToast(
                targetTask
                  ? t('taskUpdated', 'Task updated successfully!')
                  : t('taskCreated', 'Task created successfully!'),
                'success'
              );
              closeDrawer();
            }}
            onDelete={(taskId) => {
              userTaskStore.deleteTask(activeTenantId, userId, taskId);
              showToast(t('taskDeleted', 'Task removed successfully.'), 'info');
              closeDrawer();
            }}
            onCancel={closeDrawer}
          />
        ),
      };
    },
    [activeTenantId, userId, closeDrawer, showToast, t]
  );

  // Open Right Sidebar for adding new personal task
  const handleOpenUserTaskDrawer = useCallback(
    (task?: UserPersonalTask | null, date?: string) => {
      openDrawer('user-task', {
        task,
        date: date || new Date().toISOString().split('T')[0],
      });
    },
    [openDrawer]
  );

  // Open Right Sidebar for adding new entry from top TabSwitcher
  const handleOpenAddDrawer = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMode = localStorage.getItem('spr_calendar_display_mode') || calendarDisplayMode || 'grid';
    const targetDate = currentMode === 'timeline' ? (selectedTimelineDate || todayStr) : todayStr;
    openDrawer('schedule', {
      mode: 'add',
      date: targetDate,
      category: activeTab === 'WORKING_HOURS' ? 'WORKING_HOURS' : 'ACADEMIC_EVENT',
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

  const actionMenuItems = [
    {
      label: t('exportCsv', 'Export Schedule (CSV)'),
      icon: PrintIcon,
      onClick: handleExportCSV,
    },
  ];

  return (
    <ErrorBoundary>
      <PageContainer>
        {/* ─── Top Tab Switcher with Add Button on Far Right ─── */}
        <div className="print:hidden">
          <TabSwitcher
            tabs={visibleTabs}
            activeTab={activeTab}
            onChange={setActiveTab}
            rightContent={
              activeTab === 'WORKING_HOURS' ? (
                <CustomButton
                  type="button"
                  variant="primary"
                  size="sm"
                  icon={PlusIcon}
                  onClick={handleOpenAddDrawer}
                  title={t('addSchedule', 'Add Schedule')}
                >
                  <span className="hidden sm:inline">
                    {t('addSchedule', 'Add Schedule')}
                  </span>
                </CustomButton>
              ) : activeTab === 'ACADEMIC_EVENT' ? (
                <CustomButton
                  type="button"
                  variant="primary"
                  size="sm"
                  icon={PlusIcon}
                  onClick={handleOpenAddDrawer}
                  title={t('addEvent', 'Add Event')}
                >
                  <span className="hidden sm:inline">
                    {t('addEvent', 'Add Event')}
                  </span>
                </CustomButton>
              ) : null
            }
          />
        </div>

        {/* ─── 3. Reusable Master Calendar Engine or Dedicated My Tasks View ─── */}
        <div className={`w-full min-w-0 ${activeTab === 'MY_TASKS' ? 'flex-1 flex flex-col min-h-[calc(100vh-220px)]' : 'min-h-[640px] pb-16 sm:pb-24'}`}>
          {activeTab === 'MY_TASKS' ? (
            <MyTasksHubView onOpenTaskDrawer={handleOpenUserTaskDrawer} />
          ) : (
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
          )}
        </div>
      </PageContainer>
    </ErrorBoundary>
  );
}
