import React from 'react';
import {
  SparklesIcon,
  BookOpenIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  AdjustmentsHorizontalIcon,
  ChecklistIcon,
  TimerIcon,
  AcademicCapIcon,
  BanknotesIcon,
  HomeIcon,
  BellIcon,
  ShieldCheckIcon,
} from '../../components/ui/Icons';

export interface ModuleCategoryDef {
  id: string;
  title: string;
  moduleName: string;
  icon: React.ComponentType<{ className?: string }>;
  widgetIds: string[];
}

/**
 * Enterprise Module-Driven Widget Taxonomy.
 * Groups dashboard widgets cleanly by their source academic or administrative modules.
 */
export const MODULE_CATEGORIES: ModuleCategoryDef[] = [
  {
    id: 'EXECUTIVE_KPI',
    title: 'Executive & KPI Analytics',
    moduleName: 'Dashboard & Analytics',
    icon: SparklesIcon,
    widgetIds: ['kpi_metrics', 'quick_actions'],
  },
  {
    id: 'CLASS_ATTENDANCE',
    title: 'Class Attendance & Presence',
    moduleName: 'Class Attendance',
    icon: ChecklistIcon,
    widgetIds: ['attendance_pulse'],
  },
  {
    id: 'DAILY_CLASSROOM',
    title: 'Daily Classroom & Hifz Progress',
    moduleName: 'Daily Classroom',
    icon: BookOpenIcon,
    widgetIds: ['recitation_trends', 'hifz_tracker', 'academic_progress'],
  },
  {
    id: 'ROUTINE_CURRICULUM',
    title: 'Routine & Period Timetable',
    moduleName: 'Routine & Curriculum',
    icon: TimerIcon,
    widgetIds: ['timetable_schedule'],
  },
  {
    id: 'CALENDAR_EVENTS',
    title: 'Calendar & Institutional Events',
    moduleName: 'Calendar & Events',
    icon: CalendarIcon,
    widgetIds: ['working_hours', 'academic_events', 'agenda_schedule'],
  },
  {
    id: 'STUDENT_ADMISSION',
    title: 'Student Admission Pipeline',
    moduleName: 'Student Admission',
    icon: AcademicCapIcon,
    widgetIds: ['admission_pipeline'],
  },
  {
    id: 'FINANCE_ACCOUNTS',
    title: 'Finance & Fee Collection',
    moduleName: 'Finance & Accounts',
    icon: BanknotesIcon,
    widgetIds: ['finance_overview'],
  },
  {
    id: 'RESIDENTIAL_HOSTEL',
    title: 'Residential Quarters & Dormitory',
    moduleName: 'Residential & Quarters',
    icon: HomeIcon,
    widgetIds: ['residential_occupancy'],
  },
  {
    id: 'NOTICES_COMMUNICATION',
    title: 'Notice Board & Circulars',
    moduleName: 'Communications',
    icon: BellIcon,
    widgetIds: ['notice_board'],
  },
  {
    id: 'SYSTEM_ADMINISTRATION',
    title: 'System Health & Audit Trail',
    moduleName: 'System Administration',
    icon: ShieldCheckIcon,
    widgetIds: ['recent_activity', 'system_gateways'],
  },
];

// Backward-compatible alias for existing imports
export type SectionCategoryDef = ModuleCategoryDef;
export const SECTION_CATEGORIES: SectionCategoryDef[] = MODULE_CATEGORIES;
