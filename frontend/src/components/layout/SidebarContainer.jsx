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
  DutyIcon,
  LeaveIcon,
  GateIcon,
  FingerprintIcon,
  MatrixIcon,
  ChecklistIcon,
  TimerIcon,
  BellIcon,
  HomeIcon,
  BookOpenIcon,
  TargetIcon,
  ClipboardDocumentCheckIcon,
  AcademicCapIcon,
  ChartBarIcon,
  DocumentIcon,
  EditIcon,
} from "../ui/Icons";

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
    "Academic Studies": true,
    "Examination & Results": true,
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
        { id: "Profile", name: "Profile & Branding", path: "/academy-profile", Icon: BuildingOfficeIcon, key: "settings_institution" },
        { id: "Academies & Departments", name: "Campus Structure", path: "/academy/campus-profile", Icon: BuildingOfficeIcon, key: "campus_profile" },
        { id: "Classes & Groups", name: "Classes & Sections", path: "/academy/classes-groups", Icon: ClassIcon, key: "student_classes" },
        { id: "Period Schedules", name: "Routine & Curriculum", path: "/academy/periods", Icon: TimerIcon, key: "class_period_slots" },
        { id: "Calendar & Events", name: "Calendar & Events", path: "/academy/calendar-events", Icon: CalendarIcon, key: "academy_calendar_events" },
        { id: "Residential Quarters", name: "Residential & Quarters", path: "/academy/residential-quarters", Icon: HomeIcon, key: "residential_quarters" },
      ]
    },
    {
      id: "Academic Studies",
      name: "Academic Studies",
      Icon: BookOpenIcon,
      hasSub: true,
      key: "nav_academic_studies",
      subItems: [
        { id: "Daily Classroom", name: "Daily Classroom", path: "/studies/daily-classroom", Icon: BookOpenIcon, key: "daily_classroom" },
      ]
    },
    {
      id: "Examination & Results",
      name: "Examination & Results",
      Icon: AcademicCapIcon,
      hasSub: true,
      key: "nav_examinations",
      subItems: [
        { id: "Exam Schedules", name: "Exam Schedules", path: "/examinations/schedules", Icon: CalendarIcon, key: "exam_schedules" },
        { id: "Mark Entry Desk", name: "Mark Entry Desk", path: "/examinations/mark-entry", Icon: EditIcon, key: "exam_mark_entry" },
        { id: "Tabulation Sheet", name: "Tabulation Ledger", path: "/examinations/tabulation", Icon: ChartBarIcon, key: "exam_tabulation" },
        { id: "Transcript Studio", name: "Marksheet Studio", path: "/examinations/transcripts", Icon: DocumentIcon, key: "exam_transcripts" },
        { id: "Grading Policies", name: "Grading Policies", path: "/examinations/grading-rules", Icon: SettingsIcon, key: "exam_grading_rules" },
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
        { id: "Teacher & Staff Roster", name: "Teacher & Staff Roster", path: "/staff/roster", Icon: TeacherIcon, key: "staff_roster" },
        { id: "Teacher Class Attendance", name: "Teacher Class Attendance", path: "/staff/teacher-attendance", Icon: ClassIcon, key: "staff_roster" },
        { id: "Staff Daily Attendance", name: "Staff Daily Attendance", path: "/staff/attendance", Icon: DutyIcon, key: "staff_roster" },
        { id: "Staff Onboarding", name: "Staff Onboarding", path: "/staff/onboarding", Icon: AdmissionIcon, key: "staff_onboarding" },
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
        { id: "Academic Reports", name: "Multi-Period Reports", path: "/academy/academic-reports", Icon: SavedMessagesIcon, key: "academic_reports" },
        { id: "Student Reports", name: "Student Recitation Log", path: "/student-reports", Icon: SavedMessagesIcon, key: "report_history" },
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
        { id: "Attendance Settings", name: "Attendance Settings", path: "/attendance/settings", Icon: AttendanceIcon, key: "attendance_policies_slots" },
        { id: "Security & Sessions", name: "Security & Sessions", path: "/security-sessions", Icon: SettingsIcon, key: "settings_security" },
        { id: "Personalize", name: "Personalize", path: "/personalize", Icon: AppearanceIcon, key: "settings_personalize" },
        { id: "Data & Backup", name: "Data & Backup", path: "/data-backup", Icon: CloudIcon, key: "settings_backup" },
        { id: "Admin Tools", name: "Admin Tools", path: "/admin-tools", Icon: SparklesIcon, key: "admin_tools", superAdminOnly: true },
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
          ${isCollapsed ? "w-16 sm:w-20" : "w-[280px] sm:w-[275px] max-w-[88vw]"}
          theme-bg-surface theme-text-secondary shrink-0 flex flex-col justify-between transition-all duration-200 ease-out select-none
        `}
      >
        {/* App Name Header at the top of Sidebar when open in Overlay Mode */}
        {isOverlay && (
          <div className="px-4 py-3.5 border-b theme-border flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl theme-bg-accent theme-accent-text flex items-center justify-center font-bold text-xs shadow-sm">
                SPR
              </div>
              <span className="font-bold theme-text-primary text-base tracking-normal">SPR Note</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition-colors cursor-pointer flex items-center justify-center text-sm"
              title="Close Navigation"
            >
              ✕
            </button>
          </div>
        )}

        <nav 
          className={`flex-1 overflow-y-auto ${isCollapsed ? "px-2 py-4 space-y-3" : "px-3 sm:px-3.5 py-3.5 sm:py-4 space-y-1 sm:space-y-1.5"} text-sm font-medium`}
          style={{ scrollbarGutter: "stable" }}
        >
          {displayMenuItems.map((item) => {
            const isParentActive = checkIsActive(item.path);
            const ItemIcon = item.Icon;
            const isAnySubActive = item.hasSub ? item.subItems.some((sub) => checkIsActive(sub.path)) : false;
            const isSubOpen = openSubMenus[item.id] || isAnySubActive || false;

            if (item.hasSub) {
              return (
                <div key={item.id} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleSubMenu(item.id)}
                    title={item.name}
                    className={`w-full flex items-center ${isCollapsed ? "justify-center p-2.5" : "justify-between px-3 sm:px-3.5 py-2.5 sm:py-2.5"} rounded-xl transition-all cursor-pointer select-none ${
                      isParentActive || isAnySubActive
                        ? "theme-bg-elevated theme-text-primary font-semibold shadow-sm"
                        : "hover:theme-bg-sub theme-text-secondary hover:theme-text-primary"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ItemIcon className={`w-[18px] h-[18px] sm:w-[18px] sm:h-[18px] shrink-0 ${isParentActive || isAnySubActive ? "theme-accent" : "opacity-80"}`} />
                      {!isCollapsed && <span className="truncate text-[14px] sm:text-[13.5px] font-medium tracking-normal leading-normal">{item.name}</span>}
                    </div>

                    {!isCollapsed && (
                      <ChevronIcon 
                        isOpen={isSubOpen} 
                        className="w-3.5 h-3.5 theme-text-secondary shrink-0 opacity-60 ml-1" 
                      />
                    )}
                  </button>

                  {(isSubOpen || isCollapsed) && (
                    <div className={
                      isCollapsed 
                        ? "space-y-1.5 pt-1 flex flex-col items-center" 
                        : "ml-3 sm:ml-3.5 pl-1.5 space-y-1 pt-1"
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
                            className={`w-full flex items-center gap-3 relative ${isCollapsed ? "justify-center p-2" : "px-3 sm:px-3 py-2 sm:py-2"} rounded-xl transition-all cursor-pointer select-none ${
                              isSubActive
                                ? "theme-bg-elevated theme-text-primary font-semibold shadow-sm"
                                : "hover:theme-bg-sub theme-text-secondary hover:theme-text-primary"
                            }`}
                          >
                            <SubIcon className={`w-4 h-4 shrink-0 ${isSubActive ? "theme-accent" : "opacity-80"}`} />
                            {!isCollapsed && (
                              <span className="truncate text-[13.5px] sm:text-[13px] font-medium tracking-normal leading-normal">{sub.name}</span>
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
                className={`w-full flex items-center ${isCollapsed ? "justify-center p-2.5" : "px-3 sm:px-3.5 py-2.5 sm:py-2.5"} rounded-xl transition-all cursor-pointer select-none ${
                  isActive
                    ? "theme-bg-elevated theme-text-primary font-semibold shadow-sm"
                    : "hover:theme-bg-sub theme-text-secondary hover:theme-text-primary"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ItemIcon className={`w-[18px] h-[18px] shrink-0 ${isActive ? "theme-accent" : "opacity-80"}`} />
                  {!isCollapsed && <span className="truncate text-[14px] sm:text-[13.5px] font-medium tracking-normal leading-normal">{item.name}</span>}
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
              isCollapsed ? "justify-center p-2" : "justify-start px-3 py-2.5 gap-3"
            } rounded-xl theme-bg-sub/60 hover:theme-bg-elevated border theme-border theme-text-primary transition-all cursor-pointer shadow-xs group`}
          >
            <div className="w-7 h-7 rounded-lg theme-bg-accent-soft text-[var(--accent-main)] flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
            {!isCollapsed && (
              <div className="flex flex-col text-left min-w-0">
                <span className="text-[13px] font-bold theme-text-primary leading-tight truncate">Official Website</span>
                <span className="text-[11px] theme-text-secondary leading-tight truncate mt-0.5">Public Portal &amp; Verification</span>
              </div>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}

