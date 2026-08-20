import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import UserProfileCard from "./UserProfileCard";
import { useFeatureControl } from "../../context/FeatureControlContext";
import { useTenant } from "../../context/TenantContext";
import { 
  DashboardIcon, 
  AppearanceIcon, 
  SettingsIcon, 
  GroupsIcon, 
  SessionsIcon, 
  ShortcutsIcon, 
  AppGuideIcon, 
  AboutIcon,
  ChevronIcon,
  CalendarIcon,
  CopyIcon,
  CloudIcon,
  GlobeIcon,
  SavedMessagesIcon,
  SectionControlIcon,
  DepartmentIcon,
  ClassIcon,
  GroupIcon,
  StudentIcon,
  AdmissionIcon,
  SparklesIcon,
  BuildingOfficeIcon,
  TeacherIcon,
  AttendanceIcon,
  LeaveIcon,
  GateIcon,
  FingerprintIcon,
  MatrixIcon,
  ChecklistIcon,
  TimerIcon,
  BellIcon,
} from "../../components/ui/Icons";

export default function SidebarContainer({ 
  isOpen, 
  onClose, 
  activePath: propActivePath,
  sidebarMode = "inline",
  setSidebarMode,
  isProfileOpen,
  setIsProfileOpen 
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = propActivePath || location.pathname;

  const { isMultiTenantAdmin } = useTenant();
  const [openSubMenus, setOpenSubMenus] = useState({
    "Academy": true,
    "Academic Institution": true,
    "Student": true,
    "Staff Management": false,
    "Settings & Devices": false,
    "Report Generator": false,
    "App Management": false,
    Settings: false,
  });

  const toggleSubMenu = (menuName) => {
    setOpenSubMenus((prev) => ({
      ...prev,
      [menuName]: !prev[menuName],
    }));
  };

  const { isSectionEnabled } = useFeatureControl();

  const menuItems = [
    { id: "Dashboard", name: "Dashboard", path: "/dashboard", Icon: DashboardIcon, key: "nav_dashboard" },
    {
      id: "Academy",
      name: "Academy",
      Icon: BuildingOfficeIcon,
      hasSub: true,
      key: "nav_institution",
      subItems: [
        { id: "Profile", name: "Profile", path: "/academy-profile", Icon: BuildingOfficeIcon, key: "settings_institution" },
        { id: "Academies & Departments", name: "Academies & Departments", path: "/academy/campus-profile", Icon: BuildingOfficeIcon, key: "campus_profile" },
        { id: "Classes & Groups", name: "Classes & Groups", path: "/academy/classes-groups", Icon: ClassIcon, key: "student_classes" },
        { id: "Period Schedules", name: "Period Schedules", path: "/academy/periods", Icon: TimerIcon, key: "class_period_slots" },
      ]
    },
    {
      id: "Student",
      name: "Student",
      Icon: GroupsIcon,
      hasSub: true,
      key: "nav_student_management",
      subItems: [
        { id: "Student Roster", name: "Student Roster", path: "/students", Icon: StudentIcon, key: "student_roster" },
        { id: "Class Attendance", name: "Class Attendance", path: "/attendance/students/monthly-matrix", Icon: MatrixIcon, key: "monthly_attendance_matrix" },
        { id: "Residential Attendance", name: "Residential Attendance", path: "/attendance/students/residential", Icon: TimerIcon, key: "residential_attendance" },
        { id: "Short Admission", name: "Short Admission", path: "/short-admission", Icon: SparklesIcon, key: "student_quick_admission" },
        { id: "Admission", name: "Admission", path: "/admission", Icon: AdmissionIcon, key: "student_admission" },
      ]
    },
    {
      id: "Staff Management",
      name: "Staff Management",
      Icon: TeacherIcon,
      hasSub: true,
      key: "nav_staff_management",
      subItems: [
        { id: "Staff Directory", name: "Staff Directory", path: "/staff", Icon: TeacherIcon, key: "staff_management" },
        { id: "Teacher Period Matrix", name: "Teacher Period Matrix", path: "/attendance/staff/teacher-matrix", Icon: MatrixIcon, key: "teacher_period_matrix" },
        { id: "Staff Daily Timesheet", name: "Staff Daily Timesheet", path: "/attendance/staff/daily-punch", Icon: TimerIcon, key: "staff_daily_attendance" },
        { id: "Leave & Substitution Desk", name: "Leave & Substitution Desk", path: "/attendance/staff/leaves", Icon: LeaveIcon, key: "staff_leaves" },
      ]
    },
    {
      id: "Settings & Devices",
      name: "Settings & Devices",
      Icon: SettingsIcon,
      hasSub: true,
      key: "nav_attendance_management",
      subItems: [
        { id: "Slots & Routine Manager", name: "Slots & Routine Manager", path: "/attendance/settings", Icon: SettingsIcon, key: "attendance_policies_slots" },
        { id: "Biometric Devices", name: "Biometric Devices", path: "/attendance/devices", Icon: FingerprintIcon, key: "biometric_device_manager" },
        { id: "Institutional Calendar", name: "Institutional Calendar", path: "/calendar", Icon: CalendarIcon, key: "institutional_calendar" },
      ]
    },
    {
      id: "Report Generator",
      name: "Report Generator",
      Icon: SavedMessagesIcon,
      hasSub: true,
      key: "nav_report_generator",
      subItems: [
        { id: "Generate Report", name: "Generate Report", path: "/report-builder", Icon: SavedMessagesIcon, key: "report_builder" },
        { id: "Sessions & Comments", name: "Sessions & Comments", path: "/sessions-comments", Icon: SessionsIcon, key: "report_sessions_comments" },
        { id: "Student Reports", name: "Student Reports", path: "/student-reports", Icon: SavedMessagesIcon, key: "report_history" },
        { id: "Report Settings", name: "Report Settings", path: "/copy-report", Icon: CopyIcon, key: "report_copy_settings" },
      ]
    },
    {
      id: "App Management",
      name: "App Management",
      Icon: SettingsIcon,
      hasSub: true,
      key: "nav_app_management",
      subItems: [
        { id: "Section Control", name: "Section Control", path: "/section-control", Icon: SectionControlIcon, key: "app_section_control" },
        { id: "User Management", name: "User Management", path: "/user-management", Icon: SectionControlIcon, key: "app_user_management" },
        { id: "Role Management", name: "Role Management", path: "/role-management", Icon: SectionControlIcon, key: "app_role_management" },
        { id: "Activity Analytics", name: "Activity Analytics", path: "/activity-analytics", Icon: DashboardIcon, key: "app_activity_analytics" },
        { id: "Role QR & Invites", name: "Role QR & Invites", path: "/app-management/role-invites", Icon: SectionControlIcon, key: "app_role_invites" },
        { id: "Notification Management", name: "Notification Management", path: "/app-management/notifications", Icon: BellIcon, key: "notification_management" },
      ]
    },
    { 
      id: "Settings", 
      name: "Settings", 
      Icon: SettingsIcon, 
      hasSub: true, 
      key: "nav_settings",
      subItems: [
        { id: "Profile Settings", name: "Profile Settings", path: "/profile-settings", Icon: SettingsIcon, key: "settings_profile" },
        { id: "Security & Sessions", name: "Security & Sessions", path: "/security-sessions", Icon: SettingsIcon, key: "settings_security" },
        { id: "Date & Time", name: "Date & Time", path: "/date-time", Icon: CalendarIcon, key: "settings_datetime" },
        { id: "Appearance", name: "Appearance", path: "/appearance", Icon: AppearanceIcon, key: "settings_appearance" },
        { id: "Language", name: "Language", path: "/language", Icon: GlobeIcon, key: "settings_language" },
        { id: "Data & Backup", name: "Data & Backup", path: "/data-backup", Icon: CloudIcon, key: "settings_backup" },
        { id: "Trash", name: "Trash", path: "/trash-restoration", Icon: SavedMessagesIcon, key: "nav_trash" },
        { id: "SP Management", name: "SP Management", path: "/sp-management", Icon: SparklesIcon, key: "sp_management", superAdminOnly: true },
      ]
    },
    { id: "Shortcuts", name: "Shortcuts", path: "/shortcuts", Icon: ShortcutsIcon, key: "nav_shortcuts" },
    { id: "App Guide", name: "App Guide", path: "/guide", Icon: AppGuideIcon, key: "nav_app_guide" },
    { id: "About", name: "About", path: "/about", Icon: AboutIcon, key: "nav_about" },
  ];

  const handleNavigate = (path) => {
    if (path) {
      navigate(path);
      if (sidebarMode === "overlay" && isOpen) {
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  const isCollapsed = sidebarMode === "collapsed";
  const isOverlay = sidebarMode === "overlay";
  const isMobileScreen = typeof window !== "undefined" && window.innerWidth < 768;

  const displayMenuItems = menuItems
    .map((item) => {
      if (item.hasSub) {
        const visibleSubItems = item.subItems.filter((sub) => {
          if (sub.superAdminOnly && !isMultiTenantAdmin) return false;
          return isSectionEnabled(sub.key);
        });
        return { ...item, subItems: visibleSubItems };
      }
      return item;
    })
    .filter((item) => {
      if (isMobileScreen && item.id === "Shortcuts") return false;
      
      const isVisible = isSectionEnabled(item.key);
      if (!isVisible) return false;
      
      if (item.hasSub && item.subItems.length === 0) return false;
      
      return true;
    });

  const checkIsActive = (path) => {
    if (!path) return false;
    if (path === "/") {
      return currentPath === "/" || currentPath === "/dashboard";
    }
    return currentPath === path;
  };

  return (
    <>
      {isOverlay && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          ${isOverlay ? "fixed top-0 left-0 z-50 shadow-2xl h-full" : "relative z-20 h-full"}
          ${isCollapsed ? "w-20 sm:w-20" : "w-[280px] sm:w-[280px]"}
          theme-bg-surface theme-text-secondary shrink-0 flex flex-col justify-between transition-all duration-200 ease-out select-none
        `}
      >
        {/* App Name Header at the top of Sidebar when open in Overlay Mode */}
        {isOverlay && (
          <div className="px-4 py-3.5 border-b theme-border flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg theme-bg-accent theme-accent-text flex items-center justify-center font-bold text-xs shadow-sm">
                SPR
              </div>
              <span className="font-bold theme-text-primary text-base tracking-wide">SPR Note</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition-colors cursor-pointer flex items-center justify-center text-sm"
              title="Close Navigation"
            >
              ✕
            </button>
          </div>
        )}

        <nav 
          className={`flex-1 overflow-y-auto ${isCollapsed ? "px-3 py-6 space-y-4" : "px-4 py-6 space-y-2"} text-sm font-medium`}
          style={{ scrollbarGutter: "stable" }}
        >
          {displayMenuItems.map((item) => {
            const isParentActive = checkIsActive(item.path);
            const ItemIcon = item.Icon;
            const isAnySubActive = item.hasSub ? item.subItems.some((sub) => checkIsActive(sub.path)) : false;
            const isSubOpen = openSubMenus[item.id] || isAnySubActive || false;

            if (item.hasSub) {

              return (
                <div key={item.id} className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => toggleSubMenu(item.id)}
                    title={item.name}
                    className={`w-full flex items-center ${isCollapsed ? "justify-center p-3" : "justify-between px-3.5 py-2.5"} rounded-xl transition-all cursor-pointer select-none ${
                      isParentActive || isAnySubActive
                        ? "theme-bg-elevated theme-text-primary font-semibold shadow-sm"
                        : "hover:theme-bg-sub theme-text-secondary hover:theme-text-primary"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <ItemIcon className={`w-4.5 h-4.5 shrink-0 ${isParentActive || isAnySubActive ? "theme-accent" : "opacity-80"}`} />
                      {!isCollapsed && <span className="truncate text-[13px] font-medium tracking-wide leading-normal">{item.name}</span>}
                    </div>

                    {!isCollapsed && (
                      <ChevronIcon 
                        isOpen={isSubOpen} 
                        className="w-3.5 h-3.5 theme-text-secondary shrink-0 opacity-60" 
                      />
                    )}
                  </button>

                  {(isSubOpen || isCollapsed) && (
                    <div className={
                      isCollapsed 
                        ? "space-y-2 pt-1 flex flex-col items-center" 
                        : "pl-5 space-y-1.5 pt-1"
                    }>
                      {item.subItems.map((sub) => {
                        const isSubActive = checkIsActive(sub.path);
                        const SubIcon = sub.Icon;
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => handleNavigate(sub.path)}
                            title={sub.name}
                            className={`w-full flex items-center gap-3.5 relative ${isCollapsed ? "justify-center p-3" : "px-3.5 py-2.5"} rounded-xl transition-all cursor-pointer select-none ${
                              isSubActive
                                ? "theme-bg-elevated theme-text-primary font-semibold shadow-sm"
                                : "hover:theme-bg-sub theme-text-secondary hover:theme-text-primary"
                            }`}
                          >
                            <SubIcon className={`w-4.5 h-4.5 shrink-0 ${isSubActive ? "theme-accent" : "opacity-80"}`} />
                            {!isCollapsed && (
                              <span className="truncate text-[13px] font-medium tracking-wide leading-normal">{sub.name}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const isActive = checkIsActive(item.path);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.path)}
                title={item.name}
                className={`w-full flex items-center ${isCollapsed ? "justify-center p-3" : "px-3.5 py-2.5"} rounded-xl transition-all cursor-pointer select-none ${
                  isActive
                    ? "theme-bg-elevated theme-text-primary font-semibold shadow-sm"
                    : "hover:theme-bg-sub theme-text-secondary hover:theme-text-primary"
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <ItemIcon className={`w-4.5 h-4.5 shrink-0 ${isActive ? "theme-accent" : "opacity-80"}`} />
                  {!isCollapsed && <span className="truncate text-[13px] font-medium tracking-wide leading-normal">{item.name}</span>}
                </div>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Bottom Footer: Official Public Website */}
        <div className="p-3 border-t theme-border shrink-0">
          <button
            type="button"
            onClick={() => {
              if (isOverlay) onClose();
              navigate("/");
            }}
            title="Official Website & Public Portal"
            className={`w-full flex items-center ${
              isCollapsed ? "justify-center p-2.5" : "justify-start px-3.5 py-2.5 gap-3"
            } rounded-xl theme-bg-sub/60 hover:theme-bg-elevated border theme-border theme-text-primary transition-all cursor-pointer shadow-xs group`}
          >
            <div className="w-6 h-6 rounded-lg theme-bg-accent-soft text-[var(--accent-main)] flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
            {!isCollapsed && (
              <div className="flex flex-col text-left min-w-0">
                <span className="text-xs font-bold theme-text-primary leading-tight truncate">Official Website</span>
                <span className="text-[10px] theme-text-secondary leading-tight truncate">Public Portal &amp; Verification</span>
              </div>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}

