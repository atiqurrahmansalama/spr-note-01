/**
 * SPR Note — Enterprise Route Preloader Service
 * ==============================================
 * Speculatively preloads lazy-loaded module chunks on user hover/focus
 * to achieve 0ms instantaneous route transitions without layout jank or latency.
 */

const PRELOAD_REGISTRY: Record<string, () => Promise<unknown>> = {
  // App Management & Core Governance
  "/approvals": () => import("../modules/approvals/ApprovalsHubView"),
  "/helpdesk": () => import("../modules/helpdesk/HelpdeskHubView"),
  "/communications": () => import("../modules/communications/CommunicationsHubView"),
  "/bug-reports": () => import("../modules/bug-reporting/BugReportingHubView"),
  "/section-control": () => import("../modules/admin/section-control"),
  "/user-management": () => import("../modules/admin/user-management"),
  "/role-management": () => import("../modules/admin/role-management"),
  "/activity-analytics": () => import("../modules/admin/activity-analytics"),
  "/data-backup": () => import("../modules/settings/backup"),
  "/app-management/notifications": () => import("../modules/app-management/notifications/NotificationManagementView"),

  // Academic Organization
  "/academy-profile": () => import("../modules/settings/components/AcademyProfileView"),
  "/academy/campus-profile": () => import("../modules/academy/campus-structure/CampusProfileHubView"),
  "/academy/classes-groups": () => import("../modules/academy/classes-sections/ClassesSectionsHubView"),
  "/academy/periods": () => import("../modules/academy/routine-curriculum/RoutineCurriculumHubView"),
  "/academy/calendar-events": () => import("../modules/academy/calendar-events/CalendarEventsHubView"),
  "/academy/residential-quarters": () => import("../modules/academy/residential/ResidentialHubView"),

  // Daily Classroom
  "/attendance/students/monthly-matrix": () => import("../modules/learning/class-attendance/ClassAttendanceView"),
  "/studies/lesson-management": () => import("../modules/learning/daily-classroom/DailyClassroomHubView"),
  "/studies/progress-management": () => import("../modules/learning/daily-classroom/DailyClassroomHubView"),

  // Examination & Results
  "/examinations/schedules": () => import("../modules/examinations/ExaminationsHubView"),
  "/examinations/hall-logistics": () => import("../modules/examinations/ExaminationsHubView"),
  "/examinations/marksheet": () => import("../modules/examinations/ExaminationsHubView"),

  // Students & Staff
  "/students": () => import("../modules/student-management/directory/StudentDirectoryView"),
  "/attendance/students/residential": () => import("../modules/attendance/ResidentialAttendanceView"),
  "/admission": () => import("../modules/student-management/admission/StudentAdmissionView"),
  "/staff/roster": () => import("../modules/staff-management/TeacherStaffRosterView"),
  "/staff/teacher-attendance": () => import("../modules/staff-management/TeacherAttendanceView"),
  "/staff/attendance": () => import("../modules/staff-management/StaffDailyAttendanceView"),
  "/staff/onboarding": () => import("../modules/staff-management/onboarding/StaffOnboardingView"),

  // Finance & Accounts
  "/finance": () => import("../modules/finance/FinanceHubView"),
  "/finance/student-billing": () => import("../modules/finance/FinanceHubView"),
  "/finance/staff-payroll": () => import("../modules/finance/FinanceHubView"),
  "/finance/general-ledger": () => import("../modules/finance/FinanceHubView"),
  "/finance/reports": () => import("../modules/finance/FinanceHubView"),

  // Settings & Utilities
  "/profile-settings": () => import("../modules/profile/ProfileSettingsView"),
  "/institution-settings": () => import("../modules/app-management/developer-tools/DeveloperToolsHubView"),
  "/preferences": () => import("../modules/settings/preferences"),
  "/version-control": () => import("../modules/version-control/views/ReleaseManagementView"),
  "/shortcuts": () => import("../modules/settings/components/ShortcutsGuide"),
  "/guide": () => import("../modules/settings/components/AppGuideView"),
  "/about": () => import("../modules/settings/components/AboutAppView"),
};

const preloadedPaths = new Set<string>();

/**
 * Preloads a lazy-loaded route bundle in the background if not already preloaded.
 */
export function preloadRouteChunk(path?: string): void {
  if (!path || typeof path !== "string") return;
  const cleanPath = path.split("?")[0];
  if (preloadedPaths.has(cleanPath)) return;

  const loader = PRELOAD_REGISTRY[cleanPath];
  if (loader) {
    preloadedPaths.add(cleanPath);
    loader().catch(() => {
      preloadedPaths.delete(cleanPath);
    });
  }
}
