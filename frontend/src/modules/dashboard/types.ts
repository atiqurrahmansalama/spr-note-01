import React from 'react';

export type DashboardRole = 'SUPER_ADMIN' | 'ADMIN' | 'TEACHER' | 'STAFF' | 'STUDENT' | 'GUARDIAN';

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

export interface ProgressItem {
  id: string;
  label: string;
  percentage: number;
  subLabel?: string;
  color?: 'emerald' | 'amber' | 'purple' | 'accent' | 'sky';
}

export interface HifzProgressData {
  studentName?: string;
  currentJuz: number;
  completedJuz: number;
  currentSurah: string;
  currentAyah: number;
  sabaq: string;
  sabaqStatus: 'EXCELLENT' | 'GOOD' | 'NEEDS_PRACTICE';
  sabqi: string;
  dawr: string;
  dailyMistakes: number;
  dailyStucks: number;
  lastExamScore?: number;
}

export interface FinanceOverviewData {
  todayCollection: number;
  monthlyTotal: number;
  pendingDues: number;
  collectionRate: number;
  recentTransactions: Array<{
    id: string;
    studentName: string;
    studentClass: string;
    amount: number;
    method: string;
    time: string;
  }>;
}

export interface AdmissionPipelineData {
  totalApplications: number;
  underReview: number;
  interviewScheduled: number;
  approved: number;
  enrolled: number;
}

export interface ResidentialOccupancyData {
  totalBeds: number;
  occupiedBeds: number;
  occupancyRate: number;
  presentTonight: number;
  onLeave: number;
}

export interface NoticeItem {
  id: string;
  title: string;
  category: 'ACADEMIC' | 'EXAM' | 'ADMIN' | 'HOLIDAY';
  date: string;
  priority: 'HIGH' | 'NORMAL' | 'LOW';
  content: string;
}

export type WidgetCategory =
  | 'METRICS'
  | 'ACADEMIC'
  | 'ATTENDANCE'
  | 'FINANCE'
  | 'OPERATIONS'
  | 'COMMUNICATION'
  | 'SYSTEM';

export interface WidgetDefinition {
  id: string;
  title: string;
  description: string;
  category: WidgetCategory;
  allowedRoles: DashboardRole[];
  defaultColSpan: 1 | 2 | 3;
  requiredFeatureKey?: string;
  component: React.ComponentType<any>;
}

export interface DashboardLayoutItem {
  widgetId: string;
  order: number;
  colSpan: 1 | 2 | 3;
  isVisible: boolean;
}
