import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import RouteLoadingFallback from "./components/ui/RouteLoadingFallback";
import { auth as authStore } from "./utils/localStore";
import { FeatureGuard } from "./components/common/FeatureGuard";
import { UndoRedoProvider } from "./context/UndoRedoContext";
import { I18nProvider } from "./i18n";
import { lazyWithRetry as lazy } from "./utils/lazyWithRetry";
import { getLastActiveRoute } from "./utils/navigationHistory";

// ─── Public & Auth Views (Lazy Loaded with Auto-Retry) ────────────────────────
const LandingPageView = lazy(() => import("./modules/landing/LandingPageView"));
const LoginView = lazy(() => import("./modules/auth/LoginView"));
const RegisterView = lazy(() => import("./modules/auth/RegisterView"));
const VerifyEmailView = lazy(() => import("./modules/auth/VerifyEmailView"));
const ResetPasswordView = lazy(() => import("./modules/auth/ResetPasswordView"));
const PublicVerifyReportView = lazy(() => import("./modules/verification/PublicVerifyReportView"));
const JoinWithInviteView = lazy(() => import("./modules/auth/JoinWithInviteView"));
const PublicOnlineAdmissionView = lazy(() => import("./modules/student-management/admission/PublicOnlineAdmissionView"));
const PublicStaffOnboardingView = lazy(() => import("./modules/staff-management/onboarding/PublicStaffOnboardingView"));

// ─── Protected Student & Reports Views (Lazy Loaded with Auto-Retry) ──────────
const HifzReportBuilderModule = lazy(() => import("./modules/learning/progress-management/daily-progress/DailyProgressView"));
const StudentReportsView = lazy(() => import("./modules/learning/progress-management/progress-reports/ProgressReportsView"));
const StudentDirectoryView = lazy(() => import("./modules/student-management/directory/StudentDirectoryView"));
const StudentAdmissionView = lazy(() => import("./modules/student-management/admission/StudentAdmissionView"));
const SessionManager = lazy(() => import("./modules/student-management/sessions/SessionManager"));
const StudentProfileHubView = lazy(() => import("./modules/student-management/directory/StudentProfileHubView"));

// ─── Protected Staff Management Views (TypeScript Views) ──────────────────────
const TeacherStaffRosterView = lazy(() => import("./modules/staff-management/TeacherStaffRosterView"));
const TeacherAttendanceView = lazy(() => import("./modules/staff-management/TeacherAttendanceView"));
const StaffDailyAttendanceView = lazy(() => import("./modules/staff-management/StaffDailyAttendanceView"));
const StaffOnboardingView = lazy(() => import("./modules/staff-management/onboarding/StaffOnboardingView"));
const StaffProfileDetailView = lazy(() => import("./modules/staff-management/StaffProfileDetailView"));

// ─── Protected Print Studio Views (TypeScript Views) ─────────────────────────
const PrintStudioHubView = lazy(() => import("./modules/print-studio/PrintStudioHubView"));


// ─── Protected Attendance Views (Lazy Loaded with Auto-Retry) ─────────────────
const ClassAttendanceView = lazy(() => import("./modules/learning/class-attendance/ClassAttendanceView"));
const AttendanceSettingsView = lazy(() => import("./modules/attendance/AttendanceSettingsView"));
const ResidentialAttendanceView = lazy(() => import("./modules/attendance/ResidentialAttendanceView"));
const AdHocHeadcountView = lazy(() => import("./modules/attendance/AdHocHeadcountView"));

// ─── Protected Academy & Campus Structure Views (Lazy Loaded with Auto-Retry) ─
const DepartmentManagementView = lazy(() => import("./modules/academy/campus-structure/departments/DepartmentManagementView"));
const ClassManagementView = lazy(() => import("./modules/academy/classes-sections/classes/ClassManagementView"));
const GroupManagementView = lazy(() => import("./modules/academy/classes-sections/groups/GroupManagementView"));
const BranchManagementView = lazy(() => import("./modules/academy/campus-structure/branches/BranchManagementView"));
const SectionManagementView = lazy(() => import("./modules/academy/classes-sections/sections/SectionManagementView"));
const RoutineCurriculumHubView = lazy(() => import("./modules/academy/routine-curriculum/RoutineCurriculumHubView"));
const CampusProfileHubView = lazy(() => import("./modules/academy/campus-structure/CampusProfileHubView"));
const ClassesGroupsHubView = lazy(() => import("./modules/academy/classes-sections/ClassesSectionsHubView"));
const CalendarEventsHubView = lazy(() => import("./modules/academy/calendar-events/CalendarEventsHubView"));
const ResidentialHubView = lazy(() => import("./modules/academy/residential/ResidentialHubView"));
const AcademyProfileView = lazy(() => import("./modules/settings/components/AcademyProfileView"));

// ─── Protected Academic Learning & Lesson Management Views (Lazy Loaded) ─────
const DailyClassroomHubView = lazy(() => import("./modules/learning/DailyClassroomHubView"));

// ─── Protected Examination & Result Management Views (Lazy Loaded) ───────────
const ExaminationsHubView = lazy(() => import("./modules/examinations/ExaminationsHubView"));

// ─── Protected Admin & Role Views (Lazy Loaded) ─────────────────────────────
const UserManagementModule = lazy(() => import("./modules/admin/UserManagementModule"));
const RoleManagementPanel = lazy(() => import("./modules/admin/RoleManagementPanel"));
const ActivityAnalyticsView = lazy(() => import("./modules/admin/ActivityAnalyticsView"));
const TrashRestorationView = lazy(() => import("./modules/admin/TrashRestorationView"));

// ─── Protected Settings & Personalization Views (Lazy Loaded) ───────────────
const ProfileSettingsView = lazy(() => import("./modules/settings/ProfileSettingsView"));
const PersonalizeSettingsHubView = lazy(() => import("./modules/settings/PersonalizeSettingsHubView"));
const SecuritySessionsView = lazy(() => import("./modules/settings/components/SecuritySessionsView"));
const ClassroomConfigurationView = lazy(() => import("./modules/learning/components/ClassroomConfigurationView"));
const ReportSettingsView = ClassroomConfigurationView;
const DataBackupView = lazy(() => import("./modules/settings/components/DataBackupView"));
const ShortcutsGuide = lazy(() => import("./modules/settings/components/ShortcutsGuide"));
const AppGuideView = lazy(() => import("./modules/settings/components/AppGuideView"));
const AboutAppView = lazy(() => import("./modules/settings/components/AboutAppView"));
const SectionToggleControlPanel = lazy(() => import("./modules/settings/components/SectionToggleControlPanel"));

// ─── Protected Developer & App Management Views (Lazy Loaded) ───────────────
const RoleInviteManagerView = lazy(() => import("./modules/app-management/invites/RoleInviteManagerView"));
const NotificationManagementView = lazy(() => import("./modules/app-management/notifications/NotificationManagementView"));
const InstitutionListView = lazy(() => import("./modules/academy/campus-structure/academies/InstitutionListView"));
const DeveloperToolsHubView = lazy(() => import("./modules/app-management/developer-tools/DeveloperToolsHubView"));
const DashboardHubView = lazy(() => import("./modules/dashboard/DashboardHubView"));
const FinanceHubView = lazy(() => import("./modules/finance/FinanceHubView"));
const PublicVerifyReceiptView = lazy(() => import("./modules/finance/components/public-verification/PublicVerifyReceiptView"));

function ProtectedRoute({ children }) {
  const urlParams = new URLSearchParams(window.location.search);
  const isGoogleCallback = urlParams.has("code") || urlParams.has("access_token") || urlParams.has("id_token");

  if (!authStore.isLoggedIn()) {
    if (isGoogleCallback) {
      return (
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-sky-400 font-sans p-4">
          <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 px-6 py-4 rounded-2xl shadow-2xl">
            <svg className="animate-spin w-5 h-5 text-sky-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span className="text-sm font-medium text-zinc-200">Completing Google Authentication...</span>
          </div>
        </div>
      );
    }
    return <Navigate to="/login" replace />;
  }
  return children;
}

function RootRoute() {
  if (authStore.isLoggedIn()) {
    const destination = getLastActiveRoute("/dashboard");
    return <Navigate to={destination} replace />;
  }
  return <LandingPageView />;
}

export default function App() {
  return (
    <BrowserRouter>
      <I18nProvider>
        <UndoRedoProvider>
          <Suspense fallback={<RouteLoadingFallback />}>
            <Routes>
              {/* Standalone Public Auth & Verification Routes */}
              <Route path="/" element={<RootRoute />} />
              <Route path="/login" element={<LoginView />} />
              <Route path="/register" element={<RegisterView />} />
              <Route path="/verify-email/:token" element={<VerifyEmailView />} />
              <Route path="/reset-password/:token" element={<ResetPasswordView />} />
              <Route path="/verify-report/:report_id" element={<PublicVerifyReportView />} />
              <Route path="/api/v1/hifz/verify-report/:report_id" element={<PublicVerifyReportView />} />
              <Route path="/verify-receipt/:receiptNumber" element={<PublicVerifyReceiptView />} />
              <Route path="/api/v1/public/finance/verify-receipt/:receiptNumber" element={<PublicVerifyReceiptView />} />
              <Route path="/join" element={<JoinWithInviteView />} />
              <Route path="/apply" element={<PublicOnlineAdmissionView />} />
              <Route path="/admission/apply" element={<PublicOnlineAdmissionView />} />
              <Route path="/staff-onboard" element={<PublicStaffOnboardingView />} />
              <Route path="/staff-apply" element={<PublicStaffOnboardingView />} />

              {/* Protected Dashboard Layout with Nested Page Routes */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<DashboardHubView />} />
                <Route path="/report-builder" element={<Navigate to="/dashboard" replace />} />
                <Route path="/student-reports" element={<Navigate to="/studies/progress-reports" replace />} />
                <Route path="/students" element={<FeatureGuard sectionKey="student_roster" fallback={<Navigate to="/dashboard" replace />}><StudentDirectoryView viewMode="students" /></FeatureGuard>} />
                <Route path="/staff/roster" element={<FeatureGuard sectionKey="staff_roster" fallback={<Navigate to="/dashboard" replace />}><TeacherStaffRosterView /></FeatureGuard>} />
                <Route path="/staff/teacher-attendance" element={<FeatureGuard sectionKey="staff_roster" fallback={<Navigate to="/dashboard" replace />}><TeacherAttendanceView /></FeatureGuard>} />
                <Route path="/staff/attendance" element={<FeatureGuard sectionKey="staff_roster" fallback={<Navigate to="/dashboard" replace />}><StaffDailyAttendanceView /></FeatureGuard>} />
                <Route path="/staff/daily-attendance" element={<Navigate to="/staff/attendance" replace />} />
                <Route path="/staff/onboarding" element={<FeatureGuard sectionKey="staff_onboarding" fallback={<Navigate to="/dashboard" replace />}><StaffOnboardingView /></FeatureGuard>} />
                <Route path="/staff-onboarding" element={<Navigate to="/staff/onboarding" replace />} />
                <Route path="/staff" element={<Navigate to="/staff/roster" replace />} />
                <Route path="/staff/:id" element={<FeatureGuard sectionKey="staff_roster" fallback={<Navigate to="/dashboard" replace />}><StaffProfileDetailView /></FeatureGuard>} />
                <Route path="/print-studio" element={<FeatureGuard sectionKey="nav_print_studio" fallback={<Navigate to="/dashboard" replace />}><PrintStudioHubView /></FeatureGuard>} />
                
                {/* Student Attendance Multi-Dimensional Routes */}
                <Route path="/attendance/students/roll-call" element={<Navigate to="/attendance/students/monthly-matrix" replace />} />
                <Route path="/attendance/students/adhoc" element={<FeatureGuard sectionKey="student_adhoc_headcount" fallback={<Navigate to="/dashboard" replace />}><AdHocHeadcountView /></FeatureGuard>} />
                <Route path="/attendance/students/monthly-matrix" element={<FeatureGuard sectionKey="monthly_attendance_matrix" fallback={<Navigate to="/dashboard" replace />}><ClassAttendanceView /></FeatureGuard>} />
                <Route path="/attendance/students/residential" element={<FeatureGuard sectionKey="residential_attendance" fallback={<Navigate to="/dashboard" replace />}><ResidentialAttendanceView /></FeatureGuard>} />
                <Route path="/attendance/student" element={<Navigate to="/attendance/students/monthly-matrix" replace />} />
                <Route path="/attendance/monthly-register" element={<FeatureGuard sectionKey="monthly_attendance_matrix" fallback={<Navigate to="/dashboard" replace />}><ClassAttendanceView /></FeatureGuard>} />

                {/* Attendance Settings Route */}
                <Route path="/attendance/settings" element={<FeatureGuard sectionKey="attendance_policies_slots" fallback={<Navigate to="/dashboard" replace />}><AttendanceSettingsView /></FeatureGuard>} />
                <Route path="/student-management/departments" element={<FeatureGuard sectionKey="student_departments" fallback={<Navigate to="/dashboard" replace />}><DepartmentManagementView /></FeatureGuard>} />
                <Route path="/student-management/classes" element={<FeatureGuard sectionKey="student_classes" fallback={<Navigate to="/dashboard" replace />}><ClassManagementView /></FeatureGuard>} />
                <Route path="/student-management/groups" element={<FeatureGuard sectionKey="student_groups" fallback={<Navigate to="/dashboard" replace />}><GroupManagementView /></FeatureGuard>} />
                <Route path="/groups-students" element={<FeatureGuard sectionKey="student_roster" fallback={<Navigate to="/dashboard" replace />}><StudentDirectoryView /></FeatureGuard>} />
                <Route path="/student-roster" element={<FeatureGuard sectionKey="student_roster" fallback={<Navigate to="/dashboard" replace />}><StudentDirectoryView viewMode="students" /></FeatureGuard>} />
                <Route path="/group-roster" element={<FeatureGuard sectionKey="student_groups" fallback={<Navigate to="/dashboard" replace />}><GroupManagementView /></FeatureGuard>} />
                <Route path="/short-admission" element={<Navigate to="/admission" replace />} />
                <Route path="/admission/short" element={<Navigate to="/admission" replace />} />
                <Route path="/admission" element={<FeatureGuard sectionKey={["student_admission", "student_quick_admission", "student_roster"]} fallback={<Navigate to="/dashboard" replace />}><StudentAdmissionView /></FeatureGuard>} />
                <Route path="/students/:id/profile" element={<FeatureGuard sectionKey="student_roster" fallback={<Navigate to="/dashboard" replace />}><StudentProfileHubView /></FeatureGuard>} />
                <Route path="/sessions-comments" element={<FeatureGuard sectionKey="report_sessions_comments" fallback={<Navigate to="/dashboard" replace />}><SessionManager /></FeatureGuard>} />
                <Route path="/user-management" element={<FeatureGuard sectionKey="app_user_management" fallback={<Navigate to="/dashboard" replace />}><UserManagementModule /></FeatureGuard>} />
                <Route path="/role-management" element={<FeatureGuard sectionKey="app_role_management" fallback={<Navigate to="/dashboard" replace />}><RoleManagementPanel showHeaderCard={true} /></FeatureGuard>} />
                <Route path="/activity-analytics" element={<FeatureGuard sectionKey="app_activity_analytics" fallback={<Navigate to="/dashboard" replace />}><ActivityAnalyticsView /></FeatureGuard>} />
                <Route path="/trash-restoration" element={<FeatureGuard sectionKey="nav_trash" fallback={<Navigate to="/dashboard" replace />}><TrashRestorationView /></FeatureGuard>} />
                <Route path="/profile-settings" element={<FeatureGuard sectionKey="settings_profile" fallback={<Navigate to="/dashboard" replace />}><ProfileSettingsView /></FeatureGuard>} />
                
                {/* Academy Multi-Branch, Section & Period Routes */}
                <Route path="/academy/campus-profile" element={<CampusProfileHubView />} />
                <Route path="/campus-profile" element={<CampusProfileHubView />} />
                <Route path="/academy/classes-groups" element={<ClassesGroupsHubView />} />
                <Route path="/classes-groups" element={<ClassesGroupsHubView />} />
                <Route path="/academy/branches" element={<FeatureGuard sectionKey="academic_branches" fallback={<Navigate to="/dashboard" replace />}><BranchManagementView /></FeatureGuard>} />
                <Route path="/academy/periods" element={<FeatureGuard sectionKey="class_period_slots" fallback={<Navigate to="/dashboard" replace />}><RoutineCurriculumHubView /></FeatureGuard>} />
                <Route path="/academy/calendar-events" element={<CalendarEventsHubView />} />
                <Route path="/academy/calendar-schedule" element={<CalendarEventsHubView />} />
                <Route path="/academy/working-hours" element={<CalendarEventsHubView />} />
                <Route path="/academy/residential-quarters" element={<ResidentialHubView />} />
                <Route path="/academy/residential" element={<ResidentialHubView />} />
                <Route path="/academy/dormitory" element={<ResidentialHubView />} />
                <Route path="/residential-quarters" element={<ResidentialHubView />} />

                {/* Academic Studies — Lesson Management Routes */}
                <Route path="/studies" element={<DailyClassroomHubView hubType="LESSON_MANAGEMENT" defaultTab="LESSON" />} />
                <Route path="/studies/daily-classroom" element={<DailyClassroomHubView hubType="LESSON_MANAGEMENT" defaultTab="LESSON" />} />
                <Route path="/studies/lesson-management" element={<DailyClassroomHubView hubType="LESSON_MANAGEMENT" defaultTab="LESSON" />} />
                <Route path="/studies/daily-lessons" element={<DailyClassroomHubView hubType="LESSON_MANAGEMENT" defaultTab="LESSON" />} />
                <Route path="/studies/lesson-assessments" element={<DailyClassroomHubView hubType="LESSON_MANAGEMENT" defaultTab="LESSON_ASSESSMENT" />} />
                <Route path="/studies/lesson-analytics" element={<DailyClassroomHubView hubType="LESSON_MANAGEMENT" defaultTab="LESSON_ANALYTICS" />} />
                <Route path="/daily-lessons" element={<DailyClassroomHubView hubType="LESSON_MANAGEMENT" defaultTab="LESSON" />} />
                <Route path="/lesson-analytics" element={<DailyClassroomHubView hubType="LESSON_MANAGEMENT" defaultTab="LESSON_ANALYTICS" />} />
                <Route path="/studies/recitations" element={<DailyClassroomHubView hubType="LESSON_MANAGEMENT" defaultTab="LESSON_ASSESSMENT" />} />
                <Route path="/recitations" element={<DailyClassroomHubView hubType="LESSON_MANAGEMENT" defaultTab="LESSON_ASSESSMENT" />} />
                <Route path="/studies/homework" element={<DailyClassroomHubView hubType="LESSON_MANAGEMENT" defaultTab="HOMEWORK" />} />
                <Route path="/homework-tasks" element={<DailyClassroomHubView hubType="LESSON_MANAGEMENT" defaultTab="HOMEWORK" />} />

                {/* Academic Studies — Progress Management Routes */}
                <Route path="/studies/progress-management" element={<DailyClassroomHubView hubType="PROGRESS_MANAGEMENT" defaultTab="PROGRESS" />} />
                <Route path="/studies/daily-progress" element={<DailyClassroomHubView hubType="PROGRESS_MANAGEMENT" defaultTab="PROGRESS" />} />
                <Route path="/studies/progress-reports" element={<DailyClassroomHubView hubType="PROGRESS_MANAGEMENT" defaultTab="PROGRESS_ASSESSMENT" />} />
                <Route path="/studies/progress-analytics" element={<DailyClassroomHubView hubType="PROGRESS_MANAGEMENT" defaultTab="PROGRESS_ANALYTICS" />} />
                <Route path="/studies/progress-assessments" element={<Navigate to="/studies/progress-reports" replace />} />
                <Route path="/studies/progress-management/daily-progress" element={<Navigate to="/studies/daily-progress" replace />} />
                <Route path="/studies/progress-management/reports" element={<Navigate to="/studies/progress-reports" replace />} />
                <Route path="/studies/progress-management/progress-reports" element={<Navigate to="/studies/progress-reports" replace />} />
                <Route path="/studies/progress-management/analytics" element={<Navigate to="/studies/progress-analytics" replace />} />
                <Route path="/progress-management" element={<Navigate to="/studies/progress-management" replace />} />
                <Route path="/daily-progress" element={<Navigate to="/studies/daily-progress" replace />} />
                <Route path="/progress-reports" element={<Navigate to="/studies/progress-reports" replace />} />
                <Route path="/progress-assessments" element={<Navigate to="/studies/progress-reports" replace />} />
                <Route path="/progress-analytics" element={<Navigate to="/studies/progress-analytics" replace />} />

                {/* Examination & Result Management Hub Routes */}
                <Route path="/examinations" element={<ExaminationsHubView />} />
                <Route path="/examinations/schedules" element={<ExaminationsHubView defaultTab="SCHEDULES" />} />
                <Route path="/examinations/routine-matrix" element={<ExaminationsHubView defaultTab="SUBJECT_MATRIX" />} />
                <Route path="/examinations/routine-board" element={<ExaminationsHubView defaultTab="SUBJECT_MATRIX" />} />
                <Route path="/examinations/visual-timetable" element={<ExaminationsHubView defaultTab="SUBJECT_MATRIX" />} />
                <Route path="/examinations/invigilation" element={<ExaminationsHubView defaultTab="INVIGILATION_SCHEDULE" />} />
                <Route path="/examinations/invigilation-schedule" element={<ExaminationsHubView defaultTab="INVIGILATION_SCHEDULE" />} />
                <Route path="/examinations/mark-entry" element={<ExaminationsHubView defaultTab="MARK_ENTRY" />} />
                <Route path="/examinations/tabulation" element={<ExaminationsHubView defaultTab="TABULATION" />} />
                <Route path="/examinations/marksheet" element={<ExaminationsHubView defaultTab="TABULATION" />} />
                <Route path="/examinations/mark-sheet" element={<ExaminationsHubView defaultTab="TABULATION" />} />
                <Route path="/examinations/transcripts" element={<ExaminationsHubView defaultTab="TRANSCRIPTS" />} />
                <Route path="/examinations/hall-logistics" element={<ExaminationsHubView defaultTab="HALL_LOGISTICS" />} />
                <Route path="/examinations/admit-cards" element={<ExaminationsHubView defaultTab="ADMIT_CARDS" />} />
                <Route path="/examinations/seat-plan" element={<ExaminationsHubView defaultTab="SEAT_PLAN" />} />
                <Route path="/examinations/desk-slips" element={<ExaminationsHubView defaultTab="SEAT_PLAN" />} />
                <Route path="/examinations/hall-attendance" element={<ExaminationsHubView defaultTab="ATTENDANCE_SHEETS" />} />
                <Route path="/examinations/attendance-sheets" element={<ExaminationsHubView defaultTab="ATTENDANCE_SHEETS" />} />
                <Route path="/admit-cards" element={<ExaminationsHubView defaultTab="ADMIT_CARDS" />} />
                <Route path="/seat-plan" element={<ExaminationsHubView defaultTab="SEAT_PLAN" />} />
                <Route path="/desk-slips" element={<ExaminationsHubView defaultTab="SEAT_PLAN" />} />
                <Route path="/hall-attendance" element={<ExaminationsHubView defaultTab="ATTENDANCE_SHEETS" />} />
                <Route path="/examinations/grading-rules" element={<Navigate to="/admin-tools?section=grading-policies" replace />} />
                <Route path="/exams" element={<ExaminationsHubView defaultTab="SCHEDULES" />} />
                <Route path="/routine-matrix" element={<ExaminationsHubView defaultTab="SUBJECT_MATRIX" />} />
                <Route path="/routine-board" element={<ExaminationsHubView defaultTab="SUBJECT_MATRIX" />} />
                <Route path="/visual-timetable" element={<ExaminationsHubView defaultTab="SUBJECT_MATRIX" />} />
                <Route path="/invigilation-schedule" element={<ExaminationsHubView defaultTab="INVIGILATION_SCHEDULE" />} />
                <Route path="/mark-entry" element={<ExaminationsHubView defaultTab="MARK_ENTRY" />} />
                <Route path="/tabulation-sheet" element={<ExaminationsHubView defaultTab="TABULATION" />} />
                <Route path="/marksheet" element={<ExaminationsHubView defaultTab="TABULATION" />} />
                <Route path="/mark-sheet" element={<ExaminationsHubView defaultTab="TABULATION" />} />
                <Route path="/transcripts" element={<ExaminationsHubView defaultTab="TRANSCRIPTS" />} />
                <Route path="/grading-rules" element={<Navigate to="/admin-tools?section=grading-policies" replace />} />

                <Route path="/academy/classes" element={<FeatureGuard sectionKey="student_classes" fallback={<Navigate to="/dashboard" replace />}><ClassManagementView /></FeatureGuard>} />
                <Route path="/academy/groups" element={<FeatureGuard sectionKey="student_groups" fallback={<Navigate to="/dashboard" replace />}><GroupManagementView /></FeatureGuard>} />
                <Route path="/academy/departments" element={<FeatureGuard sectionKey="student_departments" fallback={<Navigate to="/dashboard" replace />}><DepartmentManagementView /></FeatureGuard>} />
                <Route path="/academy/profile" element={<AcademyProfileView />} />
                <Route path="/academy-profile" element={<AcademyProfileView />} />
                <Route path="/settings/institution" element={<AcademyProfileView />} />
                <Route path="/institution-profile" element={<AcademyProfileView />} />
                <Route path="/security-sessions" element={<FeatureGuard sectionKey="settings_security" fallback={<Navigate to="/dashboard" replace />}><SecuritySessionsView /></FeatureGuard>} />
                <Route path="/personalize" element={<PersonalizeSettingsHubView />} />
                <Route path="/appearance" element={<PersonalizeSettingsHubView />} />
                <Route path="/date-time" element={<PersonalizeSettingsHubView />} />
                <Route path="/classroom-config" element={<FeatureGuard sectionKey="report_copy_settings" fallback={<Navigate to="/dashboard" replace />}><ClassroomConfigurationView /></FeatureGuard>} />
                <Route path="/classroom-settings" element={<FeatureGuard sectionKey="report_copy_settings" fallback={<Navigate to="/dashboard" replace />}><ClassroomConfigurationView /></FeatureGuard>} />
                <Route path="/copy-report" element={<FeatureGuard sectionKey="report_copy_settings" fallback={<Navigate to="/dashboard" replace />}><ClassroomConfigurationView /></FeatureGuard>} />
                <Route path="/report-settings" element={<FeatureGuard sectionKey="report_copy_settings" fallback={<Navigate to="/dashboard" replace />}><ClassroomConfigurationView /></FeatureGuard>} />
                <Route path="/data-backup" element={<FeatureGuard sectionKey="settings_backup" fallback={<Navigate to="/dashboard" replace />}><DataBackupView /></FeatureGuard>} />
                <Route path="/shortcuts" element={<FeatureGuard sectionKey="nav_shortcuts" fallback={<Navigate to="/dashboard" replace />}><ShortcutsGuide /></FeatureGuard>} />
                <Route path="/guide" element={<FeatureGuard sectionKey="nav_app_guide" fallback={<Navigate to="/dashboard" replace />}><AppGuideView /></FeatureGuard>} />
                <Route path="/about" element={<FeatureGuard sectionKey="nav_about" fallback={<Navigate to="/dashboard" replace />}><AboutAppView /></FeatureGuard>} />
                <Route path="/section-control" element={<FeatureGuard sectionKey="app_section_control" fallback={<Navigate to="/dashboard" replace />}><SectionToggleControlPanel /></FeatureGuard>} />
                <Route path="/app-management/institutions" element={<FeatureGuard sectionKey="app_institutions" fallback={<Navigate to="/dashboard" replace />}><InstitutionListView /></FeatureGuard>} />
                <Route path="/institutions" element={<FeatureGuard sectionKey="app_institutions" fallback={<Navigate to="/dashboard" replace />}><InstitutionListView /></FeatureGuard>} />
                <Route path="/admin-tools" element={<DeveloperToolsHubView />} />
                <Route path="/admin-tools/:sectionId" element={<DeveloperToolsHubView />} />
                <Route path="/developer-tools" element={<DeveloperToolsHubView />} />
                <Route path="/developer-tools/:sectionId" element={<DeveloperToolsHubView />} />
                <Route path="/sp-management" element={<DeveloperToolsHubView />} />
                <Route path="/sp-management/:sectionId" element={<DeveloperToolsHubView />} />
                <Route path="/app-management/role-invites" element={<RoleInviteManagerView />} />
                <Route path="/app-management/notifications" element={<NotificationManagementView />} />
                <Route path="/notifications" element={<NotificationManagementView />} />
                {/* Enterprise Finance, Accounts, Billing & Payroll Hub Routes */}
                <Route path="/finance" element={<FeatureGuard sectionKey="nav_finance" fallback={<Navigate to="/dashboard" replace />}><FinanceHubView /></FeatureGuard>} />
                <Route path="/finance/:tab" element={<FeatureGuard sectionKey="nav_finance" fallback={<Navigate to="/dashboard" replace />}><FinanceHubView /></FeatureGuard>} />
                <Route path="/student-billing" element={<FeatureGuard sectionKey="finance_student_billing" fallback={<Navigate to="/finance" replace />}><FinanceHubView /></FeatureGuard>} />
                <Route path="/staff-payroll" element={<FeatureGuard sectionKey="finance_staff_payroll" fallback={<Navigate to="/finance" replace />}><FinanceHubView /></FeatureGuard>} />
                <Route path="/general-ledger" element={<FeatureGuard sectionKey="finance_general_ledger" fallback={<Navigate to="/finance" replace />}><FinanceHubView /></FeatureGuard>} />

                <Route path="/dashboard" element={<DashboardHubView />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </Suspense>
        </UndoRedoProvider>
      </I18nProvider>
    </BrowserRouter>
  );
}