import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import TabSwitcher from '../../../components/ui/TabSwitcher';
import CustomButton from '../../../components/ui/CustomButton';
import ErrorBoundary from '../../../components/ui/ErrorBoundary';
import { PageContainer } from '../../../components/layout';
import AccessDeniedView from '../../../components/common/AccessDeniedView';
import {
  MasterTimeCalendar,
  TimeScheduleDrawerForm,
  TimeScheduleDetailDrawer,
  UserTaskDrawerForm,
  DayTasksDrawerContent,
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

  const isWorkingHoursEnabled = isSectionEnabled('calendar_tab_working_hours') && isSectionEnabled('calendar_view_working_hours');
  const isEventsEnabled = isSectionEnabled('calendar_tab_events') && isSectionEnabled('calendar_view_events');
  const isAgendaEnabled = isSectionEnabled('calendar_tab_agenda');
  const isMyTasksEnabled = isSectionEnabled('calendar_tab_personal_tasks') && isSectionEnabled('calendar_view_personal_tasks');
  const canAddWorkingHours = isWorkingHoursEnabled && isSectionEnabled('calendar_add_working_hours');
  const canAddEvents = isEventsEnabled && isSectionEnabled('calendar_add_events');
  const canAddTasks = isMyTasksEnabled && isSectionEnabled('calendar_add_personal_tasks');

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
    return list;
  }, [isWorkingHoursEnabled, isEventsEnabled, isAgendaEnabled, isMyTasksEnabled, t]);

  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    try {
      return masterCalendarStore.getEvents(activeTenantId) || [];
    } catch {
      return [];
    }
  });
  const rawTab = searchParams.get('tab') || (visibleTabs[0]?.id || 'WORKING_HOURS');
  const isRawTabAllowed = visibleTabs.some((t) => t.id === rawTab);
  const activeTab = isRawTabAllowed ? rawTab : (visibleTabs[0]?.id || 'WORKING_HOURS');

  // Automatic nearest-allowed route redirect: If user accesses a locked tab directly via URL (?tab=LOCKED),
  // redirect them immediately to the nearest allowed tab (visibleTabs[0].id)
  useEffect(() => {
    if (visibleTabs.length > 0 && !isRawTabAllowed) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [visibleTabs, isRawTabAllowed]);
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
      const canEditCategory = isWorkingHours ? canAddWorkingHours : canAddEvents;

      // Zero-Trust Security Guard: Block unauthorized add/edit attempts even if deep-linked or clicked
      if ((mode === 'add' || mode === 'edit') && !canEditCategory) {
        return {
          title: isWorkingHours
            ? t('workingHoursRestricted', 'Working Hours Restricted')
            : t('academicEventsRestricted', 'Academic Events Restricted'),
          category: t('scheduleDetails', 'Schedule & Calendar'),
          size: 'md' as const,
          content: (
            <AccessDeniedView
              variant="drawer"
              title={
                isWorkingHours
                  ? t('workingHoursLockedTitle', 'Working Hours Modification Restricted')
                  : t('academicEventsLockedTitle', 'Academic Event Modification Restricted')
              }
              message={t(
                'featureLockedDesc',
                'You do not have permission to add or modify this schedule. Please contact your institution administrator.'
              )}
              sectionKey={isWorkingHours ? 'calendar_add_working_hours' : 'calendar_add_events'}
              onClose={closeDrawer}
            />
          ),
        };
      }

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
    [events, activeTab, canAddWorkingHours, canAddEvents, handleSaveEvent, handleDeleteEvent, openDrawer, closeDrawer, t]
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
      // Zero-Trust Security Guard: Block task creation/editing if tasks or add task feature is disabled
      if (!isMyTasksEnabled || !canAddTasks) {
        return {
          title: t('tasksRestricted', 'Task Management Restricted'),
          category: t('personalTasks', 'Personal Tasks & To-Do'),
          size: 'md' as const,
          content: (
            <AccessDeniedView
              variant="drawer"
              title={t('tasksLockedTitle', 'Task Creation Restricted')}
              message={t(
                'tasksLockedDesc',
                'You do not have permission to add or modify personal tasks. Please contact your institution administrator.'
              )}
              sectionKey={['calendar_tab_personal_tasks', 'calendar_add_personal_tasks']}
              onClose={closeDrawer}
            />
          ),
        };
      }

      const taskId = params?.get ? params.get('taskId') : params?.taskId;
      const targetDate = (params?.get ? params.get('date') : params?.date) || new Date().toISOString().split('T')[0];
      const returnTo = params?.get ? params.get('returnTo') : params?.returnTo;
      let targetTask: UserPersonalTask | null = null;
      if (taskId) {
        const allTasks = userTaskStore.getTasks(activeTenantId, userId);
        targetTask = allTasks.find((t) => String(t.id) === String(taskId)) || null;
      } else if (params?.task && typeof params.task === 'object') {
        targetTask = params.task;
      }

      const handleReturnToDayTasks = () => {
        openDrawer('day-tasks', { date: targetDate });
      };

      return {
        title: targetTask ? t('taskDetails', 'Task Details') : t('createTask', 'Create Task'),
        category: t('personalTasks', 'Personal Tasks & To-Do'),
        size: 'md' as const,
        onBack: returnTo === 'day-tasks' ? handleReturnToDayTasks : undefined,
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
              if (returnTo === 'day-tasks') {
                handleReturnToDayTasks();
              } else {
                closeDrawer();
              }
            }}
            onQuickUpdate={(updated) => {
              userTaskStore.saveTask(activeTenantId, userId, updated);
            }}
            onDelete={(taskId) => {
              userTaskStore.deleteTask(activeTenantId, userId, taskId);
              showToast(t('taskDeleted', 'Task removed successfully.'), 'info');
              if (returnTo === 'day-tasks') {
                handleReturnToDayTasks();
              } else {
                closeDrawer();
              }
            }}
            onCancel={returnTo === 'day-tasks' ? handleReturnToDayTasks : closeDrawer}
          />
        ),
      };
    },
    [isMyTasksEnabled, canAddTasks, activeTenantId, userId, openDrawer, closeDrawer, showToast, t]
  );

  // Universal Drawer Registration for Day Tasks List
  useDrawerRegistration(
    'day-tasks',
    (params: any) => {
      const targetDate = (params?.get ? params.get('date') : params?.date) || new Date().toISOString().split('T')[0];
      const targetTasks: UserPersonalTask[] = params?.tasks || userTaskStore.getTasksForDate(activeTenantId, userId, targetDate);

      return {
        title: `${t('personalTasks', 'Personal Tasks')}`,
        category: t('personalTasks', 'Personal Tasks & To-Do'),
        size: 'md' as const,
        content: (
          <DayTasksDrawerContent
            dateStr={targetDate}
            initialTasks={targetTasks}
            onEditTask={(task) => {
              openDrawer('user-task', { taskId: task.id, date: targetDate, returnTo: 'day-tasks' });
            }}
            onAddTask={() => {
              openDrawer('user-task', { date: targetDate, returnTo: 'day-tasks' });
            }}
            onClose={closeDrawer}
          />
        ),
      };
    },
    [openDrawer, closeDrawer, activeTenantId, userId, t]
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

  if (visibleTabs.length === 0) {
    return (
      <ErrorBoundary>
        <PageContainer>
          <AccessDeniedView
            title={t('calendarDisabled', 'Calendar & Events Access Restricted')}
            sectionKey={[
              'calendar_tab_working_hours',
              'calendar_tab_events',
              'calendar_tab_agenda',
              'calendar_tab_personal_tasks',
            ]}
          />
        </PageContainer>
      </ErrorBoundary>
    );
  }

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
              activeTab === 'WORKING_HOURS' && canAddWorkingHours ? (
                <CustomButton
                  type="button"
                  variant="primary"
                  size="sm"
                  icon={PlusIcon}
                  onClick={handleOpenAddDrawer}
                  title={t('addSchedule', 'Add Schedule')}
                  className="w-full @[640px]:w-auto justify-center shrink-0"
                >
                  <span>
                    {t('addSchedule', 'Add Schedule')}
                  </span>
                </CustomButton>
              ) : activeTab === 'ACADEMIC_EVENT' && canAddEvents ? (
                <CustomButton
                  type="button"
                  variant="primary"
                  size="sm"
                  icon={PlusIcon}
                  onClick={handleOpenAddDrawer}
                  title={t('addEvent', 'Add Event')}
                  className="w-full @[640px]:w-auto justify-center shrink-0"
                >
                  <span>
                    {t('addEvent', 'Add Event')}
                  </span>
                </CustomButton>
              ) : null
            }
          />
        </div>

        {/* ─── 3. Reusable Master Calendar Engine or Dedicated My Tasks View ─── */}
        <div className={`w-full min-w-0 ${activeTab === 'MY_TASKS' ? 'flex-1 flex flex-col min-h-[calc(100vh-220px)]' : 'min-h-0 pb-16 sm:pb-24'}`}>
          {activeTab === 'MY_TASKS' ? (
            <MyTasksHubView onOpenTaskDrawer={handleOpenUserTaskDrawer} canAddTasks={canAddTasks} />
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
              canAddWorkingHours={canAddWorkingHours}
              canAddEvents={canAddEvents}
            />
          )}
        </div>
      </PageContainer>
    </ErrorBoundary>
  );
}
