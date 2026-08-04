import { useState, useEffect, useRef } from "react";
import { calendarSettings, sidebarSettings, auth as authStore, saveStatusStore } from "./utils/localStore";
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
import { useToast } from "./context/ToastContext";
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
  const { showToast } = useToast();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarMode, setSidebarMode] = useState(() => sidebarSettings.getMode());
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Dashboard");
  const themeContext = useTheme();

  // 💾 timezone & dateFormat — LocalStorage থেকে initialize
  const [timeZone, setTimeZone] = useState(() => calendarSettings.getTimezone());
  const [dateFormat, setDateFormat] = useState(() => calendarSettings.getDateFormat());

  // 💾 পরিবর্তন হলে LocalStorage-এ সেভ করো
  useEffect(() => { calendarSettings.saveTimezone(timeZone); }, [timeZone]);
  useEffect(() => { calendarSettings.saveDateFormat(dateFormat); }, [dateFormat]);

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
          {/* Menu Button (Icon only, cycles through modes on click) */}
          <button 
            type="button"
            onClick={handleToggleMenu}
            className="w-9 h-9 rounded-xl border theme-border theme-bg-sub hover:theme-bg-elevated theme-text-primary text-lg font-bold transition flex items-center justify-center cursor-pointer shadow-sm hover:border-[var(--accent-main)]/50 active:scale-95"
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

          {/* Right Top Premium User Profile Button */}
          {user ? (
            <button 
              type="button"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2.5 theme-bg-sub hover:theme-bg-elevated border theme-border hover:border-[var(--accent-main)]/50 px-2.5 py-1.5 rounded-xl transition-all text-left cursor-pointer shadow-sm active:scale-95 group"
              title="View User Profile"
            >
              <div className="relative">
                <div className="w-7 h-7 rounded-lg theme-bg-accent theme-accent-text text-xs font-bold flex items-center justify-center shadow-sm group-hover:opacity-90">
                  {avatarChar}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-[var(--bg-surface)]" />
              </div>
              <span className="text-xs font-semibold theme-text-primary hidden md:inline truncate max-w-28">
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
          sidebarMode={sidebarMode}
          setSidebarMode={setSidebarMode}
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