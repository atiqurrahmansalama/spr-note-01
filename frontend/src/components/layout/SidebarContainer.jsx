import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import UserProfileCard from "./UserProfileCard";
import { useFeatureControl } from "../../context/FeatureControlContext";
import { useTenant } from "../../context/TenantContext";
import { useTranslation } from "../../i18n";
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
  IdentificationIcon,
  PrinterIcon,
  BanknotesIcon,
  ScaleIcon,
  CalculatorIcon,
  InvoiceIcon,
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
  const { t } = useTranslation('navigation');

  const { isMultiTenantAdmin } = useTenant();
  const [openSubMenus, setOpenSubMenus] = useState({
    "Academy": true,
    "Academic Institution": true,
    "Academic Studies": true,
    "Examination & Results": true,
    "Student": true,
    "Staff Management": false,
    "Finance & Accounts": true,
    "Settings & Devices": false,
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
    { id: "Dashboard", name: "Dashboard", i18nKey: "dashboard", path: "/dashboard", Icon: DashboardIcon, key: "nav_dashboard" },
    {
      id: "Academy",
      name: "Academy",
      i18nKey: "academy",
      Icon: BuildingOfficeIcon,
      hasSub: true,
      key: "nav_institution",
      subItems: [
        { id: "Profile", name: "Profile & Branding", i18nKey: "institutionProfile", path: "/academy-profile", matchPaths: ["/academy-profile", "/academy/profile", "/settings/institution", "/institution-profile"], Icon: BuildingOfficeIcon, key: "settings_institution" },
        { id: "Academies & Departments", name: "Campus Structure", i18nKey: "campusProfile", path: "/academy/campus-profile", matchPaths: ["/academy/campus-profile", "/campus-profile", "/academy/branches", "/academy/departments", "/student-management/departments"], Icon: BuildingOfficeIcon, key: "campus_profile" },
        { id: "Classes & Groups", name: "Classes & Sections", i18nKey: "classesGroups", path: "/academy/classes-groups", matchPaths: ["/academy/classes-groups", "/classes-groups", "/academy/classes", "/academy/groups", "/student-management/classes", "/student-management/groups"], Icon: ClassIcon, key: "student_classes" },
        { id: "Period Schedules", name: "Routine & Curriculum", i18nKey: "routineCurriculum", path: "/academy/periods", matchPaths: ["/academy/periods"], Icon: TimerIcon, key: "class_period_slots" },
        { id: "Calendar & Events", name: "Calendar & Events", i18nKey: "calendarSchedule", path: "/academy/calendar-events", matchPaths: ["/academy/calendar-events", "/academy/calendar-schedule", "/academy/working-hours"], Icon: CalendarIcon, key: "academy_calendar_events" },
        { id: "Residential Quarters", name: "Residential & Quarters", i18nKey: "residentialDormitory", path: "/academy/residential-quarters", matchPaths: ["/academy/residential-quarters", "/academy/residential", "/academy/dormitory", "/residential-quarters"], Icon: HomeIcon, key: "residential_quarters" },
      ]
    },
    {
      id: "Academic Studies",
      name: "Academic Studies",
      i18nKey: "academicStudies",
      Icon: BookOpenIcon,
      hasSub: true,
      key: "nav_academic_studies",
      subItems: [
        { id: "Daily Classroom", name: "Daily Classroom", i18nKey: "dailyClassroom", path: "/studies/daily-classroom", exactMatchPaths: ["/studies"], matchPaths: ["/studies/daily-classroom", "/studies/daily-lessons", "/studies/daily-progress", "/studies/recitations", "/studies/homework", "/daily-lessons", "/daily-progress", "/recitations", "/homework-tasks", "/report-builder"], Icon: BookOpenIcon, key: "daily_classroom" },
        { id: "Student Reports", name: "Student Recitation Log", i18nKey: "studentReports", path: "/student-reports", matchPaths: ["/student-reports"], Icon: SavedMessagesIcon, key: "report_history" },
      ]
    },
    {
      id: "Examination & Results",
      name: "Examination & Results",
      i18nKey: "examinations",
      Icon: AcademicCapIcon,
      hasSub: true,
      key: "nav_examinations",
      subItems: [
        {
          id: "Exam Schedules",
          name: "Exam Schedules",
          i18nKey: "examSchedules",
          path: "/examinations/schedules",
          exactMatchPaths: ["/examinations", "/exams"],
          matchPaths: [
            "/examinations/schedules",
            "/examinations/routine-matrix",
            "/examinations/routine-board",
            "/examinations/visual-timetable",
            "/examinations/invigilation",
            "/examinations/invigilation-schedule",
            "/routine-matrix",
            "/routine-board",
            "/visual-timetable",
            "/invigilation-schedule"
          ],
          Icon: CalendarIcon,
          key: "exam_schedules"
        },
        {
          id: "Admit Cards & Hall Planning",
          name: "Admit Cards & Hall Planning",
          i18nKey: "hallLogistics",
          path: "/examinations/hall-logistics",
          matchPaths: [
            "/examinations/hall-logistics",
            "/examinations/admit-cards",
            "/examinations/seat-plan",
            "/examinations/desk-slips",
            "/examinations/hall-attendance",
            "/examinations/attendance-sheets",
            "/admit-cards",
            "/seat-plan",
            "/desk-slips",
            "/hall-attendance"
          ],
          Icon: IdentificationIcon,
          key: "exam_hall_logistics"
        },
        {
          id: "Mark Sheet & Tabulation",
          name: "Mark Sheet & Tabulation",
          i18nKey: "tabulationSheet",
          path: "/examinations/marksheet",
          matchPaths: [
            "/examinations/marksheet",
            "/examinations/mark-sheet",
            "/examinations/tabulation",
            "/examinations/transcripts",
            "/examinations/mark-entry",
            "/mark-entry",
            "/marksheet",
            "/tabulation-sheet",
            "/mark-sheet",
            "/transcripts",
            "/academic-transcripts"
          ],
          Icon: ChartBarIcon,
          key: "exam_tabulation"
        },
      ]
    },
    {
      id: "Student",
      name: "Student",
      i18nKey: "students",
      Icon: GroupsIcon,
      hasSub: true,
      key: "nav_student_management",
      subItems: [
        { id: "Student Roster", name: "Student Roster", i18nKey: "studentDirectory", path: "/students", matchPaths: ["/students", "/student-roster", "/groups-students"], Icon: StudentIcon, key: "student_roster" },
        { id: "Class Attendance", name: "Class Attendance", i18nKey: "classAttendance", path: "/attendance/students/monthly-matrix", matchPaths: ["/attendance/students/monthly-matrix", "/attendance/student", "/attendance/monthly-register"], Icon: MatrixIcon, key: "monthly_attendance_matrix" },
        { id: "Residential Attendance", name: "Residential Attendance", i18nKey: "residentialAttendance", path: "/attendance/students/residential", matchPaths: ["/attendance/students/residential"], Icon: TimerIcon, key: "residential_attendance" },
        { id: "Admission", name: "Admission", i18nKey: "admission", path: "/admission", matchPaths: ["/admission", "/short-admission", "/admission/short"], Icon: AdmissionIcon, key: "student_admission" },
      ]
    },
    {
      id: "Staff Management",
      name: "Staff Management",
      i18nKey: "staffManagement",
      Icon: TeacherIcon,
      hasSub: true,
      key: "nav_staff_management",
      subItems: [
        { id: "Teacher & Staff Roster", name: "Teacher & Staff Roster", i18nKey: "staffRoster", path: "/staff/roster", matchPaths: ["/staff/roster"], Icon: TeacherIcon, key: "staff_roster" },
        { id: "Teacher Class Attendance", name: "Teacher Class Attendance", i18nKey: "teacherAttendance", path: "/staff/teacher-attendance", matchPaths: ["/staff/teacher-attendance"], Icon: ClassIcon, key: "staff_roster" },
        { id: "Staff Daily Attendance", name: "Staff Daily Attendance", i18nKey: "staffDailyAttendance", path: "/staff/attendance", matchPaths: ["/staff/attendance"], Icon: DutyIcon, key: "staff_roster" },
        { id: "Staff Onboarding", name: "Staff Onboarding", i18nKey: "staffOnboarding", path: "/staff/onboarding", matchPaths: ["/staff/onboarding"], Icon: AdmissionIcon, key: "staff_onboarding" },
      ]
    },
    { id: "Print Studio", name: "Print Studio", i18nKey: "printStudio", path: "/print-studio", matchPaths: ["/print-studio"], Icon: PrinterIcon, key: "nav_print_studio" },
    {
      id: "Finance & Accounts",
      name: "Finance & Accounts",
      i18nKey: "finance",
      Icon: BanknotesIcon,
      hasSub: true,
      key: "nav_finance",
      subItems: [
        { id: "Finance Overview", name: "Overview", i18nKey: "financeOverview", path: "/finance", matchPaths: ["/finance", "/finance/overview"], Icon: BanknotesIcon, key: "finance_dashboard" },
        { id: "Student Billing & Fees", name: "Student Billing & Fees", i18nKey: "financeStudentBilling", path: "/finance/student-billing", matchPaths: ["/finance/student-billing", "/student-billing"], Icon: InvoiceIcon, key: "finance_student_billing" },
        { id: "Staff Payroll", name: "Staff Payroll", i18nKey: "financeStaffPayroll", path: "/finance/staff-payroll", matchPaths: ["/finance/staff-payroll", "/staff-payroll"], Icon: CalculatorIcon, key: "finance_staff_payroll" },
        { id: "General Ledger", name: "General Ledger & Vouchers", i18nKey: "financeGeneralLedger", path: "/finance/general-ledger", matchPaths: ["/finance/general-ledger", "/general-ledger"], Icon: ScaleIcon, key: "finance_general_ledger" },
        { id: "Financial Statements", name: "Financial Statements", i18nKey: "financeReports", path: "/finance/reports", matchPaths: ["/finance/reports"], Icon: ChartBarIcon, key: "finance_reports" },
      ]
    },
    {
      id: "App Management",
      name: "App Management",
      i18nKey: "appManagement",
      Icon: SettingsIcon,
      hasSub: true,
      key: "nav_app_management",
      subItems: [
        { id: "Section Control", name: "Section Control", i18nKey: "sectionControl", path: "/section-control", matchPaths: ["/section-control"], Icon: SectionControlIcon, key: "app_section_control" },
        { id: "User Management", name: "User Management", i18nKey: "userManagement", path: "/user-management", matchPaths: ["/user-management"], Icon: SectionControlIcon, key: "app_user_management" },
        { id: "Role Management", name: "Role Management", i18nKey: "roleManagement", path: "/role-management", matchPaths: ["/role-management"], Icon: SectionControlIcon, key: "app_role_management" },
        { id: "Activity Analytics", name: "Activity Analytics", i18nKey: "activityAnalytics", path: "/activity-analytics", matchPaths: ["/activity-analytics"], Icon: DashboardIcon, key: "app_activity_analytics" },
        { id: "Role QR & Invites", name: "Role QR & Invites", i18nKey: "roleInvites", path: "/app-management/role-invites", matchPaths: ["/app-management/role-invites"], Icon: SectionControlIcon, key: "app_role_invites" },
        { id: "Notification Management", name: "Notification Management", i18nKey: "notificationGateways", path: "/app-management/notifications", matchPaths: ["/app-management/notifications", "/notifications"], Icon: BellIcon, key: "notification_management" },
      ]
    },
    { 
      id: "Settings", 
      name: "Settings", 
      i18nKey: "settings",
      Icon: SettingsIcon, 
      hasSub: true, 
      key: "nav_settings",
      subItems: [
        { id: "Profile Settings", name: "Profile Settings", i18nKey: "profileSettings", path: "/profile-settings", matchPaths: ["/profile-settings"], Icon: SettingsIcon, key: "settings_profile" },
        { id: "Attendance Settings", name: "Attendance Settings", i18nKey: "attendanceSettings", path: "/attendance/settings", matchPaths: ["/attendance/settings"], Icon: AttendanceIcon, key: "attendance_policies_slots" },
        { id: "Security & Sessions", name: "Security & Sessions", i18nKey: "securitySessions", path: "/security-sessions", matchPaths: ["/security-sessions"], Icon: SettingsIcon, key: "settings_security" },
        { id: "Personalize", name: "Personalize", i18nKey: "appearanceTheme", path: "/personalize", matchPaths: ["/personalize", "/appearance", "/date-time", "/language"], Icon: AppearanceIcon, key: "settings_personalize" },
        { id: "Data & Backup", name: "Data & Backup", i18nKey: "dataBackup", path: "/data-backup", matchPaths: ["/data-backup"], Icon: CloudIcon, key: "settings_backup" },
        { id: "Admin Tools", name: "Admin Tools", i18nKey: "developerTools", path: "/admin-tools", matchPaths: ["/admin-tools", "/developer-tools", "/sp-management"], Icon: SparklesIcon, key: "admin_tools", superAdminOnly: true },
      ]
    },
    { id: "Shortcuts", name: "Shortcuts", i18nKey: "shortcuts", path: "/shortcuts", matchPaths: ["/shortcuts"], Icon: ShortcutsIcon, key: "nav_shortcuts" },
    { id: "App Guide", name: "App Guide", i18nKey: "appGuide", path: "/guide", matchPaths: ["/guide"], Icon: AppGuideIcon, key: "nav_app_guide" },
    { id: "About", name: "About", i18nKey: "about", path: "/about", matchPaths: ["/about"], Icon: AboutIcon, key: "nav_about" },
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

  const checkIsActive = (path, item = null) => {
    if (!path && !item) return false;
    if (path === "/") {
      return currentPath === "/" || currentPath === "/dashboard";
    }
    if (currentPath === path) return true;
    if (item && Array.isArray(item.exactMatchPaths)) {
      if (item.exactMatchPaths.some((p) => currentPath === p)) return true;
    }
    if (item && Array.isArray(item.matchPaths)) {
      return item.matchPaths.some((p) => currentPath === p || currentPath.startsWith(p + '/'));
    }
    return false;
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
            const isParentActive = checkIsActive(item.path, item);
            const ItemIcon = item.Icon;
            const isAnySubActive = item.hasSub ? item.subItems.some((sub) => checkIsActive(sub.path, sub)) : false;
            const isSubOpen = openSubMenus[item.id] || isAnySubActive || false;

            if (item.hasSub) {
              return (
                <div key={item.id} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleSubMenu(item.id)}
                    title={t(item.i18nKey, item.name)}
                    className={`w-full flex items-center ${isCollapsed ? "justify-center p-2.5" : "justify-between px-3 sm:px-3.5 py-2.5 sm:py-2.5"} rounded-xl transition-all cursor-pointer select-none ${
                      isParentActive || isAnySubActive
                        ? "theme-bg-elevated theme-text-primary font-semibold shadow-sm"
                        : "hover:theme-bg-sub theme-text-secondary hover:theme-text-primary"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ItemIcon className={`w-[18px] h-[18px] sm:w-[18px] sm:h-[18px] shrink-0 ${isParentActive || isAnySubActive ? "theme-accent" : "opacity-80"}`} />
                      {!isCollapsed && <span className="truncate text-[14px] sm:text-[13.5px] font-medium tracking-normal leading-normal">{t(item.i18nKey, item.name)}</span>}
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
                        const isSubActive = checkIsActive(sub.path, sub);
                        const SubIcon = sub.Icon;
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => handleNavigate(sub.path)}
                            title={t(sub.i18nKey, sub.name)}
                            className={`w-full flex items-center gap-3 relative ${isCollapsed ? "justify-center p-2" : "px-3 sm:px-3 py-2 sm:py-2"} rounded-xl transition-all cursor-pointer select-none ${
                              isSubActive
                                ? "theme-bg-elevated theme-text-primary font-semibold shadow-sm"
                                : "hover:theme-bg-sub theme-text-secondary hover:theme-text-primary"
                            }`}
                          >
                            <SubIcon className={`w-4 h-4 shrink-0 ${isSubActive ? "theme-accent" : "opacity-80"}`} />
                            {!isCollapsed && (
                              <span className="truncate text-[13.5px] sm:text-[13px] font-medium tracking-normal leading-normal">{t(sub.i18nKey, sub.name)}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const isActive = checkIsActive(item.path, item);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.path)}
                title={t(item.i18nKey, item.name)}
                className={`w-full flex items-center ${isCollapsed ? "justify-center p-2.5" : "px-3 sm:px-3.5 py-2.5 sm:py-2.5"} rounded-xl transition-all cursor-pointer select-none ${
                  isActive
                    ? "theme-bg-elevated theme-text-primary font-semibold shadow-sm"
                    : "hover:theme-bg-sub theme-text-secondary hover:theme-text-primary"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ItemIcon className={`w-[18px] h-[18px] shrink-0 ${isActive ? "theme-accent" : "opacity-80"}`} />
                  {!isCollapsed && <span className="truncate text-[14px] sm:text-[13.5px] font-medium tracking-normal leading-normal">{t(item.i18nKey, item.name)}</span>}
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
            title={t('officialWebsite', 'Official Website')}
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
              <div className="flex flex-col text-left rtl:text-right min-w-0">
                <span className="text-[13px] font-bold theme-text-primary leading-tight truncate">{t('officialWebsite', 'Official Website')}</span>
                <span className="text-[11px] theme-text-secondary leading-tight truncate mt-0.5">{t('publicPortalVerification', 'Public Portal & Verification')}</span>
              </div>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}

