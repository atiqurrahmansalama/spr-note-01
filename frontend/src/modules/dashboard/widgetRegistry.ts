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
  RecitationTrendsWidget,
  AcademicCalendarWidget,
} from './components/widgets';

export interface KpiCardCatalogItem {
  id: string;
  label: string;
  requiredFeatureKey?: string;
}

/**
 * Catalog of executive KPI metric cards available per dashboard role.
 * Used by Workspace Customizer for granular per-card visibility toggles.
 */
export const ROLE_KPI_CARDS_CATALOG: Record<string, KpiCardCatalogItem[]> = {
  SUPER_ADMIN: [
    { id: 'tenants', label: 'Total Institutions', requiredFeatureKey: 'campus_profile' },
    { id: 'students_total', label: 'Global Student Roster', requiredFeatureKey: 'student_roster' },
    { id: 'staff_total', label: 'Active Staff & Faculty', requiredFeatureKey: 'staff_roster' },
    { id: 'system_health', label: 'SaaS Platform Health', requiredFeatureKey: 'app_section_control' },
  ],
  ADMIN: [
    { id: 'enrolled_students', label: 'Active Enrollment', requiredFeatureKey: 'student_roster' },
    { id: 'attendance_pulse', label: "Today's Attendance", requiredFeatureKey: 'monthly_attendance_matrix' },
    { id: 'today_collection', label: "Today's Collection", requiredFeatureKey: 'nav_finance' },
    { id: 'pending_admissions', label: 'New Applications', requiredFeatureKey: 'student_admission' },
  ],
  TEACHER: [
    { id: 'today_recited', label: "Today's Students Recited", requiredFeatureKey: 'progress_management' },
    { id: 'pages_and_mistakes', label: 'Pages Heard & Total Mistakes', requiredFeatureKey: 'progress_management' },
    { id: 'error_improvement', label: 'Mistakes & Stucks Improvement', requiredFeatureKey: 'progress_management' },
    { id: 'class_attendance', label: "Today's Class Presence", requiredFeatureKey: 'monthly_attendance_matrix' },
    { id: 'my_students', label: 'My Assigned Students', requiredFeatureKey: 'student_roster' },
    { id: 'sabaq_passed', label: 'Today Sabaq Recited', requiredFeatureKey: 'progress_management' },
    { id: 'dawr_progress', label: 'Avg Dawr Velocity', requiredFeatureKey: 'progress_management' },
  ],
  STAFF: [
    { id: 'staff_counter_collection', label: "Today's Fee Collection", requiredFeatureKey: 'nav_finance' },
    { id: 'staff_admissions', label: 'Pending Admissions', requiredFeatureKey: 'student_admission' },
    { id: 'staff_dorm_beds', label: 'Allocated Hostel Beds', requiredFeatureKey: 'residential_quarters' },
    { id: 'staff_attendance', label: 'Staff Presence Today', requiredFeatureKey: 'staff_daily_attendance' },
  ],
  STUDENT: [
    { id: 'hifz_juz', label: 'Completed Juz', requiredFeatureKey: 'progress_management' },
    { id: 'my_attendance', label: 'My Attendance Rate', requiredFeatureKey: 'monthly_attendance_matrix' },
    { id: 'sabaq_streak', label: 'Sabaq Daily Streak', requiredFeatureKey: 'progress_management' },
    { id: 'exam_standing', label: 'Terminal Exam Score', requiredFeatureKey: 'lesson_management' },
  ],
  GUARDIAN: [
    { id: 'child_hifz', label: 'Quran Memorization Track', requiredFeatureKey: 'progress_management' },
    { id: 'child_attendance', label: 'Attendance Record', requiredFeatureKey: 'monthly_attendance_matrix' },
    { id: 'child_dues', label: 'Pending Monthly Tuition', requiredFeatureKey: 'nav_finance' },
    { id: 'child_standing', label: 'Conduct & Tarbiyah', requiredFeatureKey: 'lesson_management' },
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
    requiredFeatureKey: 'notification_management',
    component: NoticeBoardWidget,
  },
  upcoming_events: {
    id: 'upcoming_events',
    title: 'Upcoming Academic & Islamic Calendar Events',
    description: 'Countdown to examinations, holidays, and institutional parent-teacher meetings.',
    category: 'CALENDAR',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF', 'STUDENT', 'GUARDIAN'],
    defaultColSpan: 2,
    minColSpan: 1,
    maxColSpan: 3,
    requiredFeatureKey: 'academy_calendar_events',
    component: UpcomingEventsWidget,
  },
  academic_calendar: {
    id: 'academic_calendar',
    title: 'Academic Calendar & Schedule (Master)',
    description: 'Interactive monthly/agenda view of academic events, working hours, and shifts from Calendar & Events.',
    category: 'CALENDAR',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF', 'STUDENT', 'GUARDIAN'],
    defaultColSpan: 4,
    minColSpan: 2,
    maxColSpan: 4,
    requiredFeatureKey: 'academy_calendar_events',
    component: AcademicCalendarWidget,
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
    { widgetId: 'upcoming_events', order: 5, colSpan: 2, isVisible: true },
    { widgetId: 'notice_board', order: 6, colSpan: 4, isVisible: true },
  ],
  ADMIN: [
    { widgetId: 'kpi_metrics', order: 1, colSpan: 4, isVisible: true },
    { widgetId: 'attendance_pulse', order: 2, colSpan: 2, isVisible: true },
    { widgetId: 'finance_overview', order: 3, colSpan: 2, isVisible: true },
    { widgetId: 'residential_occupancy', order: 4, colSpan: 2, isVisible: true },
    { widgetId: 'admission_pipeline', order: 5, colSpan: 2, isVisible: true },
    { widgetId: 'notice_board', order: 6, colSpan: 2, isVisible: true },
    { widgetId: 'upcoming_events', order: 7, colSpan: 2, isVisible: true },
    { widgetId: 'recent_activity', order: 8, colSpan: 2, isVisible: true },
    { widgetId: 'quick_actions', order: 9, colSpan: 4, isVisible: true },
  ],
  TEACHER: [
    { widgetId: 'kpi_metrics', order: 1, colSpan: 4, isVisible: true },
    { widgetId: 'recitation_trends', order: 2, colSpan: 4, isVisible: true },
    { widgetId: 'hifz_tracker', order: 3, colSpan: 2, isVisible: true },
    { widgetId: 'attendance_pulse', order: 4, colSpan: 2, isVisible: true },
    { widgetId: 'timetable_schedule', order: 5, colSpan: 2, isVisible: true },
    { widgetId: 'upcoming_events', order: 6, colSpan: 2, isVisible: true },
    { widgetId: 'quick_actions', order: 7, colSpan: 4, isVisible: true },
    { widgetId: 'academic_calendar', order: 8, colSpan: 4, isVisible: false },
    { widgetId: 'notice_board', order: 9, colSpan: 4, isVisible: true },
  ],
  STAFF: [
    { widgetId: 'kpi_metrics', order: 1, colSpan: 4, isVisible: true },
    { widgetId: 'finance_overview', order: 2, colSpan: 2, isVisible: true },
    { widgetId: 'residential_occupancy', order: 3, colSpan: 2, isVisible: true },
    { widgetId: 'attendance_pulse', order: 4, colSpan: 2, isVisible: true },
    { widgetId: 'admission_pipeline', order: 5, colSpan: 2, isVisible: true },
    { widgetId: 'notice_board', order: 6, colSpan: 4, isVisible: true },
  ],
  STUDENT: [
    { widgetId: 'kpi_metrics', order: 1, colSpan: 4, isVisible: true },
    { widgetId: 'hifz_tracker', order: 2, colSpan: 2, isVisible: true },
    { widgetId: 'attendance_pulse', order: 3, colSpan: 2, isVisible: true },
    { widgetId: 'timetable_schedule', order: 4, colSpan: 2, isVisible: true },
    { widgetId: 'notice_board', order: 5, colSpan: 2, isVisible: true },
    { widgetId: 'upcoming_events', order: 6, colSpan: 4, isVisible: true },
  ],
  GUARDIAN: [
    { widgetId: 'kpi_metrics', order: 1, colSpan: 4, isVisible: true },
    { widgetId: 'hifz_tracker', order: 2, colSpan: 2, isVisible: true },
    { widgetId: 'attendance_pulse', order: 3, colSpan: 2, isVisible: true },
    { widgetId: 'finance_overview', order: 4, colSpan: 2, isVisible: true },
    { widgetId: 'notice_board', order: 5, colSpan: 2, isVisible: true },
    { widgetId: 'upcoming_events', order: 6, colSpan: 4, isVisible: true },
  ],
};

const GOVERNANCE_STORAGE_PREFIX = 'spr_widget_governance_v1';

export function getWidgetGovernanceStorageKey(academyScope?: string): string {
  return `${GOVERNANCE_STORAGE_PREFIX}_${academyScope || 'GLOBAL'}`;
}

/**
 * Returns dynamic widget-role entitlements mapping (widgetId -> allowedRoles).
 * Checks specific academy override first, then institutional global standard,
 * falling back to default allowedRoles defined in WIDGET_REGISTRY.
 */
export function getWidgetRoleEntitlements(academyScope?: string): Record<string, string[]> {
  try {
    if (academyScope && academyScope !== 'GLOBAL') {
      const academyRaw = localStorage.getItem(getWidgetGovernanceStorageKey(academyScope));
      if (academyRaw) {
        const parsed = JSON.parse(academyRaw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    }
    const globalRaw = localStorage.getItem(getWidgetGovernanceStorageKey('GLOBAL'));
    if (globalRaw) {
      const parsed = JSON.parse(globalRaw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {}

  // Fallback: build default mapping from WIDGET_REGISTRY
  const defaults: Record<string, string[]> = {};
  Object.values(WIDGET_REGISTRY).forEach((w) => {
    defaults[w.id] = [...w.allowedRoles];
  });
  return defaults;
}

/**
 * Persists customized widget-role permissions for a specific academy override scope.
 */
export function saveWidgetRoleEntitlements(
  academyScope: string,
  entitlements: Record<string, string[]>
): void {
  try {
    const scopeToSave = academyScope === 'ALL' ? 'GLOBAL' : (academyScope || 'GLOBAL');
    const key = getWidgetGovernanceStorageKey(scopeToSave);
    localStorage.setItem(key, JSON.stringify(entitlements));
    if (academyScope === 'ALL') {
      localStorage.setItem(getWidgetGovernanceStorageKey('ALL'), JSON.stringify(entitlements));
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('spr_dashboard_governance_updated', {
          detail: { academyScope, entitlements },
        })
      );
      window.dispatchEvent(new CustomEvent('spr_dashboard_layout_updated', { detail: { academyScope } }));
    }
  } catch (err) {
    console.warn('Dashboard: Failed to save widget governance:', err);
  }
}

/**
 * Reset widget permissions back to system defaults for a scope.
 */
export function resetWidgetRoleEntitlements(academyScope: string): void {
  try {
    const key = getWidgetGovernanceStorageKey(academyScope || 'GLOBAL');
    localStorage.removeItem(key);
    if (academyScope === 'ALL') {
      localStorage.removeItem(getWidgetGovernanceStorageKey('ALL'));
      localStorage.removeItem(getWidgetGovernanceStorageKey('GLOBAL'));
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('spr_dashboard_governance_updated', {
          detail: { academyScope },
        })
      );
      window.dispatchEvent(new CustomEvent('spr_dashboard_layout_updated', { detail: { academyScope } }));
    }
  } catch {}
}

/**
 * Checks whether a widget is permitted for a specific role and academy scope.
 */
export function isWidgetPermittedForRole(
  widgetId: string,
  role: DashboardRole,
  academyScope?: string
): boolean {
  const entitlements = getWidgetRoleEntitlements(academyScope);
  const allowed = entitlements[widgetId];
  if (Array.isArray(allowed)) {
    const target = String(role || '').toUpperCase();
    return allowed.some((r) => {
      const u = String(r).toUpperCase();
      return u === target || u === 'ALL' || u === 'ALL_ROLES';
    });
  }
  const def = WIDGET_REGISTRY[widgetId];
  if (!def) return false;
  return def.allowedRoles.includes(role);
}

/**
 * Returns all widget definitions eligible for a given role and academy scope.
 */
export function getWidgetsForRole(role: DashboardRole, academyScope?: string): WidgetDefinition[] {
  return Object.values(WIDGET_REGISTRY).filter((widget) =>
    isWidgetPermittedForRole(widget.id, role, academyScope)
  );
}

/**
 * Checks whether a widget is permitted under the active Feature & Module Control configuration.
 */
export function isWidgetFeaturePermitted(
  widgetDef: WidgetDefinition | undefined,
  isFeatureEnabled: (featureKey?: string) => boolean
): boolean {
  if (!widgetDef) return false;
  if (!widgetDef.requiredFeatureKey) return true;
  return isFeatureEnabled(widgetDef.requiredFeatureKey);
}

/**
 * Returns all widget definitions eligible for a given role and permitted by Feature Control.
 */
export function getAvailableWidgets(
  role: DashboardRole,
  isFeatureEnabled: (featureKey?: string) => boolean
): WidgetDefinition[] {
  return getWidgetsForRole(role).filter((w) => isWidgetFeaturePermitted(w, isFeatureEnabled));
}

/**
 * Returns executive KPI card catalog items for a given role.
 */
export function getKpiCardsForRole(
  role: DashboardRole,
  isFeatureEnabled?: (featureKey?: string) => boolean
): KpiCardCatalogItem[] {
  const cards = ROLE_KPI_CARDS_CATALOG[role] || ROLE_KPI_CARDS_CATALOG.ADMIN || [];
  if (!isFeatureEnabled) return cards;
  return cards.filter((card) => !card.requiredFeatureKey || isFeatureEnabled(card.requiredFeatureKey));
}

/**
 * Get layout items for a given role from localStorage or fallback to defaults.
 */
export function getSavedLayout(tenantId: string, role: DashboardRole, userId?: string): DashboardLayoutItem[] {
  const userKey = `spr_dashboard_layout_${tenantId || 'default'}_${role}_${userId || 'anon'}_v1`;
  const roleTemplateKey = `spr_dashboard_template_${tenantId || 'default'}_${role}_v1`;

  try {
    let raw = localStorage.getItem(userKey);
    if (!raw && userId) {
      // Fallback to anonymous key if available
      raw = localStorage.getItem(`spr_dashboard_layout_${tenantId || 'default'}_${role}_anon_v1`);
    }

    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item) => {
          const def = WIDGET_REGISTRY[item.widgetId];
          const colSpan = (item.colSpan === 3 && def?.defaultColSpan === 4) ? 4 : (item.colSpan || def?.defaultColSpan || 2);
          return { ...item, colSpan };
        });
      }
    }
    const templateSaved = localStorage.getItem(roleTemplateKey);
    if (templateSaved) {
      const parsed = JSON.parse(templateSaved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item) => {
          const def = WIDGET_REGISTRY[item.widgetId];
          const colSpan = (item.colSpan === 3 && def?.defaultColSpan === 4) ? 4 : (item.colSpan || def?.defaultColSpan || 2);
          return { ...item, colSpan };
        });
      }
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
    if (userId) {
      localStorage.setItem(`spr_dashboard_layout_${tenantId || 'default'}_${role}_anon_v1`, JSON.stringify(items));
    }
    if (saveAsRoleDefault) {
      localStorage.setItem(roleTemplateKey, JSON.stringify(items));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('spr_dashboard_layout_updated', { detail: { role, tenantId } }));
      }
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
    if (userId) {
      localStorage.removeItem(`spr_dashboard_layout_${tenantId || 'default'}_${role}_anon_v1`);
    }
  } catch {}
  return DEFAULT_ROLE_LAYOUTS[role] || DEFAULT_ROLE_LAYOUTS.ADMIN;
}

