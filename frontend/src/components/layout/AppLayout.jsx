import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, Outlet } from "react-router-dom";
import { calendarSettings, sidebarSettings, auth as authStore } from "../../utils/localStore";
import Sidebar from "./SidebarContainer";
import HifzReportForm from "../../modules/report-builder/HifzReportBuilderModule";
import SaveStatusBadge from "../common/SaveStatusBadge";
import SidebarScreenBlockView from "./SidebarScreenBlockView";
import RightSidebarPanel from "../ui/RightSidebarPanel";
import InstitutionSwitcher from "./InstitutionSwitcher";
import { useTheme } from "../../context/useTheme";
import { useToast } from "../../context/ToastContext";
import { useRightSidebar } from "../../context/RightSidebarContext";
import { useTenant } from "../../context/TenantContext";
import { initActivityTracker } from "../../utils/activityTracker";
import NotificationBellDropdown from "./NotificationBellDropdown";

// Route details mapping for titles and path lookup
export const ROUTE_TITLE_MAP = {
  "/": { title: "Dashboard", category: "Navigation", isDashboard: true },
  "/dashboard": { title: "Dashboard", category: "Navigation", isDashboard: true },
  "/report-builder": { title: "Generate Report", category: "Report Generator" },
  "/student-reports": { title: "Student Reports", category: "Report Generator" },
  "/copy-report": { title: "Report Settings", category: "Report Generator" },
  "/sessions-comments": { title: "Sessions & Comments", category: "Report Generator" },

  "/attendance/students/adhoc": { title: "Surprise Headcount", category: "Student Management" },
  "/attendance/students/monthly-matrix": { title: "Class Attendance", category: "Student" },
  "/attendance/students/residential": { title: "Residential Attendance", category: "Student" },
  "/attendance/monthly-register": { title: "Class Attendance", category: "Student" },

  "/attendance/settings": { title: "Attendance Settings", category: "Settings" },

  "/student-management/departments": { title: "Department", category: "Academy" },
  "/student-management/classes": { title: "Class", category: "Academy" },
  "/student-management/groups": { title: "Group", category: "Academy" },
  "/students": { title: "Student Roster", category: "Student" },
  "/groups-students": { title: "Student Roster", category: "Student" },
  "/student-roster": { title: "Student Roster", category: "Student" },
  "/staff/roster": { title: "Teacher & Staff Roster", category: "Staff Management" },
  "/staff/teacher-attendance": { title: "Teacher Class Attendance", category: "Staff Management" },
  "/staff/attendance": { title: "Staff Daily Attendance", category: "Staff Management" },
  "/staff/daily-attendance": { title: "Staff Daily Attendance", category: "Staff Management" },
  "/staff/onboarding": { title: "Staff Onboarding", category: "Staff Management" },
  "/staff": { title: "Teacher & Staff Roster", category: "Staff Management" },
  "/group-roster": { title: "Group", category: "Academy" },
  "/admission": { title: "Admission", category: "Student" },

  "/app-management/role-invites": { title: "Role QR & Invites", category: "App Management" },
  "/app-management/notifications": { title: "Notification Management", category: "App Management" },
  "/app-management/institutions": { title: "Academies", category: "Academy" },
  "/institutions": { title: "Academies", category: "Academy" },
  "/academy/campus-profile": { title: "Academies & Departments", category: "Academy" },
  "/academy/classes-groups": { title: "Classes & Groups", category: "Academy" },
  "/classes-groups": { title: "Classes & Groups", category: "Academy" },
  "/academy/branches": { title: "Branches", category: "Academy" },
  "/academy-profile": { title: "Profile", category: "Academy" },
  "/settings/institution": { title: "Profile", category: "Academy" },
  "/institution-profile": { title: "Profile", category: "Academy" },
  "/sp-management": { title: "SP Management", category: "Settings" },
  "/user-management": { title: "User Management", category: "App Management" },
  "/role-management": { title: "Role Management", category: "App Management" },
  "/activity-analytics": { title: "Activity Analytics", category: "App Management" },
  "/section-control": { title: "Section Control", category: "App Management" },

  "/profile-settings": { title: "Profile Settings", category: "Settings" },
  "/security-sessions": { title: "Security & Sessions", category: "Settings" },
  "/appearance": { title: "Appearance", category: "Settings" },
  "/date-time": { title: "Date & Time", category: "Settings" },
  "/language": { title: "Language", category: "Settings" },
  "/data-backup": { title: "Data & Backup", category: "Settings" },

  "/shortcuts": { title: "Shortcuts", category: "Shortcuts" },
  "/guide": { title: "App Guide", category: "App Guide" },
  "/about": { title: "About", category: "About" },
  "/trash-restoration": { title: "Trash", category: "Settings" },
};


export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const themeContext = useTheme();
  const {
    isRightSidebarOpen,
    rightSidebarConfig,
    closeRightSidebar,
    drawerWidth,
    setDrawerWidth,
  } = useRightSidebar();

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    try {
      const isMob = typeof window !== "undefined" && window.innerWidth < 768;
      if (isMob) return false;
      const saved = localStorage.getItem("spr_sidebar_is_open");
      if (saved !== null) return saved === "true";
      const mode = sidebarSettings.getMode();
      return mode === "inline" || mode === "collapsed";
    } catch {
      return true;
    }
  });

  const [sidebarMode, setSidebarMode] = useState(() => {
    try {
      return sidebarSettings.getMode() || "inline";
    } catch {
      return "inline";
    }
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

  const [isDrawerResizing, setIsDrawerResizing] = useState(false);

  const startDrawerResizing = (e) => {
    e.preventDefault();
    setIsDrawerResizing(true);
    if (typeof document !== "undefined") {
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
    }

    const handleMouseMove = (moveEvent) => {
      const clientX = moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const newWidth = window.innerWidth - clientX;
      const minW = 380;
      const maxW = Math.min(960, Math.floor(window.innerWidth * 0.75));
      const clampedWidth = Math.max(minW, Math.min(maxW, newWidth));
      setDrawerWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsDrawerResizing(false);
      if (typeof document !== "undefined") {
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
      }
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleMouseMove);
      window.removeEventListener("touchend", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: false });
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleMouseMove, { passive: false });
    window.addEventListener("touchend", handleMouseUp);
  };

  const handleDrawerResizerDoubleClick = () => {
    setDrawerWidth((prev) => (prev > 700 ? 580 : 760));
  };

  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth < 768);
  const wasMobileRef = useRef(typeof window !== "undefined" && window.innerWidth < 768);

  // Ensure mobile view defaults to overlay mode & restores desktop open state when returning to desktop
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      const wasMobile = wasMobileRef.current;
      wasMobileRef.current = mobile;
      setIsMobile(mobile);

      if (mobile) {
        // When shrinking down to mobile: close sidebar into overlay mode without destroying desktop preference
        setIsSidebarOpen(false);
        setSidebarMode("overlay");
      } else if (wasMobile && !mobile) {
        // When enlarging back up to desktop: RESTORE previous desktop preference from localStorage!
        try {
          const savedOpen = localStorage.getItem("spr_sidebar_is_open");
          const shouldBeOpen = savedOpen !== null ? savedOpen === "true" : true;
          setIsSidebarOpen(shouldBeOpen);

          const savedMode = sidebarSettings.getMode() || "inline";
          setSidebarMode(savedMode === "overlay" ? "inline" : savedMode);
        } catch {
          setIsSidebarOpen(true);
          setSidebarMode("inline");
        }
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Auto-Claim pending invite token if present in sessionStorage
  useEffect(() => {
    const claimPendingInvite = async () => {
      const token = sessionStorage.getItem("pending_invite_token");
      if (!token) return;

      try {
        const res = await fetchWithAuth("/api/v1/invites/claim/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (res.ok) {
          const data = await res.json();
          showToast(data.message || "Invitation claimed successfully!", "success");
          sessionStorage.removeItem("pending_invite_token");
          window.dispatchEvent(new Event("spr_auth_updated"));
          window.location.reload();
        } else {
          const errData = await res.json();
          if (errData.role === "SUPER_ADMIN") {
            showToast(errData.message, "info");
          } else {
            showToast(errData.error || "Failed to claim invite.", "error");
          }
          sessionStorage.removeItem("pending_invite_token");
        }
      } catch (err) {
        console.error("Error claiming pending invite:", err);
      }
    };
    claimPendingInvite();
  }, [showToast]);

  const { currentInstitution, activeTenantId } = useTenant();
  const isRightDock = location.pathname === "/report-builder" && panelDockPosition === "right" && !isMobile && !isRightSidebarOpen;

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
    const handleNavDashboard = () => navigate("/report-builder");
    window.addEventListener("spr_navigate_dashboard", handleNavDashboard);
    return () => window.removeEventListener("spr_navigate_dashboard", handleNavDashboard);
  }, [navigate]);

  // Automatic Offline-to-Online Sync & Cloud Taxonomy Sync triggers
  useEffect(() => {
    import("../../utils/syncEngine").then(({ triggerCloudSync, syncTenantTaxonomies }) => {
      triggerCloudSync();
      syncTenantTaxonomies(activeTenantId);
    });

    const handleOnline = () => {
      import("../../utils/syncEngine").then(({ triggerCloudSync, syncTenantTaxonomies }) => {
        triggerCloudSync();
        syncTenantTaxonomies(activeTenantId);
      });
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [activeTenantId]);

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

  // Auto-close right sidebar drawer on route navigation
  const prevPathRef = useRef(location.pathname);
  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname;
      closeRightSidebar();
    }
  }, [location.pathname, closeRightSidebar]);

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
        } else if (location.pathname !== "/" && location.pathname !== "/dashboard" && location.pathname !== "/report-builder") {
          navigate("/report-builder");
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
  const isDashboardRoute = currentPath === "/dashboard";
  const isReportBuilderRoute = currentPath === "/report-builder";
  const isMainFormView = isReportBuilderRoute;
  const showRoutePanel = !isDashboardRoute && !isReportBuilderRoute;
  let routeMeta = ROUTE_TITLE_MAP[currentPath];
  if (currentPath === "/academy/campus-profile") {
    const searchParams = new URLSearchParams(location.search);
    const activeTab = searchParams.get("tab");
    if (activeTab === "branches") {
      routeMeta = { title: "Branches", subCategory: "Academies & Departments", category: "Academy" };
    } else if (activeTab === "departments") {
      routeMeta = { title: "Departments", subCategory: "Academies & Departments", category: "Academy" };
    } else {
      routeMeta = { title: "Academies", subCategory: "Academies & Departments", category: "Academy" };
    }
  } else if (currentPath === "/academy/classes-groups" || currentPath === "/classes-groups") {
    const searchParams = new URLSearchParams(location.search);
    const activeTab = searchParams.get("tab");
    if (activeTab === "groups") {
      routeMeta = { title: "Groups", subCategory: "Classes & Groups", category: "Academy" };
    } else {
      routeMeta = { title: "Classes & Sections", subCategory: "Classes & Groups", category: "Academy" };
    }
  } else if (!routeMeta) {
    if (/^\/students\/[^/]+\/profile/.test(currentPath)) {
      routeMeta = { title: "Student Profile", category: "Student" };
    } else if (/^\/staff\/[^/]+/.test(currentPath)) {
      routeMeta = { title: "Staff Profile", category: "Staff" };
    } else {
      routeMeta = { title: "Navigation View", category: "Navigation" };
    }
  }

  const handleToggleMenu = () => {
    if (isMobile) {
      setIsSidebarOpen((prev) => !prev);
      setSidebarMode("overlay");
    } else {
      if (!isSidebarOpen) {
        setIsSidebarOpen(true);
        setSidebarMode("inline");
        sidebarSettings.saveMode("inline");
        try { localStorage.setItem("spr_sidebar_is_open", "true"); } catch {}
      } else if (sidebarMode === "inline") {
        setSidebarMode("collapsed");
        sidebarSettings.saveMode("collapsed");
        try { localStorage.setItem("spr_sidebar_is_open", "true"); } catch {}
      } else if (sidebarMode === "collapsed") {
        setIsSidebarOpen(false);
        setSidebarMode("overlay");
        sidebarSettings.saveMode("overlay");
        try { localStorage.setItem("spr_sidebar_is_open", "false"); } catch {}
      } else {
        setIsSidebarOpen(true);
        setSidebarMode("inline");
        sidebarSettings.saveMode("inline");
        try { localStorage.setItem("spr_sidebar_is_open", "true"); } catch {}
      }
    }
  };

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
    if (!isMobile) {
      try { localStorage.setItem("spr_sidebar_is_open", "false"); } catch {}
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
            onClick={() => navigate("/report-builder")}
            className="flex items-center gap-2 cursor-pointer text-left group"
            title="Open Report Generator"
          >
            <span className="font-bold theme-text-primary text-lg tracking-wide group-hover:theme-accent transition-colors">SPR Note</span>
          </button>
        </div>

        {/* Selected Active Institution Name in Header Middle (Pure Text, No Background) */}
        {currentInstitution?.name && (
          <div className="flex-1 flex justify-center items-center px-2 sm:px-4 min-w-0 pointer-events-none select-none text-center">
            <span className="text-sm sm:text-base md:text-lg font-bold theme-text-primary truncate tracking-tight">
              {currentInstitution.name}
            </span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <SaveStatusBadge />

          {/* Undo / Redo Buttons (Only visible on report builder route) */}
          {isReportBuilderRoute && (
            <div className="flex items-center gap-1 theme-bg-sub border theme-border rounded-xl p-0.5 shadow-inner">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("spr_undo"))}
                className="p-1.5 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition cursor-pointer flex items-center justify-center bg-transparent border-0 active:scale-95"
                title="Undo (Ctrl+Z)"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("spr_redo"))}
                className="p-1.5 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition cursor-pointer flex items-center justify-center bg-transparent border-0 active:scale-95"
                title="Redo (Ctrl+Y)"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 10h-10a8 8 0 00-8 8v2m18-12l-6 6m6-6l-6-6" />
                </svg>
              </button>
            </div>
          )}

          {/* Dark / Light Mode Toggle Button */}
          <button
            type="button"
            onClick={() => {
              const nextMode = themeContext.modeId === "dark" ? "light" : "dark";
              themeContext.setModeId(nextMode);
            }}
            className="p-2 rounded-xl theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition border-0 bg-transparent flex items-center justify-center cursor-pointer active:scale-95"
            title={themeContext.modeId === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {themeContext.modeId === "dark" ? (
              <svg className="w-4 h-4 theme-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 theme-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* Real-time In-App Notification Bell */}
          <NotificationBellDropdown />

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
      <div className="flex flex-1 h-full overflow-hidden relative min-w-0">
        {/* Left Sidebar Navigation */}
        <Sidebar 
          isOpen={isSidebarOpen}
          onClose={handleCloseSidebar}
          activePath={currentPath}
          sidebarMode={sidebarMode}
          setSidebarMode={setSidebarMode}
          isProfileOpen={isProfileOpen}
          setIsProfileOpen={setIsProfileOpen}
        />

        {/* Center / Dashboard Main Form Area or Coming Soon Dashboard */}
        {isDashboardRoute && (
          <main className="flex-1 h-full overflow-y-auto p-4 sm:p-6 transition-all duration-300 flex justify-center items-center min-w-0">
            <DashboardComingSoon />
          </main>
        )}

        {isMainFormView && (
          <main className="flex-1 h-full overflow-y-auto p-4 sm:p-6 transition-all duration-300 flex justify-center items-start min-w-0">
            <div className="w-full max-w-xl mx-auto min-w-0">
              <HifzReportForm timeZone={timeZone} dateFormat={dateFormat} />
            </div>
          </main>
        )}

        {/* Route Content Panel */}
        {showRoutePanel && (
          <div 
            className={
              isRightDock
                ? "h-full shrink-0 z-20 shadow-2xl relative border-l theme-border flex select-none max-w-full theme-bg-app min-w-0"
                : "flex-1 h-full overflow-hidden relative min-w-0"
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

            <div className="w-full h-full flex-1 overflow-hidden min-w-0">
              <SidebarScreenBlockView
                title={routeMeta.title}
                category={routeMeta.category || "Navigation"}
                subCategory={routeMeta.subCategory}
                onClose={() => {
                  closeRightSidebar();
                  navigate("/report-builder");
                }}
                dockPosition={isRightDock ? "right" : "left"}
                onToggleDock={!isMobile ? togglePanelDock : undefined}
                isDockDisabled={isRightSidebarOpen}
                dockDisabledReason="Right sidebar is currently occupied by active action panel"
              >
                <Outlet context={{ timeZone, setTimeZone, dateFormat, setDateFormat }} />
              </SidebarScreenBlockView>
            </div>
          </div>
        )}

        {/* Secondary Right Sidebar / Slide-Over Panel (Opened by Sub-Views / Forms) */}
        {isRightSidebarOpen && (
          isMobile ? (
            /* Mobile Slide-Over Overlay (< 768px): Slide-over drawer with backdrop blur */
            <div className="fixed inset-0 z-[999] overflow-hidden flex justify-end">
              {/* Backdrop */}
              <div 
                className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xs transition-opacity duration-300 animate-fade-in cursor-pointer"
                onClick={closeRightSidebar}
                aria-hidden="true"
              />

              {/* Slide-over Drawer Panel */}
              <div 
                className="w-full max-w-full sm:max-w-md h-full z-10 theme-bg-app shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out animate-slide-in-right relative min-w-0"
                role="dialog"
                aria-modal="true"
              >
                <div className="w-full h-full flex-1 overflow-hidden min-w-0">
                  <RightSidebarPanel
                    title={rightSidebarConfig?.title || "Action Panel"}
                    subtitle={rightSidebarConfig?.subtitle}
                    category={rightSidebarConfig?.category || "Action Panel"}
                    size={rightSidebarConfig?.size || "md"}
                    width={rightSidebarConfig?.width}
                    onClose={closeRightSidebar}
                    onBack={rightSidebarConfig?.onBack}
                    headerRight={rightSidebarConfig?.headerRight}
                    footer={rightSidebarConfig?.footer}
                    formId={rightSidebarConfig?.formId}
                    onSave={rightSidebarConfig?.onSave}
                    onCancel={rightSidebarConfig?.onCancel}
                    saveLabel={rightSidebarConfig?.saveLabel || "SAVE"}
                    cancelLabel={rightSidebarConfig?.cancelLabel || "Cancel"}
                    isSubmitting={rightSidebarConfig?.isSubmitting}
                    isSaveDisabled={rightSidebarConfig?.isSaveDisabled}
                  >
                    {rightSidebarConfig?.content}
                  </RightSidebarPanel>
                </div>
              </div>
            </div>
          ) : (
            /* Desktop Docked Sidebar (>= 768px) */
            <div 
              className="h-full shrink-0 z-30 shadow-2xl relative border-l theme-border flex select-none theme-bg-app animate-fade-in min-w-0"
              style={{
                width: `${drawerWidth || 580}px`,
                maxWidth: 'min(980px, 85vw)',
                minWidth: '360px',
                transition: isDrawerResizing ? "none" : "width 0.15s ease-out"
              }}
            >
              {/* Resizer Handle for Secondary Drawer */}
              <div
                onMouseDown={startDrawerResizing}
                onTouchStart={startDrawerResizing}
                onDoubleClick={handleDrawerResizerDoubleClick}
                className="hidden md:flex absolute top-0 left-0 bottom-0 w-3 -ml-1.5 cursor-col-resize z-40 group items-center justify-center hover:bg-[var(--accent-main)]/20 active:bg-[var(--accent-main)]/40 transition-colors"
                title="Drag left/right to resize, or double-click to toggle width"
              >
                <div className="w-1.5 h-14 rounded-full theme-bg-accent opacity-60 group-hover:opacity-100 transition-opacity shadow-sm" />
              </div>

              <div className="w-full h-full flex-1 overflow-hidden">
                <RightSidebarPanel
                  title={rightSidebarConfig?.title || "Action Panel"}
                  subtitle={rightSidebarConfig?.subtitle}
                  category={rightSidebarConfig?.category || "Action Panel"}
                  size={rightSidebarConfig?.size || "md"}
                  width={rightSidebarConfig?.width}
                  onClose={closeRightSidebar}
                  onBack={rightSidebarConfig?.onBack}
                  headerRight={rightSidebarConfig?.headerRight}
                  footer={rightSidebarConfig?.footer}
                  formId={rightSidebarConfig?.formId}
                  onSave={rightSidebarConfig?.onSave}
                  onCancel={rightSidebarConfig?.onCancel}
                  saveLabel={rightSidebarConfig?.saveLabel || "SAVE"}
                  cancelLabel={rightSidebarConfig?.cancelLabel || "Cancel"}
                  isSubmitting={rightSidebarConfig?.isSubmitting}
                  isSaveDisabled={rightSidebarConfig?.isSaveDisabled}
                >
                  {rightSidebarConfig?.content}
                </RightSidebarPanel>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function DashboardComingSoon() {
  return (
    <div className="flex flex-col items-center justify-center text-center font-sans space-y-5 select-none p-6 py-12 theme-bg-surface border theme-border rounded-3xl shadow-xl max-w-sm mx-auto animate-fade-in">
      <div className="w-14 h-14 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center border theme-border shrink-0 shadow-md">
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <div className="space-y-2">
        <h2 className="text-base font-bold theme-text-primary">Dashboard Coming Soon</h2>
        <p className="text-xs theme-text-secondary leading-relaxed max-w-xs mx-auto">
          We are currently building advanced analytics, key performance indicators, and data visualizations. Stay tuned!
        </p>
      </div>
      <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider theme-bg-accent-soft theme-accent border theme-border shadow-sm">
        Under Development
      </span>
    </div>
  );
}
