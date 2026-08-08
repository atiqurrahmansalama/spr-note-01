import { useState, useEffect, useRef } from "react";
import { calendarSettings, sidebarSettings, auth as authStore, saveStatusStore } from "./utils/localStore";
import Sidebar from "./modules/sidebar/SidebarContainer";
import UserProfileDrawer from "./modules/sidebar/UserProfileDrawer";
import SidebarScreenBlockView from "./modules/sidebar/SidebarScreenBlockView";
import HifzReportForm from "./modules/report-builder/HifzReportBuilderModule";
import AppearanceSettings from "./modules/settings/components/AppearanceSettings";
import CalendarSettings from "./modules/settings/components/CalendarSettings";
import CopyReportSettingsView from "./modules/settings/components/CopyReportSettingsView";
import DataBackupView from "./modules/settings/components/DataBackupView";
import LanguageSettingsView from "./modules/settings/components/LanguageSettingsView";
import SessionManager from "./modules/student-directory/components/SessionManager";
import ShortcutsGuide from "./modules/settings/components/ShortcutsGuide";
import AppGuideView from "./modules/settings/components/AppGuideView";
import AboutAppView from "./modules/settings/components/AboutAppView";
import StudentDirectoryView from "./modules/student-directory/StudentDirectoryModule";
import StudentReportsView from "./modules/reports-history/ReportsHistoryModule";
import SectionToggleControlPanel from "./modules/settings/components/SectionToggleControlPanel";
import SaveStatusBadge from "./components/common/SaveStatusBadge/SaveStatusBadge";
import { useTheme } from "./context/useTheme";
import { useToast } from "./context/ToastContext";
import { initActivityTracker } from "./utils/activityTracker";

export default function App() {
  const { showToast } = useToast();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarMode, setSidebarMode] = useState(() => {
    const mode = sidebarSettings.getMode();
    return mode === "inline" ? "overlay" : mode;
  });
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  // Restore activeTab from sessionStorage so refresh doesn't lose current screen
  const [activeTab, setActiveTab] = useState(() => {
    try {
      return sessionStorage.getItem("spr_active_tab") || "Dashboard";
    } catch {
      return "Dashboard";
    }
  });

  // Persist activeTab changes to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem("spr_active_tab", activeTab);
    } catch {
      // ignore storage errors
    }
  }, [activeTab]);
  const themeContext = useTheme();

  // Ensure mobile view always defaults to hidden overlay mode
  useEffect(() => {
    const checkMobile = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
        setSidebarMode("overlay");
      }
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Listen for programmatic navigation to Dashboard (e.g., from Edit button in StudentReportsView)
  useEffect(() => {
    const handleNavDashboard = () => setActiveTab("Dashboard");
    window.addEventListener("spr_navigate_dashboard", handleNavDashboard);
    return () => window.removeEventListener("spr_navigate_dashboard", handleNavDashboard);
  }, []);

  // 💾 timezone & dateFormat — LocalStorage থেকে initialize & real-time sync
  const [timeZone, setTimeZone] = useState(() => calendarSettings.getTimezone());
  const [dateFormat, setDateFormat] = useState(() => calendarSettings.getDateFormat());

  useEffect(() => {
    const handleSettingsUpdate = () => {
      setTimeZone(calendarSettings.getTimezone());
      setDateFormat(calendarSettings.getDateFormat());
    };
    window.addEventListener("spr_calendar_settings_updated", handleSettingsUpdate);
    window.addEventListener("storage", handleSettingsUpdate);
    return () => {
      window.removeEventListener("spr_calendar_settings_updated", handleSettingsUpdate);
      window.removeEventListener("storage", handleSettingsUpdate);
    };
  }, []);

  const lastBackTimeRef = useRef(0);

  // 📱 Mobile Back Swipe & Back Button Listener
  useEffect(() => {
    window.history.pushState({ sprApp: true, tab: activeTab }, "");

    const handlePopState = () => {
      // 1. If currently inside a sub-screen (not Dashboard), return to Dashboard!
      if (activeTab !== "Dashboard") {
        setActiveTab("Dashboard");
        window.history.pushState({ sprApp: true, tab: "Dashboard" }, "");
        return;
      }

      // 2. If currently on Dashboard (main form):
      const now = Date.now();
      if (now - lastBackTimeRef.current < 2500) {
        // Double back swipe within 2.5s: allow exit
        window.history.back();
      } else {
        // First back swipe: block exit, show toast alert & push dummy state back
        lastBackTimeRef.current = now;
        window.history.pushState({ sprApp: true, tab: "Dashboard" }, "");
        showToast("Press back again to exit", "info");
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [activeTab, showToast]);

  // 🎹 Global Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      // 1. Alt + L / Ctrl + Shift + L -> Toggle Dark/Light Mode
      if ((e.altKey || (isCmdOrCtrl && e.shiftKey)) && key === "l") {
        e.preventDefault();
        if (themeContext?.setModeId) {
          themeContext.setModeId((prev) => (prev === "dark" ? "light" : "dark"));
        }
        return;
      }

      // 2. Alt + T / Ctrl + Shift + T -> Cycle Theme Palette
      if ((e.altKey || (isCmdOrCtrl && e.shiftKey)) && key === "t") {
        e.preventDefault();
        if (themeContext?.palettes && themeContext?.setThemeId) {
          const palettes = themeContext.palettes;
          const currentIdx = palettes.findIndex((p) => p.id === themeContext.themeId);
          const nextPalette = palettes[(currentIdx + 1) % palettes.length];
          themeContext.setThemeId(nextPalette.id);
        }
        return;
      }

      // 3. Ctrl/Cmd + S -> Save / Generate Report
      if (isCmdOrCtrl && !e.shiftKey && key === "s") {
        e.preventDefault();
        const makeReportBtn = document.querySelector('button[data-shortcut="make-report"]');
        if (makeReportBtn) {
          makeReportBtn.click();
        } else {
          setActiveTab("Dashboard");
        }
        return;
      }

      // 3b. Alt + S -> Add to Record
      if (e.altKey && key === "s") {
        e.preventDefault();
        const addRecordBtn = Array.from(document.querySelectorAll("button")).find(
          (b) => b.textContent.includes("Add to Record")
        );
        if (addRecordBtn) addRecordBtn.click();
        return;
      }

      // 4. Ctrl/Cmd + M -> Toggle Sidebar
      if (isCmdOrCtrl && !e.shiftKey && key === "m") {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
        return;
      }

      // 5. Ctrl/Cmd + K -> Focus Search / Student Input
      if (isCmdOrCtrl && !e.shiftKey && key === "k") {
        e.preventDefault();
        const input = document.querySelector('input[type="text"], input[placeholder*="Search"], input[placeholder*="student"]');
        if (input) input.focus();
        return;
      }

      // 6. Ctrl/Cmd + Shift + Hotkeys for navigation
      if (isCmdOrCtrl && e.shiftKey) {
        if (key === "d") { e.preventDefault(); setActiveTab("Dashboard"); }
        else if (key === "a") { e.preventDefault(); setActiveTab("Appearance"); }
        else if (key === "g") { e.preventDefault(); setActiveTab("Groups & Students"); }
        else if (key === "s") { e.preventDefault(); setActiveTab("Sessions & Comments"); }
        else if (key === "b") { e.preventDefault(); setActiveTab("Data & Backup"); }
        else if (key === "k") { e.preventDefault(); setActiveTab("Shortcuts"); }
      }

      // 7. Escape -> Return to Dashboard or close drawer
      if (e.key === "Escape") {
        if (isProfileOpen) {
          setIsProfileOpen(false);
        } else if (isSidebarOpen) {
          setIsSidebarOpen(false);
        } else if (activeTab !== "Dashboard") {
          setActiveTab("Dashboard");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, isSidebarOpen, isProfileOpen, themeContext]);

  const [user, setUser] = useState(() => authStore.getUser());

  useEffect(() => {
    initActivityTracker();
  }, []);

  const handleLogout = () => {
    authStore.clear();
    setUser(null);
    setIsProfileOpen(false);
    window.location.reload();
  };

  const avatarChar = user 
    ? (user.first_name ? user.first_name.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase())
    : "S";

  const renderSidebarScreen = () => {
    switch (activeTab) {
      case "Appearance":
        return (
          <SidebarScreenBlockView title="Appearance & Typography" onClose={() => setActiveTab("Dashboard")}>
            <AppearanceSettings />
          </SidebarScreenBlockView>
        );
      case "Settings":
      case "Date & Time":
        return (
          <SidebarScreenBlockView title="Date & Time Settings" onClose={() => setActiveTab("Dashboard")}>
            <CalendarSettings
              timeZone={timeZone}
              setTimeZone={setTimeZone}
              dateFormat={dateFormat}
              setDateFormat={setDateFormat}
            />
          </SidebarScreenBlockView>
        );
      case "Copy Report Settings":
        return (
          <SidebarScreenBlockView title="Copy Report Settings" onClose={() => setActiveTab("Dashboard")}>
            <CopyReportSettingsView />
          </SidebarScreenBlockView>
        );
      case "Data & Backup":
        return (
          <SidebarScreenBlockView title="Data & Backup" onClose={() => setActiveTab("Dashboard")}>
            <DataBackupView />
          </SidebarScreenBlockView>
        );
      case "Language":
        return (
          <SidebarScreenBlockView title="Language Settings" onClose={() => setActiveTab("Dashboard")}>
            <LanguageSettingsView />
          </SidebarScreenBlockView>
        );
      case "Section Control":
      case "Section Toggle":
      case "Section Control Panel":
        return (
          <SidebarScreenBlockView title="Super Admin Section Control Panel" onClose={() => setActiveTab("Dashboard")}>
            <SectionToggleControlPanel />
          </SidebarScreenBlockView>
        );
      case "Student Reports":
        return (
          <SidebarScreenBlockView title="Student Progress & Daily Reports" onClose={() => setActiveTab("Dashboard")}>
            <StudentReportsView />
          </SidebarScreenBlockView>
        );
      case "Sessions & Comments":
      case "Sessions List":
      case "Saved Comments":
        return (
          <SidebarScreenBlockView title="Sessions & Saved Comments" onClose={() => setActiveTab("Dashboard")}>
            <SessionManager />
          </SidebarScreenBlockView>
        );
      case "Shortcuts":
        return (
          <SidebarScreenBlockView title="Keyboard Shortcuts" onClose={() => setActiveTab("Dashboard")}>
            <ShortcutsGuide />
          </SidebarScreenBlockView>
        );
      case "App Guide":
        return (
          <SidebarScreenBlockView title="User Guide & Documentation" onClose={() => setActiveTab("Dashboard")}>
            <AppGuideView />
          </SidebarScreenBlockView>
        );
      case "About":
        return (
          <SidebarScreenBlockView title="About Application" onClose={() => setActiveTab("Dashboard")}>
            <AboutAppView />
          </SidebarScreenBlockView>
        );
      case "Groups & Students":
      case "Student Directory":
      case "Student Groups":
        return (
          <SidebarScreenBlockView title="Groups & Students Directory" onClose={() => setActiveTab("Dashboard")}>
            <StudentDirectoryView />
          </SidebarScreenBlockView>
        );
      default:
        return null;
    }
  };

  const handleToggleMenu = () => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      setIsSidebarOpen((prev) => !prev);
      setSidebarMode("overlay");
    } else {
      if (!isSidebarOpen) {
        setIsSidebarOpen(true);
        setSidebarMode("inline");
        sidebarSettings.saveMode("inline");
      } else if (sidebarMode === "inline") {
        setSidebarMode("collapsed");
        sidebarSettings.saveMode("collapsed");
      } else if (sidebarMode === "collapsed") {
        setSidebarMode("overlay");
        sidebarSettings.saveMode("overlay");
      } else {
        setSidebarMode("inline");
        sidebarSettings.saveMode("inline");
      }
    }
  };

  const getMenuTooltip = () => {
    if (!isSidebarOpen) return "Open Navigation Sidebar (Inline Mode)";
    if (sidebarMode === "inline") return "Current: Inline Mode (Click for Icon Rail Mode)";
    if (sidebarMode === "collapsed") return "Current: Icon Rail Mode (Click for Full Overlay Mode)";
    return "Current: Full Overlay Mode (Click for Inline Mode)";
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden theme-bg-app theme-text-primary">
      
      {/* Global Top Navigation Bar */}
      <header className="theme-bg-surface border-b theme-border px-4 py-2.5 flex justify-between items-center z-30 shadow-md shrink-0 select-none">
        <div className="flex items-center gap-3">
          {/* Menu Button (Icon only, cycles through modes on click, no background) */}
          <button 
            type="button"
            onClick={handleToggleMenu}
            className="p-1.5 theme-text-primary hover:theme-accent text-xl font-bold transition-colors bg-transparent border-0 flex items-center justify-center cursor-pointer active:scale-95"
            title={getMenuTooltip()}
          >
            <span>☰</span>
          </button>
          
          <button 
            type="button"
            onClick={() => setActiveTab("Dashboard")}
            className="flex items-center gap-2 cursor-pointer text-left group"
          >
            <span className="font-bold theme-text-primary text-lg tracking-wide group-hover:theme-accent transition-colors">SPR Note</span>
          </button>
        </div>

        {/* Live Auto-Save / DB Sync Status Badge */}
        <div className="flex items-center gap-3">
          <SaveStatusBadge />

          {/* Right Top User Profile Icon Only (Fully round, background-free button) */}
          {user ? (
            <button 
              type="button"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="p-0 bg-transparent border-0 cursor-pointer active:scale-95 group focus:outline-none flex items-center justify-center"
              title="View User Profile"
            >
              <div className="relative">
                <div className="w-8 h-8 rounded-full theme-bg-accent theme-accent-text text-xs font-bold flex items-center justify-center shadow-sm group-hover:opacity-90 transition-opacity">
                  {avatarChar}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[var(--bg-surface)]" />
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="text-xs theme-accent hover:underline font-semibold cursor-pointer"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main Content Body */}
      <div className="flex flex-1 h-full overflow-hidden relative">
        {/* Left Sidebar */}
        <Sidebar 
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          sidebarMode={sidebarMode}
          setSidebarMode={setSidebarMode}
          isProfileOpen={isProfileOpen}
          setIsProfileOpen={setIsProfileOpen}
        />

        {/* Dynamic Center / Screen-blocking Main Content View */}
        <div className="flex-1 h-full overflow-hidden relative">
          {activeTab === "Dashboard" ? (
            <main className="w-full h-full overflow-y-auto p-4 sm:p-6 transition-all duration-300 flex justify-center items-start">
              <div className="w-full max-w-xl mx-auto">
                <HifzReportForm timeZone={timeZone} dateFormat={dateFormat} />
              </div>
            </main>
          ) : (
            renderSidebarScreen()
          )}
        </div>

        {/* Right Sidebar Drawer for User Profile */}
        <UserProfileDrawer 
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          user={user}
          onLogout={handleLogout}
        />
      </div>
    </div>
  );
}