/**
 * SPR Note — Calendar & Events Module Types
 * ==========================================
 * Explicit TypeScript interfaces and type definitions for institutional
 * working schedules, academic events, shifts, and holiday policies.
 */

import React from 'react';

export type CalendarCategory = 'WORKING_HOURS' | 'ACADEMIC_EVENT' | 'AGENDA' | 'ALL';

export type CalendarDisplayMode = 'grid' | 'timeline' | 'list';

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
