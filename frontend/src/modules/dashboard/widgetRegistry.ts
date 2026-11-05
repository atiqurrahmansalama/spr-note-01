import React from 'react';
import type { DashboardRole, WidgetDefinition, DashboardLayoutItem } from './types';
import {
  KpiMetricsWidget,
  AttendancePulseWidget,
  AcademicProgressWidget,
  TimetableScheduleWidget,
  QuickActionsWidget,
  RecentActivityFeedWidget,
  SystemGatewaysWidget,
  UpcomingEventsWidget,
  HifzQuranProgressWidget,
  FinanceCollectionWidget,
  AdmissionPipelineWidget,
  ResidentialOccupancyWidget,
  NoticeBoardWidget,
} from './components/widgets';

export const WIDGET_REGISTRY: Record<string, WidgetDefinition> = {
  kpi_metrics: {
    id: 'kpi_metrics',
    title: 'KPI Metrics & Executive Counters',
    description: 'High-level institutional statistics, enrollment, and staff counters with trend indicators.',
    category: 'METRICS',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF', 'STUDENT', 'GUARDIAN'],
    defaultColSpan: 3,
    component: KpiMetricsWidget,
  },
  attendance_pulse: {
    id: 'attendance_pulse',
    title: 'Attendance Pulse & Roll Call',
    description: 'Real-time student & staff attendance status, live presence rates, and roll call shortcut.',
    category: 'ATTENDANCE',
    allowedRoles: ['ADMIN', 'TEACHER', 'STAFF', 'STUDENT', 'GUARDIAN'],
    defaultColSpan: 1,
    component: AttendancePulseWidget,
  },
  hifz_tracker: {
    id: 'hifz_tracker',
    title: 'Hifz Quran Tracker (Sabaq, Sabqi, Dawr)',
    description: 'Daily Quran memorization status, completed Juz, and mistake counts.',
    category: 'ACADEMIC',
    allowedRoles: ['ADMIN', 'TEACHER', 'STUDENT', 'GUARDIAN'],
    defaultColSpan: 2,
    component: HifzQuranProgressWidget,
  },
  timetable_schedule: {
    id: 'timetable_schedule',
    title: "Today's Timetable & Period Schedule",
    description: 'Upcoming period timeslots, active subjects, room allocations, and teachers.',
    category: 'ACADEMIC',
    allowedRoles: ['ADMIN', 'TEACHER', 'STUDENT', 'GUARDIAN'],
    defaultColSpan: 1,
    component: TimetableScheduleWidget,
  },
  finance_overview: {
    id: 'finance_overview',
    title: 'Finance & Fee Collection Counter',
    description: "Today's cash inflow, monthly tuition collection, and pending student dues.",
    category: 'FINANCE',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'GUARDIAN'],
    defaultColSpan: 1,
    component: FinanceCollectionWidget,
  },
  admission_pipeline: {
    id: 'admission_pipeline',
    title: 'Admission Application Pipeline',
    description: 'Four-stage intake funnel tracking new applicants, interviews, and approvals.',
    category: 'OPERATIONS',
    allowedRoles: ['ADMIN', 'STAFF'],
    defaultColSpan: 2,
    component: AdmissionPipelineWidget,
  },
  residential_occupancy: {
    id: 'residential_occupancy',
    title: 'Residential Quarters & Dormitory Occupancy',
    description: 'Hostel bed allocation, night attendance rollcall, and student leave counters.',
    category: 'OPERATIONS',
    allowedRoles: ['ADMIN', 'STAFF'],
    defaultColSpan: 1,
    component: ResidentialOccupancyWidget,
  },
  notice_board: {
    id: 'notice_board',
    title: 'Institutional Notice Board & Circulars',
    description: 'Urgent announcements, examination alerts, holiday notices, and circulars.',
    category: 'COMMUNICATION',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF', 'STUDENT', 'GUARDIAN'],
    defaultColSpan: 1,
    component: NoticeBoardWidget,
  },
  upcoming_events: {
    id: 'upcoming_events',
    title: 'Upcoming Academic & Islamic Calendar Events',
    description: 'Countdown to examinations, holidays, and institutional parent-teacher meetings.',
    category: 'COMMUNICATION',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF', 'STUDENT', 'GUARDIAN'],
    defaultColSpan: 1,
    component: UpcomingEventsWidget,
  },
  recent_activity: {
    id: 'recent_activity',
    title: 'Live Audit Trail & Activity Feed',
    description: 'System actions, logins, admissions, and changes across the institution.',
    category: 'SYSTEM',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'STAFF'],
    defaultColSpan: 1,
    component: RecentActivityFeedWidget,
  },
  system_gateways: {
    id: 'system_gateways',
    title: 'Cloud Gateway & Enterprise Health',
    description: 'SMS notification gateways, database replication, and offline sync engines.',
    category: 'SYSTEM',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN'],
    defaultColSpan: 2,
    component: SystemGatewaysWidget,
  },
  quick_actions: {
    id: 'quick_actions',
    title: 'Quick Actions & Operational Shortcuts',
    description: 'One-click launchpads for frequent administrative and academic workflows.',
    category: 'OPERATIONS',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF'],
    defaultColSpan: 3,
    component: QuickActionsWidget,
  },
};

/**
 * Default canonical widget layout templates per role.
 * Used for initial pristine rendering and reset operations.
 */
export const DEFAULT_ROLE_LAYOUTS: Record<DashboardRole, DashboardLayoutItem[]> = {
  SUPER_ADMIN: [
    { widgetId: 'kpi_metrics', order: 1, colSpan: 3, isVisible: true },
    { widgetId: 'system_gateways', order: 2, colSpan: 2, isVisible: true },
    { widgetId: 'recent_activity', order: 3, colSpan: 1, isVisible: true },
    { widgetId: 'finance_overview', order: 4, colSpan: 1, isVisible: true },
    { widgetId: 'upcoming_events', order: 5, colSpan: 1, isVisible: true },
    { widgetId: 'notice_board', order: 6, colSpan: 1, isVisible: true },
  ],
  ADMIN: [
    { widgetId: 'kpi_metrics', order: 1, colSpan: 3, isVisible: true },
    { widgetId: 'attendance_pulse', order: 2, colSpan: 1, isVisible: true },
    { widgetId: 'finance_overview', order: 3, colSpan: 1, isVisible: true },
    { widgetId: 'residential_occupancy', order: 4, colSpan: 1, isVisible: true },
    { widgetId: 'admission_pipeline', order: 5, colSpan: 2, isVisible: true },
    { widgetId: 'notice_board', order: 6, colSpan: 1, isVisible: true },
    { widgetId: 'upcoming_events', order: 7, colSpan: 1, isVisible: true },
    { widgetId: 'recent_activity', order: 8, colSpan: 1, isVisible: true },
    { widgetId: 'quick_actions', order: 9, colSpan: 1, isVisible: true },
  ],
  TEACHER: [
    { widgetId: 'kpi_metrics', order: 1, colSpan: 3, isVisible: true },
    { widgetId: 'attendance_pulse', order: 2, colSpan: 1, isVisible: true },
    { widgetId: 'hifz_tracker', order: 3, colSpan: 2, isVisible: true },
    { widgetId: 'timetable_schedule', order: 4, colSpan: 1, isVisible: true },
    { widgetId: 'notice_board', order: 5, colSpan: 1, isVisible: true },
    { widgetId: 'upcoming_events', order: 6, colSpan: 1, isVisible: true },
  ],
  STAFF: [
    { widgetId: 'kpi_metrics', order: 1, colSpan: 3, isVisible: true },
    { widgetId: 'finance_overview', order: 2, colSpan: 1, isVisible: true },
    { widgetId: 'residential_occupancy', order: 3, colSpan: 1, isVisible: true },
    { widgetId: 'attendance_pulse', order: 4, colSpan: 1, isVisible: true },
    { widgetId: 'admission_pipeline', order: 5, colSpan: 2, isVisible: true },
    { widgetId: 'notice_board', order: 6, colSpan: 1, isVisible: true },
  ],
  STUDENT: [
    { widgetId: 'kpi_metrics', order: 1, colSpan: 3, isVisible: true },
    { widgetId: 'hifz_tracker', order: 2, colSpan: 2, isVisible: true },
    { widgetId: 'attendance_pulse', order: 3, colSpan: 1, isVisible: true },
    { widgetId: 'timetable_schedule', order: 4, colSpan: 1, isVisible: true },
    { widgetId: 'notice_board', order: 5, colSpan: 1, isVisible: true },
    { widgetId: 'upcoming_events', order: 6, colSpan: 1, isVisible: true },
  ],
  GUARDIAN: [
    { widgetId: 'kpi_metrics', order: 1, colSpan: 3, isVisible: true },
    { widgetId: 'hifz_tracker', order: 2, colSpan: 2, isVisible: true },
    { widgetId: 'attendance_pulse', order: 3, colSpan: 1, isVisible: true },
    { widgetId: 'finance_overview', order: 4, colSpan: 1, isVisible: true },
    { widgetId: 'notice_board', order: 5, colSpan: 1, isVisible: true },
    { widgetId: 'upcoming_events', order: 6, colSpan: 1, isVisible: true },
  ],
};

/**
 * Returns all widget definitions eligible for a given role.
 */
export function getWidgetsForRole(role: DashboardRole): WidgetDefinition[] {
  return Object.values(WIDGET_REGISTRY).filter((widget) =>
    widget.allowedRoles.includes(role)
  );
}

/**
 * Get layout items for a given role from localStorage or fallback to defaults.
 */
export function getSavedLayout(tenantId: string, role: DashboardRole, userId?: string): DashboardLayoutItem[] {
  const userKey = `spr_dashboard_layout_${tenantId || 'default'}_${role}_${userId || 'anon'}_v1`;
  const roleTemplateKey = `spr_dashboard_template_${tenantId || 'default'}_${role}_v1`;

  try {
    const userSaved = localStorage.getItem(userKey);
    if (userSaved) {
      const parsed = JSON.parse(userSaved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    const templateSaved = localStorage.getItem(roleTemplateKey);
    if (templateSaved) {
      const parsed = JSON.parse(templateSaved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.warn('Dashboard: Failed to load layout from storage:', err);
  }

  return DEFAULT_ROLE_LAYOUTS[role] || DEFAULT_ROLE_LAYOUTS.ADMIN;
}

/**
 * Persist user customized layout to tenant-scoped storage.
 */
export function saveLayout(
  tenantId: string,
  role: DashboardRole,
  items: DashboardLayoutItem[],
  userId?: string,
  saveAsRoleDefault = false
): void {
  const userKey = `spr_dashboard_layout_${tenantId || 'default'}_${role}_${userId || 'anon'}_v1`;
  const roleTemplateKey = `spr_dashboard_template_${tenantId || 'default'}_${role}_v1`;

  try {
    localStorage.setItem(userKey, JSON.stringify(items));
    if (saveAsRoleDefault) {
      localStorage.setItem(roleTemplateKey, JSON.stringify(items));
    }
  } catch (err) {
    console.warn('Dashboard: Failed to persist layout to storage:', err);
  }
}

/**
 * Reset layout back to institutional default.
 */
export function resetLayout(tenantId: string, role: DashboardRole, userId?: string): DashboardLayoutItem[] {
  const userKey = `spr_dashboard_layout_${tenantId || 'default'}_${role}_${userId || 'anon'}_v1`;
  try {
    localStorage.removeItem(userKey);
  } catch {}
  return DEFAULT_ROLE_LAYOUTS[role] || DEFAULT_ROLE_LAYOUTS.ADMIN;
}

