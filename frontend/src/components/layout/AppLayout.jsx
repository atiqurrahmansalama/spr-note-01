import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, Outlet } from "react-router-dom";
import { calendarSettings, sidebarSettings, auth as authStore } from "../../utils/localStore";
import Sidebar from "../../modules/sidebar/SidebarContainer";
import HifzReportForm from "../../modules/report-builder/HifzReportBuilderModule";
import SaveStatusBadge from "../common/SaveStatusBadge";
import SidebarScreenBlockView from "../../modules/sidebar/SidebarScreenBlockView";
import { useTheme } from "../../context/useTheme";
import { useToast } from "../../context/ToastContext";
import { initActivityTracker } from "../../utils/activityTracker";

// Route details mapping for titles and path lookup
export const ROUTE_TITLE_MAP = {
  "/": { title: "Dashboard", isDashboard: true },
  "/dashboard": { title: "Dashboard", isDashboard: true },
  "/student-reports": { title: "Student Progress & Daily Reports" },
  "/groups-students": { title: "Groups & Students Directory" },
  "/student-roster": { title: "Student Roster" },
  "/group-roster": { title: "Group Roster" },
  "/admission": { title: "Student Admission & Profile Registration" },
  "/sessions-comments": { title: "Sessions & Saved Comments" },
  "/user-management": { title: "User Management" },
  "/role-management": { title: "Role Management & Hierarchy Permissions" },
  "/activity-analytics": { title: "Teacher Activity & Session Analytics" },
  "/trash-restoration": { title: "Trash & Soft-Deleted Reports" },
  "/profile-settings": { title: "User Profile Settings" },
  "/security-sessions": { title: "Security & Active Sessions" },
  "/appearance": { title: "Appearance & Typography" },
  "/date-time": { title: "Date & Time Settings" },
  "/copy-report": { title: "Copy Report Settings" },
  "/language": { title: "Language Settings" },
  "/data-backup": { title: "Data & Backup" },
  "/shortcuts": { title: "Keyboard Shortcuts" },
  "/guide": { title: "User Guide & Documentation" },
  "/about": { title: "About Application" },
  "/section-control": { title: "Super Admin Section Control Panel" },
};

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const themeContext = useTheme();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarMode, setSidebarMode] = useState(() => {
    const mode = sidebarSettings.getMode();
    return mode === "inline" ? "overlay" : mode;
  });
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Panel Dock Position (left = center main area; right = right sidebar)
  const [panelDockPosition, setPanelDockPosition] = useState(() => {
    try {
      return localStorage.getItem("spr_panel_dock_position") || "left";
    } catch {
      return "left";
    }
  });

  // Right sidebar panel resizable width state (Default: 288px)
  const [rightPanelWidth, setRightPanelWidth] = useState(() => {
    try {
      const saved = localStorage.getItem("spr_right_panel_width");
      return saved ? parseInt(saved, 10) : 288;
    } catch {
      return 288;
    }
  });
  const [isResizing, setIsResizing] = useState(false);

  const togglePanelDock = () => {
    const nextPos = panelDockPosition === "left" ? "right" : "left";
    setPanelDockPosition(nextPos);
    try {
      localStorage.setItem("spr_panel_dock_position", nextPos);
    } catch {
      // ignore
    }
  };

  const startResizing = (e) => {
    e.preventDefault();
    setIsResizing(true);

    const handleMouseMove = (moveEvent) => {
      const clientX = moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const newWidth = window.innerWidth - clientX;
      const minW = 240;
      const maxW = Math.min(720, Math.floor(window.innerWidth * 0.75));
      const clampedWidth = Math.max(minW, Math.min(maxW, newWidth));
      setRightPanelWidth(clampedWidth);
      try {
        localStorage.setItem("spr_right_panel_width", String(clampedWidth));
      } catch {
        // ignore
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleMouseMove);
      window.removeEventListener("touchend", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleMouseMove);
    window.addEventListener("touchend", handleMouseUp);
  };

  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth < 768);

  // Ensure mobile view always defaults to hidden overlay mode & disables right sidebar docking
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false);
        setSidebarMode("overlay");
      }
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const isRightDock = panelDockPosition === "right" && !isMobile;

  // 📱 Mobile Touch Swipe Right gesture to open sidebar (and swipe left to close)
  useEffect(() => {
    let touchStartX = 0;
    let touchStartY = 0;

    const handleTouchStart = (e) => {
      if (e.touches && e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    };

    const handleTouchEnd = (e) => {
      if (!e.changedTouches || e.changedTouches.length !== 1) return;
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;

      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;

      if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 60) {
        if (deltaX > 0 && (touchStartX < 60 || !isSidebarOpen)) {
          setIsSidebarOpen(true);
        } else if (deltaX < 0 && isSidebarOpen) {
          setIsSidebarOpen(false);
        }
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isSidebarOpen]);

  // Programmatic navigation event listener (e.g. from Edit button)
  useEffect(() => {
    const handleNavDashboard = () => navigate("/");
    window.addEventListener("spr_navigate_dashboard", handleNavDashboard);
    return () => window.removeEventListener("spr_navigate_dashboard", handleNavDashboard);
  }, [navigate]);

  // Automatic Offline-to-Online Sync triggers
  useEffect(() => {
    import("../../utils/syncEngine").then(({ triggerCloudSync }) => {
      triggerCloudSync();
    });

    const handleOnline = () => {
      import("../../utils/syncEngine").then(({ triggerCloudSync }) => {
        triggerCloudSync();
      });
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  // Calendar settings synchronization
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

  // Keyboard shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if ((e.altKey || (isCmdOrCtrl && e.shiftKey)) && key === "l") {
        e.preventDefault();
        if (themeContext?.setModeId) {
          themeContext.setModeId((prev) => (prev === "dark" ? "light" : "dark"));
        }
        return;
      }

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

      if (isCmdOrCtrl && !e.shiftKey && key === "s") {
        e.preventDefault();
        const makeReportBtn = document.querySelector('button[data-shortcut="make-report"]');
        if (makeReportBtn) {
          makeReportBtn.click();
        } else {
          navigate("/");
        }
        return;
      }

      if (isCmdOrCtrl && !e.shiftKey && key === "m") {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
        return;
      }

      if (isCmdOrCtrl && !e.shiftKey && key === "k") {
        e.preventDefault();
        const input = document.querySelector('input[type="text"], input[placeholder*="Search"], input[placeholder*="student"]');
        if (input) input.focus();
        return;
      }

      if (isCmdOrCtrl && e.shiftKey) {
        if (key === "d") { e.preventDefault(); navigate("/"); }
        else if (key === "a") { e.preventDefault(); navigate("/appearance"); }
        else if (key === "g") { e.preventDefault(); navigate("/groups-students"); }
        else if (key === "s") { e.preventDefault(); navigate("/sessions-comments"); }
        else if (key === "b") { e.preventDefault(); navigate("/data-backup"); }
        else if (key === "k") { e.preventDefault(); navigate("/shortcuts"); }
        else if (key === "r") { e.preventDefault(); navigate("/student-reports"); }
      }

      if (e.key === "Escape") {
        if (isProfileOpen) {
          setIsProfileOpen(false);
        } else if (isSidebarOpen) {
          setIsSidebarOpen(false);
        } else if (location.pathname !== "/" && location.pathname !== "/dashboard") {
          navigate("/");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [location.pathname, isSidebarOpen, isProfileOpen, themeContext, navigate]);

  const [user, setUser] = useState(() => authStore.getUser());

  useEffect(() => {
    initActivityTracker();
    const handleAuthUpdate = () => setUser(authStore.getUser());
    window.addEventListener("storage", handleAuthUpdate);
    window.addEventListener("spr_auth_updated", handleAuthUpdate);
    return () => {
      window.removeEventListener("storage", handleAuthUpdate);
      window.removeEventListener("spr_auth_updated", handleAuthUpdate);
    };
  }, []);

  const avatarChar = user 
    ? (user.first_name ? user.first_name.charAt(0).toUpperCase() : user.username ? user.username.charAt(0).toUpperCase() : "U")
    : "S";


  const currentPath = location.pathname;
  const isDashboardRoute = currentPath === "/" || currentPath === "/dashboard";
  const routeMeta = ROUTE_TITLE_MAP[currentPath] || { title: "Navigation View" };

  const handleToggleMenu = () => {
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

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden theme-bg-app theme-text-primary">
      {/* Global Top Navigation Bar */}
      <header className="theme-bg-surface border-b theme-border px-4 py-2.5 flex justify-between items-center z-30 shadow-md shrink-0 select-none">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={handleToggleMenu}
            className="p-1.5 theme-text-primary hover:theme-accent text-xl font-bold transition-colors bg-transparent border-0 flex items-center justify-center cursor-pointer active:scale-95"
            title="Toggle Navigation Menu"
          >
            <span>☰</span>
          </button>
          
          <button 
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-2 cursor-pointer text-left group"
          >
            <span className="font-bold theme-text-primary text-lg tracking-wide group-hover:theme-accent transition-colors">SPR Note</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <SaveStatusBadge />

          <button 
            type="button"
            onClick={() => navigate("/profile-settings")}
            className="p-0 bg-transparent border-0 cursor-pointer active:scale-95 group focus:outline-none flex items-center justify-center"
            title="Open User Profile Settings"
          >
            <div className="relative">
              <div className="w-8 h-8 rounded-full theme-bg-accent theme-accent-text text-xs font-bold flex items-center justify-center shadow-sm group-hover:opacity-90 transition-opacity overflow-hidden">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  avatarChar
                )}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[var(--bg-surface)]" />
            </div>
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <div className="flex flex-1 h-full overflow-hidden relative">
        {/* Left Sidebar Navigation */}
        <Sidebar 
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          activePath={currentPath}
          sidebarMode={sidebarMode}
          setSidebarMode={setSidebarMode}
          isProfileOpen={isProfileOpen}
          setIsProfileOpen={setIsProfileOpen}
        />

        {/* Center / Dashboard Main Form Area */}
        {(isDashboardRoute || isRightDock) && (
          <main className="flex-1 h-full overflow-y-auto p-4 sm:p-6 transition-all duration-300 flex justify-center items-start">
            <div className="w-full max-w-xl mx-auto">
              <HifzReportForm timeZone={timeZone} dateFormat={dateFormat} />
            </div>
          </main>
        )}

        {/* Route Content Panel */}
        {!isDashboardRoute && (
          <div 
            className={
              isRightDock
                ? "h-full shrink-0 z-20 shadow-2xl relative border-l theme-border flex select-none max-w-full theme-bg-app"
                : "flex-1 h-full overflow-hidden relative"

            }
            style={
              isRightDock
                ? { width: `${rightPanelWidth}px`, transition: isResizing ? "none" : "width 0.15s ease-out" }
                : undefined
            }
          >
            {isRightDock && (
              <div
                onMouseDown={startResizing}
                onTouchStart={startResizing}
                className="hidden md:flex absolute top-0 left-0 bottom-0 w-3 -ml-1.5 cursor-col-resize z-10 group items-center justify-center hover:bg-[var(--accent-main)]/20 active:bg-[var(--accent-main)]/40 transition-colors"
                title="Drag left or right to resize sidebar width"
              >
                <div className="w-1 h-12 rounded-full theme-bg-accent opacity-60 group-hover:opacity-100 transition-opacity shadow-sm" />
              </div>
            )}


            <div className="w-full h-full flex-1 overflow-hidden">
              <SidebarScreenBlockView
                title={routeMeta.title}
                onClose={() => navigate("/")}
                dockPosition={isRightDock ? "right" : "left"}
                onToggleDock={!isMobile ? togglePanelDock : undefined}
              >
                <Outlet context={{ timeZone, setTimeZone, dateFormat, setDateFormat }} />
              </SidebarScreenBlockView>
            </div>
          </div>
        )}
      </div>
    </div>
  );

}
