import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import LoginView from "./modules/auth/LoginView";
import RegisterView from "./modules/auth/RegisterView";
import VerifyEmailView from "./modules/auth/VerifyEmailView";
import ResetPasswordView from "./modules/auth/ResetPasswordView";
import PublicVerifyReportView from "./modules/verification/PublicVerifyReportView";
import { auth as authStore } from "./utils/localStore";

import StudentReportsView from "./modules/reports-history/ReportsHistoryModule";
import StudentDirectoryView from "./modules/student-directory/StudentDirectoryModule";
import SessionManager from "./modules/student-directory/components/SessionManager";
import UserManagementModule from "./modules/admin/UserManagementModule";
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

import { FeatureControlProvider } from "./context/FeatureControlContext";

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
    <FeatureControlProvider>
      <BrowserRouter>
      <Routes>
        {/* Standalone Public Auth & Verification Routes */}
        <Route path="/login" element={<LoginView />} />
        <Route path="/register" element={<RegisterView />} />
        <Route path="/verify-email/:token" element={<VerifyEmailView />} />
        <Route path="/reset-password/:token" element={<ResetPasswordView />} />
        <Route path="/verify-report/:report_id" element={<PublicVerifyReportView />} />
        <Route path="/api/v1/hifz/verify-report/:report_id" element={<PublicVerifyReportView />} />

        {/* Protected Dashboard Layout with Nested Page Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="student-reports" element={<StudentReportsView />} />
          <Route path="groups-students" element={<StudentDirectoryView />} />
          <Route path="sessions-comments" element={<SessionManager />} />
          <Route path="user-management" element={<UserManagementModule />} />
          <Route path="activity-analytics" element={<ActivityAnalyticsView />} />
          <Route path="trash-restoration" element={<TrashRestorationView />} />
          <Route path="profile-settings" element={<UserProfileSettingsView />} />
          <Route path="security-sessions" element={<SecuritySessionsView />} />
          <Route path="appearance" element={<AppearanceSettings />} />
          <Route path="date-time" element={<CalendarSettings />} />
          <Route path="copy-report" element={<CopyReportSettingsView />} />
          <Route path="language" element={<LanguageSettingsView />} />
          <Route path="data-backup" element={<DataBackupView />} />
          <Route path="shortcuts" element={<ShortcutsGuide />} />
          <Route path="guide" element={<AppGuideView />} />
          <Route path="about" element={<AboutAppView />} />
          <Route path="section-control" element={<SectionToggleControlPanel />} />
          <Route path="dashboard" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </FeatureControlProvider>
  );
}