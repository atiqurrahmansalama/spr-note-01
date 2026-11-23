import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRightSidebar } from '../../../../context/RightSidebarContext';
import { useTenant } from '../../../../context/TenantContext';
import { useFeatureControl } from '../../../../context/FeatureControlContext';
import { calendarSettings } from '../../../../utils/localStore';
import { useUserTasks } from '../tasks/useUserTasks';
import { EVENT_COLOR_MAP, type EventColorStyle } from '../constants/eventColors';
import type { CalendarEvent, CalendarDisplayMode, UserPersonalTask } from '../types';

import {
  type MasterTimeCalendarProps,
  getEventColors,
  getEventDisplayType,
  useCalendarDates,
  useCalendarEventsData,
  useWeekEventsPacking,
  useTimelineDragScroll,
  CalendarControlBar,
  CalendarMonthGridView,
  CalendarTimelineView,
  CalendarAgendaListView,
} from './calendar';

export { getEventColors, getEventDisplayType, EVENT_COLOR_MAP, type EventColorStyle, type MasterTimeCalendarProps };

export default function MasterTimeCalendar({
  events = [],
  readOnly = false,
  selectedCategory = 'WORKING_HOURS',
  viewMode: propViewMode,
  actionMenuItems = [],
  onDateSelect,
  onDisplayModeChange,
  className = '',
  isHijriEnabled: propIsHijriEnabled = undefined,
  displayMode: propDisplayMode,
  initialDisplayMode,
  hideControlBar = false,
  hideCategorySelector = false,
  hideSearch = false,
  hideViewModeToggle = false,
  embeddedSurface = false,
  showPersonalTasks: propShowPersonalTasks,
  onTogglePersonalTasks,
  canAddWorkingHours: propCanAddWorkingHours,
  canAddEvents: propCanAddEvents,
}: MasterTimeCalendarProps) {
  const { openDrawer } = useRightSidebar();
  const { activeTenantId } = useTenant();
  const { tasks: userTasks, toggleTaskStatus } = useUserTasks();
  const { isSectionEnabled } = useFeatureControl();

  const isMyTasksSectionEnabled = isSectionEnabled('calendar_tab_personal_tasks') && isSectionEnabled('calendar_view_personal_tasks');
  const featureCanAddWorkingHours = isSectionEnabled('calendar_add_working_hours');
  const featureCanAddEvents = isSectionEnabled('calendar_add_events');

  const canAddWorkingHours = propCanAddWorkingHours !== undefined ? propCanAddWorkingHours : featureCanAddWorkingHours;
  const canAddEvents = propCanAddEvents !== undefined ? propCanAddEvents : featureCanAddEvents;
  const canAddForActiveCategory = selectedCategory === 'WORKING_HOURS'
    ? canAddWorkingHours
    : selectedCategory === 'ACADEMIC_EVENT'
    ? canAddEvents
    : (canAddWorkingHours || canAddEvents);

  const [internalShowPersonalTasks, setInternalShowPersonalTasks] = useState<boolean>(true);
  const showPersonalTasks = isMyTasksSectionEnabled && (propShowPersonalTasks !== undefined ? propShowPersonalTasks : internalShowPersonalTasks);
  const setShowPersonalTasks = onTogglePersonalTasks || setInternalShowPersonalTasks;

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [internalDisplayMode, setInternalDisplayMode] = useState<CalendarDisplayMode>(() => {
    if (initialDisplayMode) return initialDisplayMode;
    try {
      return (localStorage.getItem('spr_calendar_display_mode') as CalendarDisplayMode) || 'grid';
    } catch {
      return 'grid';
    }
  });

  const displayMode = propDisplayMode !== undefined ? propDisplayMode : internalDisplayMode;

  const handleSetDisplayMode = useCallback((mode: CalendarDisplayMode) => {
    setInternalDisplayMode(mode);
    try {
      localStorage.setItem('spr_calendar_display_mode', mode);
    } catch {}
    if (onDisplayModeChange) onDisplayModeChange(mode);
  }, [onDisplayModeChange]);

  const [internalHijriEnabled, setInternalHijriEnabled] = useState<boolean>(() => calendarSettings.getHijriEnabled());
  const isHijriEnabled = propIsHijriEnabled !== undefined ? Boolean(propIsHijriEnabled) : internalHijriEnabled;

  useEffect(() => {
    const handleSettingsUpdate = (e: any) => {
      if (e?.detail?.enableHijri !== undefined) {
        setInternalHijriEnabled(Boolean(e.detail.enableHijri));
      } else {
        setInternalHijriEnabled(calendarSettings.getHijriEnabled());
      }
    };
    const handleStorageUpdate = (e: StorageEvent) => {
      if (!e.key || e.key === 'spr_enable_hijri') {
        setInternalHijriEnabled(calendarSettings.getHijriEnabled());
      }
    };

    window.addEventListener('spr_calendar_settings_updated', handleSettingsUpdate);
    window.addEventListener('storage', handleStorageUpdate);
    return () => {
      window.removeEventListener('spr_calendar_settings_updated', handleSettingsUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);

  useEffect(() => {
    if (onDisplayModeChange) {
      onDisplayModeChange(displayMode);
    }
  }, [displayMode, onDisplayModeChange]);

  const viewMode = propViewMode || (selectedCategory === 'AGENDA' ? 'list' : 'month');

  // Calendar Dates & Navigation State Hook
  const {
    currentDate,
    setCurrentDate,
    selectedDay,
    setSelectedDay,
    viewYear,
    viewMonth,
    todayStr,
    selectedDateObj,
    selectedDateStr,
    selectedWeekday,
    hijriMonthHeader,
    handlePrevMonth,
    handleNextMonth,
    handleJumpToday,
  } = useCalendarDates({
    isHijriEnabled,
    displayMode,
    onDateSelect,
  });

  // Timeline Drag & Centering Scroll Hook
  const {
    dayStripRef,
    isTodayScrolledOutOfView,
  } = useTimelineDragScroll({
    displayMode,
    selectedDateObj,
    currentDate,
    selectedDay,
    setCurrentDate,
  });

  // Calendar Events & Tasks Fast Single-Pass Data Hook
  const {
    filteredEvents,
    sortedFilteredEvents,
    monthGridDays,
    weeks,
    timelineStripDays,
    getEventsForDate,
    getTasksForDate,
    selectedDayEvents,
  } = useCalendarEventsData({
    events,
    selectedCategory,
    searchQuery,
    viewYear,
    viewMonth,
    selectedDateStr,
    selectedWeekday,
    displayMode,
    userTasks,
    showPersonalTasks,
  });

  // 7-Column Greedy Event Row Packing Hook
  const { getWeekEvents } = useWeekEventsPacking({
    sortedFilteredEvents,
    getEventsForDate,
  });

  // Today button visibility
  const shouldShowTodayButton = useMemo(() => {
    if (viewMode !== 'month') return false;
    const now = new Date();
    const isCurrentMonthYear = viewYear === now.getFullYear() && viewMonth === now.getMonth();

    if (displayMode === 'grid') {
      return !isCurrentMonthYear;
    }
    return !isCurrentMonthYear || selectedDay !== now.getDate() || isTodayScrolledOutOfView;
  }, [viewMode, displayMode, viewYear, viewMonth, selectedDay, isTodayScrolledOutOfView]);

  // Drawer Openers
  const handleOpenEventDetail = useCallback((evt: CalendarEvent, dateStr = '') => {
    openDrawer('schedule', {
      mode: 'detail',
      eventId: evt.id,
      category: evt.category,
      date: dateStr || selectedDateStr,
    });
  }, [openDrawer, selectedDateStr]);

  const handleOpenAddDrawer = useCallback((initialDate = '') => {
    openDrawer('schedule', {
      mode: 'add',
      date: initialDate || selectedDateStr,
      category: selectedCategory === 'WORKING_HOURS' ? 'WORKING_HOURS' : 'ACADEMIC_EVENT',
    });
  }, [openDrawer, selectedDateStr, selectedCategory]);

  const handleOpenAddShift = useCallback((initialDate = '') => {
    openDrawer('schedule', {
      mode: 'add',
      date: initialDate || selectedDateStr,
      category: 'WORKING_HOURS',
    });
  }, [openDrawer, selectedDateStr]);

  const handleOpenAddEvent = useCallback((initialDate = '') => {
    openDrawer('schedule', {
      mode: 'add',
      date: initialDate || selectedDateStr,
      category: 'ACADEMIC_EVENT',
    });
  }, [openDrawer, selectedDateStr]);

  const handleOpenTaskDetail = useCallback((task: UserPersonalTask, dateStr = '') => {
    openDrawer('user-task', {
      taskId: task.id,
      date: dateStr || task.dueDate || selectedDateStr,
    });
  }, [openDrawer, selectedDateStr]);

  const handleOpenDayTasks = useCallback((dateStr: string, tasks: UserPersonalTask[]) => {
    openDrawer('day-tasks', {
      date: dateStr,
      tasks,
    });
  }, [openDrawer]);

  const selectedDayTasks = useMemo(() => {
    return getTasksForDate(selectedDateStr);
  }, [getTasksForDate, selectedDateStr]);

  return (
    <div className={`flex flex-col w-full min-w-0 @container ${className}`}>
      {/* ─── 1. Control Bar Toolbar ─── */}
      {!hideControlBar && (
        <CalendarControlBar
          viewMode={viewMode}
          displayMode={displayMode}
          viewYear={viewYear}
          viewMonth={viewMonth}
          hijriMonthHeader={hijriMonthHeader}
          isHijriEnabled={isHijriEnabled}
          shouldShowTodayButton={shouldShowTodayButton}
          showPersonalTasks={showPersonalTasks}
          showPersonalTasksToggle={isMyTasksSectionEnabled}
          searchQuery={searchQuery}
          filteredEventsCount={filteredEvents.length}
          embeddedSurface={embeddedSurface}
          hideViewModeToggle={hideViewModeToggle}
          hideSearch={hideSearch}
          actionMenuItems={actionMenuItems}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onJumpToday={handleJumpToday}
          onSetDisplayMode={handleSetDisplayMode}
          onTogglePersonalTasks={() => setShowPersonalTasks((prev) => !prev)}
          onSearchChange={setSearchQuery}
        />
      )}

      {/* ─── 2. Calendar Main Content Area ─── */}
      <div
        className={`overflow-hidden border-0 w-full min-w-0 ${
          embeddedSurface
            ? 'rounded-2xl bg-transparent'
            : 'rounded-3xl theme-bg-surface shadow-xs'
        }`}
      >
        {/* View Mode 1: Month Grid View */}
        {viewMode === 'month' && displayMode === 'grid' && (
          <CalendarMonthGridView
            weeks={weeks}
            todayStr={todayStr}
            viewYear={viewYear}
            viewMonth={viewMonth}
            isHijriEnabled={isHijriEnabled}
            readOnly={readOnly}
            embeddedSurface={embeddedSurface}
            showPersonalTasks={showPersonalTasks}
            canAdd={canAddForActiveCategory}
            activeTenantId={activeTenantId}
            getEventsForDate={getEventsForDate}
            getTasksForDate={getTasksForDate}
            getWeekEvents={getWeekEvents}
            onSelectDay={setSelectedDay}
            onSetCurrentDate={setCurrentDate}
            onSetDisplayMode={handleSetDisplayMode}
            onOpenAddDrawer={handleOpenAddDrawer}
            onOpenEventDetail={handleOpenEventDetail}
            onOpenTaskDetail={handleOpenTaskDetail}
            onOpenDayTasks={handleOpenDayTasks}
          />
        )}

        {/* View Mode 2: Timeline View */}
        {viewMode === 'month' && displayMode === 'timeline' && (
          <CalendarTimelineView
            dayStripRef={dayStripRef}
            timelineStripDays={timelineStripDays}
            selectedDateStr={selectedDateStr}
            selectedDay={selectedDay}
            selectedWeekday={selectedWeekday}
            viewYear={viewYear}
            viewMonth={viewMonth}
            todayStr={todayStr}
            isHijriEnabled={isHijriEnabled}
            embeddedSurface={embeddedSurface}
            readOnly={readOnly}
            showPersonalTasks={showPersonalTasks}
            activeTenantId={activeTenantId}
            selectedCategory={selectedCategory}
            canAddWorkingHours={canAddWorkingHours}
            canAddEvents={canAddEvents}
            selectedDayEvents={selectedDayEvents}
            selectedDayTasks={selectedDayTasks}
            getEventsForDate={getEventsForDate}
            onSelectDay={setSelectedDay}
            onSetCurrentDate={setCurrentDate}
            onOpenAddDrawer={handleOpenAddDrawer}
            onOpenAddShift={handleOpenAddShift}
            onOpenAddEvent={handleOpenAddEvent}
            onOpenEventDetail={handleOpenEventDetail}
            onToggleTaskStatus={toggleTaskStatus}
            onOpenTaskDrawer={(params) => openDrawer('user-task', params)}
          />
        )}

        {/* View Mode 3: Agenda List View */}
        {viewMode === 'list' && (
          <CalendarAgendaListView
            filteredEvents={filteredEvents}
            isHijriEnabled={isHijriEnabled}
            embeddedSurface={embeddedSurface}
            activeTenantId={activeTenantId}
            selectedCategory={selectedCategory}
            onOpenEventDetail={handleOpenEventDetail}
          />
        )}
      </div>
    </div>
  );
}
