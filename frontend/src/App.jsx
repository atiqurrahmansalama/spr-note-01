import { useState } from "react";
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
import { GroupsIcon } from "./components/ui/Icons";

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Dashboard");

  const [timeZone, setTimeZone] = useState("Asia/Dhaka");
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try { return JSON.parse(savedUser); } catch { return null; }
    }
    return null;
  });

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setUser(null);
    setIsProfileOpen(false);
    window.location.reload();
  };

  const avatarChar = user 
    ? (user.first_name ? user.first_name.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase())
    : "S";

  const renderMainContent = () => {
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
            <div className="theme-bg-surface border theme-border rounded-2xl p-8 max-w-lg text-center space-y-3 shadow-2xl my-auto">
              <div className="w-12 h-12 theme-bg-sub border theme-border rounded-2xl mx-auto flex items-center justify-center theme-accent">
                <GroupsIcon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold theme-text-primary">Groups & Students Directory</h3>
              <p className="text-xs theme-text-secondary leading-relaxed">
                Student profiles and groups are dynamically synced with the database and report forms.
              </p>
            </div>
          </SidebarScreenBlockView>
        );
      case "Dashboard":
      default:
        return (
          <main className="flex-1 h-full overflow-y-auto p-4 sm:p-6 transition-all duration-300 flex justify-center items-start">
            <HifzReportForm timeZone={timeZone} dateFormat={dateFormat} />
          </main>
        );
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

        {/* Right Top Action Button */}
        <div>
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
          {renderMainContent()}
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