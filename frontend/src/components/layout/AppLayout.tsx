import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, Outlet } from "react-router-dom";
import { calendarSettings, sidebarSettings } from "../../utils/localStore";
import Sidebar from "./SidebarContainer";
import SidebarScreenBlockView from "./SidebarScreenBlockView";
import RightSidebarPanel from "../ui/RightSidebarPanel";
import PanelResizer from "../ui/PanelResizer";
import InstitutionSwitchModal from "./InstitutionSwitchModal";
import { useRightSidebar, useDrawerRegistration } from "../../context/RightSidebarContext";
import { useTenant } from "../../context/TenantContext";
import NotificationCenterDrawer from "./NotificationCenterDrawer";
import { useAcademicSession } from "../../context/AcademicSessionContext";
import { useToast } from "../../context/ToastContext";
import { useTheme } from "../../context/useTheme";
import { FloatingUndoRedoDock } from "../common";
import { setLastActiveRoute } from "../../utils/navigationHistory";
import AppHeader from "./AppHeader";
import { ROUTE_TITLE_MAP, resolveRouteMeta, type RouteMeta } from "./routeMeta";
import {
  useAppKeyboardShortcuts,
  useMobileEdgeSwipe,
  useDrawerResizing,
  useAppSyncAndAuth,
} from "./hooks";
import {
  useVersionControl,
  ReleaseNotesDrawer,
  ForceUpdateModal,
} from "../../modules/version-control";

// Re-export ROUTE_TITLE_MAP and RouteMeta for complete backward compatibility
export { ROUTE_TITLE_MAP, resolveRouteMeta, type RouteMeta };

/**
 * SPR Note — Enterprise Main Application Layout (TypeScript)
 * Decomposed architecture orchestrating top navigation, dynamic collapsible sidebar,
 * centered screen view blocks, resizable dockable action panels, and mobile drawers.
 */
export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const themeContext = useTheme();
  const { showToast } = useToast();
  const { currentInstitution, activeTenantId } = useTenant();
  const { activeBranch, activeYear } = useAcademicSession();

  const {
    isRightSidebarOpen,
    rightSidebarConfig,
    closeRightSidebar,
    closeDrawer,
    openDrawer,
    drawerWidth,
    setDrawerWidth,
  } = useRightSidebar();

  // Version Control Handshake & State
  const {
    hasUpdate,
    isForceUpdate,
    latestRelease,
    currentVersion,
    loading: checkingVersion,
    triggerWebReload,
  } = useVersionControl({ autoCheck: true });

  // Global Drawer Registration: Release Notes
  useDrawerRegistration('release_notes', () => {
    return {
      title: 'Release Notes',
      category: 'System Release',
      size: 'md',
      content: (
        <ReleaseNotesDrawer
          release={latestRelease}
          currentVersion={currentVersion}
          onClose={closeDrawer || closeRightSidebar}
          onReloadAndUpdate={triggerWebReload}
        />
      ),
    };
  });

  // Global Drawer Registration: Notification Center (Master List)
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

  // Sidebar Open State & Display Mode
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
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

  const [sidebarMode, setSidebarMode] = useState<string>(() => {
    try {
      return sidebarSettings.getMode() || "inline";
    } catch {
      return "inline";
    }
  });

  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Layout Resizing Hook (Drawer & Right Panel)
  const {
    isDrawerResizing,
    isResizing,
    drawerContainerRef,
    startDrawerResizing,
    handleDrawerResizerDoubleClick,
  } = useDrawerResizing({
    drawerWidth: drawerWidth || 580,
    setDrawerWidth,
    rightSidebarConfig,
  });

  // Mobile View Detection & Viewport Synchronization
  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== "undefined" && window.innerWidth < 768
  );
  const wasMobileRef = useRef<boolean>(
    typeof window !== "undefined" && window.innerWidth < 768
  );

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      const wasMobile = wasMobileRef.current;
      wasMobileRef.current = mobile;
      setIsMobile(mobile);

      if (mobile) {
        setIsSidebarOpen(false);
        setSidebarMode("overlay");
      } else if (wasMobile && !mobile) {
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

  // Background Sync, Activity Tracker & Auth Lifecycle Hook
  const { user, avatarChar } = useAppSyncAndAuth({
    activeTenantId,
    showToast,
  });

  // Mobile Touch Edge-Swipe Hook
  useMobileEdgeSwipe({
    isSidebarOpen,
    setIsSidebarOpen,
  });

  // Universal App Keyboard Shortcuts Hook
  useAppKeyboardShortcuts({
    themeContext,
    isSidebarOpen,
    setIsSidebarOpen,
    isProfileOpen,
    setIsProfileOpen,
  });

  // ── Persistent Route Tracking Across App Restarts ───────────────────
  useEffect(() => {
    if (location.pathname) {
      setLastActiveRoute(location.pathname + location.search);
    }
  }, [location.pathname, location.search]);

  // Close right sidebar drawer when navigating away unless requested by the new route
  const prevPathnameRef = useRef(location.pathname);
  useEffect(() => {
    if (prevPathnameRef.current !== location.pathname) {
      prevPathnameRef.current = location.pathname;
      const searchParams = new URLSearchParams(location.search);
      if (!searchParams.get("drawer") && isRightSidebarOpen) {
        closeRightSidebar();
      }
    }
  }, [location.pathname, location.search, isRightSidebarOpen, closeRightSidebar]);

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

  // Programmatic navigation event listener (e.g. from custom buttons)
  useEffect(() => {
    const handleNavDashboard = () => navigate("/dashboard");
    window.addEventListener("spr_navigate_dashboard", handleNavDashboard);
    return () => window.removeEventListener("spr_navigate_dashboard", handleNavDashboard);
  }, [navigate]);

  // Route Meta Resolution
  const currentPath = location.pathname;
  const isDashboardRoute = currentPath === "/dashboard" || currentPath === "/";
  const showRoutePanel = !isDashboardRoute;
  const routeMeta = resolveRouteMeta(currentPath, location.search);

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
      <AppHeader
        onToggleMenu={handleToggleMenu}
        user={user}
        avatarChar={avatarChar}
        currentInstitution={currentInstitution}
        activeBranch={activeBranch}
        activeYear={activeYear}
        versionControl={{
          currentVersion,
          hasUpdate,
          isChecking: checkingVersion,
          onClick: () => openDrawer('release_notes'),
        }}
      />

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
            /* Mobile Slide-Over Overlay (< 768px): 100% full-width slide-over drawer */
            <div className="fixed inset-0 z-[999] overflow-hidden flex justify-end">
              {/* Backdrop */}
              <div 
                className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xs transition-opacity duration-300 animate-fade-in cursor-pointer"
                onClick={() => closeRightSidebar()}
                aria-hidden="true"
              />

              {/* Slide-over Drawer Panel (100% full width on mobile/small screens) */}
              <div 
                className="w-full max-w-full h-full z-10 theme-bg-app shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out animate-slide-in-right relative min-w-0"
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
                    width={undefined}
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

      {/* High-Priority Security Gating Modal for Outdated Client Versions */}
      <ForceUpdateModal
        isOpen={isForceUpdate}
        currentVersion={currentVersion}
        latestRelease={latestRelease}
        onReloadAndUpdate={triggerWebReload}
      />

      {/* Draggable Floating Undo / Redo Action Dock */}
      <FloatingUndoRedoDock />
    </div>
  );
}
