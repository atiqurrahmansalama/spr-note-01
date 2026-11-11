import React from 'react';
import type { DashboardRole, WidgetDefinition, DashboardLayoutItem } from './types';
import { fetchWithAuth } from '../../utils/authService';
import { normalizeRoleCode } from '../../utils/roleUtils';
import {
  KpiMetricsWidget,
  AttendancePulseWidget,
  AcademicProgressWidget,
  TimetableScheduleWidget,
  QuickActionsWidget,
  RecentActivityFeedWidget,
  SystemGatewaysWidget,
  HifzQuranProgressWidget,
  FinanceCollectionWidget,
  AdmissionPipelineWidget,
  ResidentialOccupancyWidget,
  NoticeBoardWidget,
  RecitationTrendsWidget,
  WorkingHoursWidget,
  AcademicEventsWidget,
  AgendaScheduleWidget,
} from './components/widgets';

export interface KpiCardCatalogItem {
  id: string;
  label: string;
  module?: string;
  requiredFeatureKey?: string;
}

/**
 * Catalog of executive KPI metric cards available per dashboard role.
 * Used by Workspace Customizer for granular per-card visibility toggles.
 */
export const ROLE_KPI_CARDS_CATALOG: Record<string, KpiCardCatalogItem[]> = {
  SUPER_ADMIN: [
    { id: 'tenants', label: 'Total Institutions', module: 'Campus & Academy', requiredFeatureKey: 'campus_profile' },
    { id: 'students_total', label: 'Global Student Roster', module: 'Student Management', requiredFeatureKey: 'student_roster' },
    { id: 'staff_total', label: 'Active Staff & Faculty', module: 'Staff Management', requiredFeatureKey: 'staff_roster' },
    { id: 'system_health', label: 'SaaS Platform Health', module: 'System & Infrastructure', requiredFeatureKey: 'app_section_control' },
  ],
  ADMIN: [
    { id: 'enrolled_students', label: 'Active Enrollment', module: 'Student Management', requiredFeatureKey: 'student_roster' },
    { id: 'attendance_pulse', label: "Today's Attendance", module: 'Class Attendance', requiredFeatureKey: 'monthly_attendance_matrix' },
    { id: 'today_collection', label: "Today's Collection", module: 'Finance & Accounts', requiredFeatureKey: 'nav_finance' },
    { id: 'pending_admissions', label: 'New Applications', module: 'Student Admission', requiredFeatureKey: 'student_admission' },
  ],
  TEACHER: [
    { id: 'today_recited', label: "Today's Students Recited", module: 'Daily Classroom & Hifz', requiredFeatureKey: 'progress_management' },
    { id: 'pages_and_mistakes', label: 'Pages Heard & Total Mistakes', module: 'Daily Classroom & Hifz', requiredFeatureKey: 'progress_management' },
    { id: 'error_improvement', label: 'Mistakes & Stucks Improvement', module: 'Daily Classroom & Hifz', requiredFeatureKey: 'progress_management' },
    { id: 'class_attendance', label: "Today's Class Presence", module: 'Class Attendance', requiredFeatureKey: 'monthly_attendance_matrix' },
  ],
  STAFF: [
    { id: 'staff_counter_collection', label: "Today's Fee Collection", module: 'Finance & Accounts', requiredFeatureKey: 'nav_finance' },
    { id: 'staff_admissions', label: 'Pending Admissions', module: 'Student Admission', requiredFeatureKey: 'student_admission' },
    { id: 'staff_dorm_beds', label: 'Allocated Hostel Beds', module: 'Residential & Hostel', requiredFeatureKey: 'residential_quarters' },
    { id: 'staff_attendance', label: 'Staff Presence Today', module: 'Staff Management', requiredFeatureKey: 'staff_daily_attendance' },
  ],
  STUDENT: [
    { id: 'hifz_juz', label: 'Completed Juz', module: 'Daily Classroom & Hifz', requiredFeatureKey: 'progress_management' },
    { id: 'my_attendance', label: 'My Attendance Rate', module: 'Class Attendance', requiredFeatureKey: 'monthly_attendance_matrix' },
    { id: 'sabaq_streak', label: 'Sabaq Daily Streak', module: 'Daily Classroom & Hifz', requiredFeatureKey: 'progress_management' },
    { id: 'exam_standing', label: 'Terminal Exam Score', module: 'Examinations & Lesson', requiredFeatureKey: 'lesson_management' },
  ],
  GUARDIAN: [
    { id: 'child_hifz', label: 'Quran Memorization Track', module: 'Daily Classroom & Hifz', requiredFeatureKey: 'progress_management' },
    { id: 'child_attendance', label: 'Attendance Record', module: 'Class Attendance', requiredFeatureKey: 'monthly_attendance_matrix' },
    { id: 'child_dues', label: 'Pending Monthly Tuition', module: 'Finance & Accounts', requiredFeatureKey: 'nav_finance' },
    { id: 'child_standing', label: 'Conduct & Tarbiyah', module: 'Daily Classroom & Hifz', requiredFeatureKey: 'lesson_management' },
  ],
};

export const WIDGET_REGISTRY: Record<string, WidgetDefinition> = {
  recitation_trends: {
    id: 'recitation_trends',
    title: 'Recitation Trends & Analytics',
    description: 'Chronological student recitation volume, pages recited, mistakes, and stucks analysis from Progress Reports.',
    category: 'ACADEMIC',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF', 'STUDENT', 'GUARDIAN'],
    defaultColSpan: 4,
    minColSpan: 2,
    maxColSpan: 4,
    widgetFeatureKey: 'dashboard_widget_recitation_trends',
    requiredFeatureKey: 'progress_management',
    component: RecitationTrendsWidget,
  },
  kpi_metrics: {
    id: 'kpi_metrics',
    title: 'KPI Metrics & Executive Counters',
    description: 'High-level institutional statistics, enrollment, and staff counters with trend indicators.',
    category: 'METRICS',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF', 'STUDENT', 'GUARDIAN'],
    defaultColSpan: 4,
    minColSpan: 2,
    maxColSpan: 4,
    widgetFeatureKey: 'dashboard_widget_kpi_metrics',
    requiredFeatureKey: 'nav_dashboard',
    component: KpiMetricsWidget,
  },
  attendance_pulse: {
    id: 'attendance_pulse',
    title: 'Attendance Pulse & Roll Call',
    description: 'Real-time student & staff attendance status, live presence rates, and roll call shortcut.',
    category: 'ATTENDANCE',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF', 'STUDENT', 'GUARDIAN'],
    defaultColSpan: 2,
    minColSpan: 1,
    maxColSpan: 3,
    widgetFeatureKey: 'dashboard_widget_attendance_pulse',
    requiredFeatureKey: 'monthly_attendance_matrix',
    component: AttendancePulseWidget,
  },
  hifz_tracker: {
    id: 'hifz_tracker',
    title: 'Hifz Quran Tracker (Sabaq, Sabqi, Dawr)',
    description: 'Daily Quran memorization status, completed Juz, and mistake counts.',
    category: 'ACADEMIC',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF', 'STUDENT', 'GUARDIAN'],
    defaultColSpan: 2,
    minColSpan: 1,
    maxColSpan: 4,
    widgetFeatureKey: 'dashboard_widget_hifz_tracker',
    requiredFeatureKey: 'progress_management',
    component: HifzQuranProgressWidget,
  },
  academic_progress: {
    id: 'academic_progress',
    title: 'Academic & Syllabus Velocity',
    description: 'Syllabus completion percentage across subjects, lessons, and term goals.',
    category: 'ACADEMIC',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF', 'STUDENT', 'GUARDIAN'],
    defaultColSpan: 2,
    minColSpan: 1,
    maxColSpan: 4,
    widgetFeatureKey: 'dashboard_widget_academic_progress',
    requiredFeatureKey: 'lesson_management',
    component: AcademicProgressWidget,
  },
  timetable_schedule: {
    id: 'timetable_schedule',
    title: "Today's Timetable & Period Schedule",
    description: 'Upcoming period timeslots, active subjects, room allocations, and teachers.',
    category: 'CALENDAR',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF', 'STUDENT', 'GUARDIAN'],
    defaultColSpan: 2,
    minColSpan: 1,
    maxColSpan: 3,
    widgetFeatureKey: 'dashboard_widget_timetable_schedule',
    requiredFeatureKey: 'class_period_slots',
    component: TimetableScheduleWidget,
  },
  finance_overview: {
    id: 'finance_overview',
    title: 'Finance & Fee Collection Counter',
    description: "Today's cash inflow, monthly tuition collection, and pending student dues.",
    category: 'FINANCE',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF', 'STUDENT', 'GUARDIAN'],
    defaultColSpan: 2,
    minColSpan: 1,
    maxColSpan: 3,
    widgetFeatureKey: 'dashboard_widget_finance_overview',
    requiredFeatureKey: 'nav_finance',
    component: FinanceCollectionWidget,
  },
  admission_pipeline: {
    id: 'admission_pipeline',
    title: 'Admission Application Pipeline',
    description: 'Four-stage intake funnel tracking new applicants, interviews, and approvals.',
    category: 'OPERATIONS',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF', 'STUDENT', 'GUARDIAN'],
    defaultColSpan: 2,
    minColSpan: 1,
    maxColSpan: 4,
    widgetFeatureKey: 'dashboard_widget_admission_pipeline',
    requiredFeatureKey: 'student_admission',
    component: AdmissionPipelineWidget,
  },
  residential_occupancy: {
    id: 'residential_occupancy',
    title: 'Residential Quarters & Dormitory Occupancy',
    description: 'Hostel bed allocation, night attendance rollcall, and student leave counters.',
    category: 'OPERATIONS',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF', 'STUDENT', 'GUARDIAN'],
    defaultColSpan: 2,
    minColSpan: 1,
    maxColSpan: 3,
    widgetFeatureKey: 'dashboard_widget_residential_occupancy',
    requiredFeatureKey: 'residential_quarters',
    component: ResidentialOccupancyWidget,
  },
  notice_board: {
    id: 'notice_board',
    title: 'Institutional Notice Board & Circulars',
    description: 'Urgent announcements, examination alerts, holiday notices, and circulars.',
    category: 'COMMUNICATION',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF', 'STUDENT', 'GUARDIAN'],
    defaultColSpan: 2,
    minColSpan: 1,
    maxColSpan: 3,
    widgetFeatureKey: 'dashboard_widget_notice_board',
    requiredFeatureKey: 'notification_management',
    component: NoticeBoardWidget,
  },
  working_hours: {
    id: 'working_hours',
    title: 'Working Hours & Shifts',
    description: 'Operational work shifts, active roster coverage, and weekly holidays with Grid and Timeline views.',
    category: 'CALENDAR',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF', 'STUDENT', 'GUARDIAN'],
    defaultColSpan: 4,
    minColSpan: 2,
    maxColSpan: 4,
    widgetFeatureKey: 'dashboard_widget_working_hours',
    requiredFeatureKey: 'academy_calendar_events',
    component: WorkingHoursWidget,
  },
  academic_events: {
    id: 'academic_events',
    title: 'Academic Events & Milestones',
    description: 'Interactive academic calendar, examinations, holidays, and milestones with Grid and Timeline views.',
    category: 'CALENDAR',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF', 'STUDENT', 'GUARDIAN'],
    defaultColSpan: 4,
    minColSpan: 2,
    maxColSpan: 4,
    widgetFeatureKey: 'dashboard_widget_academic_events',
    requiredFeatureKey: 'academy_calendar_events',
    component: AcademicEventsWidget,
  },
  agenda_schedule: {
    id: 'agenda_schedule',
    title: 'Daily Agenda & Schedule Checklist',
    description: 'Day-by-day actionable agenda checklist, scheduled timeline events, and active milestones.',
    category: 'CALENDAR',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF', 'STUDENT', 'GUARDIAN'],
    defaultColSpan: 2,
    minColSpan: 1,
    maxColSpan: 4,
    widgetFeatureKey: 'dashboard_widget_agenda_schedule',
    requiredFeatureKey: 'academy_calendar_events',
    component: AgendaScheduleWidget,
  },
  recent_activity: {
    id: 'recent_activity',
    title: 'Live Audit Trail & Activity Feed',
    description: 'System actions, logins, admissions, and changes across the institution.',
    category: 'SYSTEM',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF', 'STUDENT', 'GUARDIAN'],
    defaultColSpan: 2,
    minColSpan: 1,
    maxColSpan: 3,
    widgetFeatureKey: 'dashboard_widget_recent_activity',
    requiredFeatureKey: 'app_activity_analytics',
    component: RecentActivityFeedWidget,
  },
  system_gateways: {
    id: 'system_gateways',
    title: 'Cloud Gateway & Enterprise Health',
    description: 'SMS notification gateways, database replication, and offline sync engines.',
    category: 'SYSTEM',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF', 'STUDENT', 'GUARDIAN'],
    defaultColSpan: 2,
    minColSpan: 1,
    maxColSpan: 4,
    widgetFeatureKey: 'dashboard_widget_system_gateways',
    requiredFeatureKey: 'app_section_control',
    component: SystemGatewaysWidget,
  },
  quick_actions: {
    id: 'quick_actions',
    title: 'Quick Actions & Operational Shortcuts',
    description: 'Dynamic one-click launchpads for frequent administrative and academic workflows.',
    category: 'TOOLS',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF', 'STUDENT', 'GUARDIAN'],
    defaultColSpan: 4,
    minColSpan: 2,
    maxColSpan: 4,
    widgetFeatureKey: 'dashboard_widget_quick_actions',
    requiredFeatureKey: 'nav_dashboard',
    component: QuickActionsWidget,
  },
};

/**
 * Default canonical widget layout templates per role.
 * Used for initial pristine rendering and reset operations.
 */
export const DEFAULT_ROLE_LAYOUTS: Record<string, DashboardLayoutItem[]> = {
  SUPER_ADMIN: [
    { widgetId: 'kpi_metrics', order: 1, colSpan: 4, isVisible: true },
    { widgetId: 'system_gateways', order: 2, colSpan: 2, isVisible: true },
    { widgetId: 'recent_activity', order: 3, colSpan: 2, isVisible: true },
    { widgetId: 'finance_overview', order: 4, colSpan: 2, isVisible: true },
    { widgetId: 'academic_events', order: 5, colSpan: 4, isVisible: true },
    { widgetId: 'working_hours', order: 6, colSpan: 4, isVisible: true },
    { widgetId: 'agenda_schedule', order: 7, colSpan: 2, isVisible: true },
    { widgetId: 'notice_board', order: 8, colSpan: 4, isVisible: true },
  ],
  ADMIN: [
    { widgetId: 'kpi_metrics', order: 1, colSpan: 4, isVisible: true },
    { widgetId: 'attendance_pulse', order: 2, colSpan: 2, isVisible: true },
    { widgetId: 'finance_overview', order: 3, colSpan: 2, isVisible: true },
    { widgetId: 'residential_occupancy', order: 4, colSpan: 2, isVisible: true },
    { widgetId: 'admission_pipeline', order: 5, colSpan: 2, isVisible: true },
    { widgetId: 'notice_board', order: 6, colSpan: 2, isVisible: true },
    { widgetId: 'agenda_schedule', order: 7, colSpan: 2, isVisible: true },
    { widgetId: 'academic_events', order: 8, colSpan: 4, isVisible: true },
    { widgetId: 'working_hours', order: 9, colSpan: 4, isVisible: true },
    { widgetId: 'recent_activity', order: 10, colSpan: 2, isVisible: true },
    { widgetId: 'quick_actions', order: 11, colSpan: 4, isVisible: true },
  ],
  TEACHER: [
    { widgetId: 'kpi_metrics', order: 1, colSpan: 4, isVisible: true },
    { widgetId: 'recitation_trends', order: 2, colSpan: 4, isVisible: true },
    { widgetId: 'hifz_tracker', order: 3, colSpan: 2, isVisible: true },
    { widgetId: 'attendance_pulse', order: 4, colSpan: 2, isVisible: true },
    { widgetId: 'timetable_schedule', order: 5, colSpan: 2, isVisible: true },
    { widgetId: 'agenda_schedule', order: 6, colSpan: 2, isVisible: true },
    { widgetId: 'academic_events', order: 7, colSpan: 4, isVisible: true },
    { widgetId: 'quick_actions', order: 8, colSpan: 4, isVisible: true },
    { widgetId: 'notice_board', order: 9, colSpan: 4, isVisible: true },
  ],
  STAFF: [
    { widgetId: 'kpi_metrics', order: 1, colSpan: 4, isVisible: true },
    { widgetId: 'working_hours', order: 2, colSpan: 4, isVisible: true },
    { widgetId: 'agenda_schedule', order: 3, colSpan: 2, isVisible: true },
    { widgetId: 'finance_overview', order: 4, colSpan: 2, isVisible: true },
    { widgetId: 'residential_occupancy', order: 5, colSpan: 2, isVisible: true },
    { widgetId: 'attendance_pulse', order: 6, colSpan: 2, isVisible: true },
    { widgetId: 'admission_pipeline', order: 7, colSpan: 2, isVisible: true },
    { widgetId: 'notice_board', order: 8, colSpan: 4, isVisible: true },
  ],
  STUDENT: [
    { widgetId: 'kpi_metrics', order: 1, colSpan: 4, isVisible: true },
    { widgetId: 'hifz_tracker', order: 2, colSpan: 2, isVisible: true },
    { widgetId: 'attendance_pulse', order: 3, colSpan: 2, isVisible: true },
    { widgetId: 'timetable_schedule', order: 4, colSpan: 2, isVisible: true },
    { widgetId: 'notice_board', order: 5, colSpan: 2, isVisible: true },
    { widgetId: 'academic_events', order: 6, colSpan: 4, isVisible: true },
  ],
  GUARDIAN: [
    { widgetId: 'kpi_metrics', order: 1, colSpan: 4, isVisible: true },
    { widgetId: 'hifz_tracker', order: 2, colSpan: 2, isVisible: true },
    { widgetId: 'attendance_pulse', order: 3, colSpan: 2, isVisible: true },
    { widgetId: 'finance_overview', order: 4, colSpan: 2, isVisible: true },
    { widgetId: 'notice_board', order: 5, colSpan: 2, isVisible: true },
    { widgetId: 'academic_events', order: 6, colSpan: 4, isVisible: true },
  ],
};

function dispatchDashboardSyncEvents(detail: Record<string, any> = {}): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('spr_dashboard_layout_updated', { detail }));
}

async function pushDashboardConfigPayload(payload: Record<string, any>, tenantId?: string): Promise<void> {
  const qs = tenantId && tenantId !== 'GLOBAL' ? `?tenant_id=${encodeURIComponent(tenantId)}` : '';
  const candidateUrls = [`/api/v1/dashboard/config/${qs}`, `/api/dashboard/config/${qs}`];
  for (const url of candidateUrls) {
    try {
      const res = await fetchWithAuth(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) return;
      if (res.status === 403 || res.status === 400) return;
    } catch {
      // Try next endpoint alias
    }
  }
}

/**
 * Synchronizes institutional dashboard workspace templates (`role_templates`)
 * from the backend PostgreSQL database into the local offline-first store.
 */
export async function syncDashboardConfigFromCloud(tenantId?: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;

  const qs =
    tenantId && tenantId !== 'ALL' && tenantId !== 'GLOBAL' && tenantId !== 'default'
      ? `?tenant_id=${encodeURIComponent(tenantId)}&_t=${Date.now()}`
      : `?_t=${Date.now()}`;
  const candidateUrls = [`/api/v1/dashboard/config/${qs}`, `/api/dashboard/config/${qs}`];

  for (const url of candidateUrls) {
    try {
      const res = await fetchWithAuth(url);
      if (!res.ok) continue;
      const data = await res.json();
      let changed = false;

      const resolvedTid = data.tenant_id || tenantId || 'default';
      if (data.role_templates && typeof data.role_templates === 'object') {
        Object.entries(data.role_templates).forEach(([roleCode, items]) => {
          const cleanCode = normalizeRoleCode(roleCode);
          if (cleanCode && Array.isArray(items) && items.length > 0) {
            const tplKey = `spr_dashboard_template_${resolvedTid}_${cleanCode}_v1`;
            const tplStr = JSON.stringify(items);
            if (localStorage.getItem(tplKey) !== tplStr) {
              localStorage.setItem(tplKey, tplStr);
              changed = true;
            }
          }
        });
      }

      if (changed) {
        dispatchDashboardSyncEvents({ tenantId: resolvedTid, source: 'cloud' });
      }
      return true;
    } catch {
      // Try fallback alias
    }
  }
  return false;
}

/**
 * Checks whether a widget is permitted under the active Feature & Module Control configuration.
 * Evaluates both the widget-level feature flag (`dashboard_widget_*`) and parent module key.
 */
export function isWidgetFeaturePermitted(
  widgetDef: WidgetDefinition | undefined,
  isFeatureEnabled: (featureKey?: string) => boolean
): boolean {
  if (!widgetDef) return false;
  if (widgetDef.widgetFeatureKey && !isFeatureEnabled(widgetDef.widgetFeatureKey)) {
    return false;
  }
  if (widgetDef.requiredFeatureKey && !isFeatureEnabled(widgetDef.requiredFeatureKey)) {
    return false;
  }
  return true;
}

/**
 * Returns all widget definitions permitted by App Management -> Feature & Module Control.
 */
export function getAvailableWidgets(
  isFeatureEnabled: (featureKey?: string) => boolean
): WidgetDefinition[] {
  return Object.values(WIDGET_REGISTRY).filter((w) => isWidgetFeaturePermitted(w, isFeatureEnabled));
}

/**
 * Returns executive KPI card catalog items for a given role.
 */
export function getKpiCardsForRole(
  role: DashboardRole,
  isFeatureEnabled?: (featureKey?: string) => boolean
): KpiCardCatalogItem[] {
  const roleCode = normalizeRoleCode(role) || 'ADMIN';
  const cards = ROLE_KPI_CARDS_CATALOG[roleCode] || ROLE_KPI_CARDS_CATALOG.ADMIN || [];
  if (!isFeatureEnabled) return cards;
  return cards.filter((card) => !card.requiredFeatureKey || isFeatureEnabled(card.requiredFeatureKey));
}

/**
 * Get layout items for a given role from localStorage or fallback to defaults.
 */
export function getSavedLayout(tenantId: string, role: DashboardRole, userId?: string): DashboardLayoutItem[] {
  const roleCode = normalizeRoleCode(role) || 'ADMIN';
  const userKey = `spr_dashboard_layout_${tenantId || 'default'}_${roleCode}_${userId || 'anon'}_v1`;
  const roleTemplateKey = `spr_dashboard_template_${tenantId || 'default'}_${roleCode}_v1`;
  const globalTemplateKey = `spr_dashboard_template_GLOBAL_${roleCode}_v1`;

  const normalizeLayoutItems = (items: any[]): DashboardLayoutItem[] => {
    // 1. Remove legacy monolithic academic_calendar and upcoming_events widgets
    const filtered = items.filter((i) => i && i.widgetId !== 'academic_calendar' && i.widgetId !== 'upcoming_events');

    // 2. Ensure separated widgets (working_hours, academic_events, agenda_schedule) exist for roles
    const hasWorkingHours = filtered.some((i) => i.widgetId === 'working_hours');
    const hasAcademicEvents = filtered.some((i) => i.widgetId === 'academic_events');
    const hasAgenda = filtered.some((i) => i.widgetId === 'agenda_schedule');

    if (!hasAcademicEvents) {
      filtered.push({
        widgetId: 'academic_events',
        order: filtered.length + 1,
        colSpan: 4,
        isVisible: true,
        settings: { displayMode: 'grid' },
      });
    }
    if (!hasWorkingHours) {
      filtered.push({
        widgetId: 'working_hours',
        order: filtered.length + 1,
        colSpan: 4,
        isVisible: true,
        settings: { displayMode: 'grid' },
      });
    }
    if (!hasAgenda) {
      filtered.push({
        widgetId: 'agenda_schedule',
        order: filtered.length + 1,
        colSpan: 2,
        isVisible: true,
      });
    }

    return filtered.map((item) => {
      const def = WIDGET_REGISTRY[item.widgetId];
      const colSpan = (item.colSpan === 3 && def?.defaultColSpan === 4) ? 4 : (item.colSpan || def?.defaultColSpan || 2);
      return {
        ...item,
        colSpan,
        settings: item.settings || {},
      };
    });
  };

  try {
    const raw = localStorage.getItem(userKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return normalizeLayoutItems(parsed);
      }
    }
    const templateSaved = localStorage.getItem(roleTemplateKey) || localStorage.getItem(globalTemplateKey);
    if (templateSaved) {
      const parsed = JSON.parse(templateSaved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return normalizeLayoutItems(parsed);
      }
    }
  } catch (err) {
    console.warn('Dashboard: Failed to load layout from storage:', err);
  }

  return DEFAULT_ROLE_LAYOUTS[roleCode] || DEFAULT_ROLE_LAYOUTS.ADMIN;
}

/**
 * Persist user customized layout to tenant-scoped storage and optionally promote as institutional role template.
 */
export function saveLayout(
  tenantId: string,
  role: DashboardRole,
  items: DashboardLayoutItem[],
  userId?: string,
  saveAsRoleDefault = false
): void {
  const roleCode = normalizeRoleCode(role) || 'ADMIN';
  const userKey = `spr_dashboard_layout_${tenantId || 'default'}_${roleCode}_${userId || 'anon'}_v1`;
  const roleTemplateKey = `spr_dashboard_template_${tenantId || 'default'}_${roleCode}_v1`;

  try {
    localStorage.setItem(userKey, JSON.stringify(items));
    if (saveAsRoleDefault) {
      localStorage.setItem(roleTemplateKey, JSON.stringify(items));
      pushDashboardConfigPayload(
        {
          role_template: {
            role: roleCode,
            items,
            scope: tenantId && tenantId !== 'ALL' && tenantId !== 'GLOBAL' && tenantId !== 'default' ? 'tenant' : 'global',
          },
          tenant_id: tenantId,
        },
        tenantId
      ).catch(() => {});
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('spr_dashboard_layout_updated', {
          detail: { role: roleCode, tenantId, items },
        })
      );
    }
  } catch (err) {
    console.warn('Dashboard: Failed to persist layout to storage:', err);
  }
}

/**
 * Reset layout back to institutional default or baseline.
 */
export function resetLayout(tenantId: string, role: DashboardRole, userId?: string): DashboardLayoutItem[] {
  const roleCode = normalizeRoleCode(role) || 'ADMIN';
  const userKey = `spr_dashboard_layout_${tenantId || 'default'}_${roleCode}_${userId || 'anon'}_v1`;
  const roleTemplateKey = `spr_dashboard_template_${tenantId || 'default'}_${roleCode}_v1`;
  try {
    localStorage.removeItem(userKey);
    const templateSaved = localStorage.getItem(roleTemplateKey) || localStorage.getItem(`spr_dashboard_template_GLOBAL_${roleCode}_v1`);
    if (templateSaved) {
      const parsed = JSON.parse(templateSaved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_ROLE_LAYOUTS[roleCode] || DEFAULT_ROLE_LAYOUTS.ADMIN;
}

