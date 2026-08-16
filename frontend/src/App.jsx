import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import LandingPageView from "./modules/landing/LandingPageView";
import LoginView from "./modules/auth/LoginView";
import RegisterView from "./modules/auth/RegisterView";
import VerifyEmailView from "./modules/auth/VerifyEmailView";
import ResetPasswordView from "./modules/auth/ResetPasswordView";
import PublicVerifyReportView from "./modules/verification/PublicVerifyReportView";
import { auth as authStore } from "./utils/localStore";

import StudentReportsView from "./modules/reports-history/ReportsHistoryModule";
import StudentDirectoryView from "./modules/student-directory/StudentDirectoryModule";
import StudentAdmissionView from "./modules/student-directory/admission/StudentAdmissionView";
import SessionManager from "./modules/student-directory/components/SessionManager";
import UserManagementModule from "./modules/admin/UserManagementModule";
import RoleManagementModule from "./modules/admin/RoleManagementModule";
import ActivityAnalyticsView from "./modules/admin/ActivityAnalyticsView";
import TrashRestorationView from "./modules/admin/TrashRestorationView";
import UserProfileSettingsView from "./modules/settings/components/UserProfileSettingsView";
import SecuritySessionsView from "./modules/settings/components/SecuritySessionsView";
import AppearanceSettings from "./modules/settings/components/AppearanceSettings";
import CalendarSettings from "./modules/settings/components/CalendarSettings";
import CopyReportSettingsView from "./modules/settings/components/CopyReportSettingsView";
import LanguageSettingsView from "./modules/settings/components/LanguageSettingsView";
import DataBackupView from "./modules/settings/components/DataBackupView";
import ShortcutsGuide from "./modules/settings/components/ShortcutsGuide";
import AppGuideView from "./modules/settings/components/AppGuideView";
import AboutAppView from "./modules/settings/components/AboutAppView";
import SectionToggleControlPanel from "./modules/settings/components/SectionToggleControlPanel";
import RoleInviteManagerView from "./modules/app-management/invites/RoleInviteManagerView";
import JoinWithInviteView from "./modules/auth/JoinWithInviteView";
import StudentProfileHubView from "./modules/student-profile/StudentProfileHubView";
import DepartmentManagementView from "./modules/student-management/departments/DepartmentManagementView";
import ClassManagementView from "./modules/student-management/classes/ClassManagementView";
import GroupManagementView from "./modules/student-management/groups/GroupManagementView";
import InstitutionListView from "./modules/app-management/institutions/InstitutionListView";
import InstitutionProfileView from "./modules/settings/components/InstitutionProfileView";
import { FeatureGuard } from "./components/common/FeatureGuard";

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
          <Route path="/student-management/departments" element={<FeatureGuard sectionKey="student_departments" fallback={<Navigate to="/dashboard" replace />}><DepartmentManagementView /></FeatureGuard>} />
          <Route path="/student-management/classes" element={<FeatureGuard sectionKey="student_classes" fallback={<Navigate to="/dashboard" replace />}><ClassManagementView /></FeatureGuard>} />
          <Route path="/student-management/groups" element={<FeatureGuard sectionKey="student_groups" fallback={<Navigate to="/dashboard" replace />}><GroupManagementView /></FeatureGuard>} />
          <Route path="/groups-students" element={<FeatureGuard sectionKey="student_roster" fallback={<Navigate to="/dashboard" replace />}><StudentDirectoryView /></FeatureGuard>} />
          <Route path="/student-roster" element={<FeatureGuard sectionKey="student_roster" fallback={<Navigate to="/dashboard" replace />}><StudentDirectoryView viewMode="students" /></FeatureGuard>} />
          <Route path="/group-roster" element={<FeatureGuard sectionKey="student_groups" fallback={<Navigate to="/dashboard" replace />}><GroupManagementView /></FeatureGuard>} />
          <Route path="/admission" element={<FeatureGuard sectionKey="student_admission" fallback={<Navigate to="/dashboard" replace />}><StudentAdmissionView /></FeatureGuard>} />
          <Route path="/students/:id/profile" element={<FeatureGuard sectionKey="student_roster" fallback={<Navigate to="/dashboard" replace />}><StudentProfileHubView /></FeatureGuard>} />
          <Route path="/sessions-comments" element={<FeatureGuard sectionKey="report_sessions_comments" fallback={<Navigate to="/dashboard" replace />}><SessionManager /></FeatureGuard>} />
          <Route path="/user-management" element={<FeatureGuard sectionKey="app_user_management" fallback={<Navigate to="/dashboard" replace />}><UserManagementModule /></FeatureGuard>} />
          <Route path="/role-management" element={<FeatureGuard sectionKey="app_role_management" fallback={<Navigate to="/dashboard" replace />}><RoleManagementModule /></FeatureGuard>} />
          <Route path="/activity-analytics" element={<FeatureGuard sectionKey="app_activity_analytics" fallback={<Navigate to="/dashboard" replace />}><ActivityAnalyticsView /></FeatureGuard>} />
          <Route path="/trash-restoration" element={<FeatureGuard sectionKey="nav_trash" fallback={<Navigate to="/dashboard" replace />}><TrashRestorationView /></FeatureGuard>} />
          <Route path="/profile-settings" element={<FeatureGuard sectionKey="settings_profile" fallback={<Navigate to="/dashboard" replace />}><UserProfileSettingsView /></FeatureGuard>} />
          <Route path="/settings/institution" element={<InstitutionProfileView />} />
          <Route path="/institution-profile" element={<InstitutionProfileView />} />
          <Route path="/security-sessions" element={<FeatureGuard sectionKey="settings_security" fallback={<Navigate to="/dashboard" replace />}><SecuritySessionsView /></FeatureGuard>} />
          <Route path="/appearance" element={<FeatureGuard sectionKey="settings_appearance" fallback={<Navigate to="/dashboard" replace />}><AppearanceSettings /></FeatureGuard>} />
          <Route path="/date-time" element={<FeatureGuard sectionKey="settings_datetime" fallback={<Navigate to="/dashboard" replace />}><CalendarSettings /></FeatureGuard>} />
          <Route path="/copy-report" element={<FeatureGuard sectionKey="report_copy_settings" fallback={<Navigate to="/dashboard" replace />}><CopyReportSettingsView /></FeatureGuard>} />
          <Route path="/language" element={<FeatureGuard sectionKey="settings_language" fallback={<Navigate to="/dashboard" replace />}><LanguageSettingsView /></FeatureGuard>} />
          <Route path="/data-backup" element={<FeatureGuard sectionKey="settings_backup" fallback={<Navigate to="/dashboard" replace />}><DataBackupView /></FeatureGuard>} />
          <Route path="/shortcuts" element={<FeatureGuard sectionKey="nav_shortcuts" fallback={<Navigate to="/dashboard" replace />}><ShortcutsGuide /></FeatureGuard>} />
          <Route path="/guide" element={<FeatureGuard sectionKey="nav_app_guide" fallback={<Navigate to="/dashboard" replace />}><AppGuideView /></FeatureGuard>} />
          <Route path="/about" element={<FeatureGuard sectionKey="nav_about" fallback={<Navigate to="/dashboard" replace />}><AboutAppView /></FeatureGuard>} />
          <Route path="/section-control" element={<FeatureGuard sectionKey="app_section_control" fallback={<Navigate to="/dashboard" replace />}><SectionToggleControlPanel /></FeatureGuard>} />
          <Route path="/app-management/institutions" element={<FeatureGuard sectionKey="app_institutions" fallback={<Navigate to="/dashboard" replace />}><InstitutionListView /></FeatureGuard>} />
          <Route path="/institutions" element={<FeatureGuard sectionKey="app_institutions" fallback={<Navigate to="/dashboard" replace />}><InstitutionListView /></FeatureGuard>} />
          <Route path="/app-management/role-invites" element={<FeatureGuard sectionKey="app_role_invites" fallback={<Navigate to="/dashboard" replace />}><RoleInviteManagerView /></FeatureGuard>} />
          <Route path="/dashboard" element={null} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}