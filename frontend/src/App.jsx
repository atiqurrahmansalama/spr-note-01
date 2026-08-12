import { useEffect, useState, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import apiClient from "./api/axios";
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
  if (!authStore.isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function PopupOAuthHandler() {
  const [status, setStatus] = useState("loading"); // 'loading' | 'success' | 'error'
  const [errorData, setErrorData] = useState(null);
  const isProcessing = useRef(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");

    const hash = window.location.hash;
    const hashParams = hash ? new URLSearchParams(hash.replace("#", "?")) : null;
    const googleAccess = hashParams?.get("access_token");
    const googleId = hashParams?.get("id_token");

    if ((code || googleAccess || googleId) && !isProcessing.current) {
      isProcessing.current = true;
      window.history.replaceState({}, document.title, window.location.pathname);

      const payload = code
        ? { code, redirect_uri: window.location.origin }
        : { access_token: googleAccess, id_token: googleId };

      apiClient.post("/api/v1/auth/google/", payload)
        .then((res) => {
          const data = res.data || {};
          const access = data.tokens?.access || data.access;
          const refresh = data.tokens?.refresh || data.refresh;
          const user = data.user;

          if (access) {
            // 1. Save auth payload
            localStorage.setItem("access_token", access);
            if (refresh) localStorage.setItem("refresh_token", refresh);
            if (user) localStorage.setItem("user", JSON.stringify(user));
            authStore.saveTokens(access, refresh);

            // 2. Trigger cross-tab sync event for main window
            localStorage.setItem("auth_sync_event", Date.now().toString());

            if (window.opener) {
              window.opener.postMessage({ type: "GOOGLE_AUTH_SUCCESS", payload: res.data }, window.location.origin);
            }

            setStatus("success");

            // Close popup after brief delay
            setTimeout(() => {
              window.close();
            }, 500);
          } else {
            setStatus("error");
            setErrorData({ detail: "No access token returned from backend." });
          }
        })
        .catch((err) => {
          console.error("Django Google Auth Exchange Error:", err?.response?.data || err?.message);
          const errPayload = err?.response?.data || { detail: err?.message || "Backend authentication failed" };
          setStatus("error");
          setErrorData(errPayload);

          if (window.opener) {
            window.opener.postMessage({
              type: "GOOGLE_AUTH_ERROR",
              error: errPayload
            }, window.location.origin);
          }
          // DO NOT CLOSE POPUP ON ERROR SO DEVELOPER CAN INSPECT
        });
    }
  }, []);

  if (status === "error") {
    return (
      <div style={{ padding: "24px", background: "#18181b", color: "#f87171", fontFamily: "monospace", minHeight: "100vh", boxSizing: "border-box" }}>
        <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "8px", color: "#ef4444" }}>❌ Backend Authentication Error</h3>
        <p style={{ fontSize: "14px", color: "#a1a1aa", marginBottom: "16px" }}>Google code exchange failed on Django server:</p>
        <pre style={{ background: "#09090b", padding: "16px", borderRadius: "8px", color: "#fca5a5", overflowX: "auto", fontSize: "13px", border: "1px solid #27272a" }}>
          {JSON.stringify(errorData, null, 2)}
        </pre>
        <button
          onClick={() => window.close()}
          style={{ padding: "10px 20px", background: "#27272a", color: "#f4f4f5", border: "1px solid #3f3f46", borderRadius: "8px", cursor: "pointer", marginTop: "16px", fontWeight: "600" }}
        >
          Close Window
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh", justifyContent: "center", alignItems: "center", background: "#09090b", color: "#38bdf8", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ textAlign: "center", padding: "20px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "8px" }}>Syncing Google Authentication...</h2>
        <p style={{ fontSize: "14px", color: "#a1a1aa" }}>Please wait while we complete authentication.</p>
      </div>
    </div>
  );
}

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get("code");
  const hash = window.location.hash;
  const isGooglePopup = Boolean((code || (hash && hash.includes("access_token"))) && window.opener);

  if (isGooglePopup) {
    return <PopupOAuthHandler />;
  }

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