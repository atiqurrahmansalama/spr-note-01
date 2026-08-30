import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import RouteLoadingFallback from "./components/ui/RouteLoadingFallback";
import { auth as authStore } from "./utils/localStore";
import { FeatureGuard } from "./components/common/FeatureGuard";

// ─── Public & Auth Views (Lazy Loaded) ──────────────────────────────────────
const LandingPageView = lazy(() => import("./modules/landing/LandingPageView"));
const LoginView = lazy(() => import("./modules/auth/LoginView"));
const RegisterView = lazy(() => import("./modules/auth/RegisterView"));
const VerifyEmailView = lazy(() => import("./modules/auth/VerifyEmailView"));
const ResetPasswordView = lazy(() => import("./modules/auth/ResetPasswordView"));
const PublicVerifyReportView = lazy(() => import("./modules/verification/PublicVerifyReportView"));
const JoinWithInviteView = lazy(() => import("./modules/auth/JoinWithInviteView"));
const PublicOnlineAdmissionView = lazy(() => import("./modules/student-directory/admission/PublicOnlineAdmissionView"));
const PublicStaffOnboardingView = lazy(() => import("./modules/staff-management/onboarding/PublicStaffOnboardingView"));

// ─── Protected Student & Reports Views (Lazy Loaded) ────────────────────────
const StudentReportsView = lazy(() => import("./modules/reports-history/components/StudentReportsView"));
const StudentDirectoryView = lazy(() => import("./modules/student-directory/StudentDirectoryView"));
const StudentAdmissionView = lazy(() => import("./modules/student-directory/admission/StudentAdmissionView"));
const SessionManager = lazy(() => import("./modules/student-directory/SessionManager"));
const StudentProfileHubView = lazy(() => import("./modules/student-directory/StudentProfileHubView"));

// ─── Protected Staff Management Views (Lazy Loaded) ─────────────────────────
const TeacherStaffRosterView = lazy(() => import("./modules/staff-management/TeacherStaffRosterView"));
const TeacherAttendanceView = lazy(() => import("./modules/staff-management/TeacherAttendanceView"));
const StaffDailyAttendanceView = lazy(() => import("./modules/staff-management/StaffDailyAttendanceView"));
const StaffOnboardingView = lazy(() => import("./modules/staff-management/onboarding/StaffOnboardingView"));
const StaffProfileDetailView = lazy(() => import("./modules/staff-management/StaffProfileDetailView"));

// ─── Protected Attendance Views (Lazy Loaded) ───────────────────────────────
const ClassAttendanceView = lazy(() => import("./modules/attendance/ClassAttendanceView"));
const AttendanceSettingsView = lazy(() => import("./modules/attendance/AttendanceSettingsView"));
const ResidentialAttendanceView = lazy(() => import("./modules/attendance/ResidentialAttendanceView"));
const AdHocHeadcountView = lazy(() => import("./modules/attendance/AdHocHeadcountView"));

// ─── Protected Academy & Campus Structure Views (Lazy Loaded) ───────────────
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
const DailyClassroomHubView = lazy(() => import("./modules/learning/daily-classroom/DailyClassroomHubView"));
const SyllabusMilestoneHubView = lazy(() => import("./modules/learning/syllabus-milestone/SyllabusMilestoneHubView"));
const AcademicAnalyticsHubView = lazy(() => import("./modules/learning/academic-analytics/AcademicAnalyticsHubView"));






// ─── Protected Admin & Role Views (Lazy Loaded) ─────────────────────────────
const UserManagementModule = lazy(() => import("./modules/admin/UserManagementModule"));
const RoleManagementPanel = lazy(() => import("./modules/admin/RoleManagementPanel"));
const ActivityAnalyticsView = lazy(() => import("./modules/admin/ActivityAnalyticsView"));
const TrashRestorationView = lazy(() => import("./modules/admin/TrashRestorationView"));

// ─── Protected Settings & Personalization Views (Lazy Loaded) ───────────────
const ProfileSettingsView = lazy(() => import("./modules/settings/ProfileSettingsView"));
const SecuritySessionsView = lazy(() => import("./modules/settings/components/SecuritySessionsView"));
const PersonalizeSettingsHubView = lazy(() => import("./modules/settings/PersonalizeSettingsHubView"));
const ReportSettingsView = lazy(() => import("./modules/settings/ReportSettingsView"));
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

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          {/* Standalone Public Auth & Verification Routes */}
          <Route path="/" element={<LandingPageView />} />
          <Route path="/login" element={<LoginView />} />
          <Route path="/register" element={<RegisterView />} />
          <Route path="/verify-email/:token" element={<VerifyEmailView />} />
          <Route path="/reset-password/:token" element={<ResetPasswordView />} />
          <Route path="/verify-report/:report_id" element={<PublicVerifyReportView />} />
          <Route path="/api/v1/hifz/verify-report/:report_id" element={<PublicVerifyReportView />} />
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
            <Route path="/report-builder" element={<FeatureGuard sectionKey="report_builder" fallback={<Navigate to="/dashboard" replace />}><div /></FeatureGuard>} />
            <Route path="/student-reports" element={<FeatureGuard sectionKey="report_history" fallback={<Navigate to="/dashboard" replace />}><StudentReportsView /></FeatureGuard>} />
            <Route path="/students" element={<FeatureGuard sectionKey="student_roster" fallback={<Navigate to="/dashboard" replace />}><StudentDirectoryView viewMode="students" /></FeatureGuard>} />
            <Route path="/staff/roster" element={<FeatureGuard sectionKey="staff_roster" fallback={<Navigate to="/dashboard" replace />}><TeacherStaffRosterView /></FeatureGuard>} />
            <Route path="/staff/teacher-attendance" element={<FeatureGuard sectionKey="staff_roster" fallback={<Navigate to="/dashboard" replace />}><TeacherAttendanceView /></FeatureGuard>} />
            <Route path="/staff/attendance" element={<FeatureGuard sectionKey="staff_roster" fallback={<Navigate to="/dashboard" replace />}><StaffDailyAttendanceView /></FeatureGuard>} />
            <Route path="/staff/daily-attendance" element={<Navigate to="/staff/attendance" replace />} />
            <Route path="/staff/onboarding" element={<FeatureGuard sectionKey="staff_onboarding" fallback={<Navigate to="/dashboard" replace />}><StaffOnboardingView /></FeatureGuard>} />
            <Route path="/staff-onboarding" element={<Navigate to="/staff/onboarding" replace />} />
            <Route path="/staff" element={<Navigate to="/staff/roster" replace />} />
            <Route path="/staff/:id" element={<FeatureGuard sectionKey="staff_roster" fallback={<Navigate to="/dashboard" replace />}><StaffProfileDetailView /></FeatureGuard>} />
            
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
            <Route path="/admission" element={<FeatureGuard sectionKey="student_admission" fallback={<Navigate to="/dashboard" replace />}><StudentAdmissionView /></FeatureGuard>} />
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

            {/* Academic Learning, Daily Lessons & Reporting Hub Routes */}
            <Route path="/studies" element={<DailyClassroomHubView />} />
            <Route path="/studies/daily-classroom" element={<DailyClassroomHubView />} />
            <Route path="/studies/syllabus-milestone" element={<SyllabusMilestoneHubView />} />
            <Route path="/studies/academic-analytics" element={<AcademicAnalyticsHubView />} />

            {/* Sub-item Direct Routes & Aliases */}
            <Route path="/studies/daily-lessons" element={<DailyClassroomHubView defaultTab="LESSONS" />} />
            <Route path="/studies/recitations" element={<DailyClassroomHubView defaultTab="ASSESSMENT" />} />
            <Route path="/studies/homework" element={<DailyClassroomHubView defaultTab="HOMEWORK" />} />
            <Route path="/studies/goals" element={<SyllabusMilestoneHubView defaultTab="PACING_GOALS" />} />
            <Route path="/studies/reports" element={<AcademicAnalyticsHubView defaultTab="LEDGER" />} />
            
            <Route path="/daily-lessons" element={<DailyClassroomHubView defaultTab="LESSONS" />} />
            <Route path="/recitations" element={<DailyClassroomHubView defaultTab="ASSESSMENT" />} />
            <Route path="/homework-tasks" element={<DailyClassroomHubView defaultTab="HOMEWORK" />} />
            <Route path="/academic-goals" element={<SyllabusMilestoneHubView defaultTab="PACING_GOALS" />} />
            <Route path="/academic-reports" element={<AcademicAnalyticsHubView defaultTab="LEDGER" />} />




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
            <Route path="/language" element={<PersonalizeSettingsHubView />} />
            <Route path="/copy-report" element={<FeatureGuard sectionKey="report_copy_settings" fallback={<Navigate to="/dashboard" replace />}><ReportSettingsView /></FeatureGuard>} />
            <Route path="/report-settings" element={<FeatureGuard sectionKey="report_copy_settings" fallback={<Navigate to="/dashboard" replace />}><ReportSettingsView /></FeatureGuard>} />
            <Route path="/data-backup" element={<FeatureGuard sectionKey="settings_backup" fallback={<Navigate to="/dashboard" replace />}><DataBackupView /></FeatureGuard>} />
            <Route path="/shortcuts" element={<FeatureGuard sectionKey="nav_shortcuts" fallback={<Navigate to="/dashboard" replace />}><ShortcutsGuide /></FeatureGuard>} />
            <Route path="/guide" element={<FeatureGuard sectionKey="nav_app_guide" fallback={<Navigate to="/dashboard" replace />}><AppGuideView /></FeatureGuard>} />
            <Route path="/about" element={<FeatureGuard sectionKey="nav_about" fallback={<Navigate to="/dashboard" replace />}><AboutAppView /></FeatureGuard>} />
            <Route path="/section-control" element={<FeatureGuard sectionKey="app_section_control" fallback={<Navigate to="/dashboard" replace />}><SectionToggleControlPanel /></FeatureGuard>} />
            <Route path="/app-management/institutions" element={<FeatureGuard sectionKey="app_institutions" fallback={<Navigate to="/dashboard" replace />}><InstitutionListView /></FeatureGuard>} />
            <Route path="/institutions" element={<FeatureGuard sectionKey="app_institutions" fallback={<Navigate to="/dashboard" replace />}><InstitutionListView /></FeatureGuard>} />
            <Route path="/admin-tools" element={<DeveloperToolsHubView />} />
            <Route path="/developer-tools" element={<DeveloperToolsHubView />} />
            <Route path="/sp-management" element={<DeveloperToolsHubView />} />
            <Route path="/app-management/role-invites" element={<RoleInviteManagerView />} />
            <Route path="/app-management/notifications" element={<NotificationManagementView />} />
            <Route path="/notifications" element={<NotificationManagementView />} />
            <Route path="/dashboard" element={null} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}