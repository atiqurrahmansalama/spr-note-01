import { useState, useEffect, useRef } from "react";
import { calendarSettings, auth as authStore, saveStatusStore } from "./utils/localStore";
import Sidebar from "./components/layout/Sidebar";
import UserProfileDrawer from "./components/layout/UserProfileDrawer";
import HifzReportForm from "./components/session/HifzReportForm";
import SidebarScreenBlockView from "./components/layout/SidebarScreenBlockView";
import AppearanceSettings from "./components/layout/AppearanceSettings";
import CalendarSettings from "./components/layout/CalendarSettings";
import CopyReportSettingsView from "./components/layout/CopyReportSettingsView";
import DataBackupView from "./components/layout/DataBackupView";
import LanguageSettingsView from "./components/layout/LanguageSettingsView";
import SessionManager from "./components/layout/SessionManager";
import ShortcutsGuide from "./components/layout/ShortcutsGuide";
import AppGuideView from "./components/layout/AppGuideView";
import AboutAppView from "./components/layout/AboutAppView";
import StudentDirectoryView from "./components/layout/StudentDirectoryView";
import { useTheme } from "./context/useTheme";
import { SleekCheckIcon, CloudCheckIcon } from "./components/ui/Icons";

function SaveStatusBadge() {
  const [status, setStatus] = useState(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const handleStatusChange = (e) => {
      if (e.detail) {
        setStatus(e.detail);
        setVisible(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        // Popup for ~0.6 seconds then vanish smoothly
        timerRef.current = setTimeout(() => {
          setVisible(false);
        }, 600);
      }
    };
    window.addEventListener("spr_save_status_change", handleStatusChange);
    return () => {
      window.removeEventListener("spr_save_status_change", handleStatusChange);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!status) return null;

  const isDb = status.type === "database";

  return (
    <div 
      className={`flex items-center gap-1.5 text-xs font-semibold transition-all duration-300 transform select-none ${
        visible 
          ? "opacity-100 translate-y-0 scale-100" 
          : "opacity-0 -translate-y-1 scale-95 pointer-events-none"
      } ${isDb ? "text-emerald-400" : "theme-accent"}`}
    >
      {isDb ? (
        <CloudCheckIcon className="w-4 h-4 text-emerald-400 shrink-0" />
      ) : (
        <SleekCheckIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
      )}
      <span>{status.label || (isDb ? "Database Synced" : "Saved")}</span>
    </div>
  );
}

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Dashboard");
  const themeContext = useTheme();

  // 💾 timezone & dateFormat — LocalStorage থেকে initialize
  const [timeZone, setTimeZone] = useState(() => calendarSettings.getTimezone());
  const [dateFormat, setDateFormat] = useState(() => calendarSettings.getDateFormat());

  // 💾 পরিবর্তন হলে LocalStorage-এ সেভ করো
  useEffect(() => { calendarSettings.saveTimezone(timeZone); }, [timeZone]);
  useEffect(() => { calendarSettings.saveDateFormat(dateFormat); }, [dateFormat]);

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

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden theme-bg-app theme-text-primary">
      
      {/* Global Top Navigation Bar */}
      <header className="theme-bg-surface border-b theme-border px-4 py-3 flex justify-between items-center z-30 shadow-md shrink-0">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="theme-text-secondary hover:theme-text-primary px-2.5 py-1.5 rounded-lg border theme-border theme-bg-sub hover:theme-bg-elevated text-xs font-medium transition flex items-center gap-2 cursor-pointer"
            title="Toggle Left Menu"
          >
            <span>☰</span>
            <span className="hidden sm:inline">Menu</span>
          </button>
          
          <button 
            type="button"
            onClick={() => setActiveTab("Dashboard")}
            className="flex items-center gap-2 cursor-pointer text-left"
          >
            <span className="font-bold theme-text-primary text-base tracking-wide">SPR Note</span>
            <span className="text-[10px] theme-text-secondary font-mono theme-bg-sub px-1.5 py-0.5 rounded border theme-border hidden sm:inline-block">v1.93.0</span>
          </button>
        </div>

        {/* Live Auto-Save / DB Sync Status Badge */}
        <div className="flex items-center gap-3">
          <SaveStatusBadge />

          {/* Right Top User Profile Button */}
          {user ? (
            <button 
              type="button"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2.5 theme-bg-sub hover:theme-bg-elevated border theme-border px-3 py-1.5 rounded-xl transition text-left cursor-pointer"
            >
              <div className="w-6 h-6 rounded-md theme-bg-elevated border theme-border text-xs theme-accent font-bold flex items-center justify-center">
                {avatarChar}
              </div>
              <span className="text-xs font-semibold theme-text-primary hidden md:inline truncate max-w-30">
                {user.first_name ? `${user.first_name}` : user.username}
              </span>
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
          isProfileOpen={isProfileOpen}
          setIsProfileOpen={setIsProfileOpen}
        />

        {/* Dynamic Center / Screen-blocking Main Content View */}
        <div className="flex-1 h-full overflow-hidden relative">
          <main className="flex-1 h-full overflow-y-auto p-4 sm:p-6 transition-all duration-300 flex justify-center items-start">
            <div className={activeTab === "Dashboard" ? "w-full max-w-xl mx-auto" : "hidden"}>
              <HifzReportForm timeZone={timeZone} dateFormat={dateFormat} />
            </div>
            {activeTab !== "Dashboard" && renderSidebarScreen()}
          </main>
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