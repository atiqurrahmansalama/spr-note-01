import React from 'react';

export type DashboardRole = 'SUPER_ADMIN' | 'ADMIN' | 'TEACHER' | 'STAFF' | 'GUARDIAN';

export interface DashboardMetric {
  id: string;
  label: string;
  value: string | number;
  subLabel?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  icon: React.ComponentType<{ className?: string }>;
  color?: 'accent' | 'emerald' | 'purple' | 'amber' | 'rose' | 'sky' | 'indigo';
  onClick?: () => void;
  path?: string;
}

export interface DashboardQuickAction {
  id: string;
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: 'accent' | 'emerald' | 'purple' | 'amber' | 'rose' | 'sky';
  badge?: string;
  path: string;
  onClick?: () => void;
}

export interface AttendancePulseData {
  total: number;
  present: number;
  presentRate: number;
  absent: number;
  late: number;
  onLeave: number;
  staffPresentRate?: number;
  staffTotal?: number;
}

export interface ScheduleItem {
  id: string;
  periodName: string;
  timeSlot: string;
  className: string;
  sectionName?: string;
  subject: string;
  room?: string;
  teacherName?: string;
  status: 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface ActivityItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  category: 'ATTENDANCE' | 'ACADEMIC' | 'NOTIFICATION' | 'SECURITY' | 'ADMISSION';
  icon?: React.ComponentType<{ className?: string }>;
}

export interface CalendarEventItem {
  id: string;
  title: string;
  date: string;
  type: 'HOLIDAY' | 'EXAM' | 'MEETING' | 'EVENT';
  impact?: string;
  daysRemaining?: number;
}
