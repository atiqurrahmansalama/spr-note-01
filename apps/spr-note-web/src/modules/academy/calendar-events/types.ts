/**
 * SPR Note — Calendar & Events Module Types
 * ==========================================
 * Explicit TypeScript interfaces and type definitions for institutional
 * working schedules, academic events, shifts, and holiday policies.
 */

import React from 'react';

export type CalendarCategory = 'WORKING_HOURS' | 'ACADEMIC_EVENT' | 'AGENDA' | 'MY_TASKS' | 'ALL';

export type CalendarDisplayMode = 'grid' | 'timeline' | 'list';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DEFERRED';

export type DutyCategory = 'GENERAL' | 'ACADEMIC' | 'EXAMINATION' | 'ADMINISTRATIVE' | 'FACILITIES';

export interface InstitutionalDuty {
  id: string;
  institution?: string;
  title: string;
  description?: string;
  due_date?: string;
  due_time?: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  priority_display?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  status_display?: string;
  category: DutyCategory | string;
  category_display?: string;
  assigned_to?: string | number | null;
  assigned_to_name?: string;
  created_by?: string | number | null;
  created_by_name?: string;
  is_completed: boolean;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

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
  [key: string]: any;
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
  isOverride?: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export type { WeeklyHolidayConfig } from './WeeklyHolidaySettingsPanel';

export interface CalendarTabItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface DeleteEventOptions {
  deleteScope?: 'THIS_EVENT' | 'THIS_AND_FOLLOWING' | 'ALL_EVENTS';
  targetDate?: string;
  [key: string]: any;
}
