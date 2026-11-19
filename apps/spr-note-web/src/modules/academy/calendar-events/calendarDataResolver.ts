/**
 * Enterprise Calendar & Events Domain Data Resolver
 * 
 * Single Source of Truth (SSOT) for data parsing, metric aggregation,
 * shift resolution, countdowns, and agenda filtering across SPR Note.
 * 
 * Zero fragmented calculations. Pure, deterministic domain logic.
 */

import type { CalendarEvent } from './types';
import { getEventColors, getEventDisplayType } from './components/MasterTimeCalendar';
import { weeklyHolidaysStore } from '../../../stores/calendarStore';

export interface ActiveShiftInfo {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  audience?: string;
  isActiveNow: boolean;
  isUpcomingToday: boolean;
  color?: string;
}

export interface ResolvedWorkingHoursData {
  totalShiftsCount: number;
  weeklyWorkDaysCount: number;
  weeklyHolidays: string[];
  activeShift: ActiveShiftInfo | null;
  todayShifts: ActiveShiftInfo[];
  allShifts: CalendarEvent[];
}

export interface ResolvedAcademicEventItem {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  type: string;
  displayType: string;
  daysRemaining: number;
  isToday: boolean;
  isTomorrow: boolean;
  audience?: string;
  description?: string;
  colorStyle: ReturnType<typeof getEventColors>;
  rawEvent: CalendarEvent;
}

export interface ResolvedAcademicEventsData {
  totalEventsCount: number;
  upcomingEvents: ResolvedAcademicEventItem[];
  activeTodayEvents: ResolvedAcademicEventItem[];
  examCount: number;
  holidayCount: number;
  meetingCount: number;
}

export interface ResolvedAgendaItem {
  id: string;
  title: string;
  timeSlot: string;
  startTime?: string;
  endTime?: string;
  isAllDay: boolean;
  isOngoing: boolean;
  isCompleted: boolean;
  category: string;
  displayType: string;
  audience?: string;
  description?: string;
  colorStyle: ReturnType<typeof getEventColors>;
  rawEvent: CalendarEvent;
}

export interface ResolvedAgendaData {
  targetDate: string;
  totalItemsCount: number;
  activeNowCount: number;
  completedCount: number;
  items: ResolvedAgendaItem[];
}

/**
 * Parses time string (e.g. "08:30" or "08:30:00") into minutes from midnight.
 */
export function timeStringToMinutes(timeStr?: string): number {
  if (!timeStr) return -1;
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return -1;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return -1;
  return h * 60 + m;
}

/**
 * Calculates calendar days remaining from today (YYYY-MM-DD) to a target date string.
 * Returns negative if target date has already passed.
 */
export function calculateDaysRemaining(targetDateStr?: string): number {
  if (!targetDateStr) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parts = targetDateStr.split('-');
  if (parts.length < 3) return 0;

  const target = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  target.setHours(0, 0, 0, 0);

  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Resolves working hours, active shift status, and weekly holiday metrics.
 */
export function resolveWorkingHoursData(
  events: CalendarEvent[] = [],
  activeTenantId?: string
): ResolvedWorkingHoursData {
  const workingHoursEvents = events.filter(
    (e) => e.category === 'WORKING_HOURS' || e.type === 'WORKING_HOURS'
  );

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentWeekday = now.getDay(); // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat

  // Read configured weekly holidays from canonical store
  let holidayDays: number[] = [5]; // Default Friday (5)
  try {
    const holConfig = weeklyHolidaysStore.getHolidays(activeTenantId);
    if (Array.isArray(holConfig?.holidays) && holConfig.holidays.length > 0) {
      holidayDays = holConfig.holidays;
    }
  } catch {}

  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const holidayNames = holidayDays.map((d) => weekdayNames[d] || `Day ${d}`);
  const weeklyWorkDaysCount = Math.max(1, 7 - holidayDays.length);

  const parsedShifts: ActiveShiftInfo[] = [];
  let activeShift: ActiveShiftInfo | null = null;

  for (const evt of workingHoursEvents) {
    const startMin = timeStringToMinutes(evt.startTime);
    const endMin = timeStringToMinutes(evt.endTime);

    const isDayMatch = !evt.repeats || !evt.daysOfWeek || evt.daysOfWeek.includes(currentWeekday);
    const isActiveNow = Boolean(
      isDayMatch && startMin >= 0 && endMin >= 0 && currentMinutes >= startMin && currentMinutes <= endMin
    );
    const isUpcomingToday = Boolean(
      isDayMatch && startMin >= 0 && currentMinutes < startMin
    );

    const shiftInfo: ActiveShiftInfo = {
      id: evt.id,
      title: evt.title || 'Operational Shift',
      startTime: evt.startTime || '08:00',
      endTime: evt.endTime || '14:00',
      audience: evt.audience || 'ALL',
      isActiveNow,
      isUpcomingToday,
      color: evt.color,
    };

    parsedShifts.push(shiftInfo);

    if (isActiveNow && !activeShift) {
      activeShift = shiftInfo;
    }
  }

  // Sort shifts by start time
  parsedShifts.sort((a, b) => timeStringToMinutes(a.startTime) - timeStringToMinutes(b.startTime));

  const todayShifts = parsedShifts.filter((s) => s.isActiveNow || s.isUpcomingToday);

  return {
    totalShiftsCount: workingHoursEvents.length,
    weeklyWorkDaysCount,
    weeklyHolidays: holidayNames,
    activeShift,
    todayShifts: todayShifts.length > 0 ? todayShifts : parsedShifts.slice(0, 3),
    allShifts: workingHoursEvents,
  };
}

/**
 * Resolves upcoming academic events, milestones, exams, and holidays with exact countdowns.
 */
export function resolveAcademicEventsData(
  events: CalendarEvent[] = [],
  activeTenantId?: string
): ResolvedAcademicEventsData {
  const todayStr = new Date().toISOString().split('T')[0];

  const academicEvents = events.filter(
    (e) => e.category === 'ACADEMIC_EVENT' || (!e.category && e.type !== 'WORKING_HOURS')
  );

  const resolvedItems: ResolvedAcademicEventItem[] = [];
  let examCount = 0;
  let holidayCount = 0;
  let meetingCount = 0;

  for (const evt of academicEvents) {
    const startDate = evt.startDate || todayStr;
    const endDate = evt.endDate || startDate;
    const daysRemaining = calculateDaysRemaining(startDate);
    const isToday = daysRemaining === 0 || (startDate <= todayStr && endDate >= todayStr);
    const isTomorrow = daysRemaining === 1;

    const displayType = getEventDisplayType(evt, activeTenantId);
    const normType = (evt.type || evt.kind || displayType || '').toUpperCase();

    if (normType.includes('EXAM')) examCount++;
    else if (normType.includes('HOLIDAY')) holidayCount++;
    else if (normType.includes('MEETING')) meetingCount++;

    resolvedItems.push({
      id: evt.id,
      title: evt.title || 'Academic Event',
      startDate,
      endDate,
      type: normType,
      displayType,
      daysRemaining,
      isToday,
      isTomorrow,
      audience: evt.audience || 'Campus Wide',
      description: evt.description,
      colorStyle: getEventColors(evt, activeTenantId),
      rawEvent: evt,
    });
  }

  // Sort upcoming events: today first, then ascending by daysRemaining
  const upcomingEvents = resolvedItems
    .filter((e) => e.daysRemaining >= 0 || e.isToday)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  const activeTodayEvents = resolvedItems.filter((e) => e.isToday);

  return {
    totalEventsCount: academicEvents.length,
    upcomingEvents,
    activeTodayEvents,
    examCount,
    holidayCount,
    meetingCount,
  };
}

/**
 * Resolves all scheduled items for a specific date as an actionable Agenda checklist.
 */
export function resolveAgendaScheduleData(
  events: CalendarEvent[] = [],
  targetDateStr?: string,
  activeTenantId?: string
): ResolvedAgendaData {
  const targetDate = targetDateStr || new Date().toISOString().split('T')[0];
  const now = new Date();
  const isToday = targetDate === now.toISOString().split('T')[0];
  const currentMinutes = isToday ? now.getHours() * 60 + now.getMinutes() : -1;

  const targetDateObj = new Date(targetDate);
  const targetWeekday = targetDateObj.getDay();

  const matchingItems: ResolvedAgendaItem[] = [];
  let activeNowCount = 0;
  let completedCount = 0;

  for (const evt of events) {
    const startDate = evt.startDate || '';
    const endDate = evt.endDate || startDate;

    const isDateInRange = startDate <= targetDate && endDate >= targetDate;
    const isRecurringMatch = Boolean(
      evt.repeats && (!evt.daysOfWeek || evt.daysOfWeek.includes(targetWeekday))
    );

    if (isDateInRange || isRecurringMatch) {
      const isAllDay = evt.isFullDay || !evt.startTime || !evt.endTime;
      const startMin = timeStringToMinutes(evt.startTime);
      const endMin = timeStringToMinutes(evt.endTime);

      const isOngoing = Boolean(
        isToday && !isAllDay && startMin >= 0 && endMin >= 0 && currentMinutes >= startMin && currentMinutes <= endMin
      );
      const isCompleted = Boolean(
        isToday && !isAllDay && endMin >= 0 && currentMinutes > endMin
      );

      if (isOngoing) activeNowCount++;
      if (isCompleted) completedCount++;

      const timeSlot = isAllDay
        ? 'Full Day'
        : `${formatTime12(evt.startTime)} – ${formatTime12(evt.endTime)}`;

      matchingItems.push({
        id: evt.id,
        title: evt.title || 'Scheduled Item',
        timeSlot,
        startTime: evt.startTime,
        endTime: evt.endTime,
        isAllDay,
        isOngoing,
        isCompleted,
        category: evt.category || 'EVENT',
        displayType: getEventDisplayType(evt, activeTenantId),
        audience: evt.audience || 'ALL',
        description: evt.description,
        colorStyle: getEventColors(evt, activeTenantId),
        rawEvent: evt,
      });
    }
  }

  // Sort items: all-day first, then by startTime ascending
  matchingItems.sort((a, b) => {
    if (a.isAllDay && !b.isAllDay) return -1;
    if (!a.isAllDay && b.isAllDay) return 1;
    return timeStringToMinutes(a.startTime) - timeStringToMinutes(b.startTime);
  });

  return {
    targetDate,
    totalItemsCount: matchingItems.length,
    activeNowCount,
    completedCount,
    items: matchingItems,
  };
}

/**
 * Standard 12-hour time formatter (e.g. "08:00" -> "08:00 AM")
 */
export function formatTime12(timeStr?: string): string {
  if (!timeStr) return '--:--';
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return timeStr;
  let h = parseInt(parts[0], 10);
  const m = parts[1].padStart(2, '0');
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

