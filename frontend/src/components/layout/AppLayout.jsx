import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation, useNavigate, Outlet } from "react-router-dom";
import { calendarSettings, sidebarSettings, auth as authStore, getBranchDisplayName } from "../../utils/localStore";
import Sidebar from "./SidebarContainer";
import SaveStatusBadge from "../common/SaveStatusBadge";
import SidebarScreenBlockView from "./SidebarScreenBlockView";
import RightSidebarPanel from "../ui/RightSidebarPanel";
import PanelResizer from "../ui/PanelResizer";
import InstitutionSwitchModal from "./InstitutionSwitchModal";
import { useRightSidebar, useDrawerRegistration, saveDrawerWidthToStorage } from "../../context/RightSidebarContext";
import { useTenant } from "../../context/TenantContext";
import { initActivityTracker } from "../../utils/activityTracker";
import { triggerCloudSync, syncTenantTaxonomies } from "../../utils/syncEngine";
import { fetchWithAuth } from "../../utils/authService";
import NotificationBellDropdown from "./NotificationBellDropdown";
import NotificationCenterDrawer from "./NotificationCenterDrawer";
import NotificationDetailDrawer from "./NotificationDetailDrawer";
import { LanguageSelector } from "../../i18n";
import { useAcademicSession } from "../../context/AcademicSessionContext";
import { useToast } from "../../context/ToastContext";
import { useTheme } from "../../context/useTheme";
import { SunIcon, MoonIcon, MenuIcon } from "../ui/Icons";
import IconButton from "../ui/IconButton";
import { FloatingUndoRedoDock } from "../common";
import { setLastActiveRoute } from "../../utils/navigationHistory";

// Route details mapping for titles and path lookup
export const ROUTE_TITLE_MAP = {
  "/": { title: "Dashboard", category: "Navigation", isDashboard: true },
  "/dashboard": { title: "Dashboard", category: "Navigation", isDashboard: true },
  "/studies": { title: "Lesson Management", category: "Academic Activities" },
  "/studies/daily-classroom": { title: "Lesson Management", category: "Academic Activities" },
  "/studies/lesson-management": { title: "Lesson Management", category: "Academic Activities" },
  "/studies/progress-management": { title: "Progress Management", category: "Academic Activities" },
  "/studies/daily-progress": { title: "Daily Progress", category: "Academic Activities" },
  "/studies/progress-reports": { title: "Progress Reports", category: "Academic Activities" },
  "/studies/progress-assessments": { title: "Progress Reports", category: "Academic Activities" },
  "/studies/progress-analytics": { title: "Progress Analytics", category: "Academic Activities" },
  "/progress-analytics": { title: "Progress Analytics", category: "Academic Activities" },
  "/studies/lesson-assessments": { title: "Lesson Assessments", category: "Academic Activities" },
  "/studies/daily-lessons": { title: "Daily Lessons", category: "Academic Activities" },
  "/studies/lesson-analytics": { title: "Lesson Analytics", category: "Academic Activities" },
  "/lesson-analytics": { title: "Lesson Analytics", category: "Academic Activities" },
  "/studies/recitations": { title: "Lesson Assessments", category: "Academic Activities" },
  "/studies/homework": { title: "Daily Homework", category: "Academic Activities" },
  "/progress-management": { title: "Progress Management", category: "Academic Activities" },
  "/daily-progress": { title: "Daily Progress", category: "Academic Activities" },
  "/progress-reports": { title: "Progress Reports", category: "Academic Activities" },
  "/daily-lessons": { title: "Daily Lessons", category: "Academic Activities" },
  "/recitations": { title: "Daily Assessment", category: "Academic Activities" },
  "/homework-tasks": { title: "Daily Homework", category: "Academic Activities" },
  "/classroom-config": { title: "Classroom Configuration", category: "Admin Tools" },
  "/classroom-settings": { title: "Classroom Configuration", category: "Admin Tools" },
  "/copy-report": { title: "Classroom Configuration", category: "Admin Tools" },
  "/report-settings": { title: "Classroom Configuration", category: "Admin Tools" },
  "/sessions-comments": { title: "Classroom Sessions", category: "Admin Tools" },
  "/report-sessions": { title: "Classroom Sessions", category: "Admin Tools" },

  "/attendance/students/adhoc": { title: "Surprise Headcount", category: "Student Management" },
  "/attendance/students/monthly-matrix": { title: "Class Attendance", category: "Academic Activities" },
  "/attendance/students/residential": { title: "Residential Attendance", category: "Student" },
  "/attendance/monthly-register": { title: "Class Attendance", category: "Academic Activities" },

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
  "/print-studio": { title: "Print Studio", category: "Print Studio" },
  "/finance": { title: "Finance & Accounts", category: "Finance" },
  "/finance/overview": { title: "Finance Overview", category: "Finance" },
  "/finance/student-billing": { title: "Student Billing & Fees", category: "Finance" },
  "/finance/staff-payroll": { title: "Staff Payroll", category: "Finance" },
  "/finance/general-ledger": { title: "General Ledger & Vouchers", category: "Finance" },
  "/finance/reports": { title: "Financial Statements", category: "Finance" },
  "/student-billing": { title: "Student Billing & Fees", category: "Finance" },
  "/staff-payroll": { title: "Staff Payroll", category: "Finance" },
  "/general-ledger": { title: "General Ledger & Vouchers", category: "Finance" },
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
  "/academy/residential-quarters": { title: "Residential & Quarters", category: "Academy" },
  "/academy/residential": { title: "Residential & Quarters", category: "Academy" },
  "/academy/dormitory": { title: "Residential & Quarters", category: "Academy" },
  "/residential-quarters": { title: "Residential & Quarters", category: "Academy" },
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
  // Examination & Result Management
  "/examinations": { title: "Examination & Results", category: "Examination & Results" },
  "/examinations/schedules": { title: "Exam Schedules", category: "Examination & Results" },
  "/examinations/routine-matrix": { title: "Subject Routine Matrix", category: "Examination & Results" },
  "/examinations/routine-board": { title: "2D Routine Board", category: "Examination & Results" },
  "/examinations/visual-timetable": { title: "2D Routine Board", category: "Examination & Results" },
  "/examinations/invigilation": { title: "Invigilation Schedule", category: "Examination & Results" },
  "/examinations/invigilation-schedule": { title: "Invigilation Schedule", category: "Examination & Results" },
  "/examinations/mark-entry": { title: "Mark Entry Desk", category: "Examination & Results" },
  "/examinations/tabulation": { title: "Tabulation Ledger", category: "Examination & Results" },
  "/examinations/transcripts": { title: "Marksheet Studio", category: "Examination & Results" },
  "/examinations/hall-logistics": { title: "Admit Cards & Hall Planning", category: "Examination & Results" },
  "/examinations/admit-cards": { title: "Admit Card Generator", category: "Examination & Results" },
  "/examinations/seat-plan": { title: "Seat Plan & Desk Slips", category: "Examination & Results" },
  "/examinations/desk-slips": { title: "Seat Plan & Desk Slips", category: "Examination & Results" },
  "/examinations/hall-attendance": { title: "Hall Attendance Sheets", category: "Examination & Results" },
  "/examinations/attendance-sheets": { title: "Hall Attendance Sheets", category: "Examination & Results" },
  "/admit-cards": { title: "Admit Card Generator", category: "Examination & Results" },
  "/seat-plan": { title: "Seat Plan & Desk Slips", category: "Examination & Results" },
  "/desk-slips": { title: "Seat Plan & Desk Slips", category: "Examination & Results" },
  "/hall-attendance": { title: "Hall Attendance Sheets", category: "Examination & Results" },
  "/examinations/grading-rules": { title: "Grading Policies", category: "Examination & Results" },
  "/exams": { title: "Exam Schedules", category: "Examination & Results" },
  "/routine-matrix": { title: "Subject Routine Matrix", category: "Examination & Results" },
  "/routine-board": { title: "2D Routine Board", category: "Examination & Results" },
  "/visual-timetable": { title: "2D Routine Board", category: "Examination & Results" },
  "/invigilation-schedule": { title: "Invigilation Schedule", category: "Examination & Results" },
  "/mark-entry": { title: "Mark Entry Desk", category: "Examination & Results" },
  "/tabulation-sheet": { title: "Tabulation Ledger", category: "Examination & Results" },
  "/transcripts": { title: "Marksheet Studio", category: "Examination & Results" },
  "/grading-rules": { title: "Grading Policies", category: "Examination & Results" },

  "/about": { title: "About", category: "About" },
  "/trash-restoration": { title: "Trash & Restoration", category: "Admin Tools" },
};


export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const themeContext = useTheme();
  const { showToast } = useToast();
  const {
    isRightSidebarOpen,
    rightSidebarConfig,
    closeRightSidebar,
    closeDrawer,
    drawerWidth,
    setDrawerWidth,
  } = useRightSidebar();
  // Global Drawer Registration: Notification Center (Master List & Detail)
  useDrawerRegistration('notifications', (params) => {
    const notifId = params.get('id');
    return {
      title: 'Notifications',
      category: 'System Alerts',
      size: 'md',
      content: (
        <NotificationCenterDrawer
          key={`notifications_center_${notifId || 'list'}`}
          initialNotificationId={notifId}
          onClose={closeDrawer || closeRightSidebar}
        />
      ),
    };
  });

  // Global Drawer Registration: Notification Detail
  useDrawerRegistration('notification_detail', (params) => {
    const notifId = params.get('id');
    return {
      title: 'Notification Detail',
      category: 'Notifications',
      size: 'md',
      content: (
        <NotificationCenterDrawer
          key={`notification_detail_${notifId || 'active'}`}
          initialNotificationId={notifId}
          onClose={closeDrawer || closeRightSidebar}
        />
      ),
    };
  });


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
  const drawerContainerRef = useRef(null);

  const startDrawerResizing = (e) => {
    e.preventDefault();
    setIsDrawerResizing(true);
    if (typeof document !== "undefined") {
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
    }

    let latestWidth = drawerWidth;

    const handleMouseMove = (moveEvent) => {
      const clientX = moveEvent.touches ? moveEvent.touches[0]?.clientX : moveEvent.clientX;
      if (typeof clientX !== "number" || isNaN(clientX)) return;
      const newWidth = window.innerWidth - clientX;
      const minW = 360;
      const maxW = Math.min(1080, Math.floor(window.innerWidth * 0.85));
      const clampedWidth = Math.max(minW, Math.min(maxW, newWidth));
      latestWidth = clampedWidth;

      // Direct hardware-accelerated DOM width update (0ms lag, 0 frame drops, 0 React reconciliation conflicts)
      if (drawerContainerRef.current) {
        drawerContainerRef.current.style.width = `${clampedWidth}px`;
      }
    };

    const handleMouseUp = () => {
      setIsDrawerResizing(false);
      if (typeof document !== "undefined") {
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
      }
      setDrawerWidth(latestWidth);
      const currentKey = rightSidebarConfig?.drawerKey;
      saveDrawerWidthToStorage(currentKey, latestWidth);

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
    const nextWidth = drawerWidth > 700 ? 580 : 760;
    setDrawerWidth(nextWidth);
    if (drawerContainerRef.current) {
      drawerContainerRef.current.style.width = `${nextWidth}px`;
    }
    const currentKey = rightSidebarConfig?.drawerKey;
    saveDrawerWidthToStorage(currentKey, nextWidth);
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
  const { activeBranch, activeYear } = useAcademicSession();

  // ── Persistent Route Tracking Across App Restarts ───────────────────
  useEffect(() => {
    if (location.pathname) {
      setLastActiveRoute(location.pathname + location.search);
    }
  }, [location.pathname, location.search]);

  // Close right sidebar drawer when navigating to a different page route
  const prevPathnameRef = useRef(location.pathname);
  useEffect(() => {
    if (prevPathnameRef.current !== location.pathname) {
      prevPathnameRef.current = location.pathname;
      if (isRightSidebarOpen) {
        closeRightSidebar();
      }
    }
  }, [location.pathname, isRightSidebarOpen, closeRightSidebar]);

  // 📱 Mobile Touch Edge-Swipe gesture to open sidebar (and swipe left to close)
  useEffect(() => {
    let touchStartX = 0;
    let touchStartY = 0;
    let isIgnoredTarget = false;

    const handleTouchStart = (e) => {
      if (e.touches && e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;

        // Ignore swipe if the touch started on a horizontally scrollable container, interactive input, table, calendar or button
        const target = e.target;
        if (target && target.closest) {
          isIgnoredTarget = Boolean(
            target.closest(
              '.overflow-x-auto, .no-scrollbar, .scrollbar-none, [data-no-swipe], input, select, textarea, button, table, [role="tablist"], [role="slider"]'
            )
          );
        } else {
          isIgnoredTarget = false;
        }
      }
    };

    const handleTouchEnd = (e) => {
      if (!e.changedTouches || e.changedTouches.length !== 1) return;
      if (isIgnoredTarget) return;

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;

      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;

      // Must be a predominantly horizontal swipe
      if (Math.abs(deltaX) > 70 && Math.abs(deltaY) < 50) {
        // Open ONLY if swiped from the very left edge (within 24px of the screen edge)
        if (deltaX > 0 && !isSidebarOpen && touchStartX <= 24) {
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
    const handleNavDashboard = () => navigate("/dashboard");
    window.addEventListener("spr_navigate_dashboard", handleNavDashboard);
    return () => window.removeEventListener("spr_navigate_dashboard", handleNavDashboard);
  }, [navigate]);

  // Automatic Offline-to-Online Sync & Cloud Taxonomy Sync triggers
  useEffect(() => {
    triggerCloudSync();
    syncTenantTaxonomies(activeTenantId);

    const handleOnline = () => {
      triggerCloudSync();
      syncTenantTaxonomies(activeTenantId);
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

  // Auto-close right sidebar drawer on route navigation if new URL does not specify a drawer
  const prevPathRef = useRef(location.pathname);
  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname;
      const searchParams = new URLSearchParams(location.search);
      if (!searchParams.get("drawer")) {
        closeRightSidebar();
      }
    }
  }, [location.pathname, location.search, closeRightSidebar]);

  const lastBackTimeRef = useRef(0);

  // Keyboard shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      const key = (e.key || "").toLowerCase();

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
        else if (key === "r") { e.preventDefault(); navigate("/studies/progress-reports"); }
      }

      if (e.key === "Escape") {
        if (isProfileOpen) {
          setIsProfileOpen(false);
        } else if (isSidebarOpen) {
          setIsSidebarOpen(false);
        } else if (location.pathname !== "/" && location.pathname !== "/dashboard") {
          navigate("/dashboard");
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
  const isDashboardRoute = currentPath === "/dashboard" || currentPath === "/";
  const showRoutePanel = !isDashboardRoute;
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
      <header className="theme-bg-surface border-b theme-border px-4 py-2.5 flex justify-between items-center z-30 shadow-md shrink-0 relative">
        <div className="flex items-center gap-3 z-10 shrink-0">
          <IconButton
            icon={MenuIcon}
            size="md"
            variant="ghost"
            onClick={handleToggleMenu}
            title="Toggle Navigation Menu (Ctrl+M)"
            ariaLabel="Toggle Navigation Menu"
          />
          
          <button 
            type="button"
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 cursor-pointer text-left group"
            title="SPR Note"
          >
            <span className="font-bold theme-text-primary text-lg tracking-wide group-hover:theme-accent transition-colors">SPR Note</span>
          </button>
        </div>

        {/* Selected Active Institution, Branch & Academic Year in Header Middle - Absolutely Centered to prevent shifting (Hidden on small screens) */}
        {currentInstitution?.name && (
          <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 justify-center items-center px-4 max-w-[calc(100%-420px)] pointer-events-none text-center">
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap min-w-0 max-w-full">
              <span className="text-sm sm:text-base md:text-lg font-bold theme-text-primary truncate tracking-tight">
                {currentInstitution.name}
              </span>
              {(() => {
                const branchName = getBranchDisplayName(activeBranch);
                const instName = currentInstitution?.name || "";
                if (branchName && instName && String(branchName).toLowerCase() !== String(instName).toLowerCase()) {
                  return (
                    <>
                      <span className="text-xs theme-text-secondary opacity-40 font-bold select-none">•</span>
                      <span className="text-xs sm:text-sm font-medium theme-text-secondary truncate max-w-[140px] sm:max-w-[240px]">
                        {branchName}
                      </span>
                    </>
                  );
                }
                return null;
              })()}
              {activeYear?.name && (
                <>
                  <span className="text-xs theme-text-secondary opacity-40 font-bold select-none">•</span>
                  <span className="text-xs sm:text-sm font-semibold font-mono theme-accent truncate">
                    {activeYear.name}
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 z-10 shrink-0 ml-auto">
          <SaveStatusBadge />

          {/* Dark / Light Mode Toggle Button */}
          <IconButton
            icon={themeContext.modeId === "dark" ? SunIcon : MoonIcon}
            size="sm"
            variant="ghost"
            onClick={() => {
              const nextMode = themeContext.modeId === "dark" ? "light" : "dark";
              themeContext.setModeId(nextMode);
            }}
            title={themeContext.modeId === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className="theme-accent"
          />

          {/* Multi-Language & RTL Switcher */}
          <LanguageSelector />

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

        {/* Center / Dashboard Main Content Area */}
        {isDashboardRoute && (
          <main className="flex-1 h-full overflow-y-auto transition-all duration-300 min-w-0">
            <Outlet context={{ timeZone, setTimeZone, dateFormat, setDateFormat }} />
          </main>
        )}

        {/* Route Content Panel */}
        {showRoutePanel && (
          <div className="flex-1 h-full overflow-hidden relative min-w-0">
            <div className="w-full h-full flex-1 overflow-hidden min-w-0">
              <SidebarScreenBlockView
                title={routeMeta.title}
                category={routeMeta.category || "Navigation"}
                subCategory={routeMeta.subCategory}
                onClose={() => {
                  closeRightSidebar();
                  navigate("/dashboard");
                }}
                dockPosition="left"
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
                    key={rightSidebarConfig?._renderKey || rightSidebarConfig?.drawerKey || 'panel-mobile'}
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
              ref={drawerContainerRef}
              className="h-full shrink-0 z-30 shadow-2xl relative border-l theme-border flex theme-bg-app min-w-0"
              style={{
                width: isDrawerResizing ? undefined : `${drawerWidth || 580}px`,
                maxWidth: 'min(1080px, 85vw)',
                minWidth: '360px',
                transition: isDrawerResizing ? "none" : "width 0.15s ease-out"
              }}
            >
              <PanelResizer
                onStartResize={startDrawerResizing}
                onResetResize={handleDrawerResizerDoubleClick}
                isResizing={isDrawerResizing}
                position="left"
              />
              <div className="w-full h-full flex-1 overflow-hidden">
                <RightSidebarPanel
                  key={rightSidebarConfig?.drawerKey || 'panel-desktop'}
                  title={rightSidebarConfig?.title || "Action Panel"}
                  subtitle={rightSidebarConfig?.subtitle}
                  category={rightSidebarConfig?.category || "Action Panel"}
                  size={rightSidebarConfig?.size || "md"}
                  width={drawerWidth}
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

      {/* Active Global Drag Overlay to ensure uninterrupted smooth resizing */}
      {(isDrawerResizing || isResizing) && (
        <div 
          className="fixed inset-0 z-[99999] select-none bg-transparent cursor-col-resize pointer-events-auto"
          style={{ cursor: 'col-resize' }}
        />
      )}

      {/* Global Institution Workspace Switch Alert Modal */}
      <InstitutionSwitchModal />

      {/* Draggable Floating Undo / Redo Action Dock */}
      <FloatingUndoRedoDock />
    </div>
  );
}


