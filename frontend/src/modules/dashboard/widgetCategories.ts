import React from 'react';
import {
  SparklesIcon,
  BookOpenIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  AdjustmentsHorizontalIcon,
} from '../../components/ui/Icons';

export interface SectionCategoryDef {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  widgetIds: string[];
}

export const SECTION_CATEGORIES: SectionCategoryDef[] = [
  {
    id: 'METRICS',
    title: 'Metrics & Executive Counters',
    icon: SparklesIcon,
    widgetIds: ['kpi_metrics', 'attendance_pulse'],
  },
  {
    id: 'ACADEMIC',
    title: 'Academic & Quranic Learning',
    icon: BookOpenIcon,
    widgetIds: ['recitation_trends', 'hifz_tracker', 'academic_progress'],
  },
  {
    id: 'CALENDAR',
    title: 'Calendar & Schedules',
    icon: CalendarIcon,
    widgetIds: ['academic_calendar', 'upcoming_events', 'timetable_schedule'],
  },
  {
    id: 'FINANCE_OPERATIONS',
    title: 'Finance & Administration',
    icon: BuildingOfficeIcon,
    widgetIds: ['finance_overview', 'residential_occupancy', 'admission_pipeline'],
  },
  {
    id: 'TOOLS_COMMUNICATION',
    title: 'Quick Tools & Communication',
    icon: AdjustmentsHorizontalIcon,
    widgetIds: ['quick_actions', 'notice_board', 'recent_activity', 'system_gateways'],
  },
];

