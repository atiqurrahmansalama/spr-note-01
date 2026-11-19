/**
 * Calendar & Master Scheduling Core Types
 * =======================================
 * Shared event models, shifts, holidays, and task schedules.
 */

export type CalendarCategory = 'WORKING_HOURS' | 'ACADEMIC_EVENT' | 'AGENDA' | 'MY_TASKS' | 'ALL';

export type CalendarDisplayMode = 'grid' | 'timeline' | 'list';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DEFERRED';

export interface TaskSubItem {
  id: string;
  title: string;
  completed: boolean;
}

export interface UserPersonalTask {
  id: string;
  tenantId: string;
  userId: string;
  title: string;
  description?: string;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  priority: TaskPriority;
  status: TaskStatus;
  category?: string;
  color?: string;
  subtasks?: TaskSubItem[];
  isPinned?: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface CalendarEvent {
  id: string;
  title: string;
  category: 'WORKING_HOURS' | 'ACADEMIC_EVENT' | string;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  audience?: string;
  repeats?: boolean;
  repeatFrequency?: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'YEARLY' | string;
  repeatDays?: number[];
  timezone?: string;
  priorityRank?: number;
  impacts?: string[];
  color?: string;
  description?: string;
  exceptions?: string[];
  [key: string]: unknown;
}

export interface DayCalendarResolution {
  dateStr: string;
  events: CalendarEvent[];
  tasks: UserPersonalTask[];
  isWeeklyHoliday: boolean;
  isSpecialHoliday: boolean;
}
